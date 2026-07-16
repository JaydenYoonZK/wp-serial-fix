import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parse, serialize, isSerialized, strictReplace, repair, process, byteLength
} from "../docs/serial.js";

test("byteLength counts UTF-8 bytes", () => {
  assert.equal(byteLength("abc"), 3);
  assert.equal(byteLength("café"), 5);   // é = 2 bytes
  assert.equal(byteLength("🎉"), 4);
});

test("parse and serialize round-trip primitives", () => {
  for (const s of ['N;', 'b:1;', 'b:0;', 'i:42;', 'i:-7;', 'd:1.5;', 's:5:"hello";']) {
    assert.equal(serialize(parse(s)), s, s);
  }
});

test("parse and serialize round-trip an array", () => {
  const s = 'a:2:{s:4:"home";s:19:"http://old.test.com";i:0;b:1;}';
  assert.equal(serialize(parse(s)), s);
});

test("parse and serialize round-trip an object", () => {
  const s = 'O:8:"stdClass":1:{s:3:"url";s:16:"https://old.test";}';
  assert.equal(serialize(parse(s)), s);
});

test("isSerialized recognizes valid and rejects invalid", () => {
  assert.ok(isSerialized('a:1:{i:0;s:3:"abc";}'));
  assert.ok(isSerialized('s:5:"hello";'));
  assert.ok(!isSerialized("just a plain string"));
  assert.ok(!isSerialized('s:99:"too short";'));   // length lies
  assert.ok(!isSerialized("https://example.com"));
});

test("length and count headers must be exact unsigned integers", () => {
  for (const value of [
    's:3x:"abc";',
    's:03:"abc";',
    'a:1x:{i:0;s:1:"x";}',
    'a:01:{i:0;s:1:"x";}',
    'O:8x:"stdClass":0:{}',
    'O:8:"stdClass":0x:{}'
  ]) {
    assert.equal(isSerialized(value), false, value);
  }
});

test("UTF-8 byte boundaries are enforced for strings and class names", () => {
  assert.equal(isSerialized('s:4:"🎉";'), true);
  assert.equal(isSerialized('s:3:"🎉";'), false, "a byte length cannot split a code point");
  const object = 'O:5:"Café":0:{}';
  assert.equal(serialize(parse(object)), object);
  const custom = 'C:5:"Café":4:{🎉}';
  assert.equal(serialize(parse(custom)), custom);
});

test("malformed object and custom-object headers are rejected", () => {
  for (const value of [
    'O:8:stdClass:0:{}',
    'O:99:"stdClass":0:{}',
    'C:x:"Foo":0:{}',
    'C:3:"Foo":x:{}',
    'C:3:"Foo":3:{🎉}'
  ]) {
    assert.equal(isSerialized(value), false, value);
  }
});

test("strictReplace grows a URL and fixes the length prefix", () => {
  const input = 's:4:"home";';
  // replace 'home' (4) with a longer value
  const out = strictReplace(input, "home", "homepage-url");
  assert.equal(out, 's:12:"homepage-url";');
  parse(out); // must still be valid
});

test("strictReplace on a realistic wp_options value", () => {
  const input = 'a:2:{s:4:"home";s:19:"http://old.test.com";s:7:"siteurl";s:19:"http://old.test.com";}';
  const out = strictReplace(input, "http://old.test.com", "https://new-and-longer.example.org");
  assert.ok(isSerialized(out));
  const tree = parse(out);
  assert.equal(tree.items[0][1].v, "https://new-and-longer.example.org");
});

test("strictReplace handles multibyte replacement", () => {
  const input = 's:5:"plain";';
  const out = strictReplace(input, "plain", "café");   // 5 -> 5 bytes but 4 chars
  assert.equal(out, 's:5:"café";');
  parse(out);
});

test("strictReplace descends into nested serialized strings", () => {
  const inner = 'a:1:{s:3:"url";s:15:"http://old.test";}';
  const input = `a:1:{s:6:"widget";s:${byteLength(inner)}:"${inner}";}`;
  const out = strictReplace(input, "old.test", "new.example.org");
  assert.ok(isSerialized(out));
  // the nested blob is still valid serialized data with the replacement
  const tree = parse(out);
  const nested = tree.items[0][1].v;
  assert.ok(isSerialized(nested));
  assert.match(nested, /new\.example\.org/);
});

test("repair recomputes wrong length prefixes", () => {
  // someone changed the text but not the number: content is 23 bytes, prefix says 19
  const broken = 'a:1:{s:4:"home";s:19:"https://new-domain.example";}';
  assert.ok(!isSerialized(broken));
  const { text, fixed } = repair(broken);
  assert.equal(fixed, 1);
  assert.ok(isSerialized(text), text);
});

test("repair leaves already-correct data unchanged", () => {
  const good = 'a:1:{s:4:"home";s:19:"http://old.test.com";}';
  const { text, fixed } = repair(good);
  assert.equal(fixed, 0);
  assert.equal(text, good);
});

test("repair handles strings containing quote-semicolon", () => {
  // content itself contains '";' which must not be mistaken for the end
  const content = 'he said "; ok';
  const broken = `s:2:"${content}";`;   // wrong length 2
  const { text } = repair(broken);
  assert.ok(isSerialized(text), text);
  assert.equal(parse(text).v, content);
});

test("repair follows structure when content resembles serialized data", () => {
  const content = 'prefix";s:3:"mid";suffix';
  const broken = `a:1:{i:0;s:1:"${content}";}`;
  const result = repair(broken);
  assert.equal(result.ok, true);
  assert.equal(result.fixed, 1);
  assert.equal(parse(result.text).items[0][1].v, content);
});

test("repair fixes several nested prefixes in one pass", () => {
  const broken = 'a:2:{s:1:"home";s:2:"https://example.test";s:4:"nest";a:1:{i:0;s:1:"café";}}';
  const result = repair(broken);
  assert.equal(result.ok, true);
  assert.equal(result.fixed, 3);
  assert.equal(isSerialized(result.text), true);
});

test("repair refuses malformed data it cannot prove", () => {
  const broken = 'a:1:{i:0;s:2:"unterminated}';
  const result = repair(broken);
  assert.equal(result.ok, false);
  assert.equal(result.text, broken);
  assert.match(result.error, /could not repair/);
});

test("process detects plain vs serialized", () => {
  const plain = process("http://old.test.com/page", { find: "old.test.com", replace: "new.example.org" });
  assert.equal(plain.results[0].kind, "plain");
  assert.equal(plain.results[0].output, "http://new.example.org/page");

  const ser = process('a:1:{i:0;s:4:"home";}', { find: "home", replace: "front" });
  assert.equal(ser.results[0].kind, "serialized");
  assert.ok(isSerialized(ser.results[0].output));
});

test("process handles multiple lines independently", () => {
  const input = 'a:1:{i:0;s:4:"home";}\nplain text home here';
  const out = process(input, { find: "home", replace: "front-page" });
  assert.ok(out.multi);
  assert.equal(out.results.length, 2);
  assert.ok(isSerialized(out.results[0].output));
  assert.equal(out.results[1].output, "plain text front-page here");
});

test("process preserves surrounding whitespace", () => {
  const input = '  s:3:"old";  \n\nplain old';
  const out = process(input, { find: "old", replace: "new" });
  assert.equal(out.multi, true);
  assert.equal(out.results.length, 2);
  assert.equal(out.results[0].output, '  s:3:"new";  ');
  assert.equal(out.results[1].output, "plain new");
});

test("a serialized string containing a newline remains one value", () => {
  const input = 's:11:"hello\nworld";';
  const out = process(input, { find: "world", replace: "there" });
  assert.equal(out.multi, false);
  assert.equal(out.results.length, 1);
  assert.equal(out.results[0].output, 's:11:"hello\nthere";');
});

test("process repair mode", () => {
  const broken = 's:19:"https://new-domain.example";';
  const out = process(broken, { mode: "repair" });
  assert.ok(isSerialized(out.results[0].output));
});

test("regex replace is supported", () => {
  const out = strictReplace('s:11:"post-12-abc";', "post-\\d+", "post-N", { regex: true });
  assert.equal(parse(out).v, "post-N-abc");
});

test("empty search is a no-op and oversized regular expressions are rejected", () => {
  assert.equal(strictReplace('s:3:"old";', "", "x"), 's:3:"old";');
  const out = process("plain text", { find: "x".repeat(513), replace: "y", regex: true });
  assert.equal(out.results[0].ok, false);
  assert.match(out.results[0].error, /exceeds 512/);
});

test("invalid regex is reported instead of thrown for plain text", () => {
  const out = process("plain old text", { find: "[", replace: "x", regex: true });
  assert.equal(out.results[0].kind, "plain");
  assert.equal(out.results[0].ok, false);
  assert.match(out.results[0].error, /Invalid regular expression|Unterminated character class/);
  assert.equal(out.results[0].output, "plain old text");
});

test("invalid regex is reported instead of thrown for serialized text", () => {
  const out = process('s:3:"old";', { find: "[", replace: "x", regex: true });
  assert.equal(out.results[0].kind, "serialized");
  assert.equal(out.results[0].ok, false);
  assert.match(out.results[0].error, /Invalid regular expression|Unterminated character class/);
  assert.equal(out.results[0].output, 's:3:"old";');
});

test("handles PHP references (R:/r:) instead of failing", () => {
  const withRef = 'a:2:{i:0;O:8:"stdClass":1:{s:1:"a";s:3:"old";}i:1;R:2;}';
  assert.equal(isSerialized(withRef), true);
  assert.equal(serialize(parse(withRef)), withRef, "reference round-trips");
  const out = strictReplace(withRef, "old", "new");
  assert.equal(isSerialized(out), true);
  assert.ok(out.includes("R:2;"), "reference is preserved");
  assert.equal(parse(out).items[0][1].items[0][1].v, "new");
});

test("references require a positive integer identifier", () => {
  for (const value of ["R:0;", "R:-1;", "R:abc;", "r:01;"]) {
    assert.equal(isSerialized(value), false, value);
  }
});

test("handles custom-serialized objects (C:) without touching their payload", () => {
  const payload = "opaque{data};blob";
  const custom = `C:3:"Foo":${byteLength(payload)}:{${payload}}`;
  assert.equal(isSerialized(custom), true);
  assert.equal(serialize(parse(custom)), custom, "custom object round-trips");
  const mixed = `a:2:{i:0;s:3:"old";i:1;${custom}}`;
  const out = strictReplace(mixed, "old", "new");
  assert.equal(parse(out).items[0][1].v, "new");
  assert.ok(out.includes(`{${payload}}`), "custom payload is left untouched");
});

test("scalar values are validated, so junk is not read as serialized", () => {
  assert.equal(isSerialized("i:notanumber;"), false);
  assert.equal(isSerialized("b:5;"), false);
  assert.equal(isSerialized("d:abc;"), false);
  assert.equal(isSerialized("i:;"), false);
  // Real PHP scalar forms, including the special doubles, still parse.
  for (const s of ["i:0;", "i:-42;", "b:0;", "b:1;", "d:3.14;", "d:1.0E+20;", "d:INF;", "d:-INF;", "d:NAN;"]) {
    assert.equal(isSerialized(s), true, `${s} should be valid`);
  }
  for (const s of ["i:+1;", "i:01;", "d:0x10;", "d:1.;", "d:+1;"]) {
    assert.equal(isSerialized(s), false, `${s} should be rejected`);
  }
});

test("parser depth is bounded", () => {
  let value = 's:1:"x";';
  for (let i = 0; i < 260; i++) value = `a:1:{i:0;${value}}`;
  assert.throws(() => parse(value), /exceeds 256 levels/);
  assert.equal(isSerialized(value), false);
});


test("PHP 8.1 enum (E: token) parses, round-trips, and replaces safely", () => {
  const input = 'a:2:{s:4:"suit";E:11:"Suit:Hearts";s:3:"url";s:19:"http://old.test.com";}';
  assert.equal(isSerialized(input), true);
  assert.equal(serialize(parse(input)), input);
  const r = process(input, { find: "old.test.com", replace: "brand-new-longer.example.org" });
  assert.equal(r.results[0].kind, "serialized");
  assert.equal(isSerialized(r.results[0].output), true, "enum replace must not corrupt the value");
  assert.match(r.results[0].output, /s:35:"http:\/\/brand-new-longer.example.org"/);
  // the enum value itself is preserved verbatim
  assert.match(r.results[0].output, /E:11:"Suit:Hearts"/);
});

test("replace mode refuses broken serialized data instead of naively corrupting it", () => {
  const broken = 'a:1:{s:4:"home";s:18:"https://new-longer.example.org";}'; // s:18 is wrong
  const r = process(broken, { mode: "replace", find: "new-longer", replace: "z" });
  assert.equal(r.results[0].kind, "broken");
  assert.equal(r.results[0].ok, false);
  assert.equal(r.results[0].output, broken, "must not modify broken data");
  assert.match(r.results[0].error, /Repair mode/);
});

test("genuinely plain text is still replaced", () => {
  const r = process("visit http://old.example today", { find: "old.example", replace: "new.example" });
  assert.equal(r.results[0].kind, "plain");
  assert.equal(r.results[0].output, "visit http://new.example today");
});

test("a single valid value containing a newline is not mis-split", () => {
  const nlVal = 's:10:"X\ns:3:"abc";';
  assert.equal(isSerialized(nlVal), true);
  const r = process(nlVal, { find: "abc", replace: "abcdefghij" });
  assert.equal(r.multi, false);
  assert.equal(r.results.length, 1);
  assert.equal(isSerialized(r.results[0].output), true);
});

test("repair mode splits an all-broken multi-line column row by row", () => {
  const col = [
    'a:1:{s:3:"url";s:18:"https://new-longer.example.org";}',
    'a:1:{s:3:"url";s:20:"https://new-longer.example.org/a";}'
  ].join("\n");
  const r = process(col, { mode: "repair" });
  assert.equal(r.multi, true);
  assert.equal(r.results.length, 2);
  assert.ok(r.results.every(x => x.ok && isSerialized(x.output)), "each row repairs independently");
});

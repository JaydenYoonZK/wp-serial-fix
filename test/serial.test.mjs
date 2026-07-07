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

test("process repair mode", () => {
  const broken = 's:19:"https://new-domain.example";';
  const out = process(broken, { mode: "repair" });
  assert.ok(isSerialized(out.results[0].output));
});

test("regex replace is supported", () => {
  const out = strictReplace('s:11:"post-12-abc";', "post-\\d+", "post-N", { regex: true });
  assert.equal(parse(out).v, "post-N-abc");
});

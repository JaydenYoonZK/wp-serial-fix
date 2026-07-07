/**
 * wp-serial-fix engine
 *
 * PHP serialization-aware search and replace, plus repair for data whose
 * string length prefixes have already been corrupted by a naive replace.
 *
 * Pure functions, no DOM. Runs in the browser and under Node's test runner.
 *
 * Why this exists: PHP records the byte length of every string it
 * serializes, e.g. s:19:"http://old.example". A raw SQL find-and-replace
 * that changes the text but not the number leaves PHP unable to
 * unserialize the row, so WordPress silently drops the value. The safe
 * way is to parse the structure, replace inside string values, and
 * re-emit with recomputed byte lengths. That is what strictReplace does.
 * repair handles data that is already broken.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

/** UTF-8 byte length, which is what PHP's s: prefix counts. */
export function byteLength(str) {
  return enc.encode(str).length;
}

/* ----------------------------- strict parser ----------------------------- */

class ParseError extends Error {}

function parseNode(str, ctx) {
  const t = str[ctx.i];
  if (t === undefined) throw new ParseError(`unexpected end at ${ctx.i}`);

  if (t === "N") {
    if (str.slice(ctx.i, ctx.i + 2) !== "N;") throw new ParseError(`bad null at ${ctx.i}`);
    ctx.i += 2;
    return { type: "null" };
  }

  if (t === "b" || t === "i" || t === "d") {
    if (str[ctx.i + 1] !== ":") throw new ParseError(`expected ':' at ${ctx.i + 1}`);
    const end = str.indexOf(";", ctx.i + 2);
    if (end === -1) throw new ParseError(`unterminated scalar at ${ctx.i}`);
    const raw = str.slice(ctx.i + 2, end);
    ctx.i = end + 1;
    return { type: t === "b" ? "bool" : t === "i" ? "int" : "double", raw };
  }

  if (t === "s") {
    const colon = str.indexOf(":", ctx.i + 2);
    if (colon === -1) throw new ParseError(`bad string header at ${ctx.i}`);
    const len = parseInt(str.slice(ctx.i + 2, colon), 10);
    if (Number.isNaN(len) || len < 0) throw new ParseError(`bad string length at ${ctx.i}`);
    if (str[colon + 1] !== '"') throw new ParseError(`expected '"' at ${colon + 1}`);
    const start = colon + 2;
    const rest = enc.encode(str.slice(start));
    if (rest.length < len) throw new ParseError(`string overruns input at ${ctx.i}`);
    const content = dec.decode(rest.slice(0, len));
    const after = start + content.length;
    if (str[after] !== '"' || str[after + 1] !== ";") {
      throw new ParseError(`string not closed cleanly at ${ctx.i} (length prefix likely wrong)`);
    }
    ctx.i = after + 2;
    return { type: "str", v: content };
  }

  if (t === "a" || t === "O") {
    let className = null;
    let p = ctx.i + 2;
    if (t === "O") {
      const c = str.indexOf(":", p);
      const clen = parseInt(str.slice(p, c), 10);
      const cs = c + 2;
      className = str.slice(cs, cs + clen);
      p = cs + clen + 2;
    }
    const colon = str.indexOf(":", p);
    const n = parseInt(str.slice(p, colon), 10);
    if (Number.isNaN(n) || n < 0) throw new ParseError(`bad count at ${ctx.i}`);
    if (str[colon + 1] !== "{") throw new ParseError(`expected '{' at ${colon + 1}`);
    ctx.i = colon + 2;
    const items = [];
    for (let k = 0; k < n; k++) {
      const key = parseNode(str, ctx);
      const val = parseNode(str, ctx);
      items.push([key, val]);
    }
    if (str[ctx.i] !== "}") throw new ParseError(`expected '}' at ${ctx.i}`);
    ctx.i += 1;
    return { type: t === "O" ? "object" : "array", className, items };
  }

  throw new ParseError(`unknown token ${JSON.stringify(t)} at ${ctx.i}`);
}

/** Parse a single serialized value. Throws ParseError on malformed input. */
export function parse(str) {
  const ctx = { i: 0 };
  const node = parseNode(str, ctx);
  if (ctx.i !== str.length) throw new ParseError(`trailing data at ${ctx.i}`);
  return node;
}

/** True if the whole string is one well-formed serialized value. */
export function isSerialized(str) {
  if (typeof str !== "string" || str.length < 2) return false;
  if (!/^[NbidsaO]:/.test(str) && str !== "N;") return false;
  try { parse(str); return true; } catch { return false; }
}

/* ----------------------------- serializer ----------------------------- */

export function serialize(node) {
  switch (node.type) {
    case "null": return "N;";
    case "bool": return `b:${node.raw};`;
    case "int": return `i:${node.raw};`;
    case "double": return `d:${node.raw};`;
    case "str": return `s:${byteLength(node.v)}:"${node.v}";`;
    case "array":
      return `a:${node.items.length}:{${node.items.map(([k, v]) => serialize(k) + serialize(v)).join("")}}`;
    case "object":
      return `O:${byteLength(node.className)}:"${node.className}":${node.items.length}:{${node.items.map(([k, v]) => serialize(k) + serialize(v)).join("")}}`;
    default:
      throw new Error(`cannot serialize ${node.type}`);
  }
}

/* ----------------------------- replace ----------------------------- */

function applyToStrings(node, fn) {
  if (node.type === "str") {
    node.v = fn(node.v);
  } else if (node.items) {
    for (const [k, v] of node.items) { applyToStrings(k, fn); applyToStrings(v, fn); }
  }
  return node;
}

function makeReplacer(find, replace, { regex = false, flags = "g" } = {}) {
  if (regex) {
    const re = new RegExp(find, flags.includes("g") ? flags : flags + "g");
    return (s) => s.replace(re, replace);
  }
  return (s) => s.split(find).join(replace);
}

/**
 * Serialization-safe replace on one well-formed serialized value.
 * Also descends into string values that are themselves serialized
 * (WordPress nests serialized data inside options constantly).
 */
export function strictReplace(str, find, replace, opts = {}) {
  const tree = parse(str);
  const fn = makeReplacer(find, replace, opts);
  const deepFn = (s) => {
    if (isSerialized(s)) {
      try { return strictReplace(s, find, replace, opts); } catch { /* fall through */ }
    }
    return fn(s);
  };
  applyToStrings(tree, opts.nested === false ? fn : deepFn);
  return serialize(tree);
}

/* ----------------------------- repair ----------------------------- */

/**
 * Repair serialized data whose s: length prefixes are wrong.
 * Strategy: find each s:LEN:"..."; and recompute LEN by locating the
 * real closing '";' , which is the '";' followed by a valid next token
 * (another node, a '}', or end of that structure). This is the standard
 * lenient fix used when data is already corrupted.
 */
export function repair(str) {
  let out = "";
  let i = 0;
  let fixed = 0;
  const nextTokenStart = /^(?:[sabidO]:|N;|\})/;

  while (i < str.length) {
    const m = /s:(\d+):"/.exec(str.slice(i));
    if (!m || m.index !== 0) {
      // find next 's:' to copy up to
      const nextS = str.indexOf('s:', i + 1);
      if (nextS === -1) { out += str.slice(i); break; }
      out += str.slice(i, nextS);
      i = nextS;
      continue;
    }
    const declaredLen = parseInt(m[1], 10);
    const contentStart = i + m[0].length;
    // Find the true end: scan candidate '";' positions, pick the first
    // where what follows is a valid next token or closes cleanly.
    let end = -1;
    let searchFrom = contentStart;
    while (true) {
      const close = str.indexOf('";', searchFrom);
      if (close === -1) break;
      const after = str.slice(close + 2);
      if (after === "" || nextTokenStart.test(after)) { end = close; break; }
      searchFrom = close + 1;
    }
    if (end === -1) {
      // fall back to declared length so we do not lose data
      const guessed = contentStart + declaredLen;
      out += str.slice(i, guessed + 2);
      i = guessed + 2;
      continue;
    }
    const content = str.slice(contentStart, end);
    const realLen = byteLength(content);
    if (realLen !== declaredLen) fixed++;
    out += `s:${realLen}:"${content}";`;
    i = end + 2;
  }
  return { text: out, fixed };
}

/* ----------------------------- high level ----------------------------- */

/**
 * Process arbitrary pasted input: a bare serialized value, a plain string,
 * or several values separated by newlines. Returns a per-line report.
 * mode: "replace" | "repair"
 */
export function process(input, { mode = "replace", find = "", replace = "", regex = false } = {}) {
  const lines = input.split(/\r?\n/);
  const multi = lines.filter(l => l.trim()).length > 1 && lines.some(l => isSerialized(l.trim()));
  const targets = multi ? lines : [input];

  const results = targets.map((raw) => {
    const value = multi ? raw : input;
    if (multi && !raw.trim()) return { kind: "blank", input: raw, output: raw };

    const serialized = isSerialized(value.trim());
    if (mode === "repair") {
      const r = repair(value);
      return { kind: serialized ? "serialized" : "plain", repaired: r.fixed, input: value, output: r.text, ok: true };
    }

    if (!find) return { kind: serialized ? "serialized" : "plain", input: value, output: value, ok: true, note: "no search term" };

    if (serialized) {
      try {
        const output = strictReplace(value.trim(), find, replace, { regex });
        return { kind: "serialized", input: value, output, ok: true };
      } catch (e) {
        return { kind: "serialized", input: value, output: value, ok: false, error: e.message };
      }
    }
    const fn = makeReplacer(find, replace, { regex });
    return { kind: "plain", input: value, output: fn(value), ok: true };
  });

  return { multi, results: multi ? results.filter(r => r.kind !== "blank" || false) : results };
}

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

const MAX_INPUT_BYTES = 5 * 1024 * 1024;
const MAX_DEPTH = 256;
const MAX_NODES = 100000;
const MAX_REGEX_LENGTH = 512;

/** UTF-8 byte length, which is what PHP's s: prefix counts. */
export function byteLength(str) {
  return enc.encode(str).length;
}

/* ----------------------------- strict parser ----------------------------- */

class ParseError extends Error {}

function readUnsigned(str, start, end, label) {
  const raw = str.slice(start, end);
  if (!/^(?:0|[1-9]\d*)$/.test(raw)) throw new ParseError(`bad ${label} at ${start}`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) throw new ParseError(`${label} is too large at ${start}`);
  return value;
}

function readBytes(str, start, length, label) {
  let i = start;
  let bytes = 0;
  while (i < str.length && bytes < length) {
    const point = str.codePointAt(i);
    const width = point > 0xffff ? 2 : 1;
    const size = byteLength(str.slice(i, i + width));
    if (bytes + size > length) throw new ParseError(`${label} ends inside a UTF-8 character at ${start}`);
    bytes += size;
    i += width;
  }
  if (bytes !== length) throw new ParseError(`${label} overruns input at ${start}`);
  return { value: str.slice(start, i), end: i };
}

function enterNode(ctx) {
  ctx.nodes += 1;
  if (ctx.nodes > MAX_NODES) throw new ParseError(`serialized value exceeds ${MAX_NODES} nodes`);
  ctx.depth += 1;
  if (ctx.depth > MAX_DEPTH) throw new ParseError(`serialized value exceeds ${MAX_DEPTH} levels`);
}

function parseNode(str, ctx) {
  enterNode(ctx);
  try {
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
    // Validate the value's shape so malformed data (e.g. i:notanumber;) is not
    // mistaken for valid serialized data. PHP only ever emits these exact forms:
    // bool is 0 or 1, int is an optional-sign integer, double is a number or one
    // of INF, -INF, NAN. Accepting junk here would make isSerialized() lie, and
    // could flip the "paste a column of values" flow into the wrong mode.
    const kind = t === "b" ? "bool" : t === "i" ? "int" : "double";
    const valid =
      t === "b" ? (raw === "0" || raw === "1")
      : t === "i" ? /^-?(?:0|[1-9]\d*)$/.test(raw)
      : (raw === "INF" || raw === "-INF" || raw === "NAN" || /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:E[+-]?\d+)?$/.test(raw));
    if (!valid) throw new ParseError(`bad ${kind} value at ${ctx.i}`);
    ctx.i = end + 1;
    return { type: kind, raw };
  }

  if (t === "s") {
    const colon = str.indexOf(":", ctx.i + 2);
    if (colon === -1) throw new ParseError(`bad string header at ${ctx.i}`);
    const len = readUnsigned(str, ctx.i + 2, colon, "string length");
    if (str[colon + 1] !== '"') throw new ParseError(`expected '"' at ${colon + 1}`);
    const start = colon + 2;
    const content = readBytes(str, start, len, "string");
    const after = content.end;
    if (str[after] !== '"' || str[after + 1] !== ";") {
      throw new ParseError(`string not closed cleanly at ${ctx.i} (length prefix likely wrong)`);
    }
    ctx.i = after + 2;
    return { type: "str", v: content.value };
  }

  if (t === "a" || t === "O") {
    let className = null;
    let p = ctx.i + 2;
    if (t === "O") {
      const c = str.indexOf(":", p);
      if (c === -1) throw new ParseError(`bad object header at ${ctx.i}`);
      const clen = readUnsigned(str, p, c, "class name length");
      if (str[c + 1] !== '"') throw new ParseError(`expected '"' at ${c + 1}`);
      const classPart = readBytes(str, c + 2, clen, "class name");
      className = classPart.value;
      if (str[classPart.end] !== '"' || str[classPart.end + 1] !== ":") {
        throw new ParseError(`bad object class at ${ctx.i}`);
      }
      p = classPart.end + 2;
    }
    const colon = str.indexOf(":", p);
    if (colon === -1) throw new ParseError(`bad count at ${ctx.i}`);
    const n = readUnsigned(str, p, colon, "item count");
    if (n > MAX_NODES - ctx.nodes) throw new ParseError(`item count is too large at ${p}`);
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

  if (t === "r" || t === "R") {
    // Reference: r:N;  (value ref)  or  R:N;  (object ref). Structural, no
    // string content of its own, so it is preserved verbatim.
    if (str[ctx.i + 1] !== ":") throw new ParseError(`expected ':' at ${ctx.i + 1}`);
    const end = str.indexOf(";", ctx.i + 2);
    if (end === -1) throw new ParseError(`unterminated reference at ${ctx.i}`);
    const raw = str.slice(ctx.i + 2, end);
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw))) {
      throw new ParseError(`bad reference at ${ctx.i}`);
    }
    ctx.i = end + 1;
    return { type: "ref", token: t, raw };
  }

  if (t === "C") {
    // Custom (Serializable): C:namelen:"Class":datalen:{payload}. The payload
    // is an opaque, class-defined byte blob, so it is preserved verbatim rather
    // than searched (its length prefix would break under a naive edit).
    let p = ctx.i + 2;
    const c1 = str.indexOf(":", p);
    if (c1 === -1) throw new ParseError(`bad custom header at ${ctx.i}`);
    const namelen = readUnsigned(str, p, c1, "custom class name length");
    if (str[c1 + 1] !== '"') throw new ParseError(`expected '"' at ${c1 + 1}`);
    const classPart = readBytes(str, c1 + 2, namelen, "custom class name");
    const className = classPart.value;
    let q = classPart.end;
    if (str[q] !== '"' || str[q + 1] !== ":") throw new ParseError(`bad custom class at ${ctx.i}`);
    q += 2;
    const c2 = str.indexOf(":", q);
    if (c2 === -1) throw new ParseError(`bad custom length at ${ctx.i}`);
    const datalen = readUnsigned(str, q, c2, "custom payload length");
    if (str[c2 + 1] !== "{") throw new ParseError(`expected '{' at ${c2 + 1}`);
    const dataStart = c2 + 2;
    const dataPart = readBytes(str, dataStart, datalen, "custom payload");
    const data = dataPart.value;
    const after = dataPart.end;
    if (str[after] !== "}") throw new ParseError(`custom not closed at ${ctx.i}`);
    ctx.i = after + 1;
    return { type: "custom", className, data };
  }

  throw new ParseError(`unknown token ${JSON.stringify(t)} at ${ctx.i}`);
  } finally {
    ctx.depth -= 1;
  }
}

/** Parse a single serialized value. Throws ParseError on malformed input. */
export function parse(str) {
  if (typeof str !== "string") throw new ParseError("serialized value must be a string");
  if (byteLength(str) > MAX_INPUT_BYTES) throw new ParseError(`serialized value exceeds ${MAX_INPUT_BYTES} bytes`);
  const ctx = { i: 0, depth: 0, nodes: 0 };
  const node = parseNode(str, ctx);
  if (ctx.i !== str.length) throw new ParseError(`trailing data at ${ctx.i}`);
  return node;
}

/** True if the whole string is one well-formed serialized value. */
export function isSerialized(str) {
  if (typeof str !== "string" || str.length < 2) return false;
  if (!/^[NbidsaOrRC]:/.test(str) && str !== "N;") return false;
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
    case "ref": return `${node.token}:${node.raw};`;
    case "custom": return `C:${byteLength(node.className)}:"${node.className}":${byteLength(node.data)}:{${node.data}}`;
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
    if (find.length > MAX_REGEX_LENGTH) throw new Error(`regular expression exceeds ${MAX_REGEX_LENGTH} characters`);
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
  if (find === "") return str;
  const tree = parse(str);
  const fn = makeReplacer(find, replace, opts);
  const nestedDepth = opts.nestedDepth || 0;
  const deepFn = (s) => {
    if (isSerialized(s)) {
      if (nestedDepth >= 32) return s;
      try { return strictReplace(s, find, replace, { ...opts, nestedDepth: nestedDepth + 1 }); } catch { /* fall through */ }
    }
    return fn(s);
  };
  applyToStrings(tree, opts.nested === false ? fn : deepFn);
  return serialize(tree);
}

/* ----------------------------- repair ----------------------------- */

/**
 * Repair serialized data whose s: length prefixes are wrong.
 * It explores possible string boundaries while following the declared array
 * and object structure. A repair is returned only when exactly one complete,
 * valid serialized value can be reconstructed. Ambiguous input is unchanged.
 */
export function repair(str) {
  if (isSerialized(str)) return { text: str, fixed: 0, ok: true };
  if (byteLength(str) > MAX_INPUT_BYTES) {
    return { text: str, fixed: 0, ok: false, error: `value exceeds ${MAX_INPUT_BYTES} bytes` };
  }

  const budget = { nodes: 0, branches: 0 };
  const maxStates = 32;

  function nodeAt(pos, depth) {
    budget.nodes += 1;
    if (budget.nodes > MAX_NODES || depth > MAX_DEPTH) throw new ParseError("repair limits exceeded");
    const token = str[pos];

    if (token === "s") {
      const colon = str.indexOf(":", pos + 2);
      if (colon === -1) return [];
      let declared;
      try { declared = readUnsigned(str, pos + 2, colon, "string length"); } catch { return []; }
      if (str[colon + 1] !== '"') return [];
      const contentStart = colon + 2;
      const states = [];
      let close = str.indexOf('";', contentStart);
      while (close !== -1 && budget.branches < 5000) {
        budget.branches += 1;
        const content = str.slice(contentStart, close);
        const actual = byteLength(content);
        states.push({ end: close + 2, text: `s:${actual}:"${content}";`, fixed: actual === declared ? 0 : 1 });
        if (states.length >= maxStates) break;
        close = str.indexOf('";', close + 2);
      }
      return states;
    }

    if (token === "a" || token === "O") {
      let p = pos + 2;
      if (token === "O") {
        const colon = str.indexOf(":", p);
        if (colon === -1) return [];
        let length;
        try { length = readUnsigned(str, p, colon, "class name length"); } catch { return []; }
        if (str[colon + 1] !== '"') return [];
        let classPart;
        try { classPart = readBytes(str, colon + 2, length, "class name"); } catch { return []; }
        if (str[classPart.end] !== '"' || str[classPart.end + 1] !== ":") return [];
        p = classPart.end + 2;
      }
      const countColon = str.indexOf(":", p);
      if (countColon === -1) return [];
      let count;
      try { count = readUnsigned(str, p, countColon, "item count"); } catch { return []; }
      if (count > MAX_NODES || str[countColon + 1] !== "{") return [];
      const bodyStart = countColon + 2;
      let states = [{ end: bodyStart, text: str.slice(pos, bodyStart), fixed: 0 }];
      for (let i = 0; i < count * 2; i++) {
        const next = [];
        for (const state of states) {
          for (const child of nodeAt(state.end, depth + 1)) {
            next.push({ end: child.end, text: state.text + child.text, fixed: state.fixed + child.fixed });
            if (next.length >= maxStates) break;
          }
          if (next.length >= maxStates) break;
        }
        states = next;
        if (!states.length) return [];
      }
      return states
        .filter((state) => str[state.end] === "}")
        .map((state) => ({ ...state, end: state.end + 1, text: state.text + "}" }));
    }

    let end = -1;
    if (token === "N") end = pos + 2;
    else if (token === "b" || token === "i" || token === "d" || token === "r" || token === "R") {
      const semi = str.indexOf(";", pos + 2);
      if (semi !== -1) end = semi + 1;
    } else if (token === "C") {
      const c1 = str.indexOf(":", pos + 2);
      if (c1 !== -1) {
        try {
          const nameLength = readUnsigned(str, pos + 2, c1, "custom class name length");
          const classPart = readBytes(str, c1 + 2, nameLength, "custom class name");
          if (str[c1 + 1] !== '"' || str[classPart.end] !== '"' || str[classPart.end + 1] !== ":") return [];
          const c2 = str.indexOf(":", classPart.end + 2);
          const dataLength = readUnsigned(str, classPart.end + 2, c2, "custom payload length");
          if (str[c2 + 1] !== "{") return [];
          const dataPart = readBytes(str, c2 + 2, dataLength, "custom payload");
          if (str[dataPart.end] === "}") end = dataPart.end + 1;
        } catch { return []; }
      }
    }
    if (end === -1) return [];
    const text = str.slice(pos, end);
    try {
      parse(text);
      return [{ end, text, fixed: 0 }];
    } catch { return []; }
  }

  let candidates;
  try {
    candidates = nodeAt(0, 1).filter((candidate) => candidate.end === str.length && isSerialized(candidate.text));
  } catch {
    candidates = [];
  }
  const unique = [...new Map(candidates.map((candidate) => [candidate.text, candidate])).values()];
  if (unique.length === 1) {
    const { text, fixed } = unique[0];
    return { text, fixed, ok: true };
  }
  return {
    text: str,
    fixed: 0,
    ok: false,
    error: unique.length ? "repair is ambiguous; input was left unchanged" : "could not repair this value safely"
  };
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
  let replaceError = null;
  if (mode !== "repair" && find) {
    try { makeReplacer(find, replace, { regex }); }
    catch (e) { replaceError = e; }
  }

  const results = targets.map((raw) => {
    const value = multi ? raw : input;
    if (multi && !raw.trim()) return { kind: "blank", input: raw, output: raw };

    const serialized = isSerialized(value.trim());
    if (mode === "repair") {
      const r = repair(value);
      return { kind: serialized ? "serialized" : "plain", repaired: r.fixed, input: value, output: r.text, ok: r.ok, error: r.error };
    }

    if (replaceError) {
      return { kind: serialized ? "serialized" : "plain", input: value, output: value, ok: false, error: replaceError.message };
    }

    if (!find) return { kind: serialized ? "serialized" : "plain", input: value, output: value, ok: true, note: "no search term" };

    if (serialized) {
      try {
        const trimmed = value.trim();
        const start = value.indexOf(trimmed);
        const output = value.slice(0, start) + strictReplace(trimmed, find, replace, { regex }) + value.slice(start + trimmed.length);
        return { kind: "serialized", input: value, output, ok: true };
      } catch (e) {
        return { kind: "serialized", input: value, output: value, ok: false, error: e.message };
      }
    }
    const fn = makeReplacer(find, replace, { regex });
    return { kind: "plain", input: value, output: fn(value), ok: true };
  });

  return { multi, results: multi ? results.filter((result) => result.kind !== "blank") : results };
}

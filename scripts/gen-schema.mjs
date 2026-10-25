#!/usr/bin/env node
// Build-time generator of the TL schema data the reader (src/mtproto/schema/reader.js) interprets.
//
// Source: the layer-198 API schema as TL text (the string exported by gramjs's `telegram/tl/apiTl.js`, public protocol
// data). Only the TYPES section is used, and only the transitive closure of the constructors reachable from ROOTS, so
// the bundle carries what the library can actually meet in an answer it decodes.
//
//   node scripts/gen-schema.mjs [path/to/apiTl.js]     -> src/mtproto/schema/generated.js
//
// Output format (compact, parsed lazily at run time):
//   SCHEMA_TYPES: [typeName, ...]                         boxed types, referenced by index
//   SCHEMA_CTORS: "id name typeIndex p1 p2 ...\n..."      one constructor per line, id in hex
//   a param is "name:code" or "name:flagField.bit?code", code is one of
//     # flags field   i int   l long   d double   q int128   Q int256   s string   b bytes   B Bool   t true
//     <n> a boxed object of SCHEMA_TYPES[n]   V<code> Vector<...>   v<code> bare vector<...>   %name a bare constructor
import { writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_SOURCE = "/Users/cristian/telegram-mtproto-spike/node_modules/telegram/tl/apiTl.js";
export const LAYER = 198;

export const ROOTS = [
  "updates.State", "updates.Difference", "updates.ChannelDifference", "messages.Messages",
  "Message", "MessageMedia", "Document", "DocumentAttribute", "Chat", "User", "Peer", "Update", "Updates",
  // account mode (0.3.0): the dialog list, the QR login and the 2FA password
  "messages.Dialogs", "auth.LoginToken", "auth.Authorization", "account.Password", "auth.LoggedOut",
];

const PRIMITIVES = { "#": "#", int: "i", long: "l", double: "d", int128: "q", int256: "Q", string: "s", bytes: "b", Bool: "B", true: "t" };
// Core constructors the reader knows natively (or that never appear in an answer).
const BUILTIN = new Set(["boolFalse", "boolTrue", "true", "vector", "error", "null"]);

/** TL text -> [{ id, name, type, params: [{ name, flag?, type }] }] of the types section. */
export function parseTl(text) {
  const out = [];
  for (let line of text.split("\n")) {
    line = line.replace(/\/\/.*$/, "").trim();
    if (line === "---functions---") break;
    if (!line || line.startsWith("---")) continue;
    if (BUILTIN.has(line.split("#")[0])) continue;
    const m = /^([\w.]+)#([0-9a-f]+)\s*(.*?)\s*=\s*([\w.<>]+);$/.exec(line);
    if (!m) throw new Error("cannot read TL line: " + line);
    const [, name, idHex, rest, type] = m;
    if (BUILTIN.has(name)) continue;
    const params = [];
    for (const p of rest.split(/\s+/).filter(Boolean)) {
      if (p.startsWith("{") || p.startsWith("!")) throw new Error("generic parameter in a type: " + line);
      const pm = /^(\w+):(?:(\w+)\.(\d+)\?)?(.+)$/.exec(p);
      if (!pm) throw new Error("cannot read param " + p + " in " + line);
      params.push({ name: pm[1], flag: pm[2] ? { field: pm[2], bit: Number(pm[3]) } : null, type: pm[4] });
    }
    out.push({ id: parseInt(idHex, 16) >>> 0, name, type, params });
  }
  return out;
}

const isBoxed = (t) => /^[A-Z]/.test(t.split(".").pop());

/** The constructors reachable from `roots` (type names), in schema order. */
export function closure(ctors, roots) {
  const byType = new Map(), byName = new Map();
  for (const c of ctors) {
    if (!byType.has(c.type)) byType.set(c.type, []);
    byType.get(c.type).push(c);
    byName.set(c.name, c);
  }
  const keep = new Set();
  const seenTypes = new Set();
  const visitType = (t) => {
    const inner = /^[Vv]ector<(.+)>$/.exec(t);
    if (inner) return visitType(inner[1]);
    if (PRIMITIVES[t] !== undefined) return;
    if (isBoxed(t)) {
      if (seenTypes.has(t)) return;
      seenTypes.add(t);
      const list = byType.get(t);
      if (!list) throw new Error("type without constructors: " + t);
      for (const c of list) visitCtor(c);
    } else {
      const c = byName.get(t.replace(/^%/, ""));
      if (!c) throw new Error("unknown bare type " + t);
      visitCtor(c);
    }
  };
  const visitCtor = (c) => {
    if (keep.has(c)) return;
    keep.add(c);
    for (const p of c.params) visitType(p.type);
  };
  for (const r of roots) visitType(r);
  return ctors.filter((c) => keep.has(c));
}

export function encode(ctors) {
  const types = [];
  const typeIndex = new Map();
  const tIdx = (t) => {
    if (!typeIndex.has(t)) { typeIndex.set(t, types.length); types.push(t); }
    return typeIndex.get(t);
  };
  // Types in a stable order: every type that owns a kept constructor.
  for (const c of ctors) tIdx(c.type);
  const code = (t) => {
    const v = /^Vector<(.+)>$/.exec(t);
    if (v) return "V" + code(v[1]);
    const bv = /^vector<(.+)>$/.exec(t);
    if (bv) return "v" + code(bv[1]);
    if (PRIMITIVES[t] !== undefined) return PRIMITIVES[t];
    if (isBoxed(t)) return String(tIdx(t));
    return "%" + t.replace(/^%/, "");
  };
  const lines = ctors.map((c) => [c.id.toString(16), c.name, tIdx(c.type), ...c.params.map((p) => p.name + ":" + (p.flag ? p.flag.field + "." + p.flag.bit + "?" : "") + code(p.type))].join(" "));
  return { types, ctors: lines.join("\n") };
}

export function generate(text, roots = ROOTS) {
  const all = parseTl(text);
  const kept = closure(all, roots);
  const { types, ctors } = encode(kept);
  const source = "// Generated by scripts/gen-schema.mjs from the layer-" + LAYER + " TL schema -- do not edit.\n" +
    "// Roots: " + roots.join(", ") + ". " + kept.length + " of " + all.length + " constructors, " + types.length + " types.\n" +
    "export const SCHEMA_LAYER = " + LAYER + ";\n" +
    "export const SCHEMA_TYPES = " + JSON.stringify(types) + ";\n" +
    "export const SCHEMA_CTORS = " + JSON.stringify(ctors) + ";\n";
  return { source, constructors: kept.length, total: all.length, types: types.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const src = resolve(process.argv[2] || DEFAULT_SOURCE);
  const text = createRequire(import.meta.url)(src);
  if (typeof text !== "string") throw new Error(src + " does not export a TL string");
  const out = resolve(root, "src/mtproto/schema/generated.js");
  const g = generate(text);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, g.source);
  console.log("wrote " + out + ": " + g.constructors + "/" + g.total + " constructors, " + g.types + " types, " + g.source.length + " bytes");
}

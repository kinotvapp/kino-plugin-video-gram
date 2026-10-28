// Pure pieces of the plugin shell: how a read is split into getFile requests, the published bundle being current.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { installKino } from "../testkit/kino.mjs";
import { bundle } from "../scripts/build.mjs";
import { scanMissingGlobals } from "../sdk/sandbox.mjs";

installKino();
const { pieces } = await import("../src/shell/read.js");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MiB = 1048576;

test("pieces: Kino's 1 MiB reads at MiB offsets are one request; other ranges never cross a MiB and cover every byte", () => {
  assert.deepEqual(pieces(0, MiB), [{ offset: 0, limit: MiB }]);
  assert.deepEqual(pieces(5 * MiB, 100), [{ offset: 5 * MiB, limit: 4096 }]);
  assert.deepEqual(pieces(2 * MiB, 524388), [{ offset: 2 * MiB, limit: MiB }]);
  for (const [offset, want] of [[12288, MiB], [MiB - 4096, 8192], [4096 * 7, 300000], [MiB * 3 + 4096 * 100, MiB]]) {
    const list = pieces(offset, want);
    let cur = offset;
    for (const p of list) {
      assert.equal(p.offset, cur);
      assert.ok(p.limit % 4096 === 0 && MiB % p.limit === 0, "limit " + p.limit);
      assert.equal(Math.floor(p.offset / MiB), Math.floor((p.offset + p.limit - 1) / MiB), "crosses a MiB");
      cur += p.limit;
    }
    assert.ok(cur >= offset + want && cur - p0(list) < offset + want + 4096 * 256, "covers the range");
  }
});
const p0 = (list) => list[list.length - 1].limit;

test("the published plugin.js is the bundle of src/plugin.js, one ES module Kino can load", () => {
  const built = bundle(resolve(root, "src/plugin.js"));
  assert.equal(readFileSync(resolve(root, "plugin.js"), "utf8"), built, "plugin.js is stale: run npm run build");
  assert.doesNotMatch(built, /^\s*import\s/m);
  assert.deepEqual(scanMissingGlobals(built), []);
  assert.ok(built.length < 1024 * 1024, "Kino's entry file limit is 1 MB");
  for (const name of ["home", "search", "browse", "resolve", "read", "details", "section", "categories", "screen", "screenEvent", "image"]) {
    assert.match(built, new RegExp("^export async function " + name + "\\(", "m"), name);
  }
});

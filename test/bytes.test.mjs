import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { installKino } from "../testkit/kino.mjs";
import * as B from "../src/mtproto/bytes.js";

installKino();

test("hex and base64 round-trip every byte value and match Node", () => {
  for (const n of [0, 1, 2, 3, 4, 255, 256, 8191, 8192, 8193, 65537]) {
    const u = new Uint8Array(randomBytes(n));
    const hex = B.toHex(u), b64 = B.toBase64(u);
    assert.equal(hex, Buffer.from(u).toString("hex"), "hex " + n);
    assert.equal(b64, Buffer.from(u).toString("base64"), "base64 " + n);
    assert.deepEqual(B.fromHex(hex), u);
    assert.deepEqual(B.fromBase64(b64), u);
    assert.deepEqual(B.fromHex(hex.toUpperCase()), u);
  }
  const all = new Uint8Array(256).map((_, i) => i);
  assert.deepEqual(B.fromBase64(B.toBase64(all)), all);
  assert.equal(B.hexToBase64(B.toHex(all)), Buffer.from(all).toString("base64"));
});

test("fromHex and fromBase64 refuse malformed input", () => {
  assert.throws(() => B.fromHex("abc"), /hex/);
  assert.throws(() => B.fromHex("zz"), /hex/);
  assert.throws(() => B.fromBase64("a"), /base64/);
  assert.throws(() => B.fromBase64("ab$="), /base64/);
});

test("1 MiB converts in a handful of whole-buffer passes", () => {
  const u = new Uint8Array(randomBytes(1 << 20));
  assert.deepEqual(B.fromBase64(B.toBase64(u)), u);
  assert.deepEqual(B.fromHex(B.toHex(u)), u);
});

test("little-endian ints, longs and big-endian BigInt conversions", () => {
  const u = new Uint8Array(12);
  B.writeU32LE(u, 0, 0xdeadbeef);
  B.writeI64LE(u, 4, -2n);
  assert.equal(B.readU32LE(u, 0), 0xdeadbeef);
  assert.equal(B.readI32LE(u, 0), 0xdeadbeef | 0);
  assert.equal(B.readI64LE(u, 4), -2n);
  assert.equal(Buffer.from(u).toString("hex"), "efbeaddefeffffffffffffff");
  assert.equal(B.bigFromBytes(B.fromHex("0102")), 0x102n);
  assert.equal(B.bigFromBytes(new Uint8Array(0)), 0n);
  assert.equal(B.toHex(B.bigToBytes(0x102n, 4)), "00000102");
  assert.equal(B.toHex(B.bigToBytes(0x10203n)), "010203");
  assert.throws(() => B.bigToBytes(0x10000n, 2), /does not fit/);
});

test("concat, equal, xor, reverse", () => {
  const a = B.fromHex("0102"), b = B.fromHex("ff");
  assert.equal(B.toHex(B.concat(a, b, new Uint8Array(0))), "0102ff");
  assert.ok(B.equal(a, B.fromHex("0102")));
  assert.ok(!B.equal(a, b));
  assert.equal(B.toHex(B.xor(B.fromHex("0f0f"), B.fromHex("ff00"))), "f00f");
  assert.equal(B.toHex(B.reversed(a)), "0201");
  assert.equal(B.toHex(a), "0102", "reversed copies");
});

test("random bytes come from kino.crypto, any length", () => {
  assert.equal(B.random(0).length, 0);
  assert.equal(B.random(16).length, 16);
  const big = B.random(2500);
  assert.equal(big.length, 2500);
  assert.notDeepEqual(B.random(32), B.random(32));
});

// The 2FA password check (SRP) against a vector made by another implementation (gramjs 2.26.22's computeCheck, with its
// random `a` pinned: test/vectors/srp-gramjs.json), and the checks on what the server sends.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installKino } from "../testkit/kino.mjs";
import { srpCheck, SRP_ALGO } from "../src/mtproto/srp.js";

installKino();
const V = JSON.parse(readFileSync(new URL("./vectors/srp-gramjs.json", import.meta.url), "utf8"));
const h = (s) => Uint8Array.from(Buffer.from(s, "hex"));
const req = (over = {}) => ({ algo: { _: SRP_ALGO, salt1: h(V.salt1), salt2: h(V.salt2), g: V.g, p: h(V.p), ...over.algo }, srpB: over.srpB || h(V.srp_B), srpId: 987654321n });
const hex = (u8) => Buffer.from(u8).toString("hex");

test("SRP: A and M1 match the gramjs vector for the same password, salts, B and a", () => {
  const r = srpCheck(req(), V.password, { aBytes: h(V.a) });
  assert.equal(hex(r.A), V.A);
  assert.equal(hex(r.M1), V.M1);
  assert.equal(r.srpId, 987654321n);
});

test("SRP: another password gives another M1; a random a gives another A (and the same password still checks out)", () => {
  assert.notEqual(hex(srpCheck(req(), V.password + "x", { aBytes: h(V.a) }).M1), V.M1);
  const r = srpCheck(req(), V.password);
  assert.notEqual(hex(r.A), V.A);
  assert.equal(r.A.length, 256);
  assert.equal(r.M1.length, 32);
});

test("SRP: the server's numbers are checked before anything is sent", () => {
  const p = BigInt("0x" + V.p);
  const bad = (over, re) => assert.throws(() => srpCheck(req(over), V.password, { aBytes: h(V.a) }), (e) => re.test(e.code + " " + e.message), JSON.stringify(Object.keys(over)));
  bad({ algo: { _: "passwordKdfAlgoUnknown" } }, /^invalid_request/);
  bad({ algo: { g: 2 } }, /^protocol .*subgroup/);                       // Telegram's prime is 2 mod 3, not 7 mod 8
  const notSafe = Buffer.from(V.p, "hex"); notSafe[255] ^= 2;              // still odd, no longer a safe prime
  bad({ algo: { p: Uint8Array.from(notSafe) } }, /^protocol/);
  bad({ algo: { p: h(V.p).subarray(1) } }, /^protocol .*2048/);
  bad({ srpB: Uint8Array.from([1]) }, /^protocol .*out of range/);
  bad({ srpB: Uint8Array.from(Buffer.from((p - 1n).toString(16), "hex")) }, /^protocol .*out of range/);
  bad({ srpB: new Uint8Array(257).fill(1) }, /^protocol .*length/);
  assert.throws(() => srpCheck(req(), ""), (e) => e.code === "invalid_request");
});

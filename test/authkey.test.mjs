import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, generatePrimeSync } from "node:crypto";
import { installKino } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa, fingerprintOf, TELEGRAM_PRIME } from "../testkit/fake-dc.mjs";
import { factorPq, rsaFingerprint, checkDhPrime, isProbablePrime, createAuthKey } from "../src/mtproto/authkey.js";
import { Transport } from "../src/mtproto/transport.js";
import { TELEGRAM_PUBLIC_KEYS } from "../src/mtproto/keys.js";
import { toHex } from "../src/mtproto/bytes.js";

installKino();

test("pq of about 63 bits factors into its two primes, smaller first", () => {
  const cases = [
    [1724114033281923457n, 1229739323n, 1402015859n],   // the example of Telegram's documentation
    [4294967291n * 4294967279n, 4294967279n, 4294967291n],
  ];
  for (const [pq, p, q] of cases) assert.deepEqual(factorPq(pq), [p, q], String(pq));
  for (let i = 0; i < 5; i++) {
    const a = generatePrimeSync(31, { bigint: true }), b = generatePrimeSync(32, { bigint: true });
    assert.deepEqual(factorPq(a * b), a < b ? [a, b] : [b, a]);
  }
  assert.deepEqual(factorPq(2n * 1000003n), [2n, 1000003n]);
});

test("the stored Telegram public keys carry the fingerprints Telegram lists (the key data is intact)", () => {
  for (const [fp, k] of Object.entries(TELEGRAM_PUBLIC_KEYS)) {
    assert.equal(rsaFingerprint(k.n, k.e), fp);
    assert.equal(fingerprintOf(BigInt("0x" + k.n), BigInt(k.e)), fp);
  }
});

test("Telegram's well-known 2048-bit prime is accepted without primality rounds; a prime that is not safe is refused", () => {
  assert.deepEqual(checkDhPrime(TELEGRAM_PRIME, 3), { known: true });
  assert.throws(() => checkDhPrime(TELEGRAM_PRIME, 2), /g = 2/);           // p mod 8 must be 7 for g = 2
  const notSafe = generatePrimeSync(2048, { bigint: true, safe: false });
  assert.throws(() => checkDhPrime(notSafe | 1n, 3), (e) => e.code === "protocol");
  assert.throws(() => checkDhPrime(TELEGRAM_PRIME >> 1n, 3), /2048 bits/);
  assert.throws(() => checkDhPrime(TELEGRAM_PRIME, 9), /g/);
});

test("Miller-Rabin over kino.crypto.modPow tells primes from composites", () => {
  const p = generatePrimeSync(512, { bigint: true, safe: true });
  assert.equal(isProbablePrime(p), true);
  assert.equal(isProbablePrime((p - 1n) / 2n), true);
  assert.equal(isProbablePrime(p * generatePrimeSync(64, { bigint: true })), false);
  assert.equal(isProbablePrime(561n), false);   // a Carmichael number
  assert.equal(isProbablePrime(2n), true);
  assert.equal(isProbablePrime(1n), false);
});

test("an auth key is created against the fake DC: both sides hold the same key, id and salt", async () => {
  const tg = new FakeTelegram().install();
  try {
    const t = await new Transport(2).open();
    const k = await createAuthKey(t, { dc: 2, publicKeys: fakeRsa().publicKeys });
    const dc = tg.dc(2);
    assert.equal(dc.stats.keyExchanges, 1);
    const stored = dc.authKeys.get(toHex(k.authKeyId));
    assert.ok(stored, "the server knows the key id");
    assert.equal(toHex(k.authKey), stored.key.toString("hex"));
    assert.equal(toHex(k.authKeyId), createHash("sha1").update(stored.key).digest().subarray(12, 20).toString("hex"));
    assert.equal(toHex(k.serverSalt), dc.salt.toString("hex"));
    assert.ok(Math.abs(k.timeOffset) <= 1);
    await t.close();
  } finally { tg.restore(); }
});

test("the key exchange refuses a server whose RSA key is not in the table", async () => {
  const tg = new FakeTelegram().install();
  try {
    const t = await new Transport(2).open();
    await assert.rejects(createAuthKey(t, { dc: 2, publicKeys: TELEGRAM_PUBLIC_KEYS }), (e) => e.code === "protocol" && /no known server key/.test(e.message));
    await t.close();
  } finally { tg.restore(); }
});

test("the key exchange refuses a g_a out of range", async () => {
  const tg = new FakeTelegram().install();
  tg.dc(2).forceGa = 1n;
  try {
    const t = await new Transport(2).open();
    await assert.rejects(createAuthKey(t, { dc: 2, publicKeys: fakeRsa().publicKeys }), /g_a/);
    await t.close();
  } finally { tg.restore(); }
});

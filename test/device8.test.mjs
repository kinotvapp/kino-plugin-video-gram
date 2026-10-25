// Device round 8: the new apiVersion 13 ops, feature-detected. kino.crypto.aesIgeVerify (AES-IGE decrypt + the MTProto
// msg_key SHA-256 check in one call) and kino.crypto.convert (hex -> base64 natively); the old path stays the fallback.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { hexToBase64Native } from "../src/shell/b64.js";
import { big } from "../src/mtproto/big.js";

const realKino = installKino();
const MiB = 1048576;
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const DOC = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
const SIZE = 4 * MiB + 1000;
let tg, data, calls;
beforeEach(() => {
  tg = new FakeTelegram().install();
  data = Buffer.alloc(SIZE);
  for (let i = 0; i < SIZE; i++) data[i] = (i * 29 + 1) & 255;
  tg.addFile({ ...DOC, dc: 2, data });
  big.reset();
});
afterEach(() => { globalThis.kino = realKino; tg.restore(); });

/** The kit's kino with every crypto op counted; `drop` lists ops to remove (an older Kino without them). */
function countingKino(drop = []) {
  calls = {};
  const crypto = {};
  for (const [name, fn] of Object.entries(realKino.crypto)) {
    if (drop.includes(name) || typeof fn !== "function") continue;
    crypto[name] = (...a) => {
      calls[name] = (calls[name] || 0) + 1;
      if (name === "hash" && typeof a[1] === "string" && a[1].length > 65536) calls.bigHash = (calls.bigHash || 0) + 1;
      return fn(...a);
    };
  }
  globalThis.kino = Object.freeze({ ...realKino, crypto: Object.freeze(crypto) });
}
async function client() {
  const c = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 4000, store: memoryStore() });
  await c.connect(2);
  await c.botLogin(CREDS);
  return c;
}
const hexOf = (off, len = MiB) => data.subarray(off, Math.min(off + len, SIZE)).toString("hex");

for (const [label, drop] of [["with aesIgeVerify", []], ["without it (an older Kino)", ["aesIgeVerify"]]]) {
  test("answers are decrypted and their msg_key checked " + label + ": exact bytes", async () => {
    countingKino(drop);
    const c = await client();
    calls = {};
    assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true }), hexOf(0));
    assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 4 * MiB, MiB, { hex: true }), hexOf(4 * MiB));
    if (drop.length) {
      assert.ok(!calls.aesIgeVerify && calls.aesIge > 0, "the old path: " + JSON.stringify(calls));
    } else {
      assert.ok(calls.aesIgeVerify > 0, "the new op: " + JSON.stringify(calls));
      assert.ok(!calls.bigHash, "no SHA-256 over a chunk next to it: " + JSON.stringify(calls));
    }
    assert.equal(big.live, 0, "nothing held after: " + big.live);
    await c.close();
  });

  test("a wrong msg_key is refused as protocol " + label, async () => {
    countingKino(drop);
    const c = await client();
    tg.dc(2).once("getFile", () => ({ tamper: "byte" }));
    await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true }), (e) => e.code === "protocol" && /msg_key mismatch/.test(e.message));
    assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(MiB), "and the next request reconnects");
    await c.close();
  });
}

for (const [label, drop] of [["with convert", []], ["without it (an older Kino)", ["convert"]]]) {
  test("hex to base64 " + label + ": exact for every length", () => {
    countingKino(drop);
    for (const n of [0, 1, 2, 3, 4097, MiB]) {
      const buf = Buffer.alloc(n);
      for (let i = 0; i < n; i++) buf[i] = (i * 7 + n) & 255;
      calls = {};
      assert.equal(hexToBase64Native(buf.toString("hex")), buf.toString("base64"), "length " + n);
      if (n === 0) continue;
      if (drop.length) assert.equal(calls.encrypt, 2, "two CTR passes");
      else { assert.equal(calls.convert, 1, "one native convert"); assert.ok(!calls.encrypt); }
    }
  });
}

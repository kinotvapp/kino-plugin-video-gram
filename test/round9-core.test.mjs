// Round 9, core: the incoming auth_key_id and padding checks, server msg_id parity and duplicates, requests resent
// when the server's new session begins after them, factorPq's bounds, the key exchange's single deadline, and the
// aesIgeVerify error mapping.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { factorPq, plainCall } from "../src/mtproto/authkey.js";
import { MsgIds } from "../src/mtproto/msgid.js";

const realKino = installKino();
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const DOC = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
let tg, lines;
beforeEach(() => { tg = new FakeTelegram().install(); tg.addFile({ ...DOC, dc: 2, data: Buffer.alloc(20000, 5) }); lines = []; });
afterEach(() => { globalThis.kino = realKino; tg.restore(); });
async function client() {
  const c = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 8000, store: memoryStore(), log: (m) => lines.push(m) });
  await c.connect(2);
  await c.botLogin(CREDS);
  return c;
}
const get = (c, opts) => c.getFile({ ...DOC, dcId: 2 }, 0, 4096, opts);

test("an answer under another auth_key_id is refused as protocol", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({ tamper: "keyId" }));
  await assert.rejects(get(c), (e) => e.code === "protocol" && /another auth key/.test(e.message));
  assert.equal((await get(c)).length, 4096, "the next request reconnects");
  await c.close();
});

test("an answer whose length field leaves under 12 bytes of padding is refused as protocol", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({ tamper: "padding" }));
  await assert.rejects(get(c), (e) => e.code === "protocol" && /bad message length/.test(e.message));
  await c.close();
});

test("a server message with an even msg_id is refused as protocol", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({ tamper: "evenId" }));
  await assert.rejects(get(c), (e) => e.code === "protocol" && /not odd/.test(e.message));
  await c.close();
});

test("a server message repeating an earlier msg_id is dropped (a replay); the request waits for its real answer", async () => {
  const c = await client();
  assert.equal((await get(c)).length, 4096);
  tg.dc(2).once("getFile", () => ({ tamper: "dupId" }));
  await assert.rejects(get(c, { deadline: Date.now() + 2500 }), (e) => e.code === "timeout");
  assert.ok(lines.some((l) => /duplicate server message dropped/.test(l)), lines.join("\n"));
  await c.close();
});

test("new_session_created after a request: the request is sent again and answered", async () => {
  const c = await client();
  const before = tg.dc(2).stats.getFile;
  tg.dc(2).once("getFile", () => ({ sessionReset: true }));
  assert.equal((await get(c, { deadline: Date.now() + 6000 })).length, 4096);
  assert.equal(tg.dc(2).stats.getFile, before + 1, "the lost request was sent again once");
  await c.close();
});

test("factorPq: refuses pq at or above 2^64 (and tiny ones), still factors a 62-bit semiprime", () => {
  assert.throws(() => factorPq(1n << 64n), (e) => e.code === "protocol");
  assert.throws(() => factorPq(3n), (e) => e.code === "protocol");
  const p = 2147483647n, q = 2147483629n;
  assert.deepEqual(factorPq(p * q), [q, p]);
});

test("plainCall: each answer waits only for what is left of the exchange's deadline; none once it has passed", async () => {
  const waits = [];
  const t = { sendHex: async () => {}, recvHex: async (w) => { waits.push(w); throw Object.assign(new Error("x"), { code: "timeout" }); } };
  let now = 1000;
  await assert.rejects(plainCall(t, new Uint8Array(4), { msgIds: new MsgIds(() => Date.now()), timeoutMs: 20000, deadline: 1500, now: () => now }));
  assert.equal(waits[0], 500);
  now = 2000;
  await assert.rejects(plainCall(t, new Uint8Array(4), { msgIds: new MsgIds(() => Date.now()), timeoutMs: 20000, deadline: 1500, now: () => now }), (e) => e.code === "timeout");
  assert.equal(waits.length, 1, "no wait once the deadline passed");
});

test("aesIgeVerify failing with any crypto_error is an answer that cannot be opened: protocol msg_key mismatch", async () => {
  const c = await client();
  let fail = false;
  globalThis.kino = Object.freeze({ ...realKino, crypto: Object.freeze({ ...realKino.crypto, aesIgeVerify: (...a) => { if (fail) { fail = false; throw Object.assign(new Error("some other words"), { code: "crypto_error" }); } return realKino.crypto.aesIgeVerify(...a); } }) });
  fail = true;
  await assert.rejects(get(c), (e) => e.code === "protocol" && /msg_key mismatch/.test(e.message));
  await c.close();
});

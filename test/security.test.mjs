// Every check the client makes on the server's handshake and session answers, each pinned by a fake DC that breaks
// exactly that one thing (testkit/fake-dc.mjs `tamper` and hooks). Without the check the exchange would go through.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { generatePrimeSync } from "node:crypto";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { createAuthKey } from "../src/mtproto/authkey.js";
import { Transport } from "../src/mtproto/transport.js";
import { TelegramClient } from "../src/mtproto/client.js";
import { random } from "../src/mtproto/bytes.js";

installKino();

let tg;
beforeEach(() => { tg = new FakeTelegram().install(); });
afterEach(() => tg.restore());

async function exchange(tamper, options = {}) {
  Object.assign(tg.dc(2).tamper, tamper);
  const t = await new Transport(2).open();
  try {
    return await createAuthKey(t, { dc: 2, publicKeys: fakeRsa().publicKeys, timeoutMs: 3000, ...options });
  } finally {
    await t.close();
  }
}
const refuses = (tamper, re, options) => assert.rejects(exchange(tamper, options), (e) => e.code === "protocol" && re.test(e.message), re.source);

test("baseline: the untampered fake DC completes the exchange", async () => {
  const k = await exchange({});
  assert.equal(k.authKey.length, 256);
});

test("resPQ with another nonce is refused", () => refuses({ resPqNonce: true }, /^nonce mismatch$/));
test("server_DH_params_ok with another nonce is refused", () => refuses({ dhNonce: true }, /nonce mismatch in server_DH_params/));
test("server_DH_params_ok with another server_nonce is refused", () => refuses({ dhServerNonce: true }, /nonce mismatch in server_DH_params/));
test("server_DH_inner_data with another nonce is refused", () => refuses({ innerNonce: true }, /nonce mismatch in inner data/));
test("server_DH_inner_data with another server_nonce is refused", () => refuses({ innerServerNonce: true }, /nonce mismatch in inner data/));
test("a corrupted answer hash is refused", () => refuses({ answerHash: true }, /answer hash mismatch/));
test("a dh_prime that is not 2048 bits is refused", () => refuses({ prime: generatePrimeSync(1024, { bigint: true, safe: true }) }, /not 2048 bits/));
test("a 2048-bit prime that is not safe is refused (g = 4 passes the residue check, so only Miller-Rabin catches it)", () => {
  let p;
  do { p = generatePrimeSync(2048, { bigint: true }); } while (p.toString(2).length !== 2048);
  return refuses({ prime: p, g: 4 }, /not a safe prime/);
});
test("g outside 2..7 is refused", () => refuses({ g: 11 }, /unexpected g/));
test("g that does not suit the prime is refused (g = 2 needs p mod 8 = 7)", () => refuses({ g: 2 }, /g = 2/));
test("a g_b out of range is never sent: a broken random source ends in a typed error", () => {
  const rand = (n) => (n === 256 ? new Uint8Array(256) : random(n)); // b = 0 -> g_b = 1
  return refuses({}, /g_b out of range/, { rand });
});
test("dh_gen_retry is refused", () => refuses({ dhGen: "retry" }, /dh_gen_retry/));
test("dh_gen_fail is refused", () => refuses({ dhGen: "fail" }, /dh_gen_fail/));
test("dh_gen_ok with another nonce is refused", () => refuses({ dhGenNonce: true }, /nonce mismatch in dh_gen_ok/));
test("dh_gen_ok with another server_nonce is refused", () => refuses({ dhGenServerNonce: true }, /nonce mismatch in dh_gen_ok/));
test("a corrupted new_nonce_hash1 is refused", () => refuses({ newNonceHash: true }, /new_nonce_hash1 mismatch/));

const DOC = { id: 1n, accessHash: 2n, fileReference: Uint8Array.from([3]) };
async function loggedIn() {
  tg.addFile({ ...DOC, dc: 2, data: Buffer.alloc(8192, 5) });
  const c = new TelegramClient({ apiId: 1, publicKeys: fakeRsa().publicKeys, timeoutMs: 2000, store: memoryStore() });
  await c.connect(2);
  await c.botLogin({ apiHash: "h", botToken: "1:t" });
  return c;
}

test("an encrypted answer with one byte flipped fails the msg_key check", async () => {
  const c = await loggedIn();
  tg.dc(2).once("getFile", () => ({ tamper: "byte" }));
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, 4096), (e) => e.code === "protocol" && /msg_key mismatch/.test(e.message));
  assert.equal((await c.getFile({ ...DOC, dcId: 2 }, 0, 4096)).length, 4096, "the next call reconnects");
  await c.close();
});

test("an encrypted answer under a session id we never had is refused", async () => {
  const c = await loggedIn();
  tg.dc(2).once("getFile", () => ({ tamper: "session" }));
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, 4096), (e) => e.code === "protocol" && /another session/.test(e.message));
  await c.close();
});

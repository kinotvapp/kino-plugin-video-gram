// Device round 6: drop() gives back the answered read-aheads it forgets, room-making failures get invoke's normal
// handling, and the no-room reconnect spends no login.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { big } from "../src/mtproto/big.js";

installKino();
const MiB = 1048576;
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const DOC = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
const SIZE = 24 * MiB + 1000;
let tg, data, store;
beforeEach(() => {
  tg = new FakeTelegram().install();
  data = Buffer.alloc(SIZE);
  for (let i = 0; i < SIZE; i++) data[i] = (i * 23 + 9) & 255;
  tg.addFile({ ...DOC, dc: 2, data });
  big.reset();
});
afterEach(() => tg.restore());
async function client() {
  store = memoryStore();
  const c = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 4000, store });
  await c.connect(2);
  await c.botLogin(CREDS);
  return c;
}
const hexOf = (off, len = MiB) => data.subarray(off, Math.min(off + len, SIZE)).toString("hex");
const ahead = (...ks) => ks.map((k) => ({ offset: k * MiB, limit: MiB }));
const get = (c, k, opts = {}) => c.getFile({ ...DOC, dcId: 2 }, k * MiB, MiB, { hex: true, ...opts });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** The reviewer's no-room set-up: after a hit, three requests in flight that never answer. */
async function noRoom(c) {
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ silent: true }));
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ silent: true }));
  tg.dc(2).once("getFile", () => ({ silent: true }));
  await get(c, 0, { ahead: ahead(1, 2) });
  await get(c, 2, { ahead: ahead(3, 4), abandon: true });
}

test("drop() gives back the answered read-aheads it forgets", async () => {
  const c = await client();
  await get(c, 0, { ahead: ahead(1, 2) });
  await wait(100);
  await get(c, 9);                 // pumps 1 and 2 into the cache
  assert.ok(big.live > 0, "the cache holds them");
  await c.drop(2);
  assert.equal(big.live, 0, "live " + big.live);
  assert.equal(c.aheadCount(), 0);
  await c.close();
});

test("the no-room reconnect: nothing left held, no login, nothing spent from the login budget", { timeout: 30000 }, async () => {
  const c = await client();
  await noRoom(c);
  const logins = tg.dc(2).stats.botLogins, budget = store.get("mtproto.botLogins");
  assert.equal(await get(c, 20, { abandon: true, deadline: Date.now() + 15000 }), hexOf(20 * MiB));
  assert.equal(tg.dc(2).stats.botLogins, logins, "no importBotAuthorization");
  assert.equal(store.get("mtproto.botLogins"), budget, "the login budget is untouched");
  assert.equal(big.live, 0, "live " + big.live);
  await c.close();
});

test("a socket that closes while the asked chunk waits for room gets invoke's handling: one new connection, the read succeeds", { timeout: 30000 }, async () => {
  const c = await client();
  await noRoom(c);
  setTimeout(() => tg.dc(2).dropConnections(), 300);
  assert.equal(await get(c, 20, { abandon: true, deadline: Date.now() + 15000 }), hexOf(20 * MiB));
  await c.close();
});

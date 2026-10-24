// Fix round 2 of 7b-2, core side: a deadline per request instead of a timeout shared on the client, a call queued
// behind a busy client fails at its own deadline, the discovery's pages respect a refresh deadline, and refetch does
// not wait behind a running refresh.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { createDiscovery } from "../src/mtproto/discovery.js";
import { getState } from "../src/mtproto/requests.js";

installKino();
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const CH = 1987654321n;
const DOC = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
let tg, world, client;
beforeEach(() => { tg = new FakeTelegram().install(); world = new FakeBotWorld({ diffPage: 50, channelPage: 1 }); tg.api = world; tg.addFile({ ...DOC, dc: 2, data: Buffer.alloc(9000, 1) }); });
afterEach(async () => { if (client) await client.close(); client = null; tg.restore(); });
async function loggedIn(timeoutMs = 8000) {
  client = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs, store: memoryStore() });
  await client.connect(2);
  await client.botLogin(CREDS);
  return client;
}

test("a request's own deadline bounds its wait, not the client's timeout; the next request keeps the default", async () => {
  const c = await loggedIn(8000);
  tg.dc(2).once("getFile", () => ({ silent: true }));
  const t0 = Date.now();
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, 4096, { deadline: Date.now() + 2500 }), (e) => e.code === "timeout" && e.deadline === true);
  assert.ok(Date.now() - t0 < 3000, "took " + (Date.now() - t0));
  assert.equal(c.timeoutMs, 8000, "nothing on the client changed");
  assert.equal((await c.getFile({ ...DOC, dcId: 2 }, 0, 4096)).length, 4096);
});

test("no request starts with under 1.5 s left before its deadline", async () => {
  const c = await loggedIn();
  const before = tg.dc(2).stats.getFile;
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, 4096, { deadline: Date.now() + 1000 }), (e) => e.code === "timeout" && e.deadline === true);
  assert.equal(tg.dc(2).stats.getFile, before, "nothing was sent");
});

test("a call queued behind a busy client fails at its own deadline instead of waiting its turn, and is never sent", { timeout: 20000 }, async () => {
  const c = await loggedIn(8000);
  tg.dc(2).once("getState", () => ({ delayMs: 6000 }));
  const slow = c.call(getState());
  const t0 = Date.now();
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, 4096, { deadline: Date.now() + 2500 }), (e) => e.code === "timeout");
  assert.ok(Date.now() - t0 < 3200, "failed fast: " + (Date.now() - t0));
  const before = tg.dc(2).stats.getFile;
  await slow;
  await new Promise((r) => setTimeout(r, 300));
  assert.equal(tg.dc(2).stats.getFile, before, "the expired call was dropped, not sent late");
});

test("discovery: a page that would run past the refresh deadline ends the refresh as incomplete, in time", { timeout: 20000 }, async () => {
  const c = await loggedIn(8000);
  world.addChannel({ id: CH, accessHash: 1n, title: "x" });
  world.post(CH, { doc: world.doc({ mime: "video/mp4", size: 10, fileName: "a.mp4" }) });
  tg.dc(2).once("getChannelDifference", () => ({ silent: true }));
  const d = createDiscovery({ client: c, store: memoryStore(), persistEntries: false });
  const t0 = Date.now();
  const r = await d.refresh({ deadline: Date.now() + 3000, commit: false });
  assert.equal(r.incomplete, true);
  assert.ok(Date.now() - t0 < 3500, "took " + (Date.now() - t0));
});

test("discovery (persistEntries false): refetch does not wait behind a running refresh", { timeout: 20000 }, async () => {
  const c = await loggedIn(8000);
  world.channelPage = 50;
  world.addChannel({ id: CH, accessHash: 1n, title: "x" });
  const id = world.post(CH, { doc: world.doc({ mime: "video/mp4", size: 10, fileName: "a.mp4" }) });
  const d = createDiscovery({ client: c, store: memoryStore(), persistEntries: false });
  const first = await d.refresh();
  const entry = first.changes.upserted[0];
  for (let i = 0; i < 3; i++) world.post(CH, { text: "t" + i });
  tg.dc(2).once("getDifference", () => ({ delayMs: 2000 }));
  tg.dc(2).once("getChannelDifference", () => ({ delayMs: 4000 }));
  const order = [];
  const refreshing = d.refresh().then(() => order.push("refresh"));
  await new Promise((r) => setTimeout(r, 200));
  const fresh = await d.refetch(entry, { deadline: Date.now() + 10000 }).then((e) => { order.push("refetch"); return e; });
  await refreshing;
  assert.equal(fresh.msgId, id);
  assert.deepEqual(order, ["refetch", "refresh"]);
});

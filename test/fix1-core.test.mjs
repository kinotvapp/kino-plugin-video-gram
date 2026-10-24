// Fix round 1 of 7b-2, core side: a dead auth key is dropped (AUTH_KEY_DUPLICATED / AUTH_KEY_INVALID), the discovery
// can defer saving its progress until the caller's own writes succeeded, and a refresh stops at a deadline.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { createDiscovery } from "../src/mtproto/discovery.js";

installKino();
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const CH = 1987654321n;
let tg, world, store, client;
beforeEach(() => { tg = new FakeTelegram().install(); world = new FakeBotWorld({ diffPage: 2, channelPage: 2 }); tg.api = world; store = memoryStore(); });
afterEach(async () => { if (client) await client.close(); client = null; tg.restore(); });
async function loggedIn() {
  client = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 3000, store });
  await client.connect(2);
  await client.botLogin(CREDS);
  return client;
}
const video = (n) => ({ text: n, doc: world.doc({ mime: "video/mp4", size: 1000, fileName: n + ".mp4" }) });

for (const rpc of ["AUTH_KEY_DUPLICATED", "AUTH_KEY_INVALID"]) {
  test(rpc + " drops that DC's key from the state (a dead key is never reused)", async () => {
    const c = await loggedIn();
    world.addChannel({ id: CH, accessHash: 1n, title: "x" });
    tg.dc(2).once("getState", () => ({ error: [406, rpc] }));
    const { getState } = await import("../src/mtproto/requests.js");
    await assert.rejects(c.call(getState()), (e) => e.code === "auth_key_unregistered");
    assert.equal(c.exportState().dcs["2"], undefined, "the key is gone");
  });
}

test("AUTH_KEY_UNREGISTERED keeps the key but marks it logged out", async () => {
  const c = await loggedIn();
  tg.dc(2).once("getState", () => ({ error: [401, "AUTH_KEY_UNREGISTERED"] }));
  const { getState } = await import("../src/mtproto/requests.js");
  await assert.rejects(c.call(getState()), (e) => e.code === "auth_key_unregistered");
  assert.equal(c.exportState().dcs["2"].loggedIn, false);
});

test("refresh({ commit: false }): nothing is saved until commit(); without it the next refresh reads the same pages again", async () => {
  const c = await loggedIn();
  world.addChannel({ id: CH, accessHash: 1n, title: "x" });
  world.post(CH, video("a"));
  const d = createDiscovery({ client: c, store, persistEntries: false });
  const r1 = await d.refresh({ commit: false });
  assert.equal(typeof r1.commit, "function");
  assert.equal(r1.changes.upserted.length, 1);
  assert.equal(store.get("tg.discovery"), null, "nothing saved yet");
  const r2 = await d.refresh({ commit: false }); // the caller's write failed: same runtime, no commit
  assert.equal(r2.changes.upserted.length, 1, "read again from the old state");
  r2.commit();
  assert.ok(JSON.parse(store.get("tg.discovery")).pts > 1);
  const r3 = await d.refresh({ commit: false });
  assert.equal(r3.changes.upserted.length, 0, "committed progress is kept");
});

test("refresh({ commit: false }) that throws saves nothing", async () => {
  const c = await loggedIn();
  world.addChannel({ id: CH, accessHash: 1n, title: "x" });
  world.post(CH, video("a"));
  tg.dc(2).once("getChannelDifference", () => ({ close: true }));
  tg.dc(2).once("getChannelDifference", () => ({ close: true }));
  const d = createDiscovery({ client: c, store, persistEntries: false });
  await assert.rejects(d.refresh({ commit: false }));
  assert.equal(store.get("tg.discovery"), null);
});

test("refresh({ deadline }): stops early, incomplete, and the next refresh goes on from the committed progress", async () => {
  const c = await loggedIn();
  world.addChannel({ id: CH, accessHash: 1n, title: "x" });
  for (let i = 0; i < 8; i++) world.post(CH, video("v" + i));
  let t = 0;
  const d = createDiscovery({ client: c, store, persistEntries: false, now: () => (t += 1000) });
  const r1 = await d.refresh({ deadline: 3500 });
  assert.equal(r1.incomplete, true);
  const got = new Set(r1.changes.upserted.map((e) => e.key));
  assert.ok(got.size < 8, "stopped before the end: " + got.size);
  t = 0;
  for (let i = 0; i < 20; i++) {
    const r = await createDiscovery({ client: c, store, persistEntries: false }).refresh();
    r.changes.upserted.forEach((e) => got.add(e.key));
    if (!r.incomplete) break;
  }
  assert.equal(got.size, 8);
});

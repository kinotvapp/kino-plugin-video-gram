// The discovery's options for a shell that keeps the index somewhere else (Kino's kino.catalog): `persistEntries: false`
// saves only the update state and reports each refresh's changes; `shouldScan` skips channels; `resetChannel` rescans
// one channel from pts 1; `knownChannels` lists the channels without the network.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { createDiscovery } from "../src/mtproto/discovery.js";

installKino();

const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const CH = 1987654321n, CH2 = 2000000001n;
const chat = (id) => String(-(1000000000000n + id));

let tg, world, store, client;
async function setup(options = {}) {
  world = new FakeBotWorld({ diffPage: 3, channelPage: 2 });
  tg.api = world;
  store = memoryStore();
  client = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 3000, store });
  await client.connect(2);
  await client.botLogin(CREDS);
  return createDiscovery({ client, store, ...options });
}
beforeEach(() => { tg = new FakeTelegram().install(); });
afterEach(async () => { if (client) await client.close(); client = null; tg.restore(); });
const video = (name) => ({ text: name, doc: world.doc({ mime: "video/mp4", size: 1000, fileName: name + ".mp4", video: { duration: 60, w: 640, h: 360 } }) });
const keys = (entries) => entries.map((e) => e.key).sort();

test("persistEntries false: the saved value holds the state only, each refresh reports what it added and removed", async () => {
  const d = await setup({ persistEntries: false });
  world.addChannel({ id: CH, accessHash: 11n, title: "Pelis" });
  const a = world.post(CH, video("a"));
  const b = world.post(CH, video("b"));

  const r1 = await d.refresh();
  assert.deepEqual(keys(r1.changes.upserted), [chat(CH) + ":" + a, chat(CH) + ":" + b].sort());
  assert.deepEqual(r1.changes.removed, []);
  assert.deepEqual(r1.changes.droppedChats, []);
  const saved = JSON.parse(store.get("tg.discovery"));
  assert.deepEqual(saved.entries, []);
  assert.ok(saved.channels[String(CH)], "the channel is in the saved state");
  assert.ok(saved.pts > 1);

  // A second runtime (a new discovery over the same store) gets only what is new, and the deletions by key.
  world.edit(CH, a, { text: "a, renamed" });
  world.remove(CH, [b]);
  const c = world.post(CH, video("c"));
  const d2 = createDiscovery({ client, store, persistEntries: false });
  const r2 = await d2.refresh();
  assert.deepEqual(keys(r2.changes.upserted), [chat(CH) + ":" + a, chat(CH) + ":" + c].sort());
  assert.deepEqual(r2.changes.removed, [chat(CH) + ":" + b]);
  assert.deepEqual(JSON.parse(store.get("tg.discovery")).entries, []);

  // Nothing new: nothing to report.
  const r3 = await d2.refresh();
  assert.deepEqual(r3.changes, { upserted: [], removed: [], droppedChats: [], commonDeletedIds: [] });
});

test("persistEntries false: an edit that turns a video into text is a removal; a lost channel is a dropped chat", async () => {
  const d = await setup({ persistEntries: false });
  world.addChannel({ id: CH, accessHash: 11n, title: "Pelis" });
  world.addChannel({ id: CH2, accessHash: 22n, title: "Viajes" });
  const a = world.post(CH, video("a"));
  world.post(CH2, video("x"));
  await d.refresh();
  world.edit(CH, a, { doc: undefined, text: "now text" });
  world.forbid(CH2);
  const r = await d.refresh();
  assert.deepEqual(r.changes.removed, [chat(CH) + ":" + a]);
  assert.deepEqual(r.changes.droppedChats, [chat(CH2)]);
  assert.equal(JSON.parse(store.get("tg.discovery")).channels[String(CH2)], undefined);
});

test("persistEntries false: refetch still answers the fresh entry (and null when the message is gone)", async () => {
  const d = await setup({ persistEntries: false });
  world.addChannel({ id: CH, accessHash: 11n, title: "Pelis" });
  const a = world.post(CH, video("a"));
  const r = await d.refresh();
  const entry = r.changes.upserted[0];
  world.rotateFileReference(CH, a);
  const fresh = await d.refetch(entry);
  assert.equal(fresh.key, entry.key);
  assert.notEqual(fresh.doc.fileReference, entry.doc.fileReference);
  world.remove(CH, [a]);
  assert.equal(await d.refetch(entry), null);
  assert.deepEqual(JSON.parse(store.get("tg.discovery")).entries, []);
});

test("shouldScan: a channel it refuses gets no getChannelDifference and keeps its pts", async () => {
  const d = await setup({ persistEntries: false });
  world.addChannel({ id: CH, accessHash: 11n, title: "Pelis" });
  world.addChannel({ id: CH2, accessHash: 22n, title: "Viajes" });
  world.post(CH, video("a"));
  world.post(CH2, video("x"));
  const r = await d.refresh({ shouldScan: (id) => id === String(CH) });
  const scanned = new Set(tg.requests.filter((q) => q.method === "getChannelDifference").map((q) => String(q.channelId)));
  assert.deepEqual([...scanned], [String(CH)]);
  assert.equal(r.state.channels[String(CH2)].pts, 1, "the skipped channel is still at pts 1");
  assert.ok(r.state.channels[String(CH)].pts > 1);
});

test("resetChannel: the channel is read again from pts 1 (its backfill cursor dropped); an unknown one answers false", async () => {
  const d = await setup({ persistEntries: false });
  world.addChannel({ id: CH, accessHash: 11n, title: "Pelis" });
  const a = world.post(CH, video("a"));
  await d.refresh();
  assert.equal(await d.resetChannel(String(CH)), true);
  assert.equal(JSON.parse(store.get("tg.discovery")).channels[String(CH)].pts, 1);
  assert.equal(await d.resetChannel(chat(CH)), true, "the -100... chat id works too");
  assert.equal(await d.resetChannel("42"), false);
  const before = tg.requests.length;
  const r = await d.refresh();
  const pts = tg.requests.slice(before).filter((q) => q.method === "getChannelDifference").map((q) => q.pts);
  assert.equal(pts[0], 1);
  assert.deepEqual(keys(r.changes.upserted), [chat(CH) + ":" + a]);
});

test("knownChannels: id, chat id and title of every channel, from the saved state, without the network", async () => {
  const d = await setup({ persistEntries: false });
  world.addChannel({ id: CH, accessHash: 11n, title: "Pelis" });
  world.addChannel({ id: CH2, accessHash: 22n, title: "Viajes" });
  await d.refresh();
  const before = tg.requests.length;
  const d2 = createDiscovery({ client, store, persistEntries: false });
  assert.deepEqual(await d2.knownChannels(), [
    { id: String(CH), chatId: chat(CH), title: "Pelis" },
    { id: String(CH2), chatId: chat(CH2), title: "Viajes" },
  ]);
  assert.equal(tg.requests.length, before);
});

test("the default (persistEntries true) is unchanged: entries are saved and no `changes` is reported", async () => {
  const d = await setup();
  world.addChannel({ id: CH, accessHash: 11n, title: "Pelis" });
  world.post(CH, video("a"));
  const r = await d.refresh();
  assert.equal(r.changes, undefined);
  assert.equal(JSON.parse(store.get("tg.discovery")).entries.length, 1);
});

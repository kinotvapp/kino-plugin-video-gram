// Account mode, the library (core): the chat list, which chats hold videos (probes), the walk of a chat switched on
// with the video and document filters, the newer-only refresh, a chat that is gone, and the refetch.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeAccount } from "../testkit/fake-account.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { createAccountDiscovery } from "../src/mtproto/account-library.js";

installKino();
let tg, acct, store, c;
beforeEach(async () => {
  tg = new FakeTelegram().install(); acct = new FakeAccount().install(tg); store = memoryStore();
  c = new TelegramClient({ apiId: 1234, publicKeys: fakeRsa().publicKeys, timeoutMs: 8000, store, mode: "account" });
  await c.connect(2);
  await c.qrLoginStep({ apiHash: "a".repeat(32) }); acct.scan(); await c.qrLoginStep({ apiHash: "a".repeat(32) });
});
afterEach(async () => { await c.close(); tg.restore(); });
const vid = (name, asFile = false) => ({ doc: acct.doc({ mime: asFile ? "video/x-matroska" : "video/mp4", size: 5000, fileName: name, video: asFile ? undefined : { duration: 60, w: 640, h: 360 } }), asFile });

test("only chats with a video become known; Saved Messages first; a video sent as a file counts", async () => {
  const pelis = acct.addChannel({ id: 3000000001n, accessHash: 9n, title: "Pelis" });
  const charla = acct.addGroup({ id: 4001n, title: "Charla" });
  const files = acct.addGroup({ id: 4002n, title: "Archivos" });
  acct.post(charla, { text: "hola" });
  acct.post(pelis, vid("a.mp4"));
  acct.post(files, vid("b.mkv", true));
  acct.post(acct.selfKey, vid("c.mp4"));
  const d = createAccountDiscovery({ client: c, store });
  const r = await d.refresh({ shouldScan: () => false });
  assert.deepEqual(Object.keys(r.state.chats).sort(), [pelis, files, acct.selfKey].sort());
  assert.equal(r.state.chats[acct.selfKey].seen, 1, "Saved Messages is probed first");
  assert.equal(r.state.chats[acct.selfKey].kind, "self");
  assert.equal(r.changes.upserted.length, 0, "nothing is read from a chat that is off");
  r.commit();
  assert.ok(acct.calls.every((m) => ["exportLoginToken", "getDialogs", "search"].includes(m)), acct.calls.join());
});

test("a chat switched on is walked (videos and files, 100 per page), then only newer messages are asked", async () => {
  const pelis = acct.addChannel({ id: 3000000001n, accessHash: 9n, title: "Pelis" });
  for (let i = 0; i < 130; i++) acct.post(pelis, vid("v" + i + ".mp4"));
  for (let i = 0; i < 3; i++) acct.post(pelis, vid("f" + i + ".mkv", true));
  acct.post(pelis, { text: "texto" });
  const d = createAccountDiscovery({ client: c, store });
  const r1 = await d.refresh({ shouldScan: (k) => k === pelis, maxPages: 50 });
  r1.commit();
  assert.equal(r1.changes.upserted.length, 133);
  assert.ok(r1.changes.upserted.every((e) => e.chatId === pelis && e.chatTitle === "Pelis"));
  const n = acct.stats.search;
  acct.post(pelis, vid("nuevo.mp4"));
  const r2 = await d.refresh({ shouldScan: (k) => k === pelis });
  r2.commit();
  assert.deepEqual(r2.changes.upserted.map((e) => e.title), ["nuevo"]);
  assert.equal(acct.stats.search - n, 2, "one newer-only search per filter");
});

test("a chat that left the list is dropped; refetch reads a message again (null when it is gone)", async () => {
  const pelis = acct.addChannel({ id: 3000000001n, accessHash: 9n, title: "Pelis" });
  const g = acct.addGroup({ id: 4002n, title: "Grupo" });
  const id = acct.post(g, vid("g.mp4"));
  acct.post(pelis, vid("a.mp4"));
  let now = 1000;
  const d = createAccountDiscovery({ client: c, store, now: () => now });
  (await d.refresh({ shouldScan: () => true })).commit();
  const e = await d.refetch({ chatId: g, msgId: id });
  assert.equal(e.title, "g");
  acct.chats.get(g).messages.delete(id);
  acct.post(g, { text: "sigue aquí" });
  assert.equal(await d.refetch({ chatId: g, msgId: id }), null);
  acct.remove(pelis);
  now += 31 * 60 * 1000;
  const r = await d.refresh({ shouldScan: () => true });
  assert.deepEqual(r.changes.droppedChats, [pelis]);
  assert.ok(!r.state.chats[pelis]);
});

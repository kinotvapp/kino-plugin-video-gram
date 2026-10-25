// Fix round 1 of 7b-2, plugin side: device-bound sessions, key recovery, the discovery committed only after the catalog
// writes, serialised connect and refresh, deterministic channel slots, and the minors (M1-M6).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device, places } from "../testkit/plugin-harness.mjs";
import { openSession } from "../testkit/session-open.mjs";

const MiB = 1048576;
const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const CH1 = 1987654321n, CH2 = 2000000001n;
const chat = (id) => String(-(1000000000000n + id));

let tg, world, devs;
const files = new Map();
function postVideo(channel, { name, size = 5000, dc = 2 }) {
  const data = Buffer.alloc(size);
  for (let i = 0; i < size; i++) data[i] = (i * 131 + size + name.length) & 255;
  const doc = world.doc({ mime: "video/mp4", size, fileName: name, video: { duration: 60, w: 640, h: 360 } });
  const id = world.post(channel, { doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc, data });
  files.set(chat(channel) + ":" + id, data);
  return chat(channel) + ":" + id;
}
const newDevice = (o) => { const d = device(o); devs.push(d); return d; };
const stats = () => tg.dc(2).stats;
const flat = (rows) => rows.flatMap((r) => r.items);
const sessionKeyId = (d) => openSession(d.base.storage.get("tg.session"), SETTINGS).dcs["2"].authKeyId; // tg.session is encrypted (v2)
/** A backup of `from`'s kino.storage restored on `to` (kino.catalog is never in a backup). */
function restore(from, to) {
  for (const k of to.base.storage.keys()) to.base.storage.remove(k);
  for (const k of from.base.storage.keys()) to.base.storage.set(k, from.base.storage.get(k));
}

beforeEach(() => {
  tg = new FakeTelegram().install();
  world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  files.clear();
  devs = [];
});
afterEach(() => { tg.restore(); for (const d of devs) d.close(); });

// ---- I1: the session belongs to the device that made it ----

test("I1 restore onto a device with an empty catalog: a new key, never the other device's", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, { name: "a.mp4" });
  const a = newDevice();
  await (await a.runtime(SETTINGS)).home();
  const b = newDevice();
  restore(a, b);
  const kx = stats().keyExchanges;
  const rows = await (await b.runtime(SETTINGS)).home();
  assert.equal(stats().keyExchanges, kx + 1);
  assert.notEqual(sessionKeyId(b), sessionKeyId(a));
  assert.ok(flat(rows).some((i) => i.ref === ref));
});

test("I1 restore onto a device that has its own non-empty catalog for the same bot: still a new key", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, { name: "a.mp4" });
  const a = newDevice();
  const b = newDevice();
  await (await a.runtime(SETTINGS)).home();
  await (await b.runtime(SETTINGS)).home();
  const bKey = sessionKeyId(b);
  restore(a, b); // b's own catalog (and its own device mark) stay
  const kx = stats().keyExchanges;
  const rows = await (await b.runtime(SETTINGS)).home();
  assert.equal(stats().keyExchanges, kx + 1, "a's key is not reused on b");
  assert.notEqual(sessionKeyId(b), sessionKeyId(a));
  assert.notEqual(sessionKeyId(b), bKey);
  assert.ok(flat(rows).some((i) => i.ref === ref), "b's index is consistent again");
});

test("I1 a backup taken after the login but before any video was indexed: the restored key is not reused", async () => {
  const a = newDevice();
  await (await a.runtime(SETTINGS)).home(); // no channel yet: logged in, nothing indexed
  const b = newDevice();
  restore(a, b);
  const kx = stats().keyExchanges;
  await (await b.runtime(SETTINGS)).home();
  assert.equal(stats().keyExchanges, kx + 1);
  assert.notEqual(sessionKeyId(b), sessionKeyId(a));
});

test("I1 a normal restart keeps the session; the device mark is not a video", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  postVideo(CH1, { name: "a.mp4" });
  const a = newDevice();
  await (await a.runtime(SETTINGS)).home();
  const key = sessionKeyId(a);
  const kx = stats().keyExchanges, logins = stats().botLogins;
  const p = await a.runtime(SETTINGS);
  const ref = chat(CH1) + ":2";
  await p.read({ handle: ref, offset: 0, length: MiB });
  assert.deepEqual([stats().keyExchanges, stats().botLogins], [kx, logins]);
  assert.equal(sessionKeyId(a), key);
  assert.match((await p.settingsStatus()).index_status, /^1 video\b/);
  assert.deepEqual((await p.search({ q: "device", type: "any", cursor: null })).items, []);
});

// ---- I2: a session that dies mid-runtime ----

async function readyDevice() {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, { name: "a.mp4", size: 300000 });
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  return { d, p, ref };
}

test("I2 a 401 mid-runtime: one new login, the read succeeds, no restart needed", async () => {
  const { p, ref } = await readyDevice();
  const logins = stats().botLogins;
  tg.dc(2).once("getFile", () => ({ error: [401, "AUTH_KEY_UNREGISTERED"] }));
  const r = await p.read({ handle: ref, offset: 0, length: MiB });
  assert.ok(Buffer.from(r.bytes, "base64").equals(files.get(ref)));
  assert.equal(stats().botLogins, logins + 1);
  await p.read({ handle: ref, offset: 0, length: MiB });
  assert.equal(stats().botLogins, logins + 1, "and the next read goes on with it");
});

test("I2 AUTH_KEY_DUPLICATED: the key is dropped and replaced (stored too), the read succeeds", async () => {
  const { d, p, ref } = await readyDevice();
  const before = sessionKeyId(d);
  const kx = stats().keyExchanges;
  tg.dc(2).once("getFile", () => ({ error: [406, "AUTH_KEY_DUPLICATED"] }));
  const r = await p.read({ handle: ref, offset: 0, length: MiB });
  assert.equal(Buffer.from(r.bytes, "base64").length, 300000);
  assert.equal(stats().keyExchanges, kx + 1);
  assert.notEqual(sessionKeyId(d), before, "the dead key is not what is stored");
});

test("I2 with the login budget spent: a typed wait, one attempt, no loop", async () => {
  const { d, p, ref } = await readyDevice();
  const now = Date.now();
  d.base.storage.set("mtproto.botLogins", JSON.stringify([now - 3, now - 2, now - 1]));
  const logins = stats().botLogins, gets = stats().getFile;
  let hits = 0;
  tg.dc(2).once("getFile", () => { hits++; return { error: [401, "AUTH_KEY_UNREGISTERED"] }; });
  await assert.rejects(p.read({ handle: ref, offset: 0, length: MiB }), (e) => e.code === "rate_limited" && e.seconds > 0);
  assert.equal(stats().botLogins, logins);
  assert.equal(hits, 1);
  assert.equal(stats().getFile, gets, "no second getFile after the refused login");
});

// ---- I3: the discovery commits only after the catalog writes ----

test("I3 a catalog write that fails leaves the update state where it was: the next Home indexes those videos", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, { name: "a.mp4" });
  const d = newDevice();
  let failed = false;
  const flaky = Object.freeze({
    ...d.base.catalog,
    upsert: async (items) => {
      if (!failed && items.some((it) => !String(it.id).startsWith("~"))) { failed = true; throw Object.assign(new Error("kino.catalog: busy"), { code: "unavailable" }); }
      return d.base.catalog.upsert(items);
    },
  });
  await (await d.runtime(SETTINGS, { catalog: flaky })).home();
  assert.equal(failed, true);
  assert.deepEqual(await d.base.catalog.get([ref]), []);
  const rows = await (await d.runtime(SETTINGS)).home();
  assert.ok(flat(rows).some((i) => i.ref === ref), "read again and indexed");
});

// ---- I4: one connect and one refresh at a time ----

test("I4 five reads at once on a cold runtime: one client, one key exchange, one login", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, { name: "a.mp4", size: 5 * MiB });
  const d = newDevice();
  await (await d.runtime(SETTINGS)).home();
  d.base.storage.remove("tg.session"); // the next runtime has to build its session
  const kx = stats().keyExchanges, logins = stats().botLogins, conns = stats().connections;
  const p = await d.runtime(SETTINGS);
  const reads = await Promise.all([0, 1, 2, 3, 4].map((i) => p.read({ handle: ref, offset: i * MiB, length: MiB })));
  reads.forEach((r, i) => assert.ok(Buffer.from(r.bytes, "base64").equals(files.get(ref).subarray(i * MiB, (i + 1) * MiB)), "read " + i));
  assert.equal(stats().keyExchanges, kx + 1);
  assert.equal(stats().botLogins, logins + 1);
  assert.equal(stats().connections, conns + 1);
});

test("I4 Home and Actualizar ahora at the same time: one refresh pass, a consistent state", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  postVideo(CH1, { name: "a.mp4" });
  postVideo(CH1, { name: "b.mp4" });
  const single = newDevice();
  const before = tg.requests.length;
  await (await single.runtime(SETTINGS)).home();
  const onePass = tg.requests.length - before;
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  const start = tg.requests.length;
  const [rows, act] = await Promise.all([p.home(), p.action("refresh")]);
  assert.equal(tg.requests.length - start, onePass, "the action reused the running refresh");
  assert.equal(flat(rows).filter((i) => i.id.startsWith("v")).length >= 2, true);
  assert.match(act.message, /2 videos/);
  assert.equal(JSON.parse(d.base.storage.get("tg.shell")).count, 2);
});

// ---- I5: slots from the channel set, the same on every device ----

test("I5 slots are first-seen: two devices of the same bot show the same channel in each slot", async () => {
  // Ids above 2^32 (as newer channels have): the engine keeps such object keys in insertion order, not sorted.
  const HI = 5000000001n, LO = 4300000000n;
  world.addChannel({ id: HI, accessHash: 22n, title: "Viajes" });
  postVideo(HI, { name: "playa.mp4" });
  const a = newDevice();
  await (await a.runtime(SETTINGS)).home(); // a knows only HI at first
  world.addChannel({ id: LO, accessHash: 11n, title: "Pelis" });
  postVideo(LO, { name: "peli.mp4" });
  const pa = await a.runtime(SETTINGS);
  await pa.action("refresh");
  const b = newDevice();
  const pb = await b.runtime(SETTINGS);
  await pb.home(); // b meets both at once
  const sa = await pa.settingsStatus(), sb = await pb.settingsStatus();
  assert.equal(places(sa)[0], places(sb)[0]);
  assert.equal(places(sa)[1], places(sb)[1]);
  assert.equal(places(sa)[0], "✓ Viajes", "the first channel the bot met is slot 1, whatever the ids");
  assert.match(places(sa)[1], /^— Pelis/, "a later channel is appended");
});

test("I5 a channel the bot lost keeps its slot (marked), so its switched-on slot is never handed to a newcomer", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  world.addChannel({ id: CH2, accessHash: 22n, title: "Viajes" });
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  world.forbid(CH1);
  world.addChannel({ id: 2100000000n, accessHash: 33n, title: "Nuevo" });
  await p.action("refresh");
  const st = await p.settingsStatus();
  assert.match(places(st)[0], /^✗ Pelis \(sin acceso\)/);
  assert.match(places(st)[1], /^— Viajes/);
  assert.match(places(st)[2], /^— Nuevo/, "the newcomer is appended, switched off");
});

// ---- minors ----

test("M1 more than 6 channels: the line under the places names the ones waiting and how to give them one", async () => {
  for (let i = 0; i < 10; i++) world.addChannel({ id: 1900000000n + BigInt(i), accessHash: 5n, title: "C" + i });
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  assert.match((await p.settingsStatus()).channels_more, /^C6, C7, C8, C9\. Para dar un lugar: apaga uno arriba/);
  const en = await d.runtime(SETTINGS, { lang: "en-US" });
  assert.match((await en.settingsStatus()).channels_more, /^C6, C7, C8, C9\. To give one a place: turn one off above/);
});

test("M2 the count follows a purge that runs on a Home that skips the refresh", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, { name: "a.mp4" });
  postVideo(CH1, { name: "b.mp4" });
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  assert.equal(JSON.parse(d.base.storage.get("tg.shell")).count, 2);
  // A purge left over from an earlier step (as after a huge channel), while the index is fresh: no network pass.
  const shell = JSON.parse(d.base.storage.get("tg.shell"));
  shell.purge = [{ chatId: chat(CH1), next: Number(ref.split(":")[1]) }];
  d.base.storage.set("tg.shell", JSON.stringify(shell));
  const calls = tg.requests.length;
  await p.home();
  assert.equal(tg.requests.length, calls);
  assert.equal(JSON.parse(d.base.storage.get("tg.shell")).count, 1);
  assert.match((await p.settingsStatus()).index_status, /^1 video\b/);
});

test("M3 read keeps its whole budget (getFile + refetch + retry) under 17 s", { timeout: 30000 }, async () => {
  const { p, ref } = await readyDevice();
  // A slow FILE_REFERENCE_EXPIRED, a slow refetch, then a slow retry: each one within the per-call timeout, the sum not.
  tg.dc(2).once("getFile", () => ({ delayMs: 5000, error: [400, "FILE_REFERENCE_EXPIRED"] }));
  tg.dc(2).once("channelsGetMessages", () => ({ delayMs: 5000 }));
  tg.dc(2).once("getFile", () => ({ delayMs: 8500 }));
  const t0 = Date.now();
  await p.read({ handle: ref, offset: 0, length: MiB }).catch(() => {});
  assert.ok(Date.now() - t0 < 17000, "took " + (Date.now() - t0) + " ms");
});

test("M4 a document on another DC (FILE_MIGRATE) and overlapping reads", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, { name: "lejos.mp4", size: 3 * MiB, dc: 4 });
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  const reads = await Promise.all([2, 0, 1].map((i) => p.read({ handle: ref, offset: i * MiB, length: MiB })));
  [2, 0, 1].forEach((i, k) => assert.ok(Buffer.from(reads[k].bytes, "base64").equals(files.get(ref).subarray(i * MiB, (i + 1) * MiB))));
  assert.ok(tg.dc(4).stats.importAuth >= 1, "authorized on DC 4 by export/import, not a new login");
  assert.equal(tg.dc(4).stats.botLogins, 0);
});

test("M4 the login budget spent before the first login: a notice, and resolve says to wait", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const d = newDevice();
  const now = Date.now();
  d.base.storage.set("mtproto.botLogins", JSON.stringify([now - 3, now - 2, now - 1]));
  const p = await d.runtime(SETTINGS);
  const rows = await p.home();
  assert.match(rows[0].items[0].title, /Demasiados/);
  assert.equal(stats().botLogins, 0);
  await assert.rejects(p.resolve(rows[0].items[0].ref), (e) => e.code === "rate_limited");
});

test("M5 search answers a Page for an empty query too", async () => {
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  assert.deepEqual(await p.search({ q: "", type: "any", cursor: null }), { items: [] });
  assert.deepEqual(await p.search({ q: "   ", type: "any", cursor: null }), { items: [] });
});

test("M6 an expired flood notice resolves to unavailable, not to a wait of 0 s", async () => {
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  const shell = JSON.parse(d.base.storage.get("tg.shell"));
  shell.error = { kind: "flood", until: Date.now() - 1000, at: Date.now() - 60000 };
  d.base.storage.set("tg.shell", JSON.stringify(shell));
  await assert.rejects(p.resolve("setup:flood"), (e) => e.code === "unavailable");
});

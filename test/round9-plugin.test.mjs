// Round 9, plugin side: strangers who add the bot to their channel, the TMDB switch, the sealed session, logins that
// must wait, hostile names, and Home's time budget. The plugin as Kino runs it, against the fake Telegram cluster.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device } from "../testkit/plugin-harness.mjs";
import { openSession } from "../testkit/session-open.mjs";

const MiB = 1048576;
const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const OWNER = 3000000001n, STRANGER = 1500000000n;
const chat = (id) => String(-(1000000000000n + id));
const META = { "movie:title:the matrix:1999": { title: "Matrix", year: "1999", overview: "Una simulación.", poster: "https://image.tmdb.org/t/p/w500/m.jpg", ids: { tmdb: 603 }, sources: ["tmdb"] } };
const JPEG = (n) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(n, 7), Buffer.from([0xff, 0xd9])]);

let tg, world, devs;
function postVideo(channel, { name, text = "", size = 5000, thumb = false }) {
  const doc = world.doc({ mime: "video/mp4", size, fileName: name, video: { duration: 60, w: 640, h: 360 }, thumbs: thumb ? [{ type: "m", w: 320, h: 180, size: 1000 }] : undefined });
  const id = world.post(channel, { text, doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data: Buffer.alloc(size, 9), thumbs: thumb ? { m: JPEG(996) } : {} });
  return chat(channel) + ":" + id;
}
const newDevice = (o) => { const d = device(o); devs.push(d); return d; };
const flat = (rows) => rows.flatMap((r) => r.items);
const st = () => tg.dc(2).stats;
function countingMeta(base) {
  const calls = [];
  return { calls, meta: Object.assign(async (q) => { calls.push(q); return base(q); }, { byTitle: true }) };
}

beforeEach(() => {
  tg = new FakeTelegram().install();
  world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  devs = [];
});
afterEach(() => { tg.restore(); for (const d of devs) d.close(); });

// ---- strangers ----

test("a stranger's channel (lower id, added later) never takes the owner's slot and comes switched off", async () => {
  world.addChannel({ id: OWNER, accessHash: 1n, title: "Mis videos" });
  const mine = postVideo(OWNER, { name: "mio.mp4" });
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  world.addChannel({ id: STRANGER, accessHash: 2n, title: "Spam" });
  const spam = postVideo(STRANGER, { name: "spam.mp4" });
  await p.action("refresh");
  let s = await p.settingsStatus();
  assert.equal(s.ch1_name, "Mis videos");
  assert.match(s.ch2_name, /^Spam \(desactivado\)/);
  const items = flat(await p.home());
  assert.ok(items.some((i) => i.ref === mine));
  assert.ok(!items.some((i) => i.ref === spam), "a switched-off stranger shows nothing");
  for (let i = 0; i < 9; i++) world.addChannel({ id: 1000000000n + BigInt(i), accessHash: 3n, title: "Otro" + i });
  await p.action("refresh");
  s = await p.settingsStatus();
  assert.equal(s.ch1_name, "Mis videos", "nine more strangers do not move the owner");
  assert.match(s.ch2_name, /^Spam/);
});

// ---- TMDB switch ----

test("TMDB switched off: no kino.meta call at all, Telegram's thumbnail stays, earlier TMDB data is not shown", async () => {
  world.addChannel({ id: OWNER, accessHash: 1n, title: "Pelis" });
  const known = postVideo(OWNER, { name: "The.Matrix.1999.mkv", thumb: true });
  const d = newDevice({ metaFixture: META });
  const off = countingMeta(d.base.meta);
  const p = await d.runtime({ ...SETTINGS, tmdb: false }, { meta: off.meta });
  const item = flat(await p.home()).find((i) => i.ref === known);
  assert.equal(off.calls.length, 0);
  assert.deepEqual(item.poster, { source: "plugin", handle: "t:" + known });
  // Switched on, enriched; then off again: TMDB's title and poster are hidden.
  const on = countingMeta(d.base.meta);
  const q = await d.runtime(SETTINGS, { meta: on.meta });
  assert.equal(flat(await q.home()).find((i) => i.ref === known).title, "Matrix");
  assert.ok(on.calls.length > 0);
  const r = await d.runtime({ ...SETTINGS, tmdb: false }, { meta: off.meta });
  const again = flat(await r.home()).find((i) => i.ref === known);
  assert.notEqual(again.title, "Matrix");
  assert.ok(!JSON.stringify(again).includes("image.tmdb.org"));
  assert.ok(!JSON.stringify(await r.details(known)).includes("image.tmdb.org"));
  assert.equal(off.calls.length, 0);
});

// ---- the sealed session ----

async function loggedIn() {
  world.addChannel({ id: OWNER, accessHash: 1n, title: "Pelis" });
  const ref = postVideo(OWNER, { name: "a.mp4" });
  const d = newDevice();
  await (await d.runtime(SETTINGS)).home();
  return { d, ref };
}

test("tg.session is sealed (v2): no key in the clear; a fresh runtime opens it with no key exchange and no login", async () => {
  const { d, ref } = await loggedIn();
  const raw = d.base.storage.get("tg.session");
  const state = openSession(raw, SETTINGS);
  const stored = JSON.parse(raw);
  assert.equal(stored.v, 2);
  assert.equal(stored.state, undefined);
  for (const v of Object.values(state.dcs)) {
    assert.ok(!raw.includes(v.authKey) && !raw.includes(v.authKeyId) && !raw.includes(v.serverSalt));
  }
  const kx = st().keyExchanges, logins = st().botLogins;
  const r = await (await d.runtime(SETTINGS)).read({ handle: ref, offset: 0, length: MiB });
  assert.ok(r.bytes.length > 0);
  assert.equal(st().keyExchanges, kx);
  assert.equal(st().botLogins, logins);
  assert.ok(!d.logs.join("\n").includes(Object.values(state.dcs)[0].authKey));
});

test("a tampered sealed session is not used: a new key and a new login", async () => {
  const { d } = await loggedIn();
  const s = JSON.parse(d.base.storage.get("tg.session"));
  const ct = Buffer.from(s.ct, "base64");
  ct[3] ^= 1;
  d.base.storage.set("tg.session", JSON.stringify({ ...s, ct: ct.toString("base64") }));
  const kx = st().keyExchanges, logins = st().botLogins;
  await (await d.runtime(SETTINGS)).action("refresh");
  assert.equal(st().keyExchanges, kx + 1);
  assert.equal(st().botLogins, logins + 1);
  assert.ok(d.logs.some((l) => /stored session cannot be opened/.test(l)));
});

test("changed api_hash: the old session does not open (a new key); the token never appears in storage", async () => {
  const { d } = await loggedIn();
  const kx = st().keyExchanges;
  await (await d.runtime({ ...SETTINGS, api_hash: "ffffffffffffffffffffffffffffffff" })).action("refresh");
  assert.equal(st().keyExchanges, kx + 1);
  assert.ok(!d.storageDump().includes(SETTINGS.bot_token) && !d.storageDump().includes(SETTINGS.api_hash));
});

test("a plaintext v1 session (0.2.2) is migrated: used as is, rewritten sealed", async () => {
  const { d, ref } = await loggedIn();
  const s = JSON.parse(d.base.storage.get("tg.session"));
  const v1 = { v: 1, fp: s.fp, device: s.device, state: openSession(JSON.stringify(s), SETTINGS) };
  d.base.storage.set("tg.session", JSON.stringify(v1));
  const kx = st().keyExchanges, logins = st().botLogins;
  const p = await d.runtime(SETTINGS);
  assert.ok((await p.read({ handle: ref, offset: 0, length: MiB })).bytes.length > 0);
  assert.equal(st().keyExchanges, kx);
  assert.equal(st().botLogins, logins);
  const now = JSON.parse(d.base.storage.get("tg.session"));
  assert.equal(now.v, 2);
  assert.equal(now.state, undefined);
});

// ---- logins that must wait ----

test("a login answered FLOOD_WAIT is recorded: read retries in fresh runtimes send no other login while it lasts", async () => {
  const { d, ref } = await loggedIn();
  d.base.storage.remove("tg.session");
  tg.dc(2).once("login", () => ({ error: [420, "FLOOD_WAIT_300"] }));
  const logins = st().botLogins;
  await assert.rejects((await d.runtime(SETTINGS)).read({ handle: ref, offset: 0, length: MiB }));
  const after = st().botLogins;
  assert.ok(after <= logins + 1);
  for (let i = 0; i < 4; i++) {
    await assert.rejects((await d.runtime(SETTINGS)).read({ handle: ref, offset: 0, length: MiB }));
  }
  assert.equal(st().botLogins, after, "no login during the FLOOD_WAIT");
});

test("image() never logs in: with no stored session it fails soft and Telegram sees no login", async () => {
  world.addChannel({ id: OWNER, accessHash: 1n, title: "Pelis" });
  const ref = postVideo(OWNER, { name: "a.mp4", thumb: true });
  const d = newDevice();
  await (await d.runtime(SETTINGS)).home();
  d.base.storage.remove("tg.session");
  const logins = st().botLogins;
  await assert.rejects((await d.runtime(SETTINGS)).image({ handle: "t:" + ref }), (e) => ["unavailable", "not_found"].includes(e.code));
  assert.equal(st().botLogins, logins);
});

// ---- hostile names ----

test("control and bidi characters are stripped from channel titles, file names and captions", async () => {
  world.addChannel({ id: OWNER, accessHash: 1n, title: "Pe‮lis\u0007⁦" });
  const ref = postVideo(OWNER, { name: "evil‮gpj.‏mp4\u0000.mp4", text: "hola\u0085⁩ mundo\u001b[31m" });
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  const rows = await p.home();
  const bad = /[\u0000-\u001f\u007f-\u009f‎‏‪-‮⁦-⁩]/;
  const item = flat(rows).find((i) => i.ref === ref);
  assert.ok(item);
  assert.doesNotMatch(JSON.stringify(rows.map((r) => [r.title, r.items.map((i) => [i.title, i.overview])])).replace(/\\u[0-9a-f]{4}/gi, (m) => String.fromCharCode(parseInt(m.slice(2), 16))), bad);
  assert.doesNotMatch((await p.settingsStatus()).ch1_name, bad);
  assert.doesNotMatch(JSON.stringify(await p.details(ref)).replace(/\\u[0-9a-f]{4}/gi, (m) => String.fromCharCode(parseInt(m.slice(2), 16))), bad);
});

// ---- Home's time budget ----

test("Home answers within its budget: past 17 s by Kino's clock, the channel rows stop (logged), the recent row stays", async () => {
  const on = {};
  for (let i = 0; i < 8; i++) {
    const id = 3100000000n + BigInt(i);
    world.addChannel({ id, accessHash: 1n, title: "Canal " + i });
    postVideo(id, { name: "v" + i + ".mp4" });
    on["ch" + (i + 1)] = true;
  }
  const d = newDevice();
  await (await d.runtime({ ...SETTINGS, ...on })).home();
  let skew = 0;
  const slow = Object.freeze({ ...d.base.catalog, get: async (...a) => { skew += 6000; return d.base.catalog.get(...a); } }); // each channel row reads the catalog
  const p = await d.runtime({ ...SETTINGS, ...on }, { catalog: slow, now: () => Date.now() + skew });
  const rows = await p.home();
  assert.equal(rows[0].id, "recent");
  assert.ok(rows.length < 9, "fewer than all 8 channel rows: " + rows.length);
  assert.ok(d.logs.some((l) => /channel rows skipped, out of time/.test(l)));
  const full = await (await d.runtime({ ...SETTINGS, ...on })).home();
  assert.equal(full.length, 9, "with a normal clock every row is there");
});

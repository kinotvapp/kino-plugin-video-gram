// The plugin end to end, as Kino runs it (testkit/plugin-harness.mjs): the bundle in the kit's sandbox, the kit's kino
// (storage, catalog, crypto, ws), the settings the person typed, and the fake Telegram cluster with a fake bot world.
// Every answer is also checked with the kit's own copy of the app's output rules (sdk/contract.mjs checkOutput).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device, MANIFEST } from "../testkit/plugin-harness.mjs";
import { checkOutput, validateManifest } from "../sdk/contract.mjs";
import { validate } from "../sdk/validate.mjs";
import { errorReport, shownSentence } from "../sdk/kino-shim.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MiB = 1048576;
// Made-up credentials; distinctive so a scan for them cannot hit by chance.
const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const SECRETS = [SETTINGS.api_id, SETTINGS.api_hash, SETTINGS.bot_token, SETTINGS.bot_token.split(":")[1]];
const CH1 = 1987654321n, CH2 = 2000000001n;
const chat = (id) => String(-(1000000000000n + id));

let tg, world, dev;
const files = new Map(); // msg key -> Buffer
function postVideo(channel, { name, size, text = "", duration = 60, w = 1280, h = 720, mime = "video/mp4" }) {
  const data = Buffer.alloc(size);
  for (let i = 0; i < size; i++) data[i] = (i * 131 + size + name.length) & 255;
  const doc = world.doc({ mime, size, fileName: name, video: { duration, w, h } });
  const id = world.post(channel, { text, doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data });
  files.set(chat(channel) + ":" + id, data);
  return chat(channel) + ":" + id;
}
function seed() {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Mis películas" });
  world.addChannel({ id: CH2, accessHash: 22n, title: "Viajes" });
  const big = postVideo(CH1, { name: "Película del Ñandú.mp4", size: 2 * MiB + 524288 + 100, text: "La película\nsegunda línea", duration: 5025, w: 1920, h: 1080 });
  const small = postVideo(CH1, { name: "Corto.mkv", size: 300000, mime: "video/x-matroska" });
  world.post(CH1, { text: "just text" });
  const trip = postVideo(CH2, { name: "Playa.mp4", size: 5000 });
  return { big, small, trip };
}
const decode = (r) => Buffer.from(r.bytes, "base64");
/** Videos in the catalog: every row but the device mark ("~device"). */
const videos = async () => (await dev.base.catalog.count()) - (await dev.base.catalog.get(["~device"])).length;
const flat = (rows) => rows.flatMap((r) => r.items);
const stats = () => ({ ...tg.dc(2).stats, layers: undefined });
const apiCalls = () => tg.requests.length;

beforeEach(() => {
  tg = new FakeTelegram().install();
  world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  files.clear();
  dev = device();
});
afterEach(() => { tg.restore(); dev.close(); });

test("the manifest passes the kit's validator, every setting has its English text, and the theme keeps every color", async () => {
  const text = JSON.stringify(MANIFEST);
  const v = validateManifest(text);
  assert.equal(v.ok, true, v.message);
  const r = await validate(root);
  assert.deepEqual(r.problems, []);
  assert.equal(r.ok, true);
  assert.ok(r.notes.some((n) => n === "English texts: 36 of 36"), r.notes.join("\n"));
  assert.ok(!r.notes.some((n) => /falls back|cae|fallback/i.test(n)), "no theme fallback: " + r.notes.join("\n"));
  assert.deepEqual(MANIFEST.hosts, ["pluto.web.telegram.org", "venus.web.telegram.org", "aurora.web.telegram.org", "vesta.web.telegram.org", "flora.web.telegram.org"]);
  for (const c of ["download", "storageLarge"]) assert.ok(!MANIFEST.capabilities.includes(c), c + " is not declared");
  const status = await validate(root, { run: "settingsStatus", config: SETTINGS });
  assert.deepEqual(status.problems, []);
  const vs = await validate(root, { run: "validateSettings", args: [JSON.stringify(SETTINGS)] });
  assert.deepEqual(vs.problems, []);
});

test("home indexes the channel once, a second home within 5 minutes does not touch the network, search and resolve read the catalog", async () => {
  const ids = seed();
  const p = await dev.runtime(SETTINGS);
  const rows = await p.home();
  const checked = checkOutput("home", rows, MANIFEST);
  assert.deepEqual(checked.drops, []);
  assert.equal(stats().keyExchanges, 1);
  assert.equal(stats().botLogins, 1);
  assert.equal(rows[0].id, "recent");
  const titles = flat(rows).map((i) => i.title);
  assert.ok(titles.includes("Película del Ñandú") && titles.includes("Corto"), titles.join(" | "));
  assert.ok(!titles.includes("Playa"), "channel 2 starts deactivated");
  const chanRow = rows.find((r) => r.id === "c" + chat(CH1));
  assert.ok(chanRow, "one row for the active channel");
  assert.equal(chanRow.title, "Mis películas");
  assert.deepEqual(chanRow.items.map((i) => i.ref), [ids.small, ids.big]);
  const movie = flat(rows).find((i) => i.ref === ids.big);
  assert.match(movie.id, /^[A-Za-z0-9._~-]{1,128}$/);
  assert.equal(movie.kind, "movie");
  assert.ok(movie.badges.includes("1:23:45") && movie.badges.some((b) => /2\.5 MB/.test(b)), JSON.stringify(movie.badges));
  assert.equal(await videos(), 2);

  const before = { calls: apiCalls(), connections: stats().connections, getFile: stats().getFile };
  const again = await p.home();
  assert.deepEqual(again.map((r) => r.id), rows.map((r) => r.id));
  assert.deepEqual({ calls: apiCalls(), connections: stats().connections, getFile: stats().getFile }, before, "no refetch within 5 minutes");
  const p2 = await dev.runtime(SETTINGS);
  await p2.home();
  assert.equal(apiCalls(), before.calls, "nor from a new runtime");

  const found = await p2.search({ q: "pelicula nandu", type: "any", cursor: null });
  assert.deepEqual(checkOutput("search", found, MANIFEST).drops, []);
  assert.deepEqual(found.items.map((i) => i.ref), [ids.big]);
  assert.deepEqual((await p2.search({ q: "PELÍCULA", type: "any", cursor: null })).items.map((i) => i.ref), [ids.big]);
  assert.deepEqual((await p2.search({ q: "", type: "any", cursor: null })), { items: [] });
  assert.deepEqual((await p2.search({ q: "playa", type: "any", cursor: null })).items, [], "a deactivated channel is not searched");
  assert.equal(apiCalls(), before.calls, "search never reaches Telegram");

  const stream = await p2.resolve(ids.big);
  assert.equal(stream.source, "plugin");
  assert.equal(stream.handle, ids.big);
  assert.ok(stream.handle.length <= 512);
  assert.equal(stream.size, files.get(ids.big).length);
  assert.equal(stream.mime, "video/mp4");
  assert.equal(stream.durationMs, 5025000);
  assert.equal(stream.media.title, "Película del Ñandú");
  assert.deepEqual(stream.media.video, { width: 1920, height: 1080 });
  const row = (await dev.base.catalog.get([ids.big]))[0];
  assert.ok(!stream.handle.includes(row.data.doc.fileReference) && !stream.handle.includes(row.data.doc.accessHash));
  const mkv = await p2.resolve(ids.small);
  assert.equal(mkv.mime, "video/x-matroska");
  await assert.rejects(p2.resolve(ids.trip), (e) => e.code === "not_found", "a video of a deactivated channel does not play");
  const details = await p2.details(ids.big);
  assert.equal(details.overview, "La película");
  assert.equal(details.runtimeMinutes, 84);
});

test("the catalog row: id, title, sort and a small data with the document reference", async () => {
  const ids = seed();
  const p = await dev.runtime(SETTINGS);
  await p.home();
  const [row] = await dev.base.catalog.get([ids.big]);
  assert.equal(row.id, ids.big);
  assert.equal(row.title, "Película del Ñandú");
  assert.equal(typeof row.sort, "number");
  assert.ok(row.sort > 1700000000);
  const d = row.data;
  assert.equal(d.chatId, chat(CH1));
  assert.equal(typeof d.msgId, "number");
  assert.equal(d.size, files.get(ids.big).length);
  assert.equal(d.mime, "video/mp4");
  assert.deepEqual([d.duration, d.width, d.height], [5025, 1920, 1080]);
  assert.equal(d.caption, "La película");
  assert.match(d.doc.fileReference, /^[0-9a-f]+$/);
  assert.ok(Buffer.byteLength(JSON.stringify(d)) <= 600, "data is " + Buffer.byteLength(JSON.stringify(d)) + " bytes");
});

test("read: the exact bytes for aligned offsets, the short final chunk, an offset that is not on a MiB, one live connection", async () => {
  const ids = seed();
  const p = await dev.runtime(SETTINGS);
  await p.home();
  const data = files.get(ids.big);
  const conn0 = stats().connections;
  for (let off = 0; off < data.length; off += MiB) {
    const r = await p.read({ handle: ids.big, offset: off, length: MiB });
    const want = data.subarray(off, Math.min(off + MiB, data.length));
    assert.equal(decode(r).length, want.length, "offset " + off);
    assert.ok(decode(r).equals(want), "offset " + off);
  }
  const odd = await p.read({ handle: ids.big, offset: 3 * 4096, length: MiB });
  assert.ok(decode(odd).equals(data.subarray(3 * 4096, 3 * 4096 + MiB)), "a read across a MiB boundary");
  const tiny = await p.read({ handle: ids.big, offset: 2 * MiB + 524288, length: 4096 });
  assert.equal(decode(tiny).length, 100);
  assert.equal((await p.read({ handle: ids.big, offset: 3 * MiB, length: MiB })).bytes, "", "past the end: nothing");
  assert.equal(stats().connections, conn0, "the reads reuse the open connection");
  assert.equal(stats().keyExchanges, 1);
  await assert.rejects(p.read({ handle: ids.big, offset: 100, length: MiB }), (e) => e.code === "invalid_request");
  await assert.rejects(p.read({ handle: ids.big, offset: 0, length: MiB + 1 }), (e) => e.code === "invalid_request");
  await assert.rejects(p.read({ handle: chat(CH1) + ":999", offset: 0, length: MiB }), (e) => e.code === "not_found");
});

test("read: FILE_REFERENCE_EXPIRED refetches the message once, updates the catalog row and retries", async () => {
  const ids = seed();
  const p = await dev.runtime(SETTINGS);
  await p.home();
  const [before] = await dev.base.catalog.get([ids.big]);
  const msgId = Number(ids.big.split(":")[1]);
  world.rotateFileReference(CH1, msgId);
  const fresh = world.channels.get(String(CH1)).messages.get(msgId).doc.fileReference;
  tg.files.get(String(before.data.doc.id)).fileReference = Buffer.from(fresh);
  const r = await p.read({ handle: ids.big, offset: MiB, length: MiB });
  assert.ok(decode(r).equals(files.get(ids.big).subarray(MiB, 2 * MiB)));
  const [after] = await dev.base.catalog.get([ids.big]);
  assert.equal(after.data.doc.fileReference, Buffer.from(fresh).toString("hex"));
  assert.equal(tg.requests.filter((q) => q.method === "channelsGetMessages").length, 1);
  // Gone from the channel: the row goes too, and the read says not_found.
  world.remove(CH1, [msgId]);
  tg.files.get(String(before.data.doc.id)).fileReference = Buffer.from([0xde, 0xad]);
  await assert.rejects(p.read({ handle: ids.big, offset: 0, length: MiB }), (e) => e.code === "not_found");
  assert.deepEqual(await dev.base.catalog.get([ids.big]), []);
});

test("read: a short FLOOD_WAIT is waited out once; a long one is a typed rate_limited error carrying the seconds", async () => {
  const ids = seed();
  const p = await dev.runtime(SETTINGS);
  await p.home();
  tg.dc(2).once("getFile", () => ({ error: [420, "FLOOD_WAIT_1"] }));
  const r = await p.read({ handle: ids.small, offset: 0, length: MiB });
  assert.equal(decode(r).length, 300000);
  tg.dc(2).once("getFile", () => ({ error: [420, "FLOOD_WAIT_600"] }));
  const t0 = Date.now();
  await assert.rejects(p.read({ handle: ids.small, offset: 0, length: MiB }), (e) => {
    assert.equal(e.code, "rate_limited");
    assert.equal(e.seconds, 600);
    assert.ok(shownSentence(e), "the person reads the plugin's sentence: " + errorReport(e, MANIFEST.name));
    assert.match(e.userMessage, /10 minutos/);
    return true;
  });
  assert.ok(Date.now() - t0 < 3000, "never sleeps on a long wait");
});

test("a second runtime reuses the stored session: no key exchange, no login; a dropped socket reconnects without either", async () => {
  const ids = seed();
  await (await dev.runtime(SETTINGS)).home();
  const { keyExchanges, botLogins } = stats();
  const p = await dev.runtime(SETTINGS);
  const r = await p.read({ handle: ids.small, offset: 0, length: MiB });
  assert.equal(decode(r).length, 300000);
  assert.equal(stats().keyExchanges, keyExchanges);
  assert.equal(stats().botLogins, botLogins);
  tg.dc(2).dropConnections();
  await p.read({ handle: ids.small, offset: 0, length: MiB });
  assert.equal(stats().keyExchanges, keyExchanges);
  assert.equal(stats().botLogins, botLogins);
});

test("channel toggles: turning one on indexes it from the start, turning one off removes its rows", async () => {
  const ids = seed();
  await (await dev.runtime(SETTINGS)).home();
  const status = await (await dev.runtime(SETTINGS)).settingsStatus();
  assert.equal(status.ch1_name, "Mis películas");
  assert.match(status.ch2_name, /^Viajes/);
  assert.match(status.ch3_name, /libre/i);
  const both = await dev.runtime({ ...SETTINGS, ch2: true });
  const rows = await both.home();
  assert.ok(flat(rows).some((i) => i.ref === ids.trip), "channel 2 is indexed after it was turned on");
  assert.ok(rows.some((r) => r.id === "c" + chat(CH2)));
  const onlyTwo = await dev.runtime({ ...SETTINGS, ch1: false, ch2: true });
  const rows2 = await onlyTwo.home();
  assert.ok(!flat(rows2).some((i) => i.ref === ids.big || i.ref === ids.small));
  assert.deepEqual(await dev.base.catalog.get([ids.big, ids.small]), [], "channel 1's rows left the catalog");
  assert.deepEqual((await dev.base.catalog.get([ids.trip])).length, 1);
  const cats = await onlyTwo.categories(null);
  assert.deepEqual(checkOutput("categories", cats, MANIFEST).drops, []);
  assert.deepEqual(cats.map((c) => c.ref), ["chan:" + chat(CH2)]);
  const sec = await onlyTwo.section({ tab: null });
  assert.deepEqual(checkOutput("section", sec, MANIFEST).drops, []);
  const page = await onlyTwo.browse("chan:" + chat(CH2), null);
  assert.deepEqual(checkOutput("browse", page, MANIFEST).drops, []);
  assert.deepEqual(page.items.map((i) => i.ref), [ids.trip]);
  // Back on: channel 1 was read to its end before, so it must be read again from its start to get its rows back.
  const back = await (await dev.runtime({ ...SETTINGS, ch1: true, ch2: true })).home();
  assert.ok(flat(back).some((i) => i.ref === ids.big) && flat(back).some((i) => i.ref === ids.small), "turned on again: its videos are back");
});

test("missing settings: a Home row that says what to do, no network, resolve asks to configure", async () => {
  const p = await dev.runtime({});
  const rows = await p.home();
  assert.deepEqual(checkOutput("home", rows, MANIFEST).drops, []);
  assert.equal(rows.length, 1);
  assert.match(rows[0].items[0].title, /Ajustes/);
  assert.equal(stats().connections, 0);
  await assert.rejects(p.resolve(rows[0].items[0].ref), (e) => e.code === "auth_required");
  assert.deepEqual(await p.search({ q: "x", type: "any", cursor: null }), { items: [] });
  const en = await dev.runtime({}, { lang: "en-US" });
  assert.match((await en.home())[0].items[0].title, /Settings/);
});

test("a wrong bot token: a typed message, and no new login on the next Home until the settings change", async () => {
  seed();
  tg.dc(2).once("login", () => ({ error: [400, "ACCESS_TOKEN_INVALID"] }));
  const p = await dev.runtime(SETTINGS);
  const rows = await p.home();
  assert.match(rows[0].items[0].title, /token/i);
  await assert.rejects(p.resolve(rows[0].items[0].ref), (e) => e.code === "auth_required" && !!shownSentence(e));
  const logins = stats().botLogins;
  await (await dev.runtime(SETTINGS)).home();
  assert.equal(stats().botLogins, logins, "the refused token is not tried again");
  assert.match((await (await dev.runtime(SETTINGS)).settingsStatus()).account_status, /token/i);
  const fixed = { ...SETTINGS, bot_token: "7012345678:AAOther-Token_value-ZZ0123456789abcdefXY" };
  const rows2 = await (await dev.runtime(fixed)).home();
  assert.equal(stats().botLogins, logins + 1);
  assert.equal(rows2[0].id, "recent");
});

test("no channel yet: the instruction to add the bot as administrator and post a video", async () => {
  const p = await dev.runtime(SETTINGS);
  const rows = await p.home();
  assert.equal(rows.length, 1);
  assert.match(rows[0].items[0].title, /administrador/);
  const en = await (await dev.runtime(SETTINGS, { lang: "en-US" })).home();
  assert.match(en[0].items[0].title, /administrator/);
});

test("a long FLOOD_WAIT during the index keeps the old rows and says when to try again", async () => {
  const ids = seed();
  const p = await dev.runtime(SETTINGS);
  await p.home();
  postVideo(CH1, { name: "Nuevo.mp4", size: 1000 });
  tg.dc(2).once("getDifference", () => ({ error: [420, "FLOOD_WAIT_300"] }));
  const r = await p.action("refresh");
  assert.match(r.message, /5 minutos/);
  const rows = await p.home();
  assert.ok(flat(rows).some((i) => i.ref === ids.big), "the old index stays");
  assert.match(rows[0].items[0].title, /5 minutos/);
  assert.match((await p.settingsStatus()).index_status, /5 minutos/);
});

test("refresh and forget actions; validateSettings refuses malformed values without echoing them", async () => {
  seed();
  const p = await dev.runtime(SETTINGS);
  const r = await p.action("refresh");
  assert.match(r.message, /2/);
  assert.equal(await videos(), 2);
  const f = await p.action("forget");
  assert.ok(f.message);
  assert.equal(await videos(), 0);
  assert.equal(dev.base.storage.get("tg.session"), null);
  assert.notEqual(dev.base.storage.get("mtproto.botLogins"), null, "the login budget survives a forget");
  const bad = await p.validateSettings({ api_id: "12a", api_hash: "xyz", bot_token: "nope" });
  assert.deepEqual(Object.keys(bad).sort(), ["api_hash", "api_id", "bot_token"]);
  for (const v of Object.values(bad)) assert.ok(!/12a|xyz|nope/.test(v));
  assert.equal(await p.validateSettings(SETTINGS), null);
});

test("no secret in storage, the catalog, the logs, errors or anything returned", async () => {
  const ids = seed();
  const outputs = [];
  const p = await dev.runtime(SETTINGS);
  outputs.push(await p.home());
  outputs.push(await p.search({ q: "corto", type: "any", cursor: null }));
  outputs.push(await p.resolve(ids.big));
  outputs.push(await p.settingsStatus());
  outputs.push(await p.action("refresh"));
  outputs.push(await p.read({ handle: ids.small, offset: 0, length: 4096 }));
  tg.dc(2).once("getFile", () => ({ error: [420, "FLOOD_WAIT_900"] }));
  try { await p.read({ handle: ids.small, offset: 0, length: MiB }); } catch (e) { outputs.push({ m: e.message, u: e.userMessage, c: e.code }); }
  tg.dc(2).once("login", () => ({ error: [400, "ACCESS_TOKEN_INVALID"] }));
  const other = { ...SETTINGS, bot_token: SETTINGS.bot_token.replace("AAFake", "AAFaku") };
  const p2 = await dev.runtime(other);
  outputs.push(await p2.home());
  try { await p2.resolve(ids.big); } catch (e) { outputs.push({ m: e.message, u: e.userMessage, c: e.code }); }
  const hay = [dev.storageDump(), JSON.stringify(await dev.catalogDump()), dev.logs.join("\n"), JSON.stringify(outputs)].join("\n");
  for (const s of [...SECRETS, other.bot_token, other.bot_token.split(":")[1]]) assert.ok(!hay.includes(s), "a secret leaked");
  assert.ok(dev.storageDump().length < 64 * 1024, "storage stays well under 64 KB: " + dev.storageDump().length);
});

test("after 5 minutes Home reads Telegram again and picks up a new video; an emptied catalog (a restore) is rebuilt", async () => {
  const ids = seed();
  const p = await dev.runtime(SETTINGS);
  await p.home();
  const fresh = postVideo(CH1, { name: "Estreno.mp4", size: 2000 });
  const calls = apiCalls();
  assert.ok(!flat(await p.home()).some((i) => i.ref === fresh), "not within 5 minutes");
  assert.equal(apiCalls(), calls);
  const shell = JSON.parse(dev.base.storage.get("tg.shell"));
  shell.indexedAt -= 5 * 60 * 1000 + 1;
  dev.base.storage.set("tg.shell", JSON.stringify(shell));
  assert.ok(flat(await p.home()).some((i) => i.ref === fresh), "picked up after 5 minutes");
  assert.ok(apiCalls() > calls);
  await dev.base.catalog.clear();
  const keyExchanges = stats().keyExchanges;
  const rows = await (await dev.runtime(SETTINGS)).home();
  assert.ok(flat(rows).some((i) => i.ref === ids.big), "an emptied catalog is indexed again from the start");
  assert.equal(await videos(), 3);
  assert.equal(stats().keyExchanges, keyExchanges + 1, "a restored storage does not reuse the other device's auth key");
});

test("search and Ver más page through a big channel; scopedSearch keeps a channel's page to that channel", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Mis películas" });
  const refs = [];
  for (let i = 0; i < 130; i++) refs.push(postVideo(CH1, { name: "Episodio " + i + ".mp4", size: 100 }));
  const p = await dev.runtime(SETTINGS);
  await p.home();
  assert.equal(await videos(), 130);
  const first = await p.search({ q: "episodio", type: "any", cursor: null });
  assert.equal(first.items.length, 50);
  assert.equal(first.next, "50");
  const seen = new Set(first.items.map((i) => i.ref));
  for (let cursor = first.next; cursor; ) {
    const page = await p.search({ q: "episodio", type: "any", cursor });
    page.items.forEach((i) => seen.add(i.ref));
    cursor = page.next;
  }
  assert.equal(seen.size, 130);
  const inChannel = await p.search({ q: "episodio 12", type: "any", cursor: null, within: "chan:" + chat(CH1) });
  assert.ok(inChannel.items.length >= 1 && inChannel.items.every((i) => i.title.includes("12")));
  assert.deepEqual((await p.search({ q: "episodio", type: "any", cursor: null, within: "chan:" + chat(CH2) })).items, []);
  const browsed = new Set();
  for (let cursor = null, n = 0; n < 10; n++) {
    const page = await p.browse("chan:" + chat(CH1), cursor);
    assert.deepEqual(checkOutput("browse", page, MANIFEST).drops, []);
    page.items.forEach((i) => browsed.add(i.ref));
    if (!page.next) break;
    cursor = page.next;
  }
  assert.equal(browsed.size, 130);
  const recent = new Set();
  for (let cursor = null, n = 0; n < 10; n++) {
    const page = await p.browse("recent", cursor);
    page.items.forEach((i) => recent.add(i.ref));
    if (!page.next) break;
    cursor = page.next;
  }
  assert.equal(recent.size, 130);
});

test("every sentence for the person passes the kit's userMessage rules, in Spanish and in English", async () => {
  const { TEXT_TABLES } = await import("../src/shell/text.js");
  for (const table of [TEXT_TABLES.ES, TEXT_TABLES.EN]) {
    for (const [key, text] of Object.entries(table)) {
      if (!key.startsWith("um.")) continue;
      const filled = text.replace("{min}", "10 minutos");
      const err = Object.assign(new Error("x"), { code: "unavailable", userMessage: filled });
      assert.ok(shownSentence(err), key + ": " + errorReport(err, MANIFEST.name));
    }
  }
  assert.deepEqual(Object.keys(TEXT_TABLES.ES).sort(), Object.keys(TEXT_TABLES.EN).sort(), "the same keys in both languages");
});

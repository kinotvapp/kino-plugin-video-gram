// Posters: TMDB's through kino.meta (Task 7e) and Telegram's own thumbnail through the image export (Task 7f), the
// plugin end to end as Kino runs it (testkit/plugin-harness.mjs) against the fake Telegram cluster. Made-up names and ids.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device, MANIFEST } from "../testkit/plugin-harness.mjs";
import { checkOutput, validateManifest } from "../sdk/contract.mjs";
import { askImage } from "../sdk/kino-shim.mjs";
import { videoEntry, thumbOf } from "../src/mtproto/discovery.js";

const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const CH1 = 1987654321n;
const chat = (id) => String(-(1000000000000n + id));
const JPEG = (n, seed = 1) => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]), Buffer.alloc(n, seed), Buffer.from([0xff, 0xd9])]);
const POSTER = "https://image.tmdb.org/t/p/w500/hEpWvX6Bp79eLxY1kX5ZZJcme5U.jpg";
const META = {
  "movie:title:the matrix:1999": { title: "Matrix", year: "1999", overview: "Un experto en computación descubre que su mundo es una simulación.", poster: POSTER, backdrop: "https://image.tmdb.org/t/p/w1280/icmmSD4vTTDKOq2vvdulafOGw93.jpg", ids: { tmdb: 603 }, sources: ["tmdb"] },
  "movie:tmdb:27205": { title: "El origen", year: "2010", poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg", ids: { tmdb: 27205 }, sources: ["tmdb"] },
};
for (let i = 1; i <= 12; i++) META["movie:title:pelicula numero " + i] = { title: "Película número " + i, poster: "https://image.tmdb.org/t/p/w500/p" + i + ".jpg", ids: { tmdb: 1000 + i } };

let tg, world, dev;
function postVideo(channel, { name, size = 5000, text = "", thumbs, thumbBytes }) {
  const doc = world.doc({ mime: "video/mp4", size, fileName: name, video: { duration: 60, w: 1280, h: 720 }, thumbs });
  const id = world.post(channel, { text, doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data: Buffer.alloc(size, 3), thumbs: thumbBytes || {} });
  return { key: chat(channel) + ":" + id, doc, msgId: id };
}
const flat = (rows) => rows.flatMap((r) => r.items);
const byRef = (rows, ref) => flat(rows).find((i) => i.ref === ref);
/** A kino.meta that counts its calls (and can be slowed or fail), over the device's fixture-backed one. */
function countingMeta(base, { delayMs = 0, fail = null } = {}) {
  const calls = [];
  const meta = Object.assign(async (q) => {
    calls.push(JSON.parse(JSON.stringify(q)));
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    if (fail) throw Object.assign(new Error(fail), { code: fail, name: "KinoError" });
    return base(q);
  }, { byTitle: true });
  return { meta, calls };
}

beforeEach(() => {
  tg = new FakeTelegram().install();
  world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  dev = device({ metaFixture: META });
  world.addChannel({ id: CH1, accessHash: 11n, title: "Mis películas" });
});
afterEach(() => { tg.restore(); dev.close(); });

test("the manifest declares imageSource at apiVersion 14, version 1.2.0, and the bundle exports image", async () => {
  assert.equal(validateManifest(JSON.stringify(MANIFEST)).ok, true);
  assert.ok(MANIFEST.capabilities.includes("imageSource"));
  assert.equal(MANIFEST.apiVersion, 14);
  assert.equal(MANIFEST.version, "1.2.0");
  const p = await dev.runtime(SETTINGS);
  assert.equal(typeof p.image, "function");
});

test("thumbOf keeps the best small thumbnail (m first, never over 256 KB, never a stripped or cached one) and videoEntry carries it", () => {
  const T = (type, size, w = 320, h = 180) => ({ _: "photoSize", type, w, h, size });
  assert.deepEqual(thumbOf({ thumbs: [T("s", 1200, 90, 51), T("m", 13059, 148, 320)] }), { t: "m", s: 13059, w: 148, h: 320 });
  assert.deepEqual(thumbOf({ thumbs: [T("s", 1200, 90, 51), T("x", 70000, 800, 450)] }), { t: "x", s: 70000, w: 800, h: 450 });
  assert.deepEqual(thumbOf({ thumbs: [T("s", 1200, 90, 51), { _: "photoSizeProgressive", type: "y", w: 1280, h: 720, sizes: [9000, 40000, 300000] }] }), { t: "s", s: 1200, w: 90, h: 51 });
  assert.deepEqual(thumbOf({ thumbs: [{ _: "photoSizeProgressive", type: "m", w: 320, h: 180, sizes: [3000, 15000] }] }), { t: "m", s: 15000, w: 320, h: 180 });
  assert.equal(thumbOf({ thumbs: [{ _: "photoStrippedSize", type: "i", bytes: new Uint8Array(30) }, { _: "photoSizeEmpty", type: "s" }] }), null);
  assert.equal(thumbOf({ thumbs: [T("m", 300000)] }), null, "over 256 KB");
  assert.equal(thumbOf({}), null);
  const e = videoEntry({ _: "message", id: 7, date: 1, message: "", peer_id: { _: "peerChannel", channel_id: 5n }, media: { _: "messageMediaDocument", document: { _: "document", id: 1n, access_hash: 2n, file_reference: new Uint8Array([1]), mime_type: "video/mp4", size: 10, dc_id: 2, thumbs: [T("m", 500)], attributes: [{ _: "documentAttributeFilename", file_name: "The.Matrix.1999.mkv" }] } } });
  assert.deepEqual(e.thumb, { t: "m", s: 500, w: 320, h: 180 });
  assert.equal(e.fileName, "The.Matrix.1999.mkv");
});

test("a video TMDB knows: TMDB's poster (w342, a plain URL), its title and overview; a search finds it by TMDB's title and by the file's", async () => {
  const v = postVideo(CH1, { name: "The.Matrix.1999.1080p.BluRay.x264-GRP.mkv", thumbs: [{ type: "m", w: 320, h: 180, size: 2000 }], thumbBytes: { m: JPEG(2000) } });
  const p = await dev.runtime(SETTINGS);
  const rows = await p.home();
  assert.deepEqual(checkOutput("home", rows, MANIFEST).drops, []);
  const item = byRef(rows, v.key);
  assert.equal(item.title, "Matrix");
  assert.equal(item.poster, "https://image.tmdb.org/t/p/w342/hEpWvX6Bp79eLxY1kX5ZZJcme5U.jpg", "TMDB's poster wins over Telegram's thumbnail");
  assert.equal(item.backdrop, "https://image.tmdb.org/t/p/w780/icmmSD4vTTDKOq2vvdulafOGw93.jpg");
  assert.equal(item.year, "1999");
  assert.match(item.overview, /simulación/);
  for (const q of ["matrix", "1080p", "the matrix"]) {
    const s = await p.search({ q });
    assert.ok(s.items.some((i) => i.ref === v.key), q);
  }
  const [row] = await dev.base.catalog.get([v.key]);
  assert.ok(JSON.stringify(row.data).length < 4096);
  assert.equal(row.data.tm.id, 603);
  const d = await p.details(v.key);
  assert.equal(d.year, "1999");
  assert.equal(d.poster, item.poster);
});

test("a video TMDB does not know shows Telegram's thumbnail through image(), asked once, from the stored session", async () => {
  const thumb = JPEG(13059);
  const v = postVideo(CH1, { name: "Cumpleaños de la abuela.mp4", thumbs: [{ type: "s", w: 90, h: 51, size: 900 }, { type: "m", w: 148, h: 320, size: thumb.length }], thumbBytes: { s: JPEG(900, 2), m: thumb } });
  const p = await dev.runtime(SETTINGS);
  const rows = await p.home();
  const item = byRef(rows, v.key);
  assert.deepEqual(item.poster, { source: "plugin", handle: "t:" + v.key });
  assert.deepEqual(checkOutput("home", rows, MANIFEST).drops, []);
  assert.equal(item.title, "Cumpleaños de la abuela");
  // A fresh runtime (Kino closed the idle one): the stored key, no second login.
  const p2 = await dev.runtime(SETTINGS);
  const before = { ...tg.dc(2).stats };
  const img = await askImage(p2, MANIFEST, item.poster);
  assert.equal(img.mime, "image/jpeg");
  assert.ok(img.bytes.equals(thumb));
  assert.deepEqual(tg.dc(2).stats.thumbs, ["m"]);
  assert.equal(tg.dc(2).stats.botLogins, before.botLogins);
  assert.equal(tg.dc(2).stats.keyExchanges, before.keyExchanges);
  // The handle carries no access hash and no file reference: only the row id, looked up in the catalog.
  assert.match(item.poster.handle, /^t:-\d+:\d+$/);
  assert.ok(!item.poster.handle.includes(String(v.doc.accessHash)) && !item.poster.handle.includes(Buffer.from(v.doc.fileReference).toString("hex")));
});

test("image() fails soft with typed codes: an unknown handle, a video without a thumbnail, no stored login (no login spent for a picture)", async () => {
  const bare = postVideo(CH1, { name: "Sin miniatura.mp4" });
  const p = await dev.runtime(SETTINGS);
  const rows = await p.home();
  assert.equal(byRef(rows, bare.key).poster, undefined, "no thumbnail, no TMDB: no poster at all");
  await assert.rejects(p.image({ handle: "t:-1:99" }), (e) => e.code === "not_found");
  await assert.rejects(p.image({ handle: "x" }), (e) => e.code === "not_found");
  await assert.rejects(p.image({ handle: "t:" + bare.key }), (e) => e.code === "not_found");
  // Another device that never logged in: a picture never spends a login.
  const other = device({ metaFixture: META });
  try {
    const q = await other.runtime(SETTINGS);
    const logins = tg.dc(2).stats.botLogins;
    await assert.rejects(q.image({ handle: "t:" + bare.key }), (e) => e.code === "not_found" || e.code === "unavailable");
    assert.equal(tg.dc(2).stats.botLogins, logins);
  } finally { other.close(); }
});

test("image() after Telegram rotated the file reference: the message is read again and the thumbnail comes", async () => {
  const thumb = JPEG(4000);
  const v = postVideo(CH1, { name: "Viaje.mp4", thumbs: [{ type: "m", w: 320, h: 180, size: thumb.length }], thumbBytes: { m: thumb } });
  const p = await dev.runtime(SETTINGS);
  await p.home();
  world.rotateFileReference(CH1, v.msgId);
  const fresh = world.channels.get(String(CH1)).messages.get(v.msgId).doc;
  tg.addFile({ id: fresh.id, accessHash: fresh.accessHash, fileReference: fresh.fileReference, dc: 2, data: Buffer.alloc(5000, 3), thumbs: { m: thumb } });
  const r = await p.image({ handle: "t:" + v.key });
  assert.equal(r.mime, "image/jpeg");
  assert.ok(Buffer.from(r.bytes, "base64").equals(thumb));
  const [row] = await dev.base.catalog.get([v.key]);
  assert.equal(row.data.doc.fileReference, Buffer.from(fresh.fileReference).toString("hex"));
});

test("enrichment is bounded: at most 4 lookups per refresh, progress kept, the next refresh goes on; a miss is not asked again", async () => {
  for (let i = 1; i <= 9; i++) postVideo(CH1, { name: "pelicula numero " + i + ".mp4" });
  postVideo(CH1, { name: "Video familiar del paseo.mp4" });
  const { meta, calls } = countingMeta(dev.base.meta);
  const p = await dev.runtime(SETTINGS, { meta });
  await p.home();
  assert.equal(calls.length, 4);
  await p.home(); // the index is recent: no Telegram, but the pass goes on
  assert.equal(calls.length, 8);
  await p.home();
  assert.equal(calls.length, 10);
  const all = await dev.catalogDump();
  const vids = all.filter((r) => r.id !== "~device");
  assert.equal(vids.filter((r) => r.data.tm && r.data.tm.id).length, 9);
  assert.equal(vids.filter((r) => r.data.tm && r.data.tm.miss).length, 1);
  await p.home();
  await p.search({ q: "pelicula" });
  await p.browse("recent", null);
  assert.equal(calls.length, 10, "nothing asked twice, nothing asked from search or browse");
});

test("enrichment never runs past its time: a slow kino.meta stops the pass, Home still answers in time", async () => {
  for (let i = 1; i <= 4; i++) postVideo(CH1, { name: "pelicula numero " + i + ".mp4" });
  const { meta, calls } = countingMeta(dev.base.meta, { delayMs: 3500 });
  const p = await dev.runtime(SETTINGS, { meta });
  const t0 = Date.now();
  const rows = await p.home();
  assert.ok(Date.now() - t0 < 12000, "home took " + (Date.now() - t0) + " ms");
  assert.equal(calls.length, 2, "the third lookup would start after 6 s of the pass");
  assert.ok(flat(rows).length >= 4);
});

test("a failing kino.meta (rate_limited, unavailable) marks nothing and never breaks the refresh", async () => {
  const v = postVideo(CH1, { name: "The.Matrix.1999.mkv" });
  for (const code of ["rate_limited", "unavailable"]) {
    const { meta, calls } = countingMeta(dev.base.meta, { fail: code });
    const p = await dev.runtime(SETTINGS, { meta });
    const rows = await p.home();
    assert.equal(calls.length, 1, code + ": the pass stops at the first failure");
    assert.equal(byRef(rows, v.key).title, "The Matrix");
    const [row] = await dev.base.catalog.get([v.key]);
    assert.equal(row.data.tm, undefined, code + ": not marked, asked again later");
  }
  const p = await dev.runtime(SETTINGS);
  const rows = await p.home();
  assert.equal(byRef(rows, v.key).title, "Matrix");
});

test("a wrong match is fixed by adding tmdb:<id> to the caption: the edited video is asked again by id", async () => {
  const v = postVideo(CH1, { name: "The.Matrix.1999.mkv" });
  const { meta, calls } = countingMeta(dev.base.meta);
  const p = await dev.runtime(SETTINGS, { meta });
  assert.equal(byRef(await p.home(), v.key).title, "Matrix");
  world.edit(CH1, v.msgId, { text: "La de los sueños tmdb:27205" });
  const rows = await p.action("refresh").then(() => p.home());
  assert.deepEqual(calls.at(-1), { type: "movie", ids: { tmdb: 27205 } });
  const item = byRef(rows, v.key);
  assert.equal(item.title, "El origen");
  assert.equal(item.poster, "https://image.tmdb.org/t/p/w342/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg");
});

test("an older Kino without kino.meta: names are still cleaned, nothing is asked, thumbnails still show", async () => {
  const v = postVideo(CH1, { name: "Coco.2017.Spanish.DVDRip.XviD.mp4", thumbs: [{ type: "m", w: 320, h: 180, size: 100 }], thumbBytes: { m: JPEG(100) } });
  const p = await dev.runtime(SETTINGS, { meta: null });
  const item = byRef(await p.home(), v.key);
  assert.equal(item.title, "Coco");
  assert.equal(item.year, "2017");
  assert.deepEqual(item.poster, { source: "plugin", handle: "t:" + v.key });
});

// Fix round 2 of 7b-2, plugin side: Home inside Kino's 20 s on a slow network, one writer of the device mark, a forced
// refresh queued behind a Home that skipped its pass, no timeout shared through the client, and the README clause.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device } from "../testkit/plugin-harness.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MiB = 1048576;
const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const CH1 = 1987654321n;
const chat = (id) => String(-(1000000000000n + id));
let tg, world, devs;
function postVideo(channel, name, size = 5000) {
  const data = Buffer.alloc(size, 7);
  const doc = world.doc({ mime: "video/mp4", size, fileName: name, video: { duration: 60, w: 640, h: 360 } });
  const id = world.post(channel, { doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data });
  return chat(channel) + ":" + id;
}
const newDevice = () => { const d = device(); devs.push(d); return d; };
const flat = (rows) => rows.flatMap((r) => r.items);
const expireIndex = (d) => { const s = JSON.parse(d.base.storage.get("tg.shell")); s.indexedAt -= 6 * 60 * 1000; d.base.storage.set("tg.shell", JSON.stringify(s)); };
beforeEach(() => { tg = new FakeTelegram().install(); world = new FakeBotWorld({ diffPage: 50, channelPage: 1 }); tg.api = world; devs = []; });
afterEach(() => { tg.restore(); for (const d of devs) d.close(); });

test("1 a slow network: Home answers within Kino's 20 s with the rows it already had", { timeout: 40000 }, async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, "a.mp4");
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  postVideo(CH1, "b.mp4");
  postVideo(CH1, "c.mp4");
  expireIndex(d);
  // Each answer is slow, the last one never comes: every page starts before the deadline.
  tg.dc(2).once("getDifference", () => ({ delayMs: 6000 }));
  tg.dc(2).once("getChannelDifference", () => ({ delayMs: 6500 }));
  tg.dc(2).once("getChannelDifference", () => ({ silent: true }));
  const t0 = Date.now();
  const rows = await p.home();
  assert.ok(Date.now() - t0 < 20000, "Home took " + (Date.now() - t0) + " ms");
  assert.ok(flat(rows).some((i) => i.ref === ref), "the rows it had");
  assert.notEqual(rows[0].id, "notice", "running out of time is not an error");
  assert.equal(JSON.parse(d.base.storage.get("tg.shell")).incomplete, true, "and it goes on next time");
});

test("1 a cold connect whose login is slow and migrates: connect and login stay inside the refresh's 14 s", { timeout: 40000 }, async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, "a.mp4");
  const d = newDevice();
  await (await d.runtime(SETTINGS)).home();
  d.base.storage.remove("tg.session"); // the next runtime needs a key exchange and a login
  expireIndex(d);
  tg.dc(2).userMigrateTo = 4;
  tg.dc(2).once("login", () => ({ delayMs: 7000 })); // then USER_MIGRATE_4
  tg.dc(4).once("login", () => ({ silent: true }));
  const p = await d.runtime(SETTINGS);
  const t0 = Date.now();
  const rows = await p.home();
  assert.ok(Date.now() - t0 < 15000, "Home took " + (Date.now() - t0) + " ms");
  assert.ok(flat(rows).some((i) => i.ref === ref), "the cached rows");
  assert.notEqual(rows[0].id, "notice", "running out of time is not an error");
});

test("2 a restore with a refresh and three reads at once: one device mark is written, the next runtime keeps the session", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, "a.mp4");
  const a = newDevice(), b = newDevice();
  await (await a.runtime(SETTINGS)).home();
  await (await b.runtime(SETTINGS)).home();
  for (const k of b.base.storage.keys()) b.base.storage.remove(k);
  for (const k of a.base.storage.keys()) b.base.storage.set(k, a.base.storage.get(k));
  const p = await b.runtime(SETTINGS);
  // The restore drops b's index: a read that comes before Home rebuilt it finds no video (not_found); one after reads it.
  const outcomes = await Promise.all([...[0, 1, 2].map(() => p.read({ handle: ref, offset: 0, length: MiB }).then((r) => Buffer.from(r.bytes, "base64").length, (e) => e.code)), p.home()]);
  for (const o of outcomes.slice(0, 3)) assert.ok(o === 5000 || o === "not_found", "read outcome " + o);
  const mark = (await b.base.catalog.get(["~device"]))[0].data.device;
  assert.equal(JSON.parse(b.base.storage.get("tg.session")).device, mark, "the session carries the one mark");
  const kx = tg.dc(2).stats.keyExchanges, logins = tg.dc(2).stats.botLogins;
  await (await b.runtime(SETTINGS)).read({ handle: ref, offset: 0, length: MiB });
  assert.deepEqual([tg.dc(2).stats.keyExchanges, tg.dc(2).stats.botLogins], [kx, logins], "no second reset");
});

test("3 Actualizar ahora while a Home skips its pass (fresh index): the forced pass still runs, once", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  postVideo(CH1, "a.mp4");
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  const fresh = postVideo(CH1, "nuevo.mp4");
  const before = tg.requests.filter((q) => q.method === "getDifference").length;
  const [, act] = await Promise.all([p.home(), p.action("refresh")]);
  assert.match(act.message, /1 nuevos|1 new/);
  assert.equal((await d.base.catalog.get([fresh])).length, 1);
  const passes = tg.requests.filter((q) => q.method === "getDifference").length - before;
  assert.ok(passes >= 1 && passes <= 2, "one forced pass (" + passes + " getDifference)");
});

test("4 no timeout is shared through the client: nothing in the shell writes client.timeoutMs", () => {
  const dir = join(root, "src/shell");
  for (const f of readdirSync(dir)) assert.doesNotMatch(readFileSync(join(dir, f), "utf8"), /\.timeoutMs\s*=/, f);
});

test("4 a read and a refresh at once, each inside its own budget", { timeout: 40000 }, async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, "a.mp4", 300000);
  postVideo(CH1, "b.mp4");
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  postVideo(CH1, "c.mp4");
  tg.dc(2).once("getChannelDifference", () => ({ silent: true }));
  const t0 = Date.now();
  const [act, r] = await Promise.all([p.action("refresh"), p.read({ handle: ref, offset: 0, length: MiB })]);
  assert.equal(Buffer.from(r.bytes, "base64").length, 300000);
  assert.ok(act.message);
  assert.ok(Date.now() - t0 < 17000);
});

test("5 a read that needs a refetch while a refresh pass holds the line still succeeds inside its budget", { timeout: 40000 }, async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const ref = postVideo(CH1, "a.mp4", 300000);
  const d = newDevice();
  const p = await d.runtime(SETTINGS);
  await p.home();
  const msgId = Number(ref.split(":")[1]);
  const [row] = await d.base.catalog.get([ref]);
  world.rotateFileReference(CH1, msgId);
  tg.files.get(String(row.data.doc.id)).fileReference = Buffer.from(world.channels.get(String(CH1)).messages.get(msgId).doc.fileReference);
  for (let i = 0; i < 3; i++) world.post(CH1, { text: "x" + i });
  // A refresh pass of about 16 s: a slow common box, then three slow channel pages.
  tg.dc(2).once("getDifference", () => ({ delayMs: 4000 }));
  for (let i = 0; i < 3; i++) tg.dc(2).once("getChannelDifference", () => ({ delayMs: 4000 }));
  const refreshing = p.action("refresh");
  await new Promise((r) => setTimeout(r, 300));
  const t0 = Date.now();
  const r = await p.read({ handle: ref, offset: 0, length: MiB });
  assert.equal(Buffer.from(r.bytes, "base64").length, 300000);
  assert.ok(Date.now() - t0 < 17000);
  await refreshing;
});

test("6 the README says plainly that a slot shift moves the on/off toggles to other channels (es and en)", () => {
  const text = readFileSync(join(root, "README.md"), "utf8");
  assert.match(text, /un canal que tenías activo puede quedar desactivado/);
  assert.match(text, /a channel you had on can turn off/);
});

test("2 checkDevice called twice at once (a refresh and a read's connect) writes one mark and answers it to both", async () => {
  const { createKino } = await import("../sdk/kino-shim.mjs");
  const { MANIFEST } = await import("../testkit/plugin-harness.mjs");
  const { kino } = createKino(MANIFEST, { env: {}, config: {} });
  const saved = globalThis.kino;
  globalThis.kino = kino;
  try {
    const { checkDevice, deviceMark } = await import("../src/shell/live.js");
    kino.storage.set("tg.session", JSON.stringify({ v: 1, fp: "x", device: "f".repeat(32), state: { homeDc: 2, dcs: {} } })); // restored from elsewhere
    const [a, b] = await Promise.all([checkDevice(), checkDevice()]);
    assert.equal(a, b);
    assert.equal(await deviceMark(), a);
  } finally {
    globalThis.kino = saved;
  }
});

// Account mode end to end (0.3.0), the plugin as Kino runs it against the fake cluster and the fake account: no
// background login, the QR login from the settings form (with a DC migration and 2FA), the sealed separate session,
// Saved Messages and chats with videos in the six places (newcomers off), reading a video, a session ended from
// Telegram, the logout, a mode switch that never mixes bot and account rows, and the secret scan.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeAccount } from "../testkit/fake-account.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device, places, MANIFEST } from "../testkit/plugin-harness.mjs";
import { openSession } from "../testkit/session-open.mjs";
import { ACCOUNT_CALLS, ACCOUNT_AUTH_CALLS } from "../src/mtproto/requests.js";

const MiB = 1048576;
const ACC = { access: "account", api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0" };
const BOT = { api_id: ACC.api_id, api_hash: ACC.api_hash, bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const PASSWORD = "contraseña-de-prueba 2FA";
let tg, acct, devs, skew;
const clock = () => Date.now() + skew;
const newDevice = () => { const d = device(); devs.push(d); return d; };
const flat = (rows) => rows.flatMap((r) => r.items);
const st = () => tg.dc(2).stats;
const run = (d, values = ACC) => d.runtime(values, { now: clock, closePrevious: true });
function vid(name, size = 5000) {
  const doc = acct.doc({ mime: "video/mp4", size, fileName: name, video: { duration: 60, w: 640, h: 360 } });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data: Buffer.alloc(size, 7) });
  return { doc };
}
/** The QR login as the person does it: the button, the code on screen, the scan in the official app, the form refresh. */
async function signIn(d, values = ACC) {
  const p = await run(d, values);
  const started = await p.action("qr_login");
  assert.match(started.message, /Dispositivos ▸ Vincular un dispositivo/);
  const s1 = await p.settingsStatus();
  assert.match(s1.login_qr, /^tg:\/\/login\?token=[A-Za-z0-9_-]{43}$/);
  assert.ok(acct.scan());
  skew += 11000; // the next form refresh, 10 s later, asks Telegram again
  const s2 = await p.settingsStatus();
  return { p, s1, s2 };
}

beforeEach(() => { tg = new FakeTelegram().install(); acct = new FakeAccount().install(tg); devs = []; skew = 0; });
afterEach(() => { tg.restore(); for (const d of devs) d.close(); });

test("no background login: without a session Home asks to sign in, with no key exchange and nothing sent", async () => {
  const d = newDevice();
  const p = await run(d);
  const rows = await p.home();
  assert.equal(rows[0].items[0].ref, "setup:signin");
  assert.equal(st().keyExchanges, 0);
  assert.equal(acct.calls.length, 0);
  const s = await p.settingsStatus();
  assert.match(s.account_status, /Sin sesión: toca Iniciar sesión con QR/);
  assert.equal(s.login_qr, undefined, "no QR until the person presses the button");
  await assert.rejects(p.resolve("setup:signin"), (e) => e.code === "auth_required");
});

test("QR login: the code refreshes, the scan logs in; the session is sealed in its own key; Saved Messages first and on", async () => {
  acct.post(acct.selfKey, vid("Viaje a la playa.mp4"));
  const pelis = acct.addChannel({ id: 3000000001n, accessHash: 9n, title: "Pelis" });
  acct.post(pelis, vid("Matrix.mp4"));
  const d = newDevice();
  const { p, s1, s2 } = await signIn(d);
  assert.match(s1.account_status, /Esperando que escanees/);
  assert.match(s2.account_status, /sesión iniciada con tu cuenta/i);
  assert.equal(s2.login_qr, undefined);
  assert.equal(acct.stats.exportLoginToken, 2);
  assert.equal(d.base.storage.get("tg.session"), null, "the bot's key is another key");
  assert.equal(d.base.storage.get("tg.qr"), null);
  const raw = d.base.storage.get("tg.usession");
  const state = openSession(raw, { ...ACC, account: true });
  assert.equal(state.dcs["2"].loggedIn, true);
  assert.ok(!raw.includes(state.dcs["2"].authKey));
  const rows = await p.home();
  const items = flat(rows);
  assert.ok(items.some((i) => i.title === "Viaje a la playa"), JSON.stringify(rows.map((r) => r.title)));
  assert.ok(!items.some((i) => i.title === "Matrix"), "a second chat arrives off");
  const s3 = await p.settingsStatus();
  assert.equal(places(s3)[0], "✓ Mensajes guardados");
  assert.equal(places(s3)[1], "— Pelis");
  const en = await d.runtime(ACC, { lang: "en-US", now: clock, closePrevious: true });
  assert.equal(places(await en.settingsStatus())[0], "✓ Saved Messages");
  // A play: the file through upload.getFile, with the stored session (no login of any kind).
  const ref = items.find((i) => i.title === "Viaje a la playa").ref;
  const p2 = await run(d);
  const r = await p2.read({ handle: ref, offset: 0, length: MiB });
  assert.equal(Buffer.from(r.bytes, "base64").length, 5000);
  assert.equal(acct.stats.exportLoginToken, 2);
});

test("QR login on an account of another DC (migration) with a 2FA password: wrong then right; the password is never kept", async () => {
  acct.homeDc = 4;
  acct.setPassword(PASSWORD);
  acct.post(acct.selfKey, vid("a.mp4"));
  const d = newDevice();
  const { s2 } = await signIn(d);
  assert.match(s2.account_status, /contraseña de dos pasos: escríbela arriba/);
  assert.equal(acct.stats.importLoginToken, 1);
  const WRONG = "otra-clave-equivocada";
  const wrong = await (await run(d, { ...ACC, tg_password: WRONG })).action("check_password");
  assert.match(wrong.message, /no es correcta/);
  assert.deepEqual(wrong.clearSettings, ["tg_password"]);
  const after = [d.storageDump(), JSON.stringify(await d.catalogDump()), d.logs.join("\n"), JSON.stringify(wrong)].join("\n");
  assert.ok(!after.includes(WRONG), "a wrong password is not stored, logged or answered either");
  const right = await (await run(d, { ...ACC, tg_password: PASSWORD })).action("check_password");
  assert.match(right.message, /sesión iniciada/);
  assert.deepEqual(right.clearSettings, ["tg_password"]);
  const state = openSession(d.base.storage.get("tg.usession"), { ...ACC, account: true });
  assert.equal(state.homeDc, 4);
  const p = await run(d);
  assert.ok(flat(await p.home()).some((i) => /^a$/i.test(i.title)));
  const hay = [d.storageDump(), JSON.stringify(await d.catalogDump()), d.logs.join("\n"), JSON.stringify([wrong, right])].join("\n");
  assert.ok(!hay.includes(PASSWORD) && !hay.includes(WRONG), "the password is never stored, logged or answered");
});

test("a session ended from Telegram (Settings ▸ Devices): a clean 'closed' state, the key goes, nothing logs in again", async () => {
  acct.post(acct.selfKey, vid("a.mp4"));
  const d = newDevice();
  const { p } = await signIn(d);
  await p.home();
  acct.revoke();
  const rows = await p.action("refresh");
  assert.match(rows.message, /se cerró: vuelve a iniciar sesión con QR/);
  assert.equal(d.base.storage.get("tg.usession"), null);
  const calls = acct.calls.length, kx = st().keyExchanges;
  for (let i = 0; i < 3; i++) {
    const q = await run(d);
    assert.equal((await q.home())[0].items[0].ref, "setup:closed");
    await assert.rejects(q.read({ handle: "x:1", offset: 0, length: MiB }));
  }
  assert.equal(acct.calls.length, calls, "no request at all after the session was ended");
  assert.equal(st().keyExchanges, kx);
  assert.match((await (await run(d)).settingsStatus()).account_status, /Telegram cerró esta sesión/);
});

test("Cerrar sesión: auth.logOut, then the account's session, index and rows go; a bot session on the device stays", async () => {
  acct.post(acct.selfKey, vid("a.mp4"));
  const d = newDevice();
  const { p } = await signIn(d);
  await p.home();
  const mark = (await d.base.catalog.get(["~device"]))[0].data.device;
  d.base.storage.set("tg.session", JSON.stringify({ v: 2, fp: "x", device: mark, salt: "s", iv: "i", ct: "c" })); // a bot's, of this device
  assert.ok((await d.catalogDump()).some((r) => r.id !== "~device"));
  const out = await p.action("logout");
  assert.match(out.message, /se cerró la sesión de tu cuenta/);
  assert.equal(acct.stats.logOuts, 1);
  for (const k of ["tg.usession", "tg.adiscovery", "tg.shell", "tg.qr"]) assert.equal(d.base.storage.get(k), null, k);
  assert.ok(d.base.storage.get("tg.session"), "the bot's session is not the account's to delete");
  assert.deepEqual((await d.catalogDump()).map((r) => r.id), ["~device"]);
  assert.equal((await (await run(d)).home())[0].items[0].ref, "setup:signin");
});

test("a FLOOD_WAIT on the QR login is kept: pressing the button again sends nothing while it lasts (no retry loop)", async () => {
  const d = newDevice();
  const p = await run(d);
  tg.dc(2).once("any", () => ({ error: [420, "FLOOD_WAIT_600"] }));
  assert.match((await p.action("qr_login")).message, /pidió esperar: vuelve a intentar en 10 minutos/);
  const n = acct.stats.exportLoginToken + (tg.methodIds || []).length;
  for (let i = 0; i < 3; i++) assert.match((await (await run(d)).action("qr_login")).message, /pidió esperar/);
  assert.equal(acct.stats.exportLoginToken + (tg.methodIds || []).length, n);
});

test("QR logins are budgeted per device (5 an hour); the code stops after its window", async () => {
  const d = newDevice();
  const p = await run(d); // the person presses the button again and again on the same form
  for (let i = 0; i < 5; i++) assert.match((await p.action("qr_login")).message, /escanea el código/);
  assert.match((await p.action("qr_login")).message, /Demasiados intentos/);
  skew += 151000;
  const s = await (await run(d)).settingsStatus();
  assert.match(s.account_status, /El código venció/);
  assert.equal(s.login_qr, undefined);
});

test("a mode switch never mixes bot and account rows: each mode's index is its own", async () => {
  const world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  const CH = 1987654321n;
  world.addChannel({ id: CH, accessHash: 11n, title: "Canal del bot" });
  const doc = world.doc({ mime: "video/mp4", size: 4000, fileName: "del-bot.mp4", video: { duration: 9, w: 1, h: 1 } });
  world.post(CH, { doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data: Buffer.alloc(4000) });
  const api = { ...Object.fromEntries(["getState", "getDifference", "getChannelDifference"].map((m) => [m, world[m].bind(world)])), channelsGetMessages: (r) => world.channelsGetMessages(r), messagesGetMessages: (r) => world.messagesGetMessages(r) };
  tg.api = api;
  const d = newDevice();
  assert.ok(flat(await (await run(d, BOT)).home()).some((i) => /del-bot/i.test(i.title)));
  tg.api = acct;
  acct.post(acct.selfKey, vid("de-la-cuenta.mp4"));
  const { p } = await signIn(d);
  const items = flat(await p.home());
  assert.ok(items.some((i) => /de-la-cuenta/i.test(i.title)));
  assert.ok(!items.some((i) => /del-bot/i.test(i.title)));
  assert.ok(!(await d.catalogDump()).some((r) => r.title.includes("del-bot")));
  tg.api = api;
  const back = flat(await (await run(d, BOT)).home());
  assert.ok(back.some((i) => /del-bot/i.test(i.title)) && !back.some((i) => /de-la-cuenta/i.test(i.title)));
});

test("read only, end to end: every method the cluster received in account mode is on the account lists (plus getFile and the file-DC authorization)", async () => {
  acct.post(acct.selfKey, vid("a.mp4"));
  const g = acct.addGroup({ id: 4001n, title: "Familia" });
  acct.post(g, vid("b.mp4"));
  const d = newDevice();
  const { p } = await signIn(d);
  const items = flat(await p.home());
  await p.read({ handle: items[0].ref, offset: 0, length: MiB });
  await p.action("refresh");
  await p.action("logout");
  const allowed = new Set([...ACCOUNT_CALLS, ...ACCOUNT_AUTH_CALLS, 0xbe5335be, 0xe5bfffcd, 0xa57a7dad]);
  const seen = [...new Set(tg.methodIds)];
  assert.ok(seen.length >= 5);
  for (const id of seen) assert.ok(allowed.has(id), "method 0x" + id.toString(16) + " reached the server");
});

test("secret scan in account mode: api_hash, the auth key, the login token and the password never in storage, rows, logs or answers", async () => {
  acct.setPassword(PASSWORD);
  acct.post(acct.selfKey, vid("a.mp4"));
  const d = newDevice();
  const { p, s1 } = await signIn(d);
  const outs = [s1, await (await run(d, { ...ACC, tg_password: PASSWORD })).action("check_password"), await p.home(), await p.settingsStatus()];
  const token = s1.login_qr.split("token=")[1];
  const state = openSession(d.base.storage.get("tg.usession"), { ...ACC, account: true });
  const hay = [d.storageDump(), JSON.stringify(await d.catalogDump()), d.logs.join("\n")].join("\n");
  for (const s of [ACC.api_hash, PASSWORD, token, state.dcs["2"].authKey, state.dcs["2"].serverSalt]) assert.ok(!hay.includes(s), "leaked: " + s.slice(0, 6));
  assert.ok(!JSON.stringify(outs.slice(1)).includes(PASSWORD) && !JSON.stringify(outs.slice(1)).includes(ACC.api_hash));
  assert.ok(!d.logs.join("\n").includes("tg://login"));
});

test("the manifest: access defaults to the bot, the bot token is optional, 12 valued settings and 15 others (Kino's limits)", () => {
  const s = MANIFEST.settings;
  assert.equal(s.find((x) => x.key === "access").default, "bot");
  assert.ok(!s.find((x) => x.key === "bot_token").required);
  const valued = s.filter((x) => !["section", "status", "action", "qr", "link", "help"].includes(x.type));
  assert.equal(valued.length, 12);
  assert.equal(s.length - valued.length, 15);
  assert.equal(s.find((x) => x.key === "login_qr").refreshMs, 5000);
  assert.ok(s.filter((x) => /^ch\d$/.test(x.key)).length === 6);
});

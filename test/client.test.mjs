// The client against the fake Telegram cluster (testkit/fake-dc.mjs) through the SDK shim's real kino.ws and
// kino.crypto. No test reaches the network or reads a credential: the api id, hash and token are made up.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { TelegramClient, loginBudget } from "../src/mtproto/client.js";

installKino();

const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const MiB = 1048576;
function fileData(size, seed = 7) {
  const b = Buffer.alloc(size);
  let x = seed;
  for (let i = 0; i < size; i++) { x = (x * 1103515245 + 12345) >>> 0; b[i] = x >>> 24; }
  return b;
}
const DOC = { id: 5577006791947779410n, accessHash: -8674665223082153551n, fileReference: Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]) };
const SIZE = 2 * MiB + 12345;
const DATA = fileData(SIZE);

let tg;
const newClient = (extra = {}) => new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 3000, store: memoryStore(), ...extra });
const loginTimes = (store) => JSON.parse(store.get("mtproto.botLogins") || "[]");
beforeEach(() => {
  tg = new FakeTelegram().install();
  tg.addFile({ ...DOC, dc: 2, data: DATA });
});
afterEach(() => tg.restore());

test("connect makes an auth key, botLogin goes out as invokeWithLayer(198, initConnection(importBotAuthorization)) once", async () => {
  const c = await newClient().connect(2);
  const who = await c.botLogin(CREDS);
  const dc = tg.dc(2);
  assert.equal(who.userId, 777001n);
  assert.equal(dc.stats.keyExchanges, 1);
  assert.equal(dc.stats.botLogins, 1);
  assert.deepEqual(dc.stats.layers, [198]);
  assert.equal(dc.stats.initConnection, 1);
  assert.deepEqual(dc.lastLogin, { apiId: 12345, apiHash: CREDS.apiHash, token: CREDS.botToken });
  // A second login on a logged-in DC sends nothing.
  assert.deepEqual(await c.botLogin(CREDS), { reused: true, userId: 777001n });
  assert.equal(dc.stats.botLogins, 1);
  await c.close();
});

test("getFile returns exactly the bytes of each aligned chunk, and fewer at the end of the file", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const loc = { ...DOC, dcId: 2 };
  const first = await c.getFile(loc, 0, MiB);
  assert.equal(first.length, MiB);
  assert.ok(Buffer.from(first).equals(DATA.subarray(0, MiB)));
  const mid = await c.getFile(loc, MiB + 8192, 4096);
  assert.ok(Buffer.from(mid).equals(DATA.subarray(MiB + 8192, MiB + 12288)));
  const last = await c.getFile(loc, 2 * MiB, MiB);
  assert.equal(last.length, 12345);
  assert.ok(Buffer.from(last).equals(DATA.subarray(2 * MiB)));
  assert.equal(tg.dc(2).stats.layers.length, 1, "only the first call of the connection is wrapped");
  await c.close();
});

test("getFile refuses offsets and limits Telegram would refuse, before sending anything", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const loc = { ...DOC, dcId: 2 };
  for (const [o, l] of [[100, MiB], [0, 1000], [0, 3 * 4096], [0, 2 * MiB], [MiB - 4096, 8192], [-4096, 4096], [0, 0]]) {
    await assert.rejects(c.getFile(loc, o, l), (e) => e.code === "invalid_request", `${o}/${l}`);
  }
  await assert.rejects(c.getFile({ id: 1n }, 0, 4096), (e) => e.code === "invalid_request");
  assert.equal(tg.dc(2).stats.getFile, 0);
  await c.close();
});

test("a stored state is reused: no second key exchange and no second login, even from a new client", async () => {
  const c1 = await newClient().connect(2);
  await c1.botLogin(CREDS);
  const state = JSON.parse(JSON.stringify(c1.exportState()));
  await c1.close();
  assert.equal(state.homeDc, 2);
  const s2 = state.dcs["2"];
  assert.equal(s2.dc, 2);
  assert.equal(s2.loggedIn, true);
  assert.equal(typeof s2.authKey, "string");
  assert.equal(Buffer.from(s2.authKey, "base64").length, 256);
  assert.equal(Buffer.from(s2.serverSalt, "base64").length, 8);
  assert.match(s2.authKeyId, /^[0-9a-f]{16}$/);
  assert.equal(typeof s2.timeOffset, "number");

  const c2 = await newClient().connect(2, state);
  assert.deepEqual(await c2.botLogin(CREDS), { reused: true, userId: 777001n });
  const chunk = await c2.getFile({ ...DOC, dcId: 2 }, 0, 4096);
  assert.ok(Buffer.from(chunk).equals(DATA.subarray(0, 4096)));
  const dc = tg.dc(2);
  assert.equal(dc.stats.keyExchanges, 1);
  assert.equal(dc.stats.botLogins, 1);
  assert.equal(dc.stats.connections, 2);
  assert.equal(dc.stats.initConnection, 2, "a new connection says initConnection again");
  // A single DC's entry works too.
  await c2.close();
  const c3 = await newClient().connect(2, s2);
  assert.equal((await c3.getFile({ ...DOC, dcId: 2 }, 4096, 4096)).length, 4096);
  assert.equal(dc.stats.keyExchanges, 1);
  await c3.close();
});

test("FLOOD_WAIT_n becomes a typed error with the wait; the next call works", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  tg.dc(2).once("getFile", () => ({ error: [420, "FLOOD_WAIT_7"] }));
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, 4096), (e) => e.code === "flood_wait" && e.seconds === 7);
  assert.equal((await c.getFile({ ...DOC, dcId: 2 }, 0, 4096)).length, 4096);
  await c.close();
});

test("FILE_MIGRATE_n switches to that DC: a key there, the authorization exported and imported, never a new bot login", async () => {
  tg.addFile({ ...DOC, id: 99n, dc: 4, data: DATA });
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const loc = { ...DOC, id: 99n, dcId: 2 };   // the caller thinks DC 2
  const chunk = await c.getFile(loc, MiB, MiB);
  assert.ok(Buffer.from(chunk).equals(DATA.subarray(MiB, 2 * MiB)));
  const d2 = tg.dc(2), d4 = tg.dc(4);
  assert.equal(d4.stats.keyExchanges, 1);
  assert.equal(d2.stats.exportAuth, 1);
  assert.equal(d4.stats.importAuth, 1);
  assert.equal(d2.stats.botLogins + d4.stats.botLogins, 1);
  // The DC 4 key and its authorization are part of the state and reused.
  const state = c.exportState();
  assert.equal(state.homeDc, 2);
  assert.equal(state.dcs["4"].loggedIn, true);
  await c.close();
  const again = await newClient().connect(2, state);
  assert.equal((await again.getFile({ ...DOC, id: 99n, dcId: 4 }, 0, 4096)).length, 4096);
  assert.equal(d4.stats.keyExchanges, 1);
  assert.equal(d4.stats.importAuth, 1);
  assert.equal(d2.stats.exportAuth, 1);
  await again.close();
});

test("USER_MIGRATE_n on login moves the home DC there and logs in once there", async () => {
  tg.dc(2).userMigrateTo = 4;
  const c = await newClient().connect(2);
  const who = await c.botLogin(CREDS);
  assert.equal(who.userId, 777001n);
  assert.equal(c.exportState().homeDc, 4);
  assert.equal(c.exportState().dcs["4"].loggedIn, true);
  assert.equal(tg.dc(4).stats.botLogins, 1);
  await c.close();
});

test("bad_server_salt mid-download: the request goes again with the new salt, and the state keeps it", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const dc = tg.dc(2);
  dc.rotateSalt();
  const chunk = await c.getFile({ ...DOC, dcId: 2 }, 0, MiB);
  assert.ok(Buffer.from(chunk).equals(DATA.subarray(0, MiB)));
  assert.equal(dc.stats.badSalts, 1);
  assert.equal(Buffer.from(c.exportState().dcs["2"].serverSalt, "base64").toString("hex"), dc.salt.toString("hex"));
  await c.close();
});

test("a server clock far ahead: bad_msg_notification 16 (msg_id too low) fixes the time offset and the request goes again", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const dc = tg.dc(2);
  dc.clockSkew = 4000;
  assert.equal((await c.getFile({ ...DOC, dcId: 2 }, 0, 4096)).length, 4096);
  assert.equal(dc.stats.badTimes, 1);
  assert.ok(Math.abs(c.exportState().dcs["2"].timeOffset - 4000) <= 2);
  dc.once("getFile", () => ({ badMsg: 64 }));
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, 4096), (e) => e.code === "bad_msg" && e.badMsgCode === 64);
  await c.close();
});

test("a server clock far behind: bad_msg_notification 17 (msg_id too high) lowers the next ids and the request goes again", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const dc = tg.dc(2);
  dc.clockSkew = -4000;
  const chunk = await c.getFile({ ...DOC, dcId: 2 }, 0, 4096);
  assert.ok(Buffer.from(chunk).equals(DATA.subarray(0, 4096)));
  assert.equal(dc.stats.badTimes, 1, "one refusal, then the corrected id is accepted");
  assert.ok(Math.abs(c.exportState().dcs["2"].timeOffset + 4000) <= 2);
  assert.equal((await c.getFile({ ...DOC, dcId: 2 }, 4096, 4096)).length, 4096);
  assert.equal(dc.stats.badTimes, 1);
  await c.close();
});

test("a socket drop mid-session reconnects with the stored key, without a key exchange or a login", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const dc = tg.dc(2);
  dc.dropConnections();
  await new Promise((r) => setTimeout(r, 20));
  const chunk = await c.getFile({ ...DOC, dcId: 2 }, 4096, 4096);
  assert.ok(Buffer.from(chunk).equals(DATA.subarray(4096, 8192)));
  assert.equal(dc.stats.connections, 2);
  assert.equal(dc.stats.keyExchanges, 1);
  assert.equal(dc.stats.botLogins, 1);
  await c.close();
});

test("a request the server never answers times out with a typed error; the client recovers on the next call", async () => {
  const c = await newClient({ timeoutMs: 200 }).connect(2);
  await c.botLogin(CREDS);
  tg.dc(2).once("getFile", () => ({ silent: true }));
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, 4096), (e) => e.code === "timeout");
  assert.equal((await c.getFile({ ...DOC, dcId: 2 }, 0, 4096)).length, 4096);
  await c.close();
});

test("FILE_REFERENCE_EXPIRED is a typed error for the caller to refresh the reference", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  await assert.rejects(c.getFile({ ...DOC, fileReference: Uint8Array.from([9]), dcId: 2 }, 0, 4096), (e) => e.code === "file_reference_expired");
  await c.close();
});

test("a key the server forgot: auth_key_unregistered, and the stale key is dropped from the state", async () => {
  const c1 = await newClient().connect(2);
  await c1.botLogin(CREDS);
  const state = c1.exportState();
  await c1.close();
  tg.dc(2).forgetKeys();
  const c2 = await newClient().connect(2, state);
  await assert.rejects(c2.getFile({ ...DOC, dcId: 2 }, 0, 4096), (e) => e.code === "auth_key_unregistered");
  assert.equal(c2.exportState().dcs["2"], undefined);
  await c2.close();
});

test("gzip_packed results and containers with new_session_created are unpacked (login and file chunk)", async () => {
  const dc = tg.dc(2);
  dc.gzipFiles = true;
  const c = await newClient().connect(2);
  assert.equal((await c.botLogin(CREDS)).userId, 777001n);
  const chunk = await c.getFile({ ...DOC, dcId: 2 }, 0, MiB);
  assert.ok(Buffer.from(chunk).equals(DATA.subarray(0, MiB)));
  dc.gzipMessages = true;   // now whole messages (containers included) arrive inside gzip_packed
  const again = await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB);
  assert.ok(Buffer.from(again).equals(DATA.subarray(MiB, 2 * MiB)));
  await c.close();
  const fresh = await newClient().connect(2);   // a new session: new_session_created + rpc_result in a gzipped container
  assert.equal((await fresh.botLogin(CREDS)).userId, 777001n);
  await fresh.close();
});

test("the login budget allows 3 bot logins per hour per device, then refuses with the wait", () => {
  const store = memoryStore();
  const t0 = 1_800_000_000_000;
  for (let i = 0; i < 3; i++) {
    const b = loginBudget(store, t0 + i * 60_000);
    assert.equal(b.allowed, true);
    assert.equal(b.remaining, 3 - i);
    b.record();
  }
  const fourth = loginBudget(store, t0 + 10 * 60_000);
  assert.equal(fourth.allowed, false);
  assert.equal(fourth.remaining, 0);
  assert.equal(fourth.retryAfterSeconds, 50 * 60);
  assert.throws(() => fourth.record(), (e) => e.code === "login_budget" && e.seconds === 50 * 60);
  assert.equal(loginBudget(store, t0 + 60 * 60_000 + 1).allowed, true, "the first login left the window");
  store.set("mtproto.botLogins", "not json");
  assert.equal(loginBudget(store, t0).allowed, true, "a damaged entry does not lock the person out");
});

test("botLogin spends the budget and refuses a fourth login in an hour without contacting Telegram", async () => {
  const store = memoryStore();
  for (let i = 0; i < 3; i++) {
    const c = await newClient({ store }).connect(2);
    await c.botLogin(CREDS);
    await c.close();
  }
  const c = await newClient({ store }).connect(2);
  await assert.rejects(c.botLogin(CREDS), (e) => e.code === "login_budget" && e.seconds > 0);
  assert.equal(tg.dc(2).stats.botLogins, 3);
  await c.close();
});

test("a client without a store is refused; only an explicit store: false goes without the budget", () => {
  assert.throws(() => new TelegramClient({ apiId: 1, publicKeys: fakeRsa().publicKeys }), (e) => e.code === "invalid_request" && /store/.test(e.message));
  assert.throws(() => new TelegramClient({ apiId: 1, store: null }), (e) => e.code === "invalid_request");
  assert.throws(() => new TelegramClient({ apiId: 1, store: {} }), (e) => e.code === "invalid_request");
  assert.ok(new TelegramClient({ apiId: 1, store: false }));
});

test("a socket dropped during the bot login: the retry spends a second budget slot", async () => {
  const store = memoryStore();
  const c = await newClient({ store }).connect(2);
  tg.dc(2).once("login", () => ({ close: true }));
  assert.equal((await c.botLogin(CREDS)).userId, 777001n);
  assert.equal(loginTimes(store).length, 2);
  assert.equal(tg.dc(2).stats.botLogins, 1);
  await c.close();
});

test("a socket dropped during the bot login with no budget left: the retry is refused, nothing more is sent", async () => {
  const store = memoryStore();
  const now = Date.now();
  store.set("mtproto.botLogins", JSON.stringify([now - 1000, now - 500]));
  const c = await newClient({ store }).connect(2);
  tg.dc(2).once("login", () => ({ close: true }));
  await assert.rejects(c.botLogin(CREDS), (e) => e.code === "login_budget");
  assert.equal(loginTimes(store).length, 3);
  assert.equal(tg.dc(2).stats.botLogins, 0);
  await c.close();
});

test("USER_MIGRATE then a failed login there leaves the home DC where it was", async () => {
  tg.dc(2).userMigrateTo = 4;
  tg.dc(4).once("login", () => ({ error: [400, "ACCESS_TOKEN_INVALID"] }));
  const c = await newClient().connect(2);
  await assert.rejects(c.botLogin(CREDS), (e) => e.code === "token_invalid" && e.rpc === "ACCESS_TOKEN_INVALID");
  assert.equal(c.exportState().homeDc, 2);
  await c.close();
});

test("a packet length over the cap is a protocol error at once, not a wait", async () => {
  const c = await newClient({ timeoutMs: 3000 }).connect(2);
  await c.botLogin(CREDS);
  tg.dc(2).once("getFile", () => ({ hugeLength: 3 * MiB }));
  const t0 = Date.now();
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, 4096), (e) => e.code === "protocol" && /cap/.test(e.message));
  assert.ok(Date.now() - t0 < 2000);
  assert.equal((await c.getFile({ ...DOC, dcId: 2 }, 0, 4096)).length, 4096, "a new connection works");
  await c.close();
});

test("a Session that cannot be built closes the transport it was given", async () => {
  const c1 = await newClient().connect(2);
  const state = c1.exportState();
  await c1.close();
  const c2 = newClient();
  c2.importState(state);
  c2.dcs.get(2).authKey = new Uint8Array(10);   // damaged in memory after the import checks
  await assert.rejects(c2.connect(2), (e) => e.code === "invalid_request");
  const sockets = tg.fake.sockets;
  assert.equal(sockets[sockets.length - 1].readyState, 3, "the socket was closed");
});

test("calls are serialised: concurrent getFile calls each get their own bytes", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const loc = { ...DOC, dcId: 2 };
  const parts = await Promise.all([0, 1, 2, 3].map((i) => c.getFile(loc, i * 4096, 4096)));
  parts.forEach((p, i) => assert.ok(Buffer.from(p).equals(DATA.subarray(i * 4096, (i + 1) * 4096)), "part " + i));
  await c.close();
});

test("unknown server constructors in a container do not break the call", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const dc = tg.dc(2);
  dc.once("getFile", ({ conn, msgId }) => {
    // an updates-like message first, then nothing: the real answer comes from the normal path below.
    conn.sendEncrypted(dc.authKeys.values().next().value.key, [...conn.sessions.keys()][0], Buffer.from([0x78, 0x56, 0x34, 0x12, 0, 0, 0, 0]));
    return undefined;
  });
  assert.equal((await c.getFile({ ...DOC, dcId: 2 }, 0, 4096)).length, 4096);
  await c.close();
});


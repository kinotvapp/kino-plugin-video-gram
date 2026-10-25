// Account mode, core (0.3.0): the QR login with its DC migration, the 2FA password over SRP against the fake account's
// own SRP verification, the logout, a revoked session, and the closed READ-ONLY allowlist.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeAccount } from "../testkit/fake-account.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { ACCOUNT_CALLS, ACCOUNT_AUTH_CALLS, BOT_CALLS, searchMessages, getDialogs, FILTER, getState } from "../src/mtproto/requests.js";
import { Writer } from "../src/mtproto/tl.js";
import { decode } from "../src/mtproto/schema/reader.js";

installKino();
const API = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef" };
let tg, acct, store;
beforeEach(() => { tg = new FakeTelegram().install(); acct = new FakeAccount().install(tg); store = memoryStore(); });
afterEach(() => tg.restore());
const client = (o = {}) => new TelegramClient({ apiId: API.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 8000, store, mode: "account", ...o });

async function qrLogin(c) {
  const first = await c.qrLoginStep({ apiHash: API.apiHash });
  assert.ok(first.token instanceof Uint8Array && first.token.length === 32);
  assert.ok(first.expires > 0);
  assert.equal(acct.scan(), true);
  return c.qrLoginStep({ apiHash: API.apiHash });
}

// Every method that sends, edits, deletes, forwards, marks read, joins, leaves or changes something (layer 198 ids).
export const FORBIDDEN = {
  "messages.sendMessage": 0x983f9745, "messages.sendMedia": 0x7852834e, "messages.forwardMessages": 0x6d74da08,
  "messages.deleteMessages": 0xe58e95d2, "messages.editMessage": 0xdfd14005, "messages.readHistory": 0x0e306d3a,
  "messages.deleteHistory": 0xb08f922a, "messages.readMessageContents": 0x36a73f77, "messages.setTyping": 0x58943ee2,
  "messages.sendReaction": 0xd30d78d4, "messages.saveDraft": 0xd372c5ce, "messages.toggleDialogPin": 0xa731e257,
  "messages.markDialogUnread": 0xc286d98f, "messages.importChatInvite": 0x6c50051c, "channels.readHistory": 0xcc104937,
  "channels.deleteMessages": 0x84c1fd4e, "channels.joinChannel": 0x24b524c5, "channels.leaveChannel": 0xf836aa95,
  "channels.editTitle": 0x566decd0, "channels.readMessageContents": 0xeab5dc38, "contacts.getContacts": 0x5dd69e12,
  "contacts.addContact": 0xe8f463d0, "contacts.block": 0x2e2e8734, "account.updateProfile": 0x78515775,
  "account.updateStatus": 0x6628562c, "account.updateUsername": 0x3e0bdd7c, "account.deleteAccount": 0xa2c0cf74,
  "account.resetAuthorization": 0xdf77f3bc, "auth.resetAuthorizations": 0x9fab0d1a, "auth.acceptLoginToken": 0xe894ad4d,
  "auth.sendCode": 0xa677244f, "photos.uploadProfilePhoto": 0x0388a3b5, "upload.saveFilePart": 0xb304a621,
  "folders.editPeerFolders": 0x6847d0ab, "messages.searchGlobal": 0x4bc6589a,
};
const body = (id) => new Writer().int(id).int(0).int(0).done();

test("QR login: a token while nobody scanned, then the official app's scan logs the account in (no bot login, not a bot)", async () => {
  const c = client();
  await c.connect(2);
  assert.equal(c.needsLogin(), true);
  const done = await qrLogin(c);
  assert.equal(done.userId, 55501n);
  assert.equal(c.needsLogin(), false);
  assert.equal(tg.dc(2).stats.botLogins, 0);
  assert.deepEqual(await c.qrLoginStep({ apiHash: API.apiHash }), { reused: true, userId: 55501n });
  const st = c.exportState();
  assert.equal(st.dcs["2"].loggedIn, true);
  assert.equal(st.dcs["2"].userId, "55501");
  await c.close();
});

test("QR login on an account of another DC: loginTokenMigrateTo, a new key there, importLoginToken, that DC becomes home", async () => {
  acct.homeDc = 4;
  const c = client();
  await c.connect(2);
  const done = await qrLogin(c);
  assert.equal(done.userId, 55501n);
  assert.equal(c.homeDc, 4);
  assert.equal(tg.dc(4).stats.keyExchanges, 1);
  assert.equal(acct.stats.importLoginToken, 1);
  assert.equal(c.exportState().homeDc, 4);
  await c.close();
});

test("2FA: SESSION_PASSWORD_NEEDED, a wrong password refused by the server's SRP check, the right one logs in", async () => {
  acct.setPassword("hunter2 ñandú");
  acct.homeDc = 4;
  const c = client();
  await c.connect(2);
  await assert.rejects(qrLogin(c), (e) => e.code === "password_needed");
  assert.equal(c.homeDc, 4, "the password goes to the DC that asked");
  await assert.rejects(c.checkPassword("hunter3"), (e) => e.code === "password_invalid" && e.rpc === "PASSWORD_HASH_INVALID");
  assert.equal(acct.stats.badPasswords, 1);
  assert.equal(c.needsLogin(), true);
  const ok = await c.checkPassword("hunter2 ñandú");
  assert.equal(ok.userId, 55501n);
  assert.equal(c.needsLogin(), false);
  await c.close();
});

test("2FA attempts are budgeted: at most 5 per device and hour, the 6th is refused before anything is sent", async () => {
  acct.setPassword("pw");
  const c = client();
  await c.connect(2);
  await assert.rejects(qrLogin(c), (e) => e.code === "password_needed");
  for (let i = 0; i < 5; i++) await assert.rejects(c.checkPassword("nope" + i), (e) => e.code === "password_invalid");
  const sent = acct.stats.getPassword;
  await assert.rejects(c.checkPassword("pw"), (e) => e.code === "login_budget" && e.seconds > 0);
  assert.equal(acct.stats.getPassword, sent);
  await c.close();
});

test("the stored state of a logged-in account opens with no key exchange and no login; logOut ends it on the server", async () => {
  const a = client();
  await a.connect(2);
  await qrLogin(a);
  const state = a.exportState();
  await a.close();
  const kx = tg.dc(2).stats.keyExchanges, exports = acct.stats.exportLoginToken;
  const b = client();
  await b.connect(2, state);
  assert.equal(b.needsLogin(), false);
  const res = decode(await b.call(getDialogs({ limit: 10 })), { expect: "messages.Dialogs" });
  assert.match(res._, /^messages\.dialogs/);
  assert.equal(tg.dc(2).stats.keyExchanges, kx);
  assert.equal(acct.stats.exportLoginToken, exports);
  assert.equal(await b.logOut(), true);
  assert.equal(acct.stats.logOuts, 1);
  assert.equal(b.needsLogin(), true);
  await b.close();
});

test("a session the person ended in Telegram (SESSION_REVOKED): typed auth_key_unregistered, the key is no longer logged in", async () => {
  const c = client();
  await c.connect(2);
  await qrLogin(c);
  acct.revoke();
  await assert.rejects(c.call(searchMessages({ peer: { kind: "self" }, filter: FILTER.video, limit: 1 })), (e) => e.code === "auth_key_unregistered" && e.rpc === "SESSION_REVOKED");
  assert.equal(c.needsLogin(), true);
  await assert.rejects(c.call(getDialogs({})), (e) => e.code === "invalid_request", "nothing is sent once logged out");
  await c.close();
});

test("ALLOWLIST: account mode sends only its read methods; every send/modify method, the bot's update methods and the login methods are refused by call", async () => {
  assert.deepEqual([...ACCOUNT_CALLS].sort(), [0xa0f4cb4f, 0x29ee847a, 0x63c66506, 0xad8c9a23].sort());
  assert.ok(Object.isFrozen(ACCOUNT_CALLS) && Object.isFrozen(ACCOUNT_AUTH_CALLS));
  const c = client();
  await c.connect(2);
  await qrLogin(c);
  const before = (tg.methodIds || []).length;
  for (const [name, id] of Object.entries(FORBIDDEN)) {
    assert.ok(!ACCOUNT_CALLS.includes(id) && !ACCOUNT_AUTH_CALLS.includes(id), name);
    await assert.rejects(c.call(body(id)), (e) => e.code === "invalid_request", name);
  }
  for (const id of [...BOT_CALLS.filter((x) => !ACCOUNT_CALLS.includes(x)), ...ACCOUNT_AUTH_CALLS]) await assert.rejects(c.call(body(id)), (e) => e.code === "invalid_request", id.toString(16));
  for (const [name, id] of Object.entries(FORBIDDEN)) await assert.rejects(c.authInvoke(2, body(id), "Bool"), (e) => e.code === "invalid_request", name);
  assert.equal((tg.methodIds || []).length, before, "nothing reached the server");
  // ...and what is allowed works
  await c.call(searchMessages({ peer: { kind: "self" }, filter: FILTER.video, limit: 1 }));
  await c.close();
});

test("ALLOWLIST: a bot client refuses the account's reading and login methods; an account client refuses botLogin", async () => {
  const bot = new TelegramClient({ apiId: API.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 8000, store, mode: "bot" });
  await bot.connect(2);
  await bot.botLogin({ apiHash: API.apiHash, botToken: "1:x" });
  for (const id of [0xa0f4cb4f, 0x29ee847a, ...ACCOUNT_AUTH_CALLS]) await assert.rejects(bot.call(body(id)), (e) => e.code === "invalid_request", id.toString(16));
  await assert.rejects(bot.qrLoginStep({ apiHash: API.apiHash }), (e) => e.code === "invalid_request");
  await assert.rejects(bot.call(getState()), (e) => e.rpc === "METHOD_NOT_IN_FAKE_DC", "the bot's own method is sent (this fake has no update box)");
  await bot.close();
  await assert.rejects(client().botLogin({ apiHash: "h", botToken: "1:t" }), (e) => e.code === "invalid_request");
  assert.throws(() => client({ mode: "user" }), (e) => e.code === "invalid_request");
});

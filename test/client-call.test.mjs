// TelegramClient.call(body): one raw API call on the home DC for the discovery (updates.*, channels.getMessages,
// messages.getMessages), against the fake DC. It must not open a way around the 7a guarantees: no call before a login,
// no auth.* method (the login budget lives in botLogin), no hand-made invokeWithLayer/initConnection wrapping.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import * as S from "../testkit/tl-serializer.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { Writer, CTOR } from "../src/mtproto/tl.js";
import { fromRpcError, CODES } from "../src/mtproto/errors.js";

installKino();

const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const GET_STATE = new Writer().int(0xedd4882a).done();
let tg;
const newClient = () => new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 3000, store: memoryStore() });
beforeEach(() => { tg = new FakeTelegram().install(); });
afterEach(() => tg.restore());

test("call answers the raw result bytes of one API call on the home DC", async () => {
  tg.api = { getState: () => S.state({ pts: 7, qts: 0, date: 1700000000, seq: 1 }) };
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const res = await c.call(GET_STATE);
  assert.ok(res instanceof Uint8Array);
  assert.equal(Buffer.from(res).toString("hex"), S.state({ pts: 7, qts: 0, date: 1700000000, seq: 1 }).toString("hex"));
  assert.deepEqual(tg.requests, [{ method: "getState" }]);
  assert.equal(tg.dc(2).stats.layers.length, 1, "the login already wrapped this connection");
  await c.close();
});

test("call refuses before connect and before a login, and refuses non-bytes, without sending anything", async () => {
  const c0 = newClient();
  await assert.rejects(c0.call(GET_STATE), (e) => e.code === "invalid_request");
  const c = await newClient().connect(2);
  await assert.rejects(c.call(GET_STATE), (e) => e.code === "invalid_request" && /log/.test(e.message));
  await c.botLogin(CREDS);
  await assert.rejects(c.call("edd4882a"), (e) => e.code === "invalid_request");
  await assert.rejects(c.call(new Uint8Array(2)), (e) => e.code === "invalid_request");
  assert.deepEqual(tg.requests, []);
  await c.close();
});

test("call refuses auth.* methods and hand-made invokeWithLayer/initConnection wrapping", async () => {
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  const before = tg.dc(2).stats.botLogins;
  for (const id of [CTOR.importBotAuthorization, CTOR.exportAuthorization, CTOR.importAuthorization, CTOR.invokeWithLayer, CTOR.initConnection, 0x3e72ba19 /* auth.logOut */, 0xbf9459b7 /* invokeWithoutUpdates */]) {
    await assert.rejects(c.call(new Writer().int(id).int(0).done()), (e) => e.code === "invalid_request", id.toString(16));
  }
  assert.equal(tg.dc(2).stats.botLogins, before);
  assert.equal(tg.dc(2).stats.exportAuth, 0);
  await c.close();
});

test("server errors come back typed: flood_wait, channel_invalid, bot_method_invalid", async () => {
  tg.api = { getState: () => { throw { rpc: [400, "CHANNEL_INVALID"] }; } };
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  await assert.rejects(c.call(GET_STATE), (e) => e.code === "channel_invalid" && e.rpc === "CHANNEL_INVALID");
  tg.dc(2).once("getState", () => ({ error: [420, "FLOOD_WAIT_9"] }));
  await assert.rejects(c.call(GET_STATE), (e) => e.code === "flood_wait" && e.seconds === 9);
  await assert.rejects(c.call(new Writer().int(0x4423e6c5).done()), (e) => e.code === "bot_method_invalid");
  await c.close();
});

test("fromRpcError: the new codes", () => {
  assert.ok(CODES.includes("channel_invalid"));
  assert.ok(CODES.includes("bot_method_invalid"));
  assert.equal(fromRpcError({ code: 400, message: "CHANNEL_INVALID" }).code, "channel_invalid");
  assert.equal(fromRpcError({ code: 406, message: "CHANNEL_PRIVATE" }).code, "channel_invalid");
  assert.equal(fromRpcError({ code: 400, message: "BOT_METHOD_INVALID" }).code, "bot_method_invalid");
  assert.equal(fromRpcError({ code: 400, message: "PEER_ID_INVALID" }).code, "rpc_error");
});

// TelegramClient.call(body): one raw API call on the home DC for the discovery (updates.*, channels.getMessages,
// messages.getMessages), against the fake DC. It must not open a way around the 7a guarantees: no call before a login,
// and only the methods on the frozen allowlist in requests.js (no auth.*, no wrappers, no gzip_packed or container).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import * as S from "../testkit/tl-serializer.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { Writer, CTOR } from "../src/mtproto/tl.js";
import { fromRpcError, CODES } from "../src/mtproto/errors.js";
import * as R from "../src/mtproto/requests.js";
import { ALLOWED_CALLS } from "../src/mtproto/requests.js";
import { gzipSync } from "node:zlib";

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

test("call is an allowlist: only the five discovery methods go out; everything else is refused before sending", async () => {
  tg.api = {
    getState: () => S.state({ pts: 1, date: 1 }),
    getDifference: () => S.differenceEmpty({ date: 1 }),
    getChannelDifference: () => S.channelDifferenceEmpty({ pts: 1 }),
    channelsGetMessages: () => S.channelMessages({ pts: 1, count: 0 }),
    messagesGetMessages: () => S.messagesMessages({}),
  };
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  assert.deepEqual([...ALLOWED_CALLS].sort(), [0xedd4882a, 0x19c2f763, 0x03173d78, 0xad8c9a23, 0x63c66506].sort());
  assert.ok(Object.isFrozen(ALLOWED_CALLS));
  await c.call(R.getState());
  await c.call(R.getDifference({ pts: 1, date: 1, qts: -1 }));
  await c.call(R.getChannelDifference({ channelId: 1n, accessHash: 2n, pts: 1 }));
  await c.call(R.channelsGetMessages({ channelId: 1n, accessHash: 2n, ids: [1] }));
  await c.call(R.messagesGetMessages([1]));
  assert.deepEqual(tg.requests.map((r) => r.method), ["getState", "getDifference", "getChannelDifference", "channelsGetMessages", "messagesGetMessages"]);
  const before = { ...tg.dc(2).stats, layers: undefined };
  const gzipOf = (body) => Buffer.concat([S.raw.u32(0x3072cfa1), S.raw.tlBytes(gzipSync(Buffer.from(body)))]);
  const refused = {
    "auth.logOut": new Writer().int(0x3e72ba19).done(),
    invokeWithLayer: new Writer().int(CTOR.invokeWithLayer).int(198).raw(R.getState()).done(),
    initConnection: new Writer().int(CTOR.initConnection).int(0).done(),
    invokeAfterMsg: new Writer().int(0xcb9f372d).long(1n).raw(R.getState()).done(),
    invokeWithoutUpdates: new Writer().int(0xbf9459b7).raw(R.getState()).done(),
    "gzip_packed(auth.logOut)": new Uint8Array(gzipOf(new Writer().int(0x3e72ba19).done())),
    "gzip_packed(getState)": new Uint8Array(gzipOf(R.getState())),
    msg_container: new Writer().int(0x73f1f8dc).int(1).long(1n).int(1).int(4).raw(R.getState()).done(),
    "messages.deleteMessages": new Writer().int(0xe58e95d2).int(1).vectorInt([1]).done(),
    "channels.leaveChannel": new Writer().int(0xf836aa95).int(0xf35aec28).long(1n).long(2n).done(),
    importBotAuthorization: new Writer().int(CTOR.importBotAuthorization).int(0).done(),
    "messages.getHistory": new Writer().int(0x4423e6c5).done(),
  };
  for (const [name, body] of Object.entries(refused)) {
    await assert.rejects(c.call(body), (e) => e.code === "invalid_request" && /not allowed/.test(e.message), name);
  }
  assert.equal(tg.requests.length, 5, "nothing else reached the server");
  assert.equal(tg.dc(2).stats.botLogins, before.botLogins);
  await c.close();
});

test("server errors come back typed: flood_wait, channel_invalid, bot_method_invalid", async () => {
  tg.api = { getState: () => { throw { rpc: [400, "CHANNEL_INVALID"] }; } };
  const c = await newClient().connect(2);
  await c.botLogin(CREDS);
  await assert.rejects(c.call(GET_STATE), (e) => e.code === "channel_invalid" && e.rpc === "CHANNEL_INVALID");
  tg.dc(2).once("getState", () => ({ error: [420, "FLOOD_WAIT_9"] }));
  await assert.rejects(c.call(GET_STATE), (e) => e.code === "flood_wait" && e.seconds === 9);
  tg.api.getState = () => { throw { rpc: [400, "BOT_METHOD_INVALID"] }; };
  await assert.rejects(c.call(GET_STATE), (e) => e.code === "bot_method_invalid");
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

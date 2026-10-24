// The schema-driven TL reader (src/mtproto/schema/reader.js) against bytes written by the independent test-side
// serializer (testkit/tl-serializer.mjs) and, when present on this machine, the raw answers captured live from
// Telegram (never copied into the repo; the tests skip without them and print nothing of their contents).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { installKino } from "../testkit/kino.mjs";
import * as S from "../testkit/tl-serializer.mjs";
import { decode, createDecoder, schemaStats } from "../src/mtproto/schema/reader.js";

installKino();

const FIXTURES = "/Users/cristian/telegram-mtproto-spike/fixtures";
const fixture = (name) => (existsSync(`${FIXTURES}/${name}.bin`) ? new Uint8Array(readFileSync(`${FIXTURES}/${name}.bin`)) : null);
const TL_SOURCE = "/Users/cristian/telegram-mtproto-spike/node_modules/telegram/tl/apiTl.js";
const u8 = (b) => new Uint8Array(b);

const CH = 1987654321012n;
const VIDEO_DOC = {
  id: 5577006791947779410n, accessHash: -8674665223082153551n, fileReference: Buffer.from("0102030405060708090a0b0c0d0e0f1011121314", "hex"),
  mime: "video/mp4", size: 734003200, dcId: 4, video: { duration: 5025.5, w: 1920, h: 1080 }, fileName: "The Movie (2024).mp4",
};

test("updates.state", () => {
  const o = decode(u8(S.state({ pts: 17, qts: 0, date: 1729700000, seq: 1, unread: 3 })));
  assert.deepEqual(o, { _: "updates.state", pts: 17, qts: 0, date: 1729700000, seq: 1, unread_count: 3 });
});

test("a message with a video document: flags, long ids as BigInt, bytes as Uint8Array, attributes", () => {
  const msg = S.messageWithDocument({ id: 42, peer: S.peerChannel(CH), date: 1729700100, text: "Line one\nline two", doc: { ...VIDEO_DOC, thumbs: true } });
  const o = decode(u8(msg));
  assert.equal(o._, "message");
  assert.equal(o.id, 42);
  assert.equal(o.post, true);
  assert.equal(o.out, undefined);
  assert.deepEqual(o.peer_id, { _: "peerChannel", channel_id: CH });
  assert.equal(o.message, "Line one\nline two");
  assert.equal(o.media._, "messageMediaDocument");
  assert.equal(o.media.video, true);
  const d = o.media.document;
  assert.equal(d._, "document");
  assert.equal(d.id, VIDEO_DOC.id);
  assert.equal(d.access_hash, VIDEO_DOC.accessHash);
  assert.ok(d.file_reference instanceof Uint8Array);
  assert.equal(Buffer.from(d.file_reference).toString("hex"), VIDEO_DOC.fileReference.toString("hex"));
  assert.equal(d.mime_type, "video/mp4");
  assert.equal(d.size, 734003200n);
  assert.equal(d.dc_id, 4);
  assert.deepEqual(d.thumbs, [{ _: "photoSizeEmpty", type: "s" }]);
  assert.deepEqual(d.attributes[0], { _: "documentAttributeVideo", flags: 2, supports_streaming: true, duration: 5025.5, w: 1920, h: 1080 });
  assert.deepEqual(d.attributes[1], { _: "documentAttributeFilename", file_name: "The Movie (2024).mp4" });
});

test("message fields after the media are read too (entities, views/forwards, edit_date), so vectors can be walked", () => {
  const m1 = S.message({ id: 1, peer: S.peerUser(10n), date: 5, text: "hi", entities: [[0, 2]], views: 9, editDate: 77, out: true, fromId: S.peerUser(11n) });
  const m2 = S.messageEmpty(2, S.peerUser(10n));
  const o = decode(u8(S.messagesMessages({ messages: [m1, m2], users: [S.user({ id: 10n, firstName: "Ana", bot: false, status: true })] })));
  assert.equal(o._, "messages.messages");
  assert.equal(o.messages.length, 2);
  assert.deepEqual(o.messages[0].entities, [{ _: "messageEntityBold", offset: 0, length: 2 }]);
  assert.equal(o.messages[0].views, 9);
  assert.equal(o.messages[0].forwards, 0);
  assert.equal(o.messages[0].edit_date, 77);
  assert.equal(o.messages[0].out, true);
  assert.deepEqual(o.messages[0].from_id, { _: "peerUser", user_id: 11n });
  assert.deepEqual(o.messages[1], { _: "messageEmpty", flags: 1, id: 2, peer_id: { _: "peerUser", user_id: 10n } });
  assert.equal(o.users[0].first_name, "Ana");
  assert.deepEqual(o.users[0].status, { _: "userStatusEmpty" });
});

test("channels: access_hash when present, none on a min channel, channelForbidden", () => {
  const o = decode(u8(S.messagesMessages({ chats: [
    S.channel({ id: CH, accessHash: -123456789012345n, title: "Películas", username: "pelis", adminRights: true }),
    S.channel({ id: 5n, title: "Min", min: true }),
    S.channelForbidden({ id: 6n, accessHash: 7n, title: "Gone" }),
  ] })));
  const [a, b, c] = o.chats;
  assert.equal(a._, "channel");
  assert.equal(a.id, CH);
  assert.equal(a.access_hash, -123456789012345n);
  assert.equal(a.title, "Películas");
  assert.equal(a.username, "pelis");
  assert.equal(a.broadcast, true);
  assert.deepEqual(a.photo, { _: "chatPhotoEmpty" });
  assert.deepEqual(a.admin_rights, { _: "chatAdminRights", flags: 3, change_info: true, post_messages: true });
  assert.equal(b.min, true);
  assert.equal("access_hash" in b, false);
  assert.deepEqual(c, { _: "channelForbidden", flags: 32, broadcast: true, id: 6n, access_hash: 7n, title: "Gone" });
});

test("updateNewChannelMessage, updateChannel, updateChannelTooLong (with and without pts)", () => {
  const msg = S.messageWithDocument({ id: 3, peer: S.peerChannel(CH), date: 9, doc: VIDEO_DOC });
  const o = decode(u8(S.difference({
    otherUpdates: [S.updateNewChannelMessage(msg, 4, 1), S.updateChannel(CH), S.updateChannelTooLong(CH, 12), S.updateChannelTooLong(CH)],
    state: S.state({ pts: 2, date: 10, seq: 1 }),
  })));
  const [u1, u2, u3, u4] = o.other_updates;
  assert.equal(u1._, "updateNewChannelMessage");
  assert.equal(u1.message.id, 3);
  assert.equal(u1.pts, 4);
  assert.equal(u1.pts_count, 1);
  assert.deepEqual(u2, { _: "updateChannel", channel_id: CH });
  assert.deepEqual(u3, { _: "updateChannelTooLong", flags: 1, channel_id: CH, pts: 12 });
  assert.deepEqual(u4, { _: "updateChannelTooLong", flags: 0, channel_id: CH });
});

test("updates.Difference: empty, difference, slice, tooLong", () => {
  assert.deepEqual(decode(u8(S.differenceEmpty({ date: 100, seq: 2 }))), { _: "updates.differenceEmpty", date: 100, seq: 2 });
  assert.deepEqual(decode(u8(S.differenceTooLong(99))), { _: "updates.differenceTooLong", pts: 99 });
  const msg = S.message({ id: 8, peer: S.peerUser(10n), date: 5, text: "x" });
  const d = decode(u8(S.difference({ newMessages: [msg], users: [S.user({ id: 10n, firstName: "Ana" })], state: S.state({ pts: 5, date: 6 }) })));
  assert.equal(d._, "updates.difference");
  assert.equal(d.new_messages[0].id, 8);
  assert.deepEqual(d.new_encrypted_messages, []);
  assert.equal(d.state.pts, 5);
  const s = decode(u8(S.differenceSlice({ newMessages: [msg], state: S.state({ pts: 3, date: 4 }) })));
  assert.equal(s._, "updates.differenceSlice");
  assert.equal(s.intermediate_state.pts, 3);
});

test("updates.ChannelDifference: empty, difference, tooLong with its dialog", () => {
  assert.deepEqual(decode(u8(S.channelDifferenceEmpty({ pts: 30, timeout: 5 }))), { _: "updates.channelDifferenceEmpty", flags: 3, final: true, pts: 30, timeout: 5 });
  const msg = S.messageWithDocument({ id: 3, peer: S.peerChannel(CH), date: 9, doc: VIDEO_DOC });
  const d = decode(u8(S.channelDifference({ final: false, pts: 7, newMessages: [msg], otherUpdates: [S.updateDeleteChannelMessages(CH, [1, 2], 7)] })));
  assert.equal(d.final, undefined);
  assert.equal(d.pts, 7);
  assert.equal(d.new_messages[0].media.document.mime_type, "video/mp4");
  assert.deepEqual(d.other_updates[0], { _: "updateDeleteChannelMessages", channel_id: CH, messages: [1, 2], pts: 7, pts_count: 2 });
  const t = decode(u8(S.channelDifferenceTooLong({ dialog: S.dialog({ peer: S.peerChannel(CH), topMessage: 500, pts: 900 }), messages: [msg] })));
  assert.equal(t._, "updates.channelDifferenceTooLong");
  assert.equal(t.dialog._, "dialog");
  assert.equal(t.dialog.top_message, 500);
  assert.equal(t.dialog.pts, 900);
  assert.deepEqual(t.dialog.notify_settings, { _: "peerNotifySettings", flags: 0 });
  assert.equal(t.messages[0].id, 3);
});

test("messages.Messages family, messageService, a non-video document", () => {
  const pdf = S.messageWithDocument({ id: 4, peer: S.peerChannel(CH), date: 9, doc: { id: 1n, accessHash: 2n, fileReference: Buffer.from([1]), mime: "application/pdf", size: 10, fileName: "a.pdf" } });
  const svc = S.messageServiceChannelCreate({ id: 1, peer: S.peerChannel(CH), date: 8, title: "Pelis" });
  const o = decode(u8(S.channelMessages({ pts: 12, count: 2, messages: [svc, pdf] })));
  assert.equal(o._, "messages.channelMessages");
  assert.equal(o.pts, 12);
  assert.deepEqual(o.messages[0].action, { _: "messageActionChannelCreate", title: "Pelis" });
  assert.equal(o.messages[1].media.document.mime_type, "application/pdf");
  assert.deepEqual(o.topics, []);
  assert.equal(decode(u8(S.messagesSlice({ count: 50 }))).count, 50);
  assert.deepEqual(decode(u8(S.messagesNotModified(3))), { _: "messages.messagesNotModified", count: 3 });
});

test("an unknown constructor inside a stream throws `protocol` naming its id, never a silent mis-parse", () => {
  const bogus = Buffer.concat([S.raw.u32(0xdeadbeef), S.raw.i32(1)]);
  const bytes = u8(S.difference({ otherUpdates: [S.updateChannel(CH), bogus], state: S.state({ pts: 1, date: 1 }) }));
  assert.throws(() => decode(bytes), (e) => e.code === "protocol" && e.ctor === 0xdeadbeef && /0xdeadbeef/.test(e.message) && /Update/.test(e.message));
  // A known constructor of the wrong type (a Peer where an Update belongs) is refused as well.
  const wrong = u8(S.difference({ otherUpdates: [S.peerUser(1n)], state: S.state({ pts: 1, date: 1 }) }));
  assert.throws(() => decode(wrong), (e) => e.code === "protocol" && /peerUser/.test(e.message));
  // Truncated input and trailing bytes.
  const full = u8(S.state({ pts: 1, date: 1 }));
  assert.throws(() => decode(full.subarray(0, 10)), (e) => e.code === "protocol");
  assert.throws(() => decode(u8(Buffer.concat([full, Buffer.alloc(4)]))), (e) => e.code === "protocol" && /trailing/.test(e.message));
  // A top-level type check.
  assert.throws(() => decode(full, { expect: "updates.Difference" }), (e) => e.code === "protocol" && /updates\.Difference/.test(e.message));
  assert.equal(decode(full, { expect: "updates.State" }).pts, 1);
});

test("skip: constructors or types the caller does not need are walked without being built", () => {
  const msg = S.messageWithDocument({ id: 3, peer: S.peerChannel(CH), date: 9, doc: VIDEO_DOC });
  const bytes = u8(S.difference({
    otherUpdates: [S.updateUserStatus(10n), S.updateNewChannelMessage(msg, 4), S.updateUserStatus(11n)],
    users: [S.user({ id: 10n, firstName: "Ana" })],
    state: S.state({ pts: 2, date: 10 }),
  }));
  const seen = [];
  const o = decode(bytes, { skip: (name, type) => { seen.push(type); return name === "updateUserStatus" || type === "User"; } });
  assert.deepEqual(o.other_updates.map((u) => u._), ["updateUserStatus", "updateNewChannelMessage", "updateUserStatus"]);
  assert.equal(o.other_updates[0].skipped, true);
  assert.equal(o.other_updates[1].message.media.document.id, VIDEO_DOC.id);
  assert.deepEqual(o.users, [{ _: "user", skipped: true }]);
  assert.equal(o.state.pts, 2);
  assert.ok(seen.includes("Update"));
});

test("a top-level gzip_packed is unpacked; a top-level rpc_error is reported", () => {
  const inner = S.state({ pts: 3, date: 4 });
  const packed = Buffer.concat([S.raw.u32(0x3072cfa1), S.raw.tlBytes(gzipSync(inner))]);
  assert.equal(decode(u8(packed)).pts, 3);
  assert.deepEqual(decode(u8(S.rpcError(400, "CHANNEL_INVALID"))), { _: "rpc_error", error_code: 400, error_message: "CHANNEL_INVALID" });
});

test("every TL shape the reader interprets, on a synthetic schema: bare types, bare vectors, flags2, int128/int256, double, Bool", () => {
  const dec = createDecoder({
    types: ["T", "Pair", "Opt"],
    ctors: [
      "a1 pair 1 x:i y:l",
      "b2 thing 0 flags:# on:flags.0?t flags2:# far:flags2.3?s big:q huge:Q f:d ok:B p:%pair ps:v%pair ints:Vi bs:Vb opt:flags.1?2",
      "c3 optA 2 n:i",
    ].join("\n"),
  });
  const w = S.raw;
  const pair = (x, y) => Buffer.concat([w.i32(x), w.i64(y)]); // bare: no constructor id
  const bytes = Buffer.concat([
    w.u32(0xb2), w.u32(0b11), w.u32(0b1000), w.str("far"), Buffer.alloc(16, 1), Buffer.alloc(32, 2), w.f64(1.5), w.u32(0x997275b5),
    pair(1, 2n), w.i32(2), pair(3, 4n), pair(5, -6n), // a bare vector: no vector id, only the count
    w.vec([w.i32(-1), w.i32(7)]), w.vec([w.tlBytes(Buffer.alloc(300, 9))]), w.u32(0xc3), w.i32(5),
  ]);
  const o = dec.decode(u8(bytes));
  assert.equal(o._, "thing");
  assert.equal(o.on, true);
  assert.equal(o.far, "far");
  assert.equal(o.big.length, 16);
  assert.equal(o.huge.length, 32);
  assert.equal(o.f, 1.5);
  assert.equal(o.ok, true);
  assert.deepEqual(o.p, { _: "pair", x: 1, y: 2n });
  assert.deepEqual(o.ps, [{ _: "pair", x: 3, y: 4n }, { _: "pair", x: 5, y: -6n }]);
  assert.deepEqual(o.ints, [-1, 7]);
  assert.equal(o.bs[0].length, 300);
  assert.deepEqual(o.opt, { _: "optA", n: 5 });
  // Bool must be boolTrue/boolFalse.
  const badBool = Buffer.from(bytes); badBool.writeUInt32LE(0x12345678, 4 + 4 + 4 + 4 + 16 + 32 + 8);
  assert.throws(() => dec.decode(u8(badBool)), (e) => e.code === "protocol" && /Bool/.test(e.message));
});

test("the generated schema: size, roots, and every Update constructor of layer 198 is parsable", () => {
  const st = schemaStats();
  assert.equal(st.layer, 198);
  assert.ok(st.constructors > 600, String(st.constructors));
  for (const t of ["updates.State", "updates.Difference", "updates.ChannelDifference", "messages.Messages", "Message", "MessageMedia", "Document", "DocumentAttribute", "Chat", "User", "Update", "Updates", "Dialog"]) {
    assert.ok(st.typeNames.includes(t), t);
  }
  if (!existsSync(TL_SOURCE)) return;
  const text = createRequire(import.meta.url)(TL_SOURCE);
  const updates = text.split("\n").filter((l) => / = Update;$/.test(l)).map((l) => parseInt(l.split(" ")[0].split("#")[1], 16) >>> 0);
  assert.ok(updates.length > 100);
  for (const id of updates) assert.ok(st.has(id), id.toString(16));
});

test("generated.js is what the generator makes from the layer-198 source", async (t) => {
  if (!existsSync(TL_SOURCE)) return t.skip("TL source not on this machine");
  const { generate } = await import("../scripts/gen-schema.mjs");
  const text = createRequire(import.meta.url)(TL_SOURCE);
  const current = readFileSync(new URL("../src/mtproto/schema/generated.js", import.meta.url), "utf8");
  assert.equal(generate(text).source, current);
});

// ---- the raw answers captured live from Telegram (skip when missing; nothing of their contents is printed) ----

test("captured updates.getState decodes", (t) => {
  const b = fixture("getState");
  if (!b) return t.skip("fixture missing");
  const o = decode(b, { expect: "updates.State" });
  assert.equal(o._, "updates.state");
  for (const k of ["pts", "qts", "date", "seq", "unread_count"]) assert.equal(typeof o[k], "number", k);
});

test("captured updates.getDifference(pts=1) decodes: 4 updateNewChannelMessage + 1 updateChannel, channels with access_hash", (t) => {
  const b = fixture("getDifference-pts1");
  if (!b) return t.skip("fixture missing");
  const o = decode(b, { expect: "updates.Difference" });
  assert.equal(o._, "updates.difference");
  assert.equal(o.new_messages.length, 0);
  const names = o.other_updates.map((u) => u._);
  assert.equal(names.filter((n) => n === "updateNewChannelMessage").length, 4);
  assert.equal(names.filter((n) => n === "updateChannel").length, 1);
  const channels = o.chats.filter((c) => c._ === "channel");
  assert.ok(channels.length >= 1);
  assert.ok(channels.some((c) => typeof c.access_hash === "bigint"));
  assert.equal(o.state._, "updates.state");
});

test("captured updates.getChannelDifference(pts=1) decodes: 4 messages, one with a video/mp4 document", (t) => {
  const b = fixture("getChannelDifference-pts1");
  if (!b) return t.skip("fixture missing");
  const o = decode(b, { expect: "updates.ChannelDifference" });
  assert.equal(o._, "updates.channelDifference");
  assert.equal(o.new_messages.length, 4);
  const docs = o.new_messages.filter((m) => m.media && m.media._ === "messageMediaDocument");
  assert.equal(docs.length, 1);
  assert.equal(docs[0].media.document.mime_type, "video/mp4");
  assert.ok(docs[0].media.document.file_reference instanceof Uint8Array);
});

test("captured channels.getMessages(1..10) decodes", (t) => {
  const b = fixture("channels-getMessages-1-10");
  if (!b) return t.skip("fixture missing");
  const o = decode(b, { expect: "messages.Messages" });
  assert.equal(o._, "messages.channelMessages");
  assert.equal(o.messages.length, 10);
  assert.ok(o.messages.some((m) => m._ === "messageEmpty"));
  assert.ok(o.messages.some((m) => m._ === "message" && m.media && m.media.document && m.media.document.mime_type === "video/mp4"));
});

test("nesting depth is bounded: 64 levels decode, a deeper answer is `protocol` (no stack blow-up)", () => {
  const dec = createDecoder({ types: ["Node"], ctors: "a1 node 0 flags:# next:flags.0?0" });
  const nested = (n) => {
    const parts = [];
    for (let i = 0; i < n; i++) parts.push(S.raw.u32(0xa1), S.raw.u32(i < n - 1 ? 1 : 0));
    return u8(Buffer.concat(parts));
  };
  let o = dec.decode(nested(64));
  let depth = 1;
  while (o.next) { o = o.next; depth++; }
  assert.equal(depth, 64);
  assert.throws(() => dec.decode(nested(65)), (e) => e.code === "protocol" && /deep/.test(e.message));
  assert.throws(() => dec.decode(nested(100000)), (e) => e.code === "protocol" && /deep/.test(e.message));
  // The same bound in skip (walk) mode, and the decoder is usable afterwards.
  assert.throws(() => dec.decode(nested(65), { skip: () => true }), (e) => e.code === "protocol" && /deep/.test(e.message));
  assert.equal(dec.decode(nested(3))._, "node");
});

test("with `expect`, a top-level rpc_error is thrown as its typed error", () => {
  const err = u8(S.rpcError(400, "CHANNEL_INVALID"));
  assert.throws(() => decode(err, { expect: "updates.State" }), (e) => e.code === "channel_invalid" && e.rpc === "CHANNEL_INVALID");
  assert.throws(() => decode(u8(S.rpcError(420, "FLOOD_WAIT_3")), { expect: "updates.Difference" }), (e) => e.code === "flood_wait" && e.seconds === 3);
  assert.equal(decode(err)._, "rpc_error");
});

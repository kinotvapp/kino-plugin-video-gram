// Known-answer tests: the bytes the verified-live spike's TL writer (W in telegram-mtproto-spike/mtproto.mjs) produced
// for the same inputs, stored in test/vectors/spike-tl.json.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { installKino } from "../testkit/kino.mjs";
import { toHex, fromHex } from "../src/mtproto/bytes.js";
import * as TL from "../src/mtproto/tl.js";

installKino();
const V = JSON.parse(readFileSync(new URL("./vectors/spike-tl.json", import.meta.url), "utf8"));
const seq = (n, m = 7) => Uint8Array.from({ length: n }, (_, i) => (i * m + 3) & 255);

test("req_pq_multi matches the spike", () => {
  assert.equal(toHex(TL.reqPqMulti(seq(16))), V.reqPq);
});

test("bytes use the 254-length rule and pad to 4", () => {
  for (const n of [0, 1, 3, 253, 254, 300]) assert.equal(toHex(new TL.Writer().bytes(seq(n)).done()), V["bytes" + n], "bytes " + n);
  const big = new TL.Writer().bytes(seq(70000)).done();
  assert.equal(createHash("sha256").update(big).digest("hex"), V.bytes70000_sha256);
  for (const n of [0, 1, 3, 253, 254, 300, 70000]) {
    const r = new TL.Reader(new TL.Writer().bytes(seq(n)).int(0x01020304).done());
    assert.deepEqual(r.bytes(), seq(n));
    assert.equal(r.int(), 0x01020304, "padding consumed for " + n);
    assert.ok(r.atEnd());
  }
});

test("longs from BigInt, number and decimal string", () => {
  const w = new TL.Writer().long(-3414540481677951611n).long(0).long("9223372036854775807").long(-1);
  assert.equal(toHex(w.done()), V.longs);
  const r = new TL.Reader(fromHex(V.longs));
  assert.equal(r.long(), -3414540481677951611n);
  assert.equal(r.long(), 0n);
  assert.equal(r.long(), 2n ** 63n - 1n);
  assert.equal(r.long(), -1n);
});

test("invokeWithLayer(198, initConnection(importBotAuthorization)) matches the spike", () => {
  const query = TL.importBotAuthorization({ apiId: 12345, apiHash: "abcdef0123456789abcdef0123456789", botToken: "123456:FAKE-token" });
  const wrapped = TL.invokeWithLayer(198, TL.initConnection({ apiId: 12345, deviceModel: "spike", systemVersion: "macOS", appVersion: "0.1", systemLangCode: "en", langPack: "", langCode: "en" }, query));
  assert.equal(toHex(wrapped), V.loginWrapped);
});

test("upload.getFile(InputDocumentFileLocation) matches the spike", () => {
  const loc = TL.inputDocumentFileLocation({ id: 5577006791947779410n, accessHash: -8674665223082153551n, fileReference: seq(30) });
  assert.equal(toHex(TL.uploadGetFile(loc, 3 * 1048576, 1048576)), V.getFile);
});

test("strings are UTF-8, vectors of long, int128/int256, bool and double read back", () => {
  const w = new TL.Writer().string("ñandú ✓").vectorLong([1n, -2n]).int128(seq(16)).int256(seq(32, 3)).bool(true).bool(false).double(1.5);
  const r = new TL.Reader(w.done());
  assert.equal(r.string(), "ñandú ✓");
  assert.deepEqual(r.vectorLong(), [1n, -2n]);
  assert.deepEqual(r.int128(), seq(16));
  assert.deepEqual(r.int256(), seq(32, 3));
  assert.equal(r.bool(), true);
  assert.equal(r.bool(), false);
  assert.equal(r.double(), 1.5);
  assert.throws(() => r.int(), /past the end/);
});

test("rpc_error and upload.file parse; an unknown constructor is returned raw, not thrown", () => {
  const err = TL.parseRpcError(new TL.Reader(new TL.Writer().int(TL.CTOR.rpcError).int(420).string("FLOOD_WAIT_7").done()));
  assert.deepEqual(err, { code: 420, message: "FLOOD_WAIT_7" });
  const file = TL.parseUploadFile(new TL.Writer().int(TL.CTOR.uploadFile).int(0xb3cea0e4).int(1700000000).bytes(seq(10)).done());
  assert.equal(file.ctor, TL.CTOR.uploadFile);
  assert.deepEqual(file.bytes, seq(10));
  const unknown = TL.parseUploadFile(new TL.Writer().int(0x12345678).int(1).done());
  assert.equal(unknown.ctor, 0x12345678);
  assert.equal(unknown.raw.length, 8);
});

test("auth.authorization gives the user id; signUpRequired and unknown ones do not crash", () => {
  const user = new TL.Writer().int(TL.CTOR.user).int(1 << 14).int(0).long(777000123n).done();
  const auth = TL.parseAuthorization(new TL.Writer().int(TL.CTOR.authAuthorization).int(1).int(5).raw(user).done());
  assert.equal(auth.ctor, TL.CTOR.authAuthorization);
  assert.equal(auth.userId, 777000123n);
  assert.equal(auth.tmpSessions, 5);
  assert.equal(TL.parseAuthorization(new TL.Writer().int(TL.CTOR.authAuthorizationSignUpRequired).int(0).done()).signUpRequired, true);
  assert.equal(TL.parseAuthorization(new TL.Writer().int(0x0badf00d).done()).ctor, 0x0badf00d);
});

function documentBytes({ thumbs = true, videoThumbs = true } = {}) {
  const w = new TL.Writer().int(TL.CTOR.document).int((thumbs ? 1 : 0) | (videoThumbs ? 2 : 0))
    .long(111n).long(-222n).bytes(seq(20)).int(1700000001).string("video/mp4").long(17_800_000n);
  if (thumbs) {
    w.int(TL.CTOR.vector).int(3)
      .int(0xe0b0bc2e).string("i").bytes(seq(5))                                // photoStrippedSize
      .int(0x75c78e60).string("m").int(320).int(180).int(9000)                 // photoSize
      .int(0xfa3efb95).string("y").int(1280).int(720).vectorInt([1, 2, 3]);    // photoSizeProgressive
  }
  if (videoThumbs) w.int(TL.CTOR.vector).int(1).int(0xde33b094).int(1).string("v").int(1).int(2).int(3).double(0.5);
  w.int(2)
    .int(TL.CTOR.vector).int(3)
    .int(0x43c57c48).int(2 | 4 | 32).double(123.5).int(1920).int(1080).int(65536).string("avc")  // video, streaming
    .int(0x15590068).string("Mi video.mp4")                                                    // filename
    .int(0x9852f9c6).int(1).int(10).string("song");                                           // audio with title
  return w.done();
}

test("a Document parses with its thumbs, video thumbs and attributes", () => {
  const d = TL.parseDocument(new TL.Reader(documentBytes()));
  assert.equal(d.id, 111n);
  assert.equal(d.accessHash, -222n);
  assert.deepEqual(d.fileReference, seq(20));
  assert.equal(d.mimeType, "video/mp4");
  assert.equal(d.size, 17_800_000);
  assert.equal(d.dcId, 2);
  assert.equal(d.fileName, "Mi video.mp4");
  assert.deepEqual(d.video, { duration: 123.5, w: 1920, h: 1080, supportsStreaming: true, roundMessage: false });
  assert.equal(d.audio.title, "song");
  const plain = TL.parseDocument(new TL.Reader(documentBytes({ thumbs: false, videoThumbs: false })));
  assert.equal(plain.fileName, "Mi video.mp4");
});

test("a Document with an unknown attribute stops cleanly with what it read", () => {
  const w = new TL.Writer().int(TL.CTOR.document).int(0).long(1n).long(2n).bytes(seq(4)).int(0).string("video/mp4").long(10n).int(4)
    .int(TL.CTOR.vector).int(2).int(0x15590068).string("a.mp4").int(0x7777aaaa).int(0);
  const d = TL.parseDocument(new TL.Reader(w.done()));
  assert.equal(d.fileName, "a.mp4");
  assert.equal(d.incomplete, true);
});

test("messageMediaDocument and the head of a message give the document", () => {
  const media = new TL.Writer().int(TL.CTOR.messageMediaDocument).int(1 | 64).raw(documentBytes()).done();
  const m = TL.parseMessageMedia(new TL.Reader(media));
  assert.equal(m.document.fileName, "Mi video.mp4");
  assert.equal(m.video, true);
  const msg = new TL.Writer().int(TL.CTOR.message).int((1 << 9) | (1 << 8) | (1 << 2)).int(0).int(42)
    .int(TL.CTOR.peerUser).long(9n)                     // from_id
    .int(TL.CTOR.peerChannel).long(1001n)               // peer_id
    .int(TL.CTOR.messageFwdHeader).int(1).int(TL.CTOR.peerChannel).long(55n).int(1690000000) // fwd_from
    .int(1700000002).string("hola").raw(media).done();
  const parsed = TL.parseMessage(new TL.Reader(msg));
  assert.equal(parsed.id, 42);
  assert.deepEqual(parsed.peer, { kind: "channel", id: 1001n });
  assert.equal(parsed.date, 1700000002);
  assert.equal(parsed.text, "hola");
  assert.equal(parsed.media.document.size, 17_800_000);
  const text = TL.parseMessage(new TL.Reader(new TL.Writer().int(TL.CTOR.message).int(0).int(0).int(7).int(TL.CTOR.peerUser).long(3n).int(1).string("solo texto").done()));
  assert.equal(text.media, undefined);
  assert.equal(TL.parseMessage(new TL.Reader(new TL.Writer().int(0x0badf00d).done())).ctor, 0x0badf00d);
});

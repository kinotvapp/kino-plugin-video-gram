// The download hot path without JS loops over the chunk after the socket: the session hands the rpc result as hex,
// getFile({ hex: true }) slices the file bytes out of that hex, and hex becomes base64 with two native AES-CTR passes
// (CTR twice with the same key and counter is the identity). Plus the typed codes the shell needs at login.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { fromRpcError } from "../src/mtproto/errors.js";
import { parseUploadFile, parseUploadFileHex, Writer, CTOR } from "../src/mtproto/tl.js";
import { toHex } from "../src/mtproto/bytes.js";
import { hexToBase64Native } from "../src/shell/b64.js";

const kino = installKino();
const CREDS = { apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };

test("login errors: ACCESS_TOKEN_* is token_invalid, API_ID_* is api_id_invalid (before the 401 rule)", () => {
  assert.equal(fromRpcError({ code: 400, message: "ACCESS_TOKEN_INVALID" }).code, "token_invalid");
  assert.equal(fromRpcError({ code: 401, message: "ACCESS_TOKEN_INVALID" }).code, "token_invalid");
  assert.equal(fromRpcError({ code: 400, message: "ACCESS_TOKEN_EXPIRED" }).code, "token_invalid");
  assert.equal(fromRpcError({ code: 400, message: "API_ID_INVALID" }).code, "api_id_invalid");
  assert.equal(fromRpcError({ code: 400, message: "API_ID_PUBLISHED_FLOOD" }).code, "api_id_invalid");
  assert.equal(fromRpcError({ code: 401, message: "AUTH_KEY_UNREGISTERED" }).code, "auth_key_unregistered");
});

test("parseUploadFileHex finds the same bytes as parseUploadFile (short and long TL bytes) and passes other answers", () => {
  for (const n of [0, 1, 253, 254, 255, 4096, 70000]) {
    const data = new Uint8Array(n).map((_, i) => (i * 13 + 5) & 255);
    const u8 = new Writer().int(CTOR.uploadFile).int(0xb3cea0e4).int(1700000000).bytes(data).done();
    const viaBytes = parseUploadFile(u8);
    const viaHex = parseUploadFileHex(toHex(u8));
    assert.equal(viaHex.ctor, CTOR.uploadFile);
    assert.equal(viaHex.mtime, 1700000000);
    assert.equal(viaHex.bytesHex, toHex(viaBytes.bytes), "length " + n);
  }
  const redirect = new Writer().int(CTOR.uploadFileCdnRedirect).int(1).done();
  assert.equal(parseUploadFileHex(toHex(redirect)).ctor, CTOR.uploadFileCdnRedirect);
  assert.throws(() => parseUploadFileHex(toHex(new Writer().int(CTOR.uploadFile).int(1).int(2).int(0x10fe).done())), { code: "protocol" });
});

let tg;
beforeEach(() => { tg = new FakeTelegram().install(); });
afterEach(() => tg.restore());

test("getFile with { hex: true }: the exact bytes as hex, first call in a container, a gzipped answer, the short last chunk", async () => {
  const data = Buffer.alloc(2 * 1048576 + 5000);
  for (let i = 0; i < data.length; i++) data[i] = (i * 31 + 7) & 255;
  const doc = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
  tg.addFile({ ...doc, dc: 2, data });
  const c = new TelegramClient({ apiId: 1, publicKeys: fakeRsa().publicKeys, timeoutMs: 5000, store: memoryStore() });
  await c.connect(2);
  await c.botLogin(CREDS);
  const first = await c.getFile({ ...doc, dcId: 2 }, 0, 1048576, { hex: true });
  assert.equal(typeof first, "string");
  assert.equal(first, data.subarray(0, 1048576).toString("hex"));
  tg.dc(2).gzipResults = true;
  tg.dc(2).gzipFiles = true;
  const gz = await c.getFile({ ...doc, dcId: 2 }, 1048576, 1048576, { hex: true });
  assert.equal(gz, data.subarray(1048576, 2 * 1048576).toString("hex"));
  tg.dc(2).gzipFiles = false;
  const last = await c.getFile({ ...doc, dcId: 2 }, 2 * 1048576, 1048576, { hex: true });
  assert.equal(last, data.subarray(2 * 1048576).toString("hex"));
  const bytes = await c.getFile({ ...doc, dcId: 2 }, 0, 4096);
  assert.ok(bytes instanceof Uint8Array, "without the option the answer stays a Uint8Array");
  assert.equal(Buffer.from(bytes).toString("hex"), data.subarray(0, 4096).toString("hex"));
  await c.close();
});

test("getFile with { hex: true } across FILE_MIGRATE and a whole gzip_packed message", async () => {
  const data = Buffer.alloc(300000, 9);
  const doc = { id: 77n, accessHash: 78n, fileReference: Uint8Array.from([9]) };
  tg.addFile({ ...doc, dc: 4, data });
  tg.dc(4).gzipMessages = true;
  const c = new TelegramClient({ apiId: 1, publicKeys: fakeRsa().publicKeys, timeoutMs: 5000, store: memoryStore() });
  await c.connect(2);
  await c.botLogin(CREDS);
  assert.equal(await c.getFile({ ...doc, dcId: 2 }, 0, 524288, { hex: true }), data.toString("hex"));
  await c.close();
});

test("hexToBase64Native: exact base64 for every length, through two native AES-CTR calls and no JS pass", () => {
  let calls = 0;
  // An older Kino, without apiVersion 13's convert: the two-CTR path (device8.test.mjs covers convert).
  const { convert: _noConvert, ...older } = kino.crypto;
  const counting = Object.freeze({ ...kino, crypto: Object.freeze({ ...older, encrypt: (...a) => { calls++; return kino.crypto.encrypt(...a); } }) });
  const saved = globalThis.kino;
  globalThis.kino = counting;
  try {
    for (const n of [0, 1, 2, 3, 4, 5, 16, 17, 4095, 4096, 1048576, 1048576 - 1]) {
      const buf = Buffer.alloc(n);
      for (let i = 0; i < n; i++) buf[i] = (i * 7 + n) & 255;
      calls = 0;
      assert.equal(hexToBase64Native(buf.toString("hex")), buf.toString("base64"), "length " + n);
      assert.equal(calls, n === 0 ? 0 : 2);
    }
  } finally {
    globalThis.kino = saved;
  }
});

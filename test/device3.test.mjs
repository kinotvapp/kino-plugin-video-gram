// Device round 3: one request per chunk, answers demultiplexed by msg id in any order and framing, a chunk read ahead
// that fails never fails the read, recovery from a broken session by reconnecting with the stored key, and errors
// logged with their detail (never `undefined`).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device } from "../testkit/plugin-harness.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { describeError } from "../src/mtproto/errors.js";

installKino();
const MiB = 1048576;
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const DOC = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
const SIZE = 6 * MiB + 1000;
let tg, data;
beforeEach(() => {
  tg = new FakeTelegram().install();
  data = Buffer.alloc(SIZE);
  for (let i = 0; i < SIZE; i++) data[i] = (i * 29 + 11) & 255;
  tg.addFile({ ...DOC, dc: 2, data });
});
afterEach(() => tg.restore());
async function client(log = () => {}) {
  const c = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 4000, store: memoryStore(), log });
  await c.connect(2);
  await c.botLogin(CREDS);
  return c;
}
const hexOf = (k) => data.subarray(k * MiB, Math.min((k + 1) * MiB, SIZE)).toString("hex");
const ahead = (...ks) => ks.map((k) => ({ offset: k * MiB, limit: MiB }));
const askedFor = (k) => (tg.dc(2).stats.getFileOffsets || []).filter((o) => o === k * MiB).length;

test("(a) a read of a chunk whose read-ahead is still in flight waits for that request: one request on the wire", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({}));                // chunk 0
  tg.dc(2).once("getFile", () => ({ delayMs: 600 }));  // chunk 1, read ahead, slow
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1) }), hexOf(0));
  const t = {};
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true, trace: t }), hexOf(1));
  assert.equal(t.pipe, "hit");
  assert.equal(askedFor(1), 1, "chunk 1 asked once");
  await c.close();
});

test("(b) answers out of order, several packets per frame and one packet over several frames: each to its request", async () => {
  const c = await client();
  tg.dc(2).coalesce = true;
  tg.dc(2).once("getFile", () => ({ delayMs: 300 })); // the asked chunk answers after the two read ahead
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1, 2) }), hexOf(0));
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 2 * MiB, MiB, { hex: true }), hexOf(2));
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(1));
  tg.dc(2).coalesce = false;
  tg.dc(2).splitFrames = 7;
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 3 * MiB, MiB, { hex: true, ahead: ahead(4) }), hexOf(3));
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 4 * MiB, MiB, { hex: true }), hexOf(4));
  await c.close();
});

test("(b) a duplicated answer and an answer for a forgotten request are dropped, never fatal", async () => {
  const lines = [];
  const c = await client((m) => lines.push(m));
  tg.dc(2).once("getFile", () => ({ duplicate: true }));
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true }), hexOf(0));
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(1));
  assert.ok(lines.some((l) => /answer for an unknown request dropped/.test(l)), lines.join("\n"));
  await c.close();
});

test("(c) a read-ahead that fails with an rpc error or a dropped socket never fails the read", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ error: [400, "FILE_PARTS_INVALID"] }));
  await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1) });
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(1));
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ close: true }));
  // The socket closes when the read-ahead of chunk 3 arrives: chunk 2's own read is answered (or asked again once on a
  // new connection) all the same.
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 2 * MiB, MiB, { hex: true, ahead: ahead(3) }), hexOf(2));
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 3 * MiB, MiB, { hex: true }), hexOf(3));
  await c.close();
});

test("(d) garbage in the middle of the pipeline breaks the session: it is never used again, the next request reconnects with the stored key", async () => {
  const c = await client();
  const kx = tg.dc(2).stats.keyExchanges, logins = tg.dc(2).stats.botLogins;
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ garbage: true }));
  // The garbage answers the read-ahead of chunk 1, after chunk 0's own answer: chunk 0's read is right.
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1, 2) }), hexOf(0));
  for (const k of [1, 2, 3]) assert.equal(await c.getFile({ ...DOC, dcId: 2 }, k * MiB, MiB, { hex: true }), hexOf(k), "chunk " + k);
  assert.deepEqual([tg.dc(2).stats.keyExchanges, tg.dc(2).stats.botLogins], [kx, logins], "same key, no login");
  await c.close();
});

test("describeError: a typed code, else name, message and the first stack line; never `undefined`", () => {
  const typed = Object.assign(new Error("x"), { code: "flood_wait", rpc: "FLOOD_WAIT_9", seconds: 9 });
  assert.equal(describeError(typed), "code=flood_wait rpc=FLOOD_WAIT_9 seconds=9");
  const plain = new RangeError("invalid hex character 0123456789abcdef0123456789abcdef");
  const d = describeError(plain);
  assert.match(d, /^code=- name=RangeError message="invalid hex character <hex>" at=/);
  assert.equal(describeError("boom"), 'code=- name=string message="boom"');
  assert.equal(describeError({ weird: 1 }), 'code=- name=object message="[object]"');
  assert.equal(describeError(undefined), 'code=- name=nothing message=""');
  for (const v of [typed, plain, "boom", { a: 1 }, null, undefined, 42]) assert.doesNotMatch(describeError(v), /undefined/);
});

// ---- the plugin ----

const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const CH1 = 1987654321n;
async function pluginDevice(runtimeOpts) {
  const world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const doc = world.doc({ mime: "video/mp4", size: SIZE, fileName: "a.mp4" });
  const id = world.post(CH1, { doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data });
  const dev = device();
  const p = await dev.runtime(SETTINGS, runtimeOpts && runtimeOpts(dev));
  await p.home();
  const ref = String(-(1000000000000n + CH1)) + ":" + id;
  const read = async (k) => Buffer.from((await p.read({ handle: ref, offset: k * MiB, length: MiB })).bytes, "base64");
  return { dev, p, ref, read };
}

test("(d) plugin: garbage mid-pipeline: the read reconnects once with the stored key and answers the exact bytes; recov=1", async () => {
  const { dev, read } = await pluginDevice();
  try {
    await read(0);
    const kx = tg.dc(2).stats.keyExchanges, logins = tg.dc(2).stats.botLogins;
    tg.dc(2).once("getFile", () => ({ garbage: true }));
    assert.ok((await read(3)).equals(data.subarray(3 * MiB, 4 * MiB)));
    assert.ok((await read(4)).equals(data.subarray(4 * MiB, 5 * MiB)), "and the reads after it");
    assert.deepEqual([tg.dc(2).stats.keyExchanges, tg.dc(2).stats.botLogins], [kx, logins]);
    const lines = dev.logs.filter((l) => l.startsWith("[kino.log] read off=3145728 "));
    assert.equal(lines.length, 1);
    assert.match(lines[0], / recov=1$/);
    assert.ok(dev.logs.some((l) => /^read recovering off=3145728 .*code=protocol/.test(l)), dev.logs.join("\n"));
  } finally { dev.close(); }
});

test("(d) plugin: the socket closes mid-pipeline (a read ahead in flight): the next reads recover", async () => {
  const { dev, read } = await pluginDevice();
  try {
    tg.dc(2).once("getFile", () => ({}));
    tg.dc(2).once("getFile", () => ({ close: true }));
    assert.ok((await read(0)).equals(data.subarray(0, MiB)), "chunk 0 itself is right");
    for (const k of [1, 2, 5]) assert.ok((await read(k)).equals(data.subarray(k * MiB, Math.min((k + 1) * MiB, SIZE))), "chunk " + k);
  } finally { dev.close(); }
});

test("(e) a thrown non-Error value (a string) inside the read: logged with its detail, recovered once, then a typed error", async () => {
  let throws = 0;
  const { dev, read, p, ref } = await pluginDevice((d) => ({ crypto: Object.freeze({ ...d.base.crypto, aesIge: (...a) => { if (throws > 0) { throws--; throw "native boom"; } return d.base.crypto.aesIge(...a); } }) }));
  try {
    throws = 1;
    assert.ok((await read(3)).equals(data.subarray(3 * MiB, 4 * MiB)), "recovered");
    assert.ok(dev.logs.some((l) => /^read recovering off=3145728 .*code=- name=string message="native boom"/.test(l)), dev.logs.join("\n"));
    throws = 2;
    await assert.rejects(p.read({ handle: ref, offset: 4 * MiB, length: MiB }), (e) => e.code === "unavailable" && typeof e.userMessage === "string");
    const fail = dev.logs.find((l) => l.startsWith("read failed off=4194304"));
    assert.match(fail, /code=- name=string message="native boom"/);
    assert.ok(!dev.logs.some((l) => /code=- rpc=-|undefined/.test(l)), "never an empty detail");
  } finally { dev.close(); }
});

test("(f) a native failure (a thrown non-Error) while pumping a chunk read ahead: the connection is dropped, the read asks again on a new one and succeeds", async () => {
  const realKino = globalThis.kino;
  let failCtr = 0;
  globalThis.kino = Object.freeze({ ...realKino, crypto: Object.freeze({ ...realKino.crypto, encrypt: (alg, p) => { if (failCtr > 0 && alg === "aes-256-ctr") { failCtr--; throw "InternalError: out of memory"; } return realKino.crypto.encrypt(alg, p); } }) });
  try {
    const lines = [];
    const c = await client((m) => lines.push(m));
    tg.dc(2).once("getFile", () => ({}));
    tg.dc(2).once("getFile", () => ({ delayMs: 300 })); // chunk 1 still on its way when it is asked
    await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1) });
    failCtr = 1; // the next frame's deobfuscation fails: the stream is lost from there
    assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(1));
    assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 2 * MiB, MiB, { hex: true }), hexOf(2));
    assert.ok(lines.some((l) => /chunk read ahead not usable \(code=- name=string message="InternalError: out of memory"\)/.test(l)), lines.join("\n"));
    await c.close();
  } finally {
    globalThis.kino = realKino;
  }
});

// ---- each guard on its own ----

function failingCrypto(op, only = () => true) {
  const realKino = globalThis.kino;
  const state = { left: 0 };
  globalThis.kino = Object.freeze({ ...realKino, crypto: Object.freeze({ ...realKino.crypto, [op]: (...a) => { if (state.left > 0 && only(a)) { state.left--; throw "native boom"; } return realKino.crypto[op](...a); } }) });
  state.restore = () => { globalThis.kino = realKino; };
  return state;
}

test("(g) a pump that fails leaves its session marked broken and fails every request still in flight on it", async () => {
  // An answer that cannot be read: the session decrypts with aesIgeVerify on a Kino that has it, else aesIge "decrypt".
  const fail = typeof kino.crypto.aesIgeVerify === "function" ? failingCrypto("aesIgeVerify") : failingCrypto("aesIge", (a) => a[0] === "decrypt");
  try {
    const c = await client();
    tg.dc(2).once("getFile", () => ({}));
    tg.dc(2).once("getFile", () => ({ delayMs: 200 }));
    const session = c.conns.get(2).session;
    fail.left = 1;
    await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1) }));
    assert.equal(session.broken, true);
    assert.equal(session.waiting.size, 0, "nothing left waiting on it");
    await c.close();
  } finally { fail.restore(); }
});

test("(h) a connection whose session is broken is never used again: the next call reconnects", async () => {
  const c = await client();
  const conns = tg.dc(2).stats.connections, kx = tg.dc(2).stats.keyExchanges;
  c.conns.get(2).session.broken = true;
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true }), hexOf(0));
  assert.equal(tg.dc(2).stats.connections, conns + 1);
  assert.equal(tg.dc(2).stats.keyExchanges, kx, "with the stored key");
  await c.close();
});

test("(i) after a failure that is not the server's own answer, the connection is closed at once", async () => {
  const fail = failingCrypto("aesIge");
  try {
    const c = await client();
    fail.left = 1;
    await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true }), (e) => e === "native boom");
    assert.equal(c.conns.get(2), undefined);
    await c.close();
  } finally { fail.restore(); }
});

test("(j) a chunk read ahead that never comes: the read stops waiting, drops that connection and asks again on a new one", { timeout: 30000 }, async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ silent: true }));
  await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1) });
  const conns = tg.dc(2).stats.connections;
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true, deadline: Date.now() + 15000 }), hexOf(1));
  assert.equal(tg.dc(2).stats.connections, conns + 1);
  await c.close();
});

test("(k) reset: every connection and every chunk read ahead goes; the next call reconnects with the key, no login", async () => {
  const c = await client();
  await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1, 2) });
  assert.ok(c.aheadCount() > 0);
  const kx = tg.dc(2).stats.keyExchanges, logins = tg.dc(2).stats.botLogins;
  await c.reset();
  assert.equal(c.aheadCount(), 0);
  assert.equal(c.conns.size, 0);
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(1));
  assert.deepEqual([tg.dc(2).stats.keyExchanges, tg.dc(2).stats.botLogins], [kx, logins]);
  await c.close();
});

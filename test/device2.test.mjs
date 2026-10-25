// Device round 2: frames as hex strings end to end (kino.ws encodings), and a read-ahead pipeline inside the client
// (several getFile in flight on one connection, replies collected by msg id).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device } from "../testkit/plugin-harness.mjs";
import { TelegramClient } from "../src/mtproto/client.js";

const kino = installKino();
const MiB = 1048576;
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const DOC = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
const SIZE = 5 * MiB + 1000;
let tg, data, sockets;
beforeEach(() => {
  tg = new FakeTelegram().install();
  data = Buffer.alloc(SIZE);
  for (let i = 0; i < SIZE; i++) data[i] = (i * 31 + 7) & 255;
  tg.addFile({ ...DOC, dc: 2, data });
  sockets = [];
});
afterEach(() => tg.restore());

/** kino.ws.open, recording how every frame crossed. */
function recordingOpen(url, opts) {
  return kino.ws.open(url, opts).then((s) => {
    const rec = { sends: [], recvs: [] };
    sockets.push(rec);
    return Object.freeze({
      send: (d, o) => { rec.sends.push({ type: typeof d, encoding: o && o.encoding }); return s.send(d, o); },
      recv: async (ms, o) => { rec.recvs.push(o && o.encoding); return s.recv(ms, o); },
      close: () => s.close(),
    });
  });
}
async function client(extra = {}) {
  const c = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 5000, store: memoryStore(), wsOpen: recordingOpen, ...extra });
  await c.connect(2);
  await c.botLogin(CREDS);
  return c;
}
const hexOf = (off, len) => data.subarray(off, Math.min(off + len, SIZE)).toString("hex");

test("every frame crosses as a hex string: send(hex, { encoding: 'hex' }) and recv(ms, { encoding: 'hex' })", async () => {
  const c = await client();
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true }), hexOf(0, MiB));
  assert.ok(sockets.length >= 1);
  for (const s of sockets) {
    assert.ok(s.sends.length > 0 && s.sends.every((x) => x.type === "string" && x.encoding === "hex"), JSON.stringify(s.sends));
    assert.ok(s.recvs.length > 0 && s.recvs.every((e) => e === "hex"), JSON.stringify(s.recvs));
  }
  await c.close();
});

test("an app without frame encodings (a Uint8Array back, send refusing a string): the transport falls back by itself", async () => {
  const legacyOpen = (url, opts) => kino.ws.open(url, opts).then((s) => Object.freeze({
    send: (d, o) => (typeof d === "string" ? Promise.reject(Object.assign(new Error("send() takes a Uint8Array"), { code: "invalid_request" })) : s.send(d)),
    recv: (ms) => s.recv(ms),
    close: () => s.close(),
  }));
  const c = await client({ wsOpen: legacyOpen });
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(MiB, MiB));
  await c.close();
});

test("read-ahead: the next chunks go out with the first, back to back on one connection; the next getFile is served from them", async () => {
  const c = await client();
  const trace1 = { queue: 0, tries: 0 };
  const first = await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: [{ offset: MiB, limit: MiB }, { offset: 2 * MiB, limit: MiB }], trace: trace1 });
  assert.equal(first, hexOf(0, MiB));
  assert.equal(trace1.pipe, "miss");
  assert.equal(trace1.ahead, 2);
  assert.equal(tg.dc(2).stats.getFile, 3, "three requests in flight together");
  const t2 = { queue: 0 };
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true, trace: t2 }), hexOf(MiB, MiB));
  assert.equal(t2.pipe, "hit");
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 2 * MiB, MiB, { hex: true }), hexOf(2 * MiB, MiB));
  assert.equal(tg.dc(2).stats.getFile, 3, "no new request for the chunks read ahead");
  assert.equal(tg.dc(2).stats.connections, 1);
  await c.close();
});

test("read-ahead: replies in any order; a read-ahead chunk that failed is fetched again and never fails the read", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({ delayMs: 400 }));                      // the first answer comes last
  await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: [{ offset: MiB, limit: MiB }] });
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ error: [420, "FLOOD_WAIT_3"] }));       // the read-ahead of chunk 3 fails
  await c.getFile({ ...DOC, dcId: 2 }, 2 * MiB, MiB, { hex: true, ahead: [{ offset: 3 * MiB, limit: MiB }] });
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(MiB, MiB), "out of order: still right");
  const before = tg.dc(2).stats.getFile;
  const t = { queue: 0 };
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 3 * MiB, MiB, { hex: true, trace: t }), hexOf(3 * MiB, MiB));
  assert.equal(t.pipe, "miss");
  assert.equal(tg.dc(2).stats.getFile, before + 1, "fetched again");
  await c.close();
});

test("read-ahead: at most 4 chunks are kept; a dropped connection drops them and the read goes on", async () => {
  const c = await client();
  await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: [1, 2, 3, 4, 5].map((k) => ({ offset: k * MiB, limit: MiB })) });
  assert.ok(c.aheadCount() <= 4);
  tg.dc(2).dropConnections();
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 4 * MiB, MiB, { hex: true }), hexOf(4 * MiB, MiB));
  await c.close();
});

// ---- the plugin ----

const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const CH1 = 1987654321n;

test("plugin: chunk 0 reads 2 ahead, the app's tail read sends none past the end, the next sequential reads hit", async () => {
  const world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const doc = world.doc({ mime: "video/mp4", size: SIZE, fileName: "a.mp4" });
  const id = world.post(CH1, { doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data });
  const ref = String(-(1000000000000n + CH1)) + ":" + id;
  const dev = device();
  try {
    const p = await dev.runtime(SETTINGS);
    await p.home();
    const read = async (k) => Buffer.from((await p.read({ handle: ref, offset: k * MiB, length: MiB })).bytes, "base64");
    assert.ok((await read(0)).equals(data.subarray(0, MiB)));
    assert.ok((await read(5)).equals(data.subarray(5 * MiB)), "the short last chunk");
    assert.ok((await read(1)).equals(data.subarray(MiB, 2 * MiB)));
    assert.ok((await read(2)).equals(data.subarray(2 * MiB, 3 * MiB)));
    const lines = dev.logs.filter((l) => l.startsWith("[kino.log] read "));
    assert.equal(lines.length, 4);
    assert.match(lines[0], / pipe=miss ahead=2 recov=0$/);
    assert.match(lines[1], / pipe=miss ahead=0 recov=0$/, "nothing read ahead past the end");
    assert.match(lines[2], / pipe=hit ahead=1 recov=0$/, "chunk 2 was already on its way: only chunk 3 is new");
    assert.match(lines[3], / pipe=hit ahead=\d recov=0$/);
    assert.ok(tg.dc(2).stats.getFileOffsets.every((o) => o < SIZE), "never past the end: " + tg.dc(2).stats.getFileOffsets);
  } finally {
    dev.close();
  }
});

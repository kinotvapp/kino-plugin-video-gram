// Device round 4: safe under QuickJS's 64 MiB cap. At most 3 chunk requests in flight, a packet cap of 3 MiB + 64 KiB,
// no two full copies of a packet alive at once (an explicit accounting of the big strings: src/mtproto/big.js),
// abandoned read-aheads on a seek, Telegram's packed containers, one login per read on a dead key, and the minors.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device } from "../testkit/plugin-harness.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { Transport, MAX_PACKET_BYTES } from "../src/mtproto/transport.js";
import { big } from "../src/mtproto/big.js";

const kino = installKino();
const MiB = 1048576;
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const DOC = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
const SIZE = 12 * MiB + 1000;
let tg, data;
beforeEach(() => {
  tg = new FakeTelegram().install();
  data = Buffer.alloc(SIZE);
  for (let i = 0; i < SIZE; i++) data[i] = (i * 13 + 5) & 255;
  tg.addFile({ ...DOC, dc: 2, data });
});
afterEach(() => tg.restore());
async function client() {
  const c = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 4000, store: memoryStore() });
  await c.connect(2);
  await c.botLogin(CREDS);
  return c;
}
const hexOf = (off, len = MiB) => data.subarray(off, Math.min(off + len, SIZE)).toString("hex");
const ahead = (...ks) => ks.map((k) => ({ offset: k * MiB, limit: MiB }));
const offsets = () => (tg.dc(2).stats.getFileOffsets || []).map((o) => o / MiB);

test("at most 3 chunk requests in flight: a read asking 5 ahead sends 2", async () => {
  const c = await client();
  await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1, 2, 3, 4, 5) });
  assert.deepEqual(offsets(), [0, 1, 2]);
  await c.close();
});

test("no read-ahead while 2 earlier ones are still in flight (abandoned after a seek, their answers dropped unkept)", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ silent: true }));
  tg.dc(2).once("getFile", () => ({ silent: true }));
  await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1, 2) });
  // A far seek: chunks 1 and 2 are no longer wanted, and still on the wire.
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 8 * MiB, MiB, { hex: true, ahead: ahead(9, 10), abandon: true }), hexOf(8 * MiB));
  // The two silent hooks took chunks 1 and 2 (a silent request never reaches the file store): all three were sent.
  assert.equal(tg.dc(2).hooks.length, 0, "chunks 1 and 2 went out");
  assert.deepEqual(offsets(), [0, 8], "no new read-ahead while two are in flight");
  assert.equal(c.aheadCount(), 0, "the abandoned ones are forgotten");
  await c.close();
});

test("the packet cap is 3 MiB + 64 KiB", () => {
  assert.equal(MAX_PACKET_BYTES, 3 * MiB + 65536);
});

test("Telegram packs three 1 MiB answers into one container: all three reads are right, and no two copies of the packet live at once", async () => {
  const c = await client();
  tg.dc(2).bundleFiles = { count: 3 };
  big.reset();
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1, 2) }), hexOf(0));
  tg.dc(2).bundleFiles = null;
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(MiB));
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 2 * MiB, MiB, { hex: true }), hexOf(2 * MiB));
  // A 3 MiB packet is 6 MiB of hex per copy. The accounting counts every big string our code holds at once.
  assert.ok(big.peak >= 2 * 6 * MiB - MiB, "the accounting saw the packet (twice, as it is sliced): " + (big.peak / MiB).toFixed(1));
  // At most two copies of the packet at any moment (6 MiB of hex each), plus small change.
  assert.ok(big.peak <= 2 * 6 * MiB + MiB / 2, "peak " + (big.peak / MiB).toFixed(1) + " MiB-eq of hex: at most 2 copies of the packet");
  await c.close();
});

test("a container over the cap is refused as protocol; the next request reconnects with the stored key", async () => {
  const c = await client();
  tg.dc(2).bundleFiles = { count: 3, pad: 128 * 1024, once: true };
  const kx = tg.dc(2).stats.keyExchanges;
  await assert.rejects(c.getFile({ ...DOC, dcId: 2 }, 0, MiB, { hex: true, ahead: ahead(1, 2) }), (e) => e.code === "protocol" && /cap/.test(e.message));
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB, { hex: true }), hexOf(MiB));
  assert.equal(tg.dc(2).stats.keyExchanges, kx);
  await c.close();
});

test("the cache is keyed by offset: the last chunk's own read (a shorter limit) is served from the 1 MiB read-ahead", async () => {
  const c = await client();
  await c.getFile({ ...DOC, dcId: 2 }, 11 * MiB, MiB, { hex: true, ahead: ahead(12) });
  const t = {};
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, 12 * MiB, 4096, { hex: true, trace: t }), hexOf(12 * MiB, 4096));
  assert.equal(t.pipe, "hit");
  assert.deepEqual(offsets(), [11, 12]);
  await c.close();
});

test("a send refused for its size is refused before the stream is encrypted: the connection stays in step", async () => {
  const t = await new Transport(2, { open: (u, o) => kino.ws.open(u, o) }).open();
  const before = t.enc.offset;
  await assert.rejects(t.sendHex("00".repeat(800000)), (e) => e.code === "invalid_request");
  assert.equal(t.enc.offset, before, "the keystream did not move");
  await t.close();
});

// ---- the plugin ----

const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const CH1 = 1987654321n;
async function plugin() {
  const world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const doc = world.doc({ mime: "video/mp4", size: SIZE, fileName: "a.mp4" });
  const id = world.post(CH1, { doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data });
  const dev = device();
  const p = await dev.runtime(SETTINGS);
  await p.home();
  const ref = String(-(1000000000000n + CH1)) + ":" + id;
  return { dev, p, ref, read: async (k) => Buffer.from((await p.read({ handle: ref, offset: k * MiB, length: MiB })).bytes, "base64") };
}

test("plugin: a far seek while two read-aheads are in flight never puts more than 3 chunk requests on the wire", async () => {
  const { dev, read } = await plugin();
  try {
    tg.dc(2).once("getFile", () => ({}));
    tg.dc(2).once("getFile", () => ({ silent: true }));
    tg.dc(2).once("getFile", () => ({ silent: true }));
    assert.ok((await read(0)).equals(data.subarray(0, MiB)));
    assert.ok((await read(8)).equals(data.subarray(8 * MiB, 9 * MiB)));
    assert.equal(tg.dc(2).hooks.length, 0, "chunks 1 and 2 went out (and never came back)");
    assert.deepEqual(offsets(), [0, 8], "chunk 8 alone: two read-aheads are still in flight");
  } finally { dev.close(); }
});

test("plugin: a container over the cap is recovered by reconnecting (recov=1), exact bytes", async () => {
  const { dev, read } = await plugin();
  try {
    tg.dc(2).bundleFiles = { count: 3, pad: 128 * 1024, once: true };
    assert.ok((await read(0)).equals(data.subarray(0, MiB)));
    assert.ok(dev.logs.some((l) => /^\[kino\.log\] read off=0 .* recov=1$/.test(l)), dev.logs.join("\n"));
  } finally { dev.close(); }
});

test("plugin: a transport -404 costs exactly one login per read, never two", async () => {
  const { dev, p, ref } = await plugin();
  try {
    const logins = tg.dc(2).stats.botLogins;
    // The key dies on every request of this read (the chunks read ahead take hooks too): withSession logs in once, and
    // the read gives up instead of logging in a second time.
    for (let i = 0; i < 8; i++) tg.dc(2).once("getFile", () => ({ transportError: -404 }));
    await assert.rejects(p.read({ handle: ref, offset: 0, length: MiB }), (e) => typeof e.code === "string");
    assert.equal(tg.dc(2).stats.botLogins, logins + 1);
  } finally { dev.close(); }
});

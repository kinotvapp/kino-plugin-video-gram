// Device round 5: the in-flight limit on every path (the reviewer's probe), the big-string accounting returning to 0
// after every kind of read, the slice of a cached chunk for a shorter limit, the expiry of abandoned requests, and
// read-ahead resuming once an abandoned answer arrives.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { big } from "../src/mtproto/big.js";

installKino();
const MiB = 1048576;
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const DOC = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
const SIZE = 24 * MiB + 1000;
let tg, data;
beforeEach(() => {
  tg = new FakeTelegram().install();
  data = Buffer.alloc(SIZE);
  for (let i = 0; i < SIZE; i++) data[i] = (i * 17 + 3) & 255;
  tg.addFile({ ...DOC, dc: 2, data });
  big.reset();
});
afterEach(() => tg.restore());
async function client(extra = {}) {
  const c = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 4000, store: memoryStore(), ...extra });
  await c.connect(2);
  await c.botLogin(CREDS);
  return c;
}
const hexOf = (off, len = MiB) => data.subarray(off, Math.min(off + len, SIZE)).toString("hex");
const ahead = (...ks) => ks.map((k) => ({ offset: k * MiB, limit: MiB }));
const get = (c, k, opts = {}) => c.getFile({ ...DOC, dcId: 2 }, k * MiB, MiB, { hex: true, ...opts });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test("the reviewer's probe: a read-ahead that never answers, a hit, then a far seek: never more than 3 chunk requests in flight", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({}));               // chunk 0
  tg.dc(2).once("getFile", () => ({ silent: true }));  // chunk 1 read ahead: never answers
  tg.dc(2).once("getFile", () => ({}));               // chunk 2 read ahead
  assert.equal(await get(c, 0, { ahead: ahead(1, 2) }), hexOf(0));
  assert.equal(await get(c, 2, { ahead: ahead(3, 4), abandon: true }), hexOf(2 * MiB), "a hit");
  assert.equal(await get(c, 20, { ahead: ahead(21, 22), abandon: true, deadline: Date.now() + 15000 }), hexOf(20 * MiB), "a far seek");
  assert.ok(tg.dc(2).stats.maxFileInFlight <= 3, "on the wire at once: " + tg.dc(2).stats.maxFileInFlight);
  assert.ok(c.maxInflight <= 3, "counted by the client at every send: " + c.maxInflight);
  await c.close();
});

test("a foreground read never hangs behind lost requests: it waits a little for room, then takes the oldest as lost", { timeout: 30000 }, async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({}));               // chunk 0
  tg.dc(2).once("getFile", () => ({ silent: true }));  // chunk 1 read ahead: lost
  tg.dc(2).once("getFile", () => ({}));               // chunk 2 read ahead
  tg.dc(2).once("getFile", () => ({ silent: true }));  // chunk 3 read ahead (after the hit on 2): lost
  tg.dc(2).once("getFile", () => ({ silent: true }));  // chunk 4 read ahead: lost
  await get(c, 0, { ahead: ahead(1, 2) });
  await get(c, 2, { ahead: ahead(3, 4), abandon: true }); // a hit: three requests in flight, none of them answering
  const t0 = Date.now();
  assert.equal(await get(c, 20, { abandon: true, deadline: Date.now() + 15000 }), hexOf(20 * MiB), "it still goes out");
  const took = Date.now() - t0;
  assert.ok(took >= 2000 && took < 6000, "waited for room, then went: " + took);
  assert.ok(c.maxInflight <= 3, "never a fourth: " + c.maxInflight);
  assert.ok(tg.dc(2).stats.maxFileInFlight <= 3, "on the wire: " + tg.dc(2).stats.maxFileInFlight);
  await c.close();
});

test("read-ahead resumes once an abandoned answer has arrived", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ delayMs: 300 }));
  tg.dc(2).once("getFile", () => ({ delayMs: 300 }));
  await get(c, 0, { ahead: ahead(1, 2) });
  await get(c, 10, { abandon: true, deadline: Date.now() + 15000 }); // 1 and 2 abandoned (still on the wire)
  await wait(500);
  await get(c, 15, { abandon: true });                                // pumps their answers in: dropped, no longer counted
  const t = {};
  await get(c, 16, { ahead: ahead(17, 18), trace: t });
  assert.equal(t.ahead, 2, "read-ahead goes on: " + t.ahead);
  await c.close();
});

test("an abandoned request that never answers stops counting after abandonedMs", async () => {
  const c = await client({ abandonedMs: 300 });
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ silent: true }));
  tg.dc(2).once("getFile", () => ({ silent: true }));
  await get(c, 0, { ahead: ahead(1, 2) });
  await get(c, 10, { abandon: true, deadline: Date.now() + 15000 });
  await wait(400);
  const t = {};
  await get(c, 16, { ahead: ahead(17, 18), trace: t });
  assert.equal(t.ahead, 2, "the lost ones expired: " + t.ahead);
  await c.close();
});

test("a shorter limit served from a cached 1 MiB chunk is sliced: hex and bytes, and a read across a MiB boundary", async () => {
  const c = await client();
  await get(c, 0, { ahead: ahead(1, 2) });
  assert.equal(await c.getFile({ ...DOC, dcId: 2 }, MiB, 4096, { hex: true }), hexOf(MiB, 4096));
  const tb = {};
  const bytes = await c.getFile({ ...DOC, dcId: 2 }, 2 * MiB, 8192, { trace: tb });
  assert.ok(bytes instanceof Uint8Array && Buffer.from(bytes).equals(data.subarray(2 * MiB, 2 * MiB + 8192)), "the bytes branch");
  assert.equal(tb.pipe, "hit", "served from the cached chunk, as bytes");
  await get(c, 4, { ahead: ahead(5) });
  const a = await c.getFile({ ...DOC, dcId: 2 }, 5 * MiB - 4096, 4096, { hex: true });
  const b = await c.getFile({ ...DOC, dcId: 2 }, 5 * MiB, 4096, { hex: true });
  assert.equal(a + b, hexOf(5 * MiB - 4096, 8192), "two pieces across the boundary, in step");
  await c.close();
});

// ---- the accounting returns to 0 after every kind of read (a leak check of the model) ----

async function settledZero(c) {
  await c.reset();
  assert.equal(big.live, 0, "live " + big.live);
}

test("accounting: a miss, a non-hex read and a gzipped answer leave nothing held", async () => {
  const c = await client();
  await get(c, 0);
  assert.equal(big.live, 0, "miss: " + big.live);
  await c.getFile({ ...DOC, dcId: 2 }, MiB, MiB);
  assert.equal(big.live, 0, "bytes: " + big.live);
  // A file that does not compress away (random bytes), so its packed answer is big too.
  const { randomBytes } = await import("node:crypto");
  const RND = { id: 77n, accessHash: 78n, fileReference: Uint8Array.from([7]) };
  tg.addFile({ ...RND, dc: 2, data: randomBytes(MiB) });
  tg.dc(2).gzipFiles = true;
  big.reset();
  await c.getFile({ ...RND, dcId: 2 }, 0, MiB, { hex: true });
  assert.ok(big.peak > 2 * MiB, "the packed answer was counted: " + big.peak);
  assert.equal(big.live, 0, "gzip: " + big.live);
  await c.close();
});

test("accounting: the read-ahead cache holds exactly its chunks; hits and resets give them back", async () => {
  const c = await client();
  await get(c, 0, { ahead: ahead(1, 2) });
  await get(c, 1);
  await get(c, 2);
  assert.equal(big.live, 0, "after the hits: " + big.live);
  await get(c, 3, { ahead: ahead(4, 5) });
  await wait(100);
  await get(c, 9, { abandon: false });    // pumps 4 and 5 into the cache
  assert.ok(big.live > 0, "the cache holds them");
  await settledZero(c);
});

test("accounting: abandoned answers are dropped without being held", async () => {
  const c = await client();
  tg.dc(2).once("getFile", () => ({}));
  tg.dc(2).once("getFile", () => ({ delayMs: 200 }));
  tg.dc(2).once("getFile", () => ({ delayMs: 200 }));
  await get(c, 0, { ahead: ahead(1, 2) });
  await get(c, 10, { abandon: true, deadline: Date.now() + 15000 });
  await wait(300);
  await get(c, 11, { abandon: true });
  assert.equal(big.live, 0, "after the abandoned answers: " + big.live);
  // Answered read-aheads (held in the cache) given up by a seek are released too.
  await get(c, 12, { ahead: ahead(13, 14) });
  await wait(100);
  await get(c, 18, { abandon: false }); // pumps 13 and 14 in
  assert.ok(big.live > 0);
  await get(c, 20, { abandon: true });
  assert.equal(big.live, 0, "the cache given up by a seek: " + big.live);
  await c.close();
});

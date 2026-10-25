// Device round 7: nothing of a finished play is retained across plays on the same runtime. The read-ahead cache is
// bounded by total bytes, and an idle runtime drops its cache and connection before the next play starts.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device } from "../testkit/plugin-harness.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { big } from "../src/mtproto/big.js";

installKino();
const MiB = 1048576;
const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const DOC = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([1, 2, 3]) };
const SIZE = 18 * MiB;
let tg, data;
beforeEach(() => {
  tg = new FakeTelegram().install();
  data = Buffer.alloc(SIZE);
  for (let i = 0; i < SIZE; i++) data[i] = (i * 19 + 7) & 255;
  tg.addFile({ ...DOC, dc: 2, data });
  big.reset();
});
afterEach(() => tg.restore());
const ahead = (...ks) => ks.map((k) => ({ offset: k * MiB, limit: MiB }));
const get = (c, k, opts = {}) => c.getFile({ ...DOC, dcId: 2 }, k * MiB, MiB, { hex: true, ...opts });
const hexOf = (off, len = MiB) => data.subarray(off, Math.min(off + len, SIZE)).toString("hex");

test("the read-ahead cache holds at most ~2 chunks of hex, however many are requested ahead and left unread", async () => {
  const c = await client();
  // Read far-apart chunks, each asking two ahead that nothing consumes; pump their answers into the cache.
  for (const k of [0, 6, 12]) {
    await get(c, k, { ahead: ahead(k + 1, k + 2) });
    await new Promise((r) => setTimeout(r, 50));
    await get(c, 16, { abandon: false }); // a far read that pumps the delivered answers in
  }
  assert.ok(c.aheadBytes() <= 5 << 20, "answered hex held: " + (c.aheadBytes() / MiB).toFixed(1) + " MiB");
  assert.ok(big.live <= 6 << 20, "model live: " + (big.live / MiB).toFixed(1) + " MiB");
  await c.close();
});

test("idleReset drops the cache and connection only when the last read is old; the activity stamp moves with every read", async () => {
  let clock = 1000;
  const c = await client({ now: () => clock });
  // Long after the client was built, but reading steadily: every read moves the stamp, so it is NOT idle.
  for (const k of [0, 1, 2]) { clock += 50000; await get(c, k, { ahead: ahead(k + 1) }); }
  await new Promise((r) => setTimeout(r, 50));
  await get(c, 9); // pumps the answers in
  assert.ok(c.aheadCount() > 0 && c.conns.size > 0 && big.live > 0);
  await c.idleReset(20000);
  assert.ok(c.aheadCount() >= 1, "a client that just read keeps its cache (the stamp moved)");
  clock += 60000; // now genuinely idle
  await c.idleReset(20000);
  assert.equal(c.aheadCount(), 0, "the idle cache is gone");
  assert.equal(c.conns.size, 0, "the idle connection is gone");
  assert.equal(big.live, 0, "nothing of it held: " + big.live);
  await c.close();
});

// ---- two plays on one runtime ----

async function pluginFile() {
  const world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  world.addChannel({ id: 1987654321n, accessHash: 11n, title: "Pelis" });
  const doc = world.doc({ mime: "video/mp4", size: SIZE, fileName: "a.mp4" });
  const id = world.post(1987654321n, { doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data });
  return "-1001987654321:" + id;
}

test("two plays on the same runtime: the second starts with nothing of the first retained", async () => {
  const dev = device();
  try {
    const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
    let clock = 1_700_000_000_000;
    const ref = await pluginFile();
    const p = await dev.runtime(SETTINGS, { now: () => clock });
    await p.home();
    const play = async () => {
      for (let k = 0; k * MiB < SIZE; k++) {
        clock += 1000;
        const r = await p.read({ handle: ref, offset: k * MiB, length: MiB });
        assert.ok(Buffer.from(r.bytes, "base64").equals(data.subarray(k * MiB, Math.min((k + 1) * MiB, SIZE))), "chunk " + k);
      }
    };
    await play();
    const afterFirst = big.live;
    assert.ok(afterFirst <= 6 << 20, "held after play 1: " + (afterFirst / MiB).toFixed(1) + " MiB");
    clock += 60000; // the person left the player, then pressed Continuar
    await play();   // every read right again, no OOM-shaped growth
    assert.ok(big.live <= 6 << 20, "held after play 2: " + (big.live / MiB).toFixed(1) + " MiB");
  } finally { dev.close(); }
});

async function client(extra = {}) {
  const c = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 4000, store: memoryStore(), ...extra });
  await c.connect(2);
  await c.botLogin(CREDS);
  return c;
}

// The single-file bundle (scripts/build.mjs) loaded the way the Kino kit loads a plugin (sdk/sandbox.mjs loadPlugin):
// its own vm context holding only what Kino gives a plugin (no Buffer, no process, no timers, no fetch), then the
// whole flow against the fake DC: key exchange, bot login, a stored state reused, file chunks.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bundle } from "../scripts/build.mjs";
import { loadPlugin, scanMissingGlobals } from "../sdk/sandbox.mjs";
import { installKino } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";

const kino = installKino();

/**
 * The kit's kino.ws.send checks `data instanceof Uint8Array` against Node's main realm, which a sandboxed plugin's
 * Uint8Array (another realm) never is. In the app the prelude and the plugin share one realm, so this adapter only
 * copies the bytes into a main-realm array; it changes nothing else.
 */
const sandboxKino = Object.freeze({
  ...kino,
  ws: Object.freeze({
    open: async (url, opts) => {
      const s = await kino.ws.open(url, opts);
      return Object.freeze({ send: (data) => s.send(new Uint8Array(data)), recv: (ms) => s.recv(ms), close: () => s.close() });
    },
  }),
});

const source = bundle();

test("the bundle is one ES module with no import and no Node-only global", () => {
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.deepEqual(scanMissingGlobals(source), []);
  assert.ok(source.length < 1024 * 1024, "Kino's entry file limit is 1 MB");
});

test("inside the plugin sandbox: key exchange, bot login, state reuse and chunks against the fake DC", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tg-bundle-"));
  const file = join(dir, "plugin.js");
  writeFileSync(file, source);
  const tg = new FakeTelegram().install();
  try {
    const data = Buffer.alloc(1048576 + 5000, 0);
    for (let i = 0; i < data.length; i++) data[i] = (i * 31 + 7) & 255;
    const doc = { id: 42n, accessHash: 43n, fileReference: Uint8Array.from([7, 7, 7]) };
    tg.addFile({ ...doc, dc: 2, data });
    const { plugin, sandboxed } = await loadPlugin(file, sandboxKino, { console: { log() {}, info() {}, warn() {}, error() {} } });
    assert.equal(sandboxed, true);
    const c = new plugin.TelegramClient({ apiId: 1, publicKeys: fakeRsa().publicKeys, timeoutMs: 5000 });
    await c.connect(2);
    assert.equal((await c.botLogin({ apiHash: "h", botToken: "1:t" })).userId, 777001n);
    const chunk = await c.getFile({ ...doc, dcId: 2 }, 0, 1048576);
    assert.equal(chunk.length, 1048576);
    assert.equal(plugin.toBase64(chunk), data.subarray(0, 1048576).toString("base64"));
    const state = JSON.parse(JSON.stringify(c.exportState()));
    await c.close();
    const c2 = new plugin.TelegramClient({ apiId: 1, publicKeys: fakeRsa().publicKeys });
    await c2.connect(2, state);
    const tail = await c2.getFile({ ...doc, dcId: 2 }, 1048576, 1048576);
    assert.equal(Buffer.from(tail).toString("hex"), data.subarray(1048576).toString("hex"));
    assert.equal(tg.dc(2).stats.keyExchanges, 1);
    assert.equal(tg.dc(2).stats.botLogins, 1);
    await c2.close();
  } finally {
    tg.restore();
    rmSync(dir, { recursive: true, force: true });
  }
});

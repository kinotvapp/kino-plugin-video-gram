// The device timing lines (src/shell/timing.js): one line per read and per refresh, one warn line per failed read,
// in the documented format, with no secret, id or file reference in them.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device } from "../testkit/plugin-harness.mjs";

const MiB = 1048576;
const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const SECRETS = [SETTINGS.api_id, SETTINGS.api_hash, SETTINGS.bot_token, SETTINGS.bot_token.split(":")[1]];
const CH1 = 1987654321n;
const READ_RE = /^\[kino\.log\] read off=\d+ len=\d+ bytes=\d+ total=\d+ queue=\d+ net=\d+ wsrecv=\d+ frames=\d+ framebytes=\d+ tohex=\d+ ctr=\d+ ige=\d+ mac=\d+ gunzip=\d+ parse=\d+ getfile=\d+ b64=\d+ tries=\d+ pipe=(hit|miss) ahead=\d+$/;
const REFRESH_RE = /^\[kino\.log\] refresh total=\d+ connect=\d+ login=(new|reused|-) loginms=\d+ pages=\d+ disc=\d+ upsert=\d+ purge=\d+ added=\d+ incomplete=[01] result=[a-z_]+$/;
const FAIL_RE = /^read failed off=\d+ len=\d+ ms=\d+ code=[a-z_-]+ rpc=[A-Z0-9_-]+( seconds=\d+)?( dc=\d+)?( deadline=1)?$/;
let tg, world, dev;
beforeEach(() => { tg = new FakeTelegram().install(); world = new FakeBotWorld({ diffPage: 50, channelPage: 50 }); tg.api = world; dev = device(); });
afterEach(() => { tg.restore(); dev.close(); });

test("one timing line per read and per refresh, a warn line per failed read, nothing secret in any of them", async () => {
  world.addChannel({ id: CH1, accessHash: 11n, title: "Pelis" });
  const size = 2 * MiB + 100;
  const doc = world.doc({ mime: "video/mp4", size, fileName: "a.mp4" });
  const id = world.post(CH1, { doc });
  tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data: Buffer.alloc(size, 3) });
  const ref = String(-(1000000000000n + CH1)) + ":" + id;
  const p = await dev.runtime(SETTINGS);
  await p.home();
  await p.read({ handle: ref, offset: 0, length: MiB });
  await p.read({ handle: ref, offset: 2 * MiB, length: MiB });
  tg.dc(2).once("getFile", () => ({ error: [420, "FLOOD_WAIT_600"] }));
  await assert.rejects(p.read({ handle: ref, offset: 3 * 4096, length: 4096 })); // not a chunk read ahead: a request of its own
  const reads = dev.logs.filter((l) => l.startsWith("[kino.log] read "));
  assert.equal(reads.length, 2);
  for (const l of reads) assert.match(l, READ_RE);
  assert.match(reads[0], /bytes=1048576 /);
  assert.match(reads[1], /off=2097152 len=1048576 bytes=100 /);
  assert.match(reads[0], / frames=[1-9]\d* framebytes=[1-9]\d* /, "the frames were counted");
  const refreshes = dev.logs.filter((l) => l.startsWith("[kino.log] refresh "));
  assert.ok(refreshes.length >= 1);
  for (const l of refreshes) assert.match(l, REFRESH_RE);
  assert.match(refreshes[0], /login=new .* pages=[1-9]/);
  const fails = dev.logs.filter((l) => l.startsWith("read failed"));
  assert.equal(fails.length, 1);
  assert.match(fails[0], FAIL_RE);
  assert.match(fails[0], /^read failed off=12288 len=4096 ms=\d+ code=flood_wait rpc=FLOOD_WAIT_600 seconds=600/);
  const all = dev.logs.join("\n");
  for (const s of SECRETS) assert.ok(!all.includes(s), "a secret in the logs");
  const [row] = await dev.base.catalog.get([ref]);
  for (const s of [row.data.doc.fileReference, row.data.doc.accessHash, row.data.doc.id]) assert.ok(!all.includes(s), "a document reference in the logs");
});

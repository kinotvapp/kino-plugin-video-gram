// 0.3.0 has 6 places instead of 8 (Kino's settings contract: 12 valued settings, 16 others). A 0.2.x install whose
// channels sat in places 7 and 8 keeps them: they wait first in line, marked when they were on, and the person gives
// them a place with "Dar lugar a los que esperan" after switching a place off. Places 1 to 6 never move by themselves.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device, places } from "../testkit/plugin-harness.mjs";

const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const chat = (id) => String(-(1000000000000n + id));
const ID = (i) => 3100000000n + BigInt(i);
let tg, world, d;
const flat = (rows) => rows.flatMap((r) => r.items);
beforeEach(() => {
  tg = new FakeTelegram().install();
  world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  for (let i = 0; i < 8; i++) {
    world.addChannel({ id: ID(i), accessHash: 5n, title: "C" + i });
    const doc = world.doc({ mime: "video/mp4", size: 3000, fileName: "v" + i + ".mp4", video: { duration: 5, w: 2, h: 2 } });
    world.post(ID(i), { doc });
    tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data: Buffer.alloc(3000) });
  }
  d = device();
});
afterEach(() => { tg.restore(); d.close(); });

/** Turns this device's state into what 0.2.x left: 8 places, C6 (place 7) on and indexed. */
async function as022() {
  await (await d.runtime(SETTINGS)).home(); // 0.3.0 indexes C0 (place 1, on by default)
  const shell = JSON.parse(d.base.storage.get("tg.shell"));
  shell.slots = Array.from({ length: 8 }, (_, i) => chat(ID(i)));
  shell.waiting = [];
  shell.applied = [chat(ID(0)), chat(ID(6))];
  shell.top[chat(ID(6))] = 2;
  d.base.storage.set("tg.shell", JSON.stringify(shell));
  const [c0] = (await d.catalogDump()).filter((r) => r.id.startsWith(chat(ID(0)) + ":"));
  await d.base.catalog.upsert([{ ...c0, id: chat(ID(6)) + ":2", title: "v6", data: { ...c0.data, chatId: chat(ID(6)), msgId: 2 } }]);
}

test("from 8 places to 6: places 1-6 keep their channel, 7 and 8 wait first in line (the one that was on, marked)", async () => {
  await as022();
  const p = await d.runtime(SETTINGS);
  const s = await p.settingsStatus();
  assert.deepEqual(places(s), ["✓ C0", "— C1", "— C2", "— C3", "— C4", "— C5"]);
  assert.match(s.channels_more, /^C6 \(estaba activo\), C7\. Para dar un lugar: apaga uno arriba, toca Guardar y luego Dar lugar a los que esperan/);
  const en = await (await d.runtime(SETTINGS, { lang: "en-US" })).settingsStatus();
  assert.match(en.channels_more, /^C6 \(was on\), C7\. To give one a place/);
  await p.action("refresh");
  assert.ok(!(await d.catalogDump()).some((r) => r.id.startsWith(chat(ID(6)) + ":")), "the waiting channel's rows are purged like any channel off");
  assert.ok(!flat(await p.home()).some((i) => i.ref.startsWith(chat(ID(6)))));
  assert.match((await p.settingsStatus()).channels_more, /^C6 \(estaba activo\), C7\./, "a refresh keeps the line order");
});

test("Dar lugar a los que esperan: only places switched off change hands, in line order, and arrive off; switching one on reads it", async () => {
  await as022();
  const p = await d.runtime({ ...SETTINGS, ch1: true, ch2: true });
  await p.home();
  const out = await p.action("free_slots");
  assert.match(out.message, /2 lugar\(es\) entregados; llegan apagados/);
  const s = await p.settingsStatus();
  assert.deepEqual(places(s), ["✓ C0", "✓ C1", "— C6", "— C7", "— C4", "— C5"]);
  assert.match(s.channels_more, /^C2, C3\./, "the channels that gave their place wait at the end of the line");
  assert.ok(!flat(await p.home()).some((i) => i.ref.startsWith(chat(ID(6)))), "nothing of a place given away shows until it is on");
  const on = await d.runtime({ ...SETTINGS, ch1: true, ch2: true, ch3: true });
  assert.ok(flat(await on.home()).some((i) => i.ref.startsWith(chat(ID(6)))), "C6 is read again from its start");
  assert.match((await on.action("free_slots")).message, /No hay lugares apagados|2 lugar/);
});

test("a fresh 0.3.0 install with 8 channels: six places, two waiting; no place changes by itself on later refreshes", async () => {
  const p = await d.runtime(SETTINGS);
  await p.home();
  const before = places(await p.settingsStatus());
  assert.equal(before.length, 6);
  assert.match((await p.settingsStatus()).channels_more, /^C6, C7\./);
  world.addChannel({ id: 1000n, accessHash: 1n, title: "Extraño" });
  await p.action("refresh");
  assert.deepEqual(places(await p.settingsStatus()), before);
  assert.match((await p.settingsStatus()).channels_more, /^C6, C7, Extraño\./);
});

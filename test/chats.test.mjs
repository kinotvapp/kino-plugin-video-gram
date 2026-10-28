// The chats the person reads videos from (1.2.0): a `chats` list setting picked in the setup screen, not six fixed places.
// A chat the bot meets is listed and never picked by itself; the screen recommends SOFT_ACTIVE picks and warns before more
// (a refresh takes longer, the index grows), up to MAX_ACTIVE; a device that read its chats through 1.1.x's toggles keeps
// them as picks the first time the screen opens.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device, places, MANIFEST } from "../testkit/plugin-harness.mjs";
import { checkScreenAnswer } from "../sdk/screen.mjs";
import { SOFT_ACTIVE, MAX_ACTIVE } from "../src/shell/library.js";

const SETTINGS = { api_id: "918273645", api_hash: "0f1e2d3c4b5a69788796a5b4c3d2e1f0", bot_token: "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY" };
const chat = (id) => String(-(1000000000000n + id));
const ID = (i) => 3100000000n + BigInt(i);
const pick = (...ns) => ns.map((n) => ({ id: chat(ID(n)), title: "C" + n }));
const COUNT = 14;
let tg, world, d;
const flat = (rows) => rows.flatMap((r) => r.items);
const find = (tree, test) => {
  let hit = null;
  const walk = (n) => { if (!hit && n && typeof n === "object") { if (test(n)) hit = n; (n.children || []).forEach(walk); (n.items || []).forEach(walk); } };
  walk(tree);
  return hit;
};
const switches = (tree) => {
  const out = [];
  const walk = (n) => { if (n && typeof n === "object") { if (n.type === "Switch" && /^chat\d+$/.test(n.key || "")) out.push(n); (n.children || []).forEach(walk); } };
  walk(tree);
  return out;
};
beforeEach(() => {
  tg = new FakeTelegram().install();
  world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  for (let i = 0; i < COUNT; i++) {
    world.addChannel({ id: ID(i), accessHash: 5n, title: "C" + i });
    const doc = world.doc({ mime: "video/mp4", size: 3000, fileName: "v" + i + ".mp4", video: { duration: 5, w: 2, h: 2 } });
    world.post(ID(i), { doc });
    tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data: Buffer.alloc(3000) });
  }
  d = device();
});
afterEach(() => { tg.restore(); d.close(); });

test("nothing is picked by itself: the chats are listed off, Home says to pick one, and no video is read", async () => {
  const p = await d.runtime({ ...SETTINGS, chats: [] });
  const rows = await p.home();
  assert.equal(flat(rows)[0].ref, "setup:noneActive");
  assert.equal((await d.catalogDump()).filter((r) => r.id !== "~device").length, 0, "no chat was read");
  const v = await p.view();
  assert.equal(switches(v.tree).length, COUNT, "every chat the bot knows is listed");
  assert.ok(switches(v.tree).every((s) => s.value === false));
  assert.match(places(v).join("|"), /C0/);
});

test("picking a chat reads it from its start; unpicking removes its rows and keeps the others", async () => {
  const p = await d.runtime({ ...SETTINGS, chats: [] });
  await p.home();
  const on = await p.event("toggle", chat(ID(2)), true);
  assert.deepEqual(on.config.chats, pick(2));
  assert.deepEqual(checkScreenAnswer(on, "es", { settings: MANIFEST.settings }).dropped, []);
  await p.event("toggle", chat(ID(3)), true);
  await p.action("refresh");
  assert.deepEqual([...new Set(flat(await p.home()).map((i) => i.ref.split(":")[0]))].sort(), [chat(ID(2)), chat(ID(3))].sort());
  const off = await p.event("toggle", chat(ID(2)), false);
  assert.deepEqual(off.config.chats, pick(3));
  await p.action("refresh");
  assert.ok(!(await d.catalogDump()).some((r) => r.id.startsWith(chat(ID(2)) + ":")), "the unpicked chat's rows are purged");
  assert.ok((await d.catalogDump()).some((r) => r.id.startsWith(chat(ID(3)) + ":")));
  assert.equal(await p.event("toggle", chat(ID(2)), false), null, "turning off what is off does nothing");
});

test("past the recommended number the screen warns first, and writes nothing until the person confirms", async () => {
  const p = await d.runtime({ ...SETTINGS, chats: pick(...Array.from({ length: SOFT_ACTIVE }, (_, i) => i)) });
  await p.home();
  const ask = await p.event("toggle", chat(ID(SOFT_ACTIVE)), true);
  assert.equal(ask.config, undefined, "nothing is written yet");
  assert.match(ask.dialog.body, /más memoria/);
  assert.match(ask.dialog.bodyEn, /more memory/);
  assert.ok(ask.dialog.body.includes(String(SOFT_ACTIVE)));
  assert.deepEqual(ask.dialog.buttons.map((b) => b.event), ["confirmOn", undefined]);
  assert.equal(ask.dialog.buttons[0].arg, chat(ID(SOFT_ACTIVE)));
  assert.deepEqual(checkScreenAnswer(ask, "es", { settings: MANIFEST.settings }).dropped, []);
  assert.deepEqual(Object.values(ask.state.inputs), [false], "the switch goes back off while the question is open");
  assert.equal((await p.view()).on[SOFT_ACTIVE + 1], false, "cancelling leaves it off");
  const yes = await p.event("confirmOn", chat(ID(SOFT_ACTIVE)));
  assert.equal(yes.config.chats.length, SOFT_ACTIVE + 1);
  assert.deepEqual(Object.values(yes.state.inputs), [true]);
});

test("the hard limit: past MAX_ACTIVE nothing is written, even when the person confirms", async () => {
  const p = await d.runtime({ ...SETTINGS, chats: pick(...Array.from({ length: MAX_ACTIVE }, (_, i) => i)) });
  await p.home();
  for (const answer of [await p.event("toggle", chat(ID(MAX_ACTIVE)), true), await p.event("confirmOn", chat(ID(MAX_ACTIVE)))]) {
    assert.equal(answer.config, undefined);
    assert.match(answer.toast, new RegExp(String(MAX_ACTIVE)));
    assert.deepEqual(checkScreenAnswer(answer, "es", { settings: MANIFEST.settings }).dropped, []);
  }
  const off = await p.event("toggle", chat(ID(0)), false);
  assert.equal(off.config.chats.length, MAX_ACTIVE - 1, "turning one off always works");
});

test("a device that read its chats through 1.1.x's toggles keeps them: the first opening writes them as picks, once", async () => {
  await (await d.runtime(SETTINGS)).home(); // 1.1.x read C0 (slot 1 on by default)
  const shell = JSON.parse(d.base.storage.get("tg.shell"));
  // The shell as 1.1.x left it: six slots, a waiting line, C0 and C6 read; no `chats`, no `migrated`.
  shell.slots = Array.from({ length: 6 }, (_, i) => chat(ID(i)));
  shell.waiting = [chat(ID(6)), chat(ID(7))];
  shell.applied = [chat(ID(0)), chat(ID(6))];
  delete shell.chats;
  delete shell.migrated;
  d.base.storage.set("tg.shell", JSON.stringify(shell));
  const p = await d.runtime({ ...SETTINGS, ch1: false });
  // `ch1: false` is the test shorthand for "no picks yet". Until the screen opens, the chats it was reading stay active.
  assert.ok(flat(await p.home()).some((i) => i.ref.startsWith(chat(ID(0)))));
  const open = await p.event("open");
  assert.deepEqual(open.config.chats.map((x) => x.id), [chat(ID(0)), chat(ID(6))]);
  assert.deepEqual(open.config.chats.map((x) => x.title), ["C0", "C6"]);
  assert.deepEqual(checkScreenAnswer(open, "es", { settings: MANIFEST.settings }).dropped, []);
  const again = await p.event("open");
  assert.ok(!again || again.config === undefined, "the migration happens once");
  const kept = JSON.parse(d.base.storage.get("tg.shell"));
  assert.deepEqual(kept.chats.slice(0, 8), Array.from({ length: 8 }, (_, i) => chat(ID(i))), "the same chats, in the same order");
  assert.equal(kept.slots, undefined);
  assert.equal(kept.waiting, undefined);
  const list = await p.view();
  assert.equal(list.on[1], true);
  assert.equal(list.on[7], true);
  assert.equal(list.on[2], false);
});

test("a picked chat the bot lost is listed as without access and can still be unpicked", async () => {
  const p = await d.runtime({ ...SETTINGS, chats: pick(0, 1) });
  await p.home();
  world.forbid(ID(0));
  await p.action("refresh");
  const v = await p.view();
  assert.match(places(v)[0], /^✗ C0 \(sin acceso\)/);
  assert.match(places(v)[1], /^✓ C1/);
  const off = await p.event("toggle", chat(ID(0)), false);
  assert.deepEqual(off.config.chats, pick(1));
});

test("a long list is searched, not scrolled: from 8 chats a search box shows, and a long list is cut with a note", async () => {
  const p = await d.runtime({ ...SETTINGS, chats: [] });
  await p.home();
  let v = await p.view();
  assert.ok(find(v.tree, (n) => n.key === "chatSearch"), "the search box shows");
  await p.event("search", undefined, "C1");
  v = await p.view();
  assert.deepEqual(switches(v.tree).map((s) => s.labelText), ["C1", "C10", "C11", "C12", "C13"]);
  await p.event("search", undefined, "");
  assert.equal(switches((await p.view()).tree).length, COUNT);
});

test("a key stays with its chat while the list is filtered, so a tap always names the right chat", async () => {
  const p = await d.runtime({ ...SETTINGS, chats: [] });
  await p.home();
  await p.event("search", undefined, "C13");
  const [only] = switches((await p.view()).tree);
  assert.equal(only.key, "chat13");
  assert.deepEqual(only.onChanged, { event: "toggle", arg: chat(ID(13)) });
});

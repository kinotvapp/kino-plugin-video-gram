// Video discovery (src/mtproto/discovery.js) against the fake DC with a fake bot world (testkit/fake-world.mjs) whose
// answers come from the independent test serializer; and, when the files exist on this machine, against a fake DC
// that replays the raw answers captured live from Telegram (never copied into the repo, nothing of them printed).
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { installKino, memoryStore } from "../testkit/kino.mjs";
import { FakeTelegram, fakeRsa } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import * as S from "../testkit/tl-serializer.mjs";
import { TelegramClient } from "../src/mtproto/client.js";
import { createDiscovery, chatIdOf } from "../src/mtproto/discovery.js";

installKino();

const CREDS = { apiId: 12345, apiHash: "0123456789abcdef0123456789abcdef", botToken: "123456:FAKE-test-token" };
const CH = 1987654321n, CH_HASH = -4444333322221111n;
const CH2 = 2000000001n, CH2_HASH = 77n;
const FIXTURES = "/Users/cristian/telegram-mtproto-spike/fixtures";

let tg, world, store, client;
async function setup(worldOptions) {
  world = new FakeBotWorld(worldOptions);
  tg.api = world;
  store = memoryStore();
  client = new TelegramClient({ apiId: CREDS.apiId, publicKeys: fakeRsa().publicKeys, timeoutMs: 3000, store });
  await client.connect(2);
  await client.botLogin(CREDS);
  return createDiscovery({ client, store });
}
beforeEach(() => { tg = new FakeTelegram().install(); });
afterEach(async () => { if (client) await client.close(); client = null; tg.restore(); });

const calls = (method) => tg.requests.filter((r) => r.method === method);
const saved = () => JSON.parse(store.get("tg.discovery"));
const byTitle = (entries) => Object.fromEntries(entries.map((e) => [e.title, e]));

/** A channel with: service message, 2 videos, a pdf, a GIF, a text post, an empty video file, a video sent as a file. */
function seedChannel() {
  world.addChannel({ id: CH, accessHash: CH_HASH, title: "Películas" });
  const ids = {};
  ids.movie = world.post(CH, { text: "Great movie\nwith a second line", doc: world.doc({ mime: "video/mp4", size: 734003200, fileName: "The Movie (2024).mp4", video: { duration: 5025.5, w: 1920, h: 1080 } }) });
  ids.noName = world.post(CH, { text: "\n  Caption title  \nmore", doc: world.doc({ mime: "video/x-matroska", size: 1000, video: { duration: 60, w: 640, h: 360 } }) });
  ids.pdf = world.post(CH, { doc: world.doc({ mime: "application/pdf", size: 5000, fileName: "notes.pdf" }) });
  ids.gif = world.post(CH, { doc: world.doc({ mime: "video/mp4", size: 3000, animated: true, video: { duration: 2, w: 100, h: 100 } }) });
  ids.text = world.post(CH, { text: "just text" });
  ids.zero = world.post(CH, { doc: world.doc({ mime: "video/mp4", size: 0, fileName: "zero.mp4" }) });
  ids.asFile = world.post(CH, { doc: world.doc({ mime: "application/x-matroska", size: 2048, fileName: "series.s01e01.mkv" }) });
  return ids;
}

test("first refresh: getDifference(pts=1, date=1, qts=-1), every channel from pts 1, only real videos, de-duplicated", async () => {
  const d = await setup({ diffPage: 3, channelPage: 2 });
  const ids = seedChannel();
  world.noise(10);
  world.privateMessage(555n, { firstName: "Ana", text: "for you", doc: world.doc({ mime: "video/webm", size: 999, video: { duration: 3, w: 10, h: 20 } }) });
  world.privateMessage(555n, { text: "", doc: world.doc({ mime: "application/octet-stream", size: 4096, video: { duration: 4, w: 8, h: 8 } }) });

  const res = await d.refresh();
  const first = calls("getDifference")[0];
  assert.deepEqual([first.pts, first.date, first.qts], [1, 1, -1]);
  assert.ok(calls("getDifference").length >= 3, "differenceSlice pages were followed");
  const chCalls = calls("getChannelDifference");
  assert.equal(chCalls[0].pts, 1);
  assert.equal(chCalls[0].limit, 100);
  assert.equal(chCalls[0].channelId, CH);
  assert.equal(chCalls[0].accessHash, CH_HASH);
  assert.ok(chCalls.length >= 4, "channel pages were followed until final");

  assert.equal(res.newCount, 5);
  assert.equal(res.entries.length, 5);
  assert.equal(new Set(res.entries.map((e) => e.key)).size, 5);
  const t = byTitle(res.entries);
  assert.deepEqual(Object.keys(t).sort(), ["Caption title", "The Movie (2024)", "Video 2", "for you", "series.s01e01"].sort());
  const m = t["The Movie (2024)"];
  const chatId = chatIdOf({ _: "peerChannel", channel_id: CH });
  assert.equal(chatId, "-1001987654321");
  assert.equal(m.key, chatId + ":" + ids.movie);
  assert.equal(m.chatId, chatId);
  assert.equal(m.msgId, ids.movie);
  assert.equal(m.chatTitle, "Películas");
  assert.equal(m.caption, "Great movie\nwith a second line");
  assert.equal(m.size, 734003200);
  assert.equal(m.mime, "video/mp4");
  assert.equal(m.duration, 5025.5);
  assert.equal(m.width, 1920);
  assert.equal(m.height, 1080);
  assert.equal(typeof m.date, "number");
  const doc = world.channels.get(String(CH)).messages.get(ids.movie).doc;
  assert.deepEqual(m.doc, { id: String(doc.id), accessHash: String(doc.accessHash), fileReference: Buffer.from(doc.fileReference).toString("hex"), dcId: 2 });
  assert.equal(t["series.s01e01"].duration, null);
  assert.equal(t["for you"].chatId, "555");
  assert.equal(t["for you"].chatTitle, "Ana");

  const st = saved();
  assert.equal(st.version, 1);
  assert.equal(st.pts, world.pts);
  assert.deepEqual(st.channels[String(CH)], { accessHash: String(CH_HASH), title: "Películas", pts: world.channels.get(String(CH)).pts });
  assert.equal(st.entries.length, 5);
  assert.deepEqual(res.state, { version: 1, pts: st.pts, qts: st.qts, date: st.date, seq: st.seq, channels: st.channels });
  assert.doesNotThrow(() => JSON.stringify(res));
});

test("incremental refresh: saved pts/date/qts, channels from their saved pts, only the new video counts", async () => {
  const d = await setup();
  seedChannel();
  await d.refresh();
  const st1 = saved();
  tg.requests.length = 0;
  const empty = await d.refresh();
  assert.equal(empty.newCount, 0);
  assert.equal(empty.entries.length, 3);
  const g = calls("getDifference")[0];
  assert.deepEqual([g.pts, g.date, g.qts], [st1.pts, st1.date, st1.qts]);
  assert.equal(calls("getChannelDifference")[0].pts, st1.channels[String(CH)].pts);

  world.post(CH, { text: "New one", doc: world.doc({ mime: "video/mp4", size: 10, video: { duration: 1, w: 2, h: 2 } }) });
  const res = await d.refresh();
  assert.equal(res.newCount, 1);
  assert.equal(res.entries.length, 4);
  assert.ok(res.entries.some((e) => e.title === "New one"));
});

test("an edited caption updates the entry, an edit to a non-video removes it, deletions remove entries", async () => {
  const d = await setup();
  const ids = seedChannel();
  const pm = world.privateMessage(555n, { firstName: "Ana", text: "pm video", doc: world.doc({ mime: "video/mp4", size: 9, video: { duration: 1, w: 1, h: 1 } }) });
  await d.refresh();
  world.edit(CH, ids.movie, { text: "Edited caption" });
  world.edit(CH, ids.noName, { doc: world.doc({ mime: "application/pdf", size: 5, fileName: "x.pdf" }) });
  world.remove(CH, [ids.asFile]);
  world.removePrivate([pm]);
  const res = await d.refresh();
  assert.equal(res.newCount, 0);
  const t = byTitle(res.entries);
  assert.deepEqual(Object.keys(t), ["The Movie (2024)"]);
  assert.equal(t["The Movie (2024)"].caption, "Edited caption");
  assert.equal(saved().entries.length, 1);
});

test("differenceTooLong: a fresh getState and every channel rescanned from pts 1, no duplicates", async () => {
  const d = await setup();
  seedChannel();
  await d.refresh();
  world.tooLongOnce = true;
  tg.requests.length = 0;
  const res = await d.refresh();
  assert.equal(calls("getState").length, 1);
  assert.equal(calls("getChannelDifference")[0].pts, 1);
  assert.equal(res.newCount, 0);
  assert.equal(res.entries.length, 3);
  assert.equal(saved().pts, world.pts);
});

test("channelDifferenceTooLong: continue from the dialog's pts and backfill the older ids with channels.getMessages", async () => {
  const d = await setup();
  seedChannel();
  world.channels.get(String(CH)).tooLongOnce = true;
  const res = await d.refresh();
  assert.equal(res.entries.length, 3);
  assert.ok(calls("channelsGetMessages").length >= 1);
  assert.equal(saved().channels[String(CH)].pts, world.channels.get(String(CH)).pts);
  assert.equal(saved().channels[String(CH)].backfill, undefined, "the backfill finished");
  // Nothing is fetched twice on the next refresh.
  tg.requests.length = 0;
  await d.refresh();
  assert.equal(calls("channelsGetMessages").length, 0);
});

test("FLOOD_WAIT mid-scan: the progress so far is kept, the answer says how long to wait, the next refresh finishes", async () => {
  const d = await setup({ channelPage: 2 });
  seedChannel();
  tg.dc(2).once("getChannelDifference", () => undefined); // the first channel page goes through
  tg.dc(2).once("getChannelDifference", () => ({ error: [420, "FLOOD_WAIT_7"] }));
  const partial = await d.refresh();
  assert.equal(partial.incomplete, true);
  assert.equal(partial.floodWait, 7);
  const mid = saved();
  assert.equal(mid.pts, world.pts, "the common box was saved");
  assert.ok(mid.channels[String(CH)].pts > 1, "the first channel page was saved");
  const rest = await d.refresh();
  assert.equal(rest.incomplete, undefined);
  assert.equal(rest.entries.length, 3);
  assert.equal(new Set(rest.entries.map((e) => e.key)).size, 3);
});

test("maxPages bounds one refresh; later refreshes continue where it stopped", async () => {
  const d = await setup({ diffPage: 2, channelPage: 1 });
  seedChannel();
  const first = await d.refresh({ maxPages: 2 });
  assert.equal(first.incomplete, true);
  assert.equal(tg.requests.length, 2);
  let res = first;
  for (let i = 0; i < 20 && res.incomplete; i++) res = await d.refresh({ maxPages: 3 });
  assert.equal(res.incomplete, undefined);
  assert.equal(res.entries.length, 3);
});

test("a channel the bot lost (CHANNEL_PRIVATE) is dropped with its entries; other channels go on", async () => {
  const d = await setup();
  seedChannel();
  world.addChannel({ id: CH2, accessHash: CH2_HASH, title: "Series" });
  world.post(CH2, { doc: world.doc({ mime: "video/mp4", size: 5, fileName: "ep1.mp4" }) });
  const res1 = await d.refresh();
  assert.equal(res1.entries.length, 4);
  world.forbid(CH);
  world.post(CH2, { doc: world.doc({ mime: "video/mp4", size: 5, fileName: "ep2.mp4" }) });
  const res2 = await d.refresh();
  assert.deepEqual(res2.entries.map((e) => e.title).sort(), ["ep1", "ep2"]);
  assert.equal(saved().channels[String(CH)], undefined);
});

test("a min channel never replaces a known access hash", async () => {
  const d = await setup();
  seedChannel();
  await d.refresh();
  const realApi = world.getDifference.bind(world);
  world.getDifference = () => S.difference({ chats: [S.channel({ id: CH, title: "Renamed", min: true })], state: world.stateBytes() });
  await d.refresh();
  world.getDifference = realApi;
  assert.equal(saved().channels[String(CH)].accessHash, String(CH_HASH));
});

test("a corrupt or old saved state falls back to a fresh scan and never throws", async () => {
  const d = await setup();
  seedChannel();
  for (const bad of ["{not json", JSON.stringify({ version: 0, pts: 5 }), JSON.stringify({ version: 1, pts: "x" }), JSON.stringify([1, 2]), JSON.stringify({ version: 1, pts: 3, qts: 0, date: 1, seq: 0, channels: { a: { accessHash: "zz" } }, entries: "no" })]) {
    store.set("tg.discovery", bad);
    tg.requests.length = 0;
    const res = await d.refresh();
    const g = calls("getDifference")[0];
    assert.deepEqual([g.pts, g.date, g.qts], [1, 1, -1], bad);
    assert.equal(res.entries.length, 3, bad);
  }
});

test("refetch: a fresh file reference from channels.getMessages (channel) or messages.getMessages (private); null when gone", async () => {
  const d = await setup();
  const ids = seedChannel();
  world.privateMessage(555n, { firstName: "Ana", text: "pm", doc: world.doc({ mime: "video/mp4", size: 9, video: { duration: 1, w: 1, h: 1 } }) });
  const { entries } = await d.refresh();
  const movie = entries.find((e) => e.msgId === ids.movie && e.chatId.startsWith("-100"));
  world.rotateFileReference(CH, ids.movie);
  const fresh = await d.refetch(movie);
  const ref = Buffer.from(world.channels.get(String(CH)).messages.get(ids.movie).doc.fileReference).toString("hex");
  assert.equal(fresh.doc.fileReference, ref);
  assert.notEqual(fresh.doc.fileReference, movie.doc.fileReference);
  assert.equal(fresh.key, movie.key);
  assert.deepEqual(calls("channelsGetMessages").at(-1).ids, [ids.movie]);
  assert.equal(saved().entries.find((e) => e.key === movie.key).doc.fileReference, ref);

  const pm = entries.find((e) => e.chatId === "555");
  const pmFresh = await d.refetch(pm);
  assert.equal(pmFresh.key, pm.key);
  assert.deepEqual(calls("messagesGetMessages").at(-1).ids, [pm.msgId]);

  world.remove(CH, [ids.movie]);
  assert.equal(await d.refetch(movie), null);
  assert.equal(saved().entries.some((e) => e.key === movie.key), false);
});

test("backfill lists ids with channels.getMessages in batches of 100; an unknown channel is channel_invalid", async () => {
  const d = await setup();
  seedChannel();
  await d.refresh();
  tg.requests.length = 0;
  const res = await d.backfill({ channelId: CH, fromId: 1, count: 150 });
  const batches = calls("channelsGetMessages");
  assert.equal(batches.length, 2);
  assert.equal(batches[0].ids.length, 100);
  assert.equal(batches[0].ids[0], 1);
  assert.equal(batches[1].ids.length, 50);
  assert.equal(batches[1].ids.at(-1), 150);
  assert.equal(res.entries.length, 3);
  assert.equal(res.nextId, 151);
  // The chat id form is accepted too (ids 1..3: the service message, the movie, the mkv).
  assert.equal((await d.backfill({ channelId: chatIdOf({ _: "peerChannel", channel_id: CH }), fromId: 1, count: 3 })).entries.length, 2);
  await assert.rejects(d.backfill({ channelId: 42n, fromId: 1, count: 1 }), (e) => e.code === "channel_invalid");
  world.forbid(CH);
  await assert.rejects(d.backfill({ channelId: CH, fromId: 1, count: 1 }), (e) => e.code === "channel_invalid");
});

test("captured live answers replayed: refresh finds exactly one video (video/mp4) in the captured channel", async (t) => {
  const names = ["getState", "getDifference-pts1", "getChannelDifference-pts1", "channels-getMessages-1-10"];
  if (!names.every((n) => existsSync(`${FIXTURES}/${n}.bin`))) return t.skip("fixtures missing");
  const bin = Object.fromEntries(names.map((n) => [n, readFileSync(`${FIXTURES}/${n}.bin`)]));
  const d = await setup();
  tg.api = {
    getState: () => bin.getState,
    getDifference: ({ pts }) => (pts === 1 ? bin["getDifference-pts1"] : S.differenceEmpty({ date: 1, seq: 1 })),
    getChannelDifference: ({ pts }) => (pts === 1 ? bin["getChannelDifference-pts1"] : S.channelDifferenceEmpty({ pts, final: true })),
    channelsGetMessages: () => bin["channels-getMessages-1-10"],
  };
  const res = await d.refresh();
  assert.equal(res.entries.length, 1);
  assert.equal(res.newCount, 1);
  const [e] = res.entries;
  assert.equal(e.mime, "video/mp4");
  assert.ok(e.chatId.startsWith("-100"));
  assert.ok(e.size > 0);
  assert.match(e.doc.fileReference, /^[0-9a-f]+$/);
  assert.equal(Object.keys(saved().channels).length >= 1, true);
  // refetch through the captured channels.getMessages answer.
  const again = await d.refetch(e);
  assert.equal(again.key, e.key);
});

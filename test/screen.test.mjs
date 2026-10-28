// The setup screen (apiVersion 14): the tree and every answer pass the kit's checks (nothing dropped), the steps appear as
// the setup advances, no secret reaches the tree or the state, and validateSettings refuses what Kino's form must not save.
import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { FakeTelegram } from "../testkit/fake-dc.mjs";
import { FakeBotWorld } from "../testkit/fake-world.mjs";
import { device, MANIFEST } from "../testkit/plugin-harness.mjs";
import { checkScreenTree, checkScreenAnswer } from "../sdk/screen.mjs";

const API_ID = "918273645", API_HASH = "0f1e2d3c4b5a69788796a5b4c3d2e1f0", TOKEN = "7012345678:AAFake-Token_value-ZZ0123456789abcdefXY";
const BOT = { api_id: API_ID, api_hash: API_HASH, bot_token: TOKEN };
const ACCOUNT = { access: "account", api_id: API_ID, api_hash: API_HASH };
let tg, world, d;
beforeEach(() => {
  tg = new FakeTelegram().install();
  world = new FakeBotWorld({ diffPage: 50, channelPage: 50 });
  tg.api = world;
  for (let i = 0; i < 8; i++) {
    world.addChannel({ id: 3100000000n + BigInt(i), accessHash: 5n, title: "Canal " + i });
    const doc = world.doc({ mime: "video/mp4", size: 3000, fileName: "v" + i + ".mp4", video: { duration: 5, w: 2, h: 2 } });
    world.post(3100000000n + BigInt(i), { doc });
    tg.addFile({ id: doc.id, accessHash: doc.accessHash, fileReference: doc.fileReference, dc: 2, data: Buffer.alloc(3000) });
  }
  d = device();
});
afterEach(() => { tg.restore(); d.close(); });

const kinds = (tree) => {
  const out = [];
  const walk = (n) => { if (n && typeof n === "object") { out.push(n.type); (n.children || []).forEach(walk); (n.items || []).forEach(walk); } };
  walk(tree);
  return out;
};
const texts = (tree) => JSON.stringify(tree);
const find = (tree, test) => {
  let hit = null;
  const walk = (n) => { if (!hit && n && typeof n === "object") { if (test(n)) hit = n; (n.children || []).forEach(walk); (n.items || []).forEach((i) => walk(i)); } };
  walk(tree);
  return hit;
};
/** The tree as Kino would read it: every node and property the kit's checker drops is a failure here. */
const clean = (tree, name) => {
  const checked = checkScreenTree(tree, "es", undefined, { settings: MANIFEST.settings });
  assert.deepEqual(checked.dropped, [], name + ": " + checked.dropped.join("; "));
  assert.deepEqual(checked.every.map((e) => e.event), ["tick"]);
  return checked;
};

test("a fresh install opens the connect step: the banner, one masked form with its rules, and nothing past it", async () => {
  const p = await d.runtime({});
  const { tree } = await p.view();
  clean(tree, "fresh");
  const json = texts(tree);
  assert.match(json, /Faltan datos: api_id, api_hash y el token del bot/);
  const steps = find(tree, (n) => n.type === "steps");
  assert.deepEqual(steps.items.map((i) => [i.key, i.state]), [["connect", "current"]]);
  const form = find(tree, (n) => n.type === "Form");
  assert.equal(form.onSubmitted, "connect");
  const fields = Object.fromEntries(form.children.filter((c) => c.type === "TextField").map((c) => [c.key, c]));
  assert.deepEqual(Object.keys(fields), ["api_id", "api_hash", "bot_token"]);
  for (const f of Object.values(fields)) assert.equal(f.required, true, f.key);
  assert.equal(fields.api_hash.obscureText, true);
  assert.equal(fields.bot_token.obscureText, true);
  assert.ok(fields.api_id.pattern && fields.api_hash.pattern && fields.bot_token.pattern, "Kino checks the shape before any code runs");
  assert.ok(!kinds(tree).includes("settings"), "no settings node: nothing of the old form is left");
  assert.ok(!kinds(tree).includes("Switch"), "no channels, no index, until Telegram is connected");
});

test("every text on the screen has its English twin", async () => {
  const p = await d.runtime(BOT);
  await p.action("refresh");
  const { tree } = await p.view();
  const missing = [];
  const walk = (n) => {
    if (!n || typeof n !== "object") return;
    for (const f of ["text", "labelText", "title", "label"]) if (typeof n[f] === "string" && n[f] && typeof n[f + "En"] !== "string") missing.push(f + ": " + n[f]);
    (n.children || []).forEach(walk);
    (n.items || []).forEach(walk);
    (n.options || []).forEach(walk);
  };
  walk(tree);
  assert.deepEqual(missing, []);
});

test("a bot setup: the channels appear as switches bound to their places, the index card has the refresh and forget buttons", async () => {
  const p = await d.runtime(BOT);
  let v = await p.view();
  clean(v.tree, "bot before refresh");
  assert.ok(!texts(v.tree).includes('"key":"sw1"'), "no place switches before the first refresh finds the channels");
  await p.action("refresh");
  v = await p.view();
  clean(v.tree, "bot after refresh");
  const switches = [];
  const walk = (n) => { if (n && typeof n === "object") { if (n.type === "Switch") switches.push(n); (n.children || []).forEach(walk); } };
  walk(v.tree);
  assert.deepEqual(switches.filter((s) => /^sw\d$/.test(s.key)).map((s) => s.bind), ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6"]);
  assert.equal(switches.find((s) => s.key === "swTmdb").bind, "tmdb");
  assert.match(texts(v.tree), /Sin lugar/, "two channels wait for a place");
  assert.match(texts(v.tree), /Dar lugar a los que esperan/);
  for (const key of ["btnRefresh", "btnForget", "btnFree"]) assert.ok(texts(v.tree).includes('"key":"' + key + '"'), key);
});

test("account mode: the bot token field goes, the sign-in step waits for api_id and api_hash, then shows the QR button", async () => {
  const p = await d.runtime({ access: "account" });
  let v = await p.view();
  clean(v.tree, "account, no keys");
  let steps = find(v.tree, (n) => n.type === "steps");
  assert.deepEqual(steps.items.map((i) => [i.key, i.state]), [["connect", "current"], ["account", "pending"]]);
  assert.deepEqual(find(v.tree, (n) => n.type === "Form").children.filter((c) => c.type === "TextField").map((c) => c.key), ["api_id", "api_hash"]);
  const q = await d.runtime(ACCOUNT);
  v = await q.view();
  clean(v.tree, "account with keys");
  steps = find(v.tree, (n) => n.type === "steps");
  assert.deepEqual(steps.items.map((i) => [i.key, i.state]), [["connect", "done"], ["account", "current"]]);
  assert.match(texts(v.tree), /Iniciar sesión con QR/);
  assert.match(texts(v.tree), /Tu cuenta y la seguridad/);
  assert.equal(steps.onStepTap, "goStep");
  // A saved secret is never shown back: going back to the done step, its fields are optional ("keep what is saved").
  await q.event("goStep", "connect");
  const back = find((await q.view()).tree, (n) => n.type === "Form");
  for (const f of back.children.filter((c) => c.type === "TextField")) assert.equal(f.required, false, f.key);
});

test("the connect form writes the secrets with config, checks them again, and a blank field keeps what is saved", async () => {
  const p = await d.runtime({});
  const bad = await p.event("connect", undefined, { api_id: "12a", api_hash: API_HASH, bot_token: TOKEN });
  assert.equal(bad.config, undefined);
  assert.match(bad.toast, /solo números/i);
  assert.ok(!JSON.stringify(bad).includes("12a"), "what was typed is not echoed");
  const swapped = await p.event("connect", undefined, { api_id: API_HASH, api_hash: API_HASH, bot_token: TOKEN });
  assert.match(swapped.toast, /api_hash/);
  const missing = await p.event("connect", undefined, { api_id: API_ID, api_hash: API_HASH, bot_token: "" });
  assert.equal(missing.config, undefined, "a bot needs its token");
  const ok = await p.event("connect", undefined, { api_id: ` ${API_ID} `, api_hash: API_HASH, bot_token: TOKEN });
  assert.deepEqual(ok.config, { api_id: API_ID, api_hash: API_HASH, bot_token: TOKEN });
  const checked = checkScreenAnswer(ok, "es", { settings: MANIFEST.settings });
  assert.deepEqual(checked.dropped, [], checked.dropped.join("; "));
  const saved = await d.runtime(BOT);
  const keep = await saved.event("connect", undefined, { api_id: "", api_hash: "", bot_token: "" });
  assert.deepEqual(keep.config, {}, "nothing typed: nothing rewritten");
  const account = await d.runtime(ACCOUNT);
  assert.deepEqual((await account.event("connect", undefined, { api_id: "", api_hash: "0123456789abcdef0123456789abcdef" })).config, { api_hash: "0123456789abcdef0123456789abcdef" }, "account mode asks for no token");
});

test("the QR carries Kino's countdown and renews itself before it ends", async () => {
  const p = await d.runtime(ACCOUNT);
  const tree = (await p.view()).tree;
  assert.ok(!find(tree, (n) => n.type === "QrImage"), "no code until the person asks for it");
  const withQr = await p.screen({ state: { qr: "tg://login?token=abc", qrMs: 28000 } });
  const qr = find(withQr, (n) => n.type === "QrImage");
  assert.equal(qr.expiresInMs, 28000);
  assert.equal(qr.onExpire, "qr_renew");
  assert.ok(qr.renewBeforeMs >= 1000 && qr.renewBeforeMs < 28000);
  const checked = checkScreenTree(withQr, "es", undefined, { settings: MANIFEST.settings });
  assert.deepEqual(checked.dropped, [], checked.dropped.join("; "));
});

test("every button turns itself off while its event runs, and every answer turns it back on", async () => {
  const p = await d.runtime(BOT);
  await p.action("refresh");
  const { tree } = await p.view();
  const buttons = [];
  const walk = (n) => { if (n && typeof n === "object") { if (/^btn/.test(n.key || "")) buttons.push(n); (n.children || []).forEach(walk); } };
  walk(tree);
  assert.ok(buttons.length >= 3);
  for (const b of buttons) assert.deepEqual(b.onPressed.ui, [{ disable: b.key }], b.key);
  for (const [event, key] of [["refresh", "btnRefresh"], ["free_slots", "btnFree"], ["forget", "btnForget"]]) {
    const answer = await p.event(event);
    const checked = checkScreenAnswer(answer, "es", { settings: MANIFEST.settings });
    assert.deepEqual(checked.dropped, [], event + ": " + checked.dropped.join("; "));
    assert.deepEqual(answer.ui, [{ enable: key }], event);
    assert.ok(answer.toast, event + " says what happened");
  }
});

test("the tick draws again only when something changed, and a timer's answer passes the kit's timer rules", async () => {
  const p = await d.runtime(BOT);
  const first = await p.event("tick");
  assert.ok(first.state.sig);
  assert.equal(await p.event("tick"), null, "nothing changed: no new frame");
  const checked = checkScreenAnswer(first, "es", { timer: true, settings: MANIFEST.settings });
  assert.deepEqual(checked.dropped, []);
  await p.action("refresh");
  assert.ok((await p.event("tick")).state.sig, "the refresh changed what is shown");
});

test("no secret reaches the tree or the state: not the api_hash, the token or the 2FA password", async () => {
  const p = await d.runtime({ ...BOT, tg_password: "correct horse battery staple" });
  await p.action("refresh");
  const answers = [await p.event("password", undefined, { tg_password: "correct horse battery staple" }), await p.event("connect", undefined, { api_id: API_ID, api_hash: API_HASH, bot_token: TOKEN })];
  const v = await p.view();
  const everything = JSON.stringify([v.tree, p.state(), answers.map((a) => ({ ...a, config: undefined }))]);
  for (const secret of [API_HASH, TOKEN, "correct horse battery staple"]) assert.ok(!everything.includes(secret), "leaked: " + secret.slice(0, 6));
  assert.ok(!everything.includes(API_ID), "the api_id is not drawn either");
});

test("the pattern each field carries is the one the code checks, and a swapped value says which field it belongs to", async () => {
  globalThis.kino = { lang: "es-CO" }; // the texts read kino.lang; this module runs outside the sandbox
  const { PATTERNS, problemWith } = await import("../src/shell/validate.js");
  for (const [key, ok, no] of [["api_id", API_ID, "12ab"], ["api_hash", API_HASH, "xyz"], ["bot_token", TOKEN, "nope"]]) {
    assert.match(ok, new RegExp(PATTERNS[key]), key);
    assert.doesNotMatch(no, new RegExp(PATTERNS[key]), key);
    assert.equal(problemWith(key, ok), null, key);
    assert.ok(problemWith(key, no), key);
    assert.ok(!problemWith(key, no).includes(no), "never echoes what was typed");
  }
  assert.equal(problemWith("api_id", ""), null, "an empty field is the form's business (required or keep)");
  assert.match(problemWith("api_id", API_HASH), /api_hash/);
  assert.match(problemWith("api_hash", API_ID), /api_id/);
  assert.match(problemWith("bot_token", API_HASH), /api_hash/);
});

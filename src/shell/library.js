// The video library: Telegram's channels through the discovery, kept in kino.catalog (one row per video), and the
// rows, pages and searches Kino shows, read from the catalog only.
//
// Channels: the bot learns every channel it administers; the slots are the first 8 of them by ascending channel id,
// recomputed from the whole set at every refresh (a channel the bot lost frees its slot), so the same bot gives the same
// slot -> channel mapping on every device once they have seen the same channels. The slot's toggle in the settings
// (which syncs) says whether that channel is shown and indexed. A channel that is
// off is never scanned and has no rows: turning it off removes its rows from the catalog (by id, in steps); turning
// it on reads it again from its start. Slot 1's toggle starts on, the others off (the manifest's defaults).
//
// Refresh: from Home (at most every 5 minutes, sooner while a pass is unfinished or a toggle changed) and from the
// "Actualizar ahora" action. Never from search. A refresh that fails keeps the old rows and stores the error.
import { withSession, credentials, saveSession, loginFp, sessionFp, forgetSession, hasStoredLogin as hasLogin, checkDevice, deviceMark, markDevice, DEVICE_ROW } from "./live.js";
import { KEYS, readJson, writeJson, remove } from "./store.js";
import { shellError, kindOf } from "./errors.js";
import { t, minutes, videoCount } from "./text.js";
import { logRefresh } from "./timing.js";
import { lastOpenTiming } from "./live.js";
import { nameOf, carry, displayTitle, posterOf, backdropOf, enrichStep, tmdbOn, viewOf } from "./enrich.js";
import { clip, cleanText } from "./clean.js";

export const SLOTS = 8;
export const REFRESH_MS = 5 * 60 * 1000;
const BATCH = 500;              // kino.catalog: items per upsert, ids per get/remove
const MAX_PAGES = 25;           // discovery RPCs per refresh (Home has 20 s)
const REFRESH_BUDGET_MS = 14000; // from the start of the call: key exchange, login and pages; then stop and go on later
const PURGE_BATCHES = 40;       // remove calls per purge step (20 000 ids)
const SCAN_BATCHES = 10;        // get calls per channel row or page (5 000 message ids)
const ROW_ITEMS = 30;
const PAGE_ITEMS = 60;
const HLS = /mpegurl/i;

// ---- shell state (tg.shell) ----

const freshShell = (fp) => ({ v: 1, fp, slots: [], missing: [], titles: {}, applied: [], top: {}, purge: [], indexedAt: 0, incomplete: false, count: 0, unslotted: 0, error: null, refused: null, channelErrors: 0, en: { off: 0, at: 0, done: false } });

export function loadShell(c) {
  const s = readJson(KEYS.shell);
  const fp = c && c.complete ? sessionFp(c) : null;
  if (!s || s.v !== 1 || !Array.isArray(s.slots)) return freshShell(fp);
  return { ...freshShell(fp), ...s };
}
const saveShell = (s) => writeJson(KEYS.shell, s);

/** The chats (Bot API ids, "-100...") whose toggle is on. */
export function activeChats(shell) {
  const on = new Set();
  const missing = new Set(shell.missing || []);
  shell.slots.forEach((chatId, i) => { if (chatId && !missing.has(chatId) && kino.config.get("ch" + (i + 1)) === true) on.add(chatId); });
  return on;
}

const chatOfId = (id) => String(id).slice(0, String(id).lastIndexOf(":"));
const msgOfId = (id) => Number(String(id).slice(String(id).lastIndexOf(":") + 1));
const channelChatId = (rawId) => String(-(1000000000000n + BigInt(rawId)));

// ---- catalog rows ----

/**
 * A discovery entry as a catalog item: id "<chat>:<msg>", the title (every name it goes by, for search), the date as
 * `sort`, a small `data`: the parsed name (`n`) and its lookup key (`pk`), the thumbnail's type and size (`th`, never
 * its bytes); TMDB's answer (`tm`) is added by the enrichment pass.
 */
export function rowOf(e) {
  // The sender's text, without control or direction characters, before anything is derived from it.
  const named = nameOf(cleanText(e.fileName || ""), cleanText(e.text || e.caption || ""), cleanText(e.title || ""));
  const data = {
    chatId: e.chatId,
    msgId: e.msgId,
    size: e.size,
    mime: clip(e.mime, 60),
    duration: Number.isFinite(e.duration) ? Math.round(e.duration) : null,
    width: Number.isFinite(e.width) ? e.width : null,
    height: Number.isFinite(e.height) ? e.height : null,
    caption: clip(e.caption, 120),
    doc: { id: e.doc.id, accessHash: e.doc.accessHash, fileReference: e.doc.fileReference, dcId: e.doc.dcId },
    n: named.n,
    pk: named.pk,
  };
  if (e.thumb) data.th = { t: e.thumb.t, s: e.thumb.s };
  return { id: String(e.key).slice(0, 128), title: clip(named.title, 300) || "Video " + e.msgId, sort: Number.isSafeInteger(e.date) ? e.date : 0, data };
}

async function upsertAll(rows) {
  for (let i = 0; i < rows.length; i += BATCH) await kino.catalog.upsert(rows.slice(i, i + BATCH));
}
async function removeAll(ids) {
  for (let i = 0; i < ids.length; i += BATCH) await kino.catalog.remove(ids.slice(i, i + BATCH));
}

/** Removes the rows of the chats waiting in `shell.purge`, at most PURGE_BATCHES remove calls. */
async function purgeStep(shell) {
  let calls = 0;
  while (shell.purge.length && calls < PURGE_BATCHES) {
    const p = shell.purge[0];
    if (p.next < 1) { shell.purge.shift(); continue; }
    const ids = [];
    for (let m = p.next; m >= 1 && ids.length < BATCH; m--) ids.push(p.chatId + ":" + m);
    await kino.catalog.remove(ids);
    p.next -= ids.length;
    calls++;
  }
}

/** Newest videos of one chat by message id, from `fromId` down (catalog.get by id: no network). */
async function scanChat(chatId, fromId, want) {
  const found = [];
  let next = fromId;
  for (let b = 0; b < SCAN_BATCHES && next >= 1 && found.length <= want; b++) {
    const ids = [];
    for (let m = next; m >= 1 && ids.length < BATCH; m--) ids.push(chatId + ":" + m);
    found.push(...(await kino.catalog.get(ids)));
    next -= ids.length;
  }
  if (found.length > want) return { items: found.slice(0, want), next: found[want].data.msgId };
  return { items: found, next: next >= 1 ? next : null };
}

// ---- Kino items ----

function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const two = (n) => String(n).padStart(2, "0");
  return h ? h + ":" + two(m) + ":" + two(x) : m + ":" + two(x);
}
function sizeText(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  return Math.max(1, Math.round(bytes / 1024)) + " KB";
}

/** The card's picture: TMDB's poster (a plain URL) when the row has one, else Telegram's thumbnail through `image`. */
export function posterFor(row) {
  row = viewOf(row);
  const p = posterOf(row);
  if (p) return p;
  return row.data && row.data.th ? { source: "plugin", handle: "t:" + row.id } : null;
}

/** A catalog row as a Kino item: id from the row id (only Item id characters), ref = the row id. */
export function itemOf(row) {
  row = viewOf(row); // without TMDB's answer when the person turned TMDB off
  const d = row.data || {};
  const item = { id: ("v" + row.id.replace(":", "_")).slice(0, 128), ref: row.id, title: clip(displayTitle(d, row.title), 200) || "Video", kind: "movie" };
  const poster = posterFor(row);
  if (poster) item.poster = poster;
  const backdrop = backdropOf(row);
  if (backdrop) item.backdrop = backdrop;
  const year = d.tm && d.tm.y ? d.tm.y : d.n && d.n.year ? String(d.n.year) : null;
  if (year) item.year = year;
  const badges = [];
  if (d.duration > 0) badges.push(clock(d.duration));
  if (d.size > 0) badges.push(sizeText(d.size));
  if (badges.length) item.badges = badges;
  if (d.height > 0) item.quality = d.height + "p";
  if (d.tm && d.tm.o) item.overview = d.tm.o;
  else if (d.caption && d.caption !== row.title && d.caption !== item.title) item.overview = d.caption;
  if (d.duration > 0) item.runtimeMinutes = Math.min(1000, Math.max(1, Math.round(d.duration / 60)));
  return item;
}

/** An instruction shown as a one-item row: opening it says what to do (resolve of "setup:<kind>"). */
const notice = (kind, title) => ({ id: "notice", title: t("row.notice"), items: [{ id: "setup-" + kind, ref: "setup:" + kind, title: clip(title, 200), kind: "movie" }] });

// ---- refresh ----

function problemOf(shell, now = Date.now()) {
  const e = shell.error;
  if (!e) return null;
  if ((e.kind === "flood" || e.kind === "budget") && e.until && e.until <= now) return null;
  return e;
}

function noticeFor(problem, now = Date.now()) {
  switch (problem.kind) {
    case "config": return notice("config", t("setup.config"));
    case "token": return notice("token", t("setup.token"));
    case "api_id": return notice("api_id", t("setup.apiId"));
    case "flood": return notice("flood", t("setup.flood", { min: minutes((problem.until - now) / 1000) }));
    case "budget": return notice("budget", t("setup.budget", { min: minutes((problem.until - now) / 1000) }));
    case "network": return notice("network", t("setup.network"));
    default: return notice("unavailable", t("setup.unavailable"));
  }
}

/** Starts over for another bot: the index and the discovery state go (this device keeps its mark). */
async function resetIndex(shell) {
  remove(KEYS.discovery);
  shell.slots = []; shell.missing = []; shell.titles = {}; shell.applied = []; shell.top = {}; shell.purge = [];
  shell.indexedAt = 0; shell.incomplete = false; shell.count = 0; shell.unslotted = 0; shell.channelErrors = 0;
  const mark = await deviceMark();
  try { await kino.catalog.clear(); } catch (e) { kino.log("catalog clear failed: " + (e && e.code)); }
  await markDevice(mark || undefined);
}

/** How many videos the catalog holds (the device mark is a row too, not a video). */
export async function countVideos() {
  const n = await kino.catalog.count();
  return Math.max(0, n - ((await kino.catalog.get([DEVICE_ROW])).length));
}

/**
 * The slots, STABLE and first-seen: a slot keeps its channel for good; a channel the bot meets for the first time is
 * appended to the first free slot (in the order the bot met them, `seen`), and its toggle starts off (only slot 1's
 * toggle starts on, and slot 1 is the first channel the bot ever met). Why: anyone who learns the bot's username can
 * make it an administrator of their own channel. With stable slots such a channel lands in a later slot, switched off,
 * and can never take the owner's slot or push it out (a 9th channel just gets no slot). A channel the bot lost keeps
 * its slot, marked missing, so that slot is never handed to a newcomer whose videos would then show switched on.
 */
function assignSlots(shell, channels) {
  const order = (id) => (Number.isInteger(channels[id].seen) ? channels[id].seen : Number.MAX_SAFE_INTEGER);
  const ids = Object.keys(channels || {}).sort((a, b) => order(a) - order(b) || (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0));
  const known = new Set();
  for (const rawId of ids) {
    const chatId = channelChatId(rawId);
    known.add(chatId);
    shell.titles[chatId] = clip(channels[rawId].title, 100);
    if (!shell.slots.includes(chatId) && shell.slots.length < SLOTS) shell.slots.push(chatId);
  }
  shell.missing = shell.slots.filter((chatId) => !known.has(chatId));
  shell.unslotted = [...known].filter((chatId) => !shell.slots.includes(chatId)).length;
}

/** Applies one refresh's changes to the catalog: only videos of active channels, never an HLS playlist. */
async function applyChanges(shell, changes, active) {
  let rows = [];
  for (const e of changes.upserted) {
    if (!active.has(e.chatId) || HLS.test(String(e.mime))) continue;
    rows.push(rowOf(e));
    shell.top[e.chatId] = Math.max(shell.top[e.chatId] || 0, e.msgId);
  }
  // An edited message keeps its TMDB answer while it would ask the same thing (an edited caption with tmdb:<id> asks again).
  const old = new Map();
  for (let i = 0; i < rows.length; i += BATCH) for (const r of await kino.catalog.get(rows.slice(i, i + BATCH).map((x) => x.id))) old.set(r.id, r);
  rows = rows.map((r) => carry(old.get(r.id), r));
  if (rows.some((r) => !(r.data && r.data.tm))) shell.en = { off: 0, at: 0, done: false }; // new rows to ask about: the walk starts over (newest first)
  await upsertAll(rows);
  await removeAll(changes.removed);
  for (const chatId of changes.droppedChats) {
    if (shell.top[chatId]) shell.purge.push({ chatId, next: shell.top[chatId] });
    delete shell.top[chatId];
  }
  return rows.length;
}

/** Turns toggle changes into work: a channel turned on is read again from its start, one turned off is purged. */
async function applyToggles(shell, live) {
  const active = activeChats(shell);
  const before = new Set(shell.applied);
  let changed = false;
  for (const chatId of active) {
    if (before.has(chatId)) continue;
    changed = true;
    if (live) await live.discovery.resetChannel(chatId);
  }
  for (const chatId of before) {
    if (active.has(chatId)) continue;
    changed = true;
    if (shell.top[chatId]) shell.purge.push({ chatId, next: shell.top[chatId] });
    delete shell.top[chatId];
  }
  if (live) shell.applied = [...active];
  return changed;
}

let running = null;      // the refresh in flight: a second caller (Home and "Actualizar ahora" at once) shares its result
let runningForce = false;
let queuedForce = null;  // a forced refresh that arrived while a plain one ran: it runs after it, once

/**
 * One refresh: toggles, purges, then (unless the index is recent and nothing is pending, or `force`) the discovery.
 * Never throws: answers { shell, added, problem }. A failure keeps the old rows and is stored in `shell.error`. One at
 * a time per runtime: a call while another runs gets that one's answer.
 */
export function refresh(opts = {}) {
  const force = opts.force === true;
  if (!running) return start(force);
  if (!force || runningForce) return running;
  // "Actualizar ahora" during a plain Home: when that Home did read Telegram, its answer is the fresh one; when it
  // took the early return (a recent index), the forced pass runs right after it.
  if (!queuedForce) queuedForce = running.then((r) => { queuedForce = null; return r.networked ? r : refresh({ force: true }); });
  return queuedForce;
}
function start(force) {
  runningForce = force;
  running = runRefresh({ force }).finally(() => { running = null; runningForce = false; });
  return running;
}

async function runRefresh({ force = false } = {}) {
  const c = credentials();
  if (!c.complete) return { shell: loadShell(null), added: 0, problem: { kind: "config" } };
  const started = Date.now();
  const now = started;
  let shell = null;
  let added = 0;
  let networked = false;
  const tm = { pages: 0, disc: 0, upsert: 0, purge: 0, result: "skipped" };
  const openBefore = lastOpenTiming();
  try {
    await checkDevice(); // first: a restored storage from another device is dropped before anything reads it
    shell = loadShell(c);
    if (shell.fp !== sessionFp(c)) { await resetIndex(shell); shell.fp = sessionFp(c); shell.error = null; shell.refused = null; }
    const active0 = activeChats(shell);
    const togglesPending = [...active0].some((x) => !shell.applied.includes(x)) || shell.applied.some((x) => !active0.has(x));
    let tp = Date.now();
    await purgeStep(shell); // what an earlier toggle left to remove: no network needed
    tm.purge += Date.now() - tp;
    const pending = shell.incomplete || togglesPending;
    const blocked = problemOf(shell, now);
    if (!force && blocked && (blocked.kind === "flood" || blocked.kind === "budget")) return { shell, added, problem: blocked };
    if (!force && !pending && shell.indexedAt && now - shell.indexedAt < REFRESH_MS) {
      await enrich(shell, started);
      return { shell, added, problem: blocked };
    }

    const deadline = started + REFRESH_BUDGET_MS;
    networked = true;
    tm.result = "ok";
    await withSession(c, shell, async (live) => {
      await applyToggles(shell, live);
      tp = Date.now();
      await purgeStep(shell);
      tm.purge += Date.now() - tp;
      // A second pass only when the first gave an active slot to a channel it had not scanned (slot 1 starts on).
      for (let pass = 0; pass < 2 && Date.now() < deadline; pass++) {
        const active = activeChats(shell);
        const td = Date.now();
        const res = await live.discovery.refresh({ maxPages: MAX_PAGES, deadline, commit: false, shouldScan: (rawId) => active.has(channelChatId(rawId)) });
        const tu = Date.now();
        tm.disc += tu - td; tm.pages += res.pages || 0;
        // The catalog first, then the discovery's progress: a write that fails (or a call cut off in between) leaves
        // the update state where it was, and the next refresh reads those pages again (upserts are idempotent).
        added += await applyChanges(shell, res.changes, active);
        tm.upsert += Date.now() - tu;
        res.commit();
        shell.channelErrors = (res.errors || []).filter((x) => x.scope === "channel").length;
        assignSlots(shell, res.state.channels);
        shell.incomplete = !!res.incomplete;
        if (res.floodWait !== undefined) {
          shell.error = { kind: "flood", until: now + res.floodWait * 1000, at: now };
          shell.incomplete = true;
          return;
        }
        shell.error = null;
        if (!(await applyToggles(shell, live))) return;
      }
      if (Date.now() >= deadline) shell.incomplete = true;
    }, { deadline });
    shell.refused = null;
    if (!shell.incomplete) shell.indexedAt = now;
    await enrich(shell, started);
    return { shell, added, networked, problem: problemOf(shell, now) };
  } catch (e) {
    shell = shell || loadShell(c);
    tm.result = e && e.code === "timeout" && e.deadline === true ? "deadline" : String(kindOf(e));
    if (e && e.code === "timeout" && e.deadline === true) {
      // Out of the call's time (a slow connect or login): not an error, the next call goes on; the rows stay.
      kino.log("refresh stopped at its deadline");
      shell.incomplete = true;
      return { shell, added, networked, problem: problemOf(shell, now) };
    }
    const kind = kindOf(e);
    shell.error = { kind, at: now };
    if (kind === "flood" || kind === "budget") shell.error.until = now + (Number(e.seconds) || 60) * 1000;
    if (kind === "token" || kind === "api_id") shell.refused = { fp: loginFp(c), kind };
    kino.log("refresh failed: " + kind + " " + (e && e.code ? e.code : ""));
    return { shell, added, networked, problem: shell.error };
  } finally {
    if (shell) {
      try { shell.count = await countVideos(); } catch { /* keep the last count */ }
      saveSession();
      saveShell(shell);
    }
    const o = lastOpenTiming() !== openBefore ? lastOpenTiming() : null; // a connect of this refresh, or the live one reused
    logRefresh({ total: Date.now() - started, connect: o ? o.connect : 0, loginms: o ? o.loginms : 0, login: o ? o.login : networked ? "reused" : "-", ...tm, added, incomplete: shell && shell.incomplete });
  }
}

/** The TMDB pass of a refresh (bounded, never throws): only rows of active channels, never the device mark. */
async function enrich(shell, started) {
  if (!tmdbOn()) return; // the person turned TMDB off: no kino.meta call, nothing of the videos leaves for TMDB
  const active = activeChats(shell);
  const t0 = Date.now();
  const asked = await enrichStep(shell, started, { skip: (row) => row.id === DEVICE_ROW || !active.has(chatOfId(row.id)) });
  if (asked) kino.log("tmdb lookups=" + asked + " ms=" + (Date.now() - t0) + (shell.en && shell.en.done ? " done" : ""));
}

/** Forgets this device: the session, the discovery state, the shell state and the catalog. */
export async function forget() {
  await forgetSession();
  remove(KEYS.discovery);
  remove(KEYS.shell);
  await kino.catalog.clear();
  await markDevice();
}

// ---- what Kino shows ----

/** Newest rows of the whole catalog that belong to active channels. */
async function recent(active, offset, want) {
  const items = [];
  let off = offset, total = 0;
  for (let i = 0; i < 5 && items.length < want; i++) {
    const page = await kino.catalog.search({ limit: 100, offset: off });
    total = page.total;
    for (const r of page.items) {
      if (items.length >= want) break;
      off++; // the next page starts right after the last row looked at
      if (active.has(chatOfId(r.id))) items.push(r);
    }
    if (off >= total || page.items.length === 0) break;
  }
  return { items, next: off < total ? off : null };
}

/** The Home rows: a notice when something is wrong, "Recientes", then one row per active channel. */
/** Time as the shell sees it (a test may give kino a clock; production kino has none). */
export const nowMs = () => (typeof kino.now === "function" ? kino.now() : Date.now());
const HOME_BUDGET_MS = 17000; // Kino gives home() 20 s: the rows stop being built here, whatever the refresh took

export async function homeRows({ shell, problem }, started = nowMs()) {
  const c = credentials();
  if (!c.complete) return [noticeFor({ kind: "config" })];
  const active = activeChats(shell);
  const rows = [];
  if (problem) rows.push(noticeFor(problem));
  const top = await recent(active, 0, ROW_ITEMS);
  if (top.items.length) {
    rows.push({ id: "recent", title: t("row.recent"), ref: "recent", items: top.items.map(itemOf) });
    for (const chatId of shell.slots) {
      if (!active.has(chatId)) continue;
      // A channel's own row is optional: past the budget Home answers with what it has (never a timeout).
      if (nowMs() - started > HOME_BUDGET_MS) { kino.log("home: channel rows skipped, out of time"); break; }
      const r = await scanChat(chatId, shell.top[chatId] || 0, ROW_ITEMS);
      if (r.items.length) rows.push({ id: "c" + chatId, title: clip(shell.titles[chatId] || chatId, 200), ref: "chan:" + chatId, items: r.items.map(itemOf) });
    }
  } else if (!problem) {
    rows.push(shell.slots.length === 0 ? notice("noChannels", t("setup.noChannels")) : active.size === 0 ? notice("noneActive", t("setup.noneActive")) : notice("empty", t("setup.empty")));
  }
  return rows.slice(0, 20);
}

/** "Ver más": "recent" pages the catalog by offset, "chan:<chat>" one channel by message id. */
export async function browsePage(ref, cursor) {
  const shell = loadShell(credentials());
  const active = activeChats(shell);
  if (ref === "recent") {
    const r = await recent(active, Number(cursor) > 0 ? Number(cursor) : 0, PAGE_ITEMS);
    return r.next === null ? { items: r.items.map(itemOf) } : { items: r.items.map(itemOf), next: String(r.next) };
  }
  if (typeof ref === "string" && ref.startsWith("chan:")) {
    const chatId = ref.slice(5);
    if (!active.has(chatId)) return { items: [] };
    const from = Number(cursor) > 0 ? Number(cursor) : shell.top[chatId] || 0;
    const r = await scanChat(chatId, from, PAGE_ITEMS);
    return r.next === null ? { items: r.items.map(itemOf) } : { items: r.items.map(itemOf), next: String(r.next) };
  }
  return { items: [] };
}

/** Search in the catalog only (accents and case aside, every word); `within` a channel keeps that channel's rows. */
export async function searchPage(query) {
  const q = String((query && query.q) || "").trim().slice(0, 256);
  if (!q) return { items: [] };
  if (!credentials().complete) return { items: [] };
  const shell = loadShell(credentials());
  const active = activeChats(shell);
  const within = query.within && String(query.within).startsWith("chan:") ? String(query.within).slice(5) : null;
  const offset = Number(query.cursor) > 0 ? Number(query.cursor) : 0;
  const page = await kino.catalog.search({ q, limit: 50, offset });
  const items = page.items.filter((r) => active.has(chatOfId(r.id)) && (!within || chatOfId(r.id) === within)).map(itemOf);
  const next = offset + page.items.length;
  return next < page.total ? { items, next: String(next) } : { items };
}

/** The catalog row behind a ref, when its channel is active; else a not_found shell error. */
export async function rowFor(ref) {
  const shell = loadShell(credentials());
  const [row] = typeof ref === "string" && ref.length <= 128 ? await kino.catalog.get([ref]) : [];
  if (!row || !activeChats(shell).has(chatOfId(row.id))) throw shellError("not_found", "no such video");
  return viewOf(row);
}

export const channelTabs = (shell) => shell.slots.filter((x) => activeChats(shell).has(x)).map((chatId) => ({ chatId, title: shell.titles[chatId] || chatId }));

/** The settings form's status lines (no network). */
export function statusLines() {
  const c = credentials();
  const shell = loadShell(c);
  const now = Date.now();
  const out = {};
  const problem = problemOf(shell, now);
  if (!c.complete) out.account_status = t("status.missing");
  else if (shell.refused && shell.refused.fp === loginFp(c)) out.account_status = t(shell.refused.kind === "token" ? "status.token" : "status.apiId");
  else if (problem && problem.kind === "flood") out.account_status = t("status.flood", { min: minutes((problem.until - now) / 1000) });
  else out.account_status = hasLogin(c) ? t("status.connected") : t("status.notYet");
  for (let i = 0; i < SLOTS; i++) {
    const chatId = shell.slots[i];
    const key = "ch" + (i + 1) + "_name";
    if (!chatId) { out[key] = t("slot.free"); continue; }
    const title = shell.titles[chatId] || chatId;
    out[key] = (shell.missing || []).includes(chatId) ? t("slot.gone", { title }) : kino.config.get("ch" + (i + 1)) === true ? title : t("slot.off", { title });
  }
  const parts = [shell.count > 0 ? videoCount(shell.count) : t("index.none")];
  if (shell.indexedAt) {
    const m = Math.floor((now - shell.indexedAt) / 60000);
    parts.push(m < 1 ? t("index.justNow") : t("index.at", { min: minutes(m * 60) }));
  }
  if (shell.incomplete) parts.push(t("index.reading"));
  if (problem) parts.push(problem.kind === "flood" || problem.kind === "budget" ? t("setup.flood", { min: minutes((problem.until - now) / 1000) }) : noticeFor(problem).items[0].title);
  if (shell.channelErrors > 0) parts.push(t("index.channelErrors", { n: shell.channelErrors }));
  if (shell.unslotted > 0) parts.push(t("index.unslotted", { n: shell.unslotted }));
  out.index_status = parts.join(" · ").slice(0, 200);
  return out;
}

export { chatOfId, msgOfId };

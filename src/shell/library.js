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

const freshShell = (fp) => ({ v: 1, fp, slots: [], titles: {}, gone: {}, applied: [], top: {}, purge: [], indexedAt: 0, incomplete: false, count: 0, unslotted: 0, error: null, refused: null, channelErrors: 0 });

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
  shell.slots.forEach((chatId, i) => { if (chatId && kino.config.get("ch" + (i + 1)) === true && !shell.gone[chatId]) on.add(chatId); });
  return on;
}

const clip = (s, n) => { let x = String(s || "").replace(/\s+/g, " ").trim().slice(0, n); if (/[\uD800-\uDBFF]$/.test(x)) x = x.slice(0, -1); return x; };
const chatOfId = (id) => String(id).slice(0, String(id).lastIndexOf(":"));
const msgOfId = (id) => Number(String(id).slice(String(id).lastIndexOf(":") + 1));
const channelChatId = (rawId) => String(-(1000000000000n + BigInt(rawId)));

// ---- catalog rows ----

/** A discovery entry as a catalog item: id "<chat>:<msg>", the title, the date as `sort`, a small `data`. */
export function rowOf(e) {
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
  };
  return { id: String(e.key).slice(0, 128), title: clip(e.title, 300) || "Video " + e.msgId, sort: Number.isSafeInteger(e.date) ? e.date : 0, data };
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

/** A catalog row as a Kino item: id from the row id (only Item id characters), ref = the row id. */
export function itemOf(row) {
  const d = row.data || {};
  const item = { id: ("v" + row.id.replace(":", "_")).slice(0, 128), ref: row.id, title: clip(row.title, 200) || "Video", kind: "movie" };
  const badges = [];
  if (d.duration > 0) badges.push(clock(d.duration));
  if (d.size > 0) badges.push(sizeText(d.size));
  if (badges.length) item.badges = badges;
  if (d.height > 0) item.quality = d.height + "p";
  if (d.caption && d.caption !== row.title) item.overview = d.caption;
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
  shell.slots = []; shell.titles = {}; shell.gone = {}; shell.applied = []; shell.top = {}; shell.purge = [];
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

/** The slots: the first SLOTS channels the discovery knows, by ascending channel id; the titles of all of them. */
function assignSlots(shell, channels) {
  const ids = Object.keys(channels || {}).sort((a, b) => { const x = BigInt(a), y = BigInt(b); return x < y ? -1 : x > y ? 1 : 0; });
  for (const rawId of ids) {
    const chatId = channelChatId(rawId);
    shell.titles[chatId] = clip(channels[rawId].title, 100);
    delete shell.gone[chatId];
  }
  shell.slots = ids.slice(0, SLOTS).map(channelChatId);
  shell.unslotted = Math.max(0, ids.length - SLOTS);
}

/** Applies one refresh's changes to the catalog: only videos of active channels, never an HLS playlist. */
async function applyChanges(shell, changes, active) {
  const rows = [];
  for (const e of changes.upserted) {
    if (!active.has(e.chatId) || HLS.test(String(e.mime))) continue;
    rows.push(rowOf(e));
    shell.top[e.chatId] = Math.max(shell.top[e.chatId] || 0, e.msgId);
  }
  await upsertAll(rows);
  await removeAll(changes.removed);
  for (const chatId of changes.droppedChats) {
    shell.gone[chatId] = true;
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

let running = null; // the refresh in flight: a second caller (Home and "Actualizar ahora" at once) shares its result

/**
 * One refresh: toggles, purges, then (unless the index is recent and nothing is pending, or `force`) the discovery.
 * Never throws: answers { shell, added, problem }. A failure keeps the old rows and is stored in `shell.error`. One at
 * a time per runtime: a call while another runs gets that one's answer.
 */
export function refresh(opts = {}) {
  if (!running) running = runRefresh(opts).finally(() => { running = null; });
  return running;
}

async function runRefresh({ force = false } = {}) {
  const c = credentials();
  if (!c.complete) return { shell: loadShell(null), added: 0, problem: { kind: "config" } };
  const started = Date.now();
  const now = started;
  let shell = null;
  let added = 0;
  try {
    await checkDevice(); // first: a restored storage from another device is dropped before anything reads it
    shell = loadShell(c);
    if (shell.fp !== sessionFp(c)) { await resetIndex(shell); shell.fp = sessionFp(c); shell.error = null; shell.refused = null; }
    const active0 = activeChats(shell);
    const togglesPending = [...active0].some((x) => !shell.applied.includes(x)) || shell.applied.some((x) => !active0.has(x));
    await purgeStep(shell); // what an earlier toggle left to remove: no network needed
    const pending = shell.incomplete || togglesPending;
    const blocked = problemOf(shell, now);
    if (!force && blocked && (blocked.kind === "flood" || blocked.kind === "budget")) return { shell, added, problem: blocked };
    if (!force && !pending && shell.indexedAt && now - shell.indexedAt < REFRESH_MS) return { shell, added, problem: blocked };

    const deadline = started + REFRESH_BUDGET_MS;
    await withSession(c, shell, async (live) => {
      live.client.timeoutMs = 9000;
      await applyToggles(shell, live);
      await purgeStep(shell);
      // A second pass only when the first gave an active slot to a channel it had not scanned (slot 1 starts on).
      for (let pass = 0; pass < 2 && Date.now() < deadline; pass++) {
        const active = activeChats(shell);
        const res = await live.discovery.refresh({ maxPages: MAX_PAGES, deadline, commit: false, shouldScan: (rawId) => active.has(channelChatId(rawId)) });
        // The catalog first, then the discovery's progress: a write that fails (or a call cut off in between) leaves
        // the update state where it was, and the next refresh reads those pages again (upserts are idempotent).
        added += await applyChanges(shell, res.changes, active);
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
    });
    shell.refused = null;
    if (!shell.incomplete) shell.indexedAt = now;
    return { shell, added, problem: problemOf(shell, now) };
  } catch (e) {
    shell = shell || loadShell(c);
    const kind = kindOf(e);
    shell.error = { kind, at: now };
    if (kind === "flood" || kind === "budget") shell.error.until = now + (Number(e.seconds) || 60) * 1000;
    if (kind === "token" || kind === "api_id") shell.refused = { fp: loginFp(c), kind };
    kino.log("refresh failed: " + kind + " " + (e && e.code ? e.code : ""));
    return { shell, added, problem: shell.error };
  } finally {
    if (shell) {
      try { shell.count = await countVideos(); } catch { /* keep the last count */ }
      saveSession();
      saveShell(shell);
    }
  }
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
export async function homeRows({ shell, problem }) {
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
  return row;
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
    out[key] = kino.config.get("ch" + (i + 1)) === true ? title : t("slot.off", { title });
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

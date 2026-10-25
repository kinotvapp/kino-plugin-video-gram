// Video-Gram (id video-gram): a personal library of your Telegram videos for Kino. The person brings their own api_id/api_hash
// (my.telegram.org) and a bot (@BotFather) that administers their private channel(s); the plugin lists the channels'
// videos in Inicio and in search, and streams them through Kino's byteSource (`read`), seeking, Cast and DLNA included.
//
// Sources: src/mtproto/ (the MTProto client and the discovery), src/shell/ (this plugin). Built into one file by
// scripts/build.mjs (`npm run build`): the published plugin.js.
import { guard, shellError } from "./shell/errors.js";
import { credentials } from "./shell/live.js";
import { refresh, forget, homeRows, browsePage, searchPage, rowFor, loadShell, channelTabs, statusLines, posterFor, nowMs, freeSlots } from "./shell/library.js";
import { startQr, qrPoll, confirmPassword, logout } from "./shell/account.js";
import { read as readBytes } from "./shell/read.js";
import { image as imageBytes } from "./shell/image.js";
import { displayTitle, backdropOf } from "./shell/enrich.js";
import { t, videoCount, minutes } from "./shell/text.js";

const MIME_FIX = { "application/x-matroska": "video/x-matroska", "application/mp4": "video/mp4" };
const playableMime = (m) => {
  const x = String(m || "").toLowerCase();
  if (MIME_FIX[x]) return MIME_FIX[x];
  return /^(video|audio)\/[a-z0-9.+-]{1,60}$/.test(x) ? x : "video/mp4";
};
const CONTAINER = { "video/mp4": "mp4", "video/x-matroska": "matroska", "video/webm": "webm", "video/quicktime": "mov", "video/x-msvideo": "avi" };

export async function home() {
  await null;
  const started = nowMs();
  try {
    return await homeRows(await refresh(), started);
  } catch (e) {
    kino.log("home failed: " + (e && e.code ? e.code : "error"));
    return [{ id: "notice", title: t("row.notice"), items: [{ id: "setup-unavailable", ref: "setup:unavailable", title: t("setup.unavailable"), kind: "movie" }] }];
  }
}

export async function search(query) {
  return guard(() => searchPage(query || {}));
}

export async function browse(ref, cursor) {
  return guard(() => browsePage(ref, cursor));
}

export async function resolve(ref) {
  return guard(async () => {
    if (typeof ref === "string" && ref.startsWith("setup:")) {
      let kind = ref.slice(6);
      const seconds = secondsLeft(kind);
      if ((kind === "flood" || kind === "budget") && seconds === undefined) kind = "unavailable"; // the wait is over
      throw shellError(["config", "token", "api_id", "flood", "budget", "signin", "closed"].includes(kind) ? kind : "unavailable", "setup notice", { seconds });
    }
    if (!credentials().complete) throw shellError("config");
    const row = await rowFor(ref);
    const d = row.data;
    const mime = playableMime(d.mime);
    const stream = { source: "plugin", handle: row.id, size: d.size, mime };
    if (d.duration > 0) stream.durationMs = Math.round(d.duration * 1000);
    const media = { title: displayTitle(d, row.title).slice(0, 120), sizeBytes: d.size };
    if (CONTAINER[mime]) media.container = CONTAINER[mime];
    if (d.width > 0 && d.height > 0) media.video = { width: d.width, height: d.height };
    stream.media = media;
    return stream;
  });
}

function secondsLeft(kind) {
  const e = loadShell(credentials()).error;
  return e && e.kind === kind && e.until && e.until > Date.now() ? Math.max(1, Math.ceil((e.until - Date.now()) / 1000)) : undefined;
}

export async function read(arg) {
  return guard(() => readBytes(arg));
}

/** imageSource: Telegram's thumbnail of a video TMDB has no poster for ({ handle: "t:<row id>" }). */
export async function image(arg) {
  return guard(() => imageBytes(arg));
}

export async function details(ref) {
  return guard(async () => {
    if (typeof ref !== "string" || ref.startsWith("setup:")) return null;
    let row;
    try { row = await rowFor(ref); } catch { return null; }
    const out = {};
    const tm = row.data.tm;
    if (tm && tm.o) out.overview = tm.o;
    else if (row.data.caption) out.overview = row.data.caption;
    const year = tm && tm.y ? tm.y : row.data.n && row.data.n.year ? String(row.data.n.year) : null;
    if (year) out.year = year;
    const poster = posterFor(row);
    if (poster) out.poster = poster;
    const backdrop = backdropOf(row);
    if (backdrop) out.backdrop = backdrop;
    if (row.data.duration > 0) out.runtimeMinutes = Math.min(1000, Math.max(1, Math.round(row.data.duration / 60)));
    return Object.keys(out).length ? out : null;
  });
}

export async function section({ tab } = {}) {
  return guard(async () => {
    const shell = loadShell(credentials());
    const channels = channelTabs(shell).slice(0, 7);
    const tabs = [{ id: "recent", label: t("tab.recent") }, ...channels.map((c) => ({ id: "c" + c.chatId, label: c.title.slice(0, 24) }))];
    const chosen = tabs.some((x) => x.id === tab) ? tab : "recent";
    const ref = chosen === "recent" ? "recent" : "chan:" + chosen.slice(1);
    const page = await browsePage(ref, null);
    const title = chosen === "recent" ? t("row.recent") : (channels.find((c) => "c" + c.chatId === chosen) || {}).title || t("row.recent");
    return { tabs, tab: chosen, rows: page.items.length ? [{ id: chosen, title, ref, items: page.items }] : [] };
  });
}

export async function categories() {
  return guard(async () => channelTabs(loadShell(credentials())).map((c) => ({ id: "c" + c.chatId, title: c.title.slice(0, 40), ref: "chan:" + c.chatId })));
}

export async function settingsStatus() {
  return guard(async () => {
    const login = await qrPoll(); // account mode: the QR to draw and how the login goes (asks Telegram only when due)
    const out = statusLines();
    if (login.status) out.account_status = login.status;
    if (login.qr) out.login_qr = login.qr;
    return out;
  });
}

export async function action(key) {
  return guard(async () => {
    if (key === "qr_login") return { message: await startQr() };
    if (key === "check_password") return confirmPassword();
    if (key === "logout") return logout();
    if (key === "free_slots") {
      const n = freeSlots();
      return { message: n ? t("free.done", { n }) : t("free.none") };
    }
    if (key === "forget") {
      await forget();
      return { message: t("action.forgot") };
    }
    if (key !== "refresh") return null;
    const { shell, added, problem } = await refresh({ force: true });
    if (problem) {
      if (problem.kind === "flood" || problem.kind === "budget") return { message: t(problem.kind === "flood" ? "setup.flood" : "setup.budget", { min: minutes((problem.until - Date.now()) / 1000) }) };
      const key2 = { config: credentials().mode === "account" ? "setup.configAccount" : "setup.config", token: "setup.token", api_id: "setup.apiId", network: "setup.network", signin: "setup.signin", closed: "setup.closed" }[problem.kind] || "setup.unavailable";
      return { message: t(key2) };
    }
    return { message: t("action.refreshed", { count: videoCount(shell.count), added }) };
  });
}

export async function validateSettings(values) {
  await null;
  const v = values || {};
  const out = {};
  if (v.api_id !== undefined && !/^\d{3,12}$/.test(String(v.api_id).trim())) out.api_id = t("validate.apiId");
  if (v.api_hash !== undefined && !/^[0-9a-fA-F]{32}$/.test(String(v.api_hash).trim())) out.api_hash = t("validate.apiHash");
  const account = v.access === "account";
  if (!account && (v.bot_token === undefined || !String(v.bot_token).trim())) out.bot_token = t("validate.tokenNeeded");
  else if (v.bot_token !== undefined && String(v.bot_token).trim() && !/^\d{3,15}:[A-Za-z0-9_-]{20,80}$/.test(String(v.bot_token).trim())) out.bot_token = t("validate.token");
  return Object.keys(out).length ? out : null;
}


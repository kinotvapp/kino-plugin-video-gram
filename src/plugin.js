// telegram-library: a personal Telegram video library for Kino. The person brings their own api_id/api_hash
// (my.telegram.org) and a bot (@BotFather) that administers their private channel(s); the plugin lists the channels'
// videos in Inicio and in search, and streams them through Kino's byteSource (`read`), seeking, Cast and DLNA included.
//
// Sources: src/mtproto/ (the MTProto client and the discovery), src/shell/ (this plugin). Built into one file by
// scripts/build.mjs (`npm run build`): the published plugin.js.
import { guard, shellError } from "./shell/errors.js";
import { credentials } from "./shell/live.js";
import { refresh, forget, homeRows, browsePage, searchPage, rowFor, loadShell, channelTabs, statusLines } from "./shell/library.js";
import { read as readBytes } from "./shell/read.js";
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
  try {
    return await homeRows(await refresh());
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
      throw shellError(["config", "token", "api_id", "flood", "budget"].includes(kind) ? kind : "unavailable", "setup notice", { seconds });
    }
    if (!credentials().complete) throw shellError("config");
    const row = await rowFor(ref);
    const d = row.data;
    const mime = playableMime(d.mime);
    const stream = { source: "plugin", handle: row.id, size: d.size, mime };
    if (d.duration > 0) stream.durationMs = Math.round(d.duration * 1000);
    const media = { title: row.title.slice(0, 120), sizeBytes: d.size };
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

export async function details(ref) {
  return guard(async () => {
    if (typeof ref !== "string" || ref.startsWith("setup:")) return null;
    let row;
    try { row = await rowFor(ref); } catch { return null; }
    const out = {};
    if (row.data.caption) out.overview = row.data.caption;
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
  return guard(async () => statusLines());
}

export async function action(key) {
  return guard(async () => {
    if (key === "forget") {
      await forget();
      return { message: t("action.forgot") };
    }
    if (key !== "refresh") return null;
    const { shell, added, problem } = await refresh({ force: true });
    if (problem) {
      if (problem.kind === "flood" || problem.kind === "budget") return { message: t(problem.kind === "flood" ? "setup.flood" : "setup.budget", { min: minutes((problem.until - Date.now()) / 1000) }) };
      const key2 = { config: "setup.config", token: "setup.token", api_id: "setup.apiId", network: "setup.network" }[problem.kind] || "setup.unavailable";
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
  if (v.bot_token !== undefined && !/^\d{3,15}:[A-Za-z0-9_-]{20,80}$/.test(String(v.bot_token).trim())) out.bot_token = t("validate.token");
  return Object.keys(out).length ? out : null;
}


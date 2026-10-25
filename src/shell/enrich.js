// Names and TMDB: what a video's file name (or caption) says it is, and what Kino's own TMDB access (kino.meta) knows
// about it. Pure pieces here (parseName, markerOf, queryOf, applyMeta, posterOf, displayTitle, needsLookup) plus the
// bounded pass the refresh runs (enrichStep): a few lookups per refresh, never from search or read, the answer kept in
// the catalog row's `data` (a hit for good, a miss for MISS_TTL_MS), so a family video is not asked again each time.

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
const TMDB_IMAGE = /^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]{1,12}(\/[A-Za-z0-9_-]{1,80}\.(?:jpg|jpeg|png|webp))$/;
const MAX_ID = 2147483647;
export const MISS_TTL_MS = 14 * 86400000;    // a title TMDB did not know is asked again after two weeks
const WALK_EVERY_MS = 86400000;              // a finished walk starts over at most once a day (only expired misses are asked)
const MAX_LOOKUPS = 4;                       // kino.meta calls per pass (Kino allows 30 a minute)
const ENRICH_MS = 6000;                      // no lookup starts once the pass has run this long
const META_MAX_MS = 8000;                    // what one kino.meta may take (Kino's cap)
const CALL_SAFE_MS = 18000;                  // a lookup must end before this, from the start of the call (Home has 20 s)
const SCAN_PAGES = 5;                        // catalog pages (100 rows) looked at per pass
const PAGE = 100;

const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm|m4v|ts|wmv|flv|mpg|mpeg|3gp|ogv|m2ts|mts)$/i;
const GENERIC = /^(?:vid|img|pxl|mov|mvi|dsc|gopr|video|telegram|file|record|rec|whatsapp video)[\s_-]?\d|^\d+$|^video$|^(?:untitled|sin título|sin titulo)$/i;

// ---- markers ----

const MARKER = /(?:themoviedb\.org\/(?:[a-z]{2}(?:-[A-Za-z]{2})?\/)?(movie|tv)\/(\d{1,11})|(?<![A-Za-z0-9])tmdb(?:id)?(?:\s*[-=:]\s*|(?=\d))(?:(movie|tv)\s*[-=:/]\s*)?(\d{1,11}))(?!\d)/i;

/** The TMDB id a text names ({tmdb-603}, [tmdbid=603], tmdb:603, tmdbid603, a themoviedb.org URL), or null. */
export function markerOf(text) {
  if (typeof text !== "string" || !text) return null;
  const m = MARKER.exec(text);
  if (!m) return null;
  const id = Number(m[2] || m[4]);
  if (!Number.isSafeInteger(id) || id < 1 || id > MAX_ID) return null;
  const hint = (m[1] || m[3] || "").toLowerCase();
  return hint === "tv" ? { id, type: "series" } : hint === "movie" ? { id, type: "movie" } : { id };
}

/** The text without its markers and URLs (a marker in brackets goes with its brackets). */
function withoutMarkers(text) {
  let s = String(text);
  for (let i = 0; i < 4; i++) {
    const m = MARKER.exec(s);
    if (!m) break;
    let a = m.index, b = m.index + m[0].length;
    if (/^[[{(]$/.test(s[a - 1] || "")) { a--; if (/^[\]})]$/.test(s[b] || "")) b++; }
    s = s.slice(0, a) + " " + s.slice(b);
  }
  return s.replace(/(?:https?:\/\/)?(?:www\.)?themoviedb\.org\/\S*/gi, " ").replace(/https?:\/\/\S+/gi, " ");
}

// ---- release junk ----

const JUNK = new Set([
  "4k", "uhd", "fhd", "hd", "sd", "hdr", "hdr10", "hdr10+", "dv", "sdr", "hevc", "avc", "xvid", "divx", "av1", "vp9",
  "bluray", "blu-ray", "bdrip", "brrip", "bdremux", "remux", "bd", "dvdrip", "dvdscr", "dvd", "hdtv", "hdrip", "hdcam",
  "webrip", "web-dl", "webdl", "web-rip", "telesync", "screener", "cam", "ts", "atmos", "truehd", "flac", "mp3", "aac",
  "ac3", "eac3", "dts", "dts-hd", "nf", "amzn", "dsnp", "hmax", "atvp", "multi", "dual", "latino", "lat", "castellano",
  "español", "espanol", "spanish", "english", "eng", "esp", "ita", "italian", "french", "korean", "japanese", "sub",
  "subs", "subtitulado", "subtitulada", "vose", "vos", "vo", "dublado", "extended", "unrated", "remastered", "proper",
  "repack", "internal", "limited", "imax", "uncut", "x264", "x265", "h264", "h265",
]);
const JUNK_RE = [/^\d{3,4}[pi]$/, /^[xh]\.?26[45]$/, /^(?:dd|ddp|eac3|ac3|aac|dts)\d/, /^\d{1,2}bit$/, /^\d\.\d$/];

function isJunk(token) {
  const t = token.toLowerCase().replace(/^[([{]+|[)\]}]+$/g, "");
  if (!t) return false;
  const head = t.split("-")[0];
  return JUNK.has(t) || JUNK.has(head) || JUNK_RE.some((r) => r.test(t) || r.test(head));
}

const MAX_YEAR = new Date().getFullYear() + 1;
const YEAR_TOKEN = /(?:^|[\s([])((?:19|20)\d{2})(?=$|[\s)\]])/g;
const EPISODE = [
  /(?:^|[^A-Za-z0-9])S(\d{1,2})\s?E(\d{1,3})(?![0-9])/i,
  /(?:^|[^A-Za-z0-9])T(\d{1,2})\s?E(\d{1,3})(?![0-9])/i,
  /(?:^|[^A-Za-z0-9])(\d{1,2})x(\d{2,3})(?![0-9])/i,
  /(?:^|[^A-Za-z0-9])(?:temporada|season|temp)\s*(\d{1,2})\s*-?\s*(?:cap[ií]tulo|cap|episodio|episode|ep)\s*(\d{1,3})(?![0-9])/i,
];

const SMALL = new Set(["de", "del", "la", "las", "el", "los", "y", "e", "o", "a", "en", "con", "por", "para", "un", "una", "of", "the", "and", "an", "in", "on", "at", "to", "for"]);
function titleCase(s) {
  return s.toLowerCase().split(" ").map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");
}
const tidy = (s) => s.replace(/\s+/g, " ").replace(/^[\s\-–—:,;.|]+|[\s\-–—:,;.|]+$/g, "").trim();

/** One name (a file's base or a caption's first line) as { title, year?, season?, episode? }. */
function parseOne(raw) {
  let s = withoutMarkers(raw).replace(/[._]/g, " ");
  s = s.replace(/\[\s*((?:19|20)\d{2})\s*\]/g, " ($1) ");                // [2019] is a year
  s = s.replace(/\[[^\]]*\]|\{[^}]*\}/g, " ");                           // [Group], [1080p HEVC], {hash}
  s = s.replace(/\(([^)]*)\)/g, (all, inner) => (inner.trim() && inner.trim().split(/\s+/).every(isJunk) ? " " : all));
  s = s.replace(/\s+/g, " ").trim();
  const out = {};
  for (const re of EPISODE) {
    const m = re.exec(s);
    if (!m) continue;
    out.season = Number(m[1]);
    out.episode = Number(m[2]);
    s = s.slice(0, m.index); // the match starts at the separator before it (or at the start)
    break;
  }
  let year = null, cut = -1;
  for (const m of s.matchAll(YEAR_TOKEN)) {
    const at = m.index + m[0].indexOf(m[1]);
    const y = Number(m[1]);
    if (y > MAX_YEAR || !tidy(s.slice(0, at).replace(/\($/, ""))) continue;
    year = y;
    cut = at;
  }
  if (cut >= 0) s = s.slice(0, cut).replace(/\(\s*$/, "");
  const tokens = s.split(" ").filter(Boolean);
  const j = tokens.findIndex((t, i) => i > 0 && isJunk(t));
  let title = tidy((j > 0 ? tokens.slice(0, j) : tokens).join(" "));
  const letters = title.replace(/[^\p{L}]/gu, "");
  if (letters && (letters === letters.toLowerCase() || letters === letters.toUpperCase())) title = titleCase(title);
  out.title = title.slice(0, 200);
  if (year) out.year = year;
  return out;
}

const firstLine = (text) => (String(text || "").split("\n").map((l) => l.trim()).find(Boolean) || "");

/**
 * What a video is, from its file name and caption: { title, year?, type: "movie" | "series", season?, episode?,
 * tmdbId? }. The title is the normalised name (extension, markers, release tags and separators gone, accents kept, Title
 * Case only when the name was all lower or upper case). A marker in the caption wins over one in the name; the caption's
 * first line names a video whose file name is missing or a camera's (VID_2024..., IMG_1234, video).
 */
export function parseName(fileName, caption) {
  const base = String(fileName || "").replace(VIDEO_EXT, "").trim();
  const cap = String(caption || "");
  const marker = markerOf(cap) || markerOf(base);
  let parsed = base && !GENERIC.test(base) ? parseOne(base) : null;
  if (!parsed || !parsed.title) {
    const fromCaption = parseOne(firstLine(cap));
    if (fromCaption.title) parsed = fromCaption;
    else if (!parsed) parsed = parseOne(base);
  }
  const out = { title: parsed.title };
  if (parsed.year) out.year = parsed.year;
  out.type = marker && marker.type ? marker.type : parsed.season !== undefined ? "series" : "movie";
  if (parsed.season !== undefined) { out.season = parsed.season; out.episode = parsed.episode; }
  if (marker) out.tmdbId = marker.id;
  return out;
}

// ---- kino.meta ----

/** The kino.meta query for a parsed name: by id when a marker gave one, else by title (Kino 0.9.55+), else null. */
export function queryOf(n, byTitle) {
  if (!n) return null;
  const type = n.type === "series" ? "series" : "movie";
  if (n.tmdbId) return { type, ids: { tmdb: n.tmdbId } };
  const title = String(n.title || "").trim().slice(0, 200);
  if (!byTitle || !title) return null;
  const q = { type, title };
  if (n.year && n.year >= 1870 && n.year <= 2100) q.year = n.year;
  return q;
}

/** A key for what a row would ask: the row's answer is kept while it stays the same (an edited caption asks again). */
export const keyOf = (q) => (q ? (q.ids ? q.type + "|" + q.ids.tmdb : q.type + "|" + q.title.toLowerCase() + "|" + (q.year || "")) : "");

const pathOf = (url) => { const m = typeof url === "string" ? TMDB_IMAGE.exec(url) : null; return m ? m[1] : null; };
const clip = (s, n) => { let x = String(s || "").replace(/\s+/g, " ").trim().slice(0, n); if (/[\uD800-\uDBFF]$/.test(x)) x = x.slice(0, -1); return x; };

/** The catalog title: every name the video goes by, so a search finds it by TMDB's title or by its file's. */
function searchTitle(names) {
  const seen = new Set();
  const out = [];
  for (const n of names) {
    const x = clip(n, 300);
    if (!x || seen.has(x.toLowerCase())) continue;
    seen.add(x.toLowerCase());
    out.push(x);
  }
  return clip(out.join(" / "), 300) || "Video";
}

/** The row with kino.meta's answer kept small in data.tm (a hit), or a negative record (null: nobody knew it). */
export function applyMeta(row, m, now = Date.now()) {
  const d = { ...(row.data || {}) };
  const file = d.file || row.title;
  if (!m || typeof m !== "object" || !m.title) {
    d.tm = { at: now, miss: true };
    return { id: row.id, title: row.title, sort: row.sort, data: d };
  }
  const tm = { at: now };
  const id = Number(m.ids && m.ids.tmdb);
  if (Number.isSafeInteger(id) && id > 0) tm.id = id;
  tm.t = clip(m.title, 120);
  if (m.year) tm.y = clip(m.year, 10);
  if (m.overview) tm.o = clip(m.overview, 160);
  const p = pathOf(m.poster), b = pathOf(m.backdrop);
  if (p) tm.p = p;
  if (b) tm.b = b;
  d.tm = tm;
  if (!d.file) d.file = clip(file, 200);
  return { id: row.id, title: searchTitle([tm.t, d.n && d.n.title, file]), sort: row.sort, data: d };
}

/** Whether a row should be asked about: never asked, or a miss that expired. A hit is kept. */
export function needsLookup(row, now = Date.now()) {
  const tm = row && row.data && row.data.tm;
  if (!tm) return true;
  return tm.miss === true && now - (Number(tm.at) || 0) > MISS_TTL_MS;
}

/** TMDB's poster for the row (w342), or null. */
export function posterOf(row) {
  const tm = row && row.data && row.data.tm;
  return tm && tm.p ? POSTER_BASE + tm.p : null;
}
export function backdropOf(row) {
  const tm = row && row.data && row.data.tm;
  return tm && tm.b ? BACKDROP_BASE + tm.b : null;
}

const two = (n) => String(n).padStart(2, "0");
/** What a card says: TMDB's title, else the normalised name, else the catalog title; an episode keeps its SxxExx. */
export function displayTitle(data, fallback) {
  const d = data || {};
  const n = d.n || null;
  const name = (d.tm && d.tm.t) || (n && n.title) || fallback || "Video";
  return n && n.season !== undefined && n.episode !== undefined ? name + " S" + two(n.season) + "E" + two(n.episode) : name;
}

/** The parsed name and its lookup key for a fresh row (rowOf), from the entry's file name and caption. */
export function nameOf(fileName, caption, fallbackTitle) {
  const n = parseName(fileName || fallbackTitle || "", caption || "");
  return { n, pk: keyOf(queryOf(n, true)), title: searchTitle([n.title, fallbackTitle]) };
}

/** The new row keeps the old one's answer when it would ask the same thing (a discovery edit, a refetched reference). */
export function carry(old, row) {
  if (old && old.data && old.data.tm && old.data.pk === row.data.pk) {
    const d = { ...row.data, tm: old.data.tm };
    if (old.data.file) d.file = old.data.file;
    return { ...row, title: old.title, data: d };
  }
  return row;
}

// ---- the pass ----

/**
 * One bounded enrichment pass over the catalog, newest first, from where the last pass stopped (shell.en). At most
 * MAX_LOOKUPS kino.meta calls, none started after ENRICH_MS of the pass or when it could not end before CALL_SAFE_MS
 * of the call. A failure of kino.meta (rate_limited, unavailable, a timeout) stops the pass and marks nothing. Never
 * throws: answers how many lookups it made.
 */
export async function enrichStep(shell, started, { skip = () => false } = {}) {
  if (typeof kino === "undefined" || typeof kino.meta !== "function") return 0;
  const byTitle = kino.meta.byTitle === true;
  const st = shell.en || (shell.en = { off: 0, at: 0, done: false });
  const t0 = Date.now();
  if (st.done && t0 - (st.at || 0) < WALK_EVERY_MS) return 0;
  if (st.done) { st.off = 0; st.done = false; }
  let asked = 0;
  const updates = [];
  try {
    let stop = false;
    for (let p = 0; p < SCAN_PAGES && !stop; p++) {
      const page = await kino.catalog.search({ limit: PAGE, offset: st.off, order: "newest" });
      for (const row of page.items) {
        if (skip(row) || !row.data || !row.data.n || !needsLookup(row, Date.now())) { st.off++; continue; }
        const q = queryOf(row.data.n, byTitle);
        if (!q) {
          // Nothing to ask with: a miss for good, except a title this Kino cannot look up yet (no kino.meta.byTitle):
          // left unmarked, so a Kino that can asks for it.
          if (!(row.data.n.title && !byTitle)) updates.push(applyMeta(row, null, Date.now()));
          st.off++;
          continue;
        }
        const now = Date.now();
        if (asked >= MAX_LOOKUPS || now - t0 >= ENRICH_MS || now + META_MAX_MS > started + CALL_SAFE_MS) { stop = true; break; }
        asked++;
        let m;
        try {
          m = await kino.meta(q);
        } catch (e) {
          if (e && e.code === "invalid_request") { updates.push(applyMeta(row, null, Date.now())); st.off++; continue; }
          kino.log("tmdb lookup stopped: " + (e && typeof e.code === "string" ? e.code : "error"));
          stop = true;
          break;
        }
        updates.push(applyMeta(row, m, Date.now()));
        st.off++;
      }
      if (!stop && st.off >= page.total) { st.done = true; st.at = Date.now(); break; }
      if (page.items.length === 0) break;
    }
  } catch (e) {
    kino.log("tmdb pass failed: " + (e && typeof e.code === "string" ? e.code : "error"));
  }
  try {
    for (let i = 0; i < updates.length; i += 500) await kino.catalog.upsert(updates.slice(i, i + 500));
  } catch (e) {
    kino.log("tmdb results not saved: " + (e && typeof e.code === "string" ? e.code : "error"));
  }
  return asked;
}

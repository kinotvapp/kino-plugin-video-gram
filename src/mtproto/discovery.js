// Video discovery for a logged-in bot: which videos sit in the channels the bot administers and in private chats with
// it. Bots cannot list dialogs or read history (messages.getHistory answers BOT_METHOD_INVALID), so everything comes
// from the update boxes, as measured live on layer 198:
//   - updates.getDifference from pts=1, date=1, qts=-1 replays the common box: private messages in new_messages,
//     channel posts as UpdateNewChannelMessage in other_updates, and the chats vector carries each Channel with its
//     access_hash (the only way a bot learns a channel);
//   - updates.getChannelDifference from pts=1 lists a channel's history from the start, page by page until `final`;
//   - channels.getMessages / messages.getMessages re-read single messages (a fresh file_reference).
// The index and the update state are saved together under one storage key, so they can never disagree.
//
// Degrading safely (Kino's plugin storage is 256 KB for ALL keys and a write over it throws):
//   - the saved value never exceeds `budgetBytes` (default 160 000, room for the client's own keys): the oldest
//     entries are left out of the saved copy first (`truncated`), the in-memory index keeps them all;
//   - a write the store refuses never throws: the result says `persisted: false`, the progress stays in memory and the
//     next operation in the same runtime continues from it instead of redoing the same pages;
//   - one channel that fails (an unparsable answer, an rpc error such as CHAT_ADMIN_REQUIRED) is reported in `errors`
//     and keeps its pts; the other channels go on. A failed common-box answer keeps the common state, and the known
//     channels are still scanned. Flood waits stop the scan and keep the progress.
//
// For a shell that keeps the index elsewhere (Kino's kino.catalog), `persistEntries: false` saves only the update
// state (pts, channels) and gives each refresh its `changes`: the entries added or edited, the keys removed, the channel
// chats dropped (forbidden or invalid: every entry of that chat is gone) and the common-box message ids deleted (private
// chats and basic groups, whose chat the update does not name). Nothing of the index stays in memory between calls.
//
// Known gap: after updates.differenceTooLong the common box jumps to a fresh getState. What happened in the gap is
// skipped: a channel the bot joined during it shows up only with its next post (or another update naming it), and
// private-chat videos sent during it are lost. Known channels are rescanned from pts 1, so their videos are not lost.
import { mtError } from "./errors.js";
import { toHex } from "./bytes.js";
import { decode } from "./schema/reader.js";
import { getState, getDifference, getChannelDifference, channelsGetMessages, messagesGetMessages } from "./requests.js";

const STATE_KEY = "tg.discovery";
const VERSION = 1;
const CHANNEL_LIMIT = 100;
const BATCH = 100;
const DEFAULT_BUDGET_BYTES = 160000;
const MAX_TITLE = 200, MAX_CAPTION = 200, MAX_CHAT_TITLE = 100;
const cap = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n) : s; };
// Errors that belong to one answer (one channel, or the common box) and must not stop the others.
const ISOLATED = new Set(["protocol", "rpc_error", "bot_method_invalid"]);
const errorOf = (e) => ({ code: e && e.code ? e.code : "error", message: String(e && e.message) });
const CHANNEL_BASE = 1000000000000n; // Bot API chat ids: channel -> -(1e12 + id), basic group -> -id, user -> id

// The updates the index needs; every other Update is walked without being built.
const KEEP_UPDATES = new Set([
  "updateNewMessage", "updateEditMessage", "updateDeleteMessages",
  "updateNewChannelMessage", "updateEditChannelMessage", "updateDeleteChannelMessages", "updateChannel", "updateChannelTooLong",
]);
// Types inside messages/chats/users the index never reads.
const SKIP_TYPES = new Set([
  "MessageEntity", "ReplyMarkup", "MessageReactions", "MessageReplies", "MessageFwdHeader", "MessageReplyHeader", "MessageAction",
  "RestrictionReason", "FactCheck", "PhotoSize", "VideoSize", "Photo", "ChatPhoto", "UserProfilePhoto", "UserStatus", "PeerColor",
  "EmojiStatus", "ChatAdminRights", "ChatBannedRights", "Username", "ForumTopic", "PeerNotifySettings", "DraftMessage", "EncryptedMessage",
]);
const skip = (name, type) => (type === "Update" ? !KEEP_UPDATES.has(name) : SKIP_TYPES.has(type));
const VIDEO_MIMES = new Set(["application/x-matroska", "application/mp4", "application/x-mpegurl", "application/vnd.apple.mpegurl"]);

/** The Bot API style chat id of a Peer: "-100<id>" for a channel, "-<id>" for a basic group, "<id>" for a user. */
export function chatIdOf(peer) {
  if (!peer) return null;
  if (peer._ === "peerChannel") return String(-(CHANNEL_BASE + BigInt(peer.channel_id)));
  if (peer._ === "peerChat") return String(-BigInt(peer.chat_id));
  if (peer._ === "peerUser") return String(BigInt(peer.user_id));
  return null;
}
/** The raw channel id (decimal string) of a channel chat id, or null for other chats. */
function channelIdOfChat(chatId) {
  let n;
  try { n = BigInt(chatId); } catch { return null; }
  return n < -CHANNEL_BASE ? String(-n - CHANNEL_BASE) : null;
}
const channelChatId = (channelId) => String(-(CHANNEL_BASE + BigInt(channelId)));

function firstLine(text) {
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (t) return t;
  }
  return "";
}
function titleFrom(fileName, caption, msgId) {
  if (fileName) {
    const dot = fileName.lastIndexOf(".");
    const base = (dot > 0 ? fileName.slice(0, dot) : fileName).trim();
    if (base) return cap(base, MAX_TITLE);
  }
  return cap(firstLine(caption) || "Video " + msgId, MAX_TITLE);
}

/**
 * A Message as an IndexEntry when it carries a video document, else null. Text is capped to keep the saved index
 * small: title and caption (its first non-empty line) at most 200 characters, chatTitle at most 100.
 */
export function videoEntry(msg, chatTitle = "") {
  if (!msg || msg._ !== "message" || !msg.media || msg.media._ !== "messageMediaDocument") return null;
  const doc = msg.media.document;
  if (!doc || doc._ !== "document") return null;
  let video = null, fileName = null, notVideo = false;
  for (const a of doc.attributes || []) {
    if (a._ === "documentAttributeVideo") video = a;
    else if (a._ === "documentAttributeFilename") fileName = a.file_name;
    else if (a._ === "documentAttributeAnimated" || a._ === "documentAttributeSticker" || a._ === "documentAttributeCustomEmoji") notVideo = true;
  }
  const mime = String(doc.mime_type || "").toLowerCase();
  if (notVideo || !(mime.startsWith("video/") || VIDEO_MIMES.has(mime) || video)) return null;
  const size = Number(doc.size);
  if (!(size > 0)) return null;
  const chatId = chatIdOf(msg.peer_id);
  if (chatId === null) return null;
  const caption = msg.message || "";
  return {
    key: chatId + ":" + msg.id,
    chatId,
    msgId: msg.id,
    chatTitle: cap(chatTitle, MAX_CHAT_TITLE),
    title: titleFrom(fileName, caption, msg.id),
    caption: cap(firstLine(caption), MAX_CAPTION),
    size,
    mime: doc.mime_type,
    duration: video ? video.duration : null,
    width: video ? video.w : null,
    height: video ? video.h : null,
    date: msg.date,
    doc: { id: String(doc.id), accessHash: String(doc.access_hash), fileReference: toHex(doc.file_reference), dcId: doc.dc_id },
  };
}

// ---- persisted state ----

const isInt = (v) => Number.isInteger(v);
const isLongString = (v) => typeof v === "string" && /^-?\d{1,20}$/.test(v);
const fresh = () => ({ version: VERSION, pts: 0, qts: 0, date: 0, seq: 0, channels: {}, entries: [] });

function validChannel(c) {
  if (!c || typeof c !== "object" || !isLongString(c.accessHash) || typeof c.title !== "string" || !isInt(c.pts) || c.pts < 1) return false;
  if (c.backfill !== undefined && !(c.backfill && isInt(c.backfill.next) && isInt(c.backfill.to))) return false;
  return true;
}
function validEntry(e) {
  return e && typeof e === "object" && typeof e.key === "string" && typeof e.chatId === "string" && isInt(e.msgId) &&
    e.doc && isLongString(e.doc.id) && isLongString(e.doc.accessHash) && typeof e.doc.fileReference === "string";
}
/** The saved state, or a fresh one when it is missing, damaged or from another version (never throws). */
function parseState(raw) {
  let v;
  try { v = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return fresh(); }
  if (!v || typeof v !== "object" || Array.isArray(v) || v.version !== VERSION) return fresh();
  if (![v.pts, v.qts, v.date, v.seq].every(isInt) || v.pts < 0) return fresh();
  if (!v.channels || typeof v.channels !== "object" || Array.isArray(v.channels) || !Array.isArray(v.entries)) return fresh();
  for (const [id, c] of Object.entries(v.channels)) if (!/^\d{1,20}$/.test(id) || !validChannel(c)) return fresh();
  if (!v.entries.every(validEntry)) return fresh();
  return { version: VERSION, pts: v.pts, qts: v.qts, date: v.date, seq: v.seq, channels: v.channels, entries: v.entries };
}
const publicState = (st) => ({ version: st.version, pts: st.pts, qts: st.qts, date: st.date, seq: st.seq, channels: JSON.parse(JSON.stringify(st.channels)) });
const sorted = (index) => [...index.values()].sort((a, b) => (b.date - a.date) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

/** UTF-8 length of a string (what a byte limit counts). */
function utf8Length(s) {
  let n = s.length;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) continue;
    n += c < 0x800 || (c >= 0xd800 && c <= 0xdfff) ? 1 : 2; // 2 bytes; a surrogate half (2 of a 4-byte pair); 3 bytes
  }
  return n;
}
// The stored value is a string inside the storage map's own JSON, so it is measured escaped, as JSON.stringify(value).
const storedCost = (s) => utf8Length(JSON.stringify(s));

/**
 * A Map that records what an operation did to an index it does not hold (persistEntries false): `set` is an upsert,
 * `delete` a removal (even of a key it never held), plus the chats dropped and the common-box ids deleted.
 */
class Journal extends Map {
  constructor() { super(); this.removed = new Set(); this.droppedChats = []; this.commonDeletedIds = []; }
  set(k, v) { this.removed.delete(k); return super.set(k, v); }
  delete(k) { const had = super.delete(k); this.removed.add(k); return had; }
  changes() {
    return { upserted: sorted(this), removed: [...this.removed].sort(), droppedChats: [...this.droppedChats], commonDeletedIds: [...this.commonDeletedIds] };
  }
}

/**
 * createDiscovery({ client, store, budgetBytes = 160000, persistEntries = true }): `client` a logged-in TelegramClient (its `call`), `store`
 * the same get/set storage the client uses, `budgetBytes` the most the saved value may take (pass more when the
 * plugin has a larger storage quota). Operations run one at a time; each starts from the in-memory state when this
 * runtime has one that is newer than (or equal to) the saved copy, else from the saved state.
 */
export function createDiscovery({ client, store, budgetBytes = DEFAULT_BUDGET_BYTES, persistEntries = true, now = () => Date.now(), log = () => {} }) {
  if (!client || typeof client.call !== "function") throw mtError("invalid_request", "createDiscovery needs a TelegramClient");
  if (!store || typeof store.get !== "function" || typeof store.set !== "function") throw mtError("invalid_request", "createDiscovery needs a get/set store");
  let chain = Promise.resolve();
  const serial = (fn) => { const run = chain.then(fn, fn); chain = run.then(() => {}, () => {}); return run; };

  if (!Number.isFinite(budgetBytes) || budgetBytes < 1000) throw mtError("invalid_request", "budgetBytes must be at least 1000");
  // This runtime's state: `raw` is the value it last wrote (or read); `unsaved` when the last write failed.
  let mem = null;
  const load = () => {
    let raw = null;
    try { raw = store.get(STATE_KEY); } catch { raw = null; }
    if (mem && (mem.unsaved || raw === mem.raw)) return mem;
    const st = parseState(raw);
    mem = { raw, unsaved: false, st, index: new Map(persistEntries ? st.entries.map((e) => [e.key, e]) : []) };
    return mem;
  };
  /** This operation's state and index: the kept index, or (persistEntries false) a fresh Journal. */
  const begin = () => { const m = load(); return { st: m.st, index: persistEntries ? m.index : new Journal() }; };
  /**
   * Writes state + index within budgetBytes (newest entries first, the oldest left out); never throws.
   * -> { persisted, truncated, error? }
   */
  const save = (st, index) => {
    const head = JSON.stringify(publicState(st));
    const all = persistEntries ? sorted(index) : [];
    let room = budgetBytes - storedCost(head.slice(0, -1) + ',"entries":[]}');
    let n = 0;
    for (; n < all.length; n++) {
      const cost = storedCost(JSON.stringify(all[n])) - 2 + 1; // without the outer quotes, plus a comma
      if (cost > room) break;
      room -= cost;
    }
    const text = head.slice(0, -1) + ',"entries":[' + all.slice(0, n).map((e) => JSON.stringify(e)).join(",") + "]}";
    const truncated = n < all.length;
    try {
      store.set(STATE_KEY, text);
      mem.raw = text;
      mem.unsaved = false;
      return { persisted: true, truncated };
    } catch (e) {
      mem.unsaved = true;
      log("discovery state not saved: " + (e && e.message));
      return { persisted: false, truncated, error: { scope: "storage", code: "storage", message: String(e && e.message) } };
    }
  };
  // `deadline` (a time of the client's clock) bounds each request: it never starts too late and never waits past it.
  const call = async (body, expect, deadline) => decode(await client.call(body, { deadline: Number.isFinite(deadline) ? deadline : undefined }), { expect, skip });

  /** What one answer teaches: channels (with their access hash) and chat titles. */
  function learn(st, titles, chats, users, index) {
    for (const c of chats || []) {
      if (c._ === "channel") {
        const id = String(c.id);
        const known = st.channels[id];
        const title = cap(c.title, MAX_CHAT_TITLE);
        titles.set(channelChatId(id), title);
        if (c.min || c.access_hash === undefined) { if (known) known.title = title; continue; } // a min hash is not usable
        if (known) { known.accessHash = String(c.access_hash); known.title = title; }
        else st.channels[id] = { accessHash: String(c.access_hash), title, pts: 1 };
      } else if (c._ === "channelForbidden") {
        dropChannel(st, index, String(c.id));
      } else if (c._ === "chat" || c._ === "chatForbidden") {
        titles.set(String(-BigInt(c.id)), c.title);
      }
    }
    for (const u of users || []) {
      if (u._ !== "user") continue;
      titles.set(String(u.id), [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username || "");
    }
  }
  function dropChannel(st, index, id) {
    delete st.channels[id];
    if (index instanceof Journal) index.droppedChats.push(channelChatId(id));
    const prefix = channelChatId(id) + ":";
    for (const k of [...index.keys()]) if (k.startsWith(prefix)) index.delete(k);
  }
  const titleOf = (st, titles, chatId) => {
    if (titles.has(chatId)) return titles.get(chatId);
    const ch = channelIdOfChat(chatId);
    return ch && st.channels[ch] ? st.channels[ch].title : "";
  };
  /** A new or edited message: index it when it is a video, otherwise make sure it is not indexed. */
  function putMessage(st, index, titles, msg, authoritative = false) {
    if (!msg || (msg._ !== "message" && msg._ !== "messageService" && msg._ !== "messageEmpty")) return;
    const chatId = chatIdOf(msg.peer_id);
    const e = videoEntry(msg, chatId === null ? "" : titleOf(st, titles, chatId));
    if (e) {
      const old = index.get(e.key);
      if (!e.chatTitle && old) e.chatTitle = old.chatTitle;
      index.set(e.key, e);
    } else if (chatId !== null && (authoritative || index.has(chatId + ":" + msg.id))) {
      // An edit or a re-read message that is no video (any more) removes its entry; a new text post has none to remove.
      index.delete(chatId + ":" + msg.id);
    }
  }
  function applyUpdates(st, index, titles, updates) {
    for (const u of updates || []) {
      switch (u._) {
        case "updateNewMessage": case "updateNewChannelMessage":
          putMessage(st, index, titles, u.message);
          break;
        case "updateEditMessage": case "updateEditChannelMessage":
          putMessage(st, index, titles, u.message, true);
          break;
        case "updateDeleteChannelMessages": {
          const prefix = channelChatId(u.channel_id) + ":";
          for (const id of u.messages) index.delete(prefix + id);
          break;
        }
        case "updateDeleteMessages": {
          // Common-box ids (private chats and basic groups) are unique per account, so they need no chat.
          const ids = new Set(u.messages);
          if (index instanceof Journal) index.commonDeletedIds.push(...u.messages);
          for (const [k, e] of index) if (channelIdOfChat(e.chatId) === null && ids.has(e.msgId)) index.delete(k);
          break;
        }
        default: break; // updateChannel / updateChannelTooLong: every known channel is scanned anyway
      }
    }
  }
  const applyMessages = (st, index, titles, messages) => { for (const m of messages || []) putMessage(st, index, titles, m); };
  /** channels.getMessages / messages.getMessages answers: a messageEmpty means the message is gone. */
  function applyFetched(st, index, titles, res, chatIdFor) {
    learn(st, titles, res.chats, res.users, index);
    const found = [];
    for (const m of res.messages || []) {
      if (m._ === "messageEmpty") { const c = chatIdFor(m); if (c !== null) index.delete(c + ":" + m.id); continue; }
      putMessage(st, index, titles, m, true);
      const c = chatIdOf(m.peer_id);
      const e = c !== null && index.get(c + ":" + m.id);
      if (e) found.push(e);
    }
    return found;
  }
  const setState = (st, s) => { st.pts = s.pts; st.qts = s.qts; st.date = s.date; st.seq = s.seq; };

  /**
   * Options: `shouldScan(channelId)` skips channels; `deadline` (a time of `now()`) stops early like maxPages does;
   * `commit: false` saves nothing and answers `commit()`, which the caller runs once its own writes succeeded (until
   * then, and when the pass throws, the next operation starts from the saved state again).
   * refresh({ maxPages = 20 }) -> { entries, newCount, state, incomplete?, floodWait? }: reads the common box (from
   * pts 1 on the first run, else from the saved state), then every known channel from its saved pts, at most
   * `maxPages` calls in all. `entries` is the whole index (newest first), `newCount` how many keys it gained.
   * FLOOD_WAIT stops the scan with `floodWait` (seconds) and keeps the progress; `incomplete` means call again.
   * Also: `persisted` (false when the store refused the write), `truncated` (the saved copy left the oldest entries
   * out), `errors` [{ scope: "common" | "channel" | "storage", channelId?, code, message }] for what was isolated.
   */
  function refresh({ maxPages = 20, shouldScan = null, commit = true, deadline = Infinity } = {}) {
    return serial(async () => {
      const deferred = commit === false;
      const { st, index } = begin();
      const before = new Set(index.keys());
      const titles = new Map();
      const errors = [];
      let pages = 0, incomplete = false, floodWait;
      // A page is not started with under 1.5 s left before the deadline (it could not finish in time).
      const spend = () => { if (pages >= maxPages || now() + 1500 >= deadline) { incomplete = true; return false; } pages++; return true; };
      try {
        // 1. the common box
        let req = st.pts > 0 ? { pts: st.pts, date: st.date, qts: st.qts } : { pts: 1, date: 1, qts: -1 };
        for (;;) {
          if (!spend()) break;
          let d;
          try {
            d = await call(getDifference(req), "updates.Difference", deadline);
          } catch (e) {
            if (!ISOLATED.has(e.code)) throw e;
            errors.push({ scope: "common", ...errorOf(e) }); // the common state stays where it was
            break;
          }
          if (d._ === "updates.differenceEmpty") {
            if (st.pts === 0) { st.pts = req.pts; st.qts = Math.max(0, req.qts); }
            st.date = d.date; st.seq = d.seq;
            break;
          }
          if (d._ === "updates.differenceTooLong") {
            if (!spend()) break;
            let fresh;
            try {
              fresh = await call(getState(), "updates.State", deadline);
            } catch (e) {
              if (!ISOLATED.has(e.code)) throw e;
              errors.push({ scope: "common", ...errorOf(e) });
              break;
            }
            setState(st, fresh);
            for (const c of Object.values(st.channels)) { c.pts = 1; delete c.backfill; }
            break;
          }
          learn(st, titles, d.chats, d.users, index);
          applyMessages(st, index, titles, d.new_messages);
          applyUpdates(st, index, titles, d.other_updates);
          if (d._ === "updates.difference") { setState(st, d.state); break; }
          setState(st, d.intermediate_state);
          req = { pts: st.pts, date: st.date, qts: st.qts };
        }
        // 2. every known channel
        if (!incomplete) {
          for (const id of Object.keys(st.channels)) {
            if (incomplete) break;
            if (shouldScan && !shouldScan(id)) continue; // left where it is: its pts does not move
            try {
              await scanChannel(st, index, titles, id, spend, deadline);
            } catch (e) {
              if (e.code === "channel_invalid") {
                log("channel " + id + " dropped: " + e.message);
                dropChannel(st, index, id);
              } else if (ISOLATED.has(e.code)) {
                // The failed page was not applied, so the channel's pts is still the last one fully read.
                log("channel " + id + " skipped: " + e.message);
                errors.push({ scope: "channel", channelId: id, ...errorOf(e) });
              } else {
                throw e;
              }
            }
          }
        }
      } catch (e) {
        const outOfTime = e.code === "timeout" && e.deadline === true; // the caller's deadline: stop like maxPages does
        if (e.code !== "flood_wait" && !outOfTime) {
          if (deferred) mem = null; // nothing of this pass is kept: the next one starts from the saved state
          else save(st, index); // save never throws, so `e` is what surfaces
          throw e;
        }
        incomplete = true;
        if (!outOfTime) floodWait = e.seconds;
      }
      let saved = { persisted: false };
      let pending = null;
      if (deferred) { pending = mem; mem = null; } // until commit(), the next operation reads the saved state
      else saved = save(st, index);
      if (saved.error) errors.push(saved.error);
      let newCount = 0;
      for (const k of index.keys()) if (!before.has(k)) newCount++;
      const out = { entries: sorted(index), newCount, state: publicState(st), persisted: saved.persisted, errors };
      // commit: false: the caller writes `changes` somewhere first, then calls commit() to save this pass's progress.
      if (deferred) out.commit = () => { mem = pending; return save(st, index); };
      if (saved.truncated) out.truncated = true;
      if (incomplete) out.incomplete = true;
      if (floodWait !== undefined) out.floodWait = floodWait;
      out.pages = pages;
      if (index instanceof Journal) out.changes = index.changes();
      return out;
    });
  }

  async function scanChannel(st, index, titles, id, spend, deadline) {
    const ch = () => st.channels[id];
    while (ch()) {
      const c = ch();
      if (!spend()) return;
      const d = await call(getChannelDifference({ channelId: id, accessHash: c.accessHash, pts: c.pts, limit: CHANNEL_LIMIT }), "updates.ChannelDifference", deadline);
      if (d._ === "updates.channelDifferenceEmpty") { c.pts = d.pts; break; }
      learn(st, titles, d.chats, d.users, index);
      if (!ch()) return;
      if (d._ === "updates.channelDifferenceTooLong") {
        // Only the latest messages come back: continue from the dialog's pts and read the older ids by number.
        applyMessages(st, index, titles, d.messages);
        if (d.dialog && isInt(d.dialog.pts)) c.pts = d.dialog.pts;
        if (d.dialog && d.dialog.top_message > 0) c.backfill = { next: 1, to: d.dialog.top_message };
      } else {
        applyMessages(st, index, titles, d.new_messages);
        applyUpdates(st, index, titles, d.other_updates);
        c.pts = d.pts;
      }
      if (d.final) break;
    }
    while (ch() && ch().backfill) {
      const c = ch();
      if (!spend()) return;
      const { next, to } = c.backfill;
      const ids = [];
      for (let i = next; i <= to && ids.length < BATCH; i++) ids.push(i);
      const res = await call(channelsGetMessages({ channelId: id, accessHash: c.accessHash, ids }), "messages.Messages", deadline);
      applyFetched(st, index, titles, res, () => channelChatId(id));
      if (next + ids.length > to) delete c.backfill;
      else c.backfill = { next: next + ids.length, to };
    }
  }

  /**
   * refetch(entry) -> IndexEntry | null: the entry's message again (channels.getMessages for a channel,
   * messages.getMessages for a private chat), so its document has a fresh file_reference. null (and the entry is
   * dropped) when the message is gone or is no longer a video. An unknown channel is `channel_invalid`.
   */
  function refetch(entry, { deadline } = {}) {
    // persistEntries false: refetch saves nothing (the caller keeps the entry), so it runs beside a refresh instead of
    // waiting behind it in this queue, on a private copy of the saved state. A lost channel is found by the next refresh.
    if (!persistEntries) return refetchNow(entry, deadline, false);
    return serial(() => refetchNow(entry, deadline, true));
  }
  async function refetchNow(entry, deadline, keep) {
    await null;
    {
      if (!entry || typeof entry.chatId !== "string" || !isInt(entry.msgId)) throw mtError("invalid_request", "refetch needs an IndexEntry");
      let st, index;
      if (keep) ({ st, index } = begin());
      else { let raw = null; try { raw = store.get(STATE_KEY); } catch { raw = null; } st = parseState(raw); index = new Journal(); }
      const titles = new Map();
      const key = entry.chatId + ":" + entry.msgId;
      const chId = channelIdOfChat(entry.chatId);
      let res;
      if (chId !== null) {
        const c = st.channels[chId];
        if (!c) throw mtError("channel_invalid", "the channel is not known to the discovery");
        try {
          res = await call(channelsGetMessages({ channelId: chId, accessHash: c.accessHash, ids: [entry.msgId] }), "messages.Messages", deadline);
        } catch (e) {
          if (e.code === "channel_invalid" && keep) { dropChannel(st, index, chId); save(st, index); }
          throw e;
        }
      } else {
        res = await call(messagesGetMessages([entry.msgId]), "messages.Messages", deadline);
      }
      applyFetched(st, index, titles, res, () => entry.chatId);
      const msg = (res.messages || []).find((m) => m.id === entry.msgId);
      if (!msg || msg._ !== "message" || chatIdOf(msg.peer_id) !== entry.chatId) index.delete(key);
      if (keep) save(st, index);
      const e = index.get(key);
      return e ? { ...e } : null;
    }
  }

  /**
   * backfill({ channelId, fromId = 1, count = 100 }) -> { entries, nextId }: reads ids fromId..fromId+count-1 of a
   * known channel with channels.getMessages, 100 per call, and merges what it finds. `channelId` is the raw id or the
   * "-100..." chat id. `entries` are the videos found in that range. Errors come back typed (channel_invalid, flood_wait...).
   */
  function backfill({ channelId, fromId = 1, count = 100 } = {}) {
    return serial(async () => {
      if (!isInt(fromId) || fromId < 1 || !isInt(count) || count < 1) throw mtError("invalid_request", "backfill needs fromId >= 1 and count >= 1");
      let id;
      try { id = String(channelId).startsWith("-") ? channelIdOfChat(String(channelId)) : String(BigInt(channelId)); } catch { id = null; }
      const { st, index } = begin();
      const c = id && st.channels[id];
      if (!c) throw mtError("channel_invalid", "the channel is not known to the discovery");
      const titles = new Map();
      const found = [];
      let saved = null;
      try {
        for (let start = fromId; start < fromId + count; start += BATCH) {
          const ids = [];
          for (let i = start; i < Math.min(start + BATCH, fromId + count); i++) ids.push(i);
          const res = await call(channelsGetMessages({ channelId: id, accessHash: c.accessHash, ids }), "messages.Messages");
          for (const e of applyFetched(st, index, titles, res, () => channelChatId(id))) found.push({ ...e });
        }
      } finally {
        saved = save(st, index);
      }
      return { entries: found, nextId: fromId + count, persisted: saved.persisted };
    });
  }

  /** resetChannel(id | "-100..." chat id) -> boolean: the channel is read again from pts 1 on the next refresh. */
  function resetChannel(channelId) {
    return serial(async () => {
      let id;
      try { id = String(channelId).startsWith("-") ? channelIdOfChat(String(channelId)) : String(BigInt(channelId)); } catch { id = null; }
      const { st, index } = begin();
      const c = id && st.channels[id];
      if (!c) return false;
      c.pts = 1;
      delete c.backfill;
      save(st, index);
      return true;
    });
  }

  return {
    refresh,
    refetch,
    backfill,
    resetChannel,
    /** The known channels [{ id, chatId, title }] from the saved state (ascending id), without any network call. */
    knownChannels: () => serial(async () => Object.entries(load().st.channels).map(([id, c]) => ({ id, chatId: channelChatId(id), title: c.title }))),
    /** The saved index (newest first), without any network call. */
    entries: () => serial(async () => sorted(load().index)),
  };
}

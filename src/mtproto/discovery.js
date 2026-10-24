// Video discovery for a logged-in bot: which videos sit in the channels the bot administers and in private chats with
// it. Bots cannot list dialogs or read history (messages.getHistory answers BOT_METHOD_INVALID), so everything comes
// from the update boxes, as measured live on layer 198:
//   - updates.getDifference from pts=1, date=1, qts=-1 replays the common box: private messages in new_messages,
//     channel posts as UpdateNewChannelMessage in other_updates, and the chats vector carries each Channel with its
//     access_hash (the only way a bot learns a channel);
//   - updates.getChannelDifference from pts=1 lists a channel's history from the start, page by page until `final`;
//   - channels.getMessages / messages.getMessages re-read single messages (a fresh file_reference).
// The index and the update state are saved together under one storage key, so they can never disagree.
import { mtError } from "./errors.js";
import { toHex } from "./bytes.js";
import { decode } from "./schema/reader.js";
import { getState, getDifference, getChannelDifference, channelsGetMessages, messagesGetMessages } from "./requests.js";

const STATE_KEY = "tg.discovery";
const VERSION = 1;
const CHANNEL_LIMIT = 100;
const BATCH = 100;
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

function titleFrom(fileName, caption, msgId) {
  if (fileName) {
    const dot = fileName.lastIndexOf(".");
    const base = (dot > 0 ? fileName.slice(0, dot) : fileName).trim();
    if (base) return base;
  }
  for (const line of String(caption || "").split("\n")) {
    const t = line.trim();
    if (t) return t;
  }
  return "Video " + msgId;
}

/** A Message as an IndexEntry when it carries a video document, else null. */
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
    chatTitle,
    title: titleFrom(fileName, caption, msg.id),
    caption,
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

/**
 * createDiscovery({ client, store }): `client` a logged-in TelegramClient (its `call`), `store` the same get/set
 * storage the client uses. Operations run one at a time and each reads and writes the saved state.
 */
export function createDiscovery({ client, store, log = () => {} }) {
  if (!client || typeof client.call !== "function") throw mtError("invalid_request", "createDiscovery needs a TelegramClient");
  if (!store || typeof store.get !== "function" || typeof store.set !== "function") throw mtError("invalid_request", "createDiscovery needs a get/set store");
  let chain = Promise.resolve();
  const serial = (fn) => { const run = chain.then(fn, fn); chain = run.then(() => {}, () => {}); return run; };

  const load = () => {
    let raw = null;
    try { raw = store.get(STATE_KEY); } catch { raw = null; }
    const st = parseState(raw);
    return { st, index: new Map(st.entries.map((e) => [e.key, e])) };
  };
  const save = (st, index) => store.set(STATE_KEY, JSON.stringify({ ...publicState(st), entries: sorted(index) }));
  const call = async (body, expect) => decode(await client.call(body), { expect, skip });

  /** What one answer teaches: channels (with their access hash) and chat titles. */
  function learn(st, titles, chats, users, index) {
    for (const c of chats || []) {
      if (c._ === "channel") {
        const id = String(c.id);
        const known = st.channels[id];
        titles.set(channelChatId(id), c.title);
        if (c.min || c.access_hash === undefined) { if (known) known.title = c.title; continue; } // a min hash is not usable
        if (known) { known.accessHash = String(c.access_hash); known.title = c.title; }
        else st.channels[id] = { accessHash: String(c.access_hash), title: c.title, pts: 1 };
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
    const prefix = channelChatId(id) + ":";
    for (const k of [...index.keys()]) if (k.startsWith(prefix)) index.delete(k);
  }
  const titleOf = (st, titles, chatId) => {
    if (titles.has(chatId)) return titles.get(chatId);
    const ch = channelIdOfChat(chatId);
    return ch && st.channels[ch] ? st.channels[ch].title : "";
  };
  /** A new or edited message: index it when it is a video, otherwise make sure it is not indexed. */
  function putMessage(st, index, titles, msg) {
    if (!msg || (msg._ !== "message" && msg._ !== "messageService" && msg._ !== "messageEmpty")) return;
    const chatId = chatIdOf(msg.peer_id);
    const e = videoEntry(msg, chatId === null ? "" : titleOf(st, titles, chatId));
    if (e) {
      const old = index.get(e.key);
      if (!e.chatTitle && old) e.chatTitle = old.chatTitle;
      index.set(e.key, e);
    } else if (chatId !== null) {
      index.delete(chatId + ":" + msg.id);
    }
  }
  function applyUpdates(st, index, titles, updates) {
    for (const u of updates || []) {
      switch (u._) {
        case "updateNewMessage": case "updateEditMessage": case "updateNewChannelMessage": case "updateEditChannelMessage":
          putMessage(st, index, titles, u.message);
          break;
        case "updateDeleteChannelMessages": {
          const prefix = channelChatId(u.channel_id) + ":";
          for (const id of u.messages) index.delete(prefix + id);
          break;
        }
        case "updateDeleteMessages": {
          // Common-box ids (private chats and basic groups) are unique per account, so they need no chat.
          const ids = new Set(u.messages);
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
      putMessage(st, index, titles, m);
      const c = chatIdOf(m.peer_id);
      const e = c !== null && index.get(c + ":" + m.id);
      if (e) found.push(e);
    }
    return found;
  }
  const setState = (st, s) => { st.pts = s.pts; st.qts = s.qts; st.date = s.date; st.seq = s.seq; };

  /**
   * refresh({ maxPages = 20 }) -> { entries, newCount, state, incomplete?, floodWait? }: reads the common box (from
   * pts 1 on the first run, else from the saved state), then every known channel from its saved pts, at most
   * `maxPages` calls in all. `entries` is the whole index (newest first), `newCount` how many keys it gained.
   * FLOOD_WAIT stops the scan with `floodWait` (seconds) and keeps the progress; `incomplete` means call again.
   */
  function refresh({ maxPages = 20 } = {}) {
    return serial(async () => {
      const { st, index } = load();
      const before = new Set(index.keys());
      const titles = new Map();
      let pages = 0, incomplete = false, floodWait;
      const spend = () => { if (pages >= maxPages) { incomplete = true; return false; } pages++; return true; };
      try {
        // 1. the common box
        let req = st.pts > 0 ? { pts: st.pts, date: st.date, qts: st.qts } : { pts: 1, date: 1, qts: -1 };
        for (;;) {
          if (!spend()) break;
          const d = await call(getDifference(req), "updates.Difference");
          if (d._ === "updates.differenceEmpty") {
            if (st.pts === 0) { st.pts = req.pts; st.qts = Math.max(0, req.qts); }
            st.date = d.date; st.seq = d.seq;
            break;
          }
          if (d._ === "updates.differenceTooLong") {
            if (!spend()) break;
            setState(st, await call(getState(), "updates.State"));
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
            try {
              await scanChannel(st, index, titles, id, spend);
            } catch (e) {
              if (e.code !== "channel_invalid") throw e;
              log("channel " + id + " dropped: " + e.message);
              dropChannel(st, index, id);
            }
          }
        }
      } catch (e) {
        if (e.code !== "flood_wait") { save(st, index); throw e; }
        incomplete = true;
        floodWait = e.seconds;
      }
      save(st, index);
      let newCount = 0;
      for (const k of index.keys()) if (!before.has(k)) newCount++;
      const out = { entries: sorted(index), newCount, state: publicState(st) };
      if (incomplete) out.incomplete = true;
      if (floodWait !== undefined) out.floodWait = floodWait;
      return out;
    });
  }

  async function scanChannel(st, index, titles, id, spend) {
    const ch = () => st.channels[id];
    while (ch()) {
      const c = ch();
      if (!spend()) return;
      const d = await call(getChannelDifference({ channelId: id, accessHash: c.accessHash, pts: c.pts, limit: CHANNEL_LIMIT }), "updates.ChannelDifference");
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
      const res = await call(channelsGetMessages({ channelId: id, accessHash: c.accessHash, ids }), "messages.Messages");
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
  function refetch(entry) {
    return serial(async () => {
      if (!entry || typeof entry.chatId !== "string" || !isInt(entry.msgId)) throw mtError("invalid_request", "refetch needs an IndexEntry");
      const { st, index } = load();
      const titles = new Map();
      const key = entry.chatId + ":" + entry.msgId;
      const chId = channelIdOfChat(entry.chatId);
      let res;
      if (chId !== null) {
        const c = st.channels[chId];
        if (!c) throw mtError("channel_invalid", "the channel is not known to the discovery");
        try {
          res = await call(channelsGetMessages({ channelId: chId, accessHash: c.accessHash, ids: [entry.msgId] }), "messages.Messages");
        } catch (e) {
          if (e.code === "channel_invalid") { dropChannel(st, index, chId); save(st, index); }
          throw e;
        }
      } else {
        res = await call(messagesGetMessages([entry.msgId]), "messages.Messages");
      }
      applyFetched(st, index, titles, res, () => entry.chatId);
      const msg = (res.messages || []).find((m) => m.id === entry.msgId);
      if (!msg || msg._ !== "message" || chatIdOf(msg.peer_id) !== entry.chatId) index.delete(key);
      save(st, index);
      const e = index.get(key);
      return e ? { ...e } : null;
    });
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
      const { st, index } = load();
      const c = id && st.channels[id];
      if (!c) throw mtError("channel_invalid", "the channel is not known to the discovery");
      const titles = new Map();
      const found = [];
      try {
        for (let start = fromId; start < fromId + count; start += BATCH) {
          const ids = [];
          for (let i = start; i < Math.min(start + BATCH, fromId + count); i++) ids.push(i);
          const res = await call(channelsGetMessages({ channelId: id, accessHash: c.accessHash, ids }), "messages.Messages");
          for (const e of applyFetched(st, index, titles, res, () => channelChatId(id))) found.push({ ...e });
        }
      } finally {
        save(st, index);
      }
      return { entries: found, nextId: fromId + count };
    });
  }

  return {
    refresh,
    refetch,
    backfill,
    /** The saved index (newest first), without any network call. */
    entries: () => serial(async () => sorted(load().index)),
  };
}

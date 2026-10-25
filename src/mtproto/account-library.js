// The video library of a person's OWN Telegram account (account mode, 0.3.0), read only. Unlike a bot, an account can
// list its chats and search them, so nothing here uses the update boxes:
//   - messages.getDialogs lists the chats (channels, supergroups, basic groups and Saved Messages; private chats with
//     other people are left out), at most 500 per listing, again every 30 minutes;
//   - a chat is PROBED once (messages.search with inputMessagesFilterVideo, then inputMessagesFilterDocument for videos
//     sent as files): only chats where a video exists become known to the shell, in the order they were found (`seen`),
//     for its stable channel slots; a chat without videos is probed again after a day;
//   - a chat the person switched on is walked with the same two filtered searches, newest first, 100 per call; once
//     walked, each refresh asks only for what is newer than the highest message id seen (min_id);
//   - channels.getMessages / messages.getMessages re-read one message (a fresh file_reference).
// The client's call() only lets the reading methods of requests.js ACCOUNT_CALLS out: nothing here can send, edit,
// delete, forward or mark anything read.
//
// Known limits: a video deleted in Telegram stays listed until it is played (the refetch finds it gone and drops it), or
// until the chat is switched off and on again; an edited caption is seen only when the chat is read again from its start.
import { mtError } from "./errors.js";
import { decode } from "./schema/reader.js";
import { videoEntry, chatIdOf, skipForIndex } from "./discovery.js";
import { getDialogs, searchMessages, channelsGetMessages, messagesGetMessages, FILTER } from "./requests.js";

const STATE_KEY = "tg.adiscovery";
const VERSION = 1;
const PAGE = 100;
const DIALOG_PAGES = 5;                 // 500 chats per listing
const LIST_EVERY_MS = 30 * 60 * 1000;
const REPROBE_MS = 24 * 3600 * 1000;    // a chat without videos is looked at again after a day
const DOC_PROBE = 20;                   // documents looked at to find a video sent as a file
const FILTERS = [FILTER.video, FILTER.document];
const MAX_TITLE = 100;
const CHANNEL_BASE = 1000000000000n;
const cap = (s, n) => { s = String(s || ""); return s.length > n ? s.slice(0, n) : s; };
const ISOLATED = new Set(["protocol", "rpc_error"]);
const errorOf = (e) => ({ code: e && e.code ? e.code : "error", message: String(e && e.message) });

const fresh = () => ({ v: VERSION, chats: {}, dlg: null, listedAt: 0 });
function parseState(raw) {
  let v;
  try { v = typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return fresh(); }
  if (!v || v.v !== VERSION || !v.chats || typeof v.chats !== "object" || Array.isArray(v.chats)) return fresh();
  for (const [id, c] of Object.entries(v.chats)) {
    if (!/^-?\d{1,20}$/.test(id) || !c || !["channel", "chat", "self"].includes(c.kind) || typeof c.id !== "string") return fresh();
    if (c.kind === "channel" && typeof c.accessHash !== "string") return fresh();
  }
  return { v: VERSION, chats: v.chats, dlg: v.dlg && typeof v.dlg === "object" ? v.dlg : null, listedAt: Number(v.listedAt) || 0 };
}
/** The InputPeer of a known chat. */
function peerOf(c) {
  if (c.kind === "self") return { kind: "self" };
  if (c.kind === "chat") return { kind: "chat", id: c.id };
  return { kind: "channel", id: c.id, accessHash: c.accessHash };
}

/**
 * createAccountDiscovery({ client, store, now, log }): `client` a TelegramClient in account mode, logged in. The same
 * operations the bot's discovery gives the shell: refresh, refetch, resetChannel. Operations run one at a time.
 */
export function createAccountDiscovery({ client, store, now = () => Date.now(), log = () => {} }) {
  if (!client || typeof client.call !== "function") throw mtError("invalid_request", "createAccountDiscovery needs a TelegramClient");
  let chain = Promise.resolve();
  const serial = (fn) => { const run = chain.then(fn, fn); chain = run.then(() => {}, () => {}); return run; };
  const load = () => { let raw = null; try { raw = store.get(STATE_KEY); } catch { raw = null; } return parseState(raw); };
  const save = (st) => { try { store.set(STATE_KEY, JSON.stringify(st)); return true; } catch (e) { log("account state not saved: " + (e && e.code)); return false; } };
  const call = async (body, expect, deadline) => decode(await client.call(body, { deadline: Number.isFinite(deadline) ? deadline : undefined }), { expect, skip: skipForIndex });
  const nextSeen = (st) => Object.values(st.chats).reduce((m, x) => Math.max(m, Number.isInteger(x.seen) ? x.seen : 0), 0) + 1;

  /** Chats and users of an answer: channels with a usable access hash, basic groups, and the person's own user. */
  function learn(st, res, listed, dropped) {
    const known = new Map();
    for (const c of res.chats || []) {
      if (c._ === "channel" && !c.min && c.access_hash !== undefined && !c.left) known.set(String(-(CHANNEL_BASE + BigInt(c.id))), { kind: "channel", id: String(c.id), accessHash: String(c.access_hash), title: cap(c.title, MAX_TITLE) });
      else if (c._ === "chat" && !c.deactivated && !c.migrated_to && !c.left) known.set(String(-BigInt(c.id)), { kind: "chat", id: String(c.id), title: cap(c.title, MAX_TITLE) });
      else if (c._ === "channelForbidden" || c._ === "chatForbidden" || (c._ === "channel" && c.left)) {
        const key = c._ === "chatForbidden" ? String(-BigInt(c.id)) : String(-(CHANNEL_BASE + BigInt(c.id)));
        if (st.chats[key]) { delete st.chats[key]; dropped.push(key); }
      }
    }
    for (const u of res.users || []) if (u._ === "user" && u.self) known.set(String(u.id), { kind: "self", id: String(u.id), title: "" });
    for (const [key, c] of known) {
      const old = st.chats[key];
      if (old) { old.title = c.title; if (c.accessHash) old.accessHash = c.accessHash; }
      else if (listed) st.chats[key] = { ...c, probe: null, probedAt: 0, scan: { f: 0, offsetId: 0 }, top: 0 };
    }
    return known;
  }

  function refresh({ maxPages = 20, shouldScan = null, commit = true, deadline = Infinity } = {}) {
    return serial(async () => {
      const st = load();
      const upserted = new Map();
      const dropped = [];
      const errors = [];
      let pages = 0, incomplete = false, floodWait;
      const spend = () => { if (pages >= maxPages || now() + 1500 >= deadline) { incomplete = true; return false; } pages++; return true; };
      const put = (res, chatKey) => {
        const c = st.chats[chatKey];
        let low = null, n = 0;
        for (const m of res.messages || []) {
          if (!m || m._ !== "message") continue;
          n++;
          if (low === null || m.id < low) low = m.id;
          if (chatIdOf(m.peer_id) !== chatKey) continue;
          const e = videoEntry(m, c ? c.title : "");
          if (!e) continue;
          upserted.set(e.key, e);
          if (c) c.maxSeen = Math.max(c.maxSeen || 0, m.id);
        }
        return { low, n };
      };
      try {
        // 1. the chat list (every 30 minutes, or to finish a listing an earlier pass left)
        if (st.dlg || !st.listedAt || now() - st.listedAt >= LIST_EVERY_MS) {
          const d = st.dlg || { offsetDate: 0, offsetId: 0, peer: null, listed: [], pages: 0 };
          st.dlg = d;
          while (st.dlg) {
            if (!spend()) break;
            const res = await call(getDialogs({ offsetDate: d.offsetDate, offsetId: d.offsetId, offsetPeer: d.peer, limit: PAGE }), "messages.Dialogs", deadline);
            if (res._ === "messages.dialogsNotModified") { st.dlg = null; break; }
            const known = learn(st, res, true, dropped);
            const users = new Map((res.users || []).map((u) => [String(u.id), u]));
            for (const dl of res.dialogs || []) { const key = chatIdOf(dl.peer); if (key !== null && known.has(key)) d.listed.push(key); }
            d.pages++;
            const list = res.dialogs || [];
            const last = list[list.length - 1];
            const done = res._ === "messages.dialogs" || list.length < PAGE || !last;
            if (!done && last) {
              const top = (res.messages || []).find((m) => m.id === last.top_message && chatIdOf(m.peer_id) === chatIdOf(last.peer));
              const key = chatIdOf(last.peer);
              const k = known.get(key);
              let peer = null;
              if (k) peer = peerOf(k);
              else if (last.peer._ === "peerUser" && users.get(key) && users.get(key).access_hash !== undefined) peer = { kind: "user", id: key, accessHash: String(users.get(key).access_hash) };
              if (!peer) { log("dialog list: no cursor for the last chat, listing ends here"); }
              else { d.offsetDate = top ? top.date : 0; d.offsetId = last.top_message; d.peer = peer; }
              if (!peer || d.pages >= DIALOG_PAGES) { st.dlg = null; st.listedAt = now(); break; }
              continue;
            }
            // A complete listing: a chat that is not in it any more is gone (left, deleted or never again a dialog).
            const seenNow = new Set(d.listed);
            for (const key of Object.keys(st.chats)) if (!seenNow.has(key)) { if (st.chats[key].probe === "video") dropped.push(key); delete st.chats[key]; }
            st.dlg = null;
            st.listedAt = now();
          }
        }
        // 2. probes: which chats hold a video (Saved Messages first, then in dialog order)
        if (!incomplete) {
          const keys = Object.keys(st.chats).sort((a, b) => (st.chats[a].kind === "self" ? -1 : 0) - (st.chats[b].kind === "self" ? -1 : 0));
          for (const key of keys) {
            const c = st.chats[key];
            if (!c || (c.probe === "video") || (c.probe === "none" && now() - c.probedAt < REPROBE_MS)) continue;
            if (!spend()) break;
            let found = false;
            try {
              const v = await call(searchMessages({ peer: peerOf(c), filter: FILTER.video, limit: 1 }), "messages.Messages", deadline);
              found = (v.messages || []).some((m) => m._ === "message" && videoEntry(m, ""));
              if (!found) {
                if (!spend()) break;
                const docs = await call(searchMessages({ peer: peerOf(c), filter: FILTER.document, limit: DOC_PROBE }), "messages.Messages", deadline);
                found = (docs.messages || []).some((m) => m._ === "message" && videoEntry(m, ""));
              }
            } catch (e) {
              if (e.code === "channel_invalid") { delete st.chats[key]; dropped.push(key); continue; }
              if (!ISOLATED.has(e.code)) throw e;
              errors.push({ scope: "channel", chatId: key, ...errorOf(e) });
              continue;
            }
            c.probedAt = now();
            if (found && c.probe !== "video") { c.probe = "video"; c.seen = nextSeen(st); }
            else if (!found) c.probe = "none";
          }
        }
        // 3. the chats the person switched on: the walk from the newest, or what is newer than the last one seen
        if (!incomplete) {
          const keys = Object.keys(st.chats).filter((k) => st.chats[k].probe === "video").sort((a, b) => st.chats[a].seen - st.chats[b].seen);
          for (const key of keys) {
            if (incomplete) break;
            if (shouldScan && !shouldScan(key)) continue;
            const c = st.chats[key];
            try {
              if (c.scan) {
                while (c.scan && spend()) {
                  const res = await call(searchMessages({ peer: peerOf(c), filter: FILTERS[c.scan.f], offsetId: c.scan.offsetId, limit: PAGE }), "messages.Messages", deadline);
                  learn(st, res, false, dropped);
                  const { low, n } = put(res, key);
                  if (n < PAGE || low === null) {
                    if (c.scan.f + 1 < FILTERS.length) c.scan = { f: c.scan.f + 1, offsetId: 0 };
                    else { c.scan = null; c.top = Math.max(c.top || 0, c.maxSeen || 0); }
                  } else c.scan.offsetId = low;
                }
              } else {
                for (let f = 0; f < FILTERS.length && !incomplete; f++) {
                  let offsetId = 0;
                  for (;;) {
                    if (!spend()) break;
                    const res = await call(searchMessages({ peer: peerOf(c), filter: FILTERS[f], offsetId, minId: c.top || 0, limit: PAGE }), "messages.Messages", deadline);
                    learn(st, res, false, dropped);
                    const { low, n } = put(res, key);
                    if (n < PAGE || low === null) break;
                    offsetId = low;
                  }
                }
                if (!incomplete) c.top = Math.max(c.top || 0, c.maxSeen || 0);
              }
            } catch (e) {
              if (e.code === "channel_invalid") { log("a chat was dropped: " + e.code); delete st.chats[key]; dropped.push(key); continue; }
              if (!ISOLATED.has(e.code)) throw e;
              log("a chat was skipped: " + e.code);
              errors.push({ scope: "channel", chatId: key, ...errorOf(e) });
            }
          }
        }
      } catch (e) {
        const outOfTime = e.code === "timeout" && e.deadline === true;
        if (e.code !== "flood_wait" && !outOfTime) throw e; // nothing of this pass is kept
        incomplete = true;
        if (!outOfTime) floodWait = e.seconds;
      }
      const out = {
        changes: { upserted: [...upserted.values()].filter((e) => st.chats[e.chatId]).sort((a, b) => b.date - a.date), removed: [], droppedChats: [...new Set(dropped)], commonDeletedIds: [] },
        state: { chats: Object.fromEntries(Object.entries(st.chats).filter(([, c]) => c.probe === "video").map(([k, c]) => [k, { title: c.title, kind: c.kind, seen: c.seen }])) },
        checking: Object.values(st.chats).filter((c) => c.probe === null).length,
        errors,
        pages,
      };
      if (incomplete) out.incomplete = true;
      if (floodWait !== undefined) out.floodWait = floodWait;
      out.commit = () => save(st);
      if (commit) out.commit();
      return out;
    });
  }

  /** The entry's message again (a fresh file_reference), or null when it is gone or no longer a video. */
  function refetch(entry, { deadline } = {}) {
    return serial(async () => {
      if (!entry || typeof entry.chatId !== "string" || !Number.isInteger(entry.msgId)) throw mtError("invalid_request", "refetch needs an IndexEntry");
      const st = load();
      const c = st.chats[entry.chatId];
      if (!c) throw mtError("channel_invalid", "the chat is not known");
      const res = c.kind === "channel"
        ? await call(channelsGetMessages({ channelId: c.id, accessHash: c.accessHash, ids: [entry.msgId] }), "messages.Messages", deadline)
        : await call(messagesGetMessages([entry.msgId]), "messages.Messages", deadline);
      const m = (res.messages || []).find((x) => x.id === entry.msgId);
      if (!m || m._ !== "message" || chatIdOf(m.peer_id) !== entry.chatId) return null;
      const e = videoEntry(m, c.title);
      return e ? { ...e } : null;
    });
  }

  /** The chat is read again from its newest message on the next refresh. */
  function resetChannel(chatId) {
    return serial(async () => {
      const st = load();
      const c = st.chats[String(chatId)];
      if (!c) return false;
      c.scan = { f: 0, offsetId: 0 };
      c.top = 0;
      delete c.maxSeen;
      save(st);
      return true;
    });
  }

  return { refresh, refetch, resetChannel, stateKey: STATE_KEY };
}

export const ACCOUNT_STATE_KEY = STATE_KEY;

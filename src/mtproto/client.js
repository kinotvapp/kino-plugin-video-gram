// The high-level client: one auth key per DC, a bot login once per home DC, DC migration, chunked file downloads and
// a JSON-safe state the plugin shell stores encrypted. Calls run one at a time (Kino calls `read` one at a time too).
import { toBase64, fromBase64, toHex } from "./bytes.js";
import { sha1 } from "./crypto.js";
import { Transport } from "./transport.js";
import { createAuthKey } from "./authkey.js";
import { Session } from "./session.js";
import {
  CTOR, LAYER, invokeWithLayer, initConnection, importBotAuthorization, exportAuthorization, importAuthorization,
  inputDocumentFileLocation, uploadGetFile, parseUploadFile, parseUploadFileHex, parseAuthorization, parseExportedAuthorization,
} from "./tl.js";
import { mtError } from "./errors.js";
import { ALLOWED_CALLS } from "./requests.js";
import { describeError, isServerAnswer } from "./errors.js";
import { big } from "./big.js";
import { TELEGRAM_PUBLIC_KEYS } from "./keys.js";

export const CHUNK = 1048576;
const BUDGET_KEY = "mtproto.botLogins";
const BUDGET_MAX = 3;
const BUDGET_WINDOW_MS = 3600000;
const MIN_LEFT_MS = 1500;   // a request never starts with less time than this before its caller's deadline
const MARGIN_MS = 500;      // what a request leaves its caller after its own wait
const POLL_MS = 250;        // how often a call waiting for its turn checks its deadline
const MAX_AHEAD = 4;        // file chunks requested ahead and kept (answered or still in flight), oldest dropped first
const MAX_IN_FLIGHT = 3;    // chunk requests on one connection at once (the asked one included)
const AHEAD_WAIT_MS = 8000; // the longest a read waits for a chunk requested ahead before asking for it again

/**
 * At most 3 bot logins per hour per device (Telegram answered FLOOD_WAIT_3121 after about ten in an hour). `store` is
 * kino.storage or anything with get/set of strings. Answers { allowed, remaining, retryAfterSeconds, record() };
 * record() notes a login now, or throws `login_budget` (with `seconds`) when none is left.
 */
export function loginBudget(store, now = Date.now()) {
  let times = [];
  try {
    const v = JSON.parse(store.get(BUDGET_KEY) || "[]");
    if (Array.isArray(v)) times = v.filter((t) => typeof t === "number" && t <= now && now - t < BUDGET_WINDOW_MS).sort((a, b) => a - b);
  } catch { times = []; }
  const allowed = times.length < BUDGET_MAX;
  const retryAfterSeconds = allowed ? 0 : Math.ceil((times[0] + BUDGET_WINDOW_MS - now) / 1000);
  return {
    allowed,
    remaining: Math.max(0, BUDGET_MAX - times.length),
    retryAfterSeconds,
    record() {
      if (!allowed) throw mtError("login_budget", "too many bot logins on this device in the last hour", { seconds: retryAfterSeconds });
      times.push(now);
      store.set(BUDGET_KEY, JSON.stringify(times));
    },
  };
}

function encodeState(dc, s) {
  const out = { dc, authKey: toBase64(s.authKey), authKeyId: toHex(s.authKeyId), serverSalt: toBase64(s.serverSalt), timeOffset: s.timeOffset | 0, loggedIn: !!s.loggedIn };
  if (s.userId !== undefined) out.userId = String(s.userId);
  return out;
}

function decodeState(v) {
  const authKey = fromBase64(String(v.authKey || ""));
  if (authKey.length !== 256) throw mtError("invalid_request", "stored auth key must be 256 bytes");
  let serverSalt = new Uint8Array(8);
  try { const s = fromBase64(String(v.serverSalt || "")); if (s.length === 8) serverSalt = s; } catch { /* a bad salt is fixed by bad_server_salt */ }
  const s = { authKey, authKeyId: sha1(authKey).slice(12, 20), serverSalt, timeOffset: Number(v.timeOffset) | 0, loggedIn: v.loggedIn === true };
  if (v.userId !== undefined) s.userId = BigInt(v.userId);
  return s;
}

// `call` sends only what is on the allowlist (requests.js): the first 4 bytes of the body must be one of those method ids.
const ALLOWED = new Set(ALLOWED_CALLS);

const DEFAULT_DEVICE = Object.freeze({ deviceModel: "Kino", systemVersion: "Android", appVersion: "1.0", systemLangCode: "en", langPack: "", langCode: "en" });

function checkRange(offset, limit) {
  if (!Number.isInteger(offset) || offset < 0 || offset % 4096 !== 0) throw mtError("invalid_request", "offset must be a non-negative multiple of 4096");
  if (!Number.isInteger(limit) || limit <= 0 || limit % 4096 !== 0 || CHUNK % limit !== 0) throw mtError("invalid_request", "limit must be a multiple of 4096 that divides 1 MiB");
  if (Math.floor(offset / CHUNK) !== Math.floor((offset + limit - 1) / CHUNK)) throw mtError("invalid_request", "a chunk may not cross a 1 MiB boundary");
}

export class TelegramClient {
  /**
   * `apiId` is needed for initConnection on every new connection. `publicKeys` defaults to Telegram's (tests inject a
   * fake DC's). `store` is REQUIRED: kino.storage (or any get/set of strings) for the login budget, which keeps a
   * burst of bot logins from earning a FLOOD_WAIT of almost an hour; only a test may pass `store: false` to go without.
   * `wsOpen`/`urlFor` are for tests and other transports.
   */
  constructor({ apiId, publicKeys = TELEGRAM_PUBLIC_KEYS, device = {}, store, timeoutMs = 20000, now = () => Date.now(), log = () => {}, onUpdate = null, wsOpen, urlFor } = {}) {
    if (store === false) store = null;
    else if (!store || typeof store.get !== "function" || typeof store.set !== "function") {
      throw mtError("invalid_request", "TelegramClient needs `store` (kino.storage) for the bot login budget; only tests may pass store: false");
    }
    this.apiId = apiId;
    this.publicKeys = publicKeys;
    this.device = { ...DEFAULT_DEVICE, ...device };
    this.store = store;
    this.timeoutMs = timeoutMs;
    this.now = now;
    this.log = log;
    this.onUpdate = onUpdate;
    this.wsOpen = wsOpen;
    this.urlFor = urlFor;
    this.homeDc = null;
    this.dcs = new Map();   // dc -> { authKey, authKeyId, serverSalt, timeOffset, loggedIn, userId? }
    this.conns = new Map(); // dc -> { transport, session, inited }
    this.chain = Promise.resolve();
    this.ahead = new Map(); // "<doc id>:<offset>:<limit>" -> { dc, session, entry }, in request order
  }

  /** How many chunks requested ahead are kept (tests). */
  aheadCount() { return this.ahead.size; }

  /**
   * Tears everything down after a failure the caller cannot place: every connection closes (the requests in flight on
   * them are dropped), the chunks read ahead are forgotten. The keys and logins stay: the next call reconnects with
   * them, with no key exchange and no new login.
   */
  reset() {
    return this.serial(async () => {
      for (const a of this.ahead.values()) { if (a.entry.done && a.entry.result) big.release(a.entry.result.length); else a.session.forget(a.entry); }
      this.ahead.clear();
      for (const dc of [...this.conns.keys()]) await this.drop(dc);
    });
  }

  /**
   * Runs `fn` after the calls already queued (one at a time). With a `deadline` (a time of `now()`), the call is
   * dropped unsent when its turn comes too late, and a caller queued behind a busy client gets a typed timeout at its
   * deadline instead of waiting for its turn (`kino.sleep` polls; it is only used while the client is busy).
   */
  serial(fn, deadline, trace) {
    const queuedAt = trace ? Date.now() : 0;
    const busy = this.pending > 0;
    this.pending = (this.pending || 0) + 1;
    const turn = () => {
      if (trace) trace.queue += Date.now() - queuedAt;
      if (deadline !== undefined && this.now() > deadline - MIN_LEFT_MS) throw mtError("timeout", "no time left before the caller's deadline", { deadline: true });
      return fn();
    };
    const run = this.chain.then(turn, turn);
    this.chain = run.then(() => { this.pending--; }, () => { this.pending--; });
    if (!busy || deadline === undefined || typeof kino === "undefined" || typeof kino.sleep !== "function") return run;
    let settled = false;
    run.then(() => { settled = true; }, () => { settled = true; });
    const watch = (async () => {
      for (;;) {
        const left = deadline - MIN_LEFT_MS - this.now();
        if (settled) return new Promise(() => {}); // the call won: this side never answers
        if (left <= 0) throw mtError("timeout", "the client stayed busy past the caller's deadline", { deadline: true });
        await kino.sleep(Math.min(POLL_MS, left));
      }
    })();
    return Promise.race([run, watch]);
  }

  /** The wait of one request: the client's timeout, or less when the caller's `deadline` is closer (typed timeout when too close). */
  budget(deadline) {
    if (deadline === undefined || deadline === null || !Number.isFinite(deadline)) return { ms: this.timeoutMs, clamped: false };
    const left = deadline - this.now() - MARGIN_MS;
    if (left < MIN_LEFT_MS - MARGIN_MS) throw mtError("timeout", "no time left before the caller's deadline", { deadline: true });
    return left < this.timeoutMs ? { ms: left, clamped: true } : { ms: this.timeoutMs, clamped: false };
  }

  /** Takes a state from exportState() (all DCs) or one DC's entry of it. */
  importState(state) {
    if (!state || typeof state !== "object") return;
    if (state.dcs && typeof state.dcs === "object") {
      for (const [k, v] of Object.entries(state.dcs)) this.dcs.set(Number(k), decodeState(v));
      if (state.homeDc) this.homeDc = Number(state.homeDc);
    } else if (state.authKey) {
      this.dcs.set(Number(state.dc), decodeState(state));
    }
  }

  /** { homeDc, dcs: { "<dc>": { dc, authKey (base64), authKeyId (hex), serverSalt (base64), timeOffset, loggedIn, userId? } } } */
  exportState() {
    const dcs = {};
    for (const [dc, s] of this.dcs) dcs[String(dc)] = encodeState(dc, s);
    return { homeDc: this.homeDc, dcs };
  }

  /** Connects to the home DC (`state.homeDc` wins over `dc` when a full state is given), reusing a stored key. */
  connect(dc, state, { deadline } = {}) {
    return this.serial(async () => {
      this.importState(state);
      if (!(state && state.homeDc)) this.homeDc = Number(dc);
      await this.conn(this.homeDc, deadline);
      return this;
    }, deadline);
  }

  async conn(dc, deadline) {
    let c = this.conns.get(dc);
    if (c && !c.transport.closed && !c.session.broken) return c;
    if (c) await this.drop(dc);
    const transport = await new Transport(dc, { open: this.wsOpen, url: this.urlFor ? this.urlFor(dc) : undefined }).open();
    let st = this.dcs.get(dc);
    if (!st) {
      try {
        st = { ...(await createAuthKey(transport, { dc, publicKeys: this.publicKeys, now: this.now, timeoutMs: this.budget(deadline).ms })), loggedIn: false };
      } catch (e) {
        await transport.close();
        throw e;
      }
      this.dcs.set(dc, st);
    }
    let session;
    try {
      session = new Session(transport, st, { now: this.now, timeoutMs: this.timeoutMs, onUpdate: this.onUpdate, log: this.log });
    } catch (e) {
      await transport.close();
      throw e;
    }
    c = { transport, session, inited: false };
    this.conns.set(dc, c);
    return c;
  }

  async drop(dc) {
    const c = this.conns.get(dc);
    this.conns.delete(dc);
    for (const [k, a] of this.ahead) if (a.dc === dc) this.ahead.delete(k); // their answers die with the connection
    if (c) await c.transport.close();
  }

  /**
   * One API call on DC `dc`; the first call of each connection goes inside invokeWithLayer(initConnection(...)).
   * A closed socket is retried once on a new connection unless `retry` is false (the bot login retries by itself, so
   * that every attempt spends the budget). `hex` answers the result as a hex string (Session.call).
   */
  async invoke(dc, body, { retry = true, hex = false, deadline, trace, after } = {}) {
    const c = await this.conn(dc, deadline);
    const wrapped = c.inited ? body : invokeWithLayer(LAYER, initConnection({ apiId: this.apiId, ...this.device }, body));
    const wait = this.budget(deadline);
    try {
      const started = this.now();
      const entry = await c.session.request(wrapped, { hex, trace });
      // `after` sends more requests right behind this one, on a connection already initialised: never a failure of its own.
      if (after && c.inited) { try { await after(c); } catch (e) { this.log("request ahead not sent (" + describeError(e) + ")"); } }
      const res = await c.session.settle(entry, started + wait.ms);
      c.inited = true;
      return res;
    } catch (thrown) {
      // Anything may be thrown from below (a native failure is not always an Error): read it through `e`.
      const e = thrown && typeof thrown === "object" ? thrown : { code: undefined, thrown };
      if (e.code === "closed" && retry) {
        await this.drop(dc);
        return this.invoke(dc, body, { retry: false, hex, deadline, trace });
      }
      // A connection in an unknown state is never used again: the next call reconnects with the stored key.
      if (e.code === "timeout" || e.code === "closed" || e.code === "protocol" || !isServerAnswer(e) || c.session.broken) await this.drop(dc);
      if (e.code === "timeout" && wait.clamped) e.deadline = true; // the caller's deadline, not the server's silence alone
      if (e.code === "auth_key_unregistered") {
        // A key the server forgot (-404), refuses (AUTH_KEY_INVALID) or sees on two connections at once
        // (AUTH_KEY_DUPLICATED: e.g. a copy restored on another device) is dead: drop it, the next call makes a new one.
        // Any other 401 (AUTH_KEY_UNREGISTERED, SESSION_REVOKED...) keeps the key and only needs a new login.
        if (e.transport || /^AUTH_KEY_(INVALID|DUPLICATED)$/.test(String(e.rpc || ""))) { await this.drop(dc); this.dcs.delete(dc); }
        else { const st = this.dcs.get(dc); if (st) st.loggedIn = false; }
      }
      throw thrown;
    }
  }

  /**
   * Logs the bot in on the home DC once: a DC already logged in (also from a stored state) sends nothing and answers
   * { reused: true, userId }. Follows USER_MIGRATE_n (the home DC changes only when the login there succeeds) and
   * retries once after a closed socket. Every attempt sent, migrations and retries included, spends a budget slot.
   */
  botLogin({ apiId, apiHash, botToken, deadline }) {
    return this.serial(async () => {
      if (apiId !== undefined) this.apiId = Number(apiId);
      if (!this.homeDc) throw mtError("invalid_request", "connect first");
      if (!apiHash || !botToken || !this.apiId) throw mtError("invalid_request", "apiId, apiHash and botToken are required");
      const home = this.dcs.get(this.homeDc);
      if (home && home.loggedIn) return { reused: true, userId: home.userId };
      let dc = this.homeDc;
      let hops = 0, closedRetries = 0;
      for (;;) {
        if (this.store) loginBudget(this.store, this.now()).record();
        try {
          const auth = parseAuthorization(await this.invoke(dc, importBotAuthorization({ apiId: this.apiId, apiHash, botToken }), { retry: false, deadline }));
          if (auth.ctor !== CTOR.authAuthorization) throw mtError("protocol", "unexpected answer to the bot login");
          const st = this.dcs.get(dc);
          st.loggedIn = true;
          st.userId = auth.userId;
          this.homeDc = dc;
          return { userId: auth.userId };
        } catch (e) {
          if (e.code === "user_migrate" && hops < 2 && e.dc !== dc) { hops++; dc = e.dc; continue; }
          if (e.code === "closed" && closedRetries < 1) { closedRetries++; continue; }
          throw e;
        }
      }
    }, deadline);
  }

  /**
   * One raw API call on the home DC for the logged-in bot: `body` is the serialized method (a Uint8Array), the answer
   * is the result's bytes (unzipped; decode them with schema/reader.js). Server errors come back typed (errors.js).
   * Refused with `invalid_request` before a login, and for any method not on ALLOWED_CALLS (requests.js): auth
   * methods, invoke wrappers, gzip_packed, msg_container and every other method are never sent.
   */
  call(body, { deadline } = {}) {
    try {
      if (!(body instanceof Uint8Array) || body.length < 4) throw mtError("invalid_request", "call needs the serialized method as a Uint8Array");
      const id = (body[0] | (body[1] << 8) | (body[2] << 16) | (body[3] << 24)) >>> 0;
      if (!ALLOWED.has(id)) throw mtError("invalid_request", "method 0x" + id.toString(16).padStart(8, "0") + " is not allowed through call (see ALLOWED_CALLS)");
    } catch (e) {
      return Promise.reject(e);
    }
    return this.serial(async () => {
      if (!this.homeDc) throw mtError("invalid_request", "connect first");
      const st = this.dcs.get(this.homeDc);
      if (!st || !st.loggedIn) throw mtError("invalid_request", "log in first");
      return this.invoke(this.homeDc, body, { deadline });
    }, deadline);
  }

  /** Makes DC `dc` act for the logged-in bot: export the authorization from the home DC, import it there. */
  async authorize(dc, deadline) {
    if (dc === this.homeDc) return;
    await this.conn(dc, deadline);
    const st = this.dcs.get(dc);
    if (st && st.loggedIn) return;
    const exp = parseExportedAuthorization(await this.invoke(this.homeDc, exportAuthorization(dc), { deadline }));
    if (exp.ctor !== CTOR.exportedAuthorization) throw mtError("protocol", "unexpected answer to auth.exportAuthorization");
    const auth = parseAuthorization(await this.invoke(dc, importAuthorization(exp), { deadline }));
    if (auth.ctor !== CTOR.authAuthorization) throw mtError("protocol", "unexpected answer to auth.importAuthorization");
    this.dcs.get(dc).loggedIn = true;
  }

  /**
   * `limit` bytes of a document from `offset` (fewer at the end of the file), via upload.getFile with an
   * InputDocumentFileLocation. `loc` is { id, accessHash, fileReference (Uint8Array), dcId? }. Offset a multiple of
   * 4096, limit a multiple of 4096 dividing 1 MiB, never across a 1 MiB boundary (Telegram's rules, checked here first).
   * Follows FILE_MIGRATE_n; FLOOD_WAIT_n, FILE_REFERENCE_EXPIRED... come back as typed errors. With `{ hex: true }`
   * the bytes come back as a hex string, sliced out of the decrypted answer with no JS pass over them.
   */
  getFile(loc, offset, limit, { hex = false, deadline, trace, ahead = [], abandon = false } = {}) {
    try {
      if (!loc || loc.id === undefined || loc.accessHash === undefined || !(loc.fileReference && typeof loc.fileReference.length === "number")) {
        throw mtError("invalid_request", "a location needs id, accessHash and fileReference");
      }
      checkRange(offset, limit);
    } catch (e) {
      return Promise.reject(e);
    }
    const location = inputDocumentFileLocation({ id: BigInt(loc.id), accessHash: BigInt(loc.accessHash), fileReference: loc.fileReference });
    const body = uploadGetFile(location, offset, limit);
    // Chunks read ahead are kept by offset: a read asking a shorter limit there (the file's last chunk) uses them too.
    const doc = String(loc.id) + ":" + toHex(loc.fileReference) + ":";
    const keyOf = (o) => doc + o;
    const dropAhead = (k, a) => {
      this.ahead.delete(k);
      if (a.entry.done) { if (a.entry.result) big.release(a.entry.result.length); a.entry.result = null; }
      else a.session.forget(a.entry);
    };
    return this.serial(async () => {
      if (!this.homeDc) throw mtError("invalid_request", "connect first");
      let dc = Number(loc.dcId) || this.homeDc;
      if (trace) { trace.pipe = "miss"; trace.ahead = 0; }
      // The chunks to request right behind this one: not already requested, never this one, and never more than
      // MAX_IN_FLIGHT chunk requests on the connection (abandoned ones still on the wire count): Telegram may pack all
      // the answers in flight into one packet, and each MiB of it is 2 MiB of hex per copy under QuickJS's 64 MiB cap.
      const sendAhead = async (c) => {
        for (const a of ahead) {
          const k = keyOf(a.offset);
          if (this.ahead.has(k) || a.offset === offset) continue;
          if (c.session.inflight() >= MAX_IN_FLIGHT) break;
          try { checkRange(a.offset, a.limit); } catch { continue; }
          const entry = await c.session.request(uploadGetFile(location, a.offset, a.limit), { hex: true });
          this.ahead.set(k, { dc, session: c.session, entry, limit: a.limit });
          if (trace) trace.ahead++;
          while (this.ahead.size > MAX_AHEAD) {
            const [oldKey, old] = this.ahead.entries().next().value;
            dropAhead(oldKey, old);
          }
        }
      };
      // A chunk requested ahead by an earlier read: its answer may already be here (or on its way).
      const pre = this.ahead.get(keyOf(offset));
      if (pre && pre.limit >= limit) {
        this.ahead.delete(keyOf(offset));
        const c = this.conns.get(pre.dc);
        if (c && c.session === pre.session && !c.transport.closed) {
          try {
            const until = Math.min(this.now() + AHEAD_WAIT_MS, deadline === undefined ? Infinity : deadline - MIN_LEFT_MS);
            const answer = await c.session.settle(pre.entry, until);
            const file = hex ? parseUploadFileHex(answer) : parseUploadFile(answer);
            big.release(answer.length);
            if (file.ctor === CTOR.uploadFile) {
              if (trace) trace.pipe = "hit";
              if (ahead.length) { try { await sendAhead(c); } catch (e) { this.log("request ahead not sent (" + describeError(e) + ")"); } } // keep the pipe full
              if (hex) return file.bytesHex.length > limit * 2 ? file.bytesHex.slice(0, limit * 2) : file.bytesHex;
              return file.bytes.length > limit ? file.bytes.subarray(0, limit) : file.bytes;
            }
          } catch (e) {
            this.log("chunk read ahead not usable (" + describeError(e) + "): asking again");
            if (!isServerAnswer(e) || c.session.broken) await this.drop(pre.dc); // the stream is in an unknown state
          }
        } else {
          pre.session.forget(pre.entry);
        }
      }
      // A seek: the chunks read ahead for this file that this read no longer wants are given up (their answers, when
      // they come, are dropped without being kept).
      if (abandon) {
        const wanted = new Set(ahead.map((a) => keyOf(a.offset)));
        for (const [k, a] of [...this.ahead]) if (k.startsWith(doc) && !wanted.has(k)) dropAhead(k, a);
      }
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await this.authorize(dc, deadline);
          const answer = await this.invoke(dc, body, { hex, deadline, trace, after: attempt === 0 && ahead.length ? sendAhead : undefined });
          const tp = trace ? Date.now() : 0;
          const file = hex ? parseUploadFileHex(answer) : parseUploadFile(answer);
          if (hex) big.release(answer.length);
          if (trace) trace.parse += Date.now() - tp;
          if (file.ctor === CTOR.uploadFileCdnRedirect) throw mtError("protocol", "CDN redirects are not supported");
          if (file.ctor !== CTOR.uploadFile) throw mtError("protocol", "unexpected answer to upload.getFile");
          return hex ? file.bytesHex : file.bytes;
        } catch (e) {
          if (e && e.code === "file_migrate" && e.dc !== dc) { dc = e.dc; continue; }
          if (e && e.code === "auth_key_unregistered" && dc !== this.homeDc) continue; // authorize() again (a new key if it was dropped)
          throw e;
        }
      }
      throw mtError("protocol", "too many redirects for one chunk");
    }, deadline, trace);
  }

  async close() {
    await this.serial(async () => {
      for (const dc of [...this.conns.keys()]) await this.drop(dc);
    });
  }
}

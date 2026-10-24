// The high-level client: one auth key per DC, a bot login once per home DC, DC migration, chunked file downloads and
// a JSON-safe state the plugin shell stores encrypted. Calls run one at a time (Kino calls `read` one at a time too).
import { toBase64, fromBase64, toHex } from "./bytes.js";
import { sha1 } from "./crypto.js";
import { Transport } from "./transport.js";
import { createAuthKey } from "./authkey.js";
import { Session } from "./session.js";
import {
  CTOR, LAYER, invokeWithLayer, initConnection, importBotAuthorization, exportAuthorization, importAuthorization,
  inputDocumentFileLocation, uploadGetFile, parseUploadFile, parseAuthorization, parseExportedAuthorization,
} from "./tl.js";
import { mtError } from "./errors.js";
import { TELEGRAM_PUBLIC_KEYS } from "./keys.js";

export const CHUNK = 1048576;
const BUDGET_KEY = "mtproto.botLogins";
const BUDGET_MAX = 3;
const BUDGET_WINDOW_MS = 3600000;

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

// Constructor ids `call` refuses: every auth.* method (logins go through botLogin and its budget; authorizations
// through getFile's DC hops), plus the invokeWith*/initConnection wrappers the client adds itself.
const DENIED_CALLS = new Set([
  0xa677244f, 0xaac7b717, 0x8d52a951, 0x3e72ba19, 0x9fab0d1a, 0xe5bfffcd, 0xa57a7dad, 0xcdd42a05, 0x67a3ff2c, 0xd18b4d16,
  0xd897bc66, 0x37096c70, 0xcae47523, 0x1f040578, 0x8e48a188, 0xb7e085fe, 0x95ac5ce4, 0xe894ad4d, 0x0d36bf79, 0x2db873a9,
  0x8e39261e, 0x7e960193, 0xcb9deff6, // auth.*
  0xcb9f372d, 0x3dc4b4f0, 0xc1cd5ea9, 0xda9b0d0d, 0xbf9459b7, 0x365275f2, 0xaca9fd2e, 0xdd289f8e, 0x1df92984, 0x0dae54f8, // invoke*, initConnection
]);

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
  }

  serial(fn) {
    const run = this.chain.then(fn, fn);
    this.chain = run.then(() => {}, () => {});
    return run;
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
  connect(dc, state) {
    return this.serial(async () => {
      this.importState(state);
      if (!(state && state.homeDc)) this.homeDc = Number(dc);
      await this.conn(this.homeDc);
      return this;
    });
  }

  async conn(dc) {
    let c = this.conns.get(dc);
    if (c && !c.transport.closed) return c;
    if (c) await this.drop(dc);
    const transport = await new Transport(dc, { open: this.wsOpen, url: this.urlFor ? this.urlFor(dc) : undefined }).open();
    let st = this.dcs.get(dc);
    if (!st) {
      try {
        st = { ...(await createAuthKey(transport, { dc, publicKeys: this.publicKeys, now: this.now, timeoutMs: this.timeoutMs })), loggedIn: false };
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
    if (c) await c.transport.close();
  }

  /**
   * One API call on DC `dc`; the first call of each connection goes inside invokeWithLayer(initConnection(...)).
   * A closed socket is retried once on a new connection unless `retry` is false (the bot login retries by itself, so
   * that every attempt spends the budget).
   */
  async invoke(dc, body, { retry = true } = {}) {
    const c = await this.conn(dc);
    const wrapped = c.inited ? body : invokeWithLayer(LAYER, initConnection({ apiId: this.apiId, ...this.device }, body));
    try {
      const res = await c.session.call(wrapped, { timeoutMs: this.timeoutMs });
      c.inited = true;
      return res;
    } catch (e) {
      if (e.code === "closed" && retry) {
        await this.drop(dc);
        return this.invoke(dc, body, { retry: false });
      }
      if (e.code === "timeout" || e.code === "closed" || e.code === "protocol") await this.drop(dc);
      if (e.code === "auth_key_unregistered") {
        if (e.transport) { await this.drop(dc); this.dcs.delete(dc); }
        else { const st = this.dcs.get(dc); if (st) st.loggedIn = false; }
      }
      throw e;
    }
  }

  /**
   * Logs the bot in on the home DC once: a DC already logged in (also from a stored state) sends nothing and answers
   * { reused: true, userId }. Follows USER_MIGRATE_n (the home DC changes only when the login there succeeds) and
   * retries once after a closed socket. Every attempt sent, migrations and retries included, spends a budget slot.
   */
  botLogin({ apiId, apiHash, botToken }) {
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
          const auth = parseAuthorization(await this.invoke(dc, importBotAuthorization({ apiId: this.apiId, apiHash, botToken }), { retry: false }));
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
    });
  }

  /**
   * One raw API call on the home DC for the logged-in bot: `body` is the serialized method (a Uint8Array), the answer
   * is the result's bytes (unzipped; decode them with schema/reader.js). Server errors come back typed (errors.js).
   * Refused with `invalid_request` before a login, and for auth methods or the invokeWith... and initConnection wrappers.
   */
  call(body) {
    try {
      if (!(body instanceof Uint8Array) || body.length < 4) throw mtError("invalid_request", "call needs the serialized method as a Uint8Array");
      const id = (body[0] | (body[1] << 8) | (body[2] << 16) | (body[3] << 24)) >>> 0;
      if (DENIED_CALLS.has(id)) throw mtError("invalid_request", "call does not send auth.* methods or invoke wrappers");
    } catch (e) {
      return Promise.reject(e);
    }
    return this.serial(async () => {
      if (!this.homeDc) throw mtError("invalid_request", "connect first");
      const st = this.dcs.get(this.homeDc);
      if (!st || !st.loggedIn) throw mtError("invalid_request", "log in first");
      return this.invoke(this.homeDc, body);
    });
  }

  /** Makes DC `dc` act for the logged-in bot: export the authorization from the home DC, import it there. */
  async authorize(dc) {
    if (dc === this.homeDc) return;
    await this.conn(dc);
    const st = this.dcs.get(dc);
    if (st && st.loggedIn) return;
    const exp = parseExportedAuthorization(await this.invoke(this.homeDc, exportAuthorization(dc)));
    if (exp.ctor !== CTOR.exportedAuthorization) throw mtError("protocol", "unexpected answer to auth.exportAuthorization");
    const auth = parseAuthorization(await this.invoke(dc, importAuthorization(exp)));
    if (auth.ctor !== CTOR.authAuthorization) throw mtError("protocol", "unexpected answer to auth.importAuthorization");
    this.dcs.get(dc).loggedIn = true;
  }

  /**
   * `limit` bytes of a document from `offset` (fewer at the end of the file), via upload.getFile with an
   * InputDocumentFileLocation. `loc` is { id, accessHash, fileReference (Uint8Array), dcId? }. Offset a multiple of
   * 4096, limit a multiple of 4096 dividing 1 MiB, never across a 1 MiB boundary (Telegram's rules, checked here first).
   * Follows FILE_MIGRATE_n; FLOOD_WAIT_n, FILE_REFERENCE_EXPIRED... come back as typed errors.
   */
  getFile(loc, offset, limit) {
    try {
      if (!loc || loc.id === undefined || loc.accessHash === undefined || !(loc.fileReference && typeof loc.fileReference.length === "number")) {
        throw mtError("invalid_request", "a location needs id, accessHash and fileReference");
      }
      checkRange(offset, limit);
    } catch (e) {
      return Promise.reject(e);
    }
    const body = uploadGetFile(inputDocumentFileLocation({ id: BigInt(loc.id), accessHash: BigInt(loc.accessHash), fileReference: loc.fileReference }), offset, limit);
    return this.serial(async () => {
      if (!this.homeDc) throw mtError("invalid_request", "connect first");
      let dc = Number(loc.dcId) || this.homeDc;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await this.authorize(dc);
          const file = parseUploadFile(await this.invoke(dc, body));
          if (file.ctor === CTOR.uploadFileCdnRedirect) throw mtError("protocol", "CDN redirects are not supported");
          if (file.ctor !== CTOR.uploadFile) throw mtError("protocol", "unexpected answer to upload.getFile");
          return file.bytes;
        } catch (e) {
          if (e.code === "file_migrate" && e.dc !== dc) { dc = e.dc; continue; }
          if (e.code === "auth_key_unregistered" && dc !== this.homeDc) continue; // authorize() again (a new key if it was dropped)
          throw e;
        }
      }
      throw mtError("protocol", "too many redirects for one chunk");
    });
  }

  async close() {
    await this.serial(async () => {
      for (const dc of [...this.conns.keys()]) await this.drop(dc);
    });
  }
}

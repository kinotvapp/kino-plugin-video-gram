// One live Telegram client per plugin runtime, reused by every call (Home, refresh, each read): the auth key and the
// bot login come from tg.session (when it was made on this device, see the device mark), so a new runtime connects
// with the stored key, without a key exchange or a login.
// The bot logs in once per device (the client's budget allows 3 an hour); a login Telegram refused is not tried again
// until the settings change.
import { TelegramClient } from "../mtproto/client.js";
import { TELEGRAM_PUBLIC_KEYS } from "../mtproto/keys.js";
import { createDiscovery } from "../mtproto/discovery.js";
import { createAccountDiscovery, ACCOUNT_STATE_KEY } from "../mtproto/account-library.js";
import { KEYS, readJson, writeJson, remove, kinoStore } from "./store.js";
import { shellError } from "./errors.js";

// The fake Telegram of the tests has its own RSA key: testkit/plugin-harness.mjs swaps exactly this line in the bundle.
const PUBLIC_KEYS = TELEGRAM_PUBLIC_KEYS;
const FIRST_DC = 2;

/**
 * The person's settings (trimmed). `mode` is "bot" (the default, a bot in the person's channels) or "account" (the
 * person's own account, read only, signed in with a QR). `complete` when the mode has what it needs. Never logged,
 * never stored.
 */
export function credentials() {
  const get = (k) => String(kino.config.get(k) ?? "").trim();
  const mode = kino.config.get("access") === "account" ? "account" : "bot";
  const apiId = get("api_id"), apiHash = get("api_hash"), botToken = mode === "bot" ? get("bot_token") : "";
  return { mode, apiId, apiHash, botToken, complete: !!(apiId && apiHash && (mode === "account" || botToken)) };
}

const digest = (text) => kino.crypto.hash("sha256", text).slice(0, 16);
/** Which bot (and api_id) a session belongs to; in account mode, which api_id (the account is learned at the login). */
export const sessionFp = (c) => (c.mode === "account" ? digest("account\n" + c.apiId) : digest("session\n" + c.apiId + "\n" + c.botToken));
/** Which exact settings a refused login was made with (api_hash included). */
export const loginFp = (c) => (c.mode === "account" ? digest("alogin\n" + c.apiId + "\n" + c.apiHash) : digest("login\n" + c.apiId + "\n" + c.apiHash + "\n" + c.botToken));
/** Where the mode's session lives: the bot's and the account's are separate keys, never mixed. */
export const sessionStoreKey = (c) => (c.mode === "account" ? KEYS.usession : KEYS.session);

let live = null;       // { fp, device, client, discovery, saved, ready }
let connecting = null; // the one connect in flight: every caller of this runtime waits on it
/** The last connect's timing, for the refresh line: { connect, loginms, login: "new" | "reused" }. */
let lastOpen = null;
export const lastOpenTiming = () => lastOpen;

// ---- the device mark ----
//
// tg.session sits in kino.storage, which a password-protected backup carries to another device; kino.catalog never
// travels. So the install's id lives in both: in tg.session, and in one row of the catalog that only this device has.
// A stored session is used only when the two match. A restored copy (onto a fresh device, onto a device with its own
// catalog, or taken before anything was indexed) never matches, so its auth key, which belongs to the other device,
// is dropped and this device opens its own (one login, budgeted). What this does NOT cover: a Kino that would one day
// carry the catalog file in a backup too (the mark would then travel with the key), and a catalog file reset by Kino
// as damaged (the mark goes with it: a new session, which is only a cost).
export const DEVICE_ROW = "~device";

/** This install's id from the catalog's mark, or null when there is none. */
export async function deviceMark() {
  const [row] = await kino.catalog.get([DEVICE_ROW]);
  return row && row.data && typeof row.data.device === "string" && /^[0-9a-f]{32}$/.test(row.data.device) ? row.data.device : null;
}

/** Writes the mark (a new random id unless one is given) and answers it. */
export async function markDevice(id = kino.crypto.randomBytes(16)) {
  await kino.catalog.upsert([{ id: DEVICE_ROW, title: "~", sort: 0, data: { device: id } }]);
  return id;
}

/**
 * Makes sure what kino.storage holds was made on this device. A stored session from elsewhere (no mark, or another
 * one) is dropped together with what came with it from the same backup, the update state and the shell state, and
 * this device's catalog is rebuilt from scratch under a new mark: the settings stay. Answers this device's mark.
 */
let checking = null; // one check at a time: two at once could each write a different mark
export function checkDevice() {
  if (!checking) checking = runCheckDevice().finally(() => { checking = null; });
  return checking;
}
async function runCheckDevice() {
  const stored = [readJson(KEYS.session), readJson(KEYS.usession)].filter(Boolean);
  let mark = await deviceMark();
  if (stored.some((x) => !mark || x.device !== mark)) {
    kino.log("stored session was not made on this device: a new session and a new index");
    if (live) await close();
    for (const k of [KEYS.session, KEYS.usession, KEYS.discovery, ACCOUNT_STATE_KEY, KEYS.shell, KEYS.qr]) remove(k);
    await kino.catalog.clear();
    mark = null;
  }
  return mark || markDevice();
}

function newClient(c) {
  return new TelegramClient({
    mode: c.mode,
    apiId: Number(c.apiId),
    publicKeys: PUBLIC_KEYS,
    store: kinoStore,
    timeoutMs: 9000,
    ...(typeof kino.now === "function" ? { now: kino.now } : {}),

    device: { deviceModel: "Kino", systemVersion: kino.device === "tv" ? "Android TV" : "Android", appVersion: String(kino.appVersion || "1.0").slice(0, 20), systemLangCode: String(kino.lang || "es").slice(0, 2), langCode: String(kino.lang || "es").slice(0, 2) },
    log: (m) => kino.log("mtproto: " + m),
  });
}

// ---- the stored session, encrypted ----
//
// tg.session holds this device's auth keys (one per DC) and the bot login: whoever reads them can act as the bot. Kino
// keeps kino.storage as plain JSON and offers a plugin no keystore of its own (sealed secrets are the author's, fixed in
// the manifest; password settings are what the person types), so the plugin encrypts the DC states itself: AES-256-GCM
// under a key derived (HMAC-SHA256) from the bot token and the api_hash, with a random per-install salt kept beside it.
// The fingerprint and the device mark stay readable (they hold no secret). A changed token or api_hash cannot open the
// old blob: that is no session (a new one, one login inside the budget). Nothing of it is ever logged.
// The account's session (tg.usession) is sealed the same way under the api_hash and api_id: whoever reads the plain
// kino.storage (a backup file, a dump) gets nothing usable without the password settings, which Kino keeps encrypted.
const sessionKey = (c, salt) => (c.mode === "account"
  ? kino.crypto.hmac("sha256", c.apiHash + "\naccount:" + c.apiId, "tg.usession\n" + salt, { keyEncoding: "utf8", inputEncoding: "utf8", outputEncoding: "hex" })
  : kino.crypto.hmac("sha256", c.apiHash + "\n" + c.botToken, "tg.session\n" + salt, { keyEncoding: "utf8", inputEncoding: "utf8", outputEncoding: "hex" }));

function sealState(key, salt, state) {
  const iv = kino.crypto.randomBytes(12);
  const ct = kino.crypto.encrypt("aes-256-gcm", { key, keyEncoding: "hex", iv, ivEncoding: "hex", data: JSON.stringify(state), inputEncoding: "utf8", outputEncoding: "base64" });
  return { salt, iv, ct };
}

/** The DC states of a stored session, or null when there are none or they cannot be opened (another token, tampering). */
function openState(stored, c) {
  if (!stored || typeof stored !== "object") return null;
  if (stored.v === 1) return stored.state && stored.state.dcs ? stored.state : null; // 0.2.2 and older: plaintext, read once
  if (stored.v !== 2 || typeof stored.salt !== "string" || typeof stored.iv !== "string" || typeof stored.ct !== "string") return null;
  try {
    const text = kino.crypto.decrypt("aes-256-gcm", { key: sessionKey(c, stored.salt), keyEncoding: "hex", iv: stored.iv, ivEncoding: "hex", data: stored.ct, inputEncoding: "base64", outputEncoding: "utf8" });
    const state = JSON.parse(text);
    return state && state.dcs ? state : null;
  } catch {
    kino.log("stored session cannot be opened (other settings or damaged): a new one");
    return null;
  }
}

/** Writes the client's state, encrypted, when it changed (a new DC key, a dropped one, a new salt, the login). */
export function saveSession() {
  if (!live) return;
  const state = live.client.exportState();
  const text = JSON.stringify(state);
  if (text === live.saved) return;
  if (writeJson(live.skey, { v: 2, fp: live.fp, device: live.device, ...sealState(live.key, live.salt, state) })) live.saved = text;
}

// ---- logins that must wait ----
//
// A login Telegram refused (token, api_id) or asked to delay (FLOOD_WAIT, or the device's own budget) is recorded in
// tg.login for these exact settings, by whoever met it (Home, a read, a picture), and checked before every login: so
// the player's retries of read() never send another importBotAuthorization while the wait runs.
export function loginBlocked(c) {
  const rec = readJson(KEYS.login);
  if (!rec || rec.fp !== loginFp(c)) return null;
  if (rec.kind === "token" || rec.kind === "api_id") return shellError(rec.kind, "login refused before");
  if (rec.kind === "closed") return null; // an account session Telegram ended: only a reason to show, the QR login clears it
  if ((rec.kind === "flood" || rec.kind === "budget") && Number(rec.until) > Date.now()) {
    return shellError(rec.kind, "login must wait", { seconds: Math.max(1, Math.ceil((Number(rec.until) - Date.now()) / 1000)) });
  }
  return null;
}
export function recordLoginFailure(c, e) {
  const code = e && e.code;
  const kind = code === "token_invalid" ? "token" : code === "api_id_invalid" ? "api_id" : code === "flood_wait" ? "flood" : code === "login_budget" ? "budget" : null;
  if (!kind) return;
  const rec = { fp: loginFp(c), kind };
  if (kind === "flood" || kind === "budget") rec.until = Date.now() + Math.max(1, Number(e.seconds) || 60) * 1000;
  writeJson(KEYS.login, rec);
}

/**
 * The live client, connected and logged in, for these settings. Every caller of the runtime shares one connect in
 * flight (cleared when it fails), so concurrent calls never build two clients or spend two logins. `shell.refused`
 * marks a login Telegram refused with these exact settings: it is not tried again.
 */
export function connect(c, shell, { deadline, noLogin = false, loginFlow = false } = {}) {
  const fp = sessionFp(c);
  if (live && live.fp === fp && live.mode === c.mode && live.ready) return Promise.resolve(live);
  // A picture never logs in: it opens on its own (Kino runs a plugin's calls one at a time) and gives up before a login.
  // The account's QR login (`loginFlow`, only from a settings action or the settings form) gets the client unlogged.
  if (noLogin || loginFlow) return open(c, shell, deadline, noLogin, loginFlow);
  if (!connecting) connecting = open(c, shell, deadline, false, false).finally(() => { connecting = null; });
  return connecting;
}

/** Connect and login, each request inside `deadline` (the first caller's: whoever joins waits on the same one). */
async function open(c, shell, deadline, noLogin, loginFlow = false) {
  const fp = sessionFp(c);
  if (live && (live.fp !== fp || live.mode !== c.mode)) await close();
  if (shell.refused && shell.refused.fp === loginFp(c)) throw shellError(shell.refused.kind, "login refused before");
  // An account with no session on this device: nothing to open (no key exchange either) until the person's QR login.
  if (c.mode === "account" && !loginFlow && !live && !readJson(sessionStoreKey(c))) {
    const rec = readJson(KEYS.login);
    throw shellError(rec && rec.fp === loginFp(c) && rec.kind === "closed" ? "closed" : "signin", "no account session");
  }
  const t0 = Date.now();
  if (!live) {
    const device = await checkDevice();
    const skey = sessionStoreKey(c);
    const stored = readJson(skey);
    let client = newClient(c);
    let saved = null;
    const mine = stored && stored.fp === fp && stored.device === device ? stored : null;
    const state = mine ? openState(mine, c) : null;
    if (noLogin && !state) throw shellError("unavailable", "no session on this device");
    // The key that seals this device's session: the stored salt (or a new one), and the settings in use.
    const salt = mine && mine.v === 2 && typeof mine.salt === "string" ? mine.salt : kino.crypto.randomBytes(16);
    try {
      await client.connect(state && state.homeDc ? state.homeDc : FIRST_DC, state || undefined, { deadline });
      saved = state ? JSON.stringify(state) : null;
    } catch (e) {
      if (!state || e.code !== "invalid_request") throw e;
      kino.log("stored session unusable, starting a new one");
      client = newClient(c);
      await client.connect(FIRST_DC, undefined, { deadline });
    }
    const discovery = c.mode === "account"
      ? createAccountDiscovery({ client, store: kinoStore, log: (m) => kino.log("discovery: " + m) })
      : createDiscovery({ client, store: kinoStore, persistEntries: false, log: (m) => kino.log("discovery: " + m) });
    live = { fp, mode: c.mode, skey, device, client, saved: mine && mine.v === 2 ? saved : null, key: sessionKey(c, salt), salt, ready: false, discovery };
    if (mine && mine.v === 1) saveSession(); // the old plaintext session is rewritten encrypted at once
  }
  const t1 = Date.now();
  let who = null;
  if (live.client.needsLogin()) {
    if (noLogin) throw shellError("unavailable", "no login on this device");
    if (c.mode === "account") {
      // An account never logs in by itself: only the person's QR login (a settings action) does.
      lastOpen = { connect: t1 - t0, loginms: 0, login: "-" };
      saveSession();
      if (loginFlow) return live;
      const rec = readJson(KEYS.login);
      throw shellError(rec && rec.fp === loginFp(c) && rec.kind === "closed" ? "closed" : "signin", "no account session");
    }
    const blocked = loginBlocked(c);
    if (blocked) throw blocked;
  }
  if (c.mode === "account") {
    lastOpen = { connect: t1 - t0, loginms: 0, login: "reused" };
    live.ready = true;
    return live;
  }
  try {
    who = await live.client.botLogin({ apiHash: c.apiHash, botToken: c.botToken, deadline });
    if (who && !who.reused) remove(KEYS.login);
  } catch (e) {
    recordLoginFailure(c, e);
    throw e;
  } finally {
    lastOpen = { connect: t1 - t0, loginms: Date.now() - t1, login: who && who.reused ? "reused" : who ? "new" : "-" };
    saveSession();
  }
  live.ready = true;
  return live;
}

/**
 * Runs `fn(live)`; when the session died under it (a 401, SESSION_REVOKED, a dropped AUTH_KEY_DUPLICATED key), logs
 * in again ONCE (inside the login budget) and runs `fn` once more. Never loops: a second failure is the caller's.
 */
export async function withSession(c, shell, fn, { deadline } = {}) {
  const l = await connect(c, shell, { deadline });
  try {
    return await fn(l);
  } catch (e) {
    if (!e || e.code !== "auth_key_unregistered") throw e;
    if (c.mode === "account") { await sessionClosed(c); throw shellError("closed", "account session ended"); }
    kino.log("session lost (" + (e.rpc && /^[A-Z_]{1,40}$/.test(e.rpc) ? e.rpc : "transport") + "): one new login");
    l.ready = false;
    saveSession();
    return fn(await connect(c, shell, { deadline }));
  }
}

/** Frees the live client's caches and connection when it has been idle for `idleMs` (between plays). */
export async function idleReset(idleMs) {
  if (live && live.client) await live.client.idleReset(idleMs);
}

/** Closes the live client (a settings change, a forget). */
export async function close() {
  const l = live;
  live = null;
  if (l) { try { await l.client.close(); } catch { /* already closed */ } }
}

/**
 * An account session Telegram ended (SESSION_REVOKED, AUTH_KEY_UNREGISTERED: the person closed it in Settings ▸
 * Devices): the key is dropped and the reason kept, and nothing logs in again by itself. Never a loop.
 */
export async function sessionClosed(c) {
  kino.log("account session ended by Telegram: sign in again");
  await close();
  remove(KEYS.usession);
  writeJson(KEYS.login, { fp: loginFp(c), kind: "closed" });
}

/** Forgets the session of this device (the login budget stays: it protects the bot from a flood wait). */
export async function forgetSession() {
  await close();
  remove(KEYS.session);
  remove(KEYS.usession);
}

/** The live client of this runtime when it is open for these settings (the account's login flow). */
export const liveFor = (c) => (live && live.fp === sessionFp(c) && live.mode === c.mode ? live : null);
/** The account just logged in (the QR or the password): the live client is ready, the session saved. */
export function markLoggedIn() { if (live) { live.ready = true; saveSession(); } }

export const hasStoredLogin = (c) => {
  const s = readJson(sessionStoreKey(c));
  if (!s || s.fp !== sessionFp(c)) return false;
  const state = openState(s, c);
  if (!state) return false;
  const home = state.dcs[String(state.homeDc)];
  return !!(home && home.loggedIn);
};

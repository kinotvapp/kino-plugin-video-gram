// One live Telegram client per plugin runtime, reused by every call (Home, refresh, each read): the auth key and the
// bot login come from tg.session (when it was made on this device, see the device mark), so a new runtime connects
// with the stored key, without a key exchange or a login.
// The bot logs in once per device (the client's budget allows 3 an hour); a login Telegram refused is not tried again
// until the settings change.
import { TelegramClient } from "../mtproto/client.js";
import { TELEGRAM_PUBLIC_KEYS } from "../mtproto/keys.js";
import { createDiscovery } from "../mtproto/discovery.js";
import { KEYS, readJson, writeJson, remove, kinoStore } from "./store.js";
import { shellError } from "./errors.js";

// The fake Telegram of the tests has its own RSA key: testkit/plugin-harness.mjs swaps exactly this line in the bundle.
const PUBLIC_KEYS = TELEGRAM_PUBLIC_KEYS;
const FIRST_DC = 2;

/** The person's settings (trimmed); `complete` when all three are there. Never logged, never stored. */
export function credentials() {
  const get = (k) => String(kino.config.get(k) ?? "").trim();
  const apiId = get("api_id"), apiHash = get("api_hash"), botToken = get("bot_token");
  return { apiId, apiHash, botToken, complete: !!(apiId && apiHash && botToken) };
}

const digest = (text) => kino.crypto.hash("sha256", text).slice(0, 16);
/** Which bot (and api_id) a session belongs to. */
export const sessionFp = (c) => digest("session\n" + c.apiId + "\n" + c.botToken);
/** Which exact settings a refused login was made with (api_hash included). */
export const loginFp = (c) => digest("login\n" + c.apiId + "\n" + c.apiHash + "\n" + c.botToken);

let live = null;       // { fp, device, client, discovery, saved, ready }
let connecting = null; // the one connect in flight: every caller of this runtime waits on it

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
  const stored = readJson(KEYS.session);
  let mark = await deviceMark();
  if (stored && (!mark || stored.device !== mark)) {
    kino.log("stored session was not made on this device: a new session and a new index");
    if (live) await close();
    remove(KEYS.session);
    remove(KEYS.discovery);
    remove(KEYS.shell);
    await kino.catalog.clear();
    mark = null;
  }
  return mark || markDevice();
}

function newClient(c) {
  return new TelegramClient({
    apiId: Number(c.apiId),
    publicKeys: PUBLIC_KEYS,
    store: kinoStore,
    timeoutMs: 9000,
    device: { deviceModel: "Kino", systemVersion: kino.device === "tv" ? "Android TV" : "Android", appVersion: String(kino.appVersion || "1.0").slice(0, 20), systemLangCode: String(kino.lang || "es").slice(0, 2), langCode: String(kino.lang || "es").slice(0, 2) },
    log: (m) => kino.log("mtproto: " + m),
  });
}

/** Writes the client's state when it changed (a new DC key, a dropped one, a new salt, the login). */
export function saveSession() {
  if (!live) return;
  const state = live.client.exportState();
  const text = JSON.stringify(state);
  if (text === live.saved) return;
  if (writeJson(KEYS.session, { v: 1, fp: live.fp, device: live.device, state })) live.saved = text;
}

/**
 * The live client, connected and logged in, for these settings. Every caller of the runtime shares one connect in
 * flight (cleared when it fails), so concurrent calls never build two clients or spend two logins. `shell.refused`
 * marks a login Telegram refused with these exact settings: it is not tried again.
 */
export function connect(c, shell, { deadline } = {}) {
  const fp = sessionFp(c);
  if (live && live.fp === fp && live.ready) return Promise.resolve(live);
  if (!connecting) connecting = open(c, shell, deadline).finally(() => { connecting = null; });
  return connecting;
}

/** Connect and login, each request inside `deadline` (the first caller's: whoever joins waits on the same one). */
async function open(c, shell, deadline) {
  const fp = sessionFp(c);
  if (live && live.fp !== fp) await close();
  if (shell.refused && shell.refused.fp === loginFp(c)) throw shellError(shell.refused.kind, "login refused before");
  if (!live) {
    const device = await checkDevice();
    const stored = readJson(KEYS.session);
    let client = newClient(c);
    let saved = null;
    const state = stored && stored.v === 1 && stored.fp === fp && stored.device === device && stored.state && stored.state.dcs ? stored.state : null;
    try {
      await client.connect(state && state.homeDc ? state.homeDc : FIRST_DC, state || undefined, { deadline });
      saved = state ? JSON.stringify(state) : null;
    } catch (e) {
      if (!state || e.code !== "invalid_request") throw e;
      kino.log("stored session unusable, starting a new one");
      client = newClient(c);
      await client.connect(FIRST_DC, undefined, { deadline });
    }
    live = { fp, device, client, saved, ready: false, discovery: createDiscovery({ client, store: kinoStore, persistEntries: false, log: (m) => kino.log("discovery: " + m) }) };
  }
  try {
    await live.client.botLogin({ apiHash: c.apiHash, botToken: c.botToken, deadline });
  } finally {
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
    kino.log("session lost (" + (e.rpc && /^[A-Z_]{1,40}$/.test(e.rpc) ? e.rpc : "transport") + "): one new login");
    l.ready = false;
    saveSession();
    return fn(await connect(c, shell, { deadline }));
  }
}

/** Closes the live client (a settings change, a forget). */
export async function close() {
  const l = live;
  live = null;
  if (l) { try { await l.client.close(); } catch { /* already closed */ } }
}

/** Forgets the session of this device (the login budget stays: it protects the bot from a flood wait). */
export async function forgetSession() {
  await close();
  remove(KEYS.session);
}

export const hasStoredLogin = (c) => {
  const s = readJson(KEYS.session);
  if (!s || s.fp !== sessionFp(c) || !s.state || !s.state.dcs) return false;
  const home = s.state.dcs[String(s.state.homeDc)];
  return !!(home && home.loggedIn);
};

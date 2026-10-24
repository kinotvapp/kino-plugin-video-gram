// One live Telegram client per plugin runtime, reused by every call (Home, refresh, each read): the auth key and the
// bot login come from tg.session, so a new runtime connects with the stored key, without a key exchange or a login.
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

let live = null; // { fp, client, discovery, saved }

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

/** Writes the client's state when it changed (a new DC key, a new salt, the login). */
export function saveSession() {
  if (!live) return;
  const state = live.client.exportState();
  const text = JSON.stringify(state);
  if (text === live.saved) return;
  if (writeJson(KEYS.session, { v: 1, fp: live.fp, state })) live.saved = text;
}

/**
 * The live client, connected and logged in, for these settings. `refused` is the shell's marker of a login Telegram
 * refused (`{ fp, kind }`): with the same settings, the login is not tried again (the error comes back at once).
 */
export async function connect(c, shell) {
  const fp = sessionFp(c);
  if (live && live.fp === fp && live.ready) return live;
  if (live && live.fp !== fp) await close();
  if (shell.refused && shell.refused.fp === loginFp(c)) throw shellError(shell.refused.kind, "login refused before");
  if (!live) {
    const stored = readJson(KEYS.session);
    let client = newClient(c);
    let saved = null;
    const state = stored && stored.v === 1 && stored.fp === fp && stored.state && stored.state.dcs ? stored.state : null;
    try {
      await client.connect(state && state.homeDc ? state.homeDc : FIRST_DC, state || undefined);
      saved = state ? JSON.stringify(state) : null;
    } catch (e) {
      if (!state || e.code !== "invalid_request") throw e;
      kino.log("stored session unusable, starting a new one");
      client = newClient(c);
      await client.connect(FIRST_DC);
    }
    live = { fp, client, saved, ready: false, discovery: createDiscovery({ client, store: kinoStore, persistEntries: false, log: (m) => kino.log("discovery: " + m) }) };
  }
  try {
    await live.client.botLogin({ apiHash: c.apiHash, botToken: c.botToken });
  } finally {
    saveSession();
  }
  live.ready = true;
  return live;
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

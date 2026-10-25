// The plugin's small kino.storage (256 KB for every key; backed up with a password, never synced). Four keys:
//   mtproto.botLogins  the client's login budget (a JSON list of at most 3 times)              < 100 B
//   tg.session         { v, fp, state }: the auth key and server salt per DC, for this device    ~0.6 KB per DC
//   tg.discovery       the discovery's update state: pts/qts/date/seq and the known channels   ~0.1 KB per channel
//   tg.shell           this shell's state: channel slots, purges, the index marker, last error   < 2 KB
// The video entries are never here: they live in kino.catalog. No setting value is ever written here; `fp` is a
// truncated SHA-256 of the api_id and the bot token, so a new bot starts from scratch.
//   tg.usession        account mode: the account's session, sealed like tg.session, never synced  ~0.6 KB per DC
//   tg.adiscovery      account mode: the chats with videos and how far each was read             ~0.2 KB per chat
//   tg.qr              account mode: a QR login under way ({ fp, stage, until }; never the token)  < 100 B
//   tg.login           a login refused, delayed, or an account session Telegram ended            < 100 B
export const KEYS = Object.freeze({ budget: "mtproto.botLogins", session: "tg.session", discovery: "tg.discovery", shell: "tg.shell", login: "tg.login", usession: "tg.usession", adiscovery: "tg.adiscovery", qr: "tg.qr", accountLogins: "mtproto.accountLogins" });

export function readJson(key) {
  let raw = null;
  try { raw = kino.storage.get(key); } catch { return null; }
  if (raw === null || raw === undefined) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Writes `value` as JSON; false (never a throw) when the store refuses it. */
export function writeJson(key, value) {
  try { kino.storage.set(key, JSON.stringify(value)); return true; } catch (e) { kino.log("storage write refused: " + key + " " + (e && e.code)); return false; }
}

export function remove(key) {
  try { kino.storage.remove(key); } catch { /* nothing to remove */ }
}

/** kino.storage as the client's and the discovery's get/set store. */
export const kinoStore = Object.freeze({
  get: (k) => kino.storage.get(k),
  set: (k, v) => kino.storage.set(k, v),
  remove: (k) => kino.storage.remove(k),
  keys: () => kino.storage.keys(),
});

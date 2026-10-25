// Built by scripts/build.mjs from src/plugin.js -- do not edit; edit src/ and rebuild.

// ---- src/shell/text.js ----
const __mod_src_shell_text = (() => {
// Every text the person reads, in Spanish (neutral, tuteo) and English, picked by kino.lang. Code, logs and the detail
// of a kino.error stay English (they are for the developer). A `um.*` text is a kino.error userMessage: Kino shows it
// only under its rules (README "Errors people understand": no "Telegram", "token", "clave", no digit glued to a
// letter, at most 160 characters), so those are written plain.
const ES = {
  "row.recent": "Recientes",
  "row.notice": "Aviso",
  "setup.config": "Configura tu bot de Telegram en Ajustes ▸ Video-Gram",
  "setup.token": "Telegram no aceptó el token del bot: revísalo en Ajustes ▸ Video-Gram",
  "setup.apiId": "Telegram no aceptó tu api_id o api_hash: revísalos en Ajustes ▸ Video-Gram",
  "setup.noChannels": "Agrega el bot como administrador de tu canal privado y publica un video",
  "setup.noneActive": "Activa un canal en Ajustes ▸ Video-Gram para ver sus videos",
  "setup.empty": "Todavía no hay videos en tus canales activos: publica uno",
  "setup.flood": "Telegram pidió esperar: vuelve a intentar en {min}",
  "setup.budget": "Demasiados inicios de sesión del bot en este aparato: vuelve a intentar en {min}",
  "setup.network": "No se pudo conectar con Telegram ahora; se intentará de nuevo",
  "setup.unavailable": "La biblioteca no está disponible ahora; se intentará de nuevo",
  "minutes.one": "1 minuto",
  "minutes.many": "{n} minutos",
  "um.config": "Completa los datos de tu bot en los ajustes de este plugin.",
  "um.token": "El bot no fue aceptado: revisa sus datos en los ajustes de este plugin.",
  "um.apiId": "Los datos de tu app no fueron aceptados: revísalos en los ajustes de este plugin.",
  "um.flood": "Hay que esperar {min} antes de seguir; vuelve a intentar después.",
  "um.notFound": "Este video ya no está en tu canal o el canal está desactivado.",
  "um.unavailable": "No se pudo conectar ahora; vuelve a intentar en un momento.",
  "status.missing": "Faltan datos: api_id, api_hash y el token del bot",
  "status.token": "Telegram no aceptó el token del bot",
  "status.apiId": "Telegram no aceptó tu api_id o api_hash",
  "status.connected": "Conectado como bot en este aparato",
  "status.notYet": "Sin conectar todavía: abre Inicio o toca Actualizar ahora",
  "status.flood": "Telegram pidió esperar {min}",
  "index.none": "Todavía no hay videos",
  "index.count.one": "1 video",
  "index.count.many": "{n} videos",
  "index.at": "actualizado hace {min}",
  "index.justNow": "actualizado ahora",
  "index.reading": "leyendo canales",
  "index.channelErrors": "{n} canal(es) con errores",
  "action.refreshed": "Listo: {count}, {added} nuevos",
  "action.forgot": "Listo: se borraron la sesión y el índice de este aparato",
  "validate.apiId": "Debe ser solo números",
  "validate.apiHash": "Deben ser 32 letras de la a a la f y números",
  "validate.token": "Debe verse como 123456:ABC… (lo da @BotFather)",
  "validate.tokenNeeded": "Con un bot hace falta su token (o elige «Mi cuenta»)",
  "setup.signin": "Inicia sesión con tu cuenta: Ajustes ▸ Video-Gram ▸ Iniciar sesión con QR",
  "setup.closed": "Tu sesión de Telegram se cerró: vuelve a iniciar sesión con QR en Ajustes ▸ Video-Gram",
  "setup.configAccount": "Escribe tu api_id y tu api_hash en Ajustes ▸ Video-Gram",
  "setup.noChats": "No hay chats con videos todavía: publica un video en un canal o en Mensajes guardados",
  "setup.checking": "Revisando tus chats para encontrar videos; vuelve en un momento",
  "um.signin": "Inicia sesión con tu cuenta en los ajustes de este plugin.",
  "um.closed": "La sesión se cerró: vuelve a iniciar sesión en los ajustes de este plugin.",
  "status.missingAccount": "Faltan datos: api_id y api_hash",
  "status.signin": "Sin sesión: toca Iniciar sesión con QR",
  "status.accountOn": "Sesión iniciada con tu cuenta en este aparato (solo lectura)",
  "status.closed": "Telegram cerró esta sesión: vuelve a iniciar sesión con QR",
  "status.password": "Tu cuenta tiene contraseña de dos pasos: escríbela arriba, toca Guardar y luego Confirmar la contraseña",
  "qr.botMode": "El inicio de sesión con QR es para «Mi cuenta»: elígelo en Conectar con y toca Guardar",
  "qr.already": "Ya iniciaste sesión con tu cuenta en este aparato",
  "qr.scan": "En tu teléfono, abre Telegram ▸ Ajustes ▸ Dispositivos ▸ Vincular un dispositivo y escanea el código",
  "qr.waiting": "Esperando que escanees el código con Telegram",
  "qr.expired": "El código venció: toca Iniciar sesión con QR otra vez",
  "qr.done": "Listo: sesión iniciada con tu cuenta (solo lectura)",
  "qr.password": "Tu cuenta tiene contraseña de dos pasos: escríbela arriba, toca Guardar y luego Confirmar la contraseña",
  "qr.failed": "No se pudo iniciar sesión ahora; vuelve a intentar",
  "qr.budget": "Demasiados intentos de inicio de sesión en este aparato: vuelve a intentar en {min}",
  "pw.notNeeded": "Telegram no está pidiendo una contraseña ahora",
  "pw.empty": "Escribe primero la contraseña arriba y toca Guardar",
  "pw.wrong": "La contraseña no es correcta; escríbela de nuevo, toca Guardar y luego Confirmar",
  "pw.budget": "Demasiados intentos de contraseña: vuelve a intentar en {min}",
  "logout.done": "Listo: se cerró la sesión de tu cuenta y se borró su índice en este aparato",
  "logout.none": "No hay una sesión de tu cuenta en este aparato",
  "chat.saved": "Mensajes guardados",
  "slots.free": "libre",
  "slots.gone": "sin acceso",
  "slots.none": "Todavía no hay canales ni chats con videos",
  "more.none": "Ninguno",
  "more.list": "{list}. Para dar un lugar: apaga uno arriba, toca Guardar y luego Dar lugar a los que esperan",
  "more.wasOn": "{title} (estaba activo)",
  "free.done": "Listo: {n} lugar(es) entregados; llegan apagados, actívalos arriba",
  "free.none": "No hay lugares apagados o no hay canales esperando",
  "index.checking": "revisando {n} chat(s)",
  "tab.recent": "Recientes",
};
const EN = {
  "row.recent": "Recent",
  "row.notice": "Notice",
  "setup.config": "Set up your Telegram bot in Settings ▸ Video-Gram",
  "setup.token": "Telegram did not accept the bot token: check it in Settings ▸ Video-Gram",
  "setup.apiId": "Telegram did not accept your api_id or api_hash: check them in Settings ▸ Video-Gram",
  "setup.noChannels": "Add the bot as administrator of your private channel and post a video",
  "setup.noneActive": "Turn a channel on in Settings ▸ Video-Gram to see its videos",
  "setup.empty": "No videos in your active channels yet: post one",
  "setup.flood": "Telegram asked to wait: try again in {min}",
  "setup.budget": "Too many bot logins on this device: try again in {min}",
  "setup.network": "Could not reach Telegram now; it will try again",
  "setup.unavailable": "The library is not available now; it will try again",
  "minutes.one": "1 minute",
  "minutes.many": "{n} minutes",
  "um.config": "Fill in your bot details in this plugin's settings.",
  "um.token": "The bot was not accepted: check its details in this plugin's settings.",
  "um.apiId": "Your app details were not accepted: check them in this plugin's settings.",
  "um.flood": "You need to wait {min} before going on; try again later.",
  "um.notFound": "This video is no longer in your channel, or the channel is turned off.",
  "um.unavailable": "Could not connect now; try again in a moment.",
  "status.missing": "Missing details: api_id, api_hash and the bot token",
  "status.token": "Telegram did not accept the bot token",
  "status.apiId": "Telegram did not accept your api_id or api_hash",
  "status.connected": "Connected as a bot on this device",
  "status.notYet": "Not connected yet: open Home or tap Refresh now",
  "status.flood": "Telegram asked to wait {min}",
  "index.none": "No videos yet",
  "index.count.one": "1 video",
  "index.count.many": "{n} videos",
  "index.at": "updated {min} ago",
  "index.justNow": "updated just now",
  "index.reading": "reading channels",
  "index.channelErrors": "{n} channel(s) with errors",
  "action.refreshed": "Done: {count}, {added} new",
  "action.forgot": "Done: this device's session and index were deleted",
  "validate.apiId": "Digits only",
  "validate.apiHash": "It must be 32 letters from a to f and digits",
  "validate.token": "It looks like 123456:ABC… (@BotFather gives it)",
  "validate.tokenNeeded": "A bot needs its token (or pick «My account»)",
  "setup.signin": "Sign in with your account: Settings ▸ Video-Gram ▸ Sign in with a QR",
  "setup.closed": "Your Telegram session was ended: sign in again with a QR in Settings ▸ Video-Gram",
  "setup.configAccount": "Enter your api_id and api_hash in Settings ▸ Video-Gram",
  "setup.noChats": "No chats with videos yet: post a video in a channel or in Saved Messages",
  "setup.checking": "Looking through your chats for videos; come back in a moment",
  "um.signin": "Sign in with your account in this plugin's settings.",
  "um.closed": "The session was ended: sign in again in this plugin's settings.",
  "status.missingAccount": "Missing details: api_id and api_hash",
  "status.signin": "Not signed in: tap Sign in with a QR",
  "status.accountOn": "Signed in with your account on this device (read only)",
  "status.closed": "Telegram ended this session: sign in again with a QR",
  "status.password": "Your account has a two-step password: type it above, tap Save, then Confirm the password",
  "qr.botMode": "Signing in with a QR is for «My account»: pick it in Connect with and tap Save",
  "qr.already": "You are already signed in with your account on this device",
  "qr.scan": "On your phone, open Telegram ▸ Settings ▸ Devices ▸ Link Desktop Device and scan the code",
  "qr.waiting": "Waiting for you to scan the code with Telegram",
  "qr.expired": "The code expired: tap Sign in with a QR again",
  "qr.done": "Done: signed in with your account (read only)",
  "qr.password": "Your account has a two-step password: type it above, tap Save, then Confirm the password",
  "qr.failed": "Could not sign in now; try again",
  "qr.budget": "Too many sign-in attempts on this device: try again in {min}",
  "pw.notNeeded": "Telegram is not asking for a password now",
  "pw.empty": "Type the password above and tap Save first",
  "pw.wrong": "The password is not right; type it again, tap Save, then Confirm",
  "pw.budget": "Too many password attempts: try again in {min}",
  "logout.done": "Done: your account was signed out and its index deleted on this device",
  "logout.none": "There is no session of your account on this device",
  "chat.saved": "Saved Messages",
  "slots.free": "free",
  "slots.gone": "no access",
  "slots.none": "No channels or chats with videos yet",
  "more.none": "None",
  "more.list": "{list}. To give one a place: turn one off above, tap Save, then Give places to those waiting",
  "more.wasOn": "{title} (was on)",
  "free.done": "Done: {n} place(s) given; they arrive off, turn them on above",
  "free.none": "No place is off, or no channel is waiting",
  "index.checking": "checking {n} chat(s)",
  "tab.recent": "Recent",
};

const isEnglish = () => String(kino.lang || "").toLowerCase().startsWith("en");

/** The text for `key` in the app's language, `{name}` filled from `vars`. */
function t(key, vars = {}) {
  const table = isEnglish() ? EN : ES;
  const s = table[key] !== undefined ? table[key] : ES[key];
  return String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? "" : String(vars[k])));
}

/** "5 minutos" / "1 minute": at least one minute, rounded up. */
function minutes(seconds) {
  const n = Math.max(1, Math.ceil(Number(seconds || 0) / 60));
  return n === 1 ? t("minutes.one") : t("minutes.many", { n });
}

const videoCount = (n) => (n === 1 ? t("index.count.one") : t("index.count.many", { n }));

const TEXT_TABLES = { ES, EN };
return { isEnglish, t, minutes, videoCount, TEXT_TABLES };
})();

// ---- src/shell/errors.js ----
const __mod_src_shell_errors = (() => {
// What reaches Kino when something fails: always a kino.error with one of its codes, an English detail made only of
// codes and numbers (never a message from elsewhere, so never a secret), and the person's sentence in their language.
const { t, minutes } = __mod_src_shell_text;

/** A failure the shell understands: `kind` is config | token | api_id | flood | budget | signin | closed | not_found | invalid | network | unavailable. */
function shellError(kind, detail = "", extra = {}) {
  const e = new Error(kind + (detail ? " " + detail : ""));
  e.shell = kind;
  Object.assign(e, extra);
  return e;
}

/** A core error (src/mtproto/errors.js codes) as the shell's kind. */
function kindOf(e) {
  if (e && e.shell) return e.shell;
  switch (e && e.code) {
    case "token_invalid": return "token";
    case "api_id_invalid": return "api_id";
    case "flood_wait": return "flood";
    case "login_budget": return "budget";
    case "closed": case "timeout": case "auth_key_unregistered": case "bad_msg": return "network";
    default: return "unavailable";
  }
}

const safeDetail = (e) => {
  const code = e && typeof e.code === "string" && /^[a-z_]{1,40}$/.test(e.code) ? e.code : "error";
  const rpc = e && typeof e.rpc === "string" && /^[A-Z0-9_]{1,60}$/.test(e.rpc) ? " " + e.rpc : "";
  return code + rpc;
};

function attach(err, fields) {
  try { Object.assign(err, fields); } catch { /* a frozen error keeps its code and message */ }
  return err;
}

/** Any error as the kino.error Kino shows. */
function toKinoError(e) {
  if (e && e.name && String(e.name).startsWith("KinoError")) return e; // already one of Kino's (a catalog refusal...)
  const kind = kindOf(e);
  const seconds = e && Number.isFinite(e.seconds) ? e.seconds : undefined;
  switch (kind) {
    case "config": return kino.error("auth_required", "settings missing", { userMessage: t("um.config") });
    case "token": return kino.error("auth_required", "bot token refused", { userMessage: t("um.token") });
    case "api_id": return kino.error("auth_required", "api id refused", { userMessage: t("um.apiId") });
    case "signin": return kino.error("auth_required", "account not signed in", { userMessage: t("um.signin") });
    case "closed": return kino.error("auth_required", "account session ended", { userMessage: t("um.closed") });
    case "flood":
    case "budget":
      return attach(kino.error("rate_limited", (kind === "flood" ? "flood_wait " : "login_budget ") + (seconds ?? 0) + "s", { userMessage: t("um.flood", { min: minutes(seconds) }) }), { seconds });
    case "not_found": return kino.error("not_found", e.message || "not found", { userMessage: t("um.notFound") });
    case "invalid": return kino.error("invalid_request", e.message || "invalid request");
    default: return kino.error("unavailable", safeDetail(e), { userMessage: t("um.unavailable") });
  }
}

/** Runs an export: whatever it throws reaches Kino as a kino.error (never a raw error). */
async function guard(fn) {
  await null; // the first await before anything that can throw (README: Kino 0.9.49 and older)
  try {
    return await fn();
  } catch (e) {
    throw toKinoError(e);
  }
}
return { shellError, kindOf, toKinoError, guard };
})();

// ---- src/mtproto/bytes.js ----
const __mod_src_mtproto_bytes = (() => {
// Uint8Array helpers for a runtime without Buffer (Kino's QuickJS). kino.crypto takes and returns strings, so the hot
// conversions (hex and base64 of a 1 MiB chunk) are written as single passes over typed arrays: each output character
// is a table lookup into a Uint8Array of char codes, turned into a string 8192 characters at a time with
// String.fromCharCode.apply (native), never by appending one character at a time.

const HEX_CHARS = "0123456789abcdef";
const B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const STR_CHUNK = 8192; // characters per String.fromCharCode.apply call (a multiple of 4 and of 2)

const HEX_CODE = new Uint8Array(16);
for (let i = 0; i < 16; i++) HEX_CODE[i] = HEX_CHARS.charCodeAt(i);
const HEX_VALUE = new Int8Array(256).fill(-1);
for (let i = 0; i < 16; i++) {
  HEX_VALUE[HEX_CHARS.charCodeAt(i)] = i;
  HEX_VALUE[HEX_CHARS.toUpperCase().charCodeAt(i)] = i;
}
const B64_CODE = new Uint8Array(64);
for (let i = 0; i < 64; i++) B64_CODE[i] = B64_CHARS.charCodeAt(i);
const B64_VALUE = new Int8Array(256).fill(-1);
for (let i = 0; i < 64; i++) B64_VALUE[B64_CHARS.charCodeAt(i)] = i;
B64_VALUE[45] = 62; // '-' (base64url)
B64_VALUE[95] = 63; // '_'

/** Char codes (all < 128) to a string, in native chunks. */
function codesToString(codes, length) {
  const parts = [];
  for (let i = 0; i < length; i += STR_CHUNK) {
    parts.push(String.fromCharCode.apply(null, codes.subarray(i, Math.min(i + STR_CHUNK, length))));
  }
  return parts.length === 1 ? parts[0] : parts.join("");
}

function toHex(u8) {
  const n = u8.length;
  const codes = new Uint8Array(n * 2);
  for (let i = 0, j = 0; i < n; i++, j += 2) {
    const b = u8[i];
    codes[j] = HEX_CODE[b >> 4];
    codes[j + 1] = HEX_CODE[b & 15];
  }
  return codesToString(codes, codes.length);
}

function fromHex(hex) {
  const s = String(hex);
  if (s.length % 2 !== 0) throw new Error("invalid hex: odd length");
  const n = s.length >> 1;
  const out = new Uint8Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 2) {
    const hi = HEX_VALUE[s.charCodeAt(j) & 255], lo = HEX_VALUE[s.charCodeAt(j + 1) & 255];
    if (hi < 0 || lo < 0 || s.charCodeAt(j) > 255 || s.charCodeAt(j + 1) > 255) throw new Error("invalid hex character");
    out[i] = (hi << 4) | lo;
  }
  return out;
}

function toBase64(u8) {
  const n = u8.length;
  const codes = new Uint8Array(((n + 2) / 3 | 0) * 4);
  let i = 0, j = 0;
  for (; i + 2 < n; i += 3, j += 4) {
    const v = (u8[i] << 16) | (u8[i + 1] << 8) | u8[i + 2];
    codes[j] = B64_CODE[v >> 18];
    codes[j + 1] = B64_CODE[(v >> 12) & 63];
    codes[j + 2] = B64_CODE[(v >> 6) & 63];
    codes[j + 3] = B64_CODE[v & 63];
  }
  if (i < n) {
    const two = i + 1 < n;
    const v = (u8[i] << 16) | (two ? u8[i + 1] << 8 : 0);
    codes[j] = B64_CODE[v >> 18];
    codes[j + 1] = B64_CODE[(v >> 12) & 63];
    codes[j + 2] = two ? B64_CODE[(v >> 6) & 63] : 61;
    codes[j + 3] = 61;
  }
  return codesToString(codes, codes.length);
}

function fromBase64(b64) {
  const s = String(b64);
  let len = s.length;
  while (len > 0 && s.charCodeAt(len - 1) === 61) len--; // '='
  if (s.length - len > 2 || len % 4 === 1) throw new Error("invalid base64 length");
  const out = new Uint8Array((len * 3) >> 2);
  let acc = 0, bits = 0, o = 0;
  for (let i = 0; i < len; i++) {
    const c = s.charCodeAt(i);
    const v = c < 256 ? B64_VALUE[c] : -1;
    if (v < 0) throw new Error("invalid base64 character");
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 255;
    }
  }
  return out;
}

/** Hex straight to base64 (the read() export answers base64; a downloaded chunk may arrive as hex). */
function hexToBase64(hex) {
  return toBase64(fromHex(hex));
}

function concat(...parts) {
  const list = parts.length === 1 && Array.isArray(parts[0]) ? parts[0] : parts;
  let n = 0;
  for (const p of list) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of list) { out.set(p, o); o += p.length; }
  return out;
}

function equal(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

function xor(a, b) {
  const out = new Uint8Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] ^ b[i];
  return out;
}

function reversed(u8) {
  const out = new Uint8Array(u8.length);
  for (let i = 0, n = u8.length; i < n; i++) out[i] = u8[n - 1 - i];
  return out;
}

function readU32LE(u8, o) {
  return (u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24)) >>> 0;
}
function readI32LE(u8, o) {
  return u8[o] | (u8[o + 1] << 8) | (u8[o + 2] << 16) | (u8[o + 3] << 24);
}
function writeU32LE(u8, o, v) {
  u8[o] = v & 255; u8[o + 1] = (v >>> 8) & 255; u8[o + 2] = (v >>> 16) & 255; u8[o + 3] = (v >>> 24) & 255;
}
function readI64LE(u8, o) {
  const lo = BigInt(readU32LE(u8, o)), hi = BigInt(readU32LE(u8, o + 4));
  return BigInt.asIntN(64, (hi << 32n) | lo);
}
function writeI64LE(u8, o, v) {
  const x = BigInt.asUintN(64, BigInt(v));
  writeU32LE(u8, o, Number(x & 0xffffffffn));
  writeU32LE(u8, o + 4, Number(x >> 32n));
}

/** Big-endian unsigned bytes to BigInt. */
function bigFromBytes(u8) {
  return u8.length ? BigInt("0x" + toHex(u8)) : 0n;
}

/** BigInt to big-endian unsigned bytes, left-padded to `len` when given. */
function bigToBytes(n, len) {
  if (n < 0n) throw new Error("negative BigInt");
  let h = n.toString(16);
  if (h.length % 2) h = "0" + h;
  if (n === 0n) h = len ? "" : "00";
  const raw = fromHex(h);
  if (!len) return raw;
  if (raw.length > len) throw new Error("BigInt does not fit in " + len + " bytes");
  const out = new Uint8Array(len);
  out.set(raw, len - raw.length);
  return out;
}

/** BigInt to fixed-width big-endian hex (kino.crypto.modPow speaks hex). */
function bigToHex(n, len) {
  return toHex(bigToBytes(n, len));
}

/** `n` random bytes from kino.crypto (at most 1024 per call there). */
function random(n) {
  const out = new Uint8Array(n);
  for (let o = 0; o < n; o += 1024) {
    const k = Math.min(1024, n - o);
    out.set(fromHex(kino.crypto.randomBytes(k, "hex")), o);
  }
  return out;
}

const utf8 = (s) => new TextEncoder().encode(String(s));
const fromUtf8 = (u8) => new TextDecoder().decode(u8);
return { toHex, fromHex, toBase64, fromBase64, hexToBase64, concat, equal, xor, reversed, readU32LE, readI32LE, writeU32LE, readI64LE, writeI64LE, bigFromBytes, bigToBytes, bigToHex, random, utf8, fromUtf8 };
})();

// ---- src/mtproto/crypto.js ----
const __mod_src_mtproto_crypto = (() => {
// The kino.crypto calls MTProto needs, with hex on both sides (hex can be sliced and joined at any byte, base64 only
// at multiples of 3). Every primitive runs natively in the app: hashes, AES-IGE, AES-CTR, modPow and gunzip.
const { toHex, fromHex, concat } = __mod_src_mtproto_bytes;

const HEX = { inputEncoding: "hex", outputEncoding: "hex" };

const sha1Hex = (hex) => kino.crypto.hash("sha1", hex, HEX);
const sha256Hex = (hex) => kino.crypto.hash("sha256", hex, HEX);
const sha1 = (...parts) => fromHex(sha1Hex(toHex(concat(parts))));
const sha256 = (...parts) => fromHex(sha256Hex(toHex(concat(parts))));

/** AES-256-IGE over hex. */
const igeEncryptHex = (dataHex, keyHex, ivHex) =>
  kino.crypto.aesIge("encrypt", keyHex, ivHex, dataHex, { keyEncoding: "hex", ivEncoding: "hex", ...HEX });
const igeDecryptHex = (dataHex, keyHex, ivHex) =>
  kino.crypto.aesIge("decrypt", keyHex, ivHex, dataHex, { keyEncoding: "hex", ivEncoding: "hex", ...HEX });
const igeEncrypt = (data, key, iv) => fromHex(igeEncryptHex(toHex(data), toHex(key), toHex(iv)));
const igeDecrypt = (data, key, iv) => fromHex(igeDecryptHex(toHex(data), toHex(key), toHex(iv)));

/** One-shot AES-256-CTR over hex, counter block = `ivHex` (CTR encryption and decryption are the same operation). */
const ctrHex = (dataHex, keyHex, ivHex) =>
  kino.crypto.encrypt("aes-256-ctr", { key: keyHex, iv: ivHex, data: dataHex, keyEncoding: "hex", ivEncoding: "hex", ...HEX });

/** base^exp mod mod over big-endian hex; the answer is padded to the modulus' byte width. */
const modPowHex = (baseHex, expHex, modHex) => kino.crypto.modPow(baseHex, expHex, modHex);

const gunzipHex = (hex) => kino.crypto.gunzip(hex, HEX);
return { sha1Hex, sha256Hex, sha1, sha256, igeEncryptHex, igeDecryptHex, igeEncrypt, igeDecrypt, ctrHex, modPowHex, gunzipHex };
})();

// ---- src/mtproto/errors.js ----
const __mod_src_mtproto_errors = (() => {
// Typed errors: every failure the library throws is an Error with a string `code` from CODES, plus the extra fields
// the code needs (`seconds` for flood_wait/login_budget, `dc` for the migrations, `rpc`/`status` for server errors).

const CODES = Object.freeze([
  "flood_wait",             // { seconds } Telegram asked to wait (FLOOD_WAIT_n, or a transport flood -429)
  "file_migrate",           // { dc } the file lives on another DC (FILE_MIGRATE_n)
  "user_migrate",           // { dc } the account lives on another DC (USER_/PHONE_/NETWORK_MIGRATE_n)
  "file_reference_expired", // the document's file_reference must be refreshed from its message
  "auth_key_unregistered",  // the server does not know this key or session (401s, transport -404)
  "bad_msg",                // { badMsgCode } the server refused our message and resending did not help
  "closed",                 // the socket closed
  "timeout",                // no answer in time
  "protocol",               // malformed or unexpected data from the server
  "rpc_error",              // { status, rpc } any other server error
  "invalid_request",        // bad arguments from the caller (offset/limit rules, missing fields)
  "login_budget",           // { seconds } too many bot logins on this device in the last hour
  "channel_invalid",        // the channel is unknown, its access hash is wrong, or the bot lost access (CHANNEL_INVALID/PRIVATE)
  "bot_method_invalid",     // a method bots may not call (BOT_METHOD_INVALID)
  "token_invalid",          // the bot token was refused at login (ACCESS_TOKEN_INVALID / ACCESS_TOKEN_EXPIRED)
  "api_id_invalid",         // the api_id/api_hash pair was refused (API_ID_INVALID, API_ID_PUBLISHED_FLOOD)
  "password_needed",        // the account has a 2FA password: auth.checkPassword next (SESSION_PASSWORD_NEEDED)
  "password_invalid",       // the 2FA password was wrong (PASSWORD_HASH_INVALID), or its SRP round went stale (SRP_ID_INVALID)
  "login_token_invalid",    // a QR login token expired, was already used or is unknown (AUTH_TOKEN_*)
]);

function mtError(code, message, extra) {
  const e = new Error(message);
  e.name = "MtprotoError";
  e.code = code;
  if (extra) Object.assign(e, extra);
  return e;
}

/** An rpc_error { code, message } as a typed error. */
function fromRpcError({ code, message }) {
  const m = String(message);
  const tail = (re) => { const x = re.exec(m); return x ? Number(x[1]) : null; };
  let n;
  if ((n = tail(/^FLOOD_(?:PREMIUM_)?WAIT_(\d+)$/)) !== null) return mtError("flood_wait", m, { seconds: n, status: code, rpc: m });
  if ((n = tail(/^FILE_MIGRATE_(\d+)$/)) !== null) return mtError("file_migrate", m, { dc: n, status: code, rpc: m });
  if ((n = tail(/^(?:USER|PHONE|NETWORK)_MIGRATE_(\d+)$/)) !== null) return mtError("user_migrate", m, { dc: n, status: code, rpc: m });
  if (/^FILE_REFERENCE_/.test(m)) return mtError("file_reference_expired", m, { status: code, rpc: m });
  if (m === "CHANNEL_INVALID" || m === "CHANNEL_PRIVATE") return mtError("channel_invalid", m, { status: code, rpc: m });
  if (/^ACCESS_TOKEN_(INVALID|EXPIRED)$/.test(m)) return mtError("token_invalid", m, { status: code, rpc: m });
  if (/^API_ID_(INVALID|PUBLISHED_FLOOD)$/.test(m)) return mtError("api_id_invalid", m, { status: code, rpc: m });
  if (m === "BOT_METHOD_INVALID") return mtError("bot_method_invalid", m, { status: code, rpc: m });
  // Before the 401 rule: SESSION_PASSWORD_NEEDED is a 401 that keeps the key (the login goes on with the password).
  if (m === "SESSION_PASSWORD_NEEDED") return mtError("password_needed", m, { status: code, rpc: m });
  if (m === "PASSWORD_HASH_INVALID" || m === "SRP_ID_INVALID" || m === "SRP_PASSWORD_CHANGED") return mtError("password_invalid", m, { status: code, rpc: m });
  if (/^AUTH_TOKEN_(INVALID|EXPIRED|ALREADY_ACCEPTED|INVALIDX)$/.test(m)) return mtError("login_token_invalid", m, { status: code, rpc: m });
  if (code === 401 || /^AUTH_KEY_(UNREGISTERED|INVALID|DUPLICATED)$/.test(m) || m === "SESSION_REVOKED") return mtError("auth_key_unregistered", m, { status: code, rpc: m });
  return mtError("rpc_error", code + " " + m, { status: code, rpc: m });
}

/** A 4-byte transport packet (a negative int32 error code) as a typed error. */
function fromTransportError(status) {
  if (status === -404) return mtError("auth_key_unregistered", "transport error -404", { status, transport: true });
  if (status === -429) return mtError("flood_wait", "transport error -429", { status, seconds: 5, transport: true });
  return mtError("protocol", "transport error " + status, { status, transport: true });
}

const scrubText = (s) => String(s).replace(/[0-9a-fA-F]{16,}/g, "<hex>").replace(/[A-Za-z0-9+/_-]{32,}={0,2}/g, "<b64>").replace(/["\\]/g, "'").replace(/\s+/g, " ").slice(0, 160);

/**
 * One line of detail for any thrown value, for the logs: a typed error as `code=<code> rpc=<RPC> seconds= dc=`, anything
 * else as `code=- name=<constructor or typeof> message="<text>" at=<first stack frame>`. Long hex or base64 runs are cut
 * out (no data, no keys), and nothing is ever `undefined`.
 */
function describeError(e) {
  if (e && typeof e === "object" && typeof e.code === "string" && /^[a-z_]{1,40}$/.test(e.code)) {
    const parts = ["code=" + e.code];
    if (typeof e.rpc === "string" && /^[A-Z0-9_]{1,60}$/.test(e.rpc)) parts.push("rpc=" + e.rpc);
    if (Number.isFinite(e.seconds)) parts.push("seconds=" + Math.round(e.seconds));
    if (Number.isFinite(e.dc)) parts.push("dc=" + Math.round(e.dc));
    if (e.deadline === true) parts.push("deadline=1");
    return parts.join(" ");
  }
  if (e instanceof Error || (e && typeof e === "object" && typeof e.message === "string")) {
    const name = typeof e.name === "string" && e.name ? e.name : "Error";
    const frame = typeof e.stack === "string" ? (e.stack.split("\n").map((l) => l.trim()).find((l) => l.startsWith("at ")) || "") : "";
    return 'code=- name=' + scrubText(name).replace(/\s/g, "") + ' message="' + scrubText(e.message) + '"' + (frame ? " at=" + scrubText(frame.slice(3)).replace(/\s/g, "") : "");
  }
  if (e === null) return 'code=- name=null message=""';
  if (e === undefined) return 'code=- name=nothing message=""'; // `throw undefined`: said so, never the word undefined
  if (typeof e === "object") return 'code=- name=object message="[object]"';
  return "code=- name=" + typeof e + ' message="' + scrubText(e) + '"';
}

/** Whether `e` leaves the connection it came from in a known state (a server's own answer): else it must be dropped. */
const isServerAnswer = (e) => !!(e && typeof e === "object" && ["flood_wait", "file_migrate", "user_migrate", "file_reference_expired", "rpc_error", "channel_invalid", "bot_method_invalid", "token_invalid", "api_id_invalid", "auth_key_unregistered", "login_budget", "invalid_request", "password_needed", "password_invalid", "login_token_invalid"].includes(e.code) && !e.transport);
return { CODES, mtError, fromRpcError, fromTransportError, describeError, isServerAnswer };
})();

// ---- src/mtproto/big.js ----
const __mod_src_mtproto_big = (() => {
// A hand-kept MODEL of the big strings this library holds at once (hex of packets and chunks), so a test can bound the
// peak under QuickJS's 64 MiB per-plugin cap. It is NOT the real QuickJS heap: it only knows what the code tells it
// (hold when a big string is made or taken, release at its last use), so it catches a release missing in our code, or a
// copy kept longer than planned, never a reference kept by mistake that nobody declared, and never the copies made
// inside kino.crypto/kino.ws (the prelude's JSON, Kotlin). Strings handed to a caller (getFile's answer) are the
// caller's: not counted here. Counts characters of strings of at least BIG characters (hex: 2 per byte).
const BIG = 65536;
const big = {
  live: 0,
  peak: 0,
  /** Counts a string of `n` characters (when it is big); answers what it counted, for a symmetric release. */
  hold(n) { if (n >= BIG) { this.live += n; if (this.live > this.peak) this.peak = this.live; return n; } return 0; },
  /** The opposite of hold(n). No clamp: a release with no matching hold shows as a negative live count. */
  release(n) { if (n >= BIG) this.live -= n; },
  /** Takes back exactly what hold() answered (a sum of holds of different sizes). */
  releaseCounted(counted) { this.live -= counted; },
  reset() { this.live = 0; this.peak = 0; },
};
return { big };
})();

// ---- src/mtproto/transport.js ----
const __mod_src_mtproto_transport = (() => {
// Obfuscated "intermediate" MTProto transport over kino.ws, as the spike's Transport (mtproto.mjs) did over Node's
// WebSocket: a 64-byte random init whose tail is encrypted, then packets `len:uint32le payload`, the whole stream in
// each direction under one AES-256-CTR keystream that continues across messages.
//
// kino.crypto's CTR is one-shot (key + iv in, bytes out), so CtrStream keeps the stream position itself: the byte at
// stream offset k uses counter block iv + floor(k / 16), so a message starting at offset k is encrypted as
// (k % 16 zero bytes + data) under iv + floor(k / 16) and the k % 16 prefix bytes are dropped.
//
// Frames cross kino.ws as hex strings (apiVersion 13: `send(hex, { encoding: "hex" })`, `recv(ms, { encoding: "hex" })`):
// Kino encodes and decodes them natively, so no JavaScript loop touches the bytes of a chunk. An app without frame
// encodings answers a Uint8Array or refuses a string: the transport notices it once and goes on the old way.
const { toHex, fromHex, readU32LE, writeU32LE, random, reversed } = __mod_src_mtproto_bytes;
const { ctrHex } = __mod_src_mtproto_crypto;
const { mtError } = __mod_src_mtproto_errors;
const { big } = __mod_src_mtproto_big;

const DC_HOSTS = Object.freeze({ 1: "pluto", 2: "venus", 3: "aurora", 4: "vesta", 5: "flora" });
const MAX_SEND_BYTES = 786000; // kino.ws frame cap
// A 1 MiB chunk is ~1 MiB + 100 bytes; at most 3 chunk requests are in flight (client.js), so Telegram may pack at most
// three answers into one container. Past 3 MiB + 64 KiB it is not an answer of ours (and its hex copies would not fit
// QuickJS's 64 MiB cap).
const MAX_PACKET_BYTES = 3 * (1 << 20) + 65536;
const MASK128 = (1n << 128n) - 1n;
const ZEROS = "00".repeat(16);

function dcUrl(dc) {
  const host = DC_HOSTS[dc];
  if (!host) throw mtError("invalid_request", "unknown DC " + dc);
  return "wss://" + host + ".web.telegram.org/apiws";
}

class CtrStream {
  constructor(keyHex, ivHex) {
    this.key = keyHex;
    this.iv = BigInt("0x" + ivHex);
    this.offset = 0;
  }
  /** Encrypts (or decrypts) the next bytes of the stream, given and returned as hex. */
  processHex(dataHex) {
    if (dataHex.length === 0) return "";
    const skip = this.offset % 16;
    const block = BigInt(Math.floor(this.offset / 16));
    const iv = ((this.iv + block) & MASK128).toString(16).padStart(32, "0");
    const out = ctrHex(skip ? ZEROS.slice(0, skip * 2) + dataHex : dataHex, this.key, iv);
    this.offset += dataHex.length / 2;
    return skip ? out.slice(skip * 2) : out;
  }
}

const BAD_FIRST_WORDS = [0x44414548, 0x54534f50, 0x20544547, 0x4954504f, 0xeeeeeeee, 0xdddddddd, 0x02010316];

/** The 64-byte obfuscation init (plain), as the spike made it: never mistaken for another protocol's first bytes. */
function makeInit(dc, rand = random) {
  for (;;) {
    const b = rand(64);
    if (b[0] === 0xef) continue;
    if (BAD_FIRST_WORDS.includes(readU32LE(b, 0))) continue;
    if (readU32LE(b, 4) === 0) continue;
    writeU32LE(b, 56, 0xeeeeeeee);
    b[60] = dc & 255;
    b[61] = (dc >> 8) & 255;
    return b;
  }
}

class Transport {
  /** `open` is kino.ws.open (injectable for tests); `url` defaults to the DC's apiws address. */
  constructor(dc, { url, open } = {}) {
    this.dc = dc;
    this.url = url || dcUrl(dc);
    this.wsOpen = open || ((u, o) => kino.ws.open(u, o));
    this.ws = null;
    this.bufHex = "";   // the start of the stream not yet returned as packets
    this.pending = [];  // later frames (deobfuscated hex) not yet joined: one join per packet, not one per frame
    this.pendingChars = 0;
    this.encoded = true; // frames as hex strings, until the app shows it cannot
    this.closed = false;
  }

  async open() {
    const init = makeInit(this.dc);
    const keyIv = init.subarray(8, 56);
    const rev = reversed(keyIv);
    this.enc = new CtrStream(toHex(init.subarray(8, 40)), toHex(init.subarray(40, 56)));
    this.dec = new CtrStream(toHex(rev.subarray(0, 32)), toHex(rev.subarray(32, 48)));
    const encInit = this.enc.processHex(toHex(init));
    this.firstHex = toHex(init.subarray(0, 56)) + encInit.slice(112, 128);
    try {
      this.ws = await this.wsOpen(this.url, { protocol: "binary" });
    } catch (e) {
      throw mtError(e && e.code === "timeout" ? "timeout" : "closed", "could not open " + this.url + ": " + (e && e.message), { cause: e && e.code });
    }
    return this;
  }

  /** Sends one packet; `payloadHex` is the MTProto message (unencrypted or encrypted) as hex. */
  async sendHex(payloadHex) {
    if (this.closed || !this.ws) throw mtError("closed", "transport closed");
    // The size first: once CTR has run, the keystream has moved and a refused send would leave the stream out of step.
    if (4 + payloadHex.length / 2 + (this.firstHex ? this.firstHex.length / 2 : 0) > MAX_SEND_BYTES) throw mtError("invalid_request", "packet too large for one frame");
    const len = new Uint8Array(4);
    writeU32LE(len, 0, payloadHex.length / 2);
    let wire = this.enc.processHex(toHex(len) + payloadHex);
    if (this.firstHex) { wire = this.firstHex + wire; this.firstHex = null; }
    try {
      if (this.encoded) {
        try {
          await this.ws.send(wire, { encoding: "hex" });
        } catch (e) {
          if (!(e && e.code === "invalid_request" && /Uint8Array/.test(String(e.message)))) throw e;
          this.encoded = false; // an app without frame encodings
          await this.ws.send(fromHex(wire));
        }
      } else {
        await this.ws.send(fromHex(wire));
      }
    } catch (e) {
      const code = e && e.code;
      if (code === "too_large" || code === "invalid_request") throw mtError("invalid_request", "send refused: " + (e && e.message), { cause: code });
      this.closed = true;
      throw mtError("closed", "send failed: " + (e && e.message), { cause: code });
    }
  }

  /** The next packet's payload as hex. Throws `timeout` after `timeoutMs`, `closed` when the socket ends. */
  async recvHex(timeoutMs = 20000, now = () => Date.now(), trace) {
    const deadline = now() + timeoutMs;
    const join = () => {
      if (!this.pending.length) return;
      // One copy of the frames joined; the frames go right after (they are the only other copy).
      const joined = this.pending.length === 1 ? this.pending[0] : this.pending.join("");
      if (this.pending.length > 1) { big.hold(joined.length); for (const p of this.pending) big.release(p.length); } // one frame: the same string
      this.pending = [];
      this.pendingChars = 0;
      if (this.bufHex === "") { this.bufHex = joined; return; } // the usual case: no second concatenated copy
      big.hold(this.bufHex.length + joined.length);
      big.release(this.bufHex.length); big.release(joined.length);
      this.bufHex += joined;
    };
    for (;;) {
      if (this.bufHex.length < 8) join();
      if (this.bufHex.length >= 8) {
        const n = readU32LE(fromHex(this.bufHex.slice(0, 8)), 0) & 0x7fffffff;
        if (n > MAX_PACKET_BYTES) {
          await this.close();
          throw mtError("protocol", "packet of " + n + " bytes announced: over the " + MAX_PACKET_BYTES + "-byte cap");
        }
        if (this.bufHex.length + this.pendingChars >= 8 + n * 2) {
          join();
          const payload = this.bufHex.slice(8, 8 + n * 2);
          big.hold(payload.length);
          const rest = this.bufHex.length > 8 + n * 2 ? this.bufHex.slice(8 + n * 2) : "";
          big.release(this.bufHex.length); big.hold(rest.length);
          this.bufHex = rest;
          return payload; // the caller owns it (and releases it)
        }
      }
      if (this.closed || !this.ws) throw mtError("closed", "transport closed");
      const left = deadline - now();
      if (left <= 0) throw mtError("timeout", "no answer from DC " + this.dc);
      let frame;
      const t0 = trace ? Date.now() : 0;
      try {
        frame = await this.ws.recv(Math.min(left, 60000), this.encoded ? { encoding: "hex" } : undefined);
      } catch (e) {
        this.closed = true;
        throw mtError(e && e.code === "limit" ? "protocol" : "closed", "socket closed: " + (e && e.message), { cause: e && e.code });
      }
      if (frame === null) { if (trace) trace.wsrecv += Date.now() - t0; continue; }
      const t1 = trace ? Date.now() : 0;
      let fh;
      if (typeof frame === "string") fh = frame;
      else { this.encoded = false; fh = toHex(frame); } // an app that ignored the encoding: the old JS pass
      const t2 = trace ? Date.now() : 0;
      const plain = this.dec.processHex(fh);
      fh = null; frame = null; // the encrypted frame dies here: only its plaintext is kept
      big.hold(plain.length);
      this.pending.push(plain);
      this.pendingChars += plain.length;
      if (trace) {
        // Timing (the shell's TIMING switch): numbers only, never the data.
        trace.wsrecv += t1 - t0; trace.frames++; trace.frameBytes += plain.length / 2;
        if (!trace.firstFrameAt) trace.firstFrameAt = t1;
        trace.tohex += t2 - t1; trace.ctr += Date.now() - t2;
      }
    }
  }

  async close() {
    this.closed = true;
    big.release(this.bufHex.length);
    for (const p of this.pending) big.release(p.length);
    this.bufHex = "";
    this.pending = [];
    this.pendingChars = 0;
    const ws = this.ws;
    this.ws = null;
    if (ws) { try { await ws.close(); } catch { /* already closed */ } }
  }
}
return { DC_HOSTS, MAX_SEND_BYTES, MAX_PACKET_BYTES, dcUrl, CtrStream, makeInit, Transport };
})();

// ---- src/mtproto/tl.js ----
const __mod_src_mtproto_tl = (() => {
// TL serialization for the constructors this plugin uses (MTProto layer 198), ported from the spike's W/R
// (telegram-mtproto-spike/mtproto.mjs) to Uint8Array. Readers of server answers never crash on a constructor they do
// not know: they answer { ctor, raw } (or mark what they read as `incomplete`) and leave the decision to the caller.
const { concat, utf8, fromUtf8, fromHex, readU32LE, readI32LE, writeU32LE, writeI64LE, readI64LE } = __mod_src_mtproto_bytes;

const LAYER = 198;

const CTOR = Object.freeze({
  vector: 0x1cb5c415,
  boolTrue: 0x997275b5,
  boolFalse: 0xbc799737,
  // auth key exchange
  reqPqMulti: 0xbe7e8ef1,
  resPQ: 0x05162463,
  pqInnerDataDc: 0xa9f55f95,
  reqDHParams: 0xd712e4be,
  serverDHParamsOk: 0xd0e8075c,
  serverDHParamsFail: 0x79cb045d,
  serverDHInnerData: 0xb5890dba,
  clientDHInnerData: 0x6643b654,
  setClientDHParams: 0xf5045f1f,
  dhGenOk: 0x3bcbf734,
  dhGenRetry: 0x46dc1fb9,
  dhGenFail: 0xa69dae02,
  // service messages
  rpcResult: 0xf35c6d01,
  rpcError: 0x2144ca19,
  msgContainer: 0x73f1f8dc,
  gzipPacked: 0x3072cfa1,
  msgsAck: 0x62d6b459,
  badServerSalt: 0xedab447b,
  badMsgNotification: 0xa7eff811,
  newSessionCreated: 0x9ec20908,
  msgDetailedInfo: 0x276d3ec6,
  msgNewDetailedInfo: 0x809db6df,
  futureSalts: 0xae500895,
  pong: 0x347773c5,
  ping: 0x7abe77ec,
  // API
  invokeWithLayer: 0xda9b0d0d,
  initConnection: 0xc1cd5ea9,
  importBotAuthorization: 0x67a3ff2c,
  exportAuthorization: 0xe5bfffcd,
  exportedAuthorization: 0xb434e2b8,
  importAuthorization: 0xa57a7dad,
  authAuthorization: 0x2ea2c0d4,
  authAuthorizationSignUpRequired: 0x44747e9a,
  user: 0x4b46c37e,
  userEmpty: 0xd3bc4b7a,
  inputDocumentFileLocation: 0xbad07584,
  uploadGetFile: 0xbe5335be,
  uploadFile: 0x096a18d5,
  uploadFileCdnRedirect: 0xf18cda44,
  // messages and documents (for the library index)
  message: 0x96fdbbe9,
  messageEmpty: 0x90a6ca84,
  messageService: 0xd3d28540,
  messageMediaDocument: 0x52d8ccd9,
  messageFwdHeader: 0x4e4df4bb,
  messageReplyHeader: 0xafbc09db,
  messageReplyStoryHeader: 0x0e5af939,
  peerUser: 0x59511722,
  peerChat: 0x36c6019a,
  peerChannel: 0xa2a5371e,
  document: 0x8fd4c4d8,
  documentEmpty: 0x36f8c871,
  updateNewMessage: 0x1f2b0afd,
  updateNewChannelMessage: 0x62ba04d9,
  updateShort: 0x78d4dec1,
  updates: 0x74ae4240,
});

const TYPED_ERROR = (message) => Object.assign(new Error(message), { code: "protocol" });

class Writer {
  constructor() { this.parts = []; }
  raw(u8) { this.parts.push(u8 instanceof Uint8Array ? u8 : Uint8Array.from(u8)); return this; }
  int(v) { const b = new Uint8Array(4); writeU32LE(b, 0, v >>> 0); this.parts.push(b); return this; }
  long(v) { const b = new Uint8Array(8); writeI64LE(b, 0, typeof v === "bigint" ? v : BigInt(v)); this.parts.push(b); return this; }
  int128(u8) { if (u8.length !== 16) throw new Error("int128 needs 16 bytes"); return this.raw(u8); }
  int256(u8) { if (u8.length !== 32) throw new Error("int256 needs 32 bytes"); return this.raw(u8); }
  double(v) { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, v, true); this.parts.push(b); return this; }
  bool(v) { return this.int(v ? CTOR.boolTrue : CTOR.boolFalse); }
  bytes(u8) {
    const n = u8.length;
    if (n > 0xffffff) throw new Error("TL bytes too long");
    const headLen = n < 254 ? 1 : 4;
    const pad = (4 - ((headLen + n) % 4)) % 4;
    const out = new Uint8Array(headLen + n + pad);
    if (n < 254) out[0] = n;
    else { out[0] = 254; out[1] = n & 255; out[2] = (n >> 8) & 255; out[3] = (n >> 16) & 255; }
    out.set(u8, headLen);
    this.parts.push(out);
    return this;
  }
  string(s) { return this.bytes(utf8(s)); }
  vectorLong(list) { this.int(CTOR.vector).int(list.length); for (const v of list) this.long(v); return this; }
  vectorInt(list) { this.int(CTOR.vector).int(list.length); for (const v of list) this.int(v); return this; }
  done() { return concat(this.parts); }
}

class Reader {
  constructor(u8, offset = 0) { this.b = u8; this.o = offset; }
  need(n) { if (this.o + n > this.b.length) throw TYPED_ERROR("TL read past the end"); }
  int() { this.need(4); const v = readU32LE(this.b, this.o); this.o += 4; return v; }
  int32() { this.need(4); const v = readI32LE(this.b, this.o); this.o += 4; return v; }
  long() { this.need(8); const v = readI64LE(this.b, this.o); this.o += 8; return v; }
  double() { this.need(8); const v = new DataView(this.b.buffer, this.b.byteOffset + this.o, 8).getFloat64(0, true); this.o += 8; return v; }
  raw(n) { this.need(n); const v = this.b.subarray(this.o, this.o + n); this.o += n; return v; }
  int128() { return this.raw(16); }
  int256() { return this.raw(32); }
  bool() {
    const c = this.int();
    if (c === CTOR.boolTrue) return true;
    if (c === CTOR.boolFalse) return false;
    throw TYPED_ERROR("not a Bool: 0x" + c.toString(16));
  }
  bytes() {
    this.need(1);
    let len = this.b[this.o], head = 1;
    if (len === 254) { this.need(4); len = this.b[this.o + 1] | (this.b[this.o + 2] << 8) | (this.b[this.o + 3] << 16); head = 4; }
    else if (len === 255) throw TYPED_ERROR("bad TL bytes length");
    const pad = (4 - ((head + len) % 4)) % 4;
    this.need(head + len + pad);
    const v = this.b.subarray(this.o + head, this.o + head + len);
    this.o += head + len + pad;
    return v;
  }
  string() { return fromUtf8(this.bytes()); }
  vectorHeader() { const c = this.int(); if (c !== CTOR.vector) throw TYPED_ERROR("not a vector: 0x" + c.toString(16)); return this.int(); }
  vectorLong() { const n = this.vectorHeader(); const out = []; for (let i = 0; i < n; i++) out.push(this.long()); return out; }
  vectorInt() { const n = this.vectorHeader(); const out = []; for (let i = 0; i < n; i++) out.push(this.int()); return out; }
  rest() { const v = this.b.subarray(this.o); this.o = this.b.length; return v; }
  peekInt() { this.need(4); return readU32LE(this.b, this.o); }
  atEnd() { return this.o >= this.b.length; }
}

// ---- builders: auth key exchange ----

const reqPqMulti = (nonce) => new Writer().int(CTOR.reqPqMulti).int128(nonce).done();

const pqInnerDataDc = ({ pq, p, q, nonce, serverNonce, newNonce, dc }) =>
  new Writer().int(CTOR.pqInnerDataDc).bytes(pq).bytes(p).bytes(q).int128(nonce).int128(serverNonce).int256(newNonce).int(dc).done();

const reqDHParams = ({ nonce, serverNonce, p, q, fingerprint, encryptedData }) =>
  new Writer().int(CTOR.reqDHParams).int128(nonce).int128(serverNonce).bytes(p).bytes(q).long(fingerprint).bytes(encryptedData).done();

const clientDHInnerData = ({ nonce, serverNonce, retryId = 0n, gB }) =>
  new Writer().int(CTOR.clientDHInnerData).int128(nonce).int128(serverNonce).long(retryId).bytes(gB).done();

const setClientDHParams = ({ nonce, serverNonce, encryptedData }) =>
  new Writer().int(CTOR.setClientDHParams).int128(nonce).int128(serverNonce).bytes(encryptedData).done();

// ---- builders: API ----

const invokeWithLayer = (layer, query) => new Writer().int(CTOR.invokeWithLayer).int(layer).raw(query).done();

function initConnection({ apiId, deviceModel, systemVersion, appVersion, systemLangCode, langPack = "", langCode }, query) {
  return new Writer().int(CTOR.initConnection).int(0).int(apiId)
    .string(deviceModel).string(systemVersion).string(appVersion).string(systemLangCode).string(langPack).string(langCode)
    .raw(query).done();
}

const importBotAuthorization = ({ apiId, apiHash, botToken }) =>
  new Writer().int(CTOR.importBotAuthorization).int(0).int(apiId).string(apiHash).string(botToken).done();

const exportAuthorization = (dcId) => new Writer().int(CTOR.exportAuthorization).int(dcId).done();

const importAuthorization = ({ id, bytes }) => new Writer().int(CTOR.importAuthorization).long(id).bytes(bytes).done();

// account login (QR) and logout, layer 198:
// auth.exportLoginToken#b7e085fe api_id:int api_hash:string except_ids:Vector<long> = auth.LoginToken
// auth.importLoginToken#95ac5ce4 token:bytes = auth.LoginToken
// account.getPassword#548a30f5 = account.Password
// auth.checkPassword#d18b4d16 password:InputCheckPasswordSRP = auth.Authorization
// inputCheckPasswordSRP#d27ff082 srp_id:long A:bytes M1:bytes
// auth.logOut#3e72ba19 = auth.LoggedOut
const exportLoginToken = ({ apiId, apiHash }) => new Writer().int(0xb7e085fe).int(apiId).string(apiHash).vectorLong([]).done();
const importLoginToken = (token) => new Writer().int(0x95ac5ce4).bytes(token).done();
const getPassword = () => new Writer().int(0x548a30f5).done();
const checkPassword = ({ srpId, A, M1 }) => new Writer().int(0xd18b4d16).int(0xd27ff082).long(srpId).bytes(A).bytes(M1).done();
const logOut = () => new Writer().int(0x3e72ba19).done();

const msgsAck = (ids) => new Writer().int(CTOR.msgsAck).vectorLong(ids).done();

const inputDocumentFileLocation = ({ id, accessHash, fileReference, thumbSize = "" }) =>
  new Writer().int(CTOR.inputDocumentFileLocation).long(id).long(accessHash).bytes(fileReference).string(thumbSize).done();

const uploadGetFile = (location, offset, limit, { precise = false, cdnSupported = false } = {}) =>
  new Writer().int(CTOR.uploadGetFile).int((precise ? 1 : 0) | (cdnSupported ? 2 : 0)).raw(location).long(offset).int(limit).done();

// ---- readers ----

function parseRpcError(r) {
  const c = r.int();
  if (c !== CTOR.rpcError) throw TYPED_ERROR("not an rpc_error");
  return { code: r.int32(), message: r.string() };
}

/** upload.file -> { ctor, fileType, mtime, bytes }; anything else -> { ctor, raw }. */
function parseUploadFile(u8) {
  const r = new Reader(u8);
  const ctor = r.int();
  if (ctor !== CTOR.uploadFile) return { ctor, raw: u8 };
  const fileType = r.int();
  const mtime = r.int();
  return { ctor, fileType, mtime, bytes: r.bytes() };
}

// ---- the same reads on hex (the download path: only the few header bytes are decoded, the data is a native slice) ----

/** The uint32 (little endian) at byte `o` of a hex string. */
function hexU32(hex, o) {
  if (hex.length < (o + 4) * 2) throw TYPED_ERROR("TL read past the end");
  return readU32LE(fromHex(hex.slice(o * 2, o * 2 + 8)), 0);
}

/** The TL `bytes` at byte `o` of a hex string: { hex, end } (`end` = the byte offset after its padding). */
function hexBytesAt(hex, o) {
  const size = hex.length / 2;
  if (o + 1 > size) throw TYPED_ERROR("TL read past the end");
  let len = parseInt(hex.slice(o * 2, o * 2 + 2), 16), head = 1;
  if (len === 254) {
    if (o + 4 > size) throw TYPED_ERROR("TL read past the end");
    const h = fromHex(hex.slice(o * 2 + 2, o * 2 + 8));
    len = h[0] | (h[1] << 8) | (h[2] << 16);
    head = 4;
  } else if (len === 255) throw TYPED_ERROR("bad TL bytes length");
  const pad = (4 - ((head + len) % 4)) % 4;
  if (o + head + len + pad > size) throw TYPED_ERROR("TL read past the end");
  return { hex: hex.slice((o + head) * 2, (o + head + len) * 2), end: o + head + len + pad };
}

/** parseUploadFile over hex: { ctor, fileType, mtime, bytesHex } for upload.file, else { ctor }. */
function parseUploadFileHex(hex) {
  const ctor = hexU32(hex, 0);
  if (ctor !== CTOR.uploadFile) return { ctor };
  return { ctor, fileType: hexU32(hex, 4), mtime: hexU32(hex, 8), bytesHex: hexBytesAt(hex, 12).hex };
}

function parseExportedAuthorization(u8) {
  const r = new Reader(u8);
  const ctor = r.int();
  if (ctor !== CTOR.exportedAuthorization) return { ctor, raw: u8 };
  return { ctor, id: r.long(), bytes: r.bytes() };
}

/** auth.authorization -> { ctor, userId?, tmpSessions?, ... }; only the head of User is read (flags, flags2, id). */
function parseAuthorization(u8) {
  const r = new Reader(u8);
  const ctor = r.int();
  if (ctor === CTOR.authAuthorizationSignUpRequired) return { ctor, signUpRequired: true };
  if (ctor !== CTOR.authAuthorization) return { ctor, raw: u8 };
  const out = { ctor };
  const flags = r.int();
  if (flags & 2) { out.setupPasswordRequired = true; out.otherwiseReloginDays = r.int(); }
  if (flags & 1) out.tmpSessions = r.int();
  if (flags & 4) out.futureAuthToken = r.bytes();
  try {
    const userCtor = r.int();
    if (userCtor === CTOR.userEmpty) out.userId = r.long();
    else if (userCtor === CTOR.user) { const uflags = r.int(); r.int(); out.userId = r.long(); out.bot = (uflags & (1 << 14)) !== 0; }
    else out.userCtor = userCtor;
  } catch { out.incomplete = true; }
  return out;
}

function parsePeer(r) {
  const c = r.int();
  if (c === CTOR.peerUser) return { kind: "user", id: r.long() };
  if (c === CTOR.peerChat) return { kind: "chat", id: r.long() };
  if (c === CTOR.peerChannel) return { kind: "channel", id: r.long() };
  throw TYPED_ERROR("unknown Peer 0x" + c.toString(16));
}

const PHOTO_SIZE = {
  0x0e17e23c: (r) => { r.string(); },
  0x75c78e60: (r) => { r.string(); r.int(); r.int(); r.int(); },
  0x021e1ad6: (r) => { r.string(); r.int(); r.int(); r.bytes(); },
  0xe0b0bc2e: (r) => { r.string(); r.bytes(); },
  0xfa3efb95: (r) => { r.string(); r.int(); r.int(); r.vectorInt(); },
  0xd8214d41: (r) => { r.string(); r.bytes(); },
};
const INPUT_STICKER_SET = {
  0xffb62b95: () => {},
  0x9de7a269: (r) => { r.long(); r.long(); },
  0x861cc8a0: (r) => { r.string(); },
};
const skipInputStickerSet = (r) => { const c = r.int(); const f = INPUT_STICKER_SET[c]; if (!f) throw TYPED_ERROR("unknown InputStickerSet"); f(r); };
const VIDEO_SIZE = {
  0xde33b094: (r) => { const fl = r.int(); r.string(); r.int(); r.int(); r.int(); if (fl & 1) r.double(); },
  0xf85c413c: (r) => { r.long(); r.vectorInt(); },
  0x0da082fe: (r) => { skipInputStickerSet(r); r.long(); r.vectorInt(); },
};

function skipVectorOf(r, table, what) {
  const n = r.vectorHeader();
  for (let i = 0; i < n; i++) {
    const c = r.int();
    const f = table[c];
    if (!f) throw TYPED_ERROR("unknown " + what + " 0x" + c.toString(16));
    f(r);
  }
}

/** A DocumentAttribute into `doc`; false for an unknown constructor (the reader is then unusable past it). */
function readAttribute(r, doc) {
  const c = r.int();
  switch (c) {
    case 0x6c37c15c: doc.imageSize = { w: r.int(), h: r.int() }; return true;
    case 0x11b58939: doc.animated = true; return true;
    case 0x6319d612: { const fl = r.int(); r.string(); skipInputStickerSet(r); if (fl & 1) { r.int(); r.double(); r.double(); r.double(); } doc.sticker = true; return true; }
    case 0x43c57c48: {
      const fl = r.int();
      const duration = r.double(), w = r.int(), h = r.int();
      if (fl & 4) r.int();
      if (fl & 16) r.double();
      if (fl & 32) r.string();
      doc.video = { duration, w, h, supportsStreaming: (fl & 2) !== 0, roundMessage: (fl & 1) !== 0 };
      return true;
    }
    case 0x9852f9c6: {
      const fl = r.int();
      const a = { duration: r.int(), voice: (fl & 1024) !== 0 };
      if (fl & 1) a.title = r.string();
      if (fl & 2) a.performer = r.string();
      if (fl & 4) r.bytes();
      doc.audio = a;
      return true;
    }
    case 0x15590068: doc.fileName = r.string(); return true;
    case 0x9801d2f7: return true;
    case 0xfd149899: { r.int(); r.string(); skipInputStickerSet(r); return true; }
    default: return false;
  }
}

/**
 * Document -> { id, accessHash, fileReference, date, mimeType, size, dcId, fileName?, video?, audio?, ... }.
 * documentEmpty -> { empty: true, id }; another constructor -> { ctor, unknown: true }. An unknown attribute stops the
 * read with `incomplete: true` and the fields read so far (the reader cannot continue past it).
 */
function parseDocument(r) {
  const ctor = r.int();
  if (ctor === CTOR.documentEmpty) return { ctor, empty: true, id: r.long() };
  if (ctor !== CTOR.document) return { ctor, unknown: true };
  const flags = r.int();
  const doc = { ctor, id: r.long(), accessHash: r.long(), fileReference: r.bytes(), date: r.int(), mimeType: r.string(), size: Number(r.long()) };
  if (flags & 1) skipVectorOf(r, PHOTO_SIZE, "PhotoSize");
  if (flags & 2) skipVectorOf(r, VIDEO_SIZE, "VideoSize");
  doc.dcId = r.int();
  const n = r.vectorHeader();
  for (let i = 0; i < n; i++) {
    if (!readAttribute(r, doc)) { doc.incomplete = true; break; }
  }
  return doc;
}

/** MessageMedia: messageMediaDocument -> { ctor, document, video, round, voice }; others -> { ctor, unknown: true }. */
function parseMessageMedia(r) {
  const ctor = r.int();
  if (ctor !== CTOR.messageMediaDocument) return { ctor, unknown: true };
  const flags = r.int();
  const out = { ctor, video: (flags & 64) !== 0, round: (flags & 128) !== 0, voice: (flags & 256) !== 0 };
  if (flags & 1) out.document = parseDocument(r);
  return out;
}

function skipFwdHeader(r) {
  if (r.int() !== CTOR.messageFwdHeader) throw TYPED_ERROR("unknown MessageFwdHeader");
  const f = r.int();
  if (f & 1) parsePeer(r);
  if (f & 32) r.string();
  r.int();
  if (f & 4) r.int();
  if (f & 8) r.string();
  if (f & 16) { parsePeer(r); r.int(); }
  if (f & 256) parsePeer(r);
  if (f & 512) r.string();
  if (f & 1024) r.int();
  if (f & 64) r.string();
}

function skipReplyHeader(r) {
  const c = r.int();
  if (c === CTOR.messageReplyStoryHeader) { parsePeer(r); r.int(); return; }
  if (c !== CTOR.messageReplyHeader) throw TYPED_ERROR("unknown MessageReplyHeader");
  const f = r.int();
  if (f & 16) r.int();
  if (f & 1) parsePeer(r);
  if (f & 32) skipFwdHeader(r);
  if (f & 256) throw TYPED_ERROR("reply_media is not supported"); // an arbitrary MessageMedia: no way to skip it
  if (f & 2) r.int();
  if (f & 64) r.string();
  if (f & 128) throw TYPED_ERROR("quote_entities is not supported");
  if (f & 1024) r.int();
}

/**
 * The head of a Message, up to and including its media (what the library index needs): { ctor, id, peer, fromId?,
 * date, text, media? }. The fields after `media` are not read, so the reader is left inside the message: use this on
 * a message you hold on its own, not to walk a vector. Unsupported shapes give { ctor, id?, unsupported: reason }.
 */
function parseMessage(r) {
  const ctor = r.int();
  if (ctor !== CTOR.message) return { ctor, unknown: true };
  const out = { ctor };
  try {
    const flags = r.int();
    const flags2 = r.int();
    out.id = r.int();
    if (flags & (1 << 8)) out.fromId = parsePeer(r);
    if (flags & (1 << 29)) r.int();
    out.peer = parsePeer(r);
    if (flags & (1 << 28)) parsePeer(r);
    if (flags & (1 << 2)) { out.forwarded = true; skipFwdHeader(r); }
    if (flags & (1 << 11)) r.long();
    if (flags2 & 1) r.long();
    if (flags & (1 << 3)) skipReplyHeader(r);
    out.date = r.int();
    out.text = r.string();
    if (flags & (1 << 9)) out.media = parseMessageMedia(r);
  } catch (e) {
    out.unsupported = String(e && e.message);
  }
  return out;
}
return { LAYER, CTOR, Writer, Reader, reqPqMulti, pqInnerDataDc, reqDHParams, clientDHInnerData, setClientDHParams, invokeWithLayer, initConnection, importBotAuthorization, exportAuthorization, importAuthorization, exportLoginToken, importLoginToken, getPassword, checkPassword, logOut, msgsAck, inputDocumentFileLocation, uploadGetFile, parseRpcError, parseUploadFile, hexU32, hexBytesAt, parseUploadFileHex, parseExportedAuthorization, parseAuthorization, parseDocument, parseMessageMedia, parseMessage };
})();

// ---- src/mtproto/msgid.js ----
const __mod_src_mtproto_msgid = (() => {
// Client message ids: about unixtime * 2^32, divisible by 4, strictly increasing within a session.
class MsgIds {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.last = 0n;
  }
  /** `offsetSec`: server time minus local time. */
  next(offsetSec = 0) {
    const ms = this.now();
    const secs = BigInt(Math.floor(ms / 1000) + offsetSec);
    const frac = BigInt(Math.floor((ms % 1000) * 4294967.296)) & ~3n;
    let id = (secs << 32n) | frac;
    if (id <= this.last) id = this.last + 4n;
    this.last = id;
    return id;
  }
}
return { MsgIds };
})();

// ---- src/mtproto/authkey.js ----
const __mod_src_mtproto_authkey = (() => {
// "Creating an authorization key" (MTProto 2.0), exactly as the verified-live spike (mtproto.mjs createAuthKey):
// req_pq_multi, pq factorisation, p_q_inner_data_dc under RSA_PAD, server_DH_params_ok, the safety checks on dh_prime,
// g, g_a and g_b, set_client_DH_params and the new_nonce_hash1 check. Big-number powers go to kino.crypto.modPow
// (native); BigInt is only used for comparisons, the pq factorisation (~63 bits) and Miller-Rabin's bookkeeping.
const { toHex, fromHex, concat, equal, xor, reversed, random, bigFromBytes, bigToBytes, bigToHex } = __mod_src_mtproto_bytes;
const { sha1, sha256, igeEncrypt, igeDecrypt, modPowHex } = __mod_src_mtproto_crypto;
const { Writer, Reader, CTOR, reqPqMulti, pqInnerDataDc, reqDHParams, clientDHInnerData, setClientDHParams } = __mod_src_mtproto_tl;
const { MsgIds } = __mod_src_mtproto_msgid;
const { mtError, fromTransportError } = __mod_src_mtproto_errors;

/** Telegram's fixed 2048-bit DH prime (a safe prime; g = 3 works with it). Seeing it skips the primality rounds. */
const TELEGRAM_DH_PRIME_HEX =
  "c71caeb9c6b1c9048e6c522f70f13f73980d40238e3e21c14934d037563d930f48198a0aa7c14058229493d22530f4dbfa336f6e0ac925139543aed44cce7c3720fd51f69458705ac68cd4fe6b6b13abdc9746512969328454f18faf8c595f642477fe96bb2a941d5bcd1d4ac8cc49880708fa9b378e3c4f3a9060bee67cf9a4a4a695811051907e162753b56b0f6b410dba74d8a84b2a14b3144e0ef1284754fd17ed950d5965b4b9dd46582db1178d169c6bc465b0d6ff9ca3928fef5b9ae4e418fc15e83ebea0f87fa9ff5eed70050ded2849f47bf959d956850ce929851f0d8115f635b105ee2e4e15d04b2454bf6f4fadf034b10403119cd8e3b92fcc5b";
const TELEGRAM_DH_PRIME = BigInt("0x" + TELEGRAM_DH_PRIME_HEX);

const protocol = (m) => mtError("protocol", m);
const evenHex = (n) => { const h = n.toString(16); return h.length % 2 ? "0" + h : h; };
const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a; };

/** Brent's variant of Pollard's rho with batched gcds: pq < 2^64 factors in a few thousand BigInt steps. */
function factorPq(pq) {
  // Telegram's pq is a product of two primes below 2^32 (so below 2^64): anything else is not a server of ours.
  if (typeof pq !== "bigint" || pq < 4n || pq >= 1n << 64n) throw protocol("pq out of range");
  if (pq % 2n === 0n) return [2n, pq / 2n];
  let steps = 0;
  for (let c = 1n; c < 64n; c++) {
    const f = (v) => (v * v + c) % pq;
    let y = 2n, x = 2n, ys = 2n, q = 1n, g = 1n, r = 1;
    const m = 128;
    while (g === 1n) {
      x = y;
      for (let i = 0; i < r; i++) y = f(y);
      for (let k = 0; k < r && g === 1n; k += m) {
        ys = y;
        const lim = Math.min(m, r - k);
        for (let i = 0; i < lim; i++) { y = f(y); q = (q * (x > y ? x - y : y - x)) % pq; }
        g = gcd(q, pq);
        steps += lim;
      }
      r *= 2;
      // A semiprime below 2^64 falls in well under 2^20 steps; past it the input is not one (bounded CPU either way).
      if (steps > 1 << 22) throw protocol("could not factor pq");
    }
    if (g === pq) {
      do { ys = f(ys); g = gcd(x > ys ? x - ys : ys - x, pq); } while (g === 1n);
    }
    if (g !== pq) { const a = g, b = pq / g; return a < b ? [a, b] : [b, a]; }
  }
  throw protocol("could not factor pq");
}

/** Telegram's RSA key fingerprint: the low 64 bits of sha1(TL bytes(n) + TL bytes(e)), as a signed decimal string. */
function rsaFingerprint(nHex, e) {
  const w = new Writer().bytes(fromHex(evenHex(BigInt("0x" + nHex)))).bytes(fromHex(evenHex(BigInt(e)))).done();
  return new Reader(sha1(w), 12).long().toString();
}

const SMALL_PRIMES = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

/** Miller-Rabin with random bases; each base costs one native kino.crypto.modPow. */
function isProbablePrime(n, rounds = 16) {
  if (n < 2n) return false;
  for (const p of SMALL_PRIMES) { if (n === p) return true; if (n % p === 0n) return false; }
  let d = n - 1n, s = 0;
  while ((d & 1n) === 0n) { d >>= 1n; s++; }
  const nHex = evenHex(n), dHex = evenHex(d), byteLen = Math.ceil(n.toString(16).length / 2) + 8;
  outer: for (let i = 0; i < rounds; i++) {
    const a = (bigFromBytes(random(byteLen)) % (n - 3n)) + 2n;
    let x = BigInt("0x" + modPowHex(evenHex(a), dHex, nHex));
    if (x === 1n || x === n - 1n) continue;
    for (let j = 1; j < s; j++) { x = (x * x) % n; if (x === n - 1n) continue outer; }
    return false;
  }
  return true;
}

/** The protocol's checks on (dh_prime, g). Telegram's fixed prime is recognised instead of tested ({ known: true }). */
function checkDhPrime(p, g) {
  if (p.toString(2).length !== 2048) throw protocol("dh_prime is not 2048 bits");
  if (!(g >= 2 && g <= 7)) throw protocol("unexpected g " + g);
  const ok = {
    2: () => p % 8n === 7n,
    3: () => p % 3n === 2n,
    4: () => true,
    5: () => [1n, 4n].includes(p % 5n),
    6: () => [19n, 23n].includes(p % 24n),
    7: () => [3n, 5n, 6n].includes(p % 7n),
  }[g]();
  if (!ok) throw protocol("g = " + g + " does not generate the right subgroup of this dh_prime");
  if (p === TELEGRAM_DH_PRIME) return { known: true };
  if (!isProbablePrime(p) || !isProbablePrime((p - 1n) / 2n)) throw protocol("dh_prime is not a safe prime");
  return { known: false };
}

/** One unencrypted request (auth_key_id = 0) and its answer, as a Reader on the answer's body. */
async function plainCall(t, body, { msgIds, timeoutMs, deadline, now = () => Date.now() }) {
  const w = new Writer().long(0n).long(msgIds.next()).int(body.length).raw(body).done();
  await t.sendHex(toHex(w));
  // With a deadline (the whole key exchange's), each answer waits only for what is left of it.
  const wait = deadline === undefined ? timeoutMs : deadline - now();
  if (wait < 1) throw mtError("timeout", "the key exchange ran out of time", { deadline: true });
  const raw = fromHex(await t.recvHex(wait));
  if (raw.length === 4) throw fromTransportError(new Reader(raw).int32());
  const r = new Reader(raw);
  if (r.long() !== 0n) throw protocol("expected an unencrypted answer");
  r.long();
  const len = r.int();
  return new Reader(r.raw(len));
}

const LIMIT = 1n << (2048n - 64n);
const inRange = (v, p) => v > 1n && v < p - 1n && v > LIMIT && v < p - LIMIT;

/**
 * A new auth key on transport `t` (opened on DC `dc`). `publicKeys` is { signedDecimalFingerprint: { n: hex, e: decimal } }.
 * Answers { authKey (256 bytes), authKeyId (8 bytes), serverSalt (8 bytes), timeOffset (s) }. `rand(n)` is the
 * randomness source (kino.crypto by default; tests inject a broken one to reach the g_b check).
 */
async function createAuthKey(t, { dc, publicKeys, now = () => Date.now(), timeoutMs = 20000, rand = random }) {
  const msgIds = new MsgIds(now);
  // One deadline for the whole exchange (three round trips), not timeoutMs for each.
  const opts = { msgIds, timeoutMs, deadline: now() + timeoutMs, now };
  const nonce = rand(16);
  let r = await plainCall(t, reqPqMulti(nonce), opts);
  if (r.int() !== CTOR.resPQ) throw protocol("expected resPQ");
  if (!equal(r.int128(), nonce)) throw protocol("nonce mismatch");
  const serverNonce = r.int128().slice();
  const pq = bigFromBytes(r.bytes());
  const fps = r.vectorLong().map((f) => f.toString());
  const fp = fps.find((f) => Object.prototype.hasOwnProperty.call(publicKeys, f));
  if (!fp) throw protocol("no known server key among " + fps.join(", "));
  const [p, q] = factorPq(pq);
  const newNonce = rand(32);
  const inner = pqInnerDataDc({ pq: bigToBytes(pq), p: bigToBytes(p), q: bigToBytes(q), nonce, serverNonce, newNonce, dc });
  if (inner.length > 144) throw protocol("inner data too long");

  // RSA_PAD (the plain "sha1 + data" form is refused with -404 since 2021).
  const key = publicKeys[fp];
  const n = BigInt("0x" + key.n), nHex = evenHex(n), eHex = evenHex(BigInt(key.e));
  let encrypted;
  for (let attempt = 0; attempt < 32 && !encrypted; attempt++) {
    const withPad = concat(inner, rand(192 - inner.length));
    const tempKey = rand(32);
    const dataWithHash = concat(reversed(withPad), sha256(tempKey, withPad));
    const aesEnc = igeEncrypt(dataWithHash, tempKey, new Uint8Array(32));
    const keyAesEnc = concat(xor(tempKey, sha256(aesEnc)), aesEnc);
    if (bigFromBytes(keyAesEnc) >= n) continue;
    // The app's modPow pads its answer to the modulus' width (PluginCrypto.modPow); pad here too, never truncate.
    encrypted = bigToBytes(BigInt("0x" + modPowHex(toHex(keyAesEnc), eHex, nHex)), 256);
  }
  if (!encrypted) throw protocol("RSA_PAD found no value below the modulus");

  r = await plainCall(t, reqDHParams({ nonce, serverNonce, p: bigToBytes(p), q: bigToBytes(q), fingerprint: BigInt(fp), encryptedData: encrypted }), opts);
  const ctor = r.int();
  if (ctor === CTOR.serverDHParamsFail) throw protocol("server_DH_params_fail");
  if (ctor !== CTOR.serverDHParamsOk) throw protocol("unexpected answer to req_DH_params: 0x" + ctor.toString(16));
  if (!equal(r.int128(), nonce) || !equal(r.int128(), serverNonce)) throw protocol("nonce mismatch in server_DH_params");
  const answerEnc = r.bytes();
  const a1 = sha1(newNonce, serverNonce), a2 = sha1(serverNonce, newNonce);
  const tmpKey = concat(a1, a2.subarray(0, 12));
  const tmpIv = concat(a2.subarray(12), sha1(newNonce, newNonce), newNonce.subarray(0, 4));
  const answerFull = igeDecrypt(answerEnc, tmpKey, tmpIv);
  const answer = answerFull.subarray(20);
  const d = new Reader(answer);
  if (d.int() !== CTOR.serverDHInnerData) throw protocol("bad server_DH_inner_data");
  if (!equal(d.int128(), nonce) || !equal(d.int128(), serverNonce)) throw protocol("nonce mismatch in inner data");
  const g = d.int();
  const dhPrimeBytes = d.bytes(), gABytes = d.bytes();
  const serverTime = d.int();
  if (!equal(sha1(answer.subarray(0, d.o)), answerFull.subarray(0, 20))) throw protocol("answer hash mismatch");
  const dhPrime = bigFromBytes(dhPrimeBytes), gA = bigFromBytes(gABytes);
  checkDhPrime(dhPrime, g);
  if (!inRange(gA, dhPrime)) throw protocol("g_a out of range");
  const timeOffset = serverTime - Math.floor(now() / 1000);

  const primeHex = bigToHex(dhPrime, 256);
  let b, gB;
  for (let attempt = 0; ; attempt++) {
    if (attempt === 8) throw protocol("g_b out of range");
    b = rand(256);
    gB = bigFromBytes(fromHex(modPowHex(evenHex(BigInt(g)), toHex(b), primeHex)));
    if (inRange(gB, dhPrime)) break;
  }
  const cInner = clientDHInnerData({ nonce, serverNonce, retryId: 0n, gB: bigToBytes(gB) });
  const withHash = concat(sha1(cInner), cInner);
  const cPadded = concat(withHash, rand((16 - (withHash.length % 16)) % 16));
  r = await plainCall(t, setClientDHParams({ nonce, serverNonce, encryptedData: igeEncrypt(cPadded, tmpKey, tmpIv) }), opts);
  const res = r.int();
  if (res !== CTOR.dhGenOk) throw protocol(res === CTOR.dhGenRetry ? "dh_gen_retry" : res === CTOR.dhGenFail ? "dh_gen_fail" : "unexpected answer to set_client_DH_params");
  if (!equal(r.int128(), nonce) || !equal(r.int128(), serverNonce)) throw protocol("nonce mismatch in dh_gen_ok");
  const newNonceHash1 = r.int128();
  const authKey = bigToBytes(BigInt("0x" + modPowHex(toHex(gABytes), toHex(b), primeHex)), 256);
  const authHash = sha1(authKey);
  if (!equal(sha1(newNonce, Uint8Array.of(1), authHash.subarray(0, 8)).subarray(4, 20), newNonceHash1)) throw protocol("new_nonce_hash1 mismatch");
  return {
    authKey,
    authKeyId: authHash.slice(12, 20),
    serverSalt: xor(newNonce.subarray(0, 8), serverNonce.subarray(0, 8)),
    timeOffset,
  };
}
return { TELEGRAM_DH_PRIME_HEX, factorPq, rsaFingerprint, isProbablePrime, checkDhPrime, plainCall, createAuthKey };
})();

// ---- src/mtproto/session.js ----
const __mod_src_mtproto_session = (() => {
// The encrypted MTProto 2.0 session on top of an auth key, ported from the spike's Session (session.mjs): msg_key and
// AES key derivation with sha256, containers, gzip_packed, new_session_created, bad_server_salt (resend), plus what a
// long-lived phone session needs: bad_msg_notification time/seqno fixes, msgs_ack for the server's content messages,
// and a deadline per call.
//
// Bytes stay hex from the socket to the decrypted plaintext: kino.ws hands a Uint8Array, the transport turns it into
// hex once (one JS pass), CTR, IGE and the msg_key hash run natively on hex strings. Messages stay hex too: containers
// and gzip_packed are walked by decoding only their few header bytes, and an rpc result is turned into a Uint8Array
// (a second JS pass) only when the caller wants bytes; `call(body, { hex: true })` hands the result's hex as it is
// (the download path: no JS pass over a file chunk here).
const { toHex, fromHex, random, readI32LE } = __mod_src_mtproto_bytes;
const { sha256Hex, igeEncryptHex, igeDecryptHex, gunzipHex } = __mod_src_mtproto_crypto;
const { Writer, Reader, CTOR, msgsAck, parseRpcError, hexU32, hexBytesAt } = __mod_src_mtproto_tl;
const { MsgIds } = __mod_src_mtproto_msgid;
const { big } = __mod_src_mtproto_big;
const { mtError, fromRpcError, fromTransportError } = __mod_src_mtproto_errors;

const MAX_RESENDS = 5;
const ABANDONED_MS = 30000; // an abandoned request still unanswered after this long is taken as lost
const protocol = (m) => mtError("protocol", m);

class Session {
  /**
   * `state` is { authKey, authKeyId, serverSalt (Uint8Array), timeOffset (s) }: the session updates its salt and time
   * offset in place, so whoever owns `state` can persist them. `onUpdate(body)` gets every message that is not an answer
   * to a call (updates and other constructors this layer does not know).
   */
  constructor(transport, state, { now = () => Date.now(), timeoutMs = 20000, onUpdate = null, log = () => {}, abandonedMs = ABANDONED_MS } = {}) {
    this.abandonedMs = abandonedMs;
    this.maxInflight = 0;
    if (!state.authKey || state.authKey.length !== 256) throw mtError("invalid_request", "auth key must be 256 bytes");
    this.t = transport;
    this.state = state;
    this.ak = toHex(state.authKey);
    this.akId = toHex(state.authKeyId);
    this.now = now;
    this.timeoutMs = timeoutMs;
    this.onUpdate = onUpdate;
    this.log = log;
    this.msgIds = new MsgIds(now);
    this.pendingAcks = [];
    this.waiting = new Map();   // msg_id -> the request waiting for its answer
    this.abandoned = new Map(); // msg_id -> when it was given up: still on the wire, its answer is dropped unkept
    this.seenIds = new Set();   // the last server msg_ids seen (duplicates are dropped)
    this.oldSessions = new Set();
    this.newSession();
  }

  newSession() {
    if (this.sessionId) this.oldSessions.add(this.sessionId);
    this.sessionId = toHex(random(8));
    this.seq = 0;
  }

  /** MTProto 2.0 key derivation over hex: x = 0 client to server, 8 server to client. */
  keyIv(msgKeyHex, x) {
    const a = sha256Hex(msgKeyHex + this.ak.slice(2 * x, 2 * x + 72));
    const b = sha256Hex(this.ak.slice(80 + 2 * x, 152 + 2 * x) + msgKeyHex);
    return { key: a.slice(0, 16) + b.slice(16, 48) + a.slice(48, 64), iv: b.slice(0, 16) + a.slice(16, 48) + b.slice(48, 64) };
  }

  /** Encrypts and sends one message; answers its msg_id. `content` false for acks (even seqno). */
  async send(body, content = true) {
    const id = this.msgIds.next(this.state.timeOffset);
    const seq = content ? this.seq++ * 2 + 1 : this.seq * 2;
    const head = new Writer().raw(this.state.serverSalt).raw(fromHex(this.sessionId)).long(id).int(seq).int(body.length).raw(body).done();
    const padLen = 12 + ((16 - ((head.length + 12) % 16)) % 16);
    const plainHex = toHex(head) + toHex(random(padLen));
    const msgKey = sha256Hex(this.ak.slice(176, 240) + plainHex).slice(16, 48);
    const { key, iv } = this.keyIv(msgKey, 0);
    await this.t.sendHex(this.akId + msgKey + igeEncryptHex(plainHex, key, iv));
    return id;
  }

  async flushAcks() {
    while (this.pendingAcks.length) {
      const ids = this.pendingAcks.splice(0, 1024);
      await this.send(msgsAck(ids), false);
    }
  }

  /** One transport packet -> its message [{ id, seqno, hex }] (empty when it belongs to one of our older sessions). */
  async recvMessages(deadline, trace) {
    // Boxed so that no stack slot of ours keeps the packet alive once openPacket has let it go.
    const box = { hex: await this.t.recvHex(Math.max(1, deadline - this.now()), this.now, trace) };
    return this.openPacket(box, trace);
  }

  /**
   * Decrypts one packet ({ hex }, taken out of the box) and answers its message. Memory: QuickJS frees a string the
   * moment its last reference goes, so every big string here is dropped before the next one is made: the packet before
   * the decryption runs (only its encrypted part is kept), the encrypted part right after, the plaintext once the
   * message is sliced out. At most two copies of a packet are alive at once (big.js counts them).
   */
  openPacket(box, trace) {
    let hex = box.hex;
    box.hex = null;
    if (hex.length === 8) { big.release(hex.length); throw fromTransportError(readI32LE(fromHex(hex), 0)); }
    if (hex.length < 48 + 64) throw protocol("short packet");
    if (hex.slice(0, 16) !== this.akId) { big.release(hex.length); throw protocol("answer under another auth key"); }
    if (((hex.length - 48) / 2) % 16 !== 0) { big.release(hex.length); throw protocol("encrypted data not a multiple of 16"); }
    const msgKey = hex.slice(16, 48);
    const enc = { hex: hex.slice(48) };
    big.hold(enc.hex.length);
    big.release(hex.length);
    hex = null;
    let plainHex = this.decrypt(enc, msgKey, trace);
    const sid = plainHex.slice(16, 32);
    if (sid !== this.sessionId) {
      big.release(plainHex.length);
      if (this.oldSessions.has(sid)) { this.log("message for an older session ignored"); return []; }
      throw protocol("answer for another session");
    }
    const h = new Reader(fromHex(plainHex.slice(32, 64)));
    const id = h.long(), seqno = h.int(), len = h.int();
    // A server message id is odd, and each is seen once: a duplicate (a replay) is dropped.
    if ((id & 1n) !== 1n) { big.release(plainHex.length); throw protocol("server msg_id is not odd"); }
    if (this.seenIds.has(id)) { big.release(plainHex.length); this.log("duplicate server message dropped"); return []; }
    this.seenIds.add(id);
    if (this.seenIds.size > 512) this.seenIds.delete(this.seenIds.values().next().value);
    const total = plainHex.length / 2;
    const padding = total - 32 - len;
    if (len % 4 !== 0 || padding < 12 || padding > 1024) { big.release(plainHex.length); throw protocol("bad message length"); }
    const body = plainHex.slice(64, 64 + len * 2);
    big.hold(body.length);
    big.release(plainHex.length);
    plainHex = null;
    return [{ id, seqno, hex: body }];
  }

  /** The plaintext (hex) of the encrypted part ({ hex }, taken out of the box), its msg_key checked. */
  decrypt(enc, msgKey, trace) {
    let encHex = enc.hex;
    enc.hex = null;
    const { key, iv } = this.keyIv(msgKey, 8);
    const t0 = trace ? Date.now() : 0;
    // Kino with apiVersion 13's aesIgeVerify: the AES-IGE decryption and the msg_key check (SHA-256(auth_key[96:128] ||
    // plaintext), bytes 8..24) in one native call, with no joined copy of the plaintext. An older Kino: the two calls.
    if (typeof kino.crypto.aesIgeVerify === "function") {
      let plainHex;
      try {
        plainHex = kino.crypto.aesIgeVerify(key, iv, encHex, {
          mac: msgKey, macPrefix: this.ak.slice(192, 256), macOffset: 8,
          keyEncoding: "hex", ivEncoding: "hex", inputEncoding: "hex", outputEncoding: "hex",
        });
      } catch (e) {
        big.release(encHex.length);
        // The op's own words, or (should they change) any crypto_error of it: an answer that cannot be opened.
        if (e && (e.message === "the mac doesn't match" || e.code === "crypto_error")) throw protocol("msg_key mismatch");
        throw e;
      }
      big.hold(plainHex.length);
      big.release(encHex.length);
      encHex = null;
      if (trace) trace.ige += Date.now() - t0; // decryption and MAC together (mac stays 0 on this path)
      return plainHex;
    }
    const plainHex = igeDecryptHex(encHex, key, iv);
    big.hold(plainHex.length);
    big.release(encHex.length);
    encHex = null;
    const t1 = trace ? Date.now() : 0;
    // SHA-256 takes one string: the 32 key bytes and the plaintext are joined for the call only (one more copy, briefly).
    big.hold(64 + plainHex.length); big.release(64 + plainHex.length);
    const ok = sha256Hex(this.ak.slice(192, 256) + plainHex).slice(16, 48) === msgKey;
    if (trace) { trace.ige += t1 - t0; trace.mac += Date.now() - t1; }
    if (!ok) { big.release(plainHex.length); throw protocol("msg_key mismatch"); }
    return plainHex;
  }

  /**
   * Sends `body` and waits for its rpc_result: answers the result's bytes (unzipped), throws the rpc_error as a typed
   * error (errors.js), `timeout` past the deadline, `bad_msg` when the server keeps refusing the message. With
   * `hex: true` the result comes back as a hex string instead of a Uint8Array.
   */
  async call(body, { timeoutMs = this.timeoutMs, hex = false, trace } = {}) {
    const deadline = this.now() + timeoutMs;
    const entry = await this.request(body, { hex, trace });
    return this.settle(entry, deadline);
  }

  /**
   * Sends `body` and answers its entry without waiting for the answer. Several requests may be in flight at once (one
   * connection, MTProto pairs every answer with its msg_id): each pump fills whichever entry an answer belongs to.
   * An entry is { done, result (hex), error }; `settle(entry, deadline)` pumps until it is done.
   */
  async request(body, { hex = false, trace } = {}) {
    await this.flushAcks();
    const entry = { body, hex, trace, id: 0n, done: false, result: null, error: null, resends: 0 };
    entry.id = await this.send(body);
    if (trace && !trace.sentAt) trace.sentAt = Date.now();
    this.waiting.set(entry.id, entry);
    this.maxInflight = Math.max(this.maxInflight, this.inflight());
    return entry;
  }

  /** Stops waiting for `entry`: its answer, if it ever comes, is dropped without being kept (but counted in flight). */
  forget(entry) {
    if (entry.done) return;
    this.waiting.delete(entry.id);
    this.abandoned.set(entry.id, this.now());
  }

  /** Requests sent and not answered yet, those given up included (their answers are still on the way). */
  inflight() {
    const old = this.now() - this.abandonedMs;
    for (const [id, at] of this.abandoned) if (at < old) this.abandoned.delete(id); // lost for good
    return this.waiting.size + this.abandoned.size;
  }

  finish(entry, result, error) {
    this.waiting.delete(entry.id);
    entry.done = true;
    entry.result = result;
    entry.error = error;
  }

  async resend(entry, why) {
    this.waiting.delete(entry.id);
    if (++entry.resends > MAX_RESENDS) {
      this.finish(entry, null, mtError("bad_msg", "the server keeps refusing the message (" + why + ")", { badMsgCode: why }));
      return;
    }
    entry.id = await this.send(entry.body);
    this.waiting.set(entry.id, entry);
  }

  /**
   * Pumps answers until `entry` is done; then answers its result (hex, or bytes when the request did not ask for hex)
   * or throws its error. A pump that fails (the socket, a protocol error, the deadline) fails every request still in
   * flight on this session: the client drops such a connection.
   */
  async settle(entry, deadline) {
    while (!entry.done) {
      if (this.now() >= deadline) {
        this.forget(entry);
        throw mtError("timeout", "no answer in time");
      }
      try {
        await this.pumpOnce(deadline, entry.trace);
      } catch (e) {
        if (e && e.code === "timeout" && !this.broken) { this.forget(entry); throw e; } // between packets: the stream is intact
        // Anything else leaves the stream in an unknown state: this session is never used again (the client drops it).
        this.broken = true;
        for (const w of [...this.waiting.values()]) this.finish(w, null, e);
        throw e;
      }
    }
    if (entry.error) throw entry.error;
    // The result goes to the caller: the entry lets go of it. A hex result stays counted until the caller drops it.
    const result = entry.result;
    entry.result = null;
    if (entry.hex) return result;
    const bytes = fromHex(result);
    big.release(result.length); // after its last use
    return bytes;
  }

  /**
   * Makes room for one more request: pumps answers until fewer than `max` requests are in flight, until `until`.
   * Answers false when the room did not come in time (requests that will not come back): the caller then drops this
   * connection, which is the only way to take them off the wire.
   */
  async drainBelow(max, until) {
    while (this.inflight() >= max) {
      if (this.now() >= until) return false;
      try {
        await this.pumpOnce(until);
      } catch (e) {
        if (e && e.code === "timeout" && !this.broken) continue;
        this.broken = true;
        for (const w of [...this.waiting.values()]) this.finish(w, null, e);
        throw e;
      }
    }
    return true;
  }

  /** One transport packet: every message in it goes to the request it answers (or to onUpdate). */
  async pumpOnce(deadline, trace) {
    const queue = await this.recvMessages(deadline, trace);
    while (queue.length) {
      const m = queue.shift();
      if (m.seqno & 1) this.pendingAcks.push(m.id);
      const ctor = hexU32(m.hex, 0);
      if (ctor === CTOR.msgContainer) {
        const size = m.hex.length / 2;
        const n = hexU32(m.hex, 4);
        let o = 8;
        for (let i = 0; i < n; i++) {
          if (o + 16 > size) throw protocol("container past its end");
          const h = new Reader(fromHex(m.hex.slice(o * 2, (o + 16) * 2)));
          const id = h.long(), seqno = h.int(), len = h.int();
          if (o + 16 + len > size) throw protocol("container past its end");
          const inner = m.hex.slice((o + 16) * 2, (o + 16 + len) * 2);
          big.hold(inner.length);
          queue.push({ id, seqno, hex: inner });
          o += 16 + len;
        }
        big.release(m.hex.length); // the container itself is not kept
        continue;
      }
      if (ctor === CTOR.gzipPacked) {
        const tg = trace ? Date.now() : 0;
        const unpacked = gunzipHex(hexBytesAt(m.hex, 4).hex);
        big.hold(unpacked.length);
        big.release(m.hex.length);
        queue.unshift({ id: m.id, seqno: 0, hex: unpacked });
        if (trace) trace.gunzip += Date.now() - tg;
        continue;
      }
      if (ctor === CTOR.rpcResult) {
        const to = new Reader(fromHex(m.hex.slice(8, 24))).long();
        const entry = this.waiting.get(to);
        if (!entry) {
          // Given up (a seek, a timeout) or unknown (late, duplicated): dropped, its data never kept.
          if (this.abandoned.delete(to)) this.log("answer for an abandoned request dropped");
          else this.log("answer for an unknown request dropped");
          big.release(m.hex.length);
          continue;
        }
        let result = m.hex.slice(24);
        big.hold(result.length);
        big.release(m.hex.length);
        if (result.length >= 8 && hexU32(result, 0) === CTOR.gzipPacked) {
          const tg = trace ? Date.now() : 0;
          const packed = result.length;
          result = gunzipHex(hexBytesAt(result, 4).hex);
          big.hold(result.length);
          big.release(packed);
          if (trace) trace.gunzip += Date.now() - tg;
        }
        if (result.length >= 8 && hexU32(result, 0) === CTOR.rpcError) { big.release(result.length); this.finish(entry, null, fromRpcError(parseRpcError(new Reader(fromHex(result))))); }
        else this.finish(entry, result, null); // held by the entry until its caller takes it
        continue;
      }
      // Everything else is small: read it as bytes.
      const mBody = fromHex(m.hex);
      big.release(m.hex.length);
      const r = new Reader(mBody);
      r.int();
      switch (ctor) {
        case CTOR.newSessionCreated: {
          const firstMsgId = r.long(); r.long();
          this.state.serverSalt = r.raw(8).slice();
          // Requests sent before the server's new session began may never be answered: send those again.
          for (const w of [...this.waiting.values()]) if (w.id < firstMsgId) await this.resend(w, 0);
          break;
        }
        case CTOR.badServerSalt: {
          const bad = r.long(); r.int(); r.int();
          this.state.serverSalt = r.raw(8).slice();
          const entry = this.waiting.get(bad);
          if (entry) await this.resend(entry, 48);
          break;
        }
        case CTOR.badMsgNotification: {
          const bad = r.long(); r.int();
          const code = r.int();
          const entry = this.waiting.get(bad);
          if (!entry) break;
          if (code === 16 || code === 17 || code === 32 || code === 33) {
            if (code === 16 || code === 17) {
              // The server's own msg_id carries its clock. Ids made under the old offset may be far ahead (17), and
              // MsgIds only ever goes up: drop that floor and start a new session so the next ids follow the new clock.
              this.state.timeOffset = Number(m.id >> 32n) - Math.floor(this.now() / 1000);
              this.msgIds.last = 0n;
            }
            this.newSession();
            // Every request in flight was sent under the old session: its answer would be ignored. Send them all again.
            for (const w of [...this.waiting.values()]) await this.resend(w, code);
          } else {
            this.finish(entry, null, mtError("bad_msg", "bad_msg_notification " + code, { badMsgCode: code }));
          }
          break;
        }
        case CTOR.msgsAck:
        case CTOR.pong:
        case CTOR.msgDetailedInfo:
        case CTOR.msgNewDetailedInfo:
        case CTOR.futureSalts:
          break;
        default:
          if (this.onUpdate) { try { this.onUpdate(mBody); } catch (e) { this.log("onUpdate failed: " + (e && e.message)); } }
      }
    }
  }
}
return { Session };
})();

// ---- src/mtproto/schema/generated.js ----
const __mod_src_mtproto_schema_generated = (() => {
// Generated by scripts/gen-schema.mjs from the layer-198 TL schema -- do not edit.
// Roots: updates.State, updates.Difference, updates.ChannelDifference, messages.Messages, Message, MessageMedia, Document, DocumentAttribute, Chat, User, Peer, Update, Updates, messages.Dialogs, auth.LoginToken, auth.Authorization, account.Password, auth.LoggedOut. 689 of 1396 constructors, 158 types.
const SCHEMA_LAYER = 198;
const SCHEMA_TYPES = ["InputPeer","InputUser","InputFile","InputMedia","InputGeoPoint","InputPhoto","Peer","User","UserProfilePhoto","UserStatus","Chat","ChatParticipant","ChatParticipants","ChatPhoto","Message","MessageMedia","MessageAction","Dialog","Photo","PhotoSize","GeoPoint","auth.Authorization","PeerNotifySettings","PeerSettings","WallPaper","messages.Dialogs","messages.Messages","Update","updates.State","updates.Difference","Updates","DcOption","EncryptedChat","EncryptedFile","EncryptedMessage","InputDocument","Document","NotifyPeer","SendMessageAction","PrivacyKey","PrivacyRule","DocumentAttribute","StickerPack","WebPage","account.Password","ExportedChatInvite","InputStickerSet","StickerSet","messages.StickerSet","BotCommand","KeyboardButton","KeyboardButtonRow","ReplyMarkup","MessageEntity","InputChannel","updates.ChannelDifference","ChannelParticipant","help.TermsOfService","MessageFwdHeader","InputBotInlineMessageID","DraftMessage","MaskCoords","Game","InputGame","RichText","PageBlock","PhoneCallDiscardReason","DataJSON","LabeledPrice","Invoice","PaymentCharge","PostAddress","PaymentRequestedInfo","WebDocument","InputWebDocument","PhoneCall","PhoneConnection","PhoneCallProtocol","LangPackString","LangPackDifference","DialogPeer","SecureFile","SecureData","SecurePlainData","SecureValueType","SecureValue","SecureCredentialsEncrypted","PasswordKdfAlgo","SecurePasswordKdfAlgo","PageTableCell","PageTableRow","PageCaption","PageListItem","PageListOrderedItem","PageRelatedArticle","Page","PollAnswer","Poll","PollAnswerVoters","PollResults","ChatAdminRights","ChatBannedRights","WallPaperSettings","Folder","FolderPeer","PeerLocated","RestrictionReason","Theme","auth.LoginToken","BaseTheme","ThemeSettings","WebPageAttribute","DialogFilter","VideoSize","MessageReplyHeader","MessageReplies","GroupCall","InputGroupCall","GroupCallParticipant","InlineQueryPeerType","GroupCallParticipantVideoSourceGroup","GroupCallParticipantVideo","auth.LoggedOut","ReactionCount","MessageReactions","MessagePeerReaction","BotMenuButton","NotificationSound","EmojiStatus","Reaction","MessageExtendedMedia","StickerKeyword","Username","ForumTopic","RequestPeerType","TextWithEntities","BotApp","StoryViews","StoryItem","InputReplyTo","StoriesStealthMode","MediaAreaCoordinates","MediaArea","Boost","StoryFwdHeader","PeerColor","QuickReply","BotBusinessConnection","RequestedPeer","BroadcastRevenueBalances","FactCheck","GeoPointAddress","StarsRevenueStatus","StarsSubscriptionPricing","MessageReactor","StarGift","StarsAmount","StarGiftAttribute"];
const SCHEMA_CTORS = "7f3b18ea inputPeerEmpty 0\n7da07ec9 inputPeerSelf 0\n35a95cb9 inputPeerChat 0 chat_id:l\ndde8a54c inputPeerUser 0 user_id:l access_hash:l\n27bcbbfc inputPeerChannel 0 channel_id:l access_hash:l\na87b0a1c inputPeerUserFromMessage 0 peer:0 msg_id:i user_id:l\nbd2a0840 inputPeerChannelFromMessage 0 peer:0 msg_id:i channel_id:l\nb98886cf inputUserEmpty 1\nf7c1b13f inputUserSelf 1\nf21158c6 inputUser 1 user_id:l access_hash:l\n1da448e2 inputUserFromMessage 1 peer:0 msg_id:i user_id:l\nf52ff27f inputFile 2 id:l parts:i name:s md5_checksum:s\nfa4f0bb5 inputFileBig 2 id:l parts:i name:s\n62dc8b48 inputFileStoryDocument 2 id:35\n9664f57f inputMediaEmpty 3\n1e287d04 inputMediaUploadedPhoto 3 flags:# spoiler:flags.2?t file:2 stickers:flags.0?V35 ttl_seconds:flags.1?i\nb3ba0635 inputMediaPhoto 3 flags:# spoiler:flags.1?t id:5 ttl_seconds:flags.0?i\nf9c44144 inputMediaGeoPoint 3 geo_point:4\nf8ab7dfb inputMediaContact 3 phone_number:s first_name:s last_name:s vcard:s\n37c9330 inputMediaUploadedDocument 3 flags:# nosound_video:flags.3?t force_file:flags.4?t spoiler:flags.5?t file:2 thumb:flags.2?2 mime_type:s attributes:V41 stickers:flags.0?V35 video_cover:flags.6?5 video_timestamp:flags.7?i ttl_seconds:flags.1?i\na8763ab5 inputMediaDocument 3 flags:# spoiler:flags.2?t id:35 video_cover:flags.3?5 video_timestamp:flags.4?i ttl_seconds:flags.0?i query:flags.1?s\nc13d1c11 inputMediaVenue 3 geo_point:4 title:s address:s provider:s venue_id:s venue_type:s\ne5bbfe1a inputMediaPhotoExternal 3 flags:# spoiler:flags.1?t url:s ttl_seconds:flags.0?i\n779600f9 inputMediaDocumentExternal 3 flags:# spoiler:flags.1?t url:s ttl_seconds:flags.0?i video_cover:flags.2?5 video_timestamp:flags.3?i\nd33f43f3 inputMediaGame 3 id:63\n405fef0d inputMediaInvoice 3 flags:# title:s description:s photo:flags.0?74 invoice:69 payload:b provider:flags.3?s provider_data:67 start_param:flags.1?s extended_media:flags.2?3\n971fa843 inputMediaGeoLive 3 flags:# stopped:flags.0?t geo_point:4 heading:flags.2?i period:flags.1?i proximity_notification_radius:flags.3?i\nf94e5f1 inputMediaPoll 3 flags:# poll:97 correct_answers:flags.0?Vb solution:flags.1?s solution_entities:flags.1?V53\ne66fbf7b inputMediaDice 3 emoticon:s\n89fdd778 inputMediaStory 3 peer:0 id:i\nc21b8849 inputMediaWebPage 3 flags:# force_large_media:flags.0?t force_small_media:flags.1?t optional:flags.2?t url:s\nc4103386 inputMediaPaidMedia 3 flags:# stars_amount:l extended_media:V3 payload:flags.0?s\ne4c123d6 inputGeoPointEmpty 4\n48222faf inputGeoPoint 4 flags:# lat:d long:d accuracy_radius:flags.0?i\n1cd7bf0d inputPhotoEmpty 5\n3bb3b94a inputPhoto 5 id:l access_hash:l file_reference:b\n59511722 peerUser 6 user_id:l\n36c6019a peerChat 6 chat_id:l\na2a5371e peerChannel 6 channel_id:l\nd3bc4b7a userEmpty 7 id:l\n4b46c37e user 7 flags:# self:flags.10?t contact:flags.11?t mutual_contact:flags.12?t deleted:flags.13?t bot:flags.14?t bot_chat_history:flags.15?t bot_nochats:flags.16?t verified:flags.17?t restricted:flags.18?t min:flags.20?t bot_inline_geo:flags.21?t support:flags.23?t scam:flags.24?t apply_min_photo:flags.25?t fake:flags.26?t bot_attach_menu:flags.27?t premium:flags.28?t attach_menu_enabled:flags.29?t flags2:# bot_can_edit:flags2.1?t close_friend:flags2.2?t stories_hidden:flags2.3?t stories_unavailable:flags2.4?t contact_require_premium:flags2.10?t bot_business:flags2.11?t bot_has_main_app:flags2.13?t id:l access_hash:flags.0?l first_name:flags.1?s last_name:flags.2?s username:flags.3?s phone:flags.4?s photo:flags.5?8 status:flags.6?9 bot_info_version:flags.14?i restriction_reason:flags.18?V106 bot_inline_placeholder:flags.19?s lang_code:flags.22?s emoji_status:flags.30?128 usernames:flags2.0?V132 stories_max_id:flags2.5?i color:flags2.8?145 profile_color:flags2.9?145 bot_active_users:flags2.12?i bot_verification_icon:flags2.14?l\n4f11bae1 userProfilePhotoEmpty 8\n82d1f706 userProfilePhoto 8 flags:# has_video:flags.0?t personal:flags.2?t photo_id:l stripped_thumb:flags.1?b dc_id:i\n9d05049 userStatusEmpty 9\nedb93949 userStatusOnline 9 expires:i\n8c703f userStatusOffline 9 was_online:i\n7b197dc8 userStatusRecently 9 flags:# by_me:flags.0?t\n541a1d1a userStatusLastWeek 9 flags:# by_me:flags.0?t\n65899777 userStatusLastMonth 9 flags:# by_me:flags.0?t\n29562865 chatEmpty 10 id:l\n41cbf256 chat 10 flags:# creator:flags.0?t left:flags.2?t deactivated:flags.5?t call_active:flags.23?t call_not_empty:flags.24?t noforwards:flags.25?t id:l title:s photo:13 participants_count:i date:i version:i migrated_to:flags.6?54 admin_rights:flags.14?100 default_banned_rights:flags.18?101\n6592a1a7 chatForbidden 10 id:l title:s\ne00998b7 channel 10 flags:# creator:flags.0?t left:flags.2?t broadcast:flags.5?t verified:flags.7?t megagroup:flags.8?t restricted:flags.9?t signatures:flags.11?t min:flags.12?t scam:flags.19?t has_link:flags.20?t has_geo:flags.21?t slowmode_enabled:flags.22?t call_active:flags.23?t call_not_empty:flags.24?t fake:flags.25?t gigagroup:flags.26?t noforwards:flags.27?t join_to_send:flags.28?t join_request:flags.29?t forum:flags.30?t flags2:# stories_hidden:flags2.1?t stories_hidden_min:flags2.2?t stories_unavailable:flags2.3?t signature_profiles:flags2.12?t id:l access_hash:flags.13?l title:s username:flags.6?s photo:13 date:i restriction_reason:flags.9?V106 admin_rights:flags.14?100 banned_rights:flags.15?101 default_banned_rights:flags.18?101 participants_count:flags.17?i usernames:flags2.0?V132 stories_max_id:flags2.4?i color:flags2.7?145 profile_color:flags2.8?145 emoji_status:flags2.9?128 level:flags2.10?i subscription_until_date:flags2.11?i bot_verification_icon:flags2.13?l\n17d493d5 channelForbidden 10 flags:# broadcast:flags.5?t megagroup:flags.8?t id:l access_hash:l title:s until_date:flags.16?i\nc02d4007 chatParticipant 11 user_id:l inviter_id:l date:i\ne46bcee4 chatParticipantCreator 11 user_id:l\na0933f5b chatParticipantAdmin 11 user_id:l inviter_id:l date:i\n8763d3e1 chatParticipantsForbidden 12 flags:# chat_id:l self_participant:flags.0?11\n3cbc93f8 chatParticipants 12 chat_id:l participants:V11 version:i\n37c1011c chatPhotoEmpty 13\n1c6e1c11 chatPhoto 13 flags:# has_video:flags.0?t photo_id:l stripped_thumb:flags.1?b dc_id:i\n90a6ca84 messageEmpty 14 flags:# id:i peer_id:flags.0?6\n96fdbbe9 message 14 flags:# out:flags.1?t mentioned:flags.4?t media_unread:flags.5?t silent:flags.13?t post:flags.14?t from_scheduled:flags.18?t legacy:flags.19?t edit_hide:flags.21?t pinned:flags.24?t noforwards:flags.26?t invert_media:flags.27?t flags2:# offline:flags2.1?t video_processing_pending:flags2.4?t id:i from_id:flags.8?6 from_boosts_applied:flags.29?i peer_id:6 saved_peer_id:flags.28?6 fwd_from:flags.2?58 via_bot_id:flags.11?l via_business_bot_id:flags2.0?l reply_to:flags.3?114 date:i message:s media:flags.9?15 reply_markup:flags.6?52 entities:flags.7?V53 views:flags.10?i forwards:flags.10?i replies:flags.23?115 edit_date:flags.15?i post_author:flags.16?s grouped_id:flags.17?l reactions:flags.20?124 restriction_reason:flags.22?V106 ttl_period:flags.25?i quick_reply_shortcut_id:flags.30?i effect:flags2.2?l factcheck:flags2.3?150 report_delivery_until_date:flags2.5?i\nd3d28540 messageService 14 flags:# out:flags.1?t mentioned:flags.4?t media_unread:flags.5?t reactions_are_possible:flags.9?t silent:flags.13?t post:flags.14?t legacy:flags.19?t id:i from_id:flags.8?6 peer_id:6 reply_to:flags.3?114 date:i action:16 reactions:flags.20?124 ttl_period:flags.25?i\n3ded6320 messageMediaEmpty 15\n695150d7 messageMediaPhoto 15 flags:# spoiler:flags.3?t photo:flags.0?18 ttl_seconds:flags.2?i\n56e0d474 messageMediaGeo 15 geo:20\n70322949 messageMediaContact 15 phone_number:s first_name:s last_name:s vcard:s user_id:l\n9f84f49e messageMediaUnsupported 15\n52d8ccd9 messageMediaDocument 15 flags:# nopremium:flags.3?t spoiler:flags.4?t video:flags.6?t round:flags.7?t voice:flags.8?t document:flags.0?36 alt_documents:flags.5?V36 video_cover:flags.9?18 video_timestamp:flags.10?i ttl_seconds:flags.2?i\nddf10c3b messageMediaWebPage 15 flags:# force_large_media:flags.0?t force_small_media:flags.1?t manual:flags.3?t safe:flags.4?t webpage:43\n2ec0533f messageMediaVenue 15 geo:20 title:s address:s provider:s venue_id:s venue_type:s\nfdb19008 messageMediaGame 15 game:62\nf6a548d3 messageMediaInvoice 15 flags:# shipping_address_requested:flags.1?t test:flags.3?t title:s description:s photo:flags.0?73 receipt_msg_id:flags.2?i currency:s total_amount:l start_param:s extended_media:flags.4?130\nb940c666 messageMediaGeoLive 15 flags:# geo:20 heading:flags.0?i period:i proximity_notification_radius:flags.1?i\n4bd6e798 messageMediaPoll 15 poll:97 results:99\n3f7ee58b messageMediaDice 15 value:i emoticon:s\n68cb6283 messageMediaStory 15 flags:# via_mention:flags.1?t peer:6 id:i story:flags.0?138\naa073beb messageMediaGiveaway 15 flags:# only_new_subscribers:flags.0?t winners_are_visible:flags.2?t channels:Vl countries_iso2:flags.1?Vs prize_description:flags.3?s quantity:i months:flags.4?i stars:flags.5?l until_date:i\nceaa3ea1 messageMediaGiveawayResults 15 flags:# only_new_subscribers:flags.0?t refunded:flags.2?t channel_id:l additional_peers_count:flags.3?i launch_msg_id:i winners_count:i unclaimed_count:i winners:Vl months:flags.4?i stars:flags.5?l prize_description:flags.1?s until_date:i\na8852491 messageMediaPaidMedia 15 stars_amount:l extended_media:V130\nb6aef7b0 messageActionEmpty 16\nbd47cbad messageActionChatCreate 16 title:s users:Vl\nb5a1ce5a messageActionChatEditTitle 16 title:s\n7fcb13a8 messageActionChatEditPhoto 16 photo:18\n95e3fbef messageActionChatDeletePhoto 16\n15cefd00 messageActionChatAddUser 16 users:Vl\na43f30cc messageActionChatDeleteUser 16 user_id:l\n31224c3 messageActionChatJoinedByLink 16 inviter_id:l\n95d2ac92 messageActionChannelCreate 16 title:s\ne1037f92 messageActionChatMigrateTo 16 channel_id:l\nea3948e9 messageActionChannelMigrateFrom 16 title:s chat_id:l\n94bd38ed messageActionPinMessage 16\n9fbab604 messageActionHistoryClear 16\n92a72876 messageActionGameScore 16 game_id:l score:i\nffa00ccc messageActionPaymentSentMe 16 flags:# recurring_init:flags.2?t recurring_used:flags.3?t currency:s total_amount:l payload:b info:flags.0?72 shipping_option_id:flags.1?s charge:70 subscription_until_date:flags.4?i\nc624b16e messageActionPaymentSent 16 flags:# recurring_init:flags.2?t recurring_used:flags.3?t currency:s total_amount:l invoice_slug:flags.0?s subscription_until_date:flags.4?i\n80e11a7f messageActionPhoneCall 16 flags:# video:flags.2?t call_id:l reason:flags.0?66 duration:flags.1?i\n4792929b messageActionScreenshotTaken 16\nfae69f56 messageActionCustomAction 16 message:s\nc516d679 messageActionBotAllowed 16 flags:# attach_menu:flags.1?t from_request:flags.3?t domain:flags.0?s app:flags.2?136\n1b287353 messageActionSecureValuesSentMe 16 values:V85 credentials:86\nd95c6154 messageActionSecureValuesSent 16 types:V84\nf3f25f76 messageActionContactSignUp 16\n98e0d697 messageActionGeoProximityReached 16 from_id:6 to_id:6 distance:i\n7a0d7f42 messageActionGroupCall 16 flags:# call:117 duration:flags.0?i\n502f92f7 messageActionInviteToGroupCall 16 call:117 users:Vl\n3c134d7b messageActionSetMessagesTTL 16 flags:# period:i auto_setting_from:flags.0?l\nb3a07661 messageActionGroupCallScheduled 16 call:117 schedule_date:i\naa786345 messageActionSetChatTheme 16 emoticon:s\nebbca3cb messageActionChatJoinedByRequest 16\n47dd8079 messageActionWebViewDataSentMe 16 text:s data:s\nb4c38cb5 messageActionWebViewDataSent 16 text:s\n6c6274fa messageActionGiftPremium 16 flags:# currency:s amount:l months:i crypto_currency:flags.0?s crypto_amount:flags.0?l message:flags.1?135\nd999256 messageActionTopicCreate 16 flags:# title:s icon_color:i icon_emoji_id:flags.0?l\nc0944820 messageActionTopicEdit 16 flags:# title:flags.0?s icon_emoji_id:flags.1?l closed:flags.2?B hidden:flags.3?B\n57de635e messageActionSuggestProfilePhoto 16 photo:18\n31518e9b messageActionRequestedPeer 16 button_id:i peers:V6\n5060a3f4 messageActionSetChatWallPaper 16 flags:# same:flags.0?t for_both:flags.1?t wallpaper:24\n56d03994 messageActionGiftCode 16 flags:# via_giveaway:flags.0?t unclaimed:flags.2?t boost_peer:flags.1?6 months:i slug:s currency:flags.2?s amount:flags.2?l crypto_currency:flags.3?s crypto_amount:flags.3?l message:flags.4?135\na80f51e4 messageActionGiveawayLaunch 16 flags:# stars:flags.0?l\n87e2f155 messageActionGiveawayResults 16 flags:# stars:flags.0?t winners_count:i unclaimed_count:i\ncc02aa6d messageActionBoostApply 16 boosts:i\n93b31848 messageActionRequestedPeerSentMe 16 button_id:i peers:V148\n41b3e202 messageActionPaymentRefunded 16 flags:# peer:6 currency:s total_amount:l payload:flags.0?b charge:70\n45d5b021 messageActionGiftStars 16 flags:# currency:s amount:l stars:l crypto_currency:flags.0?s crypto_amount:flags.0?l transaction_id:flags.1?s\nb00c47a2 messageActionPrizeStars 16 flags:# unclaimed:flags.0?t stars:l transaction_id:s boost_peer:6 giveaway_msg_id:i\n4717e8a4 messageActionStarGift 16 flags:# name_hidden:flags.0?t saved:flags.2?t converted:flags.3?t upgraded:flags.5?t refunded:flags.9?t can_upgrade:flags.10?t gift:155 message:flags.1?135 convert_stars:flags.4?l upgrade_msg_id:flags.5?i upgrade_stars:flags.8?l from_id:flags.11?6 peer:flags.12?6 saved_id:flags.12?l\nacdfcb81 messageActionStarGiftUnique 16 flags:# upgrade:flags.0?t transferred:flags.1?t saved:flags.2?t refunded:flags.5?t gift:155 can_export_at:flags.3?i transfer_stars:flags.4?l from_id:flags.6?6 peer:flags.7?6 saved_id:flags.7?l\nd58a08c6 dialog 17 flags:# pinned:flags.2?t unread_mark:flags.3?t view_forum_as_messages:flags.6?t peer:6 top_message:i read_inbox_max_id:i read_outbox_max_id:i unread_count:i unread_mentions_count:i unread_reactions_count:i notify_settings:22 pts:flags.0?i draft:flags.1?60 folder_id:flags.4?i ttl_period:flags.5?i\n71bd134c dialogFolder 17 flags:# pinned:flags.2?t folder:103 peer:6 top_message:i unread_muted_peers_count:i unread_unmuted_peers_count:i unread_muted_messages_count:i unread_unmuted_messages_count:i\n2331b22d photoEmpty 18 id:l\nfb197a65 photo 18 flags:# has_stickers:flags.0?t id:l access_hash:l file_reference:b date:i sizes:V19 video_sizes:flags.1?V113 dc_id:i\ne17e23c photoSizeEmpty 19 type:s\n75c78e60 photoSize 19 type:s w:i h:i size:i\n21e1ad6 photoCachedSize 19 type:s w:i h:i bytes:b\ne0b0bc2e photoStrippedSize 19 type:s bytes:b\nfa3efb95 photoSizeProgressive 19 type:s w:i h:i sizes:Vi\nd8214d41 photoPathSize 19 type:s bytes:b\n1117dd5f geoPointEmpty 20\nb2a2f663 geoPoint 20 flags:# long:d lat:d access_hash:l accuracy_radius:flags.0?i\n2ea2c0d4 auth.authorization 21 flags:# setup_password_required:flags.1?t otherwise_relogin_days:flags.1?i tmp_sessions:flags.0?i future_auth_token:flags.2?b user:7\n44747e9a auth.authorizationSignUpRequired 21 flags:# terms_of_service:flags.0?57\n99622c0c peerNotifySettings 22 flags:# show_previews:flags.0?B silent:flags.1?B mute_until:flags.2?i ios_sound:flags.3?127 android_sound:flags.4?127 other_sound:flags.5?127 stories_muted:flags.6?B stories_hide_sender:flags.7?B stories_ios_sound:flags.8?127 stories_android_sound:flags.9?127 stories_other_sound:flags.10?127\nacd66c5e peerSettings 23 flags:# report_spam:flags.0?t add_contact:flags.1?t block_contact:flags.2?t share_contact:flags.3?t need_contacts_exception:flags.4?t report_geo:flags.5?t autoarchived:flags.7?t invite_members:flags.8?t request_chat_broadcast:flags.10?t business_bot_paused:flags.11?t business_bot_can_reply:flags.12?t geo_distance:flags.6?i request_chat_title:flags.9?s request_chat_date:flags.9?i business_bot_id:flags.13?l business_bot_manage_url:flags.13?s\na437c3ed wallPaper 24 id:l flags:# creator:flags.0?t default:flags.1?t pattern:flags.3?t dark:flags.4?t access_hash:l slug:s document:36 settings:flags.2?102\ne0804116 wallPaperNoFile 24 id:l flags:# default:flags.1?t dark:flags.4?t settings:flags.2?102\n15ba6c40 messages.dialogs 25 dialogs:V17 messages:V14 chats:V10 users:V7\n71e094f3 messages.dialogsSlice 25 count:i dialogs:V17 messages:V14 chats:V10 users:V7\nf0e3e596 messages.dialogsNotModified 25 count:i\n8c718e87 messages.messages 26 messages:V14 chats:V10 users:V7\n3a54685e messages.messagesSlice 26 flags:# inexact:flags.1?t count:i next_rate:flags.0?i offset_id_offset:flags.2?i messages:V14 chats:V10 users:V7\nc776ba4e messages.channelMessages 26 flags:# inexact:flags.1?t pts:i count:i offset_id_offset:flags.2?i messages:V14 topics:V133 chats:V10 users:V7\n74535f21 messages.messagesNotModified 26 count:i\n1f2b0afd updateNewMessage 27 message:14 pts:i pts_count:i\n4e90bfd6 updateMessageID 27 id:i random_id:l\na20db0e5 updateDeleteMessages 27 messages:Vi pts:i pts_count:i\nc01e857f updateUserTyping 27 user_id:l action:38\n83487af0 updateChatUserTyping 27 chat_id:l from_id:6 action:38\n7761198 updateChatParticipants 27 participants:12\ne5bdf8de updateUserStatus 27 user_id:l status:9\na7848924 updateUserName 27 user_id:l first_name:s last_name:s usernames:V132\n8951abef updateNewAuthorization 27 flags:# unconfirmed:flags.0?t hash:l date:flags.0?i device:flags.0?s location:flags.0?s\n12bcbd9a updateNewEncryptedMessage 27 message:34 qts:i\n1710f156 updateEncryptedChatTyping 27 chat_id:i\nb4a2e88d updateEncryption 27 chat:32 date:i\n38fe25b7 updateEncryptedMessagesRead 27 chat_id:i max_date:i date:i\n3dda5451 updateChatParticipantAdd 27 chat_id:l user_id:l inviter_id:l date:i version:i\ne32f3d77 updateChatParticipantDelete 27 chat_id:l user_id:l version:i\n8e5e9873 updateDcOptions 27 dc_options:V31\nbec268ef updateNotifySettings 27 peer:37 notify_settings:22\nebe46819 updateServiceNotification 27 flags:# popup:flags.0?t invert_media:flags.2?t inbox_date:flags.1?i type:s message:s media:15 entities:V53\nee3b272a updatePrivacy 27 key:39 rules:V40\n5492a13 updateUserPhone 27 user_id:l phone:s\n9c974fdf updateReadHistoryInbox 27 flags:# folder_id:flags.0?i peer:6 max_id:i still_unread_count:i pts:i pts_count:i\n2f2f21bf updateReadHistoryOutbox 27 peer:6 max_id:i pts:i pts_count:i\n7f891213 updateWebPage 27 webpage:43 pts:i pts_count:i\nf8227181 updateReadMessagesContents 27 flags:# messages:Vi pts:i pts_count:i date:flags.0?i\n108d941f updateChannelTooLong 27 flags:# channel_id:l pts:flags.0?i\n635b4c09 updateChannel 27 channel_id:l\n62ba04d9 updateNewChannelMessage 27 message:14 pts:i pts_count:i\n922e6e10 updateReadChannelInbox 27 flags:# folder_id:flags.0?i channel_id:l max_id:i still_unread_count:i pts:i\nc32d5b12 updateDeleteChannelMessages 27 channel_id:l messages:Vi pts:i pts_count:i\nf226ac08 updateChannelMessageViews 27 channel_id:l id:i views:i\nd7ca61a2 updateChatParticipantAdmin 27 chat_id:l user_id:l is_admin:B version:i\n688a30aa updateNewStickerSet 27 stickerset:48\nbb2d201 updateStickerSetsOrder 27 flags:# masks:flags.0?t emojis:flags.1?t order:Vl\n31c24808 updateStickerSets 27 flags:# masks:flags.0?t emojis:flags.1?t\n9375341e updateSavedGifs 27\n496f379c updateBotInlineQuery 27 flags:# query_id:l user_id:l query:s geo:flags.0?20 peer_type:flags.1?119 offset:s\n12f12a07 updateBotInlineSend 27 flags:# user_id:l query:s geo:flags.0?20 id:s msg_id:flags.1?59\n1b3f4df7 updateEditChannelMessage 27 message:14 pts:i pts_count:i\nb9cfc48d updateBotCallbackQuery 27 flags:# query_id:l user_id:l peer:6 msg_id:i chat_instance:l data:flags.0?b game_short_name:flags.1?s\ne40370a3 updateEditMessage 27 message:14 pts:i pts_count:i\n691e9052 updateInlineBotCallbackQuery 27 flags:# query_id:l user_id:l msg_id:59 chat_instance:l data:flags.0?b game_short_name:flags.1?s\nb75f99a9 updateReadChannelOutbox 27 channel_id:l max_id:i\n1b49ec6d updateDraftMessage 27 flags:# peer:6 top_msg_id:flags.0?i draft:60\n571d2742 updateReadFeaturedStickers 27\n9a422c20 updateRecentStickers 27\na229dd06 updateConfig 27\n3354678f updatePtsChanged 27\n2f2ba99f updateChannelWebPage 27 channel_id:l webpage:43 pts:i pts_count:i\n6e6fe51c updateDialogPinned 27 flags:# pinned:flags.0?t folder_id:flags.1?i peer:80\nfa0f3ca2 updatePinnedDialogs 27 flags:# folder_id:flags.1?i order:flags.0?V80\n8317c0c3 updateBotWebhookJSON 27 data:67\n9b9240a6 updateBotWebhookJSONQuery 27 query_id:l data:67 timeout:i\nb5aefd7d updateBotShippingQuery 27 query_id:l user_id:l payload:b shipping_address:71\n8caa9a96 updateBotPrecheckoutQuery 27 flags:# query_id:l user_id:l payload:b info:flags.0?72 shipping_option_id:flags.1?s currency:s total_amount:l\nab0f6b1e updatePhoneCall 27 phone_call:75\n46560264 updateLangPackTooLong 27 lang_code:s\n56022f4d updateLangPack 27 difference:79\ne511996d updateFavedStickers 27\nea29055d updateChannelReadMessagesContents 27 flags:# channel_id:l top_msg_id:flags.0?i messages:Vi\n7084a7be updateContactsReset 27\nb23fc698 updateChannelAvailableMessages 27 channel_id:l available_min_id:i\ne16459c3 updateDialogUnreadMark 27 flags:# unread:flags.0?t peer:80\naca1657b updateMessagePoll 27 flags:# poll_id:l poll:flags.0?97 results:99\n54c01850 updateChatDefaultBannedRights 27 peer:6 default_banned_rights:101 version:i\n19360dc0 updateFolderPeers 27 folder_peers:V104 pts:i pts_count:i\n6a7e7366 updatePeerSettings 27 peer:6 settings:23\nb4afcfb0 updatePeerLocated 27 peers:V105\n39a51dfb updateNewScheduledMessage 27 message:14\nf2a71983 updateDeleteScheduledMessages 27 flags:# peer:6 messages:Vi sent_messages:flags.0?Vi\n8216fba3 updateTheme 27 theme:107\n871fb939 updateGeoLiveViewed 27 peer:6 msg_id:i\n564fe691 updateLoginToken 27\n24f40e77 updateMessagePollVote 27 poll_id:l peer:6 options:Vb qts:i\n26ffde7d updateDialogFilter 27 flags:# id:i filter:flags.0?112\na5d72105 updateDialogFilterOrder 27 order:Vi\n3504914f updateDialogFilters 27\n2661bf09 updatePhoneCallSignalingData 27 phone_call_id:l data:b\nd29a27f4 updateChannelMessageForwards 27 channel_id:l id:i forwards:i\nd6b19546 updateReadChannelDiscussionInbox 27 flags:# channel_id:l top_msg_id:i read_max_id:i broadcast_id:flags.0?l broadcast_post:flags.0?i\n695c9e7c updateReadChannelDiscussionOutbox 27 channel_id:l top_msg_id:i read_max_id:i\nebe07752 updatePeerBlocked 27 flags:# blocked:flags.0?t blocked_my_stories_from:flags.1?t peer_id:6\n8c88c923 updateChannelUserTyping 27 flags:# channel_id:l top_msg_id:flags.0?i from_id:6 action:38\ned85eab5 updatePinnedMessages 27 flags:# pinned:flags.0?t peer:6 messages:Vi pts:i pts_count:i\n5bb98608 updatePinnedChannelMessages 27 flags:# pinned:flags.0?t channel_id:l messages:Vi pts:i pts_count:i\nf89a6a4e updateChat 27 chat_id:l\nf2ebdb4e updateGroupCallParticipants 27 call:117 participants:V118 version:i\n97d64341 updateGroupCall 27 flags:# chat_id:flags.0?l call:116\nbb9bb9a5 updatePeerHistoryTTL 27 flags:# peer:6 ttl_period:flags.0?i\nd087663a updateChatParticipant 27 flags:# chat_id:l date:i actor_id:l user_id:l prev_participant:flags.0?11 new_participant:flags.1?11 invite:flags.2?45 qts:i\n985d3abb updateChannelParticipant 27 flags:# via_chatlist:flags.3?t channel_id:l date:i actor_id:l user_id:l prev_participant:flags.0?56 new_participant:flags.1?56 invite:flags.2?45 qts:i\nc4870a49 updateBotStopped 27 user_id:l date:i stopped:B qts:i\nb783982 updateGroupCallConnection 27 flags:# presentation:flags.0?t params:67\n4d712f2e updateBotCommands 27 peer:6 bot_id:l commands:V49\n7063c3db updatePendingJoinRequests 27 peer:6 requests_pending:i recent_requesters:Vl\n11dfa986 updateBotChatInviteRequester 27 peer:6 date:i user_id:l about:s invite:45 qts:i\n5e1b3cb8 updateMessageReactions 27 flags:# peer:6 msg_id:i top_msg_id:flags.0?i reactions:124\n17b7a20b updateAttachMenuBots 27\n1592b79d updateWebViewResultSent 27 query_id:l\n14b85813 updateBotMenuButton 27 bot_id:l button:126\n74d8be99 updateSavedRingtones 27\n84cd5a updateTranscribedAudio 27 flags:# pending:flags.0?t peer:6 msg_id:i transcription_id:l text:s\nfb4c496c updateReadFeaturedEmojiStickers 27\n28373599 updateUserEmojiStatus 27 user_id:l emoji_status:128\n30f443db updateRecentEmojiStatuses 27\n6f7863f4 updateRecentReactions 27\n86fccf85 updateMoveStickerSetToTop 27 flags:# masks:flags.0?t emojis:flags.1?t stickerset:l\nd5a41724 updateMessageExtendedMedia 27 peer:6 msg_id:i extended_media:V130\n192efbe3 updateChannelPinnedTopic 27 flags:# pinned:flags.0?t channel_id:l topic_id:i\nfe198602 updateChannelPinnedTopics 27 flags:# channel_id:l order:flags.0?Vi\n20529438 updateUser 27 user_id:l\nec05b097 updateAutoSaveSettings 27\n75b3b798 updateStory 27 peer:6 story:138\nf74e932b updateReadStories 27 peer:6 max_id:i\n1bf335b9 updateStoryID 27 id:i random_id:l\n2c084dc1 updateStoriesStealthMode 27 stealth_mode:140\n7d627683 updateSentStoryReaction 27 peer:6 story_id:i reaction:129\n904dd49c updateBotChatBoost 27 peer:6 boost:143 qts:i\n7b68920 updateChannelViewForumAsMessages 27 channel_id:l enabled:B\nae3f101d updatePeerWallpaper 27 flags:# wallpaper_overridden:flags.1?t peer:6 wallpaper:flags.0?24\nac21d3ce updateBotMessageReaction 27 peer:6 msg_id:i date:i actor:6 old_reactions:V129 new_reactions:V129 qts:i\n9cb7759 updateBotMessageReactions 27 peer:6 msg_id:i date:i reactions:V123 qts:i\naeaf9e74 updateSavedDialogPinned 27 flags:# pinned:flags.0?t peer:80\n686c85a6 updatePinnedSavedDialogs 27 flags:# order:flags.0?V80\n39c67432 updateSavedReactionTags 27\nf16269d4 updateSmsJob 27 job_id:s\nf9470ab2 updateQuickReplies 27 quick_replies:V146\nf53da717 updateNewQuickReply 27 quick_reply:146\n53e6f1ec updateDeleteQuickReply 27 shortcut_id:i\n3e050d0f updateQuickReplyMessage 27 message:14\n566fe7cd updateDeleteQuickReplyMessages 27 shortcut_id:i messages:Vi\n8ae5c97a updateBotBusinessConnect 27 connection:147 qts:i\n9ddb347c updateBotNewBusinessMessage 27 flags:# connection_id:s message:14 reply_to_message:flags.0?14 qts:i\n7df587c updateBotEditBusinessMessage 27 flags:# connection_id:s message:14 reply_to_message:flags.0?14 qts:i\na02a982e updateBotDeleteBusinessMessage 27 connection_id:s peer:6 messages:Vi qts:i\n1824e40b updateNewStoryReaction 27 story_id:i peer:6 reaction:129\ndfd961f5 updateBroadcastRevenueTransactions 27 peer:6 balances:149\n4e80a379 updateStarsBalance 27 balance:156\n1ea2fda7 updateBusinessBotCallbackQuery 27 flags:# query_id:l user_id:l connection_id:s message:14 reply_to_message:flags.2?14 chat_instance:l data:flags.0?b\na584b019 updateStarsRevenueStatus 27 peer:6 status:152\n283bd312 updateBotPurchasedPaidMedia 27 user_id:l payload:s qts:i\n51ca7aec updatePaidReactionPrivacy 27 private:B\na56c2a3e updates.state 28 pts:i qts:i date:i seq:i unread_count:i\n5d75a138 updates.differenceEmpty 29 date:i seq:i\nf49ca0 updates.difference 29 new_messages:V14 new_encrypted_messages:V34 other_updates:V27 chats:V10 users:V7 state:28\na8fb1981 updates.differenceSlice 29 new_messages:V14 new_encrypted_messages:V34 other_updates:V27 chats:V10 users:V7 intermediate_state:28\n4afe8f6d updates.differenceTooLong 29 pts:i\ne317af7e updatesTooLong 30\n313bc7f8 updateShortMessage 30 flags:# out:flags.1?t mentioned:flags.4?t media_unread:flags.5?t silent:flags.13?t id:i user_id:l message:s pts:i pts_count:i date:i fwd_from:flags.2?58 via_bot_id:flags.11?l reply_to:flags.3?114 entities:flags.7?V53 ttl_period:flags.25?i\n4d6deea5 updateShortChatMessage 30 flags:# out:flags.1?t mentioned:flags.4?t media_unread:flags.5?t silent:flags.13?t id:i from_id:l chat_id:l message:s pts:i pts_count:i date:i fwd_from:flags.2?58 via_bot_id:flags.11?l reply_to:flags.3?114 entities:flags.7?V53 ttl_period:flags.25?i\n78d4dec1 updateShort 30 update:27 date:i\n725b04c3 updatesCombined 30 updates:V27 users:V7 chats:V10 date:i seq_start:i seq:i\n74ae4240 updates 30 updates:V27 users:V7 chats:V10 date:i seq:i\n9015e101 updateShortSentMessage 30 flags:# out:flags.1?t id:i pts:i pts_count:i date:i media:flags.9?15 entities:flags.7?V53 ttl_period:flags.25?i\n18b7a10d dcOption 31 flags:# ipv6:flags.0?t media_only:flags.1?t tcpo_only:flags.2?t cdn:flags.3?t static:flags.4?t this_port_only:flags.5?t id:i ip_address:s port:i secret:flags.10?b\nab7ec0a0 encryptedChatEmpty 32 id:i\n66b25953 encryptedChatWaiting 32 id:i access_hash:l date:i admin_id:l participant_id:l\n48f1d94c encryptedChatRequested 32 flags:# folder_id:flags.0?i id:i access_hash:l date:i admin_id:l participant_id:l g_a:b\n61f0d4c7 encryptedChat 32 id:i access_hash:l date:i admin_id:l participant_id:l g_a_or_b:b key_fingerprint:l\n1e1c7c45 encryptedChatDiscarded 32 flags:# history_deleted:flags.0?t id:i\nc21f497e encryptedFileEmpty 33\na8008cd8 encryptedFile 33 id:l access_hash:l size:l dc_id:i key_fingerprint:i\ned18c118 encryptedMessage 34 random_id:l chat_id:i date:i bytes:b file:33\n23734b06 encryptedMessageService 34 random_id:l chat_id:i date:i bytes:b\n72f0eaae inputDocumentEmpty 35\n1abfb575 inputDocument 35 id:l access_hash:l file_reference:b\n36f8c871 documentEmpty 36 id:l\n8fd4c4d8 document 36 flags:# id:l access_hash:l file_reference:b date:i mime_type:s size:l thumbs:flags.0?V19 video_thumbs:flags.1?V113 dc_id:i attributes:V41\n9fd40bd8 notifyPeer 37 peer:6\nb4c83b4c notifyUsers 37\nc007cec3 notifyChats 37\nd612e8ef notifyBroadcasts 37\n226e6308 notifyForumTopic 37 peer:6 top_msg_id:i\n16bf744e sendMessageTypingAction 38\nfd5ec8f5 sendMessageCancelAction 38\na187d66f sendMessageRecordVideoAction 38\ne9763aec sendMessageUploadVideoAction 38 progress:i\nd52f73f7 sendMessageRecordAudioAction 38\nf351d7ab sendMessageUploadAudioAction 38 progress:i\nd1d34a26 sendMessageUploadPhotoAction 38 progress:i\naa0cd9e4 sendMessageUploadDocumentAction 38 progress:i\n176f8ba1 sendMessageGeoLocationAction 38\n628cbc6f sendMessageChooseContactAction 38\ndd6a8f48 sendMessageGamePlayAction 38\n88f27fbc sendMessageRecordRoundAction 38\n243e1c66 sendMessageUploadRoundAction 38 progress:i\nd92c2285 speakingInGroupCallAction 38\ndbda9246 sendMessageHistoryImportAction 38 progress:i\nb05ac6b1 sendMessageChooseStickerAction 38\n25972bcb sendMessageEmojiInteraction 38 emoticon:s msg_id:i interaction:67\nb665902e sendMessageEmojiInteractionSeen 38 emoticon:s\nbc2eab30 privacyKeyStatusTimestamp 39\n500e6dfa privacyKeyChatInvite 39\n3d662b7b privacyKeyPhoneCall 39\n39491cc8 privacyKeyPhoneP2P 39\n69ec56a3 privacyKeyForwards 39\n96151fed privacyKeyProfilePhoto 39\nd19ae46d privacyKeyPhoneNumber 39\n42ffd42b privacyKeyAddedByPhone 39\n697f414 privacyKeyVoiceMessages 39\na486b761 privacyKeyAbout 39\n2000a518 privacyKeyBirthday 39\n2ca4fdf8 privacyKeyStarGiftsAutoSave 39\nfffe1bac privacyValueAllowContacts 40\n65427b82 privacyValueAllowAll 40\nb8905fb2 privacyValueAllowUsers 40 users:Vl\nf888fa1a privacyValueDisallowContacts 40\n8b73e763 privacyValueDisallowAll 40\ne4621141 privacyValueDisallowUsers 40 users:Vl\n6b134e8e privacyValueAllowChatParticipants 40 chats:Vl\n41c87565 privacyValueDisallowChatParticipants 40 chats:Vl\nf7e8d89b privacyValueAllowCloseFriends 40\nece9814b privacyValueAllowPremium 40\n21461b5d privacyValueAllowBots 40\nf6a5f82f privacyValueDisallowBots 40\n6c37c15c documentAttributeImageSize 41 w:i h:i\n11b58939 documentAttributeAnimated 41\n6319d612 documentAttributeSticker 41 flags:# mask:flags.1?t alt:s stickerset:46 mask_coords:flags.0?61\n43c57c48 documentAttributeVideo 41 flags:# round_message:flags.0?t supports_streaming:flags.1?t nosound:flags.3?t duration:d w:i h:i preload_prefix_size:flags.2?i video_start_ts:flags.4?d video_codec:flags.5?s\n9852f9c6 documentAttributeAudio 41 flags:# voice:flags.10?t duration:i title:flags.0?s performer:flags.1?s waveform:flags.2?b\n15590068 documentAttributeFilename 41 file_name:s\n9801d2f7 documentAttributeHasStickers 41\nfd149899 documentAttributeCustomEmoji 41 flags:# free:flags.0?t text_color:flags.1?t alt:s stickerset:46\n12b299d4 stickerPack 42 emoticon:s documents:Vl\n211a1788 webPageEmpty 43 flags:# id:l url:flags.0?s\nb0d13e47 webPagePending 43 flags:# id:l url:flags.0?s date:i\ne89c45b2 webPage 43 flags:# has_large_media:flags.13?t id:l url:s display_url:s hash:i type:flags.0?s site_name:flags.1?s title:flags.2?s description:flags.3?s photo:flags.4?18 embed_url:flags.5?s embed_type:flags.5?s embed_width:flags.6?i embed_height:flags.6?i duration:flags.7?i author:flags.8?s document:flags.9?36 cached_page:flags.10?95 attributes:flags.12?V111\n7311ca11 webPageNotModified 43 flags:# cached_page_views:flags.0?i\n957b50fb account.password 44 flags:# has_recovery:flags.0?t has_secure_values:flags.1?t has_password:flags.2?t current_algo:flags.2?87 srp_B:flags.2?b srp_id:flags.2?l hint:flags.3?s email_unconfirmed_pattern:flags.4?s new_algo:87 new_secure_algo:88 secure_random:b pending_reset_date:flags.5?i login_email_pattern:flags.6?s\na22cbd96 chatInviteExported 45 flags:# revoked:flags.0?t permanent:flags.5?t request_needed:flags.6?t link:s admin_id:l date:i start_date:flags.4?i expire_date:flags.1?i usage_limit:flags.2?i usage:flags.3?i requested:flags.7?i subscription_expired:flags.10?i title:flags.8?s subscription_pricing:flags.9?153\ned107ab7 chatInvitePublicJoinRequests 45\nffb62b95 inputStickerSetEmpty 46\n9de7a269 inputStickerSetID 46 id:l access_hash:l\n861cc8a0 inputStickerSetShortName 46 short_name:s\n28703c8 inputStickerSetAnimatedEmoji 46\ne67f520e inputStickerSetDice 46 emoticon:s\ncde3739 inputStickerSetAnimatedEmojiAnimations 46\nc88b3b02 inputStickerSetPremiumGifts 46\n4c4d4ce inputStickerSetEmojiGenericAnimations 46\n29d0f5ee inputStickerSetEmojiDefaultStatuses 46\n44c1f8e9 inputStickerSetEmojiDefaultTopicIcons 46\n49748553 inputStickerSetEmojiChannelDefaultStatuses 46\n2dd14edc stickerSet 47 flags:# archived:flags.1?t official:flags.2?t masks:flags.3?t emojis:flags.7?t text_color:flags.9?t channel_emoji_status:flags.10?t creator:flags.11?t installed_date:flags.0?i id:l access_hash:l title:s short_name:s thumbs:flags.4?V19 thumb_dc_id:flags.4?i thumb_version:flags.4?i thumb_document_id:flags.8?l count:i hash:i\n6e153f16 messages.stickerSet 48 set:47 packs:V42 keywords:V131 documents:V36\nd3f924eb messages.stickerSetNotModified 48\nc27ac8c7 botCommand 49 command:s description:s\na2fa4880 keyboardButton 50 text:s\n258aff05 keyboardButtonUrl 50 text:s url:s\n35bbdb6b keyboardButtonCallback 50 flags:# requires_password:flags.0?t text:s data:b\nb16a6c29 keyboardButtonRequestPhone 50 text:s\nfc796b3f keyboardButtonRequestGeoLocation 50 text:s\n93b9fbb5 keyboardButtonSwitchInline 50 flags:# same_peer:flags.0?t text:s query:s peer_types:flags.1?V119\n50f41ccf keyboardButtonGame 50 text:s\nafd93fbb keyboardButtonBuy 50 text:s\n10b78d29 keyboardButtonUrlAuth 50 flags:# text:s fwd_text:flags.0?s url:s button_id:i\nd02e7fd4 inputKeyboardButtonUrlAuth 50 flags:# request_write_access:flags.0?t text:s fwd_text:flags.1?s url:s bot:1\nbbc7515d keyboardButtonRequestPoll 50 flags:# quiz:flags.0?B text:s\ne988037b inputKeyboardButtonUserProfile 50 text:s user_id:1\n308660c1 keyboardButtonUserProfile 50 text:s user_id:l\n13767230 keyboardButtonWebView 50 text:s url:s\na0c0505c keyboardButtonSimpleWebView 50 text:s url:s\n53d7bfd8 keyboardButtonRequestPeer 50 text:s button_id:i peer_type:134 max_quantity:i\nc9662d05 inputKeyboardButtonRequestPeer 50 flags:# name_requested:flags.0?t username_requested:flags.1?t photo_requested:flags.2?t text:s button_id:i peer_type:134 max_quantity:i\n75d2698e keyboardButtonCopy 50 text:s copy_text:s\n77608b83 keyboardButtonRow 51 buttons:V50\na03e5b85 replyKeyboardHide 52 flags:# selective:flags.2?t\n86b40b08 replyKeyboardForceReply 52 flags:# single_use:flags.1?t selective:flags.2?t placeholder:flags.3?s\n85dd99d1 replyKeyboardMarkup 52 flags:# resize:flags.0?t single_use:flags.1?t selective:flags.2?t persistent:flags.4?t rows:V51 placeholder:flags.3?s\n48a30254 replyInlineMarkup 52 rows:V51\nbb92ba95 messageEntityUnknown 53 offset:i length:i\nfa04579d messageEntityMention 53 offset:i length:i\n6f635b0d messageEntityHashtag 53 offset:i length:i\n6cef8ac7 messageEntityBotCommand 53 offset:i length:i\n6ed02538 messageEntityUrl 53 offset:i length:i\n64e475c2 messageEntityEmail 53 offset:i length:i\nbd610bc9 messageEntityBold 53 offset:i length:i\n826f8b60 messageEntityItalic 53 offset:i length:i\n28a20571 messageEntityCode 53 offset:i length:i\n73924be0 messageEntityPre 53 offset:i length:i language:s\n76a6d327 messageEntityTextUrl 53 offset:i length:i url:s\ndc7b1140 messageEntityMentionName 53 offset:i length:i user_id:l\n208e68c9 inputMessageEntityMentionName 53 offset:i length:i user_id:1\n9b69e34b messageEntityPhone 53 offset:i length:i\n4c4e743f messageEntityCashtag 53 offset:i length:i\n9c4e7e8b messageEntityUnderline 53 offset:i length:i\nbf0693d4 messageEntityStrike 53 offset:i length:i\n761e6af4 messageEntityBankCard 53 offset:i length:i\n32ca960f messageEntitySpoiler 53 offset:i length:i\nc8cf05f8 messageEntityCustomEmoji 53 offset:i length:i document_id:l\nf1ccaaac messageEntityBlockquote 53 flags:# collapsed:flags.0?t offset:i length:i\nee8c1e86 inputChannelEmpty 54\nf35aec28 inputChannel 54 channel_id:l access_hash:l\n5b934f9d inputChannelFromMessage 54 peer:0 msg_id:i channel_id:l\n3e11affb updates.channelDifferenceEmpty 55 flags:# final:flags.0?t pts:i timeout:flags.1?i\na4bcc6fe updates.channelDifferenceTooLong 55 flags:# final:flags.0?t timeout:flags.1?i dialog:17 messages:V14 chats:V10 users:V7\n2064674e updates.channelDifference 55 flags:# final:flags.0?t pts:i timeout:flags.1?i new_messages:V14 other_updates:V27 chats:V10 users:V7\ncb397619 channelParticipant 56 flags:# user_id:l date:i subscription_until_date:flags.0?i\n4f607bef channelParticipantSelf 56 flags:# via_request:flags.0?t user_id:l inviter_id:l date:i subscription_until_date:flags.1?i\n2fe601d3 channelParticipantCreator 56 flags:# user_id:l admin_rights:100 rank:flags.0?s\n34c3bb53 channelParticipantAdmin 56 flags:# can_edit:flags.0?t self:flags.1?t user_id:l inviter_id:flags.1?l promoted_by:l date:i admin_rights:100 rank:flags.2?s\n6df8014e channelParticipantBanned 56 flags:# left:flags.0?t peer:6 kicked_by:l date:i banned_rights:101\n1b03f006 channelParticipantLeft 56 peer:6\n780a0310 help.termsOfService 57 flags:# popup:flags.0?t id:67 text:s entities:V53 min_age_confirm:flags.1?i\n4e4df4bb messageFwdHeader 58 flags:# imported:flags.7?t saved_out:flags.11?t from_id:flags.0?6 from_name:flags.5?s date:i channel_post:flags.2?i post_author:flags.3?s saved_from_peer:flags.4?6 saved_from_msg_id:flags.4?i saved_from_id:flags.8?6 saved_from_name:flags.9?s saved_date:flags.10?i psa_type:flags.6?s\n890c3d89 inputBotInlineMessageID 59 dc_id:i id:l access_hash:l\nb6d915d7 inputBotInlineMessageID64 59 dc_id:i owner_id:l id:i access_hash:l\n1b0c841a draftMessageEmpty 60 flags:# date:flags.0?i\n2d65321f draftMessage 60 flags:# no_webpage:flags.1?t invert_media:flags.6?t reply_to:flags.4?139 message:s entities:flags.3?V53 media:flags.5?3 date:i effect:flags.7?l\naed6dbb2 maskCoords 61 n:i x:d y:d zoom:d\nbdf9653b game 62 flags:# id:l access_hash:l short_name:s title:s description:s photo:18 document:flags.0?36\n32c3e77 inputGameID 63 id:l access_hash:l\nc331e80a inputGameShortName 63 bot_id:1 short_name:s\ndc3d824f textEmpty 64\n744694e0 textPlain 64 text:s\n6724abc4 textBold 64 text:64\nd912a59c textItalic 64 text:64\nc12622c4 textUnderline 64 text:64\n9bf8bb95 textStrike 64 text:64\n6c3f19b9 textFixed 64 text:64\n3c2884c1 textUrl 64 text:64 url:s webpage_id:l\nde5a0dd6 textEmail 64 text:64 email:s\n7e6260d7 textConcat 64 texts:V64\ned6a8504 textSubscript 64 text:64\nc7fb5e01 textSuperscript 64 text:64\n34b8621 textMarked 64 text:64\n1ccb966a textPhone 64 text:64 phone:s\n81ccf4f textImage 64 document_id:l w:i h:i\n35553762 textAnchor 64 text:64 name:s\n13567e8a pageBlockUnsupported 65\n70abc3fd pageBlockTitle 65 text:64\n8ffa9a1f pageBlockSubtitle 65 text:64\nbaafe5e0 pageBlockAuthorDate 65 author:64 published_date:i\nbfd064ec pageBlockHeader 65 text:64\nf12bb6e1 pageBlockSubheader 65 text:64\n467a0766 pageBlockParagraph 65 text:64\nc070d93e pageBlockPreformatted 65 text:64 language:s\n48870999 pageBlockFooter 65 text:64\ndb20b188 pageBlockDivider 65\nce0d37b0 pageBlockAnchor 65 name:s\ne4e88011 pageBlockList 65 items:V92\n263d7c26 pageBlockBlockquote 65 text:64 caption:64\n4f4456d3 pageBlockPullquote 65 text:64 caption:64\n1759c560 pageBlockPhoto 65 flags:# photo_id:l caption:91 url:flags.0?s webpage_id:flags.0?l\n7c8fe7b6 pageBlockVideo 65 flags:# autoplay:flags.0?t loop:flags.1?t video_id:l caption:91\n39f23300 pageBlockCover 65 cover:65\na8718dc5 pageBlockEmbed 65 flags:# full_width:flags.0?t allow_scrolling:flags.3?t url:flags.1?s html:flags.2?s poster_photo_id:flags.4?l w:flags.5?i h:flags.5?i caption:91\nf259a80b pageBlockEmbedPost 65 url:s webpage_id:l author_photo_id:l author:s date:i blocks:V65 caption:91\n65a0fa4d pageBlockCollage 65 items:V65 caption:91\n31f9590 pageBlockSlideshow 65 items:V65 caption:91\nef1751b5 pageBlockChannel 65 channel:10\n804361ea pageBlockAudio 65 audio_id:l caption:91\n1e148390 pageBlockKicker 65 text:64\nbf4dea82 pageBlockTable 65 flags:# bordered:flags.0?t striped:flags.1?t title:64 rows:V90\n9a8ae1e1 pageBlockOrderedList 65 items:V93\n76768bed pageBlockDetails 65 flags:# open:flags.0?t blocks:V65 title:64\n16115a96 pageBlockRelatedArticles 65 title:64 articles:V94\na44f3ef6 pageBlockMap 65 geo:20 zoom:i w:i h:i caption:91\n85e42301 phoneCallDiscardReasonMissed 66\ne095c1a0 phoneCallDiscardReasonDisconnect 66\n57adc690 phoneCallDiscardReasonHangup 66\nfaf7e8c9 phoneCallDiscardReasonBusy 66\nafe2b839 phoneCallDiscardReasonAllowGroupCall 66 encrypted_key:b\n7d748d04 dataJSON 67 data:s\ncb296bf8 labeledPrice 68 label:s amount:l\n49ee584 invoice 69 flags:# test:flags.0?t name_requested:flags.1?t phone_requested:flags.2?t email_requested:flags.3?t shipping_address_requested:flags.4?t flexible:flags.5?t phone_to_provider:flags.6?t email_to_provider:flags.7?t recurring:flags.9?t currency:s prices:V68 max_tip_amount:flags.8?l suggested_tip_amounts:flags.8?Vl terms_url:flags.10?s subscription_period:flags.11?i\nea02c27e paymentCharge 70 id:s provider_charge_id:s\n1e8caaeb postAddress 71 street_line1:s street_line2:s city:s state:s country_iso2:s post_code:s\n909c3f94 paymentRequestedInfo 72 flags:# name:flags.0?s phone:flags.1?s email:flags.2?s shipping_address:flags.3?71\n1c570ed1 webDocument 73 url:s access_hash:l size:i mime_type:s attributes:V41\nf9c8bcc6 webDocumentNoProxy 73 url:s size:i mime_type:s attributes:V41\n9bed434d inputWebDocument 74 url:s size:i mime_type:s attributes:V41\n5366c915 phoneCallEmpty 75 id:l\need42858 phoneCallWaiting 75 flags:# video:flags.6?t id:l access_hash:l date:i admin_id:l participant_id:l protocol:77 receive_date:flags.0?i conference_call:flags.8?117\n45361c63 phoneCallRequested 75 flags:# video:flags.6?t id:l access_hash:l date:i admin_id:l participant_id:l g_a_hash:b protocol:77 conference_call:flags.8?117\n22fd7181 phoneCallAccepted 75 flags:# video:flags.6?t id:l access_hash:l date:i admin_id:l participant_id:l g_b:b protocol:77 conference_call:flags.8?117\n3ba5940c phoneCall 75 flags:# p2p_allowed:flags.5?t video:flags.6?t id:l access_hash:l date:i admin_id:l participant_id:l g_a_or_b:b key_fingerprint:l protocol:77 connections:V76 start_date:i custom_parameters:flags.7?67 conference_call:flags.8?117\nf9d25503 phoneCallDiscarded 75 flags:# need_rating:flags.2?t need_debug:flags.3?t video:flags.6?t id:l reason:flags.0?66 duration:flags.1?i conference_call:flags.8?117\n9cc123c7 phoneConnection 76 flags:# tcp:flags.0?t id:l ip:s ipv6:s port:i peer_tag:b\n635fe375 phoneConnectionWebrtc 76 flags:# turn:flags.0?t stun:flags.1?t id:l ip:s ipv6:s port:i username:s password:s\nfc878fc8 phoneCallProtocol 77 flags:# udp_p2p:flags.0?t udp_reflector:flags.1?t min_layer:i max_layer:i library_versions:Vs\ncad181f6 langPackString 78 key:s value:s\n6c47ac9f langPackStringPluralized 78 flags:# key:s zero_value:flags.0?s one_value:flags.1?s two_value:flags.2?s few_value:flags.3?s many_value:flags.4?s other_value:s\n2979eeb2 langPackStringDeleted 78 key:s\nf385c1f6 langPackDifference 79 lang_code:s from_version:i version:i strings:V78\ne56dbf05 dialogPeer 80 peer:6\n514519e2 dialogPeerFolder 80 folder_id:i\n64199744 secureFileEmpty 81\n7d09c27e secureFile 81 id:l access_hash:l size:l dc_id:i date:i file_hash:b secret:b\n8aeabec3 secureData 82 data:b data_hash:b secret:b\n7d6099dd securePlainPhone 83 phone:s\n21ec5a5f securePlainEmail 83 email:s\n9d2a81e3 secureValueTypePersonalDetails 84\n3dac6a00 secureValueTypePassport 84\n6e425c4 secureValueTypeDriverLicense 84\na0d0744b secureValueTypeIdentityCard 84\n99a48f23 secureValueTypeInternalPassport 84\ncbe31e26 secureValueTypeAddress 84\nfc36954e secureValueTypeUtilityBill 84\n89137c0d secureValueTypeBankStatement 84\n8b883488 secureValueTypeRentalAgreement 84\n99e3806a secureValueTypePassportRegistration 84\nea02ec33 secureValueTypeTemporaryRegistration 84\nb320aadb secureValueTypePhone 84\n8e3ca7ee secureValueTypeEmail 84\n187fa0ca secureValue 85 flags:# type:84 data:flags.0?82 front_side:flags.1?81 reverse_side:flags.2?81 selfie:flags.3?81 translation:flags.6?V81 files:flags.4?V81 plain_data:flags.5?83 hash:b\n33f0ea47 secureCredentialsEncrypted 86 data:b hash:b secret:b\nd45ab096 passwordKdfAlgoUnknown 87\n3a912d4a passwordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow 87 salt1:b salt2:b g:i p:b\n4a8537 securePasswordKdfAlgoUnknown 88\nbbf2dda0 securePasswordKdfAlgoPBKDF2HMACSHA512iter100000 88 salt:b\n86471d92 securePasswordKdfAlgoSHA512 88 salt:b\n34566b6a pageTableCell 89 flags:# header:flags.0?t align_center:flags.3?t align_right:flags.4?t valign_middle:flags.5?t valign_bottom:flags.6?t text:flags.7?64 colspan:flags.1?i rowspan:flags.2?i\ne0c0c5e5 pageTableRow 90 cells:V89\n6f747657 pageCaption 91 text:64 credit:64\nb92fb6cd pageListItemText 92 text:64\n25e073fc pageListItemBlocks 92 blocks:V65\n5e068047 pageListOrderedItemText 93 num:s text:64\n98dd8936 pageListOrderedItemBlocks 93 num:s blocks:V65\nb390dc08 pageRelatedArticle 94 flags:# url:s webpage_id:l title:flags.0?s description:flags.1?s photo_id:flags.2?l author:flags.3?s published_date:flags.4?i\n98657f0d page 95 flags:# part:flags.0?t rtl:flags.1?t v2:flags.2?t url:s blocks:V65 photos:V18 documents:V36 views:flags.3?i\nff16e2ca pollAnswer 96 text:135 option:b\n58747131 poll 97 id:l flags:# closed:flags.0?t public_voters:flags.1?t multiple_choice:flags.2?t quiz:flags.3?t question:135 answers:V96 close_period:flags.4?i close_date:flags.5?i\n3b6ddad2 pollAnswerVoters 98 flags:# chosen:flags.0?t correct:flags.1?t option:b voters:i\n7adf2420 pollResults 99 flags:# min:flags.0?t results:flags.1?V98 total_voters:flags.2?i recent_voters:flags.3?V6 solution:flags.4?s solution_entities:flags.4?V53\n5fb224d5 chatAdminRights 100 flags:# change_info:flags.0?t post_messages:flags.1?t edit_messages:flags.2?t delete_messages:flags.3?t ban_users:flags.4?t invite_users:flags.5?t pin_messages:flags.7?t add_admins:flags.9?t anonymous:flags.10?t manage_call:flags.11?t other:flags.12?t manage_topics:flags.13?t post_stories:flags.14?t edit_stories:flags.15?t delete_stories:flags.16?t\n9f120418 chatBannedRights 101 flags:# view_messages:flags.0?t send_messages:flags.1?t send_media:flags.2?t send_stickers:flags.3?t send_gifs:flags.4?t send_games:flags.5?t send_inline:flags.6?t embed_links:flags.7?t send_polls:flags.8?t change_info:flags.10?t invite_users:flags.15?t pin_messages:flags.17?t manage_topics:flags.18?t send_photos:flags.19?t send_videos:flags.20?t send_roundvideos:flags.21?t send_audios:flags.22?t send_voices:flags.23?t send_docs:flags.24?t send_plain:flags.25?t until_date:i\n372efcd0 wallPaperSettings 102 flags:# blur:flags.1?t motion:flags.2?t background_color:flags.0?i second_background_color:flags.4?i third_background_color:flags.5?i fourth_background_color:flags.6?i intensity:flags.3?i rotation:flags.4?i emoticon:flags.7?s\nff544e65 folder 103 flags:# autofill_new_broadcasts:flags.0?t autofill_public_groups:flags.1?t autofill_new_correspondents:flags.2?t id:i title:s photo:flags.3?13\ne9baa668 folderPeer 104 peer:6 folder_id:i\nca461b5d peerLocated 105 peer:6 expires:i distance:i\nf8ec284b peerSelfLocated 105 expires:i\nd072acb4 restrictionReason 106 platform:s reason:s text:s\na00e67d6 theme 107 flags:# creator:flags.0?t default:flags.1?t for_chat:flags.5?t id:l access_hash:l slug:s title:s document:flags.2?36 settings:flags.3?V110 emoticon:flags.6?s installs_count:flags.4?i\n629f1980 auth.loginToken 108 expires:i token:b\n68e9916 auth.loginTokenMigrateTo 108 dc_id:i token:b\n390d5c5e auth.loginTokenSuccess 108 authorization:21\nc3a12462 baseThemeClassic 109\nfbd81688 baseThemeDay 109\nb7b31ea8 baseThemeNight 109\n6d5f77ee baseThemeTinted 109\n5b11125a baseThemeArctic 109\nfa58b6d4 themeSettings 110 flags:# message_colors_animated:flags.2?t base_theme:109 accent_color:i outbox_accent_color:flags.3?i message_colors:flags.0?Vi wallpaper:flags.1?24\n54b56617 webPageAttributeTheme 111 flags:# documents:flags.0?V36 settings:flags.1?110\n2e94c3e7 webPageAttributeStory 111 flags:# peer:6 id:i story:flags.0?138\n50cc03d3 webPageAttributeStickerSet 111 flags:# emojis:flags.0?t text_color:flags.1?t stickers:V36\ncf6f6db8 webPageAttributeUniqueStarGift 111 gift:155\naa472651 dialogFilter 112 flags:# contacts:flags.0?t non_contacts:flags.1?t groups:flags.2?t broadcasts:flags.3?t bots:flags.4?t exclude_muted:flags.11?t exclude_read:flags.12?t exclude_archived:flags.13?t title_noanimate:flags.28?t id:i title:135 emoticon:flags.25?s color:flags.27?i pinned_peers:V0 include_peers:V0 exclude_peers:V0\n363293ae dialogFilterDefault 112\n96537bd7 dialogFilterChatlist 112 flags:# has_my_invites:flags.26?t title_noanimate:flags.28?t id:i title:135 emoticon:flags.25?s color:flags.27?i pinned_peers:V0 include_peers:V0\nde33b094 videoSize 113 flags:# type:s w:i h:i size:i video_start_ts:flags.0?d\nf85c413c videoSizeEmojiMarkup 113 emoji_id:l background_colors:Vi\nda082fe videoSizeStickerMarkup 113 stickerset:46 sticker_id:l background_colors:Vi\nafbc09db messageReplyHeader 114 flags:# reply_to_scheduled:flags.2?t forum_topic:flags.3?t quote:flags.9?t reply_to_msg_id:flags.4?i reply_to_peer_id:flags.0?6 reply_from:flags.5?58 reply_media:flags.8?15 reply_to_top_id:flags.1?i quote_text:flags.6?s quote_entities:flags.7?V53 quote_offset:flags.10?i\ne5af939 messageReplyStoryHeader 114 peer:6 story_id:i\n83d60fc2 messageReplies 115 flags:# comments:flags.0?t replies:i replies_pts:i recent_repliers:flags.1?V6 channel_id:flags.0?l max_id:flags.2?i read_max_id:flags.3?i\n7780bcb4 groupCallDiscarded 116 id:l access_hash:l duration:i\ncdf8d3e3 groupCall 116 flags:# join_muted:flags.1?t can_change_join_muted:flags.2?t join_date_asc:flags.6?t schedule_start_subscribed:flags.8?t can_start_video:flags.9?t record_video_active:flags.11?t rtmp_stream:flags.12?t listeners_hidden:flags.13?t id:l access_hash:l participants_count:i title:flags.3?s stream_dc_id:flags.4?i record_start_date:flags.5?i schedule_date:flags.7?i unmuted_video_count:flags.10?i unmuted_video_limit:i version:i conference_from_call:flags.14?l\nd8aa840f inputGroupCall 117 id:l access_hash:l\neba636fe groupCallParticipant 118 flags:# muted:flags.0?t left:flags.1?t can_self_unmute:flags.2?t just_joined:flags.4?t versioned:flags.5?t min:flags.8?t muted_by_you:flags.9?t volume_by_admin:flags.10?t self:flags.12?t video_joined:flags.15?t peer:6 date:i active_date:flags.3?i source:i volume:flags.7?i about:flags.11?s raise_hand_rating:flags.13?l video:flags.6?121 presentation:flags.14?121\n3081ed9d inlineQueryPeerTypeSameBotPM 119\n833c0fac inlineQueryPeerTypePM 119\nd766c50a inlineQueryPeerTypeChat 119\n5ec4be43 inlineQueryPeerTypeMegagroup 119\n6334ee9a inlineQueryPeerTypeBroadcast 119\ne3b2d0c inlineQueryPeerTypeBotPM 119\ndcb118b7 groupCallParticipantVideoSourceGroup 120 semantics:s sources:Vi\n67753ac8 groupCallParticipantVideo 121 flags:# paused:flags.0?t endpoint:s source_groups:V120 audio_source:flags.1?i\nc3a2835f auth.loggedOut 122 flags:# future_auth_token:flags.0?b\na3d1cb80 reactionCount 123 flags:# chosen_order:flags.0?i reaction:129 count:i\na339f0b messageReactions 124 flags:# min:flags.0?t can_see_list:flags.2?t reactions_as_tags:flags.3?t results:V123 recent_reactions:flags.1?V125 top_reactors:flags.4?V154\n8c79b63c messagePeerReaction 125 flags:# big:flags.0?t unread:flags.1?t my:flags.2?t peer_id:6 date:i reaction:129\n7533a588 botMenuButtonDefault 126\n4258c205 botMenuButtonCommands 126\nc7b57ce6 botMenuButton 126 text:s url:s\n97e8bebe notificationSoundDefault 127\n6f0c34df notificationSoundNone 127\n830b9ae4 notificationSoundLocal 127 title:s data:s\nff6c8049 notificationSoundRingtone 127 id:l\n2de11aae emojiStatusEmpty 128\ne7ff068a emojiStatus 128 flags:# document_id:l until:flags.0?i\n7184603b emojiStatusCollectible 128 flags:# collectible_id:l document_id:l title:s slug:s pattern_document_id:l center_color:i edge_color:i pattern_color:i text_color:i until:flags.0?i\n7141dbf inputEmojiStatusCollectible 128 flags:# collectible_id:l until:flags.0?i\n79f5d419 reactionEmpty 129\n1b2286b8 reactionEmoji 129 emoticon:s\n8935fc73 reactionCustomEmoji 129 document_id:l\n523da4eb reactionPaid 129\nad628cc8 messageExtendedMediaPreview 130 flags:# w:flags.0?i h:flags.0?i thumb:flags.1?19 video_duration:flags.2?i\nee479c64 messageExtendedMedia 130 media:15\nfcfeb29c stickerKeyword 131 document_id:l keyword:Vs\nb4073647 username 132 flags:# editable:flags.0?t active:flags.1?t username:s\n23f109b forumTopicDeleted 133 id:i\n71701da9 forumTopic 133 flags:# my:flags.1?t closed:flags.2?t pinned:flags.3?t short:flags.5?t hidden:flags.6?t id:i date:i title:s icon_color:i icon_emoji_id:flags.0?l top_message:i read_inbox_max_id:i read_outbox_max_id:i unread_count:i unread_mentions_count:i unread_reactions_count:i from_id:6 notify_settings:22 draft:flags.4?60\n5f3b8a00 requestPeerTypeUser 134 flags:# bot:flags.0?B premium:flags.1?B\nc9f06e1b requestPeerTypeChat 134 flags:# creator:flags.0?t bot_participant:flags.5?t has_username:flags.3?B forum:flags.4?B user_admin_rights:flags.1?100 bot_admin_rights:flags.2?100\n339bef6c requestPeerTypeBroadcast 134 flags:# creator:flags.0?t has_username:flags.3?B user_admin_rights:flags.1?100 bot_admin_rights:flags.2?100\n751f3146 textWithEntities 135 text:s entities:V53\n5da674b7 botAppNotModified 136\n95fcd1d6 botApp 136 flags:# id:l access_hash:l short_name:s title:s description:s photo:18 document:flags.0?36 hash:l\n8d595cd6 storyViews 137 flags:# has_viewers:flags.1?t views_count:i forwards_count:flags.2?i reactions:flags.3?V123 reactions_count:flags.4?i recent_viewers:flags.0?Vl\n51e6ee4f storyItemDeleted 138 id:i\nffadc913 storyItemSkipped 138 flags:# close_friends:flags.8?t id:i date:i expire_date:i\n79b26a24 storyItem 138 flags:# pinned:flags.5?t public:flags.7?t close_friends:flags.8?t min:flags.9?t noforwards:flags.10?t edited:flags.11?t contacts:flags.12?t selected_contacts:flags.13?t out:flags.16?t id:i date:i from_id:flags.18?6 fwd_from:flags.17?144 expire_date:i caption:flags.0?s entities:flags.1?V53 media:15 media_areas:flags.14?V142 privacy:flags.2?V40 views:flags.3?137 sent_reaction:flags.15?129\n22c0f6d5 inputReplyToMessage 139 flags:# reply_to_msg_id:i top_msg_id:flags.0?i reply_to_peer_id:flags.1?0 quote_text:flags.2?s quote_entities:flags.3?V53 quote_offset:flags.4?i\n5881323a inputReplyToStory 139 peer:0 story_id:i\n712e27fd storiesStealthMode 140 flags:# active_until_date:flags.0?i cooldown_until_date:flags.1?i\ncfc9e002 mediaAreaCoordinates 141 flags:# x:d y:d w:d h:d rotation:d radius:flags.0?d\nbe82db9c mediaAreaVenue 142 coordinates:141 geo:20 title:s address:s provider:s venue_id:s venue_type:s\nb282217f inputMediaAreaVenue 142 coordinates:141 query_id:l result_id:s\ncad5452d mediaAreaGeoPoint 142 flags:# coordinates:141 geo:20 address:flags.0?151\n14455871 mediaAreaSuggestedReaction 142 flags:# dark:flags.0?t flipped:flags.1?t coordinates:141 reaction:129\n770416af mediaAreaChannelPost 142 coordinates:141 channel_id:l msg_id:i\n2271f2bf inputMediaAreaChannelPost 142 coordinates:141 channel:54 msg_id:i\n37381085 mediaAreaUrl 142 coordinates:141 url:s\n49a6549c mediaAreaWeather 142 coordinates:141 emoji:s temperature_c:d color:i\n5787686d mediaAreaStarGift 142 coordinates:141 slug:s\n4b3e14d6 boost 143 flags:# gift:flags.1?t giveaway:flags.2?t unclaimed:flags.3?t id:s user_id:flags.0?l giveaway_msg_id:flags.2?i date:i expires:i used_gift_slug:flags.4?s multiplier:flags.5?i stars:flags.6?l\nb826e150 storyFwdHeader 144 flags:# modified:flags.3?t from:flags.0?6 from_name:flags.1?s story_id:flags.2?i\nb54b5acf peerColor 145 flags:# color:flags.0?i background_emoji_id:flags.1?l\n697102b quickReply 146 shortcut_id:i shortcut:s top_message:i count:i\n896433b4 botBusinessConnection 147 flags:# can_reply:flags.0?t disabled:flags.1?t connection_id:s user_id:l dc_id:i date:i\nd62ff46a requestedPeerUser 148 flags:# user_id:l first_name:flags.0?s last_name:flags.0?s username:flags.1?s photo:flags.2?18\n7307544f requestedPeerChat 148 flags:# chat_id:l title:flags.0?s photo:flags.2?18\n8ba403e4 requestedPeerChannel 148 flags:# channel_id:l title:flags.0?s username:flags.1?s photo:flags.2?18\nc3ff71e7 broadcastRevenueBalances 149 flags:# withdrawal_enabled:flags.0?t current_balance:l available_balance:l overall_revenue:l\nb89bfccf factCheck 150 flags:# need_check:flags.0?t country:flags.1?s text:flags.1?135 hash:l\nde4c5d93 geoPointAddress 151 flags:# country_iso2:s state:flags.0?s city:flags.1?s street:flags.2?s\nfebe5491 starsRevenueStatus 152 flags:# withdrawal_enabled:flags.0?t current_balance:156 available_balance:156 overall_revenue:156 next_withdrawal_at:flags.1?i\n5416d58 starsSubscriptionPricing 153 period:i amount:l\n4ba3a95a messageReactor 154 flags:# top:flags.0?t my:flags.1?t anonymous:flags.2?t peer_id:flags.3?6 count:i\n2cc73c8 starGift 155 flags:# limited:flags.0?t sold_out:flags.1?t birthday:flags.2?t id:l sticker:36 stars:l availability_remains:flags.0?i availability_total:flags.0?i convert_stars:l first_sale_date:flags.1?i last_sale_date:flags.1?i upgrade_stars:flags.3?l\nf2fe7e4a starGiftUnique 155 flags:# id:l title:s slug:s num:i owner_id:flags.0?6 owner_name:flags.1?s owner_address:flags.2?s attributes:V157 availability_issued:i availability_total:i\nbbb6b4a3 starsAmount 156 amount:l nanos:i\n39d99013 starGiftAttributeModel 157 name:s document:36 rarity_permille:i\n13acff19 starGiftAttributePattern 157 name:s document:36 rarity_permille:i\n94271762 starGiftAttributeBackdrop 157 name:s center_color:i edge_color:i pattern_color:i text_color:i rarity_permille:i\ne0bff26c starGiftAttributeOriginalDetails 157 flags:# sender_id:flags.0?6 recipient_id:6 date:i message:flags.1?135";
return { SCHEMA_LAYER, SCHEMA_TYPES, SCHEMA_CTORS };
})();

// ---- src/mtproto/schema/reader.js ----
const __mod_src_mtproto_schema_reader = (() => {
// A schema-driven TL reader: it interprets the constructor table that scripts/gen-schema.mjs extracts from the layer-198
// schema (generated.js) and turns a server answer into plain objects: { _: "channel", id: 123n, access_hash: -5n, ... }.
// Field names are TL's own; int is a number, long a BigInt, double a number, int128/int256/bytes a Uint8Array (a view
// into the answer, no copy), string a string, Bool a boolean, a `true` flag field is `true` when its bit is set and
// absent otherwise, flags fields keep their numeric value.
//
// TL has no lengths: an unknown constructor id cannot be skipped, so it stops the read with a typed `protocol` error
// naming the id (`e.ctor`); so does a constructor of the wrong type, a bad Bool, a truncated answer or trailing bytes.
// Nothing is ever guessed.
//
// The table is parsed lazily: one split of the string at the first decode, each constructor's params on first use.
const { Reader, CTOR } = __mod_src_mtproto_tl;
const { toHex, fromHex } = __mod_src_mtproto_bytes;
const { gunzipHex } = __mod_src_mtproto_crypto;
const { mtError, fromRpcError } = __mod_src_mtproto_errors;
const { SCHEMA_LAYER, SCHEMA_TYPES, SCHEMA_CTORS } = __mod_src_mtproto_schema_generated;

const K_FLAGS = 1, K_INT = 2, K_LONG = 3, K_DOUBLE = 4, K_INT128 = 5, K_INT256 = 6, K_STRING = 7, K_BYTES = 8, K_BOOL = 9, K_TRUE = 10,
  K_OBJ = 11, K_VECTOR = 12, K_BARE_VECTOR = 13, K_BARE = 14;
const SIMPLE = { "#": K_FLAGS, i: K_INT, l: K_LONG, d: K_DOUBLE, q: K_INT128, Q: K_INT256, s: K_STRING, b: K_BYTES, B: K_BOOL, t: K_TRUE };
const MAX_DEPTH = 64; // nested objects per answer; real layer-198 answers stay far below
const hex8 = (id) => "0x" + (id >>> 0).toString(16).padStart(8, "0");
const protocol = (message, extra) => mtError("protocol", message, extra);

function parseCode(s) {
  const k = SIMPLE[s];
  if (k) return { k };
  const c = s.charCodeAt(0);
  if (c >= 48 && c <= 57) return { k: K_OBJ, t: Number(s) };
  if (s[0] === "V") return { k: K_VECTOR, of: parseCode(s.slice(1)) };
  if (s[0] === "v") return { k: K_BARE_VECTOR, of: parseCode(s.slice(1)) };
  if (s[0] === "%") return { k: K_BARE, name: s.slice(1) };
  throw new Error("bad schema type code " + s);
}

function compileLine(line) {
  const parts = line.split(" ");
  const params = [];
  for (let i = 3; i < parts.length; i++) {
    const p = parts[i];
    const colon = p.indexOf(":");
    const name = p.slice(0, colon);
    let code = p.slice(colon + 1);
    let flagField = null, bit = 0;
    const q = code.indexOf("?");
    if (q > 0) {
      const dot = code.indexOf(".");
      flagField = code.slice(0, dot);
      bit = Number(code.slice(dot + 1, q));
      code = code.slice(q + 1);
    }
    params.push({ name, flagField, bit, type: parseCode(code) });
  }
  return { id: parseInt(parts[0], 16) >>> 0, name: parts[1], type: Number(parts[2]), params };
}

/** A decoder over a schema `{ types: [typeName], ctors: "id name typeIndex params...\n..." }` (generated.js format). */
function createDecoder({ types, ctors, layer = null }) {
  let byId = null;   // id -> line (string) until compiled, then the compiled constructor
  let byName = null; // name -> compiled constructor (for bare types; built on first need)
  const typeIndex = new Map(types.map((t, i) => [t, i]));
  let depth = 0; // objects open right now (decode resets it), so a hostile answer cannot nest without bound
  const enter = () => { if (++depth > MAX_DEPTH) throw protocol("TL answer nested too deep (over " + MAX_DEPTH + " objects)"); };

  const index = () => {
    if (byId) return byId;
    byId = new Map();
    for (const line of ctors.split("\n")) {
      if (line) byId.set(parseInt(line.slice(0, line.indexOf(" ")), 16) >>> 0, line);
    }
    return byId;
  };
  const ctorById = (id) => {
    const m = index();
    const v = m.get(id);
    if (typeof v !== "string") return v;
    const c = compileLine(v);
    m.set(id, c);
    return c;
  };
  const ctorByName = (name) => {
    if (!byName) {
      byName = new Map();
      for (const id of index().keys()) { const c = ctorById(id); byName.set(c.name, c); }
    }
    const c = byName.get(name);
    if (!c) throw protocol("bare type " + name + " is not in the schema");
    return c;
  };

  function readBoxed(r, expected, skip) {
    const id = r.int();
    const c = ctorById(id);
    if (!c) {
      throw protocol("unknown TL constructor " + hex8(id) + (expected >= 0 ? " where a " + types[expected] + " belongs" : "") + " at byte " + (r.o - 4), { ctor: id });
    }
    if (expected >= 0 && c.type !== expected) {
      throw protocol("TL constructor " + c.name + " (" + hex8(id) + ", a " + types[c.type] + ") where a " + types[expected] + " belongs", { ctor: id });
    }
    if (skip && skip(c.name, types[c.type])) {
      walkBody(r, c);
      return { _: c.name, skipped: true };
    }
    return readBody(r, c, skip);
  }

  function readBody(r, c, skip) {
    enter();
    const o = { _: c.name };
    const ps = c.params;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.flagField !== null && ((o[p.flagField] >>> p.bit) & 1) === 0) continue;
      if (p.type.k === K_TRUE) { o[p.name] = true; continue; }
      o[p.name] = readValue(r, p.type, skip);
    }
    depth--;
    return o;
  }

  function readValue(r, t, skip) {
    switch (t.k) {
      case K_FLAGS: return r.int();
      case K_INT: return r.int32();
      case K_LONG: return r.long();
      case K_DOUBLE: return r.double();
      case K_INT128: return r.raw(16);
      case K_INT256: return r.raw(32);
      case K_STRING: return r.string();
      case K_BYTES: return r.bytes();
      case K_BOOL: return readBool(r);
      case K_TRUE: return true;
      case K_OBJ: return readBoxed(r, t.t, skip);
      case K_BARE: return readBody(r, ctorByName(t.name), skip);
      case K_VECTOR:
      case K_BARE_VECTOR: {
        const n = vectorCount(r, t.k === K_VECTOR);
        const out = new Array(n);
        for (let i = 0; i < n; i++) out[i] = readValue(r, t.of, skip);
        return out;
      }
      default: throw protocol("bad schema type");
    }
  }

  // The same walk without building anything (strings are not decoded, bytes not copied).
  function walkBoxed(r, expected) {
    const id = r.int();
    const c = ctorById(id);
    if (!c) throw protocol("unknown TL constructor " + hex8(id) + (expected >= 0 ? " where a " + types[expected] + " belongs" : "") + " at byte " + (r.o - 4), { ctor: id });
    if (expected >= 0 && c.type !== expected) throw protocol("TL constructor " + c.name + " (" + hex8(id) + ", a " + types[c.type] + ") where a " + types[expected] + " belongs", { ctor: id });
    walkBody(r, c);
  }
  function walkBody(r, c) {
    enter();
    const ps = c.params;
    let flags = null;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.flagField !== null && ((flags[p.flagField] >>> p.bit) & 1) === 0) continue;
      if (p.type.k === K_FLAGS) { (flags || (flags = {}))[p.name] = r.int(); continue; }
      walkValue(r, p.type);
    }
    depth--;
  }
  function walkValue(r, t) {
    switch (t.k) {
      case K_FLAGS: case K_INT: r.raw(4); return;
      case K_LONG: case K_DOUBLE: r.raw(8); return;
      case K_INT128: r.raw(16); return;
      case K_INT256: r.raw(32); return;
      case K_STRING: case K_BYTES: r.bytes(); return;
      case K_BOOL: readBool(r); return;
      case K_TRUE: return;
      case K_OBJ: walkBoxed(r, t.t); return;
      case K_BARE: walkBody(r, ctorByName(t.name)); return;
      case K_VECTOR: case K_BARE_VECTOR: {
        const n = vectorCount(r, t.k === K_VECTOR);
        const of = t.of;
        if (of.k === K_INT || of.k === K_FLAGS) { r.raw(4 * n); return; }
        if (of.k === K_LONG || of.k === K_DOUBLE) { r.raw(8 * n); return; }
        for (let i = 0; i < n; i++) walkValue(r, of);
        return;
      }
      default: throw protocol("bad schema type");
    }
  }

  function vectorCount(r, boxed) {
    if (boxed) {
      const id = r.int();
      if (id !== CTOR.vector) throw protocol("not a vector: " + hex8(id), { ctor: id });
    }
    const n = r.int32();
    if (n < 0 || n * 4 > r.b.length - r.o) throw protocol("bad vector length " + n);
    return n;
  }

  /**
   * Decodes one boxed object filling all of `u8`. Options: `expect` a type name the top-level object must belong to;
   * `skip(name, typeName)` true for a constructor that should be walked but not built (answers { _, skipped: true }).
   * A top-level gzip_packed is unpacked (natively); a top-level rpc_error answers { _: "rpc_error", error_code, error_message },
   * or is thrown as its typed error (errors.js) when `expect` is given. More than 64 nested objects is `protocol`.
   */
  function decode(u8, { expect, skip } = {}) {
    depth = 0;
    let r = new Reader(u8);
    let head = r.peekInt();
    if (head === CTOR.gzipPacked) {
      r.int();
      r = new Reader(fromHex(gunzipHex(toHex(r.bytes()))));
      head = r.peekInt();
    }
    let out;
    if (head === CTOR.rpcError) {
      r.int();
      out = { _: "rpc_error", error_code: r.int32(), error_message: r.string() };
      if (expect !== undefined) throw fromRpcError({ code: out.error_code, message: out.error_message });
    } else {
      let expected = -1;
      if (expect !== undefined) {
        expected = typeIndex.has(expect) ? typeIndex.get(expect) : -2;
        if (expected === -2) throw protocol("type " + expect + " is not in the schema");
      }
      out = readBoxed(r, expected, skip || null);
    }
    if (!r.atEnd()) throw protocol("trailing bytes after " + out._ + " (" + (r.b.length - r.o) + ")");
    return out;
  }

  return {
    decode,
    has: (id) => index().has(id >>> 0),
    stats: () => ({ layer, constructors: index().size, types: types.length, typeNames: types.slice(), has: (id) => index().has(id >>> 0), bytes: ctors.length }),
  };
}

let api = null;
const apiDecoder = () => api || (api = createDecoder({ types: SCHEMA_TYPES, ctors: SCHEMA_CTORS, layer: SCHEMA_LAYER }));

/** Decodes an answer with the layer-198 API schema (see createDecoder's decode for the options). */
const decode = (u8, opts) => apiDecoder().decode(u8, opts);
const schemaStats = () => apiDecoder().stats();

function readBool(r) {
  const c = r.int();
  if (c === CTOR.boolTrue) return true;
  if (c === CTOR.boolFalse) return false;
  throw protocol("not a Bool: " + hex8(c), { ctor: c });
}
return { createDecoder, decode, schemaStats };
})();

// ---- src/mtproto/srp.js ----
const __mod_src_mtproto_srp = (() => {
// The 2FA password check (SRP, "Two-factor authentication" in Telegram's docs) for the one algorithm Telegram uses,
// passwordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow:
//   SH(data, salt) = H(salt | data | salt)            H = SHA-256
//   PH1 = SH(SH(password, salt1), salt2)
//   PH2 = SH(pbkdf2(sha512, PH1, salt1, 100000), salt2)        x = PH2 as a big number
//   k = H(p | g)   v = g^x   A = g^a   u = H(A | B)   t = (B - k v) mod p   S = t^(a + u x)   K = H(S)
//   M1 = H(H(p) xor H(g) | H(salt1) | H(salt2) | A | B | K)
// Numbers are hashed as 256 big-endian bytes. Powers go to kino.crypto.modPow (native); PBKDF2 to kino.crypto.pbkdf2.
// The server's p and g pass the same checks as the DH exchange's (2048-bit safe prime, g generating the right subgroup),
// and B, A and t the range checks of the docs. The password is only an argument here: never kept, never logged.
const { toHex, fromHex, xor, random, bigFromBytes, bigToBytes, utf8 } = __mod_src_mtproto_bytes;
const { sha256, modPowHex } = __mod_src_mtproto_crypto;
const { checkDhPrime } = __mod_src_mtproto_authkey;
const { mtError } = __mod_src_mtproto_errors;

const SRP_ALGO = "passwordKdfAlgoSHA256SHA256PBKDF2HMACSHA512iter100000SHA256ModPow";
const SIZE = 256;
const protocol = (m) => mtError("protocol", m);
const evenHex = (n) => { const h = n.toString(16); return h.length % 2 ? "0" + h : h; };
const pow = (b, e, m) => BigInt("0x" + modPowHex(evenHex(b), evenHex(e), evenHex(m)));
const pad = (n) => bigToBytes(n, SIZE);
const bits = (n) => (n === 0n ? 0 : n.toString(2).length);

/** The docs' range check for g^a and g^b style values: 2^(2048-64) <= x <= p - 2^(2048-64). */
function goodModExp(x, p) {
  const diff = p - x;
  return diff > 0n && bits(diff) >= 2048 - 64 && bits(x) >= 2048 - 64 && Math.ceil(bits(x) / 8) <= SIZE;
}

/** PH2(password): the password's hash for the verifier, from the algorithm's two salts. */
function passwordHash(password, salt1, salt2) {
  const sh = (data, salt) => sha256(salt, data, salt);
  const ph1 = sh(sh(utf8(password), salt1), salt2);
  const k = kino.crypto.pbkdf2("sha512", toHex(ph1), toHex(salt1), 100000, 64, { keyEncoding: "hex", inputEncoding: "hex", outputEncoding: "hex" });
  return sh(fromHex(k), salt2);
}

/**
 * The InputCheckPasswordSRP for `password` against account.getPassword's answer: `{ algo: { _, salt1, salt2, g, p },
 * srpB, srpId }` (bytes as Uint8Array) -> `{ srpId, A, M1 }`. `aBytes` (256 bytes) is for the test vector only; in use
 * `a` is random. Throws `protocol` when the server's numbers fail a check (nothing is sent then).
 */
function srpCheck({ algo, srpB, srpId }, password, { aBytes } = {}) {
  if (!algo || algo._ !== SRP_ALGO) throw mtError("invalid_request", "unsupported 2FA password algorithm");
  if (typeof password !== "string" || !password) throw mtError("invalid_request", "the password is empty");
  if (!(algo.p instanceof Uint8Array) || algo.p.length !== SIZE) throw protocol("2FA p is not 2048 bits");
  if (!(srpB instanceof Uint8Array) || srpB.length === 0 || srpB.length > SIZE) throw protocol("2FA srp_B has a bad length");
  const p = bigFromBytes(algo.p);
  const g = Number(algo.g);
  checkDhPrime(p, g); // a 2048-bit safe prime with a good g, as for the auth key
  const B = bigFromBytes(srpB);
  if (!(B > 1n && B < p - 1n)) throw protocol("2FA srp_B out of range");
  const x = bigFromBytes(passwordHash(password, algo.salt1, algo.salt2));
  const pBytes = pad(p), gBytes = pad(BigInt(g)), bBytes = pad(B);
  const k = bigFromBytes(sha256(pBytes, gBytes));
  const v = pow(BigInt(g), x, p);
  const t = (((B - ((k * v) % p)) % p) + p) % p;
  if (!goodModExp(t, p)) throw protocol("2FA srp_B is not a good value");
  let a, A, u;
  for (let tries = 0; ; tries++) {
    if (tries >= 8) throw protocol("2FA: no good random value");
    a = bigFromBytes(aBytes && tries === 0 ? aBytes : random(SIZE));
    A = pow(BigInt(g), a, p);
    if (!goodModExp(A, p)) { if (aBytes) throw protocol("2FA: the given a is not good"); continue; }
    u = bigFromBytes(sha256(pad(A), bBytes));
    if (u > 0n) break;
  }
  const S = pow(t, a + u * x, p);
  const K = sha256(pad(S));
  const M1 = sha256(xor(sha256(pBytes), sha256(gBytes)), sha256(algo.salt1), sha256(algo.salt2), pad(A), bBytes, K);
  return { srpId, A: pad(A), M1 };
}
return { SRP_ALGO, passwordHash, srpCheck };
})();

// ---- src/mtproto/requests.js ----
const __mod_src_mtproto_requests = (() => {
// Serialized API methods for the discovery (layer 198), written field by field from their TL lines:
// updates.getState#edd4882a = updates.State
// updates.getDifference#19c2f763 flags:# pts:int pts_limit:flags.1?int pts_total_limit:flags.0?int date:int qts:int qts_limit:flags.2?int
// updates.getChannelDifference#3173d78 flags:# force:flags.0?true channel:InputChannel filter:ChannelMessagesFilter pts:int limit:int
// channels.getMessages#ad8c9a23 channel:InputChannel id:Vector<InputMessage>
// messages.getMessages#63c66506 id:Vector<InputMessage>
// inputChannel#f35aec28 channel_id:long access_hash:long   inputMessageID#a676a322 id:int   channelMessagesFilterEmpty#94d42ee7
const { Writer, CTOR } = __mod_src_mtproto_tl;

/**
 * The ONLY methods TelegramClient.call sends: the five the discovery needs. A new method for the plugin shell is added
 * here, in this one list, never per call site. Anything else (auth methods, the invoke and initConnection wrappers, gzip_packed,
 * msg_container, destructive methods) is refused by the client before a byte goes out.
 */
const BOT_CALLS = Object.freeze([
  0xedd4882a, // updates.getState
  0x19c2f763, // updates.getDifference
  0x03173d78, // updates.getChannelDifference
  0xad8c9a23, // channels.getMessages
  0x63c66506, // messages.getMessages
]);
/** Kept for the bot path's callers and tests: the bot's list. */
const ALLOWED_CALLS = BOT_CALLS;

/**
 * Account mode (0.3.0, the person's own Telegram account) is READ ONLY: a closed list of reading methods, nothing that
 * sends, edits, deletes, forwards, marks read, joins, leaves or changes anything. updates.* are not needed (the account's
 * chats are read by search, not by the update boxes).
 */
const ACCOUNT_CALLS = Object.freeze([
  0xa0f4cb4f, // messages.getDialogs: which chats there are
  0x29ee847a, // messages.search: a chat's videos (inputMessagesFilterVideo / inputMessagesFilterDocument, empty q)
  0x63c66506, // messages.getMessages: re-read a message (a fresh file_reference) in a basic group or Saved Messages
  0xad8c9a23, // channels.getMessages: the same in a channel or supergroup
]);
/** The account's login and logout methods: only through the client's own login calls, never through `call`. */
const ACCOUNT_AUTH_CALLS = Object.freeze([
  0xb7e085fe, // auth.exportLoginToken
  0x95ac5ce4, // auth.importLoginToken
  0x548a30f5, // account.getPassword
  0xd18b4d16, // auth.checkPassword
  0x3e72ba19, // auth.logOut
]);

const big = (v) => (typeof v === "bigint" ? v : BigInt(v));
const inputChannel = (w, channelId, accessHash) => w.int(0xf35aec28).long(big(channelId)).long(big(accessHash));
const inputMessageIds = (w, ids) => { w.int(CTOR.vector).int(ids.length); for (const id of ids) w.int(0xa676a322).int(id); return w; };

const getState = () => new Writer().int(0xedd4882a).done();

const getDifference = ({ pts, date, qts }) => new Writer().int(0x19c2f763).int(0).int(pts).int(date).int(qts).done();

const getChannelDifference = ({ channelId, accessHash, pts, limit = 100, force = false }) =>
  inputChannel(new Writer().int(0x03173d78).int(force ? 1 : 0), channelId, accessHash).int(0x94d42ee7).int(pts).int(limit).done();

const channelsGetMessages = ({ channelId, accessHash, ids }) =>
  inputMessageIds(inputChannel(new Writer().int(0xad8c9a23), channelId, accessHash), ids).done();

const messagesGetMessages = (ids) => inputMessageIds(new Writer().int(0x63c66506), ids).done();

// ---- account mode (read only) ----
// inputPeerSelf#7da07ec9  inputPeerChat#35a95cb9 chat_id:long  inputPeerChannel#27bcbbfc channel_id:long access_hash:long
// inputPeerUser#dde8a54c user_id:long access_hash:long
// inputPeerEmpty#7f3b18ea  inputMessagesFilterVideo#9fc00e65  inputMessagesFilterDocument#9eddf188
// messages.getDialogs#a0f4cb4f flags:# exclude_pinned:flags.0?true folder_id:flags.1?int offset_date:int offset_id:int
//   offset_peer:InputPeer limit:int hash:long
// messages.search#29ee847a flags:# peer:InputPeer q:string from_id:flags.0?InputPeer saved_peer_id:flags.2?InputPeer
//   saved_reaction:flags.3?Vector<Reaction> top_msg_id:flags.1?int filter:MessagesFilter min_date:int max_date:int
//   offset_id:int add_offset:int limit:int max_id:int min_id:int hash:long
const FILTER = Object.freeze({ video: 0x9fc00e65, document: 0x9eddf188 });

/** An InputPeer: { kind: "self" } | { kind: "chat", id } | { kind: "channel" | "user", id, accessHash } | { kind: "empty" }. */
function inputPeer(w, peer) {
  if (!peer || peer.kind === "empty") return w.int(0x7f3b18ea);
  if (peer.kind === "self") return w.int(0x7da07ec9);
  if (peer.kind === "chat") return w.int(0x35a95cb9).long(big(peer.id));
  if (peer.kind === "channel") return w.int(0x27bcbbfc).long(big(peer.id)).long(big(peer.accessHash));
  if (peer.kind === "user") return w.int(0xdde8a54c).long(big(peer.id)).long(big(peer.accessHash)); // a dialog cursor only
  throw new Error("unknown peer kind");
}

const getDialogs = ({ offsetDate = 0, offsetId = 0, offsetPeer = null, limit = 100 } = {}) =>
  inputPeer(new Writer().int(0xa0f4cb4f).int(0).int(offsetDate).int(offsetId), offsetPeer).int(limit).long(0n).done();

const searchMessages = ({ peer, filter, offsetId = 0, minId = 0, limit = 100 }) =>
  inputPeer(new Writer().int(0x29ee847a).int(0), peer).string("").int(filter).int(0).int(0).int(offsetId).int(0).int(limit).int(0).int(minId).long(0n).done();
return { BOT_CALLS, ALLOWED_CALLS, ACCOUNT_CALLS, ACCOUNT_AUTH_CALLS, getState, getDifference, getChannelDifference, channelsGetMessages, messagesGetMessages, FILTER, inputPeer, getDialogs, searchMessages };
})();

// ---- src/mtproto/keys.js ----
const __mod_src_mtproto_keys = (() => {
// Telegram's PUBLIC RSA server keys (from tg-public-keys.json, as used by the verified-live spike), keyed by the
// signed decimal fingerprint the server lists in resPQ. n is big-endian hex, e decimal.
const TELEGRAM_PUBLIC_KEYS = Object.freeze({
  "-3414540481677951611": {
    "n": "e8bb3305c0b52c6cf2afdf7637313489e63e05268e5badb601af417786472e5f93b85438968e20e6729a301c0afc121bf7151f834436f7fda680847a66bf64accec78ee21c0b316f0edafe2f41908da7bd1f4a5107638eeb67040ace472a14f90d9f7c2b7def99688ba3073adb5750bb02964902a359fe745d8170e36876d4fd8a5d41b2a76cbff9a13267eb9580b2d06d10357448d20d9da2191cb5d8c93982961cdfdeda629e37f1fb09a0722027696032fe61ed663db7a37f6f263d370f69db53a0dc0a1748bdaaff6209d5645485e6e001d1953255757e4b8e42813347b11da6ab500fd0ace7e6dfa3736199ccaf9397ed0745a427dcfa6cd67bcb1acff3",
    "e": 65537
  },
  "-5595554452916591101": {
    "n": "c8c11d635691fac091dd9489aedced2932aa8a0bcefef05fa800892d9b52ed03200865c9e97211cb2ee6c7ae96d3fb0e15aeffd66019b44a08a240cfdd2868a85e1f54d6fa5deaa041f6941ddf302690d61dc476385c2fa655142353cb4e4b59f6e5b6584db76fe8b1370263246c010c93d011014113ebdf987d093f9d37c2be48352d69a1683f8f6e6c2167983c761e3ab169fde5daaa12123fa1beab621e4da5935e9c198f82f35eae583a99386d8110ea6bd1abb0f568759f62694419ea5f69847c43462abef858b4cb5edc84e7b9226cd7bd7e183aa974a712c079dde85b9dc063b8a5c08e8f859c0ee5dcd824c7807f20153361a7f63cfd2a433a1be7f5",
    "e": 65537
  }
});
return { TELEGRAM_PUBLIC_KEYS };
})();

// ---- src/mtproto/client.js ----
const __mod_src_mtproto_client = (() => {
// The high-level client: one auth key per DC, a bot login once per home DC, DC migration, chunked file downloads and
// a JSON-safe state the plugin shell stores encrypted. Calls run one at a time (Kino calls `read` one at a time too).
const { toBase64, fromBase64, toHex, fromHex } = __mod_src_mtproto_bytes;
const { sha1 } = __mod_src_mtproto_crypto;
const { Transport } = __mod_src_mtproto_transport;
const { createAuthKey } = __mod_src_mtproto_authkey;
const { Session } = __mod_src_mtproto_session;
const { CTOR, LAYER, invokeWithLayer, initConnection, importBotAuthorization, exportAuthorization, importAuthorization, inputDocumentFileLocation, uploadGetFile, parseUploadFile, parseUploadFileHex, parseAuthorization, parseExportedAuthorization, exportLoginToken, importLoginToken, getPassword, checkPassword, logOut } = __mod_src_mtproto_tl;
const { decode } = __mod_src_mtproto_schema_reader;
const { srpCheck } = __mod_src_mtproto_srp;
const { mtError } = __mod_src_mtproto_errors;
const { BOT_CALLS, ACCOUNT_CALLS, ACCOUNT_AUTH_CALLS } = __mod_src_mtproto_requests;
const { describeError, isServerAnswer } = __mod_src_mtproto_errors;
const { big } = __mod_src_mtproto_big;
const { TELEGRAM_PUBLIC_KEYS } = __mod_src_mtproto_keys;

const CHUNK = 1048576;
const BUDGET_KEY = "mtproto.botLogins";
const BUDGET_MAX = 3;
const BUDGET_WINDOW_MS = 3600000;
const MIN_LEFT_MS = 1500;   // a request never starts with less time than this before its caller's deadline
const MARGIN_MS = 500;      // what a request leaves its caller after its own wait
const POLL_MS = 250;        // how often a call waiting for its turn checks its deadline
const MAX_AHEAD = 2;           // file chunks requested ahead and tracked (answered or still in flight), oldest dropped first:
                              // a hard count cap, so answered hex held is at most ~2 chunks whatever the timing
const MAX_AHEAD_BYTES = 5 << 20; // characters of ANSWERED read-ahead hex kept at once: ~2 chunks (a 1 MiB chunk is
                                 // ~2 MiB of hex), enough for the depth-2 read-ahead, so a runtime with no forced GC
                                 // never piles several more up
const MAX_IN_FLIGHT = 3;    // requests on one connection at once (the asked chunk included), on every path
const ROOM_WAIT_MS = 2500;  // the longest a chunk request waits for room before taking the oldest in flight as lost
const AHEAD_WAIT_MS = 8000; // the longest a read waits for a chunk requested ahead before asking for it again

/**
 * At most 3 bot logins per hour per device (Telegram answered FLOOD_WAIT_3121 after about ten in an hour). `store` is
 * kino.storage or anything with get/set of strings. Answers { allowed, remaining, retryAfterSeconds, record() };
 * record() notes a login now, or throws `login_budget` (with `seconds`) when none is left.
 */
function loginBudget(store, now = Date.now(), { key = BUDGET_KEY, max = BUDGET_MAX, what = "bot logins" } = {}) {
  let times = [];
  try {
    const v = JSON.parse(store.get(key) || "[]");
    if (Array.isArray(v)) times = v.filter((t) => typeof t === "number" && t <= now && now - t < BUDGET_WINDOW_MS).sort((a, b) => a - b);
  } catch { times = []; }
  const allowed = times.length < max;
  const retryAfterSeconds = allowed ? 0 : Math.ceil((times[0] + BUDGET_WINDOW_MS - now) / 1000);
  return {
    allowed,
    remaining: Math.max(0, max - times.length),
    retryAfterSeconds,
    record() {
      if (!allowed) throw mtError("login_budget", "too many " + what + " on this device in the last hour", { seconds: retryAfterSeconds });
      times.push(now);
      store.set(key, JSON.stringify(times));
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

// `call` sends only what is on the mode's allowlist (requests.js): the first 4 bytes of the body must be one of those
// method ids. Account mode is read only (ACCOUNT_CALLS); its login methods go only through the login calls below.
const ALLOWED = Object.freeze({ bot: new Set(BOT_CALLS), account: new Set(ACCOUNT_CALLS) });
const ACCOUNT_AUTH = new Set(ACCOUNT_AUTH_CALLS);
const methodId = (body) => (body[0] | (body[1] << 8) | (body[2] << 16) | (body[3] << 24)) >>> 0;
/** 2FA password attempts per device and hour (each one is a guess Telegram counts). */
const PASSWORD_BUDGET = Object.freeze({ key: "mtproto.passwordTries", max: 5, what: "password attempts" });

const DEFAULT_DEVICE = Object.freeze({ deviceModel: "Kino", systemVersion: "Android", appVersion: "1.0", systemLangCode: "en", langPack: "", langCode: "en" });

function checkRange(offset, limit) {
  if (!Number.isInteger(offset) || offset < 0 || offset % 4096 !== 0) throw mtError("invalid_request", "offset must be a non-negative multiple of 4096");
  if (!Number.isInteger(limit) || limit <= 0 || limit % 4096 !== 0 || CHUNK % limit !== 0) throw mtError("invalid_request", "limit must be a multiple of 4096 that divides 1 MiB");
  if (Math.floor(offset / CHUNK) !== Math.floor((offset + limit - 1) / CHUNK)) throw mtError("invalid_request", "a chunk may not cross a 1 MiB boundary");
}

class TelegramClient {
  /**
   * `apiId` is needed for initConnection on every new connection. `publicKeys` defaults to Telegram's (tests inject a
   * fake DC's). `store` is REQUIRED: kino.storage (or any get/set of strings) for the login budget, which keeps a
   * burst of bot logins from earning a FLOOD_WAIT of almost an hour; only a test may pass `store: false` to go without.
   * `wsOpen`/`urlFor` are for tests and other transports.
   */
  constructor({ apiId, publicKeys = TELEGRAM_PUBLIC_KEYS, device = {}, store, timeoutMs = 20000, now = () => Date.now(), log = () => {}, onUpdate = null, wsOpen, urlFor, abandonedMs, mode = "bot" } = {}) {
    if (mode !== "bot" && mode !== "account") throw mtError("invalid_request", "mode is bot or account");
    this.mode = mode;
    this.abandonedMs = abandonedMs;
    this.maxInflight = 0; // the most requests ever in flight on one connection at a send (tests)
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
    this.ahead = new Map(); // "<doc id>:<offset>" -> { dc, session, entry, limit }, in request order
    this.lastActiveAt = this.now(); // when a chunk request last ran: an idle runtime drops its caches (idleReset)
  }

  /** How many chunks requested ahead are kept (tests). */
  aheadCount() { return this.ahead.size; }
  /** Characters of answered read-ahead hex held right now (in-flight entries hold nothing yet). */
  aheadBytes() { let n = 0; for (const a of this.ahead.values()) if (a.entry.done && a.entry.result) n += a.entry.result.length; return n; }

  /**
   * Frees everything a finished play leaves behind when the runtime has been idle for `idleMs`: the read-ahead cache
   * (hex chunks) and the open connection (its transport buffers and session). The next read reconnects with the stored
   * key (no key exchange, no login). There is no "stream closed" hook from Kino, so this is where retention is bounded
   * between plays.
   */
  async idleReset(idleMs) {
    if ((this.ahead.size || this.conns.size) && this.now() - this.lastActiveAt >= idleMs) {
      this.log("idle " + Math.round((this.now() - this.lastActiveAt) / 1000) + " s: releasing caches and the connection");
      await this.reset();
    }
  }

  /**
   * Tears everything down after a failure the caller cannot place: every connection closes (the requests in flight on
   * them are dropped), the chunks read ahead are forgotten. The keys and logins stay: the next call reconnects with
   * them, with no key exchange and no new login.
   */
  reset() {
    return this.serial(async () => {
      for (const [k, a] of [...this.ahead]) this.dropAhead(k, a);
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
      session = new Session(transport, st, { now: this.now, timeoutMs: this.timeoutMs, onUpdate: this.onUpdate, log: this.log, ...(this.abandonedMs !== undefined ? { abandonedMs: this.abandonedMs } : {}) });
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
    for (const [k, a] of [...this.ahead]) if (a.dc === dc) this.dropAhead(k, a); // their answers die with the connection
    if (c) await c.transport.close();
  }

  /** Forgets one chunk read ahead: an answered one gives its result back, one in flight is abandoned. */
  dropAhead(k, a) {
    this.ahead.delete(k);
    if (a.entry.done) { if (a.entry.result) big.release(a.entry.result.length); a.entry.result = null; }
    else a.session.forget(a.entry);
  }

  /**
   * One API call on DC `dc`; the first call of each connection goes inside invokeWithLayer(initConnection(...)).
   * A closed socket is retried once on a new connection unless `retry` is false (the bot login retries by itself, so
   * that every attempt spends the budget). `hex` answers the result as a hex string (Session.call).
   */
  async invoke(dc, body, { retry = true, hex = false, deadline, trace, after, before } = {}) {
    const c = await this.conn(dc, deadline);
    const wrapped = c.inited ? body : invokeWithLayer(LAYER, initConnection({ apiId: this.apiId, ...this.device }, body));
    const wait = this.budget(deadline);
    try {
      // `before` makes room on the connection first (a chunk request waits for fewer than 3 in flight). When the room
      // does not come (requests that never answer), the connection goes: that takes them off the wire, and a new one
      // (stored key, no key exchange, no login) starts with nothing in flight. A failure while waiting (a socket that
      // closed) is handled below like any other.
      if (before && (await before(c)) === false) {
        this.log("no room on the connection: reconnecting");
        await this.drop(dc);
        return this.invoke(dc, body, { retry, hex, deadline, trace, after });
      }
      const started = this.now();
      const entry = await c.session.request(wrapped, { hex, trace });
      this.maxInflight = Math.max(this.maxInflight, c.session.maxInflight);
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
        return this.invoke(dc, body, { retry: false, hex, deadline, trace, before, after });
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
  /** Whether the home DC still needs a bot login (no key there yet, or a key not logged in). */
  needsLogin() {
    const home = this.homeDc ? this.dcs.get(this.homeDc) : null;
    return !(home && home.loggedIn);
  }

  botLogin({ apiId, apiHash, botToken, deadline }) {
    if (this.mode !== "bot") return Promise.reject(mtError("invalid_request", "botLogin is for bot mode"));
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
      const id = methodId(body);
      if (!ALLOWED[this.mode].has(id)) throw mtError("invalid_request", "method 0x" + id.toString(16).padStart(8, "0") + " is not allowed through call in " + this.mode + " mode (requests.js)");
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

  // ---- account mode: the QR login, the 2FA password and the logout ----

  /** One account login method on DC `dc` (ACCOUNT_AUTH_CALLS only, account mode only), decoded as `expect`. */
  async authInvoke(dc, body, expect, deadline) {
    if (this.mode !== "account") throw mtError("invalid_request", "account login methods are for account mode");
    const id = methodId(body);
    if (!ACCOUNT_AUTH.has(id)) throw mtError("invalid_request", "not an account login method");
    // Asking for a token or for the password's parameters again changes nothing: those two may retry a closed socket.
    const idempotent = id === 0xb7e085fe || id === 0x548a30f5;
    return decode(await this.invoke(dc, body, { retry: idempotent, deadline }), { expect });
  }

  /** An auth.authorization: the DC it came from is the home DC, logged in as that user. */
  loggedIn(dc, auth) {
    if (!auth || auth._ !== "auth.authorization" || !auth.user || auth.user._ !== "user") throw mtError("protocol", "unexpected answer to the account login");
    if (auth.user.bot) throw mtError("protocol", "the login answered a bot, not an account");
    const st = this.dcs.get(dc);
    st.loggedIn = true;
    st.userId = BigInt(auth.user.id);
    this.homeDc = dc;
    return { userId: st.userId };
  }

  /**
   * One round of the QR login on the home DC: auth.exportLoginToken. Answers { token (Uint8Array), expires (a unix
   * time of the server's) } while nobody has scanned it, or { userId } once the person accepted it in the official
   * Telegram app (auth.loginTokenSuccess; auth.loginTokenMigrateTo is followed: auth.importLoginToken on that DC, which
   * gets its own auth key, and becomes the home DC). A 2FA account throws `password_needed`: the home DC is then the
   * DC that asked, and checkPassword goes on there. A DC already logged in sends nothing and answers { reused, userId }.
   */
  qrLoginStep({ apiHash, deadline }) {
    if (this.mode !== "account") return Promise.reject(mtError("invalid_request", "account login methods are for account mode"));
    return this.serial(async () => {
      if (!this.homeDc) throw mtError("invalid_request", "connect first");
      if (!apiHash || !this.apiId) throw mtError("invalid_request", "apiId and apiHash are required");
      const home = this.dcs.get(this.homeDc);
      if (home && home.loggedIn) return { reused: true, userId: home.userId };
      let dc = this.homeDc;
      let res = await this.authInvoke(dc, exportLoginToken({ apiId: this.apiId, apiHash }), "auth.LoginToken", deadline);
      for (let hops = 0; res._ === "auth.loginTokenMigrateTo"; hops++) {
        if (hops >= 2) throw mtError("protocol", "too many login migrations");
        const target = Number(res.dc_id);
        if (!(target >= 1 && target <= 5)) throw mtError("protocol", "bad login DC " + target);
        dc = target;
        try {
          res = await this.authInvoke(dc, importLoginToken(res.token), "auth.LoginToken", deadline);
        } catch (e) {
          if (e && e.code === "password_needed") { const from = this.homeDc; this.homeDc = dc; if (from !== dc) await this.drop(from); }
          throw e;
        }
      }
      if (dc !== this.homeDc) await this.drop(this.homeDc); // the DC the token came from is not the account's: free its socket
      if (res._ === "auth.loginTokenSuccess") return this.loggedIn(dc, res.authorization);
      if (res._ === "auth.loginToken") return { token: res.token, expires: Number(res.expires) };
      throw mtError("protocol", "unexpected answer to auth.exportLoginToken");
    }, deadline);
  }

  /**
   * The 2FA step: account.getPassword, the SRP proof (srp.js), auth.checkPassword, on the home DC. `password` is only
   * used here: never kept, never logged. Each attempt spends one of PASSWORD_BUDGET; a stale SRP round (SRP_ID_INVALID)
   * is retried once with a fresh getPassword. A wrong password throws `password_invalid`.
   */
  checkPassword(password, { deadline } = {}) {
    if (this.mode !== "account") return Promise.reject(mtError("invalid_request", "account login methods are for account mode"));
    return this.serial(async () => {
      if (!this.homeDc) throw mtError("invalid_request", "connect first");
      const home = this.dcs.get(this.homeDc);
      if (home && home.loggedIn) return { reused: true, userId: home.userId };
      if (this.store) loginBudget(this.store, this.now(), PASSWORD_BUDGET).record();
      for (let attempt = 0; ; attempt++) {
        const pw = await this.authInvoke(this.homeDc, getPassword(), "account.Password", deadline);
        if (!pw.has_password || !pw.current_algo) throw mtError("protocol", "the account has no 2FA password");
        const proof = srpCheck({ algo: pw.current_algo, srpB: pw.srp_B, srpId: BigInt(pw.srp_id) }, password);
        try {
          return this.loggedIn(this.homeDc, await this.authInvoke(this.homeDc, checkPassword(proof), "auth.Authorization", deadline));
        } catch (e) {
          if (e && e.code === "password_invalid" && e.rpc === "SRP_ID_INVALID" && attempt === 0) continue;
          throw e;
        }
      }
    }, deadline);
  }

  /** auth.logOut on the home DC (best effort: the caller forgets the session whatever happens). */
  logOut({ deadline } = {}) {
    if (this.mode !== "account") return Promise.reject(mtError("invalid_request", "account login methods are for account mode"));
    return this.serial(async () => {
      if (!this.homeDc) return false;
      const home = this.dcs.get(this.homeDc);
      if (!home || !home.loggedIn) return false;
      await this.authInvoke(this.homeDc, logOut(), "auth.LoggedOut", deadline);
      home.loggedIn = false;
      return true;
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
   * With `{ thumbSize: "m" }` it reads the document's thumbnail of that type instead (thumb_size in the location):
   * nothing is read ahead for it and it never touches the file's chunks read ahead.
   */
  getFile(loc, offset, limit, { hex = false, deadline, trace, ahead = [], abandon = false, thumbSize = "" } = {}) {
    try {
      if (!loc || loc.id === undefined || loc.accessHash === undefined || !(loc.fileReference && typeof loc.fileReference.length === "number")) {
        throw mtError("invalid_request", "a location needs id, accessHash and fileReference");
      }
      if (typeof thumbSize !== "string" || !/^[A-Za-z0-9]{0,4}$/.test(thumbSize)) throw mtError("invalid_request", "a thumb size is 1 to 4 letters or digits");
      checkRange(offset, limit);
    } catch (e) {
      return Promise.reject(e);
    }
    if (thumbSize) { ahead = []; abandon = false; }
    const location = inputDocumentFileLocation({ id: BigInt(loc.id), accessHash: BigInt(loc.accessHash), fileReference: loc.fileReference, thumbSize });
    const body = uploadGetFile(location, offset, limit);
    // Chunks read ahead are kept by offset: a read asking a shorter limit there (the file's last chunk) uses them too.
    const doc = String(loc.id) + ":" + toHex(loc.fileReference) + ":" + (thumbSize ? "t" + thumbSize + ":" : "");
    const keyOf = (o) => doc + o;
    const dropAhead = (k, a) => this.dropAhead(k, a);
    return this.serial(async () => {
      if (!this.homeDc) throw mtError("invalid_request", "connect first");
      this.lastActiveAt = this.now();
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
          this.maxInflight = Math.max(this.maxInflight, c.session.maxInflight);
          this.ahead.set(k, { dc, session: c.session, entry, limit: a.limit });
          if (trace) trace.ahead++;
          // Bound both the count and the ANSWERED bytes held: drop the oldest until both fit.
          while (this.ahead.size > MAX_AHEAD || this.aheadBytes() > MAX_AHEAD_BYTES) {
            const oldest = this.ahead.entries().next().value;
            if (!oldest || oldest[0] === k) break; // never the one just added
            dropAhead(oldest[0], oldest[1]);
          }
        }
      };
      // A seek first: the chunks read ahead for this file that this read no longer wants are given up (their answers,
      // when they come, are dropped without being kept); this read's own chunk, if read ahead, is kept.
      if (abandon) {
        const wanted = new Set([keyOf(offset), ...ahead.map((a) => keyOf(a.offset))]);
        for (const [k, a] of [...this.ahead]) if (k.startsWith(doc) && !wanted.has(k)) dropAhead(k, a);
      }
      // A chunk requested ahead by an earlier read: its answer may already be here (or on its way).
      const pre = this.ahead.get(keyOf(offset));
      if (pre && pre.limit >= limit) {
        this.ahead.delete(keyOf(offset));
        const c = this.conns.get(pre.dc);
        if (c && c.session === pre.session && !c.transport.closed) {
          try {
            const until = Math.min(this.now() + AHEAD_WAIT_MS, deadline === undefined ? Infinity : deadline - MIN_LEFT_MS);
            let answer = await c.session.settle(pre.entry, until); // read-aheads are always asked as hex
            let file;
            try { file = parseUploadFileHex(answer); } finally { big.release(answer.length); answer = null; } // its last use
            if (file.ctor === CTOR.uploadFile) {
              if (trace) trace.pipe = "hit";
              if (ahead.length) { try { await sendAhead(c); } catch (e) { this.log("request ahead not sent (" + describeError(e) + ")"); } } // keep the pipe full
              const chunk = file.bytesHex.length > limit * 2 ? file.bytesHex.slice(0, limit * 2) : file.bytesHex;
              return hex ? chunk : fromHex(chunk);
            }
          } catch (e) {
            this.log("chunk read ahead not usable (" + describeError(e) + "): asking again");
            if (!isServerAnswer(e) || c.session.broken) await this.drop(pre.dc); // the stream is in an unknown state
          }
        } else {
          dropAhead(keyOf(offset), pre);
        }
      }
      // The asked chunk goes out only with room on the wire (fewer than MAX_IN_FLIGHT in flight), never waiting long.
      const makeRoom = (c) => c.session.drainBelow(MAX_IN_FLIGHT, Math.min(this.now() + ROOM_WAIT_MS, deadline === undefined ? Infinity : deadline - 3 * MIN_LEFT_MS));
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          await this.authorize(dc, deadline);
          let answer = await this.invoke(dc, body, { hex, deadline, trace, before: makeRoom, after: attempt === 0 && ahead.length ? sendAhead : undefined });
          const tp = trace ? Date.now() : 0;
          const file = hex ? parseUploadFileHex(answer) : parseUploadFile(answer);
          if (hex) big.release(answer.length); // its last use: the answer below is a slice of it
          answer = null;
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
return { CHUNK, loginBudget, PASSWORD_BUDGET, TelegramClient };
})();

// ---- src/mtproto/discovery.js ----
const __mod_src_mtproto_discovery = (() => {
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
const { mtError } = __mod_src_mtproto_errors;
const { toHex } = __mod_src_mtproto_bytes;
const { decode } = __mod_src_mtproto_schema_reader;
const { getState, getDifference, getChannelDifference, channelsGetMessages, messagesGetMessages } = __mod_src_mtproto_requests;

const STATE_KEY = "tg.discovery";
const VERSION = 1;
const CHANNEL_LIMIT = 100;
const BATCH = 100;
const DEFAULT_BUDGET_BYTES = 160000;
const MAX_TITLE = 200, MAX_CAPTION = 200, MAX_CHAT_TITLE = 100, MAX_TEXT = 1000;
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
// Types inside messages/chats/users the index never reads. PhotoSize is read: a document's thumbs give the card picture
// (thumbOf; a few small objects per video, the stripped/cached bytes among them at most a few KB).
const SKIP_TYPES = new Set([
  "MessageEntity", "ReplyMarkup", "MessageReactions", "MessageReplies", "MessageFwdHeader", "MessageReplyHeader", "MessageAction",
  "RestrictionReason", "FactCheck", "VideoSize", "Photo", "ChatPhoto", "UserProfilePhoto", "UserStatus", "PeerColor",
  "EmojiStatus", "ChatAdminRights", "ChatBannedRights", "Username", "ForumTopic", "PeerNotifySettings", "DraftMessage", "EncryptedMessage",
]);
const skip = (name, type) => (type === "Update" ? !KEEP_UPDATES.has(name) : SKIP_TYPES.has(type));
/** What an answer's decode may walk without building (shared with the account library). */
const skipForIndex = skip;
const VIDEO_MIMES = new Set(["application/x-matroska", "application/mp4", "application/x-mpegurl", "application/vnd.apple.mpegurl"]);

/** The Bot API style chat id of a Peer: "-100<id>" for a channel, "-<id>" for a basic group, "<id>" for a user. */
function chatIdOf(peer) {
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

const THUMB_MAX_BYTES = 262144; // Kino's cap for a picture a plugin serves (contract images.maxBytes)
const THUMB_ORDER = ["m", "x", "s"];
/**
 * The document's best small thumbnail to show on a card, as { t: type letter, s: bytes, w, h }, or null: a downloadable
 * photoSize (or the largest step of a progressive one) of at most 256 KB, "m" (320 px) first, then "x", then "s", then
 * the largest other one. Stripped, cached and path sizes are never picked (their bytes are inline, not downloadable).
 */
function thumbOf(doc) {
  const list = [];
  for (const t of (doc && doc.thumbs) || []) {
    if (!t || typeof t.type !== "string" || !/^[A-Za-z0-9]{1,4}$/.test(t.type)) continue;
    let size = null;
    if (t._ === "photoSize") size = Number(t.size);
    else if (t._ === "photoSizeProgressive" && Array.isArray(t.sizes) && t.sizes.length) size = Math.max(...t.sizes.map(Number));
    if (!Number.isSafeInteger(size) || size < 1 || size > THUMB_MAX_BYTES) continue;
    list.push({ t: t.type, s: size, w: Number(t.w) || 0, h: Number(t.h) || 0 });
  }
  if (!list.length) return null;
  for (const type of THUMB_ORDER) { const hit = list.find((x) => x.t === type); if (hit) return hit; }
  return list.sort((a, b) => b.s - a.s)[0];
}

/**
 * A Message as an IndexEntry when it carries a video document, else null. Text is capped to keep the saved index
 * small: title and caption (its first non-empty line) at most 200 characters, chatTitle at most 100.
 */
function videoEntry(msg, chatTitle = "") {
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
  const thumb = thumbOf(doc);
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
    // For the shell's name parsing (a TMDB marker may sit on any line of the caption) and card picture.
    ...(fileName ? { fileName: cap(fileName, MAX_TITLE) } : {}),
    ...(caption && caption.trim() !== firstLine(caption) ? { text: cap(caption, MAX_TEXT) } : {}),
    ...(thumb ? { thumb } : {}),
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
function createDiscovery({ client, store, budgetBytes = DEFAULT_BUDGET_BYTES, persistEntries = true, now = () => Date.now(), log = () => {} }) {
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
        else {
          // `seen`: the order in which the bot met its channels (1, 2, ...), for the shell's stable channel slots.
          const seen = Object.values(st.channels).reduce((m, x) => Math.max(m, Number.isInteger(x.seen) ? x.seen : 0), 0) + 1;
          st.channels[id] = { accessHash: String(c.access_hash), title, pts: 1, seen };
        }
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
                log("a channel was dropped: " + (e && e.code));
                dropChannel(st, index, id);
              } else if (ISOLATED.has(e.code)) {
                // The failed page was not applied, so the channel's pts is still the last one fully read.
                log("a channel was skipped: " + (e && e.code));
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
return { skipForIndex, chatIdOf, thumbOf, videoEntry, createDiscovery };
})();

// ---- src/mtproto/account-library.js ----
const __mod_src_mtproto_account_library = (() => {
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
const { mtError } = __mod_src_mtproto_errors;
const { decode } = __mod_src_mtproto_schema_reader;
const { videoEntry, chatIdOf, skipForIndex } = __mod_src_mtproto_discovery;
const { getDialogs, searchMessages, channelsGetMessages, messagesGetMessages, FILTER } = __mod_src_mtproto_requests;

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
function createAccountDiscovery({ client, store, now = () => Date.now(), log = () => {} }) {
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

const ACCOUNT_STATE_KEY = STATE_KEY;
return { createAccountDiscovery, ACCOUNT_STATE_KEY };
})();

// ---- src/shell/store.js ----
const __mod_src_shell_store = (() => {
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
const KEYS = Object.freeze({ budget: "mtproto.botLogins", session: "tg.session", discovery: "tg.discovery", shell: "tg.shell", login: "tg.login", usession: "tg.usession", adiscovery: "tg.adiscovery", qr: "tg.qr", accountLogins: "mtproto.accountLogins" });

function readJson(key) {
  let raw = null;
  try { raw = kino.storage.get(key); } catch { return null; }
  if (raw === null || raw === undefined) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

/** Writes `value` as JSON; false (never a throw) when the store refuses it. */
function writeJson(key, value) {
  try { kino.storage.set(key, JSON.stringify(value)); return true; } catch (e) { kino.log("storage write refused: " + key + " " + (e && e.code)); return false; }
}

function remove(key) {
  try { kino.storage.remove(key); } catch { /* nothing to remove */ }
}

/** kino.storage as the client's and the discovery's get/set store. */
const kinoStore = Object.freeze({
  get: (k) => kino.storage.get(k),
  set: (k, v) => kino.storage.set(k, v),
  remove: (k) => kino.storage.remove(k),
  keys: () => kino.storage.keys(),
});
return { KEYS, readJson, writeJson, remove, kinoStore };
})();

// ---- src/shell/live.js ----
const __mod_src_shell_live = (() => {
// One live Telegram client per plugin runtime, reused by every call (Home, refresh, each read): the auth key and the
// bot login come from tg.session (when it was made on this device, see the device mark), so a new runtime connects
// with the stored key, without a key exchange or a login.
// The bot logs in once per device (the client's budget allows 3 an hour); a login Telegram refused is not tried again
// until the settings change.
const { TelegramClient } = __mod_src_mtproto_client;
const { TELEGRAM_PUBLIC_KEYS } = __mod_src_mtproto_keys;
const { createDiscovery } = __mod_src_mtproto_discovery;
const { createAccountDiscovery, ACCOUNT_STATE_KEY } = __mod_src_mtproto_account_library;
const { KEYS, readJson, writeJson, remove, kinoStore } = __mod_src_shell_store;
const { shellError } = __mod_src_shell_errors;

// The fake Telegram of the tests has its own RSA key: testkit/plugin-harness.mjs swaps exactly this line in the bundle.
const PUBLIC_KEYS = TELEGRAM_PUBLIC_KEYS;
const FIRST_DC = 2;

/**
 * The person's settings (trimmed). `mode` is "bot" (the default, a bot in the person's channels) or "account" (the
 * person's own account, read only, signed in with a QR). `complete` when the mode has what it needs. Never logged,
 * never stored.
 */
function credentials() {
  const get = (k) => String(kino.config.get(k) ?? "").trim();
  const mode = kino.config.get("access") === "account" ? "account" : "bot";
  const apiId = get("api_id"), apiHash = get("api_hash"), botToken = mode === "bot" ? get("bot_token") : "";
  return { mode, apiId, apiHash, botToken, complete: !!(apiId && apiHash && (mode === "account" || botToken)) };
}

const digest = (text) => kino.crypto.hash("sha256", text).slice(0, 16);
/** Which bot (and api_id) a session belongs to; in account mode, which api_id (the account is learned at the login). */
const sessionFp = (c) => (c.mode === "account" ? digest("account\n" + c.apiId) : digest("session\n" + c.apiId + "\n" + c.botToken));
/** Which exact settings a refused login was made with (api_hash included). */
const loginFp = (c) => (c.mode === "account" ? digest("alogin\n" + c.apiId + "\n" + c.apiHash) : digest("login\n" + c.apiId + "\n" + c.apiHash + "\n" + c.botToken));
/** Where the mode's session lives: the bot's and the account's are separate keys, never mixed. */
const sessionStoreKey = (c) => (c.mode === "account" ? KEYS.usession : KEYS.session);

let live = null;       // { fp, device, client, discovery, saved, ready }
let connecting = null; // the one connect in flight: every caller of this runtime waits on it
/** The last connect's timing, for the refresh line: { connect, loginms, login: "new" | "reused" }. */
let lastOpen = null;
const lastOpenTiming = () => lastOpen;

// ---- the device mark ----
//
// tg.session sits in kino.storage, which a password-protected backup carries to another device; kino.catalog never
// travels. So the install's id lives in both: in tg.session, and in one row of the catalog that only this device has.
// A stored session is used only when the two match. A restored copy (onto a fresh device, onto a device with its own
// catalog, or taken before anything was indexed) never matches, so its auth key, which belongs to the other device,
// is dropped and this device opens its own (one login, budgeted). What this does NOT cover: a Kino that would one day
// carry the catalog file in a backup too (the mark would then travel with the key), and a catalog file reset by Kino
// as damaged (the mark goes with it: a new session, which is only a cost).
const DEVICE_ROW = "~device";

/** This install's id from the catalog's mark, or null when there is none. */
async function deviceMark() {
  const [row] = await kino.catalog.get([DEVICE_ROW]);
  return row && row.data && typeof row.data.device === "string" && /^[0-9a-f]{32}$/.test(row.data.device) ? row.data.device : null;
}

/** Writes the mark (a new random id unless one is given) and answers it. */
async function markDevice(id = kino.crypto.randomBytes(16)) {
  await kino.catalog.upsert([{ id: DEVICE_ROW, title: "~", sort: 0, data: { device: id } }]);
  return id;
}

/**
 * Makes sure what kino.storage holds was made on this device. A stored session from elsewhere (no mark, or another
 * one) is dropped together with what came with it from the same backup, the update state and the shell state, and
 * this device's catalog is rebuilt from scratch under a new mark: the settings stay. Answers this device's mark.
 */
let checking = null; // one check at a time: two at once could each write a different mark
function checkDevice() {
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
function saveSession() {
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
function loginBlocked(c) {
  const rec = readJson(KEYS.login);
  if (!rec || rec.fp !== loginFp(c)) return null;
  if (rec.kind === "token" || rec.kind === "api_id") return shellError(rec.kind, "login refused before");
  if (rec.kind === "closed") return null; // an account session Telegram ended: only a reason to show, the QR login clears it
  if ((rec.kind === "flood" || rec.kind === "budget") && Number(rec.until) > Date.now()) {
    return shellError(rec.kind, "login must wait", { seconds: Math.max(1, Math.ceil((Number(rec.until) - Date.now()) / 1000)) });
  }
  return null;
}
function recordLoginFailure(c, e) {
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
function connect(c, shell, { deadline, noLogin = false, loginFlow = false } = {}) {
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
async function withSession(c, shell, fn, { deadline } = {}) {
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
async function idleReset(idleMs) {
  if (live && live.client) await live.client.idleReset(idleMs);
}

/** Closes the live client (a settings change, a forget). */
async function close() {
  const l = live;
  live = null;
  if (l) { try { await l.client.close(); } catch { /* already closed */ } }
}

/**
 * An account session Telegram ended (SESSION_REVOKED, AUTH_KEY_UNREGISTERED: the person closed it in Settings ▸
 * Devices): the key is dropped and the reason kept, and nothing logs in again by itself. Never a loop.
 */
async function sessionClosed(c) {
  kino.log("account session ended by Telegram: sign in again");
  await close();
  remove(KEYS.usession);
  writeJson(KEYS.login, { fp: loginFp(c), kind: "closed" });
}

/** Forgets the session of this device (the login budget stays: it protects the bot from a flood wait). */
async function forgetSession() {
  await close();
  remove(KEYS.session);
  remove(KEYS.usession);
}

/** The live client of this runtime when it is open for these settings (the account's login flow). */
const liveFor = (c) => (live && live.fp === sessionFp(c) && live.mode === c.mode ? live : null);
/** The account just logged in (the QR or the password): the live client is ready, the session saved. */
function markLoggedIn() { if (live) { live.ready = true; saveSession(); } }

const hasStoredLogin = (c) => {
  const s = readJson(sessionStoreKey(c));
  if (!s || s.fp !== sessionFp(c)) return false;
  const state = openState(s, c);
  if (!state) return false;
  const home = state.dcs[String(state.homeDc)];
  return !!(home && home.loggedIn);
};
return { credentials, sessionFp, loginFp, sessionStoreKey, lastOpenTiming, DEVICE_ROW, deviceMark, markDevice, checkDevice, saveSession, loginBlocked, recordLoginFailure, connect, withSession, idleReset, close, sessionClosed, forgetSession, liveFor, markLoggedIn, hasStoredLogin };
})();

// ---- src/shell/timing.js ----
const __mod_src_shell_timing = (() => {
// Timing lines for the device logs (Kino's "Registro" and logcat KinoPlugin/<id>): one line per read and per refresh,
// numbers and short codes only. Never a setting, a key, an id, a file reference or any data. Set TIMING to false to
// switch them off (the core then gets no trace and measures nothing).
const { describeError } = __mod_src_mtproto_errors;
const TIMING = true;

/** A read's trace: every field is a duration in ms or a count; the core adds to it (src/mtproto/*). */
const newTrace = () => (TIMING ? { start: Date.now(), queue: 0, sentAt: 0, firstFrameAt: 0, wsrecv: 0, frames: 0, frameBytes: 0, tohex: 0, ctr: 0, ige: 0, mac: 0, gunzip: 0, parse: 0, getfile: 0, b64: 0, tries: 0, pipe: "miss", ahead: 0, recov: 0 } : undefined);

const n = (v) => (Number.isFinite(v) ? Math.round(v) : 0);

/** `read off=<offset> len=<asked> bytes=<answered> total=<ms> queue=… net=… wsrecv=… frames=… framebytes=… tohex=… ctr=… ige=… mac=… gunzip=… parse=… getfile=… b64=… tries=… pipe=hit|miss ahead=<n>` */
function logRead(trace, { offset, length, bytes }) {
  if (!trace) return;
  const net = trace.sentAt && trace.firstFrameAt ? trace.firstFrameAt - trace.sentAt : 0;
  kino.log(`read off=${n(offset)} len=${n(length)} bytes=${n(bytes)} total=${n(Date.now() - trace.start)} queue=${n(trace.queue)} net=${n(net)} wsrecv=${n(trace.wsrecv)} frames=${n(trace.frames)} framebytes=${n(trace.frameBytes)} tohex=${n(trace.tohex)} ctr=${n(trace.ctr)} ige=${n(trace.ige)} mac=${n(trace.mac)} gunzip=${n(trace.gunzip)} parse=${n(trace.parse)} getfile=${n(trace.getfile)} b64=${n(trace.b64)} tries=${n(trace.tries)} pipe=${trace.pipe === "hit" ? "hit" : "miss"} ahead=${n(trace.ahead)} recov=${n(trace.recov)}`);
}

const word = (v, re) => (typeof v === "string" && re.test(v) ? v : "-");

/** One warn line per failed read (always on, also with TIMING off): the typed code and Telegram's RPC name, or what was thrown. */
function logReadFailure(e, { offset, length, started }) {
  const what = e && typeof e === "object" && e.detail !== undefined ? e.detail : e;
  console.warn(`read failed off=${n(offset)} len=${n(length)} ms=${n(Date.now() - started)} ${describeError(what)}`);
}

/** One warn line when a read tears the connection down and tries once more. */
function logRecovery(e, { offset, length, started }) {
  console.warn(`read recovering off=${n(offset)} len=${n(length)} ms=${n(Date.now() - started)} ${describeError(e)}`);
}

/** `refresh total=… connect=… login=<new|reused|-> loginms=… pages=… disc=… upsert=… purge=… added=… incomplete=0|1 result=<ok|code>` */
function logRefresh(r) {
  if (!TIMING) return;
  kino.log(`refresh total=${n(r.total)} connect=${n(r.connect)} login=${word(r.login, /^(new|reused|-)$/)} loginms=${n(r.loginms)} pages=${n(r.pages)} disc=${n(r.disc)} upsert=${n(r.upsert)} purge=${n(r.purge)} added=${n(r.added)} incomplete=${r.incomplete ? 1 : 0} result=${word(r.result, /^[a-z_]{1,40}$/)}`);
}
return { TIMING, newTrace, logRead, logReadFailure, logRecovery, logRefresh };
})();

// ---- src/shell/clean.js ----
const __mod_src_shell_clean = (() => {
// Text from Telegram (file names, captions, channel titles) is the sender's: it may carry control characters or
// Unicode direction overrides that would make a title read as something else on screen. They are removed before the
// text reaches a catalog row or anything Kino shows: C0 and C1 controls, the bidi embeddings/overrides U+202A-U+202E,
// the isolates U+2066-U+2069 and the marks U+200E/U+200F.
const HOSTILE = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/** `s` without control or direction characters (each becomes a space; runs of spaces are folded by the callers). */
const cleanText = (s) => String(s ?? "").replace(HOSTILE, " ");

/** Cleaned, whitespace folded, trimmed and cut to `n` characters without splitting a surrogate pair. */
function clip(s, n) {
  let x = cleanText(s).replace(/\s+/g, " ").trim().slice(0, n);
  if (/[\uD800-\uDBFF]$/.test(x)) x = x.slice(0, -1);
  return x;
}
return { cleanText, clip };
})();

// ---- src/shell/enrich.js ----
const __mod_src_shell_enrich = (() => {
// Names and TMDB: what a video's file name (or caption) says it is, and what Kino's own TMDB access (kino.meta) knows
// about it. Pure pieces here (parseName, markerOf, queryOf, applyMeta, posterOf, displayTitle, needsLookup) plus the
// bounded pass the refresh runs (enrichStep): a few lookups per refresh, never from search or read, the answer kept in
// the catalog row's `data` (a hit for good, a miss for MISS_TTL_MS), so a family video is not asked again each time.

const { clip } = __mod_src_shell_clean;

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
const TMDB_IMAGE = /^https:\/\/image\.tmdb\.org\/t\/p\/[a-z0-9]{1,12}(\/[A-Za-z0-9_-]{1,80}\.(?:jpg|jpeg|png|webp))$/;
const MAX_ID = 2147483647;
const MISS_TTL_MS = 14 * 86400000;    // a title TMDB did not know is asked again after two weeks
const WALK_EVERY_MS = 86400000;              // a finished walk starts over at most once a day (only expired misses are asked)
const MAX_LOOKUPS = 4;                       // kino.meta calls per pass (Kino allows 30 a minute)
const ENRICH_MS = 6000;                      // no lookup starts once the pass has run this long
const META_MAX_MS = 8000;                    // what one kino.meta call may take: contract kinoMeta.timeoutMs (8 s; the 6 s of
                                             // timeoutsMs.meta / kinoMeta.providerTimeoutMs are the meta EXPORT's, not this call's)
const CALL_SAFE_MS = 18000;                  // a lookup must end before this, from the start of the call (Home has 20 s)
const SCAN_PAGES = 5;                        // catalog pages (100 rows) looked at per pass
const PAGE = 100;

const VIDEO_EXT = /\.(mp4|mkv|avi|mov|webm|m4v|ts|wmv|flv|mpg|mpeg|3gp|ogv|m2ts|mts)$/i;
const GENERIC = /^(?:vid|img|pxl|mov|mvi|dsc|gopr|video|telegram|file|record|rec|whatsapp video)[\s_-]?\d|^\d+$|^video$|^(?:untitled|sin título|sin titulo)$/i;

// ---- markers ----

const MARKER = /(?:themoviedb\.org\/(?:[a-z]{2}(?:-[A-Za-z]{2})?\/)?(movie|tv)\/(\d{1,11})|(?<![A-Za-z0-9])tmdb(?:id)?(?:\s*[-=:]\s*|(?=\d))(?:(movie|tv)\s*[-=:/]\s*)?(\d{1,11}))(?!\d)/i;

/** The TMDB id a text names ({tmdb-603}, [tmdbid=603], tmdb:603, tmdbid603, a themoviedb.org URL), or null. */
function markerOf(text) {
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
function parseName(fileName, caption) {
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
function queryOf(n, byTitle) {
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
const keyOf = (q) => (q ? (q.ids ? q.type + "|" + q.ids.tmdb : q.type + "|" + q.title.toLowerCase() + "|" + (q.year || "")) : "");

const pathOf = (url) => { const m = typeof url === "string" ? TMDB_IMAGE.exec(url) : null; return m ? m[1] : null; };


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
function applyMeta(row, m, now = Date.now()) {
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
function needsLookup(row, now = Date.now()) {
  const tm = row && row.data && row.data.tm;
  if (!tm) return true;
  return tm.miss === true && now - (Number(tm.at) || 0) > MISS_TTL_MS;
}

/** TMDB's poster for the row (w342), or null. */
function posterOf(row) {
  const tm = row && row.data && row.data.tm;
  return tm && tm.p ? POSTER_BASE + tm.p : null;
}
function backdropOf(row) {
  const tm = row && row.data && row.data.tm;
  return tm && tm.b ? BACKDROP_BASE + tm.b : null;
}

const two = (n) => String(n).padStart(2, "0");
/** What a card says: TMDB's title, else the normalised name, else the catalog title; an episode keeps its SxxExx. */
function displayTitle(data, fallback) {
  const d = data || {};
  const n = d.n || null;
  const name = (d.tm && d.tm.t) || (n && n.title) || fallback || "Video";
  return n && n.season !== undefined && n.episode !== undefined ? name + " S" + two(n.season) + "E" + two(n.episode) : name;
}

/** The parsed name and its lookup key for a fresh row (rowOf), from the entry's file name and caption. */
function nameOf(fileName, caption, fallbackTitle) {
  const n = parseName(fileName || fallbackTitle || "", caption || "");
  return { n, pk: keyOf(queryOf(n, true)), title: searchTitle([n.title, fallbackTitle]) };
}

/** The new row keeps the old one's answer when it would ask the same thing (a discovery edit, a refetched reference). */
function carry(old, row) {
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
async function enrichStep(shell, started, { skip = () => false } = {}) {
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

/** TMDB lookups on (the default) or off: the "Buscar pósters en TMDB" setting. Off means no kino.meta call at all. */
const tmdbOn = () => kino.config.get("tmdb") !== false;

/** The row as shown: without TMDB's answer (`data.tm`) when TMDB is off, so the Telegram thumbnail and name show. */
const viewOf = (row) => (tmdbOn() || !row || !row.data || !row.data.tm ? row : { ...row, data: { ...row.data, tm: undefined } });
return { MISS_TTL_MS, markerOf, parseName, queryOf, keyOf, applyMeta, needsLookup, posterOf, backdropOf, displayTitle, nameOf, carry, enrichStep, tmdbOn, viewOf };
})();

// ---- src/shell/library.js ----
const __mod_src_shell_library = (() => {
// The video library: Telegram's channels through the discovery, kept in kino.catalog (one row per video), and the
// rows, pages and searches Kino shows, read from the catalog only.
//
// Channels: the bot learns every channel it administers (account mode: every chat of the account where a video exists);
// they get the 6 slots in the order they were first seen, and keep them (see assignSlots). The slot's toggle in the
// settings (which syncs) says whether that channel is shown and indexed. A channel that is off is never scanned and has
// no rows: turning it off removes its rows from the catalog (by id, in steps); turning it on reads it again from its
// start. Slot 1's toggle starts on, the others off (the manifest's defaults). Six, not more: Kino's settings contract
// allows 12 valued settings and 16 others per plugin, and account mode needed two of the old eight toggles' places.
//
// Refresh: from Home (at most every 5 minutes, sooner while a pass is unfinished or a toggle changed) and from the
// "Actualizar ahora" action. Never from search. A refresh that fails keeps the old rows and stores the error.
const { withSession, credentials, saveSession, loginFp, sessionFp, forgetSession, hasStoredLogin: hasLogin, checkDevice, deviceMark, markDevice, DEVICE_ROW, close: closeLive } = __mod_src_shell_live;
const { ACCOUNT_STATE_KEY } = __mod_src_mtproto_account_library;
const { KEYS, readJson, writeJson, remove } = __mod_src_shell_store;
const { shellError, kindOf } = __mod_src_shell_errors;
const { t, minutes, videoCount } = __mod_src_shell_text;
const { logRefresh } = __mod_src_shell_timing;
const { lastOpenTiming } = __mod_src_shell_live;
const { nameOf, carry, displayTitle, posterOf, backdropOf, enrichStep, tmdbOn, viewOf } = __mod_src_shell_enrich;
const { clip, cleanText } = __mod_src_shell_clean;

const SLOTS = 6;
const REFRESH_MS = 5 * 60 * 1000;
const BATCH = 500;              // kino.catalog: items per upsert, ids per get/remove
const MAX_PAGES = 25;           // discovery RPCs per refresh (Home has 20 s)
const REFRESH_BUDGET_MS = 14000; // from the start of the call: key exchange, login and pages; then stop and go on later
const PURGE_BATCHES = 40;       // remove calls per purge step (20 000 ids)
const SCAN_BATCHES = 10;        // get calls per channel row or page (5 000 message ids)
const ROW_ITEMS = 30;
const PAGE_ITEMS = 60;
const HLS = /mpegurl/i;

// ---- shell state (tg.shell) ----

const freshShell = (fp) => ({ v: 1, fp, slots: [], missing: [], waiting: [], wasOn: [], titles: {}, selfId: null, applied: [], top: {}, purge: [], indexedAt: 0, incomplete: false, count: 0, unslotted: 0, checking: 0, error: null, refused: null, channelErrors: 0, en: { off: 0, at: 0, done: false } });

function loadShell(c) {
  const s = readJson(KEYS.shell);
  const fp = c && c.complete ? sessionFp(c) : null;
  if (!s || s.v !== 1 || !Array.isArray(s.slots)) return freshShell(fp);
  return migrateSlots({ ...freshShell(fp), ...s });
}

/**
 * 0.2.x had 8 slots, 0.3.0 has 6. The channels of slots 7 and 8 are not dropped and nothing moves: they wait first in
 * line for a place (in their old order), marked when they were switched on, so the status line can say so and how to
 * give them one (switch a place off, then "Dar lugar a los que esperan"). Their rows go with the next refresh's purge,
 * as for any channel switched off. Slots 1 to 6 keep their channel and their toggle.
 */
function migrateSlots(shell) {
  if (shell.slots.length <= SLOTS) return shell;
  const over = shell.slots.slice(SLOTS);
  const missing = new Set(shell.missing || []);
  shell.slots = shell.slots.slice(0, SLOTS);
  shell.missing = (shell.missing || []).filter((x) => shell.slots.includes(x));
  const keep = over.filter((x) => !missing.has(x));
  shell.waiting = [...keep, ...(shell.waiting || []).filter((x) => !keep.includes(x))];
  shell.wasOn = [...new Set([...(shell.wasOn || []), ...keep.filter((x) => (shell.applied || []).includes(x))])];
  shell.unslotted = shell.waiting.length;
  return shell;
}

/** A chat's name as the person reads it (Saved Messages in their language). */
const titleOf = (shell, chatId) => (chatId === shell.selfId ? t("chat.saved") : shell.titles[chatId] || chatId);
const saveShell = (s) => writeJson(KEYS.shell, s);

/** The chats (Bot API ids, "-100...") whose toggle is on. */
function activeChats(shell) {
  const on = new Set();
  const missing = new Set(shell.missing || []);
  shell.slots.forEach((chatId, i) => { if (chatId && !missing.has(chatId) && kino.config.get("ch" + (i + 1)) === true) on.add(chatId); });
  return on;
}

const chatOfId = (id) => String(id).slice(0, String(id).lastIndexOf(":"));
const msgOfId = (id) => Number(String(id).slice(String(id).lastIndexOf(":") + 1));
const channelChatId = (rawId) => String(-(1000000000000n + BigInt(rawId)));

// ---- catalog rows ----

/**
 * A discovery entry as a catalog item: id "<chat>:<msg>", the title (every name it goes by, for search), the date as
 * `sort`, a small `data`: the parsed name (`n`) and its lookup key (`pk`), the thumbnail's type and size (`th`, never
 * its bytes); TMDB's answer (`tm`) is added by the enrichment pass.
 */
function rowOf(e) {
  // The sender's text, without control or direction characters, before anything is derived from it.
  const named = nameOf(cleanText(e.fileName || ""), cleanText(e.text || e.caption || ""), cleanText(e.title || ""));
  const data = {
    chatId: e.chatId,
    msgId: e.msgId,
    size: e.size,
    mime: clip(e.mime, 60),
    duration: Number.isFinite(e.duration) ? Math.round(e.duration) : null,
    width: Number.isFinite(e.width) ? e.width : null,
    height: Number.isFinite(e.height) ? e.height : null,
    caption: clip(e.caption, 120),
    doc: { id: e.doc.id, accessHash: e.doc.accessHash, fileReference: e.doc.fileReference, dcId: e.doc.dcId },
    n: named.n,
    pk: named.pk,
  };
  if (e.thumb) data.th = { t: e.thumb.t, s: e.thumb.s };
  return { id: String(e.key).slice(0, 128), title: clip(named.title, 300) || "Video " + e.msgId, sort: Number.isSafeInteger(e.date) ? e.date : 0, data };
}

async function upsertAll(rows) {
  for (let i = 0; i < rows.length; i += BATCH) await kino.catalog.upsert(rows.slice(i, i + BATCH));
}
async function removeAll(ids) {
  for (let i = 0; i < ids.length; i += BATCH) await kino.catalog.remove(ids.slice(i, i + BATCH));
}

/** Removes the rows of the chats waiting in `shell.purge`, at most PURGE_BATCHES remove calls. */
async function purgeStep(shell) {
  let calls = 0;
  while (shell.purge.length && calls < PURGE_BATCHES) {
    const p = shell.purge[0];
    if (p.next < 1) { shell.purge.shift(); continue; }
    const ids = [];
    for (let m = p.next; m >= 1 && ids.length < BATCH; m--) ids.push(p.chatId + ":" + m);
    await kino.catalog.remove(ids);
    p.next -= ids.length;
    calls++;
  }
}

/** Newest videos of one chat by message id, from `fromId` down (catalog.get by id: no network). */
async function scanChat(chatId, fromId, want) {
  const found = [];
  let next = fromId;
  for (let b = 0; b < SCAN_BATCHES && next >= 1 && found.length <= want; b++) {
    const ids = [];
    for (let m = next; m >= 1 && ids.length < BATCH; m--) ids.push(chatId + ":" + m);
    found.push(...(await kino.catalog.get(ids)));
    next -= ids.length;
  }
  if (found.length > want) return { items: found.slice(0, want), next: found[want].data.msgId };
  return { items: found, next: next >= 1 ? next : null };
}

// ---- Kino items ----

function clock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  const two = (n) => String(n).padStart(2, "0");
  return h ? h + ":" + two(m) + ":" + two(x) : m + ":" + two(x);
}
function sizeText(bytes) {
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
  return Math.max(1, Math.round(bytes / 1024)) + " KB";
}

/** The card's picture: TMDB's poster (a plain URL) when the row has one, else Telegram's thumbnail through `image`. */
function posterFor(row) {
  row = viewOf(row);
  const p = posterOf(row);
  if (p) return p;
  return row.data && row.data.th ? { source: "plugin", handle: "t:" + row.id } : null;
}

/** A catalog row as a Kino item: id from the row id (only Item id characters), ref = the row id. */
function itemOf(row) {
  row = viewOf(row); // without TMDB's answer when the person turned TMDB off
  const d = row.data || {};
  const item = { id: ("v" + row.id.replace(":", "_")).slice(0, 128), ref: row.id, title: clip(displayTitle(d, row.title), 200) || "Video", kind: "movie" };
  const poster = posterFor(row);
  if (poster) item.poster = poster;
  const backdrop = backdropOf(row);
  if (backdrop) item.backdrop = backdrop;
  const year = d.tm && d.tm.y ? d.tm.y : d.n && d.n.year ? String(d.n.year) : null;
  if (year) item.year = year;
  const badges = [];
  if (d.duration > 0) badges.push(clock(d.duration));
  if (d.size > 0) badges.push(sizeText(d.size));
  if (badges.length) item.badges = badges;
  if (d.height > 0) item.quality = d.height + "p";
  if (d.tm && d.tm.o) item.overview = d.tm.o;
  else if (d.caption && d.caption !== row.title && d.caption !== item.title) item.overview = d.caption;
  if (d.duration > 0) item.runtimeMinutes = Math.min(1000, Math.max(1, Math.round(d.duration / 60)));
  return item;
}

/** An instruction shown as a one-item row: opening it says what to do (resolve of "setup:<kind>"). */
const notice = (kind, title) => ({ id: "notice", title: t("row.notice"), items: [{ id: "setup-" + kind, ref: "setup:" + kind, title: clip(title, 200), kind: "movie" }] });

// ---- refresh ----

function problemOf(shell, now = Date.now()) {
  const e = shell.error;
  if (!e) return null;
  if ((e.kind === "flood" || e.kind === "budget") && e.until && e.until <= now) return null;
  return e;
}

function noticeFor(problem, now = Date.now()) {
  switch (problem.kind) {
    case "config": return notice("config", t(credentials().mode === "account" ? "setup.configAccount" : "setup.config"));
    case "signin": return notice("signin", t("setup.signin"));
    case "closed": return notice("closed", t("setup.closed"));
    case "token": return notice("token", t("setup.token"));
    case "api_id": return notice("api_id", t("setup.apiId"));
    case "flood": return notice("flood", t("setup.flood", { min: minutes((problem.until - now) / 1000) }));
    case "budget": return notice("budget", t("setup.budget", { min: minutes((problem.until - now) / 1000) }));
    case "network": return notice("network", t("setup.network"));
    default: return notice("unavailable", t("setup.unavailable"));
  }
}

/** Starts over for another bot: the index and the discovery state go (this device keeps its mark). */
async function resetIndex(shell) {
  remove(KEYS.discovery);
  remove(ACCOUNT_STATE_KEY);
  shell.slots = []; shell.missing = []; shell.waiting = []; shell.wasOn = []; shell.titles = {}; shell.selfId = null; shell.applied = []; shell.top = {}; shell.purge = [];
  shell.indexedAt = 0; shell.incomplete = false; shell.count = 0; shell.unslotted = 0; shell.checking = 0; shell.channelErrors = 0;
  const mark = await deviceMark();
  try { await kino.catalog.clear(); } catch (e) { kino.log("catalog clear failed: " + (e && e.code)); }
  await markDevice(mark || undefined);
}

/** How many videos the catalog holds (the device mark is a row too, not a video). */
async function countVideos() {
  const n = await kino.catalog.count();
  return Math.max(0, n - ((await kino.catalog.get([DEVICE_ROW])).length));
}

/**
 * The slots, STABLE and first-seen: a slot keeps its channel for good; a channel the bot meets for the first time is
 * appended to the first free slot (in the order the bot met them, `seen`), and its toggle starts off (only slot 1's
 * toggle starts on, and slot 1 is the first channel the bot ever met). Why: anyone who learns the bot's username can
 * make it an administrator of their own channel. With stable slots such a channel lands in a later slot, switched off,
 * and can never take the owner's slot or push it out (a 9th channel just gets no slot). A channel the bot lost keeps
 * its slot, marked missing, so that slot is never handed to a newcomer whose videos would then show switched on.
 */
function assignSlots(shell, chats) {
  const order = (id) => (Number.isInteger(chats[id].seen) ? chats[id].seen : Number.MAX_SAFE_INTEGER);
  const ids = Object.keys(chats || {}).sort((a, b) => order(a) - order(b) || (BigInt(a) < BigInt(b) ? -1 : BigInt(a) > BigInt(b) ? 1 : 0));
  const known = new Set(ids);
  for (const chatId of ids) {
    if (chats[chatId].kind === "self") shell.selfId = chatId;
    shell.titles[chatId] = clip(chats[chatId].title, 100);
  }
  // Who waits for a place: those already waiting keep their turn (slots 7 and 8 of 0.2.x first), then the newcomers.
  const waiting = (shell.waiting || []).filter((x) => known.has(x) && !shell.slots.includes(x));
  for (const chatId of ids) if (!shell.slots.includes(chatId) && !waiting.includes(chatId)) waiting.push(chatId);
  while (shell.slots.length < SLOTS && waiting.length) shell.slots.push(waiting.shift());
  shell.waiting = waiting;
  shell.wasOn = (shell.wasOn || []).filter((x) => waiting.includes(x));
  shell.missing = shell.slots.filter((chatId) => !known.has(chatId));
  shell.unslotted = waiting.length;
}

/** The discovery's known chats as { chatId: { title, seen, kind } }, whichever the mode. */
function chatsOf(res, mode) {
  if (mode === "account") return (res.state && res.state.chats) || {};
  const out = {};
  for (const [rawId, ch] of Object.entries((res.state && res.state.channels) || {})) out[channelChatId(rawId)] = { title: ch.title, seen: ch.seen, kind: "channel" };
  return out;
}

/**
 * The "Dar lugar a los que esperan" action: every place whose toggle is off (or whose channel the bot lost) goes to the
 * next channel waiting, in line order; the channel that had it waits at the end of the line. Nothing is switched on:
 * the toggle of a place given away is off, so a newcomer (perhaps a stranger's channel) still shows nothing until the
 * person turns it on. Answers how many places changed hands.
 */
function freeSlots() {
  const c = credentials();
  const shell = loadShell(c);
  let n = 0;
  const missing = new Set(shell.missing || []);
  const line = shell.waiting.slice(); // only those waiting now get a place: one that gives its place waits after them
  const gave = [];
  for (let i = 0; i < shell.slots.length && line.length; i++) {
    const chatId = shell.slots[i];
    if (kino.config.get("ch" + (i + 1)) === true && !missing.has(chatId)) continue;
    shell.slots[i] = line.shift();
    if (!missing.has(chatId)) gave.push(chatId);
    n++;
  }
  shell.waiting = [...line, ...gave];
  shell.missing = shell.slots.filter((x) => missing.has(x));
  shell.wasOn = (shell.wasOn || []).filter((x) => shell.waiting.includes(x));
  shell.unslotted = shell.waiting.length;
  if (n) saveShell(shell);
  return n;
}

/** Applies one refresh's changes to the catalog: only videos of active channels, never an HLS playlist. */
async function applyChanges(shell, changes, active) {
  let rows = [];
  for (const e of changes.upserted) {
    if (!active.has(e.chatId) || HLS.test(String(e.mime))) continue;
    rows.push(rowOf(e));
    shell.top[e.chatId] = Math.max(shell.top[e.chatId] || 0, e.msgId);
  }
  // An edited message keeps its TMDB answer while it would ask the same thing (an edited caption with tmdb:<id> asks again).
  const old = new Map();
  for (let i = 0; i < rows.length; i += BATCH) for (const r of await kino.catalog.get(rows.slice(i, i + BATCH).map((x) => x.id))) old.set(r.id, r);
  rows = rows.map((r) => carry(old.get(r.id), r));
  if (rows.some((r) => !(r.data && r.data.tm))) shell.en = { off: 0, at: 0, done: false }; // new rows to ask about: the walk starts over (newest first)
  await upsertAll(rows);
  await removeAll(changes.removed);
  for (const chatId of changes.droppedChats) {
    if (shell.top[chatId]) shell.purge.push({ chatId, next: shell.top[chatId] });
    delete shell.top[chatId];
  }
  return rows.length;
}

/** Turns toggle changes into work: a channel turned on is read again from its start, one turned off is purged. */
async function applyToggles(shell, live) {
  const active = activeChats(shell);
  const before = new Set(shell.applied);
  let changed = false;
  for (const chatId of active) {
    if (before.has(chatId)) continue;
    changed = true;
    if (live) await live.discovery.resetChannel(chatId);
  }
  for (const chatId of before) {
    if (active.has(chatId)) continue;
    changed = true;
    if (shell.top[chatId]) shell.purge.push({ chatId, next: shell.top[chatId] });
    delete shell.top[chatId];
  }
  if (live) shell.applied = [...active];
  return changed;
}

let running = null;      // the refresh in flight: a second caller (Home and "Actualizar ahora" at once) shares its result
let runningForce = false;
let queuedForce = null;  // a forced refresh that arrived while a plain one ran: it runs after it, once

/**
 * One refresh: toggles, purges, then (unless the index is recent and nothing is pending, or `force`) the discovery.
 * Never throws: answers { shell, added, problem }. A failure keeps the old rows and is stored in `shell.error`. One at
 * a time per runtime: a call while another runs gets that one's answer.
 */
function refresh(opts = {}) {
  const force = opts.force === true;
  if (!running) return start(force);
  if (!force || runningForce) return running;
  // "Actualizar ahora" during a plain Home: when that Home did read Telegram, its answer is the fresh one; when it
  // took the early return (a recent index), the forced pass runs right after it.
  if (!queuedForce) queuedForce = running.then((r) => { queuedForce = null; return r.networked ? r : refresh({ force: true }); });
  return queuedForce;
}
function start(force) {
  runningForce = force;
  running = runRefresh({ force }).finally(() => { running = null; runningForce = false; });
  return running;
}

async function runRefresh({ force = false } = {}) {
  const c = credentials();
  if (!c.complete) return { shell: loadShell(null), added: 0, problem: { kind: "config" } };
  const started = Date.now();
  const now = started;
  let shell = null;
  let added = 0;
  let networked = false;
  const tm = { pages: 0, disc: 0, upsert: 0, purge: 0, result: "skipped" };
  const openBefore = lastOpenTiming();
  try {
    await checkDevice(); // first: a restored storage from another device is dropped before anything reads it
    shell = loadShell(c);
    if (shell.fp !== sessionFp(c)) { await resetIndex(shell); shell.fp = sessionFp(c); shell.error = null; shell.refused = null; }
    const active0 = activeChats(shell);
    const togglesPending = [...active0].some((x) => !shell.applied.includes(x)) || shell.applied.some((x) => !active0.has(x));
    let tp = Date.now();
    await purgeStep(shell); // what an earlier toggle left to remove: no network needed
    tm.purge += Date.now() - tp;
    const pending = shell.incomplete || togglesPending;
    const blocked = problemOf(shell, now);
    if (!force && blocked && (blocked.kind === "flood" || blocked.kind === "budget")) return { shell, added, problem: blocked };
    if (!force && !pending && shell.indexedAt && now - shell.indexedAt < REFRESH_MS) {
      await enrich(shell, started);
      return { shell, added, problem: blocked };
    }

    const deadline = started + REFRESH_BUDGET_MS;
    networked = true;
    tm.result = "ok";
    await withSession(c, shell, async (live) => {
      await applyToggles(shell, live);
      tp = Date.now();
      await purgeStep(shell);
      tm.purge += Date.now() - tp;
      // A second pass only when the first gave an active slot to a channel it had not scanned (slot 1 starts on).
      for (let pass = 0; pass < 2 && Date.now() < deadline; pass++) {
        const active = activeChats(shell);
        const td = Date.now();
        const shouldScan = c.mode === "account" ? (chatId) => active.has(chatId) : (rawId) => active.has(channelChatId(rawId));
        const res = await live.discovery.refresh({ maxPages: MAX_PAGES, deadline, commit: false, shouldScan });
        const tu = Date.now();
        tm.disc += tu - td; tm.pages += res.pages || 0;
        // The catalog first, then the discovery's progress: a write that fails (or a call cut off in between) leaves
        // the update state where it was, and the next refresh reads those pages again (upserts are idempotent).
        added += await applyChanges(shell, res.changes, active);
        tm.upsert += Date.now() - tu;
        res.commit();
        shell.channelErrors = (res.errors || []).filter((x) => x.scope === "channel").length;
        assignSlots(shell, chatsOf(res, c.mode));
        shell.checking = Number(res.checking) || 0;
        shell.incomplete = !!res.incomplete;
        if (res.floodWait !== undefined) {
          shell.error = { kind: "flood", until: now + res.floodWait * 1000, at: now };
          shell.incomplete = true;
          return;
        }
        shell.error = null;
        if (!(await applyToggles(shell, live))) return;
      }
      if (Date.now() >= deadline) shell.incomplete = true;
    }, { deadline });
    shell.refused = null;
    if (!shell.incomplete) shell.indexedAt = now;
    await enrich(shell, started);
    return { shell, added, networked, problem: problemOf(shell, now) };
  } catch (e) {
    shell = shell || loadShell(c);
    tm.result = e && e.code === "timeout" && e.deadline === true ? "deadline" : String(kindOf(e));
    if (e && e.code === "timeout" && e.deadline === true) {
      // Out of the call's time (a slow connect or login): not an error, the next call goes on; the rows stay.
      kino.log("refresh stopped at its deadline");
      shell.incomplete = true;
      return { shell, added, networked, problem: problemOf(shell, now) };
    }
    const kind = kindOf(e);
    shell.error = { kind, at: now };
    if (kind === "flood" || kind === "budget") shell.error.until = now + (Number(e.seconds) || 60) * 1000;
    if (kind === "token" || kind === "api_id") shell.refused = { fp: loginFp(c), kind };
    kino.log("refresh failed: " + kind + " " + (e && e.code ? e.code : ""));
    return { shell, added, networked, problem: shell.error };
  } finally {
    if (shell) {
      try { shell.count = await countVideos(); } catch { /* keep the last count */ }
      saveSession();
      saveShell(shell);
    }
    const o = lastOpenTiming() !== openBefore ? lastOpenTiming() : null; // a connect of this refresh, or the live one reused
    logRefresh({ total: Date.now() - started, connect: o ? o.connect : 0, loginms: o ? o.loginms : 0, login: o ? o.login : networked ? "reused" : "-", ...tm, added, incomplete: shell && shell.incomplete });
  }
}

/** The TMDB pass of a refresh (bounded, never throws): only rows of active channels, never the device mark. */
async function enrich(shell, started) {
  if (!tmdbOn()) return; // the person turned TMDB off: no kino.meta call, nothing of the videos leaves for TMDB
  const active = activeChats(shell);
  const t0 = Date.now();
  const asked = await enrichStep(shell, started, { skip: (row) => row.id === DEVICE_ROW || !active.has(chatOfId(row.id)) });
  if (asked) kino.log("tmdb lookups=" + asked + " ms=" + (Date.now() - t0) + (shell.en && shell.en.done ? " done" : ""));
}

/** Forgets this device: the session, the discovery state, the shell state and the catalog. */
async function forget() {
  await forgetSession();
  remove(KEYS.discovery);
  remove(ACCOUNT_STATE_KEY);
  remove(KEYS.qr);
  remove(KEYS.shell);
  await kino.catalog.clear();
  await markDevice();
}

/** Signs the account out on this device: its session, its index and the catalog go; a bot session stays. */
async function forgetAccount() {
  await closeLive();
  remove(KEYS.usession);
  remove(ACCOUNT_STATE_KEY);
  remove(KEYS.qr);
  remove(KEYS.shell);
  await kino.catalog.clear();
  await markDevice();
}

// ---- what Kino shows ----

/** Newest rows of the whole catalog that belong to active channels. */
async function recent(active, offset, want) {
  const items = [];
  let off = offset, total = 0;
  for (let i = 0; i < 5 && items.length < want; i++) {
    const page = await kino.catalog.search({ limit: 100, offset: off });
    total = page.total;
    for (const r of page.items) {
      if (items.length >= want) break;
      off++; // the next page starts right after the last row looked at
      if (active.has(chatOfId(r.id))) items.push(r);
    }
    if (off >= total || page.items.length === 0) break;
  }
  return { items, next: off < total ? off : null };
}

/** The Home rows: a notice when something is wrong, "Recientes", then one row per active channel. */
/** Time as the shell sees it (a test may give kino a clock; production kino has none). */
const nowMs = () => (typeof kino.now === "function" ? kino.now() : Date.now());
const HOME_BUDGET_MS = 17000; // Kino gives home() 20 s: the rows stop being built here, whatever the refresh took

async function homeRows({ shell, problem }, started = nowMs()) {
  const c = credentials();
  if (!c.complete) return [noticeFor({ kind: "config" })];
  const active = activeChats(shell);
  const rows = [];
  if (problem) rows.push(noticeFor(problem));
  const top = await recent(active, 0, ROW_ITEMS);
  if (top.items.length) {
    rows.push({ id: "recent", title: t("row.recent"), ref: "recent", items: top.items.map(itemOf) });
    for (const chatId of shell.slots) {
      if (!active.has(chatId)) continue;
      // A channel's own row is optional: past the budget Home answers with what it has (never a timeout).
      if (nowMs() - started > HOME_BUDGET_MS) { kino.log("home: channel rows skipped, out of time"); break; }
      const r = await scanChat(chatId, shell.top[chatId] || 0, ROW_ITEMS);
      if (r.items.length) rows.push({ id: "c" + chatId, title: clip(titleOf(shell, chatId), 200), ref: "chan:" + chatId, items: r.items.map(itemOf) });
    }
  } else if (!problem) {
    const none = c.mode === "account" ? (shell.checking > 0 ? notice("checking", t("setup.checking")) : notice("noChannels", t("setup.noChats"))) : notice("noChannels", t("setup.noChannels"));
    rows.push(shell.slots.length === 0 ? none : active.size === 0 ? notice("noneActive", t("setup.noneActive")) : notice("empty", t("setup.empty")));
  }
  return rows.slice(0, 20);
}

/** "Ver más": "recent" pages the catalog by offset, "chan:<chat>" one channel by message id. */
async function browsePage(ref, cursor) {
  const shell = loadShell(credentials());
  const active = activeChats(shell);
  if (ref === "recent") {
    const r = await recent(active, Number(cursor) > 0 ? Number(cursor) : 0, PAGE_ITEMS);
    return r.next === null ? { items: r.items.map(itemOf) } : { items: r.items.map(itemOf), next: String(r.next) };
  }
  if (typeof ref === "string" && ref.startsWith("chan:")) {
    const chatId = ref.slice(5);
    if (!active.has(chatId)) return { items: [] };
    const from = Number(cursor) > 0 ? Number(cursor) : shell.top[chatId] || 0;
    const r = await scanChat(chatId, from, PAGE_ITEMS);
    return r.next === null ? { items: r.items.map(itemOf) } : { items: r.items.map(itemOf), next: String(r.next) };
  }
  return { items: [] };
}

/** Search in the catalog only (accents and case aside, every word); `within` a channel keeps that channel's rows. */
async function searchPage(query) {
  const q = String((query && query.q) || "").trim().slice(0, 256);
  if (!q) return { items: [] };
  if (!credentials().complete) return { items: [] };
  const shell = loadShell(credentials());
  const active = activeChats(shell);
  const within = query.within && String(query.within).startsWith("chan:") ? String(query.within).slice(5) : null;
  const offset = Number(query.cursor) > 0 ? Number(query.cursor) : 0;
  const page = await kino.catalog.search({ q, limit: 50, offset });
  const items = page.items.filter((r) => active.has(chatOfId(r.id)) && (!within || chatOfId(r.id) === within)).map(itemOf);
  const next = offset + page.items.length;
  return next < page.total ? { items, next: String(next) } : { items };
}

/** The catalog row behind a ref, when its channel is active; else a not_found shell error. */
async function rowFor(ref) {
  const shell = loadShell(credentials());
  const [row] = typeof ref === "string" && ref.length <= 128 ? await kino.catalog.get([ref]) : [];
  if (!row || !activeChats(shell).has(chatOfId(row.id))) throw shellError("not_found", "no such video");
  return viewOf(row);
}

const channelTabs = (shell) => shell.slots.filter((x) => activeChats(shell).has(x)).map((chatId) => ({ chatId, title: titleOf(shell, chatId) }));

/** The settings form's status lines (no network). */
function statusLines() {
  const c = credentials();
  const shell = loadShell(c);
  const now = Date.now();
  const out = {};
  const problem = problemOf(shell, now);
  if (!c.complete) out.account_status = t(c.mode === "account" ? "status.missingAccount" : "status.missing");
  else if (shell.refused && shell.refused.fp === loginFp(c)) out.account_status = t(shell.refused.kind === "token" ? "status.token" : "status.apiId");
  else if (problem && problem.kind === "flood") out.account_status = t("status.flood", { min: minutes((problem.until - now) / 1000) });
  else if (c.mode === "account") out.account_status = accountStatus(c);
  else out.account_status = hasLogin(c) ? t("status.connected") : t("status.notYet");
  // The places on one line (Kino's settings contract leaves no room for one line per place): "1 ✓ Pelis · 2 — Viajes".
  const places = [];
  for (let i = 0; i < SLOTS; i++) {
    const chatId = shell.slots[i];
    if (!chatId) { places.push(i + 1 + " " + t("slots.free")); continue; }
    const name = clip(titleOf(shell, chatId), 24);
    places.push(i + 1 + ((shell.missing || []).includes(chatId) ? " ✗ " + name + " (" + t("slots.gone") + ")" : kino.config.get("ch" + (i + 1)) === true ? " ✓ " + name : " — " + name));
  }
  out.channels_status = shell.slots.length ? places.join(" · ").slice(0, 200) : t("slots.none");
  const waiting = (shell.waiting || []).map((x) => ((shell.wasOn || []).includes(x) ? t("more.wasOn", { title: clip(titleOf(shell, x), 24) }) : clip(titleOf(shell, x), 24)));
  out.channels_more = waiting.length ? t("more.list", { list: waiting.slice(0, 4).join(", ") + (waiting.length > 4 ? " +" + (waiting.length - 4) : "") }).slice(0, 200) : t("more.none");
  const parts = [shell.count > 0 ? videoCount(shell.count) : t("index.none")];
  if (shell.indexedAt) {
    const m = Math.floor((now - shell.indexedAt) / 60000);
    parts.push(m < 1 ? t("index.justNow") : t("index.at", { min: minutes(m * 60) }));
  }
  if (shell.incomplete) parts.push(t("index.reading"));
  if (c.mode === "account" && shell.checking > 0) parts.push(t("index.checking", { n: shell.checking }));
  if (problem) parts.push(problem.kind === "flood" || problem.kind === "budget" ? t("setup.flood", { min: minutes((problem.until - now) / 1000) }) : noticeFor(problem).items[0].title);
  if (shell.channelErrors > 0) parts.push(t("index.channelErrors", { n: shell.channelErrors }));
  out.index_status = parts.join(" · ").slice(0, 200);
  return out;
}

/** The account line of the settings form in account mode (no network). */
function accountStatus(c) {
  const rec = readJson(KEYS.login);
  const qr = readJson(KEYS.qr);
  if (qr && qr.fp === sessionFp(c) && qr.stage === "password") return t("status.password");
  if (qr && qr.fp === sessionFp(c) && qr.stage === "qr" && qr.until > Date.now()) return t("qr.waiting");
  if (hasLogin(c)) return t("status.accountOn");
  if (rec && rec.fp === loginFp(c) && rec.kind === "closed") return t("status.closed");
  return t("status.signin");
}
return { SLOTS, REFRESH_MS, loadShell, titleOf, activeChats, rowOf, posterFor, itemOf, countVideos, freeSlots, refresh, forget, forgetAccount, nowMs, homeRows, browsePage, searchPage, rowFor, channelTabs, statusLines, chatOfId, msgOfId };
})();

// ---- src/shell/account.js ----
const __mod_src_shell_account = (() => {
// Account mode's sign-in, from the settings form only (there is no login in the background):
//   - "Iniciar sesión con QR" (action qr_login) asks Telegram for a login token (auth.exportLoginToken, with the person's
//     api_id and api_hash). The form's `qr` setting shows it as tg://login?token=<base64url>, for the person to scan with
//     the OFFICIAL Telegram app (Settings ▸ Devices ▸ Link Desktop Device), which shows whose account is linked and
//     asks to confirm. Kino asks settingsStatus() every 5 s while the form is open; this module then asks Telegram again
//     when the token is close to expiring (about 30 s) or 10 s went by: that answer is a new token, or the login
//     (auth.loginTokenSuccess, or auth.loginTokenMigrateTo, followed by the client). The window closes after 150 s.
//   - A 2FA account answers SESSION_PASSWORD_NEEDED: the person types the password in the `tg_password` setting, taps
//     Guardar, then "Confirmar la contraseña" (action check_password): SRP (src/mtproto/srp.js), auth.checkPassword.
//     The password is read from the settings for that one call and the action always asks Kino to clear the field
//     (clearSettings): it is never stored by the plugin, never logged, never part of a row or an error.
//   - "Cerrar sesión" (action logout): auth.logOut (best effort), then the session, the account's index and its catalog
//     rows are deleted on this device.
// The login token is never logged and never stored (tg.qr keeps only { fp, stage, until }).
const { credentials, connect, saveSession, loginBlocked, recordLoginFailure, markLoggedIn, hasStoredLogin, sessionFp, close } = __mod_src_shell_live;
const { KEYS, readJson, writeJson, remove, kinoStore } = __mod_src_shell_store;
const { loginBudget } = __mod_src_mtproto_client;
const { toBase64 } = __mod_src_mtproto_bytes;
const { t, minutes } = __mod_src_shell_text;
const { loadShell, forgetAccount } = __mod_src_shell_library;

const QR_WINDOW_MS = 150000;  // how long a QR login stays open after the person pressed the button
const POLL_MS = 10000;        // ask Telegram again at least this often while the QR is shown
const RENEW_MS = 8000;        // ...and when the token has less than this left
const CALL_MS = 7000;         // one poll inside settingsStatus's 10 s
const ACTION_MS = 20000;      // one action inside its 30 s
/** QR logins per device and hour (each press of the button). */
const ACCOUNT_BUDGET = Object.freeze({ key: KEYS.accountLogins, max: 5, what: "account logins" });

let qr = null; // { fp, url, expiresAt, lastAt } of this runtime: the token itself lives only here
const clock = () => (typeof kino.now === "function" ? kino.now() : Date.now()); // a test may give kino a clock

const b64url = (u8) => toBase64(u8).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const errCode = (e) => (e && typeof e.code === "string" ? e.code : e && e.shell ? e.shell : "error");

/** What a login step answered: a token to show, the login done, or a password to ask. */
function took(c, step, now) {
  if (step && step.token) {
    // The server's expiry is in its clock; the token lives ~30 s: count from now with the time it says is left.
    const left = Math.max(5000, Math.min(60000, (Number(step.expires) - Math.floor(now / 1000)) * 1000));
    qr = { fp: sessionFp(c), url: "tg://login?token=" + b64url(step.token), expiresAt: now + (Number.isFinite(left) ? left : 30000), lastAt: now };
    saveSession();
    return "token";
  }
  if (step && step.userId !== undefined) { done(); return "done"; }
  throw new Error("unexpected login step");
}
function done() {
  qr = null;
  remove(KEYS.qr);
  remove(KEYS.login); // a "closed" or wait record of the old session
  markLoggedIn();
}
function failed(c, e) {
  qr = null;
  const code = errCode(e);
  if (code === "password_needed") { writeJson(KEYS.qr, { fp: sessionFp(c), stage: "password" }); saveSession(); return t("qr.password"); }
  remove(KEYS.qr);
  recordLoginFailure(c, e);
  kino.log("account login stopped: " + code);
  if (code === "flood_wait") return t("setup.flood", { min: minutes(e.seconds) });
  if (code === "api_id_invalid") return t("status.apiId");
  return t("qr.failed");
}

/** The qr_login action. */
async function startQr() {
  const c = credentials();
  if (c.mode !== "account") return t("qr.botMode");
  if (!c.complete) return t("status.missingAccount");
  if (hasStoredLogin(c)) return t("qr.already");
  const blocked = loginBlocked(c);
  if (blocked) return t("setup.flood", { min: minutes(blocked.seconds) });
  try {
    loginBudget(kinoStore, clock(), ACCOUNT_BUDGET).record();
  } catch (e) {
    return t("qr.budget", { min: minutes(e.seconds) });
  }
  const now = clock();
  try {
    const live = await connect(c, loadShell(c), { deadline: now + ACTION_MS, loginFlow: true });
    const step = await live.client.qrLoginStep({ apiHash: c.apiHash, deadline: now + ACTION_MS });
    if (took(c, step, clock()) === "done") return t("qr.done");
    writeJson(KEYS.qr, { fp: sessionFp(c), stage: "qr", until: now + QR_WINDOW_MS });
    return t("qr.scan");
  } catch (e) {
    return failed(c, e);
  }
}

/**
 * From settingsStatus: the QR text to draw (or none) and the account line while a login is under way. Asks Telegram
 * only when the token is about to expire or POLL_MS went by. Never throws.
 */
async function qrPoll() {
  const c = credentials();
  if (c.mode !== "account" || !c.complete) return {};
  const st = readJson(KEYS.qr);
  if (!st || st.fp !== sessionFp(c)) { qr = null; return {}; }
  if (st.stage === "password") return { status: t("status.password") };
  const now = clock();
  if (!(st.until > now)) { remove(KEYS.qr); qr = null; return { status: t("qr.expired") }; }
  const due = !qr || qr.fp !== st.fp || qr.expiresAt - now < RENEW_MS || now - qr.lastAt >= POLL_MS;
  if (due) {
    try {
      const live = await connect(c, loadShell(c), { deadline: now + CALL_MS, loginFlow: true });
      const step = await live.client.qrLoginStep({ apiHash: c.apiHash, deadline: now + CALL_MS });
      if (took(c, step, clock()) === "done") return { status: t("qr.done") };
    } catch (e) {
      const code = errCode(e);
      if (code === "timeout" || code === "closed") { kino.log("qr poll: " + code); if (qr) qr.lastAt = now; }
      else return { status: failed(c, e) };
    }
  }
  return qr ? { qr: qr.url, status: t("qr.waiting") } : { status: t("qr.waiting") };
}

/** The check_password action: the 2FA password from the settings, used once; the field is always cleared. */
async function confirmPassword() {
  const clear = { clearSettings: ["tg_password"] };
  const c = credentials();
  if (c.mode !== "account" || !c.complete) return { message: t("qr.botMode"), ...clear };
  const st = readJson(KEYS.qr);
  if (!st || st.fp !== sessionFp(c) || st.stage !== "password") return { message: t(hasStoredLogin(c) ? "qr.already" : "pw.notNeeded"), ...clear };
  const typed = kino.config.get("tg_password");
  if (typeof typed !== "string" || !typed) return { message: t("pw.empty") };
  const now = clock();
  try {
    const live = await connect(c, loadShell(c), { deadline: now + ACTION_MS, loginFlow: true });
    await live.client.checkPassword(typed, { deadline: now + ACTION_MS });
    done();
    return { message: t("qr.done"), ...clear };
  } catch (e) {
    const code = errCode(e);
    kino.log("password check: " + code);
    if (code === "password_invalid") return { message: t("pw.wrong"), ...clear };
    if (code === "login_budget") return { message: t("pw.budget", { min: minutes(e.seconds) }), ...clear };
    if (code === "flood_wait") { recordLoginFailure(c, e); return { message: t("setup.flood", { min: minutes(e.seconds) }), ...clear }; }
    return { message: t("qr.failed"), ...clear };
  }
}

/** The logout action: auth.logOut when there is a session (best effort), then everything of the account goes. */
async function logout() {
  const c = credentials();
  const clear = { clearSettings: ["tg_password"] };
  if (c.mode !== "account") return { message: t("logout.none"), ...clear };
  const had = !!readJson(KEYS.usession);
  if (hasStoredLogin(c)) {
    try {
      const live = await connect(c, loadShell(c), { deadline: clock() + 8000, loginFlow: true });
      await live.client.logOut({ deadline: clock() + 8000 });
    } catch (e) {
      kino.log("logout on Telegram failed (" + errCode(e) + "): the session is deleted here anyway");
    }
  }
  qr = null;
  await close();
  await forgetAccount();
  remove(KEYS.login);
  return { message: t(had ? "logout.done" : "logout.none"), ...clear };
}
return { ACCOUNT_BUDGET, startQr, qrPoll, confirmPassword, logout };
})();

// ---- src/shell/b64.js ----
const __mod_src_shell_b64 = (() => {
// Hex to base64 without a JavaScript pass over the data. kino.crypto has no plain re-encoding, but AES-CTR XORs the
// data with a keystream fixed by its key and counter, so running it twice with the same key and counter gives the data
// back: the first pass reads hex and writes hex, the second reads that hex and writes base64. Both run natively in the
// app (javax.crypto there, node:crypto in the kit). The key is a constant: nothing here is secret, it is only a codec.
const { toBase64, fromHex } = __mod_src_mtproto_bytes;

const KEY = "00000000000000000000000000000000";
const IV = "00000000000000000000000000000000";
const pass = (dataHex, outputEncoding) =>
  kino.crypto.encrypt("aes-128-ctr", { key: KEY, keyEncoding: "hex", iv: IV, ivEncoding: "hex", data: dataHex, inputEncoding: "hex", outputEncoding });

/**
 * base64 of the bytes `hex` spells (even length, any case). Kino with apiVersion 13's `convert` re-encodes natively in
 * one call; an older Kino gets the two-CTR trick above.
 */
function hexToBase64Native(hex) {
  if (hex.length === 0) return "";
  if (typeof kino.crypto.convert === "function") return kino.crypto.convert(hex, "hex", "base64");
  return pass(pass(hex, "hex"), "base64");
}

/** base64 of `hex`, natively when it can, else with the JS codec (logged). */
function base64Of(hex) {
  try {
    return hexToBase64Native(hex);
  } catch (e) {
    kino.log("native base64 failed (" + (e && e.code) + "), using the JS codec");
    return toBase64(fromHex(hex));
  }
}
return { hexToBase64Native, base64Of };
})();

// ---- src/shell/read.js ----
const __mod_src_shell_read = (() => {
// The byteSource `read` export: { handle, offset, length } -> { bytes: base64 } of exactly min(length, size - offset)
// bytes. Kino's proxy asks 1 MiB at offsets that are multiples of 1 MiB, which is one upload.getFile; any other
// 4096-aligned range is split so no request crosses a 1 MiB boundary (Telegram's rule).
//
// The chunk never goes through a JavaScript loop here: getFile answers hex sliced out of the decrypted message, and
// hex becomes base64 with two native AES-CTR passes (b64.js). The JS passes left per chunk are upstream: the app's
// prelude decoding the WebSocket frame, and the transport's one toHex of it (src/mtproto/transport.js).
const { CHUNK } = __mod_src_mtproto_client;
const { fromHex } = __mod_src_mtproto_bytes;
const { credentials, withSession, saveSession, idleReset } = __mod_src_shell_live;
const { loadShell, rowFor, rowOf } = __mod_src_shell_library;
const { carry } = __mod_src_shell_enrich;
const { shellError } = __mod_src_shell_errors;
const { base64Of } = __mod_src_shell_b64;
const { newTrace, logRead, logReadFailure, logRecovery } = __mod_src_shell_timing;
const { isServerAnswer } = __mod_src_mtproto_errors;
const { big } = __mod_src_mtproto_big;

const AHEAD = 2;          // whole chunks requested right behind a read at a MiB offset (never past the end of the file)
const IDLE_RESET_MS = 20000; // no read for this long: the previous play's caches and connection are freed on the next
const SHORT_FLOOD_S = 5;     // a FLOOD_WAIT this short is waited out once inside the read (kino.sleep: 5 s at most)
const READ_BUDGET_MS = 17000; // everything a read does (getFile, refetch, retries) ends before this; Kino gives it 20 s
const MIN_LEFT_MS = 1500;     // a request is not started with less than this left

/** The getFile requests for [offset, offset + want): each a power of two times 4096, never across a 1 MiB boundary. */
function pieces(offset, want) {
  const out = [];
  let cur = offset;
  const end = offset + want;
  while (cur < end) {
    const room = (Math.floor(cur / CHUNK) + 1) * CHUNK - cur;
    let limit = 4096;
    while (limit < end - cur && limit < CHUNK) limit *= 2;
    while (limit > room) limit /= 2;
    out.push({ offset: cur, limit });
    cur += limit;
  }
  return out;
}

const locOf = (d) => ({ id: d.doc.id, accessHash: d.doc.accessHash, fileReference: fromHex(d.doc.fileReference), dcId: d.doc.dcId });


async function read(arg) {
  const started = Date.now();
  const { offset, length } = arg || {};
  try {
    return await readTimed(arg, started);
  } catch (e) {
    logReadFailure(e, { offset, length, started }); // the typed code and Telegram's RPC name: the phone log tells why
    throw e;
  }
}

async function readTimed(arg, started) {
  const { handle, offset, length } = arg || {};
  const trace = newTrace();
  if (typeof handle !== "string" || handle.length < 1 || handle.length > 512) throw shellError("invalid", "handle must be 1 to 512 characters");
  if (!Number.isSafeInteger(offset) || offset < 0 || offset % 4096 !== 0) throw shellError("invalid", "offset must be a non-negative multiple of 4096");
  if (!Number.isSafeInteger(length) || length < 1 || length > CHUNK) throw shellError("invalid", "length must be 1 to 1048576");
  const c = credentials();
  if (!c.complete) throw shellError("config");
  // A new play on the same runtime (Kino gives no "stream closed" hook): if the last read was long ago, drop the caches
  // and the connection the previous play left, so a second play does not start near the 64 MiB cap.
  await idleReset(IDLE_RESET_MS);
  let row = await rowFor(handle);
  const size = row.data.size;
  const want = Math.max(0, Math.min(length, size - offset));
  if (want === 0) return { bytes: "" };
  const deadline = started + READ_BUDGET_MS;
  // Every request carries the read's deadline (the client waits at most what is left of it, never starts one with
  // under 1.5 s left, and never waits for its turn past it), so connect + getFile + refetch + a retry fit inside it.
  let refetched = false, waited = false;
  let hex = "";
  let counted = 0; // what big.hold counted of `hex` (pieces of any size): given back exactly
  try {
    const list = pieces(offset, want);
    // The file's last chunk: Kino reads it early (after the first, for the index of an mp4 at its end), out of order;
    // it must not give up the chunks read ahead after the first one. Any other read gives up those it no longer wants.
    const tail = offset + CHUNK >= size;
    // Kino reads a file 1 MiB at a time, in order (after the first chunk and the last one): the next chunks are asked
    // together with this one, so their answers are already on the way when Kino asks for them.
    const ahead = list.length === 1 && offset % CHUNK === 0
      ? Array.from({ length: AHEAD }, (_, k) => offset + (k + 1) * CHUNK).filter((o) => o < size).map((o) => ({ offset: o, limit: CHUNK }))
      : [];
    const attempt = () => withSession(c, loadShell(c), async (live) => {
      big.releaseCounted(counted); // a second attempt starts over
      counted = 0;
      hex = "";
      for (const piece of list) {
        for (;;) {
          try {
            const tg = trace ? Date.now() : 0;
            if (trace) trace.tries++;
            const got = await live.client.getFile(locOf(row.data), piece.offset, piece.limit, { hex: true, deadline, trace, ahead: refetched ? [] : ahead, abandon: !tail });
            counted += big.hold(got.length); // the read's own copy, until it is base64 (the client hands it over uncounted)
            hex += got;
            if (trace) trace.getfile += Date.now() - tg;
            break;
          } catch (e) {
            const left = deadline - Date.now();
            if (!e || typeof e !== "object") throw e;
            if (e.code === "file_reference_expired" && !refetched && left > 2 * MIN_LEFT_MS) {
              refetched = true;
              const fresh = await live.discovery.refetch({ chatId: row.data.chatId, msgId: row.data.msgId }, { deadline });
              if (!fresh) {
                await kino.catalog.remove([row.id]);
                throw shellError("not_found", "the message is gone");
              }
              row = carry(row, rowOf(fresh)); // the TMDB answer stays with the row
              await kino.catalog.upsert([row]);
              continue;
            }
            if (e.code === "flood_wait" && !waited && e.seconds <= SHORT_FLOOD_S && left > e.seconds * 1000 + 2 * MIN_LEFT_MS) {
              waited = true;
              await kino.sleep(Math.max(0, e.seconds) * 1000);
              continue;
            }
            throw e;
          }
        }
      }
    }, { deadline });
    // A failure that leaves the connection in an unknown state (a protocol error, a closed socket, a timeout that is
    // not the read's own deadline, anything thrown that is not one of ours): everything is torn down, the client
    // reconnects with the stored key (no key exchange, no login) and the read is tried once more.
    try {
      await attempt();
    } catch (e) {
      // A dead key (auth_key_unregistered, a transport -404 included) is withSession's: one budgeted login, never a
      // second one here.
      const recoverable = !(e && e.shell) && !isServerAnswer(e) && !(e && e.code === "timeout" && e.deadline === true) && !(e && e.code === "auth_key_unregistered");
      if (!recoverable || deadline - Date.now() < 3 * MIN_LEFT_MS) throw e;
      logRecovery(e, { offset, length, started });
      if (trace) trace.recov++;
      const live = await (async () => { try { return await withSession(c, loadShell(c), async (l) => l, { deadline }); } catch { return null; } })();
      if (live) await live.client.reset();
      try {
        await attempt();
      } catch (e2) {
        // A second failure is the read's: as a typed error the app can show (the detail goes to the log line).
        if (e2 && typeof e2 === "object" && (e2.shell || isServerAnswer(e2) || e2.code === "timeout")) throw e2;
        throw Object.assign(shellError("unavailable", "read failed twice"), { cause: e2, detail: e2 });
      }
    }
  } catch (e) {
    big.releaseCounted(counted); // a read that failed lets its copy go
    counted = 0;
    hex = "";
    throw e;
  } finally {
    saveSession();
  }
  if (hex.length < want * 2) {
    big.releaseCounted(counted);
    throw shellError("unavailable", "short read: " + hex.length / 2 + " of " + want + " bytes");
  }
  const tb = trace ? Date.now() : 0;
  const bytes = base64Of(hex.length === want * 2 ? hex : hex.slice(0, want * 2));
  big.hold(bytes.length); big.release(bytes.length); // the answer, handed to Kino as the call returns
  big.releaseCounted(counted);
  counted = 0;
  hex = "";
  if (trace) { trace.b64 = Date.now() - tb; logRead(trace, { offset, length, bytes: want }); }
  return { bytes };
}
return { pieces, locOf, read };
})();

// ---- src/shell/image.js ----
const __mod_src_shell_image = (() => {
// The imageSource `image` export: { handle: "t:<row id>" } -> { bytes: base64, mime: "image/jpeg" }, Telegram's own
// thumbnail of the video (the type letter kept in the row's data.th), for a card TMDB has no poster for.
//
// The handle is only the catalog row id (it is readable in rows that sync): the document's id, access hash and file
// reference are looked up in this device's catalog. A picture never costs a login: without a stored login on this
// device the call fails soft (Kino shows the placeholder). It goes through the same client and the same serial queue as
// the video reads (so the 3-in-flight rule holds), with one upload.getFile of at most 256 KB, inside 8 s of Kino's 10.
const { credentials, connect, saveSession, hasStoredLogin } = __mod_src_shell_live;
const { loadShell, rowFor, rowOf } = __mod_src_shell_library;
const { carry } = __mod_src_shell_enrich;
const { locOf } = __mod_src_shell_read;
const { shellError } = __mod_src_shell_errors;
const { base64Of } = __mod_src_shell_b64;

const LIMIT = 262144;            // one request: Kino's 256 KB cap for a picture (and a valid getFile limit)
const IMAGE_BUDGET_MS = 8000;    // Kino gives image() 10 s; a timeout costs the plugin its sandbox
const HANDLE = /^t:(-?\d{1,20}:\d{1,10})$/;

async function image(arg) {
  const started = Date.now();
  const handle = arg && arg.handle;
  const m = typeof handle === "string" ? HANDLE.exec(handle) : null;
  if (!m) throw shellError("not_found", "unknown image handle");
  const c = credentials();
  if (!c.complete) throw shellError("config");
  let row = await rowFor(m[1]); // not_found when the video is gone or its channel is off
  if (!row.data.th) throw shellError("not_found", "no thumbnail");
  if (!hasStoredLogin(c)) throw shellError("unavailable", "no login on this device yet");
  const deadline = started + IMAGE_BUDGET_MS;
  let hex;
  try {
    const live = await connect(c, loadShell(c), { deadline, noLogin: true }); // never a login for a picture
    let refetched = false;
    for (;;) {
      try {
        hex = await live.client.getFile(locOf(row.data), 0, LIMIT, { hex: true, thumbSize: row.data.th.t, deadline });
        break;
      } catch (e) {
        if (e && e.code === "file_reference_expired" && !refetched && deadline - Date.now() > 3000) {
          refetched = true;
          const fresh = await live.discovery.refetch({ chatId: row.data.chatId, msgId: row.data.msgId }, { deadline });
          if (!fresh) {
            await kino.catalog.remove([row.id]);
            throw shellError("not_found", "the message is gone");
          }
          row = carry(row, rowOf(fresh));
          await kino.catalog.upsert([row]);
          if (!row.data.th) throw shellError("not_found", "no thumbnail");
          continue;
        }
        if (e && e.rpc === "LOCATION_INVALID") throw shellError("not_found", "no such thumbnail");
        throw e;
      }
    }
  } finally {
    saveSession();
  }
  if (!hex) throw shellError("not_found", "empty thumbnail");
  if (hex.length >= LIMIT * 2) throw shellError("unavailable", "thumbnail over 256 KB");
  if (!/^ffd8ff/i.test(hex)) throw shellError("unavailable", "thumbnail is not a JPEG");
  return { bytes: base64Of(hex), mime: "image/jpeg" };
}
return { image };
})();

// ---- src/plugin.js (entry) ----
// Video-Gram (id video-gram): a personal library of your Telegram videos for Kino. The person brings their own api_id/api_hash
// (my.telegram.org) and a bot (@BotFather) that administers their private channel(s); the plugin lists the channels'
// videos in Inicio and in search, and streams them through Kino's byteSource (`read`), seeking, Cast and DLNA included.
//
// Sources: src/mtproto/ (the MTProto client and the discovery), src/shell/ (this plugin). Built into one file by
// scripts/build.mjs (`npm run build`): the published plugin.js.
const { guard, shellError } = __mod_src_shell_errors;
const { credentials } = __mod_src_shell_live;
const { refresh, forget, homeRows, browsePage, searchPage, rowFor, loadShell, channelTabs, statusLines, posterFor, nowMs, freeSlots } = __mod_src_shell_library;
const { startQr, qrPoll, confirmPassword, logout } = __mod_src_shell_account;
const { read: readBytes } = __mod_src_shell_read;
const { image: imageBytes } = __mod_src_shell_image;
const { displayTitle, backdropOf } = __mod_src_shell_enrich;
const { t, videoCount, minutes } = __mod_src_shell_text;

const MIME_FIX = { "application/x-matroska": "video/x-matroska", "application/mp4": "video/mp4" };
const playableMime = (m) => {
  const x = String(m || "").toLowerCase();
  if (MIME_FIX[x]) return MIME_FIX[x];
  return /^(video|audio)\/[a-z0-9.+-]{1,60}$/.test(x) ? x : "video/mp4";
};
const CONTAINER = { "video/mp4": "mp4", "video/x-matroska": "matroska", "video/webm": "webm", "video/quicktime": "mov", "video/x-msvideo": "avi" };

export async function home() {
  await null;
  const started = nowMs();
  try {
    return await homeRows(await refresh(), started);
  } catch (e) {
    kino.log("home failed: " + (e && e.code ? e.code : "error"));
    return [{ id: "notice", title: t("row.notice"), items: [{ id: "setup-unavailable", ref: "setup:unavailable", title: t("setup.unavailable"), kind: "movie" }] }];
  }
}

export async function search(query) {
  return guard(() => searchPage(query || {}));
}

export async function browse(ref, cursor) {
  return guard(() => browsePage(ref, cursor));
}

export async function resolve(ref) {
  return guard(async () => {
    if (typeof ref === "string" && ref.startsWith("setup:")) {
      let kind = ref.slice(6);
      const seconds = secondsLeft(kind);
      if ((kind === "flood" || kind === "budget") && seconds === undefined) kind = "unavailable"; // the wait is over
      throw shellError(["config", "token", "api_id", "flood", "budget", "signin", "closed"].includes(kind) ? kind : "unavailable", "setup notice", { seconds });
    }
    if (!credentials().complete) throw shellError("config");
    const row = await rowFor(ref);
    const d = row.data;
    const mime = playableMime(d.mime);
    const stream = { source: "plugin", handle: row.id, size: d.size, mime };
    if (d.duration > 0) stream.durationMs = Math.round(d.duration * 1000);
    const media = { title: displayTitle(d, row.title).slice(0, 120), sizeBytes: d.size };
    if (CONTAINER[mime]) media.container = CONTAINER[mime];
    if (d.width > 0 && d.height > 0) media.video = { width: d.width, height: d.height };
    stream.media = media;
    return stream;
  });
}

function secondsLeft(kind) {
  const e = loadShell(credentials()).error;
  return e && e.kind === kind && e.until && e.until > Date.now() ? Math.max(1, Math.ceil((e.until - Date.now()) / 1000)) : undefined;
}

export async function read(arg) {
  return guard(() => readBytes(arg));
}

/** imageSource: Telegram's thumbnail of a video TMDB has no poster for ({ handle: "t:<row id>" }). */
export async function image(arg) {
  return guard(() => imageBytes(arg));
}

export async function details(ref) {
  return guard(async () => {
    if (typeof ref !== "string" || ref.startsWith("setup:")) return null;
    let row;
    try { row = await rowFor(ref); } catch { return null; }
    const out = {};
    const tm = row.data.tm;
    if (tm && tm.o) out.overview = tm.o;
    else if (row.data.caption) out.overview = row.data.caption;
    const year = tm && tm.y ? tm.y : row.data.n && row.data.n.year ? String(row.data.n.year) : null;
    if (year) out.year = year;
    const poster = posterFor(row);
    if (poster) out.poster = poster;
    const backdrop = backdropOf(row);
    if (backdrop) out.backdrop = backdrop;
    if (row.data.duration > 0) out.runtimeMinutes = Math.min(1000, Math.max(1, Math.round(row.data.duration / 60)));
    return Object.keys(out).length ? out : null;
  });
}

export async function section({ tab } = {}) {
  return guard(async () => {
    const shell = loadShell(credentials());
    const channels = channelTabs(shell).slice(0, 7);
    const tabs = [{ id: "recent", label: t("tab.recent") }, ...channels.map((c) => ({ id: "c" + c.chatId, label: c.title.slice(0, 24) }))];
    const chosen = tabs.some((x) => x.id === tab) ? tab : "recent";
    const ref = chosen === "recent" ? "recent" : "chan:" + chosen.slice(1);
    const page = await browsePage(ref, null);
    const title = chosen === "recent" ? t("row.recent") : (channels.find((c) => "c" + c.chatId === chosen) || {}).title || t("row.recent");
    return { tabs, tab: chosen, rows: page.items.length ? [{ id: chosen, title, ref, items: page.items }] : [] };
  });
}

export async function categories() {
  return guard(async () => channelTabs(loadShell(credentials())).map((c) => ({ id: "c" + c.chatId, title: c.title.slice(0, 40), ref: "chan:" + c.chatId })));
}

export async function settingsStatus() {
  return guard(async () => {
    const login = await qrPoll(); // account mode: the QR to draw and how the login goes (asks Telegram only when due)
    const out = statusLines();
    if (login.status) out.account_status = login.status;
    if (login.qr) out.login_qr = login.qr;
    return out;
  });
}

export async function action(key) {
  return guard(async () => {
    if (key === "qr_login") return { message: await startQr() };
    if (key === "check_password") return confirmPassword();
    if (key === "logout") return logout();
    if (key === "free_slots") {
      const n = freeSlots();
      return { message: n ? t("free.done", { n }) : t("free.none") };
    }
    if (key === "forget") {
      await forget();
      return { message: t("action.forgot") };
    }
    if (key !== "refresh") return null;
    const { shell, added, problem } = await refresh({ force: true });
    if (problem) {
      if (problem.kind === "flood" || problem.kind === "budget") return { message: t(problem.kind === "flood" ? "setup.flood" : "setup.budget", { min: minutes((problem.until - Date.now()) / 1000) }) };
      const key2 = { config: credentials().mode === "account" ? "setup.configAccount" : "setup.config", token: "setup.token", api_id: "setup.apiId", network: "setup.network", signin: "setup.signin", closed: "setup.closed" }[problem.kind] || "setup.unavailable";
      return { message: t(key2) };
    }
    return { message: t("action.refreshed", { count: videoCount(shell.count), added }) };
  });
}

export async function validateSettings(values) {
  await null;
  const v = values || {};
  const out = {};
  if (v.api_id !== undefined && !/^\d{3,12}$/.test(String(v.api_id).trim())) out.api_id = t("validate.apiId");
  if (v.api_hash !== undefined && !/^[0-9a-fA-F]{32}$/.test(String(v.api_hash).trim())) out.api_hash = t("validate.apiHash");
  const account = v.access === "account";
  if (!account && (v.bot_token === undefined || !String(v.bot_token).trim())) out.bot_token = t("validate.tokenNeeded");
  else if (v.bot_token !== undefined && String(v.bot_token).trim() && !/^\d{3,15}:[A-Za-z0-9_-]{20,80}$/.test(String(v.bot_token).trim())) out.bot_token = t("validate.token");
  return Object.keys(out).length ? out : null;
}


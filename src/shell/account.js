// Account mode's sign-in, from the setup screen only (there is no login in the background):
//   - "Iniciar sesión con QR" (the qr_login event) asks Telegram for a login token (auth.exportLoginToken, with the
//     person's api_id and api_hash). The screen draws it as tg://login?token=<base64url> with Kino's countdown, for the
//     person to scan with the OFFICIAL Telegram app (Settings ▸ Devices ▸ Link Desktop Device), which shows whose account
//     is linked and asks to confirm. The screen's tick and the code's own renew event call qrPoll(); this module then asks
//     Telegram again when the token is close to expiring (about 30 s) or 10 s went by: that answer is a new token, or the
//     login (auth.loginTokenSuccess, or auth.loginTokenMigrateTo, followed by the client). The window closes after 150 s.
//   - A 2FA account answers SESSION_PASSWORD_NEEDED: the person types the password in the screen's masked field
//     (`obscureText`) and submits; confirmPassword() gets it as an argument for that one call (SRP, src/mtproto/srp.js,
//     auth.checkPassword). Kino empties the field when the call ends; the plugin never stores it, never logs it, never
//     puts it in a row, an error or the screen's state.
//   - "Cerrar sesión" (the logout event): auth.logOut (best effort), then the session, the account's index and its catalog
//     rows are deleted on this device.
// The login token is never logged and never stored (tg.qr keeps only { fp, stage, until }).
import { credentials, connect, saveSession, loginBlocked, recordLoginFailure, markLoggedIn, hasStoredLogin, sessionFp, close } from "./live.js";
import { KEYS, readJson, writeJson, remove, kinoStore } from "./store.js";
import { loginBudget } from "../mtproto/client.js";
import { toBase64 } from "../mtproto/bytes.js";
import { t, minutes } from "./text.js";
import { loadShell, forgetAccount } from "./library.js";

const QR_WINDOW_MS = 150000;  // how long a QR login stays open after the person pressed the button
const POLL_MS = 10000;        // ask Telegram again at least this often while the QR is shown
const RENEW_MS = 8000;        // ...and when the token has less than this left
const CALL_MS = 7000;         // one poll inside a screen call's 20 s
const ACTION_MS = 20000;      // one button inside a screen call's 20 s
/** QR logins per device and hour (each press of the button). */
export const ACCOUNT_BUDGET = Object.freeze({ key: KEYS.accountLogins, max: 5, what: "account logins" });

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
export async function startQr() {
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
export async function qrPoll() {
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
  return qr ? { qr: qr.url, expiresInMs: Math.max(1000, qr.expiresAt - now), status: t("qr.waiting") } : { status: t("qr.waiting") };
}

/** The 2FA password step: the password the person typed in the screen's masked field, used once and never kept anywhere. */
export async function confirmPassword(typed) {
  const c = credentials();
  if (c.mode !== "account" || !c.complete) return { message: t("qr.botMode") };
  const st = readJson(KEYS.qr);
  if (!st || st.fp !== sessionFp(c) || st.stage !== "password") return { message: t(hasStoredLogin(c) ? "qr.already" : "pw.notNeeded") };
  if (typeof typed !== "string" || !typed) return { message: t("pw.empty") };
  const now = clock();
  try {
    const live = await connect(c, loadShell(c), { deadline: now + ACTION_MS, loginFlow: true });
    await live.client.checkPassword(typed, { deadline: now + ACTION_MS });
    done();
    return { message: t("qr.done") };
  } catch (e) {
    const code = errCode(e);
    kino.log("password check: " + code);
    if (code === "password_invalid") return { message: t("pw.wrong") };
    if (code === "login_budget") return { message: t("pw.budget", { min: minutes(e.seconds) }) };
    if (code === "flood_wait") { recordLoginFailure(c, e); return { message: t("setup.flood", { min: minutes(e.seconds) }) }; }
    return { message: t("qr.failed") };
  }
}

/** The logout action: auth.logOut when there is a session (best effort), then everything of the account goes. */
export async function logout() {
  const c = credentials();
  if (c.mode !== "account") return { message: t("logout.none") };
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
  return { message: t(had ? "logout.done" : "logout.none") };
}

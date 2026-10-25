// What reaches Kino when something fails: always a kino.error with one of its codes, an English detail made only of
// codes and numbers (never a message from elsewhere, so never a secret), and the person's sentence in their language.
import { t, minutes } from "./text.js";

/** A failure the shell understands: `kind` is config | token | api_id | flood | budget | signin | closed | not_found | invalid | network | unavailable. */
export function shellError(kind, detail = "", extra = {}) {
  const e = new Error(kind + (detail ? " " + detail : ""));
  e.shell = kind;
  Object.assign(e, extra);
  return e;
}

/** A core error (src/mtproto/errors.js codes) as the shell's kind. */
export function kindOf(e) {
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
export function toKinoError(e) {
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
export async function guard(fn) {
  await null; // the first await before anything that can throw (README: Kino 0.9.49 and older)
  try {
    return await fn();
  } catch (e) {
    throw toKinoError(e);
  }
}

// What the setup screen accepts for the three secrets, one rule each: the screen's Form checks them with these patterns
// (Kino's own matcher) before any code runs, and the connect event checks them again with the same source.
import { t } from "./text.js";

/** Kino's pattern subset: a plain regular expression source that matches the whole value. */
export const PATTERNS = Object.freeze({
  api_id: "^[0-9]{3,12}$",
  api_hash: "^[0-9a-fA-F]{32}$",
  bot_token: "^[0-9]{3,15}:[A-Za-z0-9_-]{20,80}$",
});
const RULES = Object.fromEntries(Object.entries(PATTERNS).map(([k, v]) => [k, new RegExp(v)]));
const looksLikeHash = (v) => /^[0-9a-fA-F]{32}$/.test(v);
const looksLikeId = (v) => /^[0-9]{3,12}$/.test(v);

/**
 * The text that says why `value` is not a good `key` (api_id, api_hash or bot_token), or null when it is good. A value
 * that is another field's kind says so: the usual mistake is pasting the api_hash where the api_id goes.
 */
export function problemWith(key, value) {
  const v = String(value ?? "").trim();
  if (!v || RULES[key].test(v)) return null;
  if (key === "api_id") return looksLikeHash(v) ? t("validate.apiIdSwapped") : t("validate.apiId");
  if (key === "api_hash") return looksLikeId(v) ? t("validate.apiHashSwapped") : t("validate.apiHash");
  return looksLikeHash(v) ? t("validate.tokenSwapped") : t("validate.token");
}

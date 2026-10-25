// Text from Telegram (file names, captions, channel titles) is the sender's: it may carry control characters or
// Unicode direction overrides that would make a title read as something else on screen. They are removed before the
// text reaches a catalog row or anything Kino shows: C0 and C1 controls, the bidi embeddings/overrides U+202A-U+202E,
// the isolates U+2066-U+2069 and the marks U+200E/U+200F.
const HOSTILE = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/** `s` without control or direction characters (each becomes a space; runs of spaces are folded by the callers). */
export const cleanText = (s) => String(s ?? "").replace(HOSTILE, " ");

/** Cleaned, whitespace folded, trimmed and cut to `n` characters without splitting a surrogate pair. */
export function clip(s, n) {
  let x = cleanText(s).replace(/\s+/g, " ").trim().slice(0, n);
  if (/[\uD800-\uDBFF]$/.test(x)) x = x.slice(0, -1);
  return x;
}

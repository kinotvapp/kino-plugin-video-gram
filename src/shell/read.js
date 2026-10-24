// The byteSource `read` export: { handle, offset, length } -> { bytes: base64 } of exactly min(length, size - offset)
// bytes. Kino's proxy asks 1 MiB at offsets that are multiples of 1 MiB, which is one upload.getFile; any other
// 4096-aligned range is split so no request crosses a 1 MiB boundary (Telegram's rule).
//
// The chunk never goes through a JavaScript loop here: getFile answers hex sliced out of the decrypted message, and
// hex becomes base64 with two native AES-CTR passes (b64.js). The JS passes left per chunk are upstream: the app's
// prelude decoding the WebSocket frame, and the transport's one toHex of it (src/mtproto/transport.js).
import { CHUNK } from "../mtproto/client.js";
import { toBase64, fromHex } from "../mtproto/bytes.js";
import { credentials, withSession, saveSession } from "./live.js";
import { loadShell, rowFor, rowOf } from "./library.js";
import { shellError } from "./errors.js";
import { hexToBase64Native } from "./b64.js";

const SHORT_FLOOD_S = 5;     // a FLOOD_WAIT this short is waited out once inside the read (kino.sleep: 5 s at most)
const READ_BUDGET_MS = 17000; // everything a read does (getFile, refetch, retries) ends before this; Kino gives it 20 s
const PER_CALL_MS = 9000;     // the longest one request may wait, when the budget still allows it
const MIN_LEFT_MS = 1500;     // a request is not started with less than this left

/** The getFile requests for [offset, offset + want): each a power of two times 4096, never across a 1 MiB boundary. */
export function pieces(offset, want) {
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

function base64Of(hex) {
  try {
    return hexToBase64Native(hex);
  } catch (e) {
    kino.log("native base64 failed (" + (e && e.code) + "), using the JS codec");
    return toBase64(fromHex(hex));
  }
}

export async function read(arg) {
  const started = Date.now();
  const { handle, offset, length } = arg || {};
  if (typeof handle !== "string" || handle.length < 1 || handle.length > 512) throw shellError("invalid", "handle must be 1 to 512 characters");
  if (!Number.isSafeInteger(offset) || offset < 0 || offset % 4096 !== 0) throw shellError("invalid", "offset must be a non-negative multiple of 4096");
  if (!Number.isSafeInteger(length) || length < 1 || length > CHUNK) throw shellError("invalid", "length must be 1 to 1048576");
  const c = credentials();
  if (!c.complete) throw shellError("config");
  let row = await rowFor(handle);
  const size = row.data.size;
  const want = Math.max(0, Math.min(length, size - offset));
  if (want === 0) return { bytes: "" };
  const deadline = started + READ_BUDGET_MS;
  // Each request waits at most what is left of the read's budget, so getFile + refetch + a retry fit inside it.
  const budget = (live) => {
    const left = deadline - Date.now();
    if (left < MIN_LEFT_MS) throw shellError("network", "read budget spent");
    live.client.timeoutMs = Math.min(PER_CALL_MS, left - 500);
  };
  let refetched = false, waited = false;
  let hex = "";
  try {
    await withSession(c, loadShell(c), async (live) => {
      hex = "";
      for (const piece of pieces(offset, want)) {
        for (;;) {
          budget(live);
          try {
            hex += await live.client.getFile(locOf(row.data), piece.offset, piece.limit, { hex: true });
            break;
          } catch (e) {
            const left = deadline - Date.now();
            if (e.code === "file_reference_expired" && !refetched && left > 2 * MIN_LEFT_MS) {
              refetched = true;
              budget(live);
              const fresh = await live.discovery.refetch({ chatId: row.data.chatId, msgId: row.data.msgId });
              if (!fresh) {
                await kino.catalog.remove([row.id]);
                throw shellError("not_found", "the message is gone");
              }
              row = rowOf(fresh);
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
    });
  } finally {
    saveSession();
  }
  if (hex.length < want * 2) throw shellError("unavailable", "short read: " + hex.length / 2 + " of " + want + " bytes");
  return { bytes: base64Of(hex.length === want * 2 ? hex : hex.slice(0, want * 2)) };
}

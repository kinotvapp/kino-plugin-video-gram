// The byteSource `read` export: { handle, offset, length } -> { bytes: base64 } of exactly min(length, size - offset)
// bytes. Kino's proxy asks 1 MiB at offsets that are multiples of 1 MiB, which is one upload.getFile; any other
// 4096-aligned range is split so no request crosses a 1 MiB boundary (Telegram's rule).
//
// The chunk never goes through a JavaScript loop here: getFile answers hex sliced out of the decrypted message, and
// hex becomes base64 with two native AES-CTR passes (b64.js). The JS passes left per chunk are upstream: the app's
// prelude decoding the WebSocket frame, and the transport's one toHex of it (src/mtproto/transport.js).
import { CHUNK } from "../mtproto/client.js";
import { fromHex } from "../mtproto/bytes.js";
import { credentials, withSession, saveSession } from "./live.js";
import { loadShell, rowFor, rowOf } from "./library.js";
import { carry } from "./enrich.js";
import { shellError } from "./errors.js";
import { base64Of } from "./b64.js";
import { newTrace, logRead, logReadFailure, logRecovery } from "./timing.js";
import { isServerAnswer } from "../mtproto/errors.js";
import { big } from "../mtproto/big.js";

const AHEAD = 2;          // whole chunks requested right behind a read at a MiB offset (never past the end of the file)
const SHORT_FLOOD_S = 5;     // a FLOOD_WAIT this short is waited out once inside the read (kino.sleep: 5 s at most)
const READ_BUDGET_MS = 17000; // everything a read does (getFile, refetch, retries) ends before this; Kino gives it 20 s
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

export const locOf = (d) => ({ id: d.doc.id, accessHash: d.doc.accessHash, fileReference: fromHex(d.doc.fileReference), dcId: d.doc.dcId });


export async function read(arg) {
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

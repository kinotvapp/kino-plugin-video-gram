// The imageSource `image` export: { handle: "t:<row id>" } -> { bytes: base64, mime: "image/jpeg" }, Telegram's own
// thumbnail of the video (the type letter kept in the row's data.th), for a card TMDB has no poster for.
//
// The handle is only the catalog row id (it is readable in rows that sync): the document's id, access hash and file
// reference are looked up in this device's catalog. A picture never costs a login: without a stored login on this
// device the call fails soft (Kino shows the placeholder). It goes through the same client and the same serial queue as
// the video reads (so the 3-in-flight rule holds), with one upload.getFile of at most 256 KB, inside 8 s of Kino's 10.
import { credentials, connect, saveSession, hasStoredLogin } from "./live.js";
import { loadShell, rowFor, rowOf } from "./library.js";
import { carry } from "./enrich.js";
import { locOf } from "./read.js";
import { shellError } from "./errors.js";
import { base64Of } from "./b64.js";

const LIMIT = 262144;            // one request: Kino's 256 KB cap for a picture (and a valid getFile limit)
const IMAGE_BUDGET_MS = 8000;    // Kino gives image() 10 s; a timeout costs the plugin its sandbox
const HANDLE = /^t:(-?\d{1,20}:\d{1,10})$/;

export async function image(arg) {
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
    const live = await connect(c, loadShell(c), { deadline });
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

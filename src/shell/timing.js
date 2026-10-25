// Timing lines for the device logs (Kino's "Registro" and logcat KinoPlugin/<id>): one line per read and per refresh,
// numbers and short codes only. Never a setting, a key, an id, a file reference or any data. Set TIMING to false to
// switch them off (the core then gets no trace and measures nothing).
import { describeError } from "../mtproto/errors.js";
export const TIMING = true;

/** A read's trace: every field is a duration in ms or a count; the core adds to it (src/mtproto/*). */
export const newTrace = () => (TIMING ? { start: Date.now(), queue: 0, sentAt: 0, firstFrameAt: 0, wsrecv: 0, frames: 0, frameBytes: 0, tohex: 0, ctr: 0, ige: 0, mac: 0, gunzip: 0, parse: 0, getfile: 0, b64: 0, tries: 0, pipe: "miss", ahead: 0, recov: 0 } : undefined);

const n = (v) => (Number.isFinite(v) ? Math.round(v) : 0);

/** `read off=<offset> len=<asked> bytes=<answered> total=<ms> queue=… net=… wsrecv=… frames=… framebytes=… tohex=… ctr=… ige=… mac=… gunzip=… parse=… getfile=… b64=… tries=… pipe=hit|miss ahead=<n>` */
export function logRead(trace, { offset, length, bytes }) {
  if (!trace) return;
  const net = trace.sentAt && trace.firstFrameAt ? trace.firstFrameAt - trace.sentAt : 0;
  kino.log(`read off=${n(offset)} len=${n(length)} bytes=${n(bytes)} total=${n(Date.now() - trace.start)} queue=${n(trace.queue)} net=${n(net)} wsrecv=${n(trace.wsrecv)} frames=${n(trace.frames)} framebytes=${n(trace.frameBytes)} tohex=${n(trace.tohex)} ctr=${n(trace.ctr)} ige=${n(trace.ige)} mac=${n(trace.mac)} gunzip=${n(trace.gunzip)} parse=${n(trace.parse)} getfile=${n(trace.getfile)} b64=${n(trace.b64)} tries=${n(trace.tries)} pipe=${trace.pipe === "hit" ? "hit" : "miss"} ahead=${n(trace.ahead)} recov=${n(trace.recov)}`);
}

const word = (v, re) => (typeof v === "string" && re.test(v) ? v : "-");

/** One warn line per failed read (always on, also with TIMING off): the typed code and Telegram's RPC name, or what was thrown. */
export function logReadFailure(e, { offset, length, started }) {
  const what = e && typeof e === "object" && e.detail !== undefined ? e.detail : e;
  console.warn(`read failed off=${n(offset)} len=${n(length)} ms=${n(Date.now() - started)} ${describeError(what)}`);
}

/** One warn line when a read tears the connection down and tries once more. */
export function logRecovery(e, { offset, length, started }) {
  console.warn(`read recovering off=${n(offset)} len=${n(length)} ms=${n(Date.now() - started)} ${describeError(e)}`);
}

/** `refresh total=… connect=… login=<new|reused|-> loginms=… pages=… disc=… upsert=… purge=… added=… incomplete=0|1 result=<ok|code>` */
export function logRefresh(r) {
  if (!TIMING) return;
  kino.log(`refresh total=${n(r.total)} connect=${n(r.connect)} login=${word(r.login, /^(new|reused|-)$/)} loginms=${n(r.loginms)} pages=${n(r.pages)} disc=${n(r.disc)} upsert=${n(r.upsert)} purge=${n(r.purge)} added=${n(r.added)} incomplete=${r.incomplete ? 1 : 0} result=${word(r.result, /^[a-z_]{1,40}$/)}`);
}

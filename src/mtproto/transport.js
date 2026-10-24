// Obfuscated "intermediate" MTProto transport over kino.ws, as the spike's Transport (mtproto.mjs) did over Node's
// WebSocket: a 64-byte random init whose tail is encrypted, then packets `len:uint32le payload`, the whole stream in
// each direction under one AES-256-CTR keystream that continues across messages.
//
// kino.crypto's CTR is one-shot (key + iv in, bytes out), so CtrStream keeps the stream position itself: the byte at
// stream offset k uses counter block iv + floor(k / 16), so a message starting at offset k is encrypted as
// (k % 16 zero bytes + data) under iv + floor(k / 16) and the k % 16 prefix bytes are dropped.
import { toHex, fromHex, readU32LE, writeU32LE, random, reversed } from "./bytes.js";
import { ctrHex } from "./crypto.js";
import { mtError } from "./errors.js";

export const DC_HOSTS = Object.freeze({ 1: "pluto", 2: "venus", 3: "aurora", 4: "vesta", 5: "flora" });
export const MAX_SEND_BYTES = 786000; // kino.ws frame cap
const MASK128 = (1n << 128n) - 1n;
const ZEROS = "00".repeat(16);

export function dcUrl(dc) {
  const host = DC_HOSTS[dc];
  if (!host) throw mtError("invalid_request", "unknown DC " + dc);
  return "wss://" + host + ".web.telegram.org/apiws";
}

export class CtrStream {
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
export function makeInit(dc, rand = random) {
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

export class Transport {
  /** `open` is kino.ws.open (injectable for tests); `url` defaults to the DC's apiws address. */
  constructor(dc, { url, open } = {}) {
    this.dc = dc;
    this.url = url || dcUrl(dc);
    this.wsOpen = open || ((u, o) => kino.ws.open(u, o));
    this.ws = null;
    this.bufHex = "";
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
    const len = new Uint8Array(4);
    writeU32LE(len, 0, payloadHex.length / 2);
    let wire = this.enc.processHex(toHex(len) + payloadHex);
    if (this.firstHex) { wire = this.firstHex + wire; this.firstHex = null; }
    if (wire.length / 2 > MAX_SEND_BYTES) throw mtError("invalid_request", "packet too large for one frame");
    try {
      await this.ws.send(fromHex(wire));
    } catch (e) {
      this.closed = true;
      throw mtError("closed", "send failed: " + (e && e.message), { cause: e && e.code });
    }
  }

  /** The next packet's payload as hex. Throws `timeout` after `timeoutMs`, `closed` when the socket ends. */
  async recvHex(timeoutMs = 20000, now = () => Date.now()) {
    const deadline = now() + timeoutMs;
    for (;;) {
      if (this.bufHex.length >= 8) {
        const n = readU32LE(fromHex(this.bufHex.slice(0, 8)), 0) & 0x7fffffff;
        if (this.bufHex.length >= 8 + n * 2) {
          const payload = this.bufHex.slice(8, 8 + n * 2);
          this.bufHex = this.bufHex.slice(8 + n * 2);
          return payload;
        }
      }
      if (this.closed || !this.ws) throw mtError("closed", "transport closed");
      const left = deadline - now();
      if (left <= 0) throw mtError("timeout", "no answer from DC " + this.dc);
      let frame;
      try {
        frame = await this.ws.recv(Math.min(left, 60000));
      } catch (e) {
        this.closed = true;
        throw mtError(e && e.code === "limit" ? "protocol" : "closed", "socket closed: " + (e && e.message), { cause: e && e.code });
      }
      if (frame === null) continue;
      this.bufHex += this.dec.processHex(toHex(frame));
    }
  }

  async close() {
    this.closed = true;
    const ws = this.ws;
    this.ws = null;
    if (ws) { try { await ws.close(); } catch { /* already closed */ } }
  }
}

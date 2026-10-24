// The encrypted MTProto 2.0 session on top of an auth key, ported from the spike's Session (session.mjs): msg_key and
// AES key derivation with sha256, containers, gzip_packed, new_session_created, bad_server_salt (resend), plus what a
// long-lived phone session needs: bad_msg_notification time/seqno fixes, msgs_ack for the server's content messages,
// and a deadline per call.
//
// Bytes stay hex from the socket to the decrypted plaintext: kino.ws hands a Uint8Array, the transport turns it into
// hex once (one JS pass), CTR, IGE and the msg_key hash run natively on hex strings, and only the message body is
// turned back into a Uint8Array (a second JS pass) for the TL reader.
import { toHex, fromHex, random, readI32LE } from "./bytes.js";
import { sha256Hex, igeEncryptHex, igeDecryptHex, gunzipHex } from "./crypto.js";
import { Writer, Reader, CTOR, msgsAck, parseRpcError } from "./tl.js";
import { MsgIds } from "./msgid.js";
import { mtError, fromRpcError, fromTransportError } from "./errors.js";

const MAX_RESENDS = 5;
const protocol = (m) => mtError("protocol", m);

export class Session {
  /**
   * `state` is { authKey, authKeyId, serverSalt (Uint8Array), timeOffset (s) }: the session updates its salt and time
   * offset in place, so whoever owns `state` can persist them. `onUpdate(body)` gets every message that is not an answer
   * to a call (updates and other constructors this layer does not know).
   */
  constructor(transport, state, { now = () => Date.now(), timeoutMs = 20000, onUpdate = null, log = () => {} } = {}) {
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

  /** One transport packet -> its message [{ id, seqno, body }] (empty when it belongs to one of our older sessions). */
  async recvMessages(deadline) {
    const hex = await this.t.recvHex(Math.max(1, deadline - this.now()), this.now);
    if (hex.length === 8) throw fromTransportError(readI32LE(fromHex(hex), 0));
    if (hex.length < 48 + 64) throw protocol("short packet");
    if (hex.slice(0, 16) !== this.akId) throw protocol("answer under another auth key");
    const msgKey = hex.slice(16, 48);
    const encHex = hex.slice(48);
    if ((encHex.length / 2) % 16 !== 0) throw protocol("encrypted data not a multiple of 16");
    const { key, iv } = this.keyIv(msgKey, 8);
    const plainHex = igeDecryptHex(encHex, key, iv);
    if (sha256Hex(this.ak.slice(192, 256) + plainHex).slice(16, 48) !== msgKey) throw protocol("msg_key mismatch");
    const sid = plainHex.slice(16, 32);
    if (sid !== this.sessionId) {
      if (this.oldSessions.has(sid)) { this.log("message for an older session ignored"); return []; }
      throw protocol("answer for another session");
    }
    const h = new Reader(fromHex(plainHex.slice(32, 64)));
    const id = h.long(), seqno = h.int(), len = h.int();
    const total = plainHex.length / 2;
    const padding = total - 32 - len;
    if (len % 4 !== 0 || padding < 12 || padding > 1024) throw protocol("bad message length");
    return [{ id, seqno, body: fromHex(plainHex.slice(64, 64 + len * 2)) }];
  }

  /**
   * Sends `body` and waits for its rpc_result: answers the result's bytes (unzipped), throws the rpc_error as a typed
   * error (errors.js), `timeout` past the deadline, `bad_msg` when the server keeps refusing the message.
   */
  async call(body, { timeoutMs = this.timeoutMs } = {}) {
    await this.flushAcks();
    const deadline = this.now() + timeoutMs;
    let reqId = await this.send(body);
    let resends = 0;
    const resend = async (why) => {
      if (++resends > MAX_RESENDS) throw mtError("bad_msg", "the server keeps refusing the message (" + why + ")", { badMsgCode: why });
      reqId = await this.send(body);
    };
    for (;;) {
      if (this.now() >= deadline) throw mtError("timeout", "no answer in " + timeoutMs + " ms");
      const queue = await this.recvMessages(deadline);
      while (queue.length) {
        const m = queue.shift();
        if (m.seqno & 1) this.pendingAcks.push(m.id);
        const r = new Reader(m.body);
        const ctor = r.int();
        switch (ctor) {
          case CTOR.msgContainer: {
            const n = r.int();
            for (let i = 0; i < n; i++) {
              const id = r.long(), seqno = r.int(), len = r.int();
              queue.push({ id, seqno, body: r.raw(len) });
            }
            break;
          }
          case CTOR.gzipPacked:
            queue.unshift({ id: m.id, seqno: 0, body: fromHex(gunzipHex(toHex(r.bytes()))) });
            break;
          case CTOR.newSessionCreated:
            r.long(); r.long();
            this.state.serverSalt = r.raw(8).slice();
            break;
          case CTOR.badServerSalt: {
            const bad = r.long(); r.int(); r.int();
            this.state.serverSalt = r.raw(8).slice();
            if (bad === reqId) await resend(48);
            break;
          }
          case CTOR.badMsgNotification: {
            const bad = r.long(); r.int();
            const code = r.int();
            if (bad !== reqId) break;
            if (code === 16 || code === 17) {
              // The server's own msg_id carries its clock. Ids made under the old offset may be far ahead (17), and
              // MsgIds only ever goes up: drop that floor and start a new session so the next ids follow the new clock.
              this.state.timeOffset = Number(m.id >> 32n) - Math.floor(this.now() / 1000);
              this.msgIds.last = 0n;
              this.newSession();
              await resend(code);
            } else if (code === 32 || code === 33) {
              this.newSession();
              await resend(code);
            } else {
              throw mtError("bad_msg", "bad_msg_notification " + code, { badMsgCode: code });
            }
            break;
          }
          case CTOR.rpcResult: {
            const to = r.long();
            if (to !== reqId) break; // a late answer to an earlier call
            let result = r.rest();
            if (result.length >= 4 && new Reader(result).int() === CTOR.gzipPacked) result = fromHex(gunzipHex(toHex(new Reader(result, 4).bytes())));
            if (result.length >= 4 && new Reader(result).int() === CTOR.rpcError) throw fromRpcError(parseRpcError(new Reader(result)));
            return result;
          }
          case CTOR.msgsAck:
          case CTOR.pong:
          case CTOR.msgDetailedInfo:
          case CTOR.msgNewDetailedInfo:
          case CTOR.futureSalts:
            break;
          default:
            if (this.onUpdate) { try { this.onUpdate(m.body); } catch (e) { this.log("onUpdate failed: " + (e && e.message)); } }
        }
      }
    }
  }
}

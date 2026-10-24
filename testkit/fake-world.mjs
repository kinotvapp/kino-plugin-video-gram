// A fake Telegram world for the discovery tests, seen from a bot: channels where it is admin, private chats with it,
// and the update boxes. Plug it into the fake DC as `tg.api = world`: it answers updates.getState, updates.getDifference,
// updates.getChannelDifference, channels.getMessages and messages.getMessages with bytes from the independent test
// serializer (tl-serializer.mjs), never with the production code.
//
// Model (shaped after what was measured live, see the 7b-1 brief): the common box has a pts starting at 1; each event
// moves it by one. Channel events (new, edit, delete, a channel becoming known) are mirrored into the common box, as
// Telegram did for the bot (getDifference from pts 1 carried UpdateNewChannelMessage + UpdateChannel). Each channel has
// its own pts, also from 1. Answers are paginated (`diffPage`, `channelPage`) so the client must loop. One-shot
// switches: `tooLongOnce` (differenceTooLong), `channel.tooLongOnce` (channelDifferenceTooLong).
import * as S from "./tl-serializer.mjs";

const clone = (v) => JSON.parse(JSON.stringify(v, (k, x) => (typeof x === "bigint" ? { $big: x.toString() } : x)), (k, x) => (x && typeof x === "object" && "$big" in x ? BigInt(x.$big) : x));
const refOf = (n) => Buffer.from([n & 255, (n >> 8) & 255, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0x01]);

export class FakeBotWorld {
  constructor({ date = 1729700000, diffPage = 3, channelPage = 2 } = {}) {
    this.now = date;
    this.seq = 1;
    this.qts = 0;
    this.diffPage = diffPage;
    this.channelPage = channelPage;
    this.events = [];        // common box, event.pts = 2, 3, ...
    this.channels = new Map(); // String(id) -> channel
    this.users = new Map();
    this.privateMessages = new Map(); // msg id -> spec (common message ids)
    this.nextPrivateId = 1;
    this.tooLongOnce = false;
    this.nextDocId = 9000n;
    this.refCounter = 1;
  }
  get pts() { return this.events.length + 1; }
  tick() { return ++this.now; }
  commonEvent(e) { this.events.push({ ...e, pts: this.pts + 1 }); }

  /** A video/other document description with a fresh id and file reference. */
  doc(fields) {
    return { id: this.nextDocId++, accessHash: -(this.nextDocId * 7919n), fileReference: refOf(this.refCounter++), dcId: 2, ...fields };
  }

  addChannel({ id, accessHash, title }) {
    const ch = { id: BigInt(id), accessHash: BigInt(accessHash), title, pts: 1, events: [], messages: new Map(), nextId: 1, forbidden: false, tooLongOnce: false };
    this.channels.set(String(id), ch);
    this.commonEvent({ kind: "channel", channelId: ch.id });
    this.post(id, { service: "Created" });
    return ch;
  }
  /** A message in a channel: { text?, doc?, service? }; answers its id. */
  post(channelId, spec) {
    const ch = this.channels.get(String(channelId));
    const msg = { id: ch.nextId++, date: this.tick(), text: "", ...spec };
    ch.messages.set(msg.id, msg);
    this.channelEvent(ch, { kind: "new", msg: clone(msg) });
    return msg.id;
  }
  edit(channelId, msgId, changes) {
    const ch = this.channels.get(String(channelId));
    const msg = { ...ch.messages.get(msgId), ...changes };
    ch.messages.set(msgId, msg);
    this.channelEvent(ch, { kind: "edit", msg: clone(msg) });
  }
  remove(channelId, ids) {
    const ch = this.channels.get(String(channelId));
    for (const id of ids) ch.messages.delete(id);
    this.channelEvent(ch, { kind: "delete", ids });
  }
  rotateFileReference(channelId, msgId) {
    const msg = this.channels.get(String(channelId)).messages.get(msgId);
    msg.doc = { ...msg.doc, fileReference: refOf(this.refCounter++) };
  }
  forbid(channelId) { this.channels.get(String(channelId)).forbidden = true; }
  channelEvent(ch, e) {
    ch.pts++;
    ch.events.push({ ...e, pts: ch.pts });
    this.commonEvent({ ...e, channelId: ch.id, chPts: ch.pts });
  }

  /** A private message from user `userId` to the bot. */
  privateMessage(userId, { firstName = "User", ...spec }) {
    if (!this.users.has(String(userId))) this.users.set(String(userId), { id: BigInt(userId), firstName });
    const msg = { id: this.nextPrivateId++, date: this.tick(), text: "", userId: BigInt(userId), ...spec };
    this.privateMessages.set(msg.id, msg);
    this.commonEvent({ kind: "pmNew", msg: clone(msg) });
    return msg.id;
  }
  removePrivate(ids) {
    for (const id of ids) this.privateMessages.delete(id);
    this.commonEvent({ kind: "pmDelete", ids });
  }
  noise(userId) { this.commonEvent({ kind: "noise", userId: BigInt(userId) }); }

  // ---- rendering ----
  renderChannelMessage(ch, m) {
    const peer = S.peerChannel(ch.id);
    if (m.service) return S.messageServiceChannelCreate({ id: m.id, peer, date: m.date, title: ch.title });
    if (m.doc) return S.messageWithDocument({ id: m.id, peer, date: m.date, text: m.text, doc: m.doc });
    return S.message({ id: m.id, peer, date: m.date, text: m.text, post: true });
  }
  renderPrivateMessage(m) {
    const peer = S.peerUser(m.userId);
    if (m.doc) return S.messageWithDocument({ id: m.id, peer, date: m.date, text: m.text, doc: m.doc, post: false });
    return S.message({ id: m.id, peer, date: m.date, text: m.text, fromId: S.peerUser(m.userId) });
  }
  chatOf(ch) {
    return ch.forbidden ? S.channelForbidden({ id: ch.id, accessHash: ch.accessHash, title: ch.title }) : S.channel({ id: ch.id, accessHash: ch.accessHash, title: ch.title, adminRights: true });
  }
  checkChannel({ channelId, accessHash }) {
    const ch = this.channels.get(String(channelId));
    if (!ch || ch.accessHash !== accessHash) throw { rpc: [400, "CHANNEL_INVALID"] };
    if (ch.forbidden) throw { rpc: [406, "CHANNEL_PRIVATE"] };
    return ch;
  }
  stateBytes(pts = this.pts) { return S.state({ pts, qts: this.qts, date: this.now, seq: this.seq }); }

  // ---- the API (the fake DC calls these with the parsed request) ----
  getState() { return this.stateBytes(); }

  getDifference({ pts }) {
    if (this.tooLongOnce) { this.tooLongOnce = false; return S.differenceTooLong(this.pts); }
    const pending = this.events.filter((e) => e.pts > pts);
    if (!pending.length) return S.differenceEmpty({ date: this.now, seq: this.seq });
    const page = pending.slice(0, this.diffPage);
    const newMessages = [], otherUpdates = [], chats = new Map(), users = new Map();
    for (const e of page) {
      const ch = e.channelId !== undefined ? this.channels.get(String(e.channelId)) : null;
      if (ch) chats.set(String(ch.id), this.chatOf(ch));
      if (e.kind === "channel") otherUpdates.push(S.updateChannel(ch.id));
      else if (e.kind === "new" && ch) otherUpdates.push(S.updateNewChannelMessage(this.renderChannelMessage(ch, e.msg), e.chPts));
      else if (e.kind === "edit" && ch) otherUpdates.push(S.updateEditChannelMessage(this.renderChannelMessage(ch, e.msg), e.chPts));
      else if (e.kind === "delete" && ch) otherUpdates.push(S.updateDeleteChannelMessages(ch.id, e.ids, e.chPts));
      else if (e.kind === "pmNew") {
        newMessages.push(this.renderPrivateMessage(e.msg));
        const u = this.users.get(String(e.msg.userId));
        users.set(String(u.id), S.user({ id: u.id, accessHash: 5n, firstName: u.firstName, status: true }));
      } else if (e.kind === "pmDelete") otherUpdates.push(S.updateDeleteMessages(e.ids, e.pts));
      else if (e.kind === "noise") otherUpdates.push(S.updateUserStatus(e.userId));
    }
    const last = page[page.length - 1].pts;
    const body = { newMessages, otherUpdates, chats: [...chats.values()], users: [...users.values()], state: this.stateBytes(last) };
    return pending.length > page.length ? S.differenceSlice(body) : S.difference(body);
  }

  getChannelDifference(req) {
    const ch = this.checkChannel(req);
    if (ch.tooLongOnce) {
      // true, or { final: false, ptsBack: n }: a dialog pts n events behind, so the client must page on from it.
      const opt = typeof ch.tooLongOnce === "object" ? ch.tooLongOnce : {};
      ch.tooLongOnce = false;
      const alive = [...ch.messages.values()];
      const top = alive.length ? alive[alive.length - 1].id : 0;
      return S.channelDifferenceTooLong({
        final: opt.final !== false,
        dialog: S.dialog({ peer: S.peerChannel(ch.id), topMessage: top, pts: ch.pts - (opt.ptsBack || 0) }),
        messages: alive.slice(-2).reverse().map((m) => this.renderChannelMessage(ch, m)),
        chats: [this.chatOf(ch)],
      });
    }
    const pending = ch.events.filter((e) => e.pts > req.pts);
    if (!pending.length) return S.channelDifferenceEmpty({ pts: ch.pts, final: true, timeout: 30 });
    const page = pending.slice(0, Math.min(req.limit, this.channelPage));
    const newMessages = [], otherUpdates = [];
    for (const e of page) {
      if (e.kind === "new") newMessages.push(this.renderChannelMessage(ch, e.msg));
      else if (e.kind === "edit") otherUpdates.push(S.updateEditChannelMessage(this.renderChannelMessage(ch, e.msg), e.pts));
      else if (e.kind === "delete") otherUpdates.push(S.updateDeleteChannelMessages(ch.id, e.ids, e.pts));
    }
    const final = page.length === pending.length;
    return S.channelDifference({ final, pts: page[page.length - 1].pts, timeout: final ? 30 : undefined, newMessages, otherUpdates, chats: [this.chatOf(ch)] });
  }

  channelsGetMessages(req) {
    const ch = this.checkChannel(req);
    const messages = req.ids.map((id) => (ch.messages.has(id) ? this.renderChannelMessage(ch, ch.messages.get(id)) : S.messageEmpty(id)));
    return S.channelMessages({ pts: ch.pts, count: messages.length, messages, chats: [this.chatOf(ch)] });
  }

  messagesGetMessages(req) {
    const users = new Map();
    const messages = req.ids.map((id) => {
      const m = this.privateMessages.get(id);
      if (!m) return S.messageEmpty(id);
      const u = this.users.get(String(m.userId));
      users.set(String(u.id), S.user({ id: u.id, accessHash: 5n, firstName: u.firstName }));
      return this.renderPrivateMessage(m);
    });
    return S.messagesMessages({ messages, users: [...users.values()] });
  }
}

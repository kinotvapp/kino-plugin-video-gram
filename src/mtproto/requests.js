// Serialized API methods for the discovery (layer 198), written field by field from their TL lines:
// updates.getState#edd4882a = updates.State
// updates.getDifference#19c2f763 flags:# pts:int pts_limit:flags.1?int pts_total_limit:flags.0?int date:int qts:int qts_limit:flags.2?int
// updates.getChannelDifference#3173d78 flags:# force:flags.0?true channel:InputChannel filter:ChannelMessagesFilter pts:int limit:int
// channels.getMessages#ad8c9a23 channel:InputChannel id:Vector<InputMessage>
// messages.getMessages#63c66506 id:Vector<InputMessage>
// inputChannel#f35aec28 channel_id:long access_hash:long   inputMessageID#a676a322 id:int   channelMessagesFilterEmpty#94d42ee7
import { Writer, CTOR } from "./tl.js";

/**
 * The ONLY methods TelegramClient.call sends: the five the discovery needs. A new method for the plugin shell is added
 * here, in this one list, never per call site. Anything else (auth methods, the invoke and initConnection wrappers, gzip_packed,
 * msg_container, destructive methods) is refused by the client before a byte goes out.
 */
export const ALLOWED_CALLS = Object.freeze([
  0xedd4882a, // updates.getState
  0x19c2f763, // updates.getDifference
  0x03173d78, // updates.getChannelDifference
  0xad8c9a23, // channels.getMessages
  0x63c66506, // messages.getMessages
]);

const big = (v) => (typeof v === "bigint" ? v : BigInt(v));
const inputChannel = (w, channelId, accessHash) => w.int(0xf35aec28).long(big(channelId)).long(big(accessHash));
const inputMessageIds = (w, ids) => { w.int(CTOR.vector).int(ids.length); for (const id of ids) w.int(0xa676a322).int(id); return w; };

export const getState = () => new Writer().int(0xedd4882a).done();

export const getDifference = ({ pts, date, qts }) => new Writer().int(0x19c2f763).int(0).int(pts).int(date).int(qts).done();

export const getChannelDifference = ({ channelId, accessHash, pts, limit = 100, force = false }) =>
  inputChannel(new Writer().int(0x03173d78).int(force ? 1 : 0), channelId, accessHash).int(0x94d42ee7).int(pts).int(limit).done();

export const channelsGetMessages = ({ channelId, accessHash, ids }) =>
  inputMessageIds(inputChannel(new Writer().int(0xad8c9a23), channelId, accessHash), ids).done();

export const messagesGetMessages = (ids) => inputMessageIds(new Writer().int(0x63c66506), ids).done();

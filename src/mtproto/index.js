// The MTProto library's public surface (what the plugin shell, Task 7b, imports).
import { TelegramClient, loginBudget, CHUNK } from "./client.js";
import { CODES, mtError, fromRpcError } from "./errors.js";
import { toBase64, fromBase64, toHex, fromHex, hexToBase64, concat } from "./bytes.js";
import { CTOR, LAYER, Reader, Writer, parseDocument, parseMessage, parseMessageMedia, parseAuthorization } from "./tl.js";
import { DC_HOSTS, dcUrl } from "./transport.js";
import { TELEGRAM_PUBLIC_KEYS } from "./keys.js";
import { decode, createDecoder, schemaStats } from "./schema/reader.js";
import { createDiscovery, videoEntry, chatIdOf } from "./discovery.js";

/** `new TelegramClient(options)` as a plain function (the kit's sandbox wraps every export in a call tracker, which a class cannot pass through with `new`). */
export function createClient(options) { return new TelegramClient(options); }

export {
  TelegramClient, loginBudget, CHUNK,
  CODES, mtError, fromRpcError,
  toBase64, fromBase64, toHex, fromHex, hexToBase64, concat,
  CTOR, LAYER, Reader, Writer, parseDocument, parseMessage, parseMessageMedia, parseAuthorization,
  DC_HOSTS, dcUrl, TELEGRAM_PUBLIC_KEYS,
  decode, createDecoder, schemaStats,
  createDiscovery, videoEntry, chatIdOf,
};

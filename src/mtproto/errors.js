// Typed errors: every failure the library throws is an Error with a string `code` from CODES, plus the extra fields
// the code needs (`seconds` for flood_wait/login_budget, `dc` for the migrations, `rpc`/`status` for server errors).

export const CODES = Object.freeze([
  "flood_wait",             // { seconds } Telegram asked to wait (FLOOD_WAIT_n, or a transport flood -429)
  "file_migrate",           // { dc } the file lives on another DC (FILE_MIGRATE_n)
  "user_migrate",           // { dc } the account lives on another DC (USER_/PHONE_/NETWORK_MIGRATE_n)
  "file_reference_expired", // the document's file_reference must be refreshed from its message
  "auth_key_unregistered",  // the server does not know this key or session (401s, transport -404)
  "bad_msg",                // { badMsgCode } the server refused our message and resending did not help
  "closed",                 // the socket closed
  "timeout",                // no answer in time
  "protocol",               // malformed or unexpected data from the server
  "rpc_error",              // { status, rpc } any other server error
  "invalid_request",        // bad arguments from the caller (offset/limit rules, missing fields)
  "login_budget",           // { seconds } too many bot logins on this device in the last hour
]);

export function mtError(code, message, extra) {
  const e = new Error(message);
  e.name = "MtprotoError";
  e.code = code;
  if (extra) Object.assign(e, extra);
  return e;
}

/** An rpc_error { code, message } as a typed error. */
export function fromRpcError({ code, message }) {
  const m = String(message);
  const tail = (re) => { const x = re.exec(m); return x ? Number(x[1]) : null; };
  let n;
  if ((n = tail(/^FLOOD_(?:PREMIUM_)?WAIT_(\d+)$/)) !== null) return mtError("flood_wait", m, { seconds: n, status: code, rpc: m });
  if ((n = tail(/^FILE_MIGRATE_(\d+)$/)) !== null) return mtError("file_migrate", m, { dc: n, status: code, rpc: m });
  if ((n = tail(/^(?:USER|PHONE|NETWORK)_MIGRATE_(\d+)$/)) !== null) return mtError("user_migrate", m, { dc: n, status: code, rpc: m });
  if (/^FILE_REFERENCE_/.test(m)) return mtError("file_reference_expired", m, { status: code, rpc: m });
  if (code === 401 || /^AUTH_KEY_(UNREGISTERED|INVALID|DUPLICATED)$/.test(m) || m === "SESSION_REVOKED") return mtError("auth_key_unregistered", m, { status: code, rpc: m });
  return mtError("rpc_error", code + " " + m, { status: code, rpc: m });
}

/** A 4-byte transport packet (a negative int32 error code) as a typed error. */
export function fromTransportError(status) {
  if (status === -404) return mtError("auth_key_unregistered", "transport error -404", { status, transport: true });
  if (status === -429) return mtError("flood_wait", "transport error -429", { status, seconds: 5, transport: true });
  return mtError("protocol", "transport error " + status, { status, transport: true });
}

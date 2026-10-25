// Hex to base64 without a JavaScript pass over the data. kino.crypto has no plain re-encoding, but AES-CTR XORs the
// data with a keystream fixed by its key and counter, so running it twice with the same key and counter gives the data
// back: the first pass reads hex and writes hex, the second reads that hex and writes base64. Both run natively in the
// app (javax.crypto there, node:crypto in the kit). The key is a constant: nothing here is secret, it is only a codec.
import { toBase64, fromHex } from "../mtproto/bytes.js";

const KEY = "00000000000000000000000000000000";
const IV = "00000000000000000000000000000000";
const pass = (dataHex, outputEncoding) =>
  kino.crypto.encrypt("aes-128-ctr", { key: KEY, keyEncoding: "hex", iv: IV, ivEncoding: "hex", data: dataHex, inputEncoding: "hex", outputEncoding });

/** base64 of the bytes `hex` spells (even length, any case). */
export function hexToBase64Native(hex) {
  if (hex.length === 0) return "";
  return pass(pass(hex, "hex"), "base64");
}

/** base64 of `hex`, natively when it can, else with the JS codec (logged). */
export function base64Of(hex) {
  try {
    return hexToBase64Native(hex);
  } catch (e) {
    kino.log("native base64 failed (" + (e && e.code) + "), using the JS codec");
    return toBase64(fromHex(hex));
  }
}

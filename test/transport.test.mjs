import { test } from "node:test";
import assert from "node:assert/strict";
import { createCipheriv, randomBytes } from "node:crypto";
import { installKino } from "../testkit/kino.mjs";
import { installFakeWebSocket } from "../testkit/fake-ws.mjs";
import { ServerTransport } from "../testkit/server-transport.mjs";
import { toHex, fromHex, readU32LE } from "../src/mtproto/bytes.js";
import { CtrStream, Transport, makeInit, dcUrl, DC_HOSTS } from "../src/mtproto/transport.js";
import { igeEncryptHex, igeDecryptHex } from "../src/mtproto/crypto.js";

installKino();

test("CtrStream continues one keystream across messages, as node:crypto's streaming cipher", () => {
  const key = randomBytes(32), iv = Buffer.from("fffffffffffffffffffffffffffffff0", "hex"); // counter wraps the low bytes
  const node = createCipheriv("aes-256-ctr", key, iv);
  const stream = new CtrStream(key.toString("hex"), iv.toString("hex"));
  for (const n of [1, 3, 16, 15, 64, 4, 100, 1, 33, 4096, 7, 70000]) {
    const data = randomBytes(n);
    assert.equal(stream.processHex(data.toString("hex")), node.update(data).toString("hex"), "chunk of " + n);
  }
  assert.equal(stream.processHex(""), "");
});

test("the 128-bit counter carries across the whole block, never only the low 64 bits", () => {
  const key = randomBytes(32), iv = Buffer.from("00000000000000ffffffffffffffffff", "hex");
  const node = createCipheriv("aes-256-ctr", key, iv);
  const stream = new CtrStream(key.toString("hex"), iv.toString("hex"));
  stream.processHex("00".repeat(20));
  node.update(Buffer.alloc(20));
  const data = randomBytes(50);
  assert.equal(stream.processHex(data.toString("hex")), node.update(data).toString("hex"));
});

test("aesIge matches the Kino repo's vector (PluginCryptoTest, from the spike's igeEncrypt)", () => {
  const key = "030a11181f262d343b424950575e656c737a81888f969da4abb2b9c0c7ced5dc";
  const iv = "fffaf5f0ebe6e1dcd7d2cdc8c3beb9b4afaaa5a09b96918c87827d78736e6964";
  const plain = "010e1b2835424f5c697683909daab7c4d1deebf805121f2c394653606d7a8794a1aebbc8d5e2effc091623303d4a5764717e8b98a5b2bfccd9e6f3000d1a2734";
  const cipher = "5f1d528dcb99652fb74ef03178d728e70639ab1fe08aed46eec6d198b0a2ccd6922d2c3a899e45884f48802f7286d7e40153381bb84fd7ee9928e0dbc49c081c";
  assert.equal(igeEncryptHex(plain, key, iv), cipher);
  assert.equal(igeDecryptHex(cipher, key, iv), plain);
});

test("the obfuscation init never looks like another protocol and names the DC", () => {
  let calls = 0;
  const forced = [
    (b) => { b[0] = 0xef; },
    (b) => { b.set([0x48, 0x45, 0x41, 0x44], 0); },     // "HEAD"
    (b) => { b.set([0, 0, 0, 0], 4); },
    () => {},
  ];
  const rand = (n) => { const b = new Uint8Array(randomBytes(n)); if (b[0] === 0xef) b[0] = 1; forced[Math.min(calls++, 3)](b); return b; };
  const init = makeInit(4, rand);
  assert.equal(calls, 4, "three rejected candidates");
  assert.equal(readU32LE(init, 56), 0xeeeeeeee);
  assert.equal(init[60] | (init[61] << 8), 4);
  assert.equal(dcUrl(2), "wss://venus.web.telegram.org/apiws");
  assert.deepEqual(DC_HOSTS, { 1: "pluto", 2: "venus", 3: "aurora", 4: "vesta", 5: "flora" });
  assert.throws(() => dcUrl(9), /unknown DC/);
});

function echoServer({ split = 1, many = false } = {}) {
  const seen = { urls: [], packets: [], dcs: [] };
  const fake = installFakeWebSocket((url) => {
    seen.urls.push(url);
    return {
      accept(socket) {
        const st = new ServerTransport(socket, (p) => {
          seen.packets.push(p);
          seen.dcs.push(st.dcFromInit);
          const reply = Buffer.concat([Buffer.from("echo:"), p]);
          if (many) st.sendMany([reply, Buffer.from("second")]); else st.send(reply, { split });
        });
        return st;
      },
    };
  });
  return { seen, fake };
}

test("packets go through kino.ws both ways: the init, framing and the stream state survive several messages", async () => {
  const { seen, fake } = echoServer();
  try {
    const t = await new Transport(2).open();
    for (const msg of ["hello", "x".repeat(1000), "a", ""]) {
      await t.sendHex(Buffer.from(msg).toString("hex"));
      assert.equal(Buffer.from(fromHex(await t.recvHex(2000))).toString(), "echo:" + msg);
    }
    assert.deepEqual(seen.urls, ["wss://venus.web.telegram.org/apiws"]);
    assert.deepEqual([...new Set(seen.dcs)], [2]);
    await t.close();
  } finally { fake.restore(); }
});

test("a packet split over several WebSocket frames, and two packets in one frame, are reassembled", async () => {
  let { fake } = echoServer({ split: 5 });
  try {
    const t = await new Transport(1).open();
    const big = randomBytes(200000);
    await t.sendHex(big.toString("hex"));
    assert.equal(await t.recvHex(2000), Buffer.concat([Buffer.from("echo:"), big]).toString("hex"));
    await t.close();
  } finally { fake.restore(); }
  ({ fake } = echoServer({ many: true }));
  try {
    const t = await new Transport(1).open();
    await t.sendHex("01");
    assert.equal(Buffer.from(fromHex(await t.recvHex(2000))).toString("latin1"), "echo:\x01");
    assert.equal(Buffer.from(fromHex(await t.recvHex(2000))).toString(), "second");
    await t.close();
  } finally { fake.restore(); }
});

test("recv times out with a typed error and a server close is `closed`", async () => {
  let socket;
  const fake = installFakeWebSocket(() => ({ accept(s) { socket = s; return new ServerTransport(s, () => {}); } }));
  try {
    const t = await new Transport(3).open();
    await assert.rejects(t.recvHex(30), (e) => e.code === "timeout");
    socket.serverClose();
    await assert.rejects(t.recvHex(1000), (e) => e.code === "closed");
    await assert.rejects(t.sendHex("00"), (e) => e.code === "closed");
  } finally { fake.restore(); }
});

test("a host the manifest does not declare is refused by kino.ws itself", async () => {
  const fake = installFakeWebSocket(() => null);
  try {
    await assert.rejects(new Transport(2, { url: "wss://example.org/apiws" }).open(), (e) => e.code === "closed" && e.cause === "host_not_allowed");
  } finally { fake.restore(); }
});


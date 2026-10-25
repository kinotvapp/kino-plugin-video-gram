# telegram-library: notes for developers

The plugin's sources are ES modules under `src/`. `scripts/build.mjs` bundles them into the single file Kino loads: `npm run build` writes `plugin.js` (the published entry, committed; a test fails when it is stale). Tests run with `node --test`: `npm test` builds, then runs `test/`. No test reaches the network.

## Layout

- `src/mtproto/`: the MTProto client.
  - Transport, auth key and session.
  - `client.js`: the bot login, `getFile`, and `call`.
  - `requests.js`: the serialized methods, plus `ALLOWED_CALLS`, the one frozen list of what `call` may send.
  - `schema/reader.js` + `schema/generated.js`: the schema-driven TL reader. Regenerate with `node scripts/gen-schema.mjs`; a test fails when `generated.js` is stale.
  - `discovery.js`: the video index built from the bot's update boxes.
- `src/plugin.js`: the entry, Kino's exports (`home`, `search`, `browse`, `resolve`, `read`, `details`, `section`, `categories`, `settingsStatus`, `action`, `validateSettings`).
- `src/shell/`: the plugin around the client.
  - `live.js`: the settings, the one live client per runtime, the stored session (`tg.session`), the login once per device.
  - `library.js`: channel slots and toggles, the refresh (discovery -> `kino.catalog`), purges, and every list Kino shows.
  - `read.js`: the byteSource `read`; `b64.js`: hex to base64 natively (AES-CTR twice).
  - `errors.js`: every failure as a `kino.error` with a sentence for the person; `text.js`: every text, Spanish and English.
  - `store.js`: the `kino.storage` keys.
- `testkit/`: the test-only pieces.
  - `fake-dc.mjs`: the fake Telegram DC.
  - `fake-world.mjs`: channels and private chats for the discovery.
  - `tl-serializer.mjs`: an independent TL writer, so the fixtures never share code with the reader.
  - `plugin-harness.mjs`: the whole plugin as Kino runs it: the bundle in the kit's sandbox on the kit's `kino`, settings per runtime, one storage and catalog per "device". It swaps one line of the bundle, the RSA keys, for the fake cluster's.

## Discovery: what to know

- **Where the data comes from.** Bots cannot list dialogs or read history; `messages.getHistory` answers `BOT_METHOD_INVALID`. So everything comes from `updates.getDifference`, which starts at pts 1 on the first run, and from `updates.getChannelDifference` per known channel. A channel becomes known only when it appears in a `chats` vector.
- **The `differenceTooLong` gap is skipped.** After `updates.differenceTooLong`, the common box jumps to a fresh `updates.getState`. Known channels are rescanned from pts 1, so their videos are not lost. Two things are lost:
  - A channel the bot joined during the gap appears only with its next post, or with another update that names it.
  - Private-chat videos sent during the gap are lost.
- **Storage.** The update state and the index are saved together under the key `tg.discovery`.
  - The saved value never exceeds `budgetBytes`, which defaults to 160 000 so the client's own keys keep room under Kino's 256 KB. Pass a larger value when the plugin has a larger quota.
  - When the index does not fit, the oldest entries are left out of the saved copy, and the result has `truncated: true`.
  - A write the store refuses never throws. The result has `persisted: false`, and the same runtime goes on from its in-memory state.
- **Isolated failures.** A channel whose answer cannot be parsed, or that answers an rpc error, is reported in `errors` and keeps its pts; the other channels go on. A failed common-box answer keeps the common state, and the channels are still scanned. `FLOOD_WAIT` stops the scan, keeps the progress, and is surfaced as `floodWait`.
- **Adding a method for the shell.** Write its serializer in `requests.js` and add its constructor id to `ALLOWED_CALLS`. `client.call` refuses everything else before sending: auth methods, invoke wrappers, `gzip_packed`, `msg_container`, and destructive methods.

## The plugin shell: what to know

- **Index.** The discovery runs with `persistEntries: false`: `tg.discovery` holds only the update state, and each refresh's `changes` go to `kino.catalog` (upsert in batches of 500, removals by id). A catalog row is `{ id: "<chat>:<msg>", title, sort: <message date>, data: { chatId, msgId, size, mime, duration, width, height, caption, doc: { id, accessHash, fileReference (hex), dcId } } }`, about 250 to 350 bytes of `data`.
- **Refresh policy.** From `home()` and the `refresh` action only, never from `search()`. At most every 5 minutes, unless a pass is unfinished or a toggle changed; a FLOOD_WAIT blocks it until the wait is over. A failure keeps the old rows and is stored as `tg.shell.error` (shown as a notice row and in the status line).
- **Channels.** Slots 1 to 8: the first 8 known channels by ascending channel id (BigInt order), recomputed at every refresh (a lost channel frees its slot); slot N follows the `chN` toggle. A channel off is never scanned and has no rows: turning it off queues a purge (ids `<chat>:<top>` down to 1, 500 per remove call, 40 calls per step); turning it on calls `discovery.resetChannel` (read again from pts 1). Private chats and groups are ignored: anyone can message a bot.
- **Rows without a channel filter.** `kino.catalog` searches titles only, so a channel's newest videos are read with `kino.catalog.get` over message ids from the channel's highest one down (500 ids per call, 10 calls at most).
- **The read hot path.** `getFile(..., { hex: true })` slices the file bytes out of the decrypted hex; `b64.js` turns hex into base64 with two native `aes-128-ctr` passes (CTR twice with the same key and counter is the identity). The JavaScript passes left over a 1 MiB chunk are upstream of the shell: the app's prelude decoding the WebSocket frame into a Uint8Array, and the transport's one `toHex` of it.
- **Secrets.** The three settings are read with `kino.config.get` (they are `password` settings; Kino's sealed `secrets` are an author's values bound to a repository, not the person's, and a sealed marker is only swapped inside `kino.fetch`). They are never logged, never stored, never part of an error: `tg.session`'s `fp` is a 16-hex-digit SHA-256 prefix of the api_id and the token. `test/plugin.test.mjs` scans storage, catalog, logs, errors and answers for them.
- **Device mark.** `checkDevice()` (live.js) runs before anything reads `kino.storage`: the stored session must carry the id of the catalog's `~device` row, else session, update state and shell state are dropped and the catalog rebuilt. The mark is a catalog row (title `~`, sort 0): `countVideos()` leaves it out, and no list shows it (it belongs to no channel).
- **Concurrency.** One `connect` in flight per runtime (shared promise, cleared on failure) and one `refresh` (a second caller gets the running one's answer). `withSession` re-logs in once (budgeted) when the session died (`auth_key_unregistered`); AUTH_KEY_DUPLICATED/INVALID drop that DC's key in the client.
- **Commit order.** The discovery runs with `commit: false`; the shell writes the catalog, then calls `commit()`. A refresh stops at 14 s from its start (`deadline`) and goes on next time; a read keeps all its requests inside 17 s.
- **Memory model (`src/mtproto/big.js`).** A hand-kept model, not the QuickJS heap: `big.hold(n)`/`big.release(n)` at every place the transport, the session, the client cache and `read` make or drop a big string. Tests bound its peak (two copies of a 3 MiB packet) and check it returns to 0 after every kind of read; that catches a missing release in our code, never a reference kept by mistake that nobody declared, nor the copies inside `kino.crypto`/`kino.ws`.
- **In flight.** At most 3 requests per connection at every send: a chunk request waits (up to 2.5 s) for room, and when the room does not come (requests that never answer) the connection is dropped and a new one is opened with the stored key. Abandoned requests count until their answer arrives or `abandonedMs` (30 s) passes.
- **Side effects of `abandon`** (a read that is not the file's last chunk gives up the read-aheads it does not want): an mp4 whose `moov` is bigger than 1 MiB makes Kino read more than one chunk at the end, so the second of those reads abandons the read-aheads of chunks 1-2 started after chunk 0; a read that is not at a MiB offset, or that is split into several requests, wants no read-ahead and so abandons every read-ahead of the file.

# telegram-library: notes for developers

The plugin's sources are ES modules under `src/`. `scripts/build.mjs` bundles them into the single file Kino loads. Tests run with `node --test`: `npm test` builds, then runs `test/`. No test reaches the network.

## Layout

- `src/mtproto/`: the MTProto client.
  - Transport, auth key and session.
  - `client.js`: the bot login, `getFile`, and `call`.
  - `requests.js`: the serialized methods, plus `ALLOWED_CALLS`, the one frozen list of what `call` may send.
  - `schema/reader.js` + `schema/generated.js`: the schema-driven TL reader. Regenerate with `node scripts/gen-schema.mjs`; a test fails when `generated.js` is stale.
  - `discovery.js`: the video index built from the bot's update boxes.
- `testkit/`: the test-only pieces.
  - `fake-dc.mjs`: the fake Telegram DC.
  - `fake-world.mjs`: channels and private chats for the discovery.
  - `tl-serializer.mjs`: an independent TL writer, so the fixtures never share code with the reader.

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

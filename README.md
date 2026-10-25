# Telegram Library (Kino plugin)

A personal Telegram video library for [Kino](https://github.com/kinotvapp/kino-light): the videos you post in your own
private Telegram channel show up in Kino's Inicio and search, and play in Kino's player with seeking, Chromecast and
DLNA. You bring your own Telegram app id and your own bot; Kino ships none, and there is no server in between: the
phone talks to Telegram directly.

This is for **your own** channel. It is not a catalogue of films, and it is not meant to share one.

- Plugin id `telegram-library`. Requires Kino with **apiVersion 13** (Kino 0.9.75 or newer). Both numbers are **provisional**: the app release that carries `socket`, `byteSource` and `catalog` is not out yet, and they may still change. For full speed it needs the Kino build with the `kino.crypto` ops `convert` and `aesIgeVerify`; on a Kino without them it falls back to slower code and still works. Phone first.
- Capabilities: `home`, `search`, `browse`, `scopedSearch`, `resolve`, `socket`, `byteSource`, `catalog`, `imageSource`,
  plus its own section, categories (one tile per channel), `details` and a theme. No `download`, no `storageLarge`.
- Posters: TMDB's, through Kino's own TMDB access (`kino.meta`: the plugin has no TMDB key and no TMDB host); when TMDB
  does not know the video, Telegram's own thumbnail of it, through the plugin's `image` export.
- Hosts: `pluto`, `venus`, `aurora`, `vesta` and `flora` `.web.telegram.org` (Telegram's five data centres, over WebSocket). Nothing else.

## Setup (Español)

1. **Crea tu app de Telegram.** Entra en <https://my.telegram.org> con tu número, abre *API development tools* y crea
   una app (el nombre da igual). Copia el **api_id** (un número) y el **api_hash** (32 letras y números).
2. **Crea tu bot.** En Telegram, habla con **@BotFather**, envía `/newbot` y sigue los pasos. Copia el **token** que te
   da (se ve como `123456789:AAH...`).
3. **Agrega el bot a tu canal.** En tu canal privado: Administradores ▸ Agregar administrador ▸ busca tu bot. Basta con
   los permisos que trae por defecto.
4. **Publica tus videos en el canal** (como video o como archivo: mp4, mkv, webm…).
5. **En Kino**: Ajustes ▸ Plugins ▸ agrega este plugin, abre su pestaña y pega los tres datos (api_id, api_hash, token).
6. Abre **Inicio**. La primera vez tarda unos segundos (crea la sesión de este aparato); después aparecen "Recientes"
   y una fila por canal.

Qué esperar:

- **Canales.** Kino muestra solo los canales que actives en la pestaña del plugin (hasta 8). Los lugares Canal 1 a
  Canal 8 van en el orden en que el bot conoció cada canal y no se mueven: un canal nuevo ocupa el siguiente lugar
  libre y llega **desactivado**. Solo el Canal 1 (el primer canal que vio el bot) empieza activo. Si el bot pierde un
  canal, ese lugar queda marcado "(el bot ya no tiene acceso)" y no se le da a otro canal. Al desactivar uno, sus
  videos salen del índice; al activarlo de nuevo, se vuelve a leer desde el principio.
- **Desconocidos.** Cualquiera que conozca el nombre de tu bot puede agregarlo a su propio canal, y Telegram no le
  pregunta al bot. Por eso un canal nuevo nunca aparece en Inicio hasta que tú lo actives, y nunca le quita el lugar
  a uno tuyo. Si ves en la pestaña del plugin un canal que no es tuyo, déjalo desactivado.
- **Videos nuevos: toca *Actualizar ahora*.** Es la forma segura de traer lo último que publicaste. Kino también
  revisa tus canales al abrir Inicio, como mucho cada 5 minutos, pero Kino guarda las filas de Inicio varias horas.
- **Lectura anticipada.** Kino pide a Telegram los siguientes trozos del video mientras ves uno. Si el video guarda su índice al final y ese índice es grande (más de 1 MiB), o si saltas a otro punto, esa lectura anticipada se descarta y se vuelve a pedir lo que haga falta.
- **Buscar** funciona sin internet, sobre el índice de este aparato, sin importar tildes ni mayúsculas. Encuentra un
  video por el título de TMDB y también por el nombre de su archivo.
- **Pósters y nombres.** Kino limpia el nombre del archivo (`El.Laberinto.del.Fauno.2006.1080p.BluRay.mkv` se muestra
  como *El Laberinto del Fauno*, 2006; `Dark.S03E08.mkv` como *Dark S03E08*) y le pregunta a TMDB, con el acceso de la
  propia Kino, por ese título: si lo encuentra, muestra su póster, su título y su sinopsis. Si TMDB no lo conoce (un
  video familiar, una grabación de pantalla), muestra la miniatura que Telegram guarda del video. Kino pregunta por unos
  pocos videos cada vez que abre Inicio, así que una biblioteca grande se completa poco a poco; un video que TMDB no
  conoce no se vuelve a preguntar en dos semanas.
- **Si el póster no es el correcto**, edita la descripción del video en Telegram y agrega el número de TMDB de la
  película o serie: `tmdb:603`, `{tmdb-603}`, `[tmdbid=603]` o el enlace de themoviedb.org (por ejemplo
  `https://www.themoviedb.org/movie/603` o `/tv/1399` para una serie). Para una serie también sirve `{tmdb-tv-1399}`.
  También puedes ponerlo en el nombre del archivo. Luego toca *Actualizar ahora*.
- **Límites.** Un bot solo ve lo que se publicó en canales donde es administrador. Telegram limita los inicios de
  sesión de un bot: Kino inicia sesión una sola vez por aparato y como mucho 3 veces por hora; si Telegram pide
  esperar, Kino te dice cuántos minutos. Las listas HLS (m3u8) no se muestran.
- **Privacidad.** Tus videos van solo entre el aparato y Telegram. El api_id, el api_hash y el token se guardan
  cifrados como contraseñas del plugin (y viajan sellados a tus otros aparatos vinculados). La sesión de Telegram (la
  clave de este aparato) se guarda cifrada con una clave que sale de tu token y tu api_hash, y no se sincroniza: cada
  aparato abre la suya. El índice de videos queda solo en este aparato. **Lo que sí sale:** para buscar pósters, el
  nombre limpio de cada video (sacado del nombre del archivo o de su descripción) va a TMDB a través de Kino, y los
  pósters se cargan de `image.tmdb.org`. Si no quieres eso, apaga **Buscar pósters en TMDB** en la pestaña del plugin:
  entonces no se le pregunta nada a TMDB y solo se ven las miniaturas de Telegram.

## Setup (English)

1. **Create your Telegram app.** Sign in at <https://my.telegram.org>, open *API development tools* and create an app
   (any name). Copy the **api_id** (a number) and the **api_hash** (32 letters and digits).
2. **Create your bot.** In Telegram, talk to **@BotFather**, send `/newbot` and follow the steps. Copy the **token** it
   gives you (it looks like `123456789:AAH...`).
3. **Add the bot to your channel.** In your private channel: Administrators ▸ Add administrator ▸ find your bot. The
   default permissions are enough.
4. **Post your videos in the channel** (as a video or as a file: mp4, mkv, webm…).
5. **In Kino**: Settings ▸ Plugins ▸ add this plugin, open its tab and paste the three values (api_id, api_hash, token).
6. Open **Home**. The first time takes a few seconds (it creates this device's session); then "Recent" and one row per
   channel appear.

What to expect:

- **Channels.** Kino shows only the channels you turn on in the plugin's tab (up to 8). Places Channel 1 to Channel 8
  follow the order in which the bot met each channel and never move: a new channel takes the next free place and
  arrives **off**. Only Channel 1 (the first channel the bot saw) starts on. When the bot loses a channel, its place
  is marked "(the bot lost access)" and is not given to another channel. Turning one off removes its videos from the
  index; turning it on again reads it from the start.
- **Strangers.** Anyone who knows your bot's name can add it to their own channel, and Telegram does not ask the bot.
  That is why a new channel never shows in Home until you turn it on, and never takes the place of one of yours. If
  the plugin's tab lists a channel that is not yours, leave it off.
- **New videos: tap *Refresh now*.** It is the reliable way to bring in what you just posted. Kino also checks your
  channels when Home opens, at most every 5 minutes, but Kino keeps Home rows for hours.
- **Read-ahead.** Kino asks Telegram for the next pieces of the video while you watch one. When the video keeps its index at the end and that index is big (over 1 MiB), or when you jump elsewhere, that read-ahead is dropped and asked again as needed. When you leave a video and come back later, the plugin frees what the last play left before starting the new one.
- **Search** works offline, over this device's index, ignoring accents and case. It finds a video by its TMDB title
  and by its file name.
- **Posters and names.** Kino cleans the file name (`El.Laberinto.del.Fauno.2006.1080p.BluRay.mkv` shows as *El
  Laberinto del Fauno*, 2006; `Dark.S03E08.mkv` as *Dark S03E08*) and asks TMDB, through Kino's own access, about that
  title: when it finds it, it shows its poster, title and overview. When TMDB does not know it (a family video, a
  screen recording), it shows the thumbnail Telegram keeps of the video. Kino asks about a few videos each time Home
  opens, so a big library fills in little by little; a video TMDB does not know is not asked about again for two weeks.
- **When the poster is wrong**, edit the video's caption in Telegram and add the TMDB number of the film or series:
  `tmdb:603`, `{tmdb-603}`, `[tmdbid=603]` or the themoviedb.org link (for example `https://www.themoviedb.org/movie/603`,
  or `/tv/1399` for a series). For a series `{tmdb-tv-1399}` works too. It can also go in the file name. Then tap
  *Refresh now*.
- **Limits.** A bot only sees what was posted in channels it administers. Telegram limits bot logins: Kino logs in once
  per device and at most 3 times an hour; when Telegram asks to wait, Kino tells you for how many minutes. HLS
  playlists (m3u8) are not listed.
- **Privacy.** Your videos go only between the device and Telegram. The api_id, the api_hash and the token are stored
  encrypted as the plugin's password settings (and travel sealed to your other paired devices). The Telegram session
  (this device's key) is stored encrypted under a key derived from your token and api_hash, and is not synced: each
  device opens its own. The video index stays on this device only. **What does leave:** to find posters, each video's
  cleaned name (taken from its file name or caption) goes to TMDB through Kino, and posters load from
  `image.tmdb.org`. If you do not want that, turn off **Look up posters on TMDB** in the plugin's tab: TMDB is then
  never asked, and only Telegram's thumbnails show.

## Where things live (for developers)

| What | Where | Synced | In a backup |
| --- | --- | --- | --- |
| api_id, api_hash, bot token | the plugin's `password` settings (Keystore-encrypted) | yes, sealed end to end, like every plugin password | as Kino backs up settings |
| Telegram auth key + server salt per DC, the bot login (`tg.session`, AES-256-GCM under HMAC-SHA256(api_hash + bot token, per-install random salt)) | `kino.storage` | **no** (owner decision: one session per device, `AUTH_KEY_DUPLICATED` otherwise) | the password-protected backup carries `kino.storage`; see "Restores" below |
| Login budget (`mtproto.botLogins`) and a login Telegram refused or asked to delay (`tg.login`: kind and until when, never the token) | `kino.storage` | no | yes |
| Update state and known channels (`tg.discovery`), channel slots and the index marker (`tg.shell`) | `kino.storage` | no | yes |
| The video index (one row per video), with each video's parsed name, its thumbnail's type and size (never its bytes) and TMDB's answer (poster path, title, year, 160 characters of overview, TMDB id, or a miss with its date) | `kino.catalog` (SQLite, one file for this plugin) | no | no: rebuilt from Telegram when it comes back empty |
| A thumbnail reference in a saved title (`{ source: "plugin", handle: "t:<chat>:<message>" }`) | wherever Kino keeps the title's poster (library, history, lists) | yes, as part of those rows | yes |

**Pictures.** A TMDB poster is a plain `https://image.tmdb.org/t/p/w342/...` URL that Kino loads itself (images are
display only, not checked against `hosts`). A Telegram thumbnail goes through the plugin's `image` export: the handle
is only the catalog row id (chat and message number, no access hash, no file reference, no secret), and the rest is
looked up in this device's catalog. On another device, or after a restore, such a saved picture shows Kino's
placeholder until the plugin lists the video again there. A picture never costs a bot login: without a stored login on
this device it is skipped.

**Restores.** Each install has a random device id, kept both in `tg.session` and in one row of `kino.catalog`, which
is never in a backup. A stored session is used only when both ids match. So a backup restored on another device (a
new one, one that already has its own index for the same bot, or one taken before anything was indexed) never reuses
the first device's auth key: the restored session, update state and shell state are dropped, the settings stay, and
the device opens its own session (one login, inside the budget) and indexes again. Not protected: a future Kino that
would put the catalog file in a backup too (the id would travel with the key). And a catalog that Kino resets as
damaged loses the id as well, which costs one new login.

All `kino.storage` keys together stay in the low kilobytes (measured: about 2 KB with 8 channels), far from the
256 KB limit. The auth key is a secret: it is stored encrypted and never leaves the device except inside Kino's own
password-protected backup. A different token or api_hash cannot open it (a new session is made), and a damaged one is
dropped the same way.

Development notes, the layout of the sources and how to run the tests: [DEVELOPERS.md](DEVELOPERS.md).

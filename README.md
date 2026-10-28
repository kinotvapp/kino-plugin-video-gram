# Video-Gram (Kino plugin)

**Tus videos de Telegram en Kino. / Your Telegram videos in Kino.** Unofficial: not affiliated with Telegram. / No
oficial: sin relación con Telegram.

A personal video library for [Kino](https://github.com/kinotvapp/kino-light): the videos you post in your own
Telegram channels and chats show up in Kino's Inicio and search, and play in Kino's player with seeking, Chromecast and
DLNA. You bring your own Telegram app id and either your own bot or your own account (signed in with a QR, **read
only**); Kino ships none, and there is no server in between: the phone talks to Telegram directly.

This is for **your own** videos. It is not a catalogue of films, and it is not meant to share one.

## Instalar

En Kino: Ajustes ▸ Plugins ▸ Agregar plugin, y escribe:

```
kinotvapp/kino-plugin-video-gram
```

Kino lo muestra como **Firmado**: `plugin.js` va firmado con la llave de autor de kinotvapp, y la firma está en
`kino-plugin.json` (ligada a este repositorio). Después sigue los pasos de abajo.

## Install

In Kino: Settings ▸ Plugins ▸ Add plugin, and type:

```
kinotvapp/kino-plugin-video-gram
```

Kino shows it as **Signed**: `plugin.js` is signed with kinotvapp's author key, and the signature is in
`kino-plugin.json` (bound to this repository). Then follow the steps below.

## In short

- Plugin id `video-gram`, name Video-Gram. Requires Kino with **apiVersion 13**: Kino 0.9.74 or later (the next
  release, not published yet). For full speed it needs the `kino.crypto` ops `convert` and `aesIgeVerify`, which come
  with that Kino; on a Kino without them it falls back to slower code and still works. Phone first.
- Capabilities: `home`, `search`, `browse`, `scopedSearch`, `resolve`, `socket`, `byteSource`, `catalog`, `imageSource`,
  plus its own section, categories (one tile per channel), `details` and a theme. No `download`, no `storageLarge`.
- Posters: TMDB's, through Kino's own TMDB access (`kino.meta`: the plugin has no TMDB key and no TMDB host); when TMDB
  does not know the video, Telegram's own thumbnail of it, through the plugin's `image` export.
- Hosts: `pluto`, `venus`, `aurora`, `vesta` and `flora` `.web.telegram.org` (Telegram's five data centres, over WebSocket). Nothing else.
- License: MIT ([LICENSE](LICENSE)).

## Setup (Español)

1. **Crea tu app de Telegram.** Entra en <https://my.telegram.org> con tu número, abre *API development tools* y crea
   una app (el nombre da igual). Copia el **api_id** (un número) y el **api_hash** (32 letras y números).
2. **Crea tu bot.** En Telegram, habla con **@BotFather**, envía `/newbot` y sigue los pasos. Copia el **token** que te
   da (se ve como `123456789:AAH...`).
3. **Agrega el bot a tu canal.** En tu canal privado: Administradores ▸ Agregar administrador ▸ busca tu bot. Basta con
   los permisos que trae por defecto.
4. **Publica tus videos en el canal** (como video o como archivo: mp4, mkv, webm…).
5. **En Kino**: Ajustes ▸ Plugins ▸ agrega este plugin, abre su pestaña, toca **Configurar Video-Gram** y pega los tres datos (api_id, api_hash, token) en el paso 1; la pantalla te dice qué falta.
6. Abre **Inicio**. La primera vez tarda unos segundos (crea la sesión de este aparato); después aparecen "Recientes"
   y una fila por canal.

### Con tu propia cuenta en vez de un bot (solo lectura)

1. Crea tu app en my.telegram.org como en el paso 1 (api_id y api_hash). No hace falta bot.
2. En la pantalla del plugin (Ajustes ▸ Plugins ▸ Video-Gram ▸ **Configurar Video-Gram**): **Conectar con** ▸ **Mi cuenta (solo lectura)**, pega el api_id y el api_hash y toca
   Guardar.
3. Toca **Iniciar sesión con QR**. Aparece un código. En tu teléfono, abre la app oficial de Telegram ▸ Ajustes ▸
   Dispositivos ▸ **Vincular un dispositivo** y escanéalo; Telegram te muestra qué cuenta se vincula y te pide
   confirmar. El código se renueva solo cada pocos segundos y sirve durante dos minutos y medio.
4. Si tu cuenta tiene **contraseña de dos pasos**, la pestaña te lo dice: escríbela en *Contraseña de dos pasos*, toca
   Guardar y luego **Confirmar la contraseña**. Kino la usa una vez y borra el campo enseguida. Esa contraseña nunca
   sale de este aparato: no se sincroniza con tus otros aparatos ni va en las copias de seguridad.
5. Abre Inicio: Kino busca en tus chats los que tienen videos (canales, grupos y **Mensajes guardados**) y los pone en
   la lista de la pantalla del plugin, todos desactivados. Elige de cuáles quieres videos.

No hay inicio de sesión en segundo plano: solo el botón lo hace. **Cerrar sesión** cierra la sesión en Telegram y borra
su índice de este aparato. Cambiar entre bot y cuenta nunca mezcla sus videos: cada modo tiene su propio índice.

Qué esperar:

- **Canales.** Kino trae videos solo de los canales (o chats, con tu cuenta) que actives en la pantalla del plugin. La
  lista muestra todos los que Kino conoce, en el orden en que los conoció, y tiene un buscador cuando son muchos. Un
  canal nuevo llega **desactivado**. Un canal que el bot perdió sale como ✗ sin acceso y puedes apagarlo. Al desactivar
  uno, sus videos salen del índice; al activarlo, se lee desde el principio.
- **Cuántos activar.** Recomendamos hasta **6**: cada chat activo se lee en cada actualización y se guarda en el índice de
  tu aparato. Si activas más, la pantalla te avisa antes (la actualización tarda más, el índice crece y puede gastar más
  memoria: en teléfonos y TV modestos la app puede ir lenta o cerrarse, y algunos videos nuevos pueden tardar en
  aparecer) y te deja seguir si confirmas. El máximo es **12**.
- **Desconocidos.** Cualquiera que conozca el nombre de tu bot puede agregarlo a su propio canal, y Telegram no le
  pregunta al bot. Por eso un canal nuevo nunca aparece en Inicio hasta que tú lo actives. Si ves en la pantalla del
  plugin un canal que no es tuyo, déjalo desactivado. Con tu cuenta pasa lo mismo
  con los grupos donde alguien comparte videos: llegan apagados.
- **Tu cuenta y la seguridad.** Con tu cuenta, este aparato guarda una clave de sesión de Telegram que **da acceso a
  toda tu cuenta**. Kino la guarda cifrada (con una clave que sale de tu api_hash), solo en este aparato, nunca la
  sincroniza, y la usa solo para leer: una lista cerrada de métodos de lectura (listar chats, buscar videos, leer un
  mensaje, descargar el archivo). Nunca envía, edita, borra ni reenvía mensajes, no marca nada como leído y no entra
  ni sale de chats. La sesión aparece en Telegram ▸ Ajustes ▸ Dispositivos (Telegram te avisa del nuevo inicio de
  sesión); para cerrarla, toca **Cerrar sesión** aquí o ciérrala desde ese menú de Telegram: Kino lo nota, borra la
  clave y te pide iniciar sesión otra vez, sin reintentar solo. La contraseña de dos pasos nunca se guarda: se usa una
  vez y el campo se borra (Kino la tiene en sus ajustes cifrados solo entre que tocas Guardar y Confirmar), y nunca
  sale de este aparato: ese campo no se sincroniza con tus otros aparatos ni va en las copias de seguridad
  (`"sync": false`). Hace falta una Kino que conozca ese ajuste; una más vieja lo ignoraría y sincronizaría el campo
  como cualquier contraseña, por eso este plugin se publica solo junto con una Kino que lo tiene.
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
5. **In Kino**: Settings ▸ Plugins ▸ add this plugin, open its tab, tap **Set up Video-Gram** and paste the three values (api_id, api_hash, token) in step 1; the screen tells you what is still missing.
6. Open **Home**. The first time takes a few seconds (it creates this device's session); then "Recent" and one row per
   channel appear.

### With your own account instead of a bot (read only)

1. Create your app at my.telegram.org as in step 1 (api_id and api_hash). No bot is needed.
2. On the plugin's screen (Settings ▸ Plugins ▸ Video-Gram ▸ **Set up Video-Gram**): **Connect with** ▸ **My account (read only)**, paste the api_id and the api_hash and tap Save.
3. Tap **Sign in with a QR**. A code shows. On your phone, open the official Telegram app ▸ Settings ▸ Devices ▸
   **Link Desktop Device** and scan it; Telegram shows which account is being linked and asks you to confirm. The code
   renews itself every few seconds and works for two and a half minutes.
4. If your account has a **two-step password**, the tab says so: type it in *Two-step password*, tap Save, then
   **Confirm the password**. Kino uses it once and clears the field right away. That password never leaves this
   device: it is not synced to your other devices and is not in backups.
5. Open Home: Kino looks through your chats for the ones with videos (channels, groups and **Saved Messages**) and puts
   the list on the plugin's screen, all off. Pick the ones you want videos from.

There is no login in the background: only the button signs in. **Sign out** ends the session on Telegram and deletes
its index on this device. Switching between bot and account never mixes their videos: each mode has its own index.

What to expect:

- **Channels.** Kino brings videos only from the channels (or chats, with your account) you turn on in the plugin's
  screen. The list shows every one Kino knows, in the order it met them, with a search box when there are many. A new
  channel arrives **off**. A channel the bot lost shows as ✗ no access and you can turn it off. Turning one off removes
  its videos from the index; turning it on reads it from the start.
- **How many to turn on.** We recommend up to **6**: each active chat is read at every refresh and kept in your device's
  index. If you turn on more, the screen warns you first (a refresh takes longer, the index grows and it may use more
  memory: on modest phones and TVs the app can get slow or close, and some new videos may take a while to show up) and
  lets you go on if you confirm. The maximum is **12**.
- **Strangers.** Anyone who knows your bot's name can add it to their own channel, and Telegram does not ask the bot.
  That is why a new channel never shows in Home until you turn it on. If the plugin's screen lists a channel that is
  not yours, leave it off. With your account the same goes for groups where
  someone shares videos: they arrive off.
- **Your account and security.** With your account, this device keeps a Telegram session key that **gives access to
  your whole account**. Kino keeps it encrypted (under a key derived from your api_hash), on this device only, never
  syncs it, and uses it only to read: a closed list of reading methods (list chats, search videos, read one message,
  download the file). It never sends, edits, deletes or forwards messages, never marks anything as read and never
  joins or leaves chats. The session shows in Telegram ▸ Settings ▸ Devices (Telegram tells you about the new login);
  to end it, tap **Sign out** here or end it from that Telegram menu: Kino notices, deletes the key and asks you to
  sign in again, never retrying by itself. The two-step password is never stored: it is used once and the field is
  cleared (Kino holds it in its encrypted settings only between your Save and Confirm), and it never leaves this
  device: that field is not synced to your other devices and is not in backups (`"sync": false`). It takes a Kino that
  knows that key; an older one would ignore it and sync the field like any password, so this plugin is released only
  together with a Kino that has it.
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
| Account mode: the account's session (`tg.usession`, sealed like `tg.session` under HMAC-SHA256(api_hash + api_id, per-install salt)), the chats with videos and how far each was read (`tg.adiscovery`), a QR login under way (`tg.qr`: stage and until when, never the token), the QR and password budgets (`mtproto.accountLogins`, `mtproto.passwordTries`) | `kino.storage` | **no** (one session per device) | the password-protected backup carries `kino.storage`; the device mark drops a restored session as for the bot |
| Update state and known channels (`tg.discovery`), the known chats and the index marker (`tg.shell`) | `kino.storage` | no | yes |
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

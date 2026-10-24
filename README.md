# Telegram Library (Kino plugin)

A personal Telegram video library for [Kino](https://github.com/kinotvapp/kino-light): the videos you post in your own
private Telegram channel show up in Kino's Inicio and search, and play in Kino's player with seeking, Chromecast and
DLNA. You bring your own Telegram app id and your own bot; Kino ships none, and there is no server in between: the
phone talks to Telegram directly.

This is for **your own** channel. It is not a catalogue of films, and it is not meant to share one.

- Plugin id `telegram-library`, `apiVersion` 12 (Kino 0.9.68 or newer), phone first.
- Capabilities: `home`, `search`, `browse`, `scopedSearch`, `resolve`, `socket`, `byteSource`, `catalog`, plus its own
  section, categories (one tile per channel), `details` and a theme. No `download`, no `storageLarge`.
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

- **Canales.** Kino muestra solo los canales que actives en la pestaña del plugin (hasta 8). El primer canal que
  encuentre empieza activo; los demás, desactivados. Al desactivar uno, sus videos salen del índice; al activarlo de
  nuevo, se vuelve a leer desde el principio.
- **Videos nuevos.** Kino revisa tus canales al abrir Inicio, como mucho cada 5 minutos, o cuando tocas *Actualizar ahora*.
- **Buscar** funciona sin internet, sobre el índice de este aparato, sin importar tildes ni mayúsculas.
- **Límites.** Un bot solo ve lo que se publicó en canales donde es administrador. Telegram limita los inicios de
  sesión de un bot: Kino inicia sesión una sola vez por aparato y como mucho 3 veces por hora; si Telegram pide
  esperar, Kino te dice cuántos minutos. Las listas HLS (m3u8) no se muestran.
- **Privacidad.** Todo queda en el aparato. El api_id, el api_hash y el token se guardan cifrados como contraseñas del
  plugin (y viajan sellados a tus otros aparatos vinculados). La sesión de Telegram (la clave de este aparato) no se
  sincroniza: cada aparato abre la suya. El índice de videos queda solo en este aparato.

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

- **Channels.** Kino shows only the channels you turn on in the plugin's tab (up to 8). The first channel found starts
  on; the others start off. Turning one off removes its videos from the index; turning it on again reads it from the start.
- **New videos.** Kino checks your channels when Home opens, at most every 5 minutes, or when you tap *Refresh now*.
- **Search** works offline, over this device's index, ignoring accents and case.
- **Limits.** A bot only sees what was posted in channels it administers. Telegram limits bot logins: Kino logs in once
  per device and at most 3 times an hour; when Telegram asks to wait, Kino tells you for how many minutes. HLS
  playlists (m3u8) are not listed.
- **Privacy.** Everything stays on the device. The api_id, the api_hash and the token are stored encrypted as the
  plugin's password settings (and travel sealed to your other paired devices). The Telegram session (this device's
  key) is not synced: each device opens its own. The video index stays on this device only.

## Where things live (for developers)

| What | Where | Synced | In a backup |
| --- | --- | --- | --- |
| api_id, api_hash, bot token | the plugin's `password` settings (Keystore-encrypted) | yes, sealed end to end, like every plugin password | as Kino backs up settings |
| Telegram auth key + server salt per DC, the bot login (`tg.session`) | `kino.storage` | **no** (owner decision: one session per device, `AUTH_KEY_DUPLICATED` otherwise) | the password-protected backup carries `kino.storage`; after a restore the catalog is empty, and the plugin then drops the restored session and opens its own |
| Login budget (`mtproto.botLogins`) | `kino.storage` | no | yes |
| Update state and known channels (`tg.discovery`), channel slots and the index marker (`tg.shell`) | `kino.storage` | no | yes |
| The video index (one row per video) | `kino.catalog` (SQLite, one file for this plugin) | no | no: rebuilt from Telegram when it comes back empty |

All `kino.storage` keys together stay in the low kilobytes (measured: about 2 KB with 8 channels), far from the
256 KB limit. The auth key is a secret: it never leaves the device except inside Kino's own password-protected backup.

Development notes, the layout of the sources and how to run the tests: [DEVELOPERS.md](DEVELOPERS.md).

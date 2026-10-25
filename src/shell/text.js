// Every text the person reads, in Spanish (neutral, tuteo) and English, picked by kino.lang. Code, logs and the detail
// of a kino.error stay English (they are for the developer). A `um.*` text is a kino.error userMessage: Kino shows it
// only under its rules (README "Errors people understand": no "Telegram", "token", "clave", no digit glued to a
// letter, at most 160 characters), so those are written plain.
const ES = {
  "row.recent": "Recientes",
  "row.notice": "Aviso",
  "setup.config": "Configura tu bot de Telegram en Ajustes ▸ Telegram Library",
  "setup.token": "Telegram no aceptó el token del bot: revísalo en Ajustes ▸ Telegram Library",
  "setup.apiId": "Telegram no aceptó tu api_id o api_hash: revísalos en Ajustes ▸ Telegram Library",
  "setup.noChannels": "Agrega el bot como administrador de tu canal privado y publica un video",
  "setup.noneActive": "Activa un canal en Ajustes ▸ Telegram Library para ver sus videos",
  "setup.empty": "Todavía no hay videos en tus canales activos: publica uno",
  "setup.flood": "Telegram pidió esperar: vuelve a intentar en {min}",
  "setup.budget": "Demasiados inicios de sesión del bot en este aparato: vuelve a intentar en {min}",
  "setup.network": "No se pudo conectar con Telegram ahora; se intentará de nuevo",
  "setup.unavailable": "La biblioteca no está disponible ahora; se intentará de nuevo",
  "minutes.one": "1 minuto",
  "minutes.many": "{n} minutos",
  "um.config": "Completa los datos de tu bot en los ajustes de este plugin.",
  "um.token": "El bot no fue aceptado: revisa sus datos en los ajustes de este plugin.",
  "um.apiId": "Los datos de tu app no fueron aceptados: revísalos en los ajustes de este plugin.",
  "um.flood": "Hay que esperar {min} antes de seguir; vuelve a intentar después.",
  "um.notFound": "Este video ya no está en tu canal o el canal está desactivado.",
  "um.unavailable": "No se pudo conectar ahora; vuelve a intentar en un momento.",
  "status.missing": "Faltan datos: api_id, api_hash y el token del bot",
  "status.token": "Telegram no aceptó el token del bot",
  "status.apiId": "Telegram no aceptó tu api_id o api_hash",
  "status.connected": "Conectado como bot en este aparato",
  "status.notYet": "Sin conectar todavía: abre Inicio o toca Actualizar ahora",
  "status.flood": "Telegram pidió esperar {min}",
  "slot.free": "Libre: agrega el bot a otro canal",
  "slot.off": "{title} (desactivado)",
  "slot.gone": "{title} (el bot ya no tiene acceso)",
  "index.none": "Todavía no hay videos",
  "index.count.one": "1 video",
  "index.count.many": "{n} videos",
  "index.at": "actualizado hace {min}",
  "index.justNow": "actualizado ahora",
  "index.reading": "leyendo canales",
  "index.channelErrors": "{n} canal(es) con errores",
  "index.unslotted": "{n} canales más sin lugar",
  "action.refreshed": "Listo: {count}, {added} nuevos",
  "action.forgot": "Listo: se borraron la sesión y el índice de este aparato",
  "validate.apiId": "Debe ser solo números",
  "validate.apiHash": "Deben ser 32 letras de la a a la f y números",
  "validate.token": "Debe verse como 123456:ABC… (lo da @BotFather)",
  "tab.recent": "Recientes",
};
const EN = {
  "row.recent": "Recent",
  "row.notice": "Notice",
  "setup.config": "Set up your Telegram bot in Settings ▸ Telegram Library",
  "setup.token": "Telegram did not accept the bot token: check it in Settings ▸ Telegram Library",
  "setup.apiId": "Telegram did not accept your api_id or api_hash: check them in Settings ▸ Telegram Library",
  "setup.noChannels": "Add the bot as administrator of your private channel and post a video",
  "setup.noneActive": "Turn a channel on in Settings ▸ Telegram Library to see its videos",
  "setup.empty": "No videos in your active channels yet: post one",
  "setup.flood": "Telegram asked to wait: try again in {min}",
  "setup.budget": "Too many bot logins on this device: try again in {min}",
  "setup.network": "Could not reach Telegram now; it will try again",
  "setup.unavailable": "The library is not available now; it will try again",
  "minutes.one": "1 minute",
  "minutes.many": "{n} minutes",
  "um.config": "Fill in your bot details in this plugin's settings.",
  "um.token": "The bot was not accepted: check its details in this plugin's settings.",
  "um.apiId": "Your app details were not accepted: check them in this plugin's settings.",
  "um.flood": "You need to wait {min} before going on; try again later.",
  "um.notFound": "This video is no longer in your channel, or the channel is turned off.",
  "um.unavailable": "Could not connect now; try again in a moment.",
  "status.missing": "Missing details: api_id, api_hash and the bot token",
  "status.token": "Telegram did not accept the bot token",
  "status.apiId": "Telegram did not accept your api_id or api_hash",
  "status.connected": "Connected as a bot on this device",
  "status.notYet": "Not connected yet: open Home or tap Refresh now",
  "status.flood": "Telegram asked to wait {min}",
  "slot.free": "Free: add the bot to another channel",
  "slot.off": "{title} (off)",
  "slot.gone": "{title} (the bot lost access)",
  "index.none": "No videos yet",
  "index.count.one": "1 video",
  "index.count.many": "{n} videos",
  "index.at": "updated {min} ago",
  "index.justNow": "updated just now",
  "index.reading": "reading channels",
  "index.channelErrors": "{n} channel(s) with errors",
  "index.unslotted": "{n} more channels without a slot",
  "action.refreshed": "Done: {count}, {added} new",
  "action.forgot": "Done: this device's session and index were deleted",
  "validate.apiId": "Digits only",
  "validate.apiHash": "It must be 32 letters from a to f and digits",
  "validate.token": "It looks like 123456:ABC… (@BotFather gives it)",
  "tab.recent": "Recent",
};

export const isEnglish = () => String(kino.lang || "").toLowerCase().startsWith("en");

/** The text for `key` in the app's language, `{name}` filled from `vars`. */
export function t(key, vars = {}) {
  const table = isEnglish() ? EN : ES;
  const s = table[key] !== undefined ? table[key] : ES[key];
  return String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] === undefined ? "" : String(vars[k])));
}

/** "5 minutos" / "1 minute": at least one minute, rounded up. */
export function minutes(seconds) {
  const n = Math.max(1, Math.ceil(Number(seconds || 0) / 60));
  return n === 1 ? t("minutes.one") : t("minutes.many", { n });
}

export const videoCount = (n) => (n === 1 ? t("index.count.one") : t("index.count.many", { n }));

export const TEXT_TABLES = { ES, EN };

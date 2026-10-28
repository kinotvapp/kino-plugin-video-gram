// The plugin's setup screen (apiVersion 14 `screen`): the only place the person connects Telegram, picks channels and
// runs the index. Kino draws it from the tree below, on the phone and on the TV, and keeps the state; nothing here
// touches a view. The connection is a `steps` flow: the secrets (api_id, api_hash, the bot token, the 2FA password) are
// typed in fields inside Forms that Kino checks before any code runs; what the connect step collects is written with an
// answer's `config`, and the 2FA password is used once, from the event's value, and never stored at all. Toggles and
// the access select are `bind`s that Kino writes as the person changes them.
import { credentials } from "./live.js";
import { SLOTS, refresh, forget, freeSlots, setupView } from "./library.js";
import { startQr, qrPoll, confirmPassword, logout } from "./account.js";
import { PATTERNS, problemWith } from "./validate.js";
import { t, bi, minutes, videoCount } from "./text.js";

const TICK_MS = 4000;
const BUSY = ["btnQr", "btnLogout", "btnFree", "btnRefresh", "btnForget"];
const busy = (key) => ({ ui: [{ disable: key }] });
const settled = (key) => ({ ui: [{ enable: key }] });

const MY_TELEGRAM = "https://my.telegram.org";
const BOTFATHER = "https://t.me/BotFather";

const card = (children) => ({ type: "Card", variant: "outlined", children: [{ type: "Column", gap: 12, padding: 16, children }] });
const heading = (key) => ({ type: "Text", style: "h3", ...bi(key) });
const caption = (key, vars) => ({ type: "Text", style: "caption", color: "muted", ...bi(key, vars) });
const confirmOf = (key) => ({ confirm: bi(key).text, confirmEn: bi(key).textEn });
/** A button that turns itself off while its event runs (the answer turns it back on). */
const button = (key, labelKey, event, extra = {}) => ({ type: "Button", key, variant: "secondary", ...bi(labelKey, {}, "labelText"), onPressed: { ui: busy(key).ui, event }, ...extra });

/** The banner for the account line: its text in both languages and the colour role the view gave it. */
function statusBanner(view) {
  const { key, vars, role } = view.account;
  return { type: "MaterialBanner", key: "accountLine", role, ...bi(key, vars) };
}

/**
 * One field of the connect form. It is required while nothing is saved; once saved, empty means "keep what is saved"
 * (a secret is never shown back). Kino checks `pattern` before the event, with the message of `errorKey`.
 */
function field(key, labelKey, errorKey, have, extra = {}) {
  return {
    type: "TextField", key, ...bi(labelKey, {}, "labelText"), required: !have, pattern: PATTERNS[key], ...bi(errorKey, {}, "errorText"),
    ...(have ? bi("screen.keepHint", {}, "hintText") : {}), ...extra,
  };
}

function connectStep(view) {
  const account = view.mode === "account";
  const fields = [
    field("api_id", "screen.field.apiId", "validate.apiId", view.have.api_id, { kind: "number" }),
    field("api_hash", "screen.field.apiHash", "validate.apiHash", view.have.api_hash, { obscureText: true }),
    ...(account ? [] : [field("bot_token", "screen.field.token", "validate.token", view.have.bot_token, { obscureText: true })]),
  ];
  return [
    caption("screen.connectHow"),
    {
      type: "DropdownButton", key: "access", bind: "access", ...bi("screen.access", {}, "labelText"), onChanged: "mode",
      options: [
        { value: "bot", ...bi("screen.access.bot", {}, "label") },
        { value: "account", ...bi("screen.access.account", {}, "label") },
      ],
    },
    { type: "Row", wrap: true, gap: 8, children: [
      { type: "TextButton", ...bi("screen.openApps", {}, "labelText"), onPressed: { go: { url: { href: MY_TELEGRAM } } } },
      ...(account ? [] : [{ type: "TextButton", ...bi("screen.openBotFather", {}, "labelText"), onPressed: { go: { url: { href: BOTFATHER } } } }]),
    ] },
    { type: "Form", key: "connectForm", onSubmitted: "connect", gap: 12, children: [
      ...fields,
      { type: "ElevatedButton", ...bi("screen.save", {}, "labelText"), submit: true },
    ] },
  ];
}

function accountStep(view, state) {
  const children = [];
  if (state.note && !view.loggedIn && !view.qrStage) children.push({ type: "MaterialBanner", key: "noteLine", role: "warning", text: state.note, textEn: state.note });
  if (view.loggedIn) {
    children.push(button("btnLogout", "screen.logoutButton", "logout", confirmOf("screen.logoutConfirm")));
  } else if (view.account.key === "status.password") {
    // The 2FA password: a masked field in a Form, used once from the event's value (Kino empties the field afterwards).
    children.push({ type: "Form", key: "passwordForm", onSubmitted: "password", gap: 12, children: [
      { type: "TextField", key: "tg_password", obscureText: true, ...bi("screen.field.password", {}, "labelText"), required: true },
      { type: "ElevatedButton", ...bi("screen.pwButton", {}, "labelText"), submit: true },
    ] });
  } else {
    if (state.qr) {
      const life = Number(state.qrMs) > 1000 ? Math.min(Number(state.qrMs), 3600000) : 30000;
      children.push(
        { type: "QrImage", value: state.qr, size: { compact: "medium", expanded: "large" }, ...bi("qr.waiting", {}, "labelText"), expiresInMs: life, renewBeforeMs: Math.min(5000, Math.floor(life / 2)), onExpire: "qr_renew" },
        caption("screen.qrHint"),
      );
    }
    if (!view.qrStage) children.push(button("btnQr", "screen.qrButton", "qr_login", { variant: "primary" }));
  }
  children.push({ type: "ExpansionTile", key: "accountHelp", items: [{ key: "help", ...bi("screen.helpTitle", {}, "title"), children: [{ type: "Text", style: "p", ...bi("screen.helpBody") }] }] });
  return children;
}

/** The connection flow: connect, then (account mode) the sign-in. The open step is the first one still to do, or the one the person went back to. */
function stepsNode(view, state) {
  const account = view.mode === "account";
  const keys = account ? ["connect", "account"] : ["connect"];
  const done = { connect: view.complete, account: view.loggedIn };
  const reachable = (k) => k === "connect" || view.complete;
  const open = keys.includes(state.step) && reachable(state.step) ? state.step : keys.find((k) => !done[k]) || null;
  const mode = bi(account ? "screen.access.account" : "screen.access.bot");
  const items = [
    {
      key: "connect", ...bi("screen.step.connect", {}, "title"), state: open === "connect" ? "current" : done.connect ? "done" : "pending",
      subtitle: bi("screen.step.connected", { mode: mode.text }).text, subtitleEn: bi("screen.step.connected", { mode: mode.textEn }).textEn,
      ...(open === "connect" ? { children: connectStep(view) } : {}),
    },
  ];
  if (account) {
    items.push({
      key: "account", ...bi("screen.step.account", {}, "title"), state: open === "account" ? "current" : done.account ? "done" : "pending",
      ...bi("screen.step.signedIn", {}, "subtitle"),
      ...(open === "account" ? { children: accountStep(view, state) } : {}),
    });
  }
  return { type: "steps", key: "setup", onStepTap: "goStep", items };
}

function channelsCard(view) {
  const rows = view.places.map((p) => ({
    type: "Switch", key: "sw" + p.n, bind: p.key, labelText: p.gone ? p.title + " (" + bi("slots.gone").text + ")" : p.title, labelTextEn: p.gone ? p.title + " (" + bi("slots.gone").textEn + ")" : p.title,
  }));
  const children = [heading("screen.channels"), caption("screen.channelsHint", { n: SLOTS })];
  if (rows.length) children.push({ type: "Column", gap: 4, children: rows });
  else children.push({ type: "Text", style: "p", ...bi("slots.none") });
  if (view.waiting.length) {
    const list = (field) => view.waiting.slice(0, 4).map((w) => (w.wasOn ? bi("more.wasOn", { title: w.title })[field] : w.title)).join(", ") + (view.waiting.length > 4 ? " +" + (view.waiting.length - 4) : "");
    const es = bi("more.list", { list: list("text") });
    const en = bi("more.list", { list: list("textEn") });
    children.push({ type: "Text", style: "label", ...bi("screen.waiting") }, { type: "Text", key: "waitingLine", style: "caption", color: "muted", text: es.text, textEn: en.textEn });
    children.push(button("btnFree", "screen.freeButton", "free_slots", confirmOf("free.confirm")));
  }
  return card(children);
}

function indexCard(view) {
  return card([
    heading("screen.index"),
    caption("screen.indexHint"),
    { type: "Text", key: "indexLine", style: "p", text: view.index, textEn: view.index },
    { type: "Switch", key: "swTmdb", bind: "tmdb", ...bi("screen.tmdb", {}, "labelText") },
    caption("screen.tmdbHint"),
    { type: "Row", wrap: true, gap: 8, children: [
      button("btnRefresh", "screen.refreshButton", "refresh", { variant: "primary" }),
      button("btnForget", "screen.forgetButton", "forget", confirmOf("screen.forgetConfirm")),
    ] },
  ]);
}

/** The `screen` export: a pure view of the stored state and the screen's own (the QR to draw, the step the person went back to). */
export async function screen({ state }) {
  const view = setupView();
  const children = [{ type: "Text", style: "h2", ...bi("screen.title") }, statusBanner(view), stepsNode(view, state)];
  if (view.ready) children.push(channelsCard(view), indexCard(view));
  return {
    type: "SingleChildScrollView",
    every: { ms: TICK_MS, event: "tick" },
    children: [{ type: "Column", gap: 16, padding: { compact: 16, expanded: 32 }, children }],
  };
}

const signature = (state) => kino.crypto.hash("sha256", JSON.stringify([setupView(), state.qr || null, state.note || null, state.step || null])).slice(0, 16);

/** What a refresh answered, as the sentence the person reads. */
async function refreshNow() {
  const { shell, added, problem } = await refresh({ force: true });
  if (problem) {
    if (problem.kind === "flood" || problem.kind === "budget") return t(problem.kind === "flood" ? "setup.flood" : "setup.budget", { min: minutes((problem.until - Date.now()) / 1000) });
    const key = { config: credentials().mode === "account" ? "setup.configAccount" : "setup.config", token: "setup.token", api_id: "setup.apiId", network: "setup.network", signin: "setup.signin", closed: "setup.closed" }[problem.kind] || "setup.unavailable";
    return t(key);
  }
  return t("action.refreshed", { count: videoCount(shell.count), added });
}

/** The state patch that redraws the screen when what it shows changed (and carries the QR to draw, if any). */
async function resync(state) {
  const login = await qrPoll();
  // What the login said while no code is up (it expired, Telegram refused, a wait): kept until the next try.
  const note = login.qr ? null : login.status || state.note || null;
  const next = { ...state, qr: login.qr || null, qrMs: login.qr ? login.expiresInMs : null, note };
  const sig = signature(next);
  return sig === state.sig ? null : { qr: next.qr, qrMs: next.qrMs, note, sig };
}

/** The connect step's submit: what was typed, or what is already saved, must make a complete and well-formed set. */
function connect(value) {
  const c = credentials();
  const typed = (k) => String((value && value[k]) ?? "").trim();
  const config = {};
  for (const key of c.mode === "account" ? ["api_id", "api_hash"] : ["api_id", "api_hash", "bot_token"]) {
    const v = typed(key);
    const problem = v ? problemWith(key, v) : null;
    if (problem) return { toast: problem };
    if (v) config[key] = v;
    else if (!kino.config.get(key)) return { toast: problemWith(key, "!") };
  }
  return { config, state: { step: null, sig: null }, toast: t("screen.saved") };
}

/** The `screenEvent` export. A failure is a toast, and every button comes back on. */
export async function screenEvent({ name, arg, value, state }) {
  try {
    return await run(name, arg, value, state);
  } catch (e) {
    kino.log("screen event " + name + " failed: " + (e && e.code ? e.code : "error"));
    return { toast: t("setup.unavailable"), ui: BUSY.map((key) => ({ enable: key })) };
  }
}

async function run(name, arg, value, state) {
  switch (name) {
    case "open":
    case "tick":
    case "qr_renew": {
      const patch = await resync(state);
      return patch ? { state: patch } : null;
    }
    case "mode":
      return { state: { sig: null, step: null } };
    case "goStep":
      return { state: { step: typeof arg === "string" ? arg : null, sig: null } };
    case "connect":
      return connect(value);
    case "password": {
      const answer = await confirmPassword(value && value.tg_password);
      return { state: await resync({ ...state, note: null, sig: null }), toast: answer.message };
    }
    case "qr_login": {
      const message = await startQr();
      return { state: await resync({ ...state, note: null, sig: null }), toast: message, ...settled("btnQr") };
    }
    case "logout": {
      const answer = await logout();
      return { state: { qr: null, qrMs: null, note: null, step: null, sig: null }, toast: answer.message, ...settled("btnLogout") };
    }
    case "free_slots": {
      const n = freeSlots();
      return { state: { sig: null }, toast: n ? t("free.done", { n }) : t("free.none"), ...settled("btnFree") };
    }
    case "refresh":
      return { state: { sig: null }, toast: await refreshNow(), ...settled("btnRefresh") };
    case "forget":
      await forget();
      return { state: { qr: null, qrMs: null, note: null, step: null, sig: null }, toast: t("action.forgot"), ...settled("btnForget") };
    default:
      return null;
  }
}

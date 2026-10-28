// The whole plugin as Kino runs it, in Node: the single-file bundle of src/plugin.js loaded by the kit's sandbox
// (sdk/sandbox.mjs loadPlugin: its own realm, only Kino's globals), on the kit's kino (sdk/kino-shim.mjs: storage,
// catalog, crypto, ws with its host gate) with the settings swapped per "runtime", against the fake Telegram cluster.
//
// The one change to the bundle: the fake DC has its own RSA key, so the line that picks Telegram's public keys is
// replaced by the fake ones (exactly one line, asserted). Everything else is the file Kino would load.
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "../scripts/build.mjs";
import { loadPlugin } from "../sdk/sandbox.mjs";
import { createKino } from "../sdk/kino-shim.mjs";
import { fakeRsa } from "./fake-dc.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const MANIFEST = JSON.parse(readFileSync(join(root, "kino-plugin.json"), "utf8"));
export const KEYS_LINE = "const PUBLIC_KEYS = TELEGRAM_PUBLIC_KEYS;";

/** The bundle with the fake cluster's RSA key in place of Telegram's. */
export function testBundle() {
  const source = bundle(join(root, "src/plugin.js"));
  const parts = source.split(KEYS_LINE);
  if (parts.length !== 2) throw new Error("the public keys line must appear exactly once in the bundle");
  return parts.join("const PUBLIC_KEYS = " + JSON.stringify(fakeRsa().publicKeys) + ";");
}

/** Settings as Kino gives them: the person's values, else the manifest default (toggles false without one). */
function configOf(values) {
  const out = {};
  for (const s of MANIFEST.settings) {
    if (["section", "status", "action"].includes(s.type)) continue;
    const v = values[s.key] !== undefined ? values[s.key] : s.default !== undefined ? s.default : s.type === "toggle" ? false : undefined;
    if (v !== undefined && v !== "") out[s.key] = v;
  }
  return Object.freeze({ get: (k) => out[k], all: () => ({ ...out }) });
}

/**
 * A device: one kino.storage and one kino.catalog that survive runtimes, like the app's. `runtime(values)` loads a
 * fresh copy of the plugin (a new sandbox: module state gone, as after an idle close or a settings change) with those
 * settings. Logs of every runtime (console and kino.log) are collected in `logs`.
 */
export function device({ lang = "es-CO", metaFixture = null } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "tg-plugin-"));
  const file = join(dir, "plugin.js");
  writeFileSync(file, testBundle());
  const { kino: base } = createKino(MANIFEST, { env: {}, config: {}, metaFixture });
  const logs = [];
  const sink = (...a) => logs.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  const pluginConsole = { log: sink, info: sink, warn: sink, error: sink };
  const kinoLog = Object.assign((...a) => sink("[kino.log]", ...a), { report: (...a) => sink("[kino.log.report]", ...a) });
  let previous = null; // the sockets of the last runtime opened with closePrevious (Kino closes a sandbox's sockets with it)
  return {
    base,
    logs,
    /**
     * `closePrevious`: this runtime replaces the last one opened with the same option, as Kino replaces a sandbox after a
     * settings change: that one's sockets are closed first (Kino allows 4 open sockets per plugin).
     */
    async runtime(values = {}, { lang: runtimeLang = lang, catalog = base.catalog, crypto = base.crypto, meta = base.meta, now = null, closePrevious = false } = {}) {
      let ws = base.ws;
      if (closePrevious && base.ws) {
        if (previous) { for (const sock of previous) { try { await sock.close(); } catch { /* closed */ } } }
        const mine = (previous = new Set());
        ws = Object.freeze({ ...base.ws, open: async (...a) => { const sock = await base.ws.open(...a); mine.add(sock); return sock; } });
      }
      const kino = Object.freeze({ ...base, lang: runtimeLang, config: configOf(values), log: kinoLog, catalog, crypto, ws, meta: meta === null ? undefined : meta, ...(now ? { now } : {}) });
      const { plugin } = await loadPlugin(file, kino, { console: pluginConsole });
      // Answers cross into Kino as JSON (README section 4), so they come back here as JSON too (main-realm values).
      const calls = {};
      for (const [name, fn] of Object.entries(plugin)) {
        if (typeof fn === "function") calls[name] = async (...args) => { const v = await fn(...JSON.parse(JSON.stringify(args))); return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
      }
      return withScreen(calls, values, runtimeLang);
    },
    /** Every stored key and value, as one string (for the secret scans). */
    storageDump() {
      return JSON.stringify(Object.fromEntries(base.storage.keys().map((k) => [k, base.storage.get(k)])));
    },
    async catalogDump() {
      const all = [];
      for (let offset = 0; ; offset += 100) {
        const page = await base.catalog.search({ limit: 100, offset });
        all.push(...page.items);
        if (offset + page.items.length >= page.total) break;
      }
      return all;
    },
    close() { rmSync(dir, { recursive: true, force: true }); },
  };
}

/** The settings' places line ("1 ✓ Pelis · 2 — Viajes · 3 libre") as one string per place, without its number. */
export function places(status) {
  const out = [];
  for (const part of String(status.channels_status || "").split(" · ")) {
    const m = /^(\d+) (.*)$/.exec(part);
    if (m) out[Number(m[1]) - 1] = m[2];
  }
  return out;
}

const merge = (state, patch) => {
  for (const [k, v] of Object.entries(patch || {})) { if (v === null) delete state[k]; else state[k] = v; }
};
const walk = (node, visit) => {
  if (!node || typeof node !== "object") return;
  visit(node);
  for (const c of node.children || []) walk(c, visit);
  for (const i of node.items || []) walk(i, visit);
};

/**
 * The runtime as the person drives it through the setup screen: Kino keeps the screen's `state` (merging each answer's
 * patch) and draws `screen()`. `action(key)` presses the screen's button of that name (check_password submits the 2FA
 * form with the runtime's `tg_password` value) and answers `{ message }` from the toast; `view()` reads the drawn tree back into the lines a test
 * asserts on (the account line, the QR text, the places, the waiting line, the index line).
 */
function withScreen(calls, values, lang) {
  const state = {};
  const en = String(lang).toLowerCase().startsWith("en");
  const say = (n, field = "text") => (en && n[field + "En"] !== undefined ? n[field + "En"] : n[field]);
  const event = async (name, arg, value) => {
    const answer = await calls.screenEvent({ name, arg, value, state: { ...state } });
    if (answer) merge(state, answer.state);
    return answer;
  };
  return {
    ...calls,
    event,
    state: () => ({ ...state }),
    async action(key) {
      const names = { qr_login: "qr_login", logout: "logout", free_slots: "free_slots", refresh: "refresh", forget: "forget", check_password: "password" };
      if (!names[key]) return null;
      // The 2FA step is a masked form: what the person typed arrives as the event's value, nowhere else.
      const answer = key === "check_password" ? await event("password", undefined, { tg_password: values.tg_password }) : await event(names[key]);
      const toast = answer && answer.toast;
      return { message: toast && typeof toast === "object" ? toast.text : toast };
    },
    async view() {
      await event("tick");
      const tree = await calls.screen({ state: { ...state } });
      const out = { places: {}, tree };
      walk(tree, (n) => {
        if (n.key === "accountLine") out.account_status = say(n);
        if (n.type === "QrImage") out.login_qr = n.value;
        if (n.key === "noteLine") out.note = say(n);
        if (n.key === "waitingLine") out.channels_more = say(n);
        if (n.key === "indexLine") out.index_status = say(n);
        const m = n.type === "Switch" && /^sw(\d)$/.exec(n.key || "");
        if (m) out.places[Number(m[1])] = say(n, "labelText");
      });
      const line = [];
      for (let i = 1; i <= 6; i++) {
        const name = out.places[i];
        if (name === undefined) { line.push(i + " " + (en ? "free" : "libre")); continue; }
        const gone = / \((sin acceso|no access)\)$/.test(name);
        line.push(i + (gone ? " ✗ " : values["ch" + i] === true || (values["ch" + i] === undefined && i === 1) ? " ✓ " : " — ") + name);
      }
      out.channels_status = line.join(" · ");
      if (out.channels_more === undefined) out.channels_more = en ? "None" : "Ninguno";
      return out;
    },
  };
}

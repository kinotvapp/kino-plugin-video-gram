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
export function device({ lang = "es-CO" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "tg-plugin-"));
  const file = join(dir, "plugin.js");
  writeFileSync(file, testBundle());
  const { kino: base } = createKino(MANIFEST, { env: {}, config: {} });
  const logs = [];
  const sink = (...a) => logs.push(a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" "));
  const pluginConsole = { log: sink, info: sink, warn: sink, error: sink };
  const kinoLog = Object.assign((...a) => sink("[kino.log]", ...a), { report: (...a) => sink("[kino.log.report]", ...a) });
  return {
    base,
    logs,
    async runtime(values = {}, { lang: runtimeLang = lang } = {}) {
      const kino = Object.freeze({ ...base, lang: runtimeLang, config: configOf(values), log: kinoLog });
      const { plugin } = await loadPlugin(file, kino, { console: pluginConsole });
      // Answers cross into Kino as JSON (README section 4), so they come back here as JSON too (main-realm values).
      const calls = {};
      for (const [name, fn] of Object.entries(plugin)) {
        if (typeof fn === "function") calls[name] = async (...args) => { const v = await fn(...JSON.parse(JSON.stringify(args))); return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); };
      }
      return calls;
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

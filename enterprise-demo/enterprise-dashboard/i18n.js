const manifestUrl = new URL("./locales/manifest.json", import.meta.url);
let manifest = [];
let fallbackMessages = {};
let activeMessages = {};
let activeLocale = "ko";

const aliases = {
  zh: "zh-CN",
  "zh-Hans": "zh-CN",
  "zh-Hant": "zh-TW",
  "zh-HK": "zh-TW",
  "zh-MO": "zh-TW",
  "ko-KR": "ko",
  "en-US": "en",
  "en-GB": "en"
};

export async function initializeI18n() {
  manifest = await fetchJson(manifestUrl);
  const fallbackPack = await loadPack("ko");
  fallbackMessages = fallbackPack.messages;
  const locale = resolveLocale();
  await setLocale(locale, { updateUrl: false });
  return { locale: activeLocale, manifest };
}

export function getManifest() {
  return manifest.slice();
}

export function getLocale() {
  return activeLocale;
}

export async function setLocale(requested, options = {}) {
  const locale = normalizeLocale(requested);
  const pack = locale === "ko" ? { messages: fallbackMessages } : await loadPack(locale);
  activeMessages = pack.messages || {};
  activeLocale = locale;
  const entry = manifest.find((item) => item.code === locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = entry?.dir || "ltr";
  document.title = t("meta.title");
  localStorage.setItem("feelgood.enterprise.locale", locale);
  if (options.updateUrl !== false) {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", locale);
    history.replaceState(history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }
  applyTranslations(document);
  return locale;
}

export function t(key, values = {}) {
  let value = activeMessages[key];
  if (typeof value !== "string" || value.length === 0) {
    value = fallbackMessages[key];
    if (activeLocale !== "ko") console.warn(`[enterprise-i18n] fallback ${activeLocale}: ${key}`);
  }
  if (typeof value !== "string") {
    console.error(`[enterprise-i18n] missing key: ${key}`);
    return "";
  }
  return value.replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  ));
}

export function applyTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
}

export function number(value, options = {}) {
  return new Intl.NumberFormat(activeLocale, options).format(value);
}

export function date(value) {
  return new Intl.DateTimeFormat(activeLocale, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

function resolveLocale() {
  const urlLocale = new URL(window.location.href).searchParams.get("lang");
  const stored = localStorage.getItem("feelgood.enterprise.locale");
  const browser = navigator.language;
  return normalizeLocale(urlLocale || stored || browser || "ko");
}

function normalizeLocale(value) {
  if (!value) return "ko";
  if (manifest.some((item) => item.code === value)) return value;
  if (aliases[value] && manifest.some((item) => item.code === aliases[value])) return aliases[value];
  const base = value.split("-")[0];
  const matched = manifest.find((item) => item.code === base);
  return matched?.code || "ko";
}

async function loadPack(locale) {
  const entry = manifest.find((item) => item.code === locale) || manifest[0];
  return fetchJson(new URL(`./locales/${entry.file}`, import.meta.url));
}

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${url}`);
  return response.json();
}


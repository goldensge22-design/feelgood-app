import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MESSAGES, PARTIAL } from "./messages";
import { LOCALES, resolveLocale } from "./i18n";
import { PROV_RAW, PROV_LOCALE_ORDER } from "./provenance-messages";
import { STAR_RAW, STAR_LOCALE_ORDER } from "./star-story-messages";
import { JOB_CONNECTION_RAW, JOB_CONNECTION_LOCALES } from "./job-connection-messages";

const placeholders = (text: string) => [...new Set(text.match(/\{[a-z]+\}/g) ?? [])].sort();

test("all 15 locales contain every interface key and preserve placeholders", () => {
  assert.equal(LOCALES.length, 15);
  for (const locale of LOCALES) {
    for (const [key, [ko, en]] of Object.entries(MESSAGES)) {
      const translated = locale.id === "ko" ? ko : locale.id === "en" ? en : PARTIAL[locale.id]?.[key];
      assert.ok(translated?.trim(), `${locale.id}: missing ${key}`);
      assert.deepEqual(placeholders(translated), placeholders(ko), `${locale.id}: placeholders ${key}`);
    }
    for (const [key, values] of Object.entries(PROV_RAW)) {
      const translated = values[PROV_LOCALE_ORDER.indexOf(locale.id)];
      assert.ok(translated?.trim(), `${locale.id}: missing ${key}`);
      assert.deepEqual(placeholders(translated), placeholders(values[0]), `${locale.id}: placeholders ${key}`);
    }
    for (const [key, values] of Object.entries(STAR_RAW)) {
      const translated = values[STAR_LOCALE_ORDER.indexOf(locale.id)];
      assert.ok(translated?.trim(), `${locale.id}: missing STAR ${key}`);
      assert.deepEqual(placeholders(translated), placeholders(values[0]), `${locale.id}: STAR placeholders ${key}`);
      if (locale.id !== "ko") assert.doesNotMatch(translated, /[가-힣]/u, `${locale.id}: Korean fallback in ${key}`);
    }
    assert.equal(JOB_CONNECTION_LOCALES.length, 15);
    for (const [key, values] of Object.entries(JOB_CONNECTION_RAW)) {
      assert.equal(values.length, JOB_CONNECTION_LOCALES.length, `${key}: locale count`);
      const translated = values[JOB_CONNECTION_LOCALES.indexOf(locale.id as typeof JOB_CONNECTION_LOCALES[number])];
      assert.ok(translated?.trim(), `${locale.id}: missing ${key}`);
      assert.deepEqual(placeholders(translated), placeholders(values[0]), `${locale.id}: placeholders ${key}`);
      if (locale.id !== "ko") assert.doesNotMatch(translated, /[가-힣]/u, `${locale.id}: Korean fallback in ${key}`);
    }
  }
});

test("locale aliases and RTL locale identity remain explicit", () => {
  assert.equal(resolveLocale("zh_Hans"), "zh-CN");
  assert.equal(resolveLocale("zh-Hant"), "zh-TW");
  assert.equal(resolveLocale("zh-HK"), "zh-TW");
  assert.equal(resolveLocale("ar-SA"), "ar");
  assert.equal(resolveLocale("km-KH"), "km");
  assert.equal(resolveLocale("unrecognised"), null);
});

test("every literal UI translation reference has a defined source key", () => {
  const missing = new Set<string>();
  function scan(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== "ui" && entry.name !== "locales") scan(path);
      else if (entry.isFile() && /\.[jt]sx?$/.test(path) && !/\.test\./.test(path)) {
        const text = readFileSync(path, "utf8");
        for (const match of text.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
          if (!MESSAGES[match[1]] && !PROV_RAW[match[1]] && !STAR_RAW[match[1]] && !JOB_CONNECTION_RAW[match[1]]) missing.add(match[1]);
        }
      }
    }
  }
  scan("artifacts/nuvia-career/src");
  assert.deepEqual([...missing], []);
});

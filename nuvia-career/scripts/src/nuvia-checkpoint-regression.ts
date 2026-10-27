/// <reference lib="dom" />
/**
 * Focused regression of the checkpoint patch; does not repeat the 45 full
 * writing journeys or claim authenticated/external integration verification.
 * Errors survive navigation in the Node collector (not just the last page).
 */
import { chromium, type Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const locales = ["ko", "en", "ja", "zh-CN", "zh-TW", "mn", "th", "vi", "ar", "ru", "km", "es", "fr", "it", "az"];
const sizes = [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 360, height: 800 }];
const root = process.env.NUVIA_TEST_ORIGIN ?? "http://localhost:80";
const out = "generated-artifacts/checkpoint";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
const results: Record<string, unknown>[] = [];
async function run(locale: string, viewport: typeof sizes[number]) {
  const id = `${locale}-${viewport.width}`;
  const row: Record<string, unknown> = { id, events: [], scans: [], checks: [] };
  const events = row.events as unknown[];
  const context = await browser.newContext({ viewport });
  await context.exposeBinding("__checkpointEvent", (_, event) => { events.push(event); });
  await context.addInitScript({ content: String.raw`
    const emit = (kind, data) => {
      // Only diagnostics, no DOM/typed contents/cookies/storage or URL queries.
      void window.__checkpointEvent({ kind, at: Date.now(), ...data }).catch(() => {});
    };
    window.addEventListener("error", (e) => emit("window-error", {
      message: e.message, file: e.filename?.split("?")[0], line: e.lineno, column: e.colno,
      errorName: e.error?.name, errorMessage: e.error?.message,
    }));
    window.addEventListener("unhandledrejection", (e) => emit("unhandledrejection", {
      reasonType: typeof e.reason, name: e.reason?.name,
      message: e.reason?.message ?? (typeof e.reason === "string" ? e.reason.slice(0, 500) : null),
    }));
  ` });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => events.push({ kind: "pageerror", name: e.name, message: e.message }));
  async function ready() {
    await page.getByTestId("button-language").waitFor();
    await page.locator("h1").first().waitFor();
    await page.waitForTimeout(180);
  }
  async function scan(screen: string) {
    const geometry = await page.evaluate(() => {
      const b = document.querySelector('[data-testid="button-language"]')!.getBoundingClientRect();
      return { width: innerWidth, scroll: document.documentElement.scrollWidth, x: b.x, y: b.y, w: b.width, h: b.height, dir: document.documentElement.dir };
    });
    assert(geometry.w >= 44 && geometry.h >= 44 && geometry.x >= viewport.width / 2);
    assert(geometry.scroll <= viewport.width + 2, `${screen}: horizontal overflow`);
    assert.equal(geometry.dir, locale === "ar" ? "rtl" : "ltr");
    assert.equal(await page.getByTestId("banner-translation-review").count(), 0);
    (row.scans as unknown[]).push({ screen, ...geometry });
    await page.screenshot({ path: `${out}/${id}-${screen}.png` });
  }
  const mark = (s: string) => (row.checks as string[]).push(s);
  try {
    await page.goto(`${root}/?lang=${locale}&space=guest&context=checkpoint#preserve`);
    await ready();
    assert.equal(await page.getByTestId("banner-demo").count(), 0);
    assert.equal(await page.getByTestId("button-open-example").count(), 0);
    await page.getByTestId("link-direct-record").waitFor();
    assert.equal(await page.getByTestId("card-job-0").count(), 0);
    const typed = "Synthetic selected job — 서비스기획 / العربية";
    await page.getByTestId("input-selected-job").fill(typed);
    await page.getByTestId("button-language").click();
    const otherLocale = locale === "en" ? "ko" : "en";
    await page.getByTestId(`option-language-${otherLocale}`).click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    await page.waitForFunction(l => document.documentElement.lang === l, otherLocale);
    await page.getByTestId("button-language").click();
    await page.getByTestId(`option-language-${locale}`).click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    assert.equal(await page.getByTestId("input-selected-job").inputValue(), typed);
    assert(page.url().includes("context=checkpoint") && page.url().endsWith("#preserve"));
    await page.reload(); await ready();
    assert.equal(await page.getByTestId("input-selected-job").inputValue(), typed);
    mark("personal summary, selector/URL/user input preserved after language change and reload");
    await scan("personal-summary");
    await page.getByTestId("link-direct-record").click();
    await page.getByRole("dialog").waitFor();
    mark("direct-record CTA opens actual experience form, not fictional data");
    await page.goto(`${root}/criteria?lang=${locale}&space=guest`);
    await ready();
    const sources = page.locator('[data-testid^="text-source-type-common-"]');
    await sources.first().waitFor();
    assert(await sources.count() > 0);
    for (const source of await sources.all()) {
      const label = (await source.innerText()).trim();
      const metadata = await source.locator("..").innerText();
      assert.equal(metadata.split(label).length - 1, 1, "common source label duplicated");
    }
    assert(await page.locator('[data-testid^="text-source-type-ncs-"]').count() > 0);
    mark("common source rendered once; official source/date/version retained");
    await scan("criteria");
    await page.goto(`${root}/?lang=${locale}&space=guest`);
    await ready();
    await page.getByTestId("button-try-example").click();
    await page.getByTestId("banner-demo").waitFor();
    await page.waitForFunction(() => !!JSON.parse(localStorage.getItem("nuvia:example:state") ?? "null")?.report);
    assert(page.url().includes("space=example"));
    await page.reload(); await ready();
    await page.getByTestId("button-leave-demo").waitFor();
    assert.equal(await page.getByTestId("link-direct-record").count(), 0);
    await scan("separate-example");
    await page.getByTestId("button-leave-demo").click();
    await page.getByTestId("banner-guest").waitFor();
    assert(page.url().includes("space=guest"));
    await page.reload(); await ready();
    assert.equal(await page.getByTestId("input-selected-job").inputValue(), typed);
    mark("example clearly separate; returning preserves original personal state");
    assert.equal(events.length, 0, JSON.stringify(events));
    assert.equal(await page.locator("vite-error-overlay").count(), 0);
    row.status = "passed";
  } catch (e) {
    row.status = "failed"; row.error = String(e);
    await page.screenshot({ path: `${out}/${id}-failure.png` }).catch(() => {});
  } finally {
    await context.close();
    results.push(row);
    await writeFile(`${out}/regression.json`, JSON.stringify({ scope: "checkpoint UI regression; isolated device contexts; NOT account/external E2E", results }, null, 2));
    console.log(`${id}: ${row.status}${row.error ? ` ${row.error}` : ""}`);
  }
}
try {
  const selected = process.argv.find((a) => a.startsWith("--case="))?.slice(7);
  const cases = locales.flatMap(l => sizes.map(v => [l, v] as const))
    .filter(([l, v]) => !selected || selected === `${l}-${v.width}`);
  for (let i = 0; i < cases.length; i += 3) {
    await Promise.all(cases.slice(i, i + 3).map(([l, v]) => run(l, v)));
    if (results.some(r => r.status === "failed")) break;
  }
} finally { await browser.close(); }
console.log(`${results.filter(r => r.status === "passed").length}/${results.length} passed`);
if (results.some(r => r.status === "failed")) process.exitCode = 1;

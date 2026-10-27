/// <reference lib="dom" />
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const locales = ["ko", "en", "ja", "zh-CN", "zh-TW", "mn", "th", "vi", "ar", "ru", "km", "es", "fr", "it", "az"];
const viewports = [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 360, height: 800 }];
const root = process.env.NUVIA_TEST_ORIGIN ?? "http://localhost:80";
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
const out = "generated-artifacts/browser";
await mkdir(out, { recursive: true });
const results: Record<string, unknown>[] = [];
// Observe public sign-in only. No Clerk form interaction/session impersonation.
async function run(locale: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await page.goto(`${root}/sign-in?lang=${locale}`);
    await page.locator(".cl-card").first().waitFor({ timeout: 20000 });
    for (const size of viewports) {
      const row: Record<string, unknown> = { screen: "sign-in", locale, width: size.width };
      try {
        await page.setViewportSize(size);
        await page.waitForTimeout(220);
        const box = await page.getByTestId("button-language").boundingBox();
        assert(box && box.height >= 44 && box.width >= 44 && box.x >= size.width / 2);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "sign-in horizontally overflows");
        const visibleWidgetText = await page.locator(".cl-card").first().innerText();
        if (locale === "km" || locale === "az") {
          assert(!/Sign in|Welcome back|Email address|Password|Continue|Sign up/i.test(visibleWidgetText), "visible login has common English fallback");
        }
        await page.screenshot({ path: `${out}/signin-${locale}-${size.width}.png` });
        row.status = "passed";
        row.visibleWidgetText = visibleWidgetText.slice(0, 1800);
      } catch (e) {
        row.status = "failed"; row.error = String(e);
        await page.screenshot({ path: `${out}/signin-${locale}-${size.width}-failure.png` }).catch(() => {});
      }
      results.push(row);
    }
    await page.goto(`${root}/?lang=${locale}&space=guest`);
    await page.getByTestId("input-selected-job").waitFor({ timeout: 20000 });
    await page.evaluate("document.fonts.ready.then(() => true)");
    for (const size of viewports) {
      const row: Record<string, unknown> = { screen: "summary-latest", locale, width: size.width };
      try {
        await page.setViewportSize(size);
        await page.waitForTimeout(180);
        const box = await page.getByTestId("button-language").boundingBox();
        assert(box && box.height >= 44 && box.width >= 44 && box.x >= size.width / 2);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), "latest summary horizontally overflows");
        await page.screenshot({ path: `${out}/summary-latest-${locale}-${size.width}.png` });
        row.status = "passed";
      } catch (e) { row.status = "failed"; row.error = String(e); }
      results.push(row);
    }
  } catch (e) { results.push({ locale, status: "unverified", error: String(e) }); }
  finally { await context.close(); }
}
try {
  for (let i = 0; i < locales.length; i += 3) await Promise.all(locales.slice(i, i + 3).map(run));
} finally {
  await browser.close();
  await writeFile(`${out}/signin-display.json`, JSON.stringify({ scope: "public login display only; NO successful login/account save/restore verification", results }, null, 2));
}
  console.log(JSON.stringify(results.filter((r) => r.status !== "passed"), null, 2));
  console.log(`public login + latest summary display: ${results.filter((r) => r.status === "passed").length}/${results.length} passed`);
if (results.some((r) => r.status !== "passed")) process.exitCode = 1;

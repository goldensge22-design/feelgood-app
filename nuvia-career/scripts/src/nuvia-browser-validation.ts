/// <reference lib="dom" />
/**
 * Real browser validation of device-only mode. This deliberately does NOT
 * impersonate a logged-in user, bypass Clerk, or claim external integration.
 * All browser storage belongs to disposable synthetic contexts.
 */
import { chromium, type Page } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const locales = ["ko", "en", "ja", "zh-CN", "zh-TW", "mn", "th", "vi", "ar", "ru", "km", "es", "fr", "it", "az"];
const viewports = [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 360, height: 800 }];
const root = process.env.NUVIA_TEST_ORIGIN ?? "http://localhost:80";
const out = "generated-artifacts/browser";
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
await mkdir(out, { recursive: true });
const results: Record<string, unknown>[] = [];
const smoke = process.argv.includes("--smoke");
const restoreText = "검증용 직접 작성: 두 안내의 신청 단계를 비교하여 표로 기록했습니다.\n개선 효과나 합격 가능성은 확인하지 않았습니다.\nEnglish 日本語 العربية ไทย ខ្មែរ 𠮷";
const resultsFile = process.env.NUVIA_TEST_RESULT_FILE ?? `${out}/${smoke ? "smoke" : "matrix"}.json`;
if (!smoke && process.argv.includes("--resume")) {
  const prior = JSON.parse(await readFile(resultsFile, "utf8"));
  results.push(...prior.results.filter((r: any) => r.status === "passed"));
}

async function state(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem("nuvia:guest:state") ?? "{}"));
}
async function settled(page: Page) {
  await page.getByTestId("button-language").waitFor();
  await page.locator("h1").first().waitFor();
  await page.waitForTimeout(140);
}
async function shot(page: Page, id: string, screen: string, row: Record<string, unknown>) {
  const geometry = await page.evaluate(() => {
    const button = document.querySelector('[data-testid="button-language"]')!.getBoundingClientRect();
    return {
      width: innerWidth, scroll: document.documentElement.scrollWidth,
      selector: { x: button.x, y: button.y, width: button.width, height: button.height },
      lang: document.documentElement.lang, dir: document.documentElement.dir,
      horizontalOffenders: Array.from(document.querySelectorAll("main *")).filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.left < -2 || r.right > innerWidth + 2);
      }).slice(0, 8).map((e) => ({ tag: e.tagName, testId: e.getAttribute("data-testid"), class: e.className })),
    };
  });
  const scans = row.scans as Record<string, unknown>;
  scans[screen] = geometry;
  assert(geometry.selector.height >= 43.9 && geometry.selector.width >= 43.9, `selector target too small: ${JSON.stringify(geometry.selector)}`);
  assert(geometry.selector.x >= -1 && geometry.selector.x + geometry.selector.width <= geometry.width + 1, "selector outside viewport");
  assert(geometry.selector.x >= geometry.width / 2, "language selector must remain in the upper-right area, including RTL");
  assert(geometry.scroll <= geometry.width + 2, `horizontal overflow on ${screen}: ${JSON.stringify(geometry)}`);
  await page.screenshot({ path: `${out}/${id}-${screen}.png` });
}
async function goto(page: Page, route: string, locale: string) {
  await page.goto(`${root}${route}${route.includes("?") ? "&" : "?"}lang=${locale}&space=guest`);
  await settled(page);
}
async function changeStatus(page: Page, n: number) {
  await page.locator('[data-testid^="button-edit-act-"]').first().click();
  await page.getByTestId("select-act-status").click();
  await page.getByRole("option").nth(n).click();
  await page.getByTestId("button-save-act").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.waitForTimeout(100);
}
async function saveVersion(page: Page, label: string) {
  await page.getByTestId("button-save-version").click();
  await page.getByTestId("input-version-label").fill(label);
  await page.getByTestId("button-confirm-version").click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
}

async function run(locale: string, viewport: typeof viewports[number]) {
  const id = `${locale}-${viewport.width}`;
  const row: Record<string, unknown> = { id, locale, viewport, scope: "device-only; NOT authenticated or external connectors", scans: {}, checks: [] };
  const checks = row.checks as string[];
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const browserEvents: unknown[] = [];
  await context.exposeBinding("__validationRecordEvent", (_, event) => { browserEvents.push(event); });
  await context.addInitScript(`window.__validationBrowserEvents = [];
    window.__validationResize = [];
    var OriginalResizeObserver = window.ResizeObserver;
    window.ResizeObserver = class extends OriginalResizeObserver {
      constructor(callback) {
        var creation = new Error('ResizeObserver creation').stack;
        super(function(entries, observer) {
          window.__validationResize.push({
            creation: creation,
            entries: entries.map(function(entry) {
              return {tag:entry.target.tagName, role:entry.target.getAttribute('role'),
                testId:entry.target.getAttribute('data-testid'),
                width:entry.contentRect.width, height:entry.contentRect.height};
            })
          });
          window.__validationResize = window.__validationResize.slice(-12);
          callback(entries, observer);
        });
      }
    };
    window.addEventListener('error', function(e) {
      var event = {type:'error', message:e.message, error:String(e.error), filename:e.filename?.split('?')[0], line:e.lineno,
        resize: /ResizeObserver/.test(e.message) ? window.__validationResize : undefined};
      window.__validationBrowserEvents.push(event);
      void window.__validationRecordEvent(event).catch(function() {});
    });
    window.addEventListener('unhandledrejection', function(e) {
      var event = {type:'rejection', reason:String(e.reason)};
      window.__validationBrowserEvents.push(event);
      void window.__validationRecordEvent(event).catch(function() {});
    });`);
  const page = await context.newPage();
  page.setDefaultTimeout(13000);
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 400)));
  try {
    await goto(page, "/", locale);
    assert.equal(await page.locator("html").getAttribute("dir"), locale === "ar" ? "rtl" : "ltr");
    await shot(page, id, "summary-unconnected", row);
    await goto(page, "/experiences", locale);
    assert.equal(await page.locator('[data-testid^="card-exp-"]').count(), 0);
    await shot(page, id, "archive-empty", row);
    await goto(page, "/connections", locale);
    await shot(page, id, "connections-unconnected", row);
    await goto(page, "/criteria", locale);
    await page.getByTestId("button-accept-ncs-common-analysis-26v1").click();
    await page.getByTestId("link-small-activity-ncs-common-analysis-26v1").waitFor();
    await shot(page, id, "criteria-official-and-examples", row);
    await page.getByTestId("link-small-activity-ncs-common-analysis-26v1").click();
    await page.getByTestId("input-act-title").fill(`가상 검증 활동 ${id}`);
    await page.getByTestId("input-act-goal").fill("교내 예약 서비스의 서로 다른 신청 안내를 비교");
    await page.getByTestId("input-act-completion").fill("신청 단계와 비교 항목 2개 기록");
    await page.getByTestId("input-act-steps").fill("1. 안내 확인\n2. 신청 단계 기록\n3. 비교");
    await page.getByTestId("input-act-action").fill("서로 다른 두 안내의 신청 단계를 순서대로 기록했습니다.");
    await page.getByTestId("input-act-result").fill("USER-CHOSE-NOT-TO-SHARE-RESULT");
    await page.getByTestId("input-act-learning").fill("불편하다는 판단에는 구체적인 근거가 필요했습니다.");
    await page.getByTestId("input-act-evidence").fill("PRIVATE-EVIDENCE-NOT-IMPORTED");
    assert(await page.getByTestId("button-save-act").isDisabled());
    await page.getByTestId("checkbox-act-accept").check();
    await page.getByTestId("button-save-act").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    for (const n of [1, 2, 1, 3]) await changeStatus(page, n);
    if (process.argv.includes('--stress-resize')) {
      for (let cycle = 0; cycle < 20; cycle++) {
        for (const n of [1, 2, 1, 3]) await changeStatus(page, n);
      }
    }
    assert.equal((await state(page)).activities[0].status, "partial");
    checks.push("accepted local activity; active → paused → active → partial (NOT existing planner)");
    await shot(page, id, "activity-partial", row);
    await page.locator('[data-testid^="button-import-"]').first().click();
    await page.getByTestId("checkbox-import-result").uncheck();
    await page.getByTestId("button-confirm-import").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.waitForTimeout(100);
    let s = await state(page);
    assert.equal(s.experiences.length, 1);
    assert.equal(s.experiences[0].result, "");
    assert(!JSON.stringify(s.experiences).includes("PRIVATE-EVIDENCE"));
    await page.locator('[data-testid^="button-import-"]').first().click();
    await page.getByTestId("checkbox-import-result").uncheck();
    await page.getByTestId("button-confirm-import").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page.waitForTimeout(100);
    s = await state(page);
    assert.equal(s.experiences.length, 1, "repeat import created a duplicate");
    checks.push("selected facts only; repeated local import idempotent");
    await goto(page, "/experiences", locale);
    await shot(page, id, "archive-confirmed", row);
    await goto(page, "/questions", locale);
    await page.getByTestId("button-new-app").click();
    await page.getByTestId("input-company").fill(`검증용 가상기업 ${id}`);
    await page.getByTestId("input-job").fill("IT 서비스기획");
    await page.getByTestId("input-question").fill("어떤 근거를 확인하고 어떻게 행동했나요?\n구체적인 결과와 배움을 직접 작성해 주세요.");
    await page.getByTestId("input-limit").fill("700");
    await page.locator('[data-testid^="checkbox-app-exp-"]').first().check();
    const selectedExperience = await page.evaluate(() => localStorage.getItem('nuvia:guest:selected-experience'));
    assert(selectedExperience, "explicit experience selection was not persisted");
    await shot(page, id, "question", row);
    await page.getByTestId("button-go-write").click();
    await page.getByTestId("input-editor").fill(restoreText);
    const initialCoach = await page.getByTestId("text-coach-question").textContent();
    await page.getByTestId("button-next-coach").click();
    assert.equal(await page.getByTestId("input-editor").inputValue(), restoreText, "coach changed user writing");
    assert.notEqual(await page.getByTestId("text-coach-question").textContent(), initialCoach);
    const path = new URL(page.url()).pathname;
    await page.getByTestId("button-language").click();
    await page.getByTestId(`option-language-${locale === "en" ? "ko" : "en"}`).click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    await page.waitForTimeout(180);
    assert.equal(await page.getByTestId("input-editor").inputValue(), restoreText);
    assert.equal(await page.evaluate(() => localStorage.getItem('nuvia:guest:selected-experience')), selectedExperience);
    assert.equal(new URL(page.url()).pathname, path);
    await page.getByTestId("button-language").click();
    await page.getByTestId(`option-language-${locale}`).click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    await page.waitForTimeout(180);
    await page.reload();
    await settled(page);
    assert.equal(await page.evaluate(() => localStorage.getItem('nuvia:guest:selected-experience')), selectedExperience);
    assert.equal(await page.getByTestId("input-editor").inputValue(), restoreText);
    await goto(page, "/experiences", locale);
    assert.match(
      await page.getByTestId(`card-exp-${JSON.parse(selectedExperience)}`).getAttribute('class') ?? '',
      /ring-2/,
      'selected experience did not restore in the actual archive UI',
    );
    await goto(page, "/write", locale);
    assert.equal(await page.getByTestId("input-editor").inputValue(), restoreText);
    s = await state(page);
    assert.equal(s.applications[0].experienceIds.length, 1);
    assert.equal(s.activities[0].status, "partial");
    checks.push("language switch preserves route, input, selection, activity; reload restores device data");
    await shot(page, id, "writer", row);
    await saveVersion(page, "가상 검증 버전 A");
    await page.getByTestId("input-editor").fill(`${restoreText}\n두 번째 수정 내용`);
    await saveVersion(page, "가상 검증 버전 B");
    await goto(page, "/versions", locale);
    const pickers = page.locator('[data-testid^="checkbox-version-"]');
    await pickers.nth(0).check(); await pickers.nth(1).check();
    assert.equal(await page.locator('[data-testid^="compare-col-"]').count(), 2);
    await shot(page, id, "version-compare", row);
    await page.locator('[data-testid^="button-restore-"]').nth(1).click();
    await page.getByTestId("input-editor").waitFor();
    assert.equal(await page.getByTestId("input-editor").inputValue(), restoreText);
    await page.waitForTimeout(100);
    assert.equal((await state(page)).applications.length, 2);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("nuvia:guest:versions") ?? "[]").length), 2);
    checks.push("two immutable local versions compared; previous version makes independent new draft");
    await page.getByTestId("link-go-export").click();
    await page.getByTestId("preview-text").waitFor();
    assert.equal(await page.getByTestId("preview-text").textContent(), restoreText);
    assert(await page.getByTestId("button-export-hwpx").isDisabled());
    await page.getByTestId("checkbox-facts").check();
    assert(await page.getByTestId("button-export-hwpx").isEnabled());
    await page.getByTestId("button-manual-copy").click();
    const exportText = await page.getByTestId("textarea-manual-copy").inputValue();
    assert(exportText.includes(restoreText));
    assert(!exportText.includes("PRIVATE-EVIDENCE") && !exportText.includes("USER-CHOSE-NOT"));
    if (viewport.width === 1440) {
      for (const format of locale === "ko" ? ["txt", "docx", "hwpx"] : ["hwpx"]) {
        const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId(`button-export-${format}`).click()]);
        assert.equal(await download.failure(), null);
        await download.saveAs(`${out}/${id}-submission.${format}`);
      }
    }
    await shot(page, id, "export-preview", row);
    checks.push("facts confirmation gate; four-field preview/manual copy; real download at desktop");
    await goto(page, "/journey", locale);
    await shot(page, id, "journey", row);
    assert.equal(pageErrors.length, 0, pageErrors.join("; "));
    row.status = "passed";
  } catch (e) {
    row.status = "failed";
    row.error = (e as Error).stack?.slice(0, 2200);
    row.url = page.url();
    await page.screenshot({ path: `${out}/${id}-failure.png` }).catch(() => {});
  } finally {
    row.pageErrors = pageErrors;
    row.browserEvents = browserEvents;
    results.push(row);
    console.log(`${id}: ${row.status}${row.error ? ` ${String(row.error).split("\n")[0]}` : ""}`);
    await writeFile(resultsFile, JSON.stringify({
      createdAt: new Date().toISOString(),
      scope: "Browser device-only journey; no authenticated login / external product validation / native document visual opening / native language review",
      results,
    }, null, 2));
    await context.close();
  }
}

try {
  const onlyCase = process.argv.find((a) => a.startsWith("--case="))?.split("=")[1];
  const cases = (smoke ? ["ko"] : locales).flatMap((l) => (smoke ? [viewports[2]] : viewports).map((v) => [l, v] as const))
    .filter(([l, v]) => (!onlyCase || onlyCase === `${l}-${v.width}`) && !results.some((r) => r.id === `${l}-${v.width}`));
  const concurrency = process.argv.includes("--serial") ? 1 : 3;
  for (let i = 0; i < cases.length; i += concurrency) {
    await Promise.all(cases.slice(i, i + concurrency).map(([l, v]) => run(l, v)));
    if (results.some((r) => r.status === "failed")) break;
  }
} finally { await browser.close(); }
console.log(JSON.stringify({ passed: results.filter((r) => r.status === "passed").length, attempted: results.length, requested: smoke ? 1 : 45 }));
if (results.some((r) => r.status === "failed")) process.exitCode = 1;

/// <reference lib="dom" />
import { chromium, type Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const root = process.env.NUVIA_TEST_ORIGIN ?? "http://localhost:80";
const out = "generated-artifacts/browser";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: "/repl/tools/bin/chromium", args: ["--no-sandbox"] });
const results: Record<string, unknown>[] = [];
const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, acceptDownloads: true });
const page = await ctx.newPage();
page.setDefaultTimeout(15000);
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({ name, status: "passed" }); }
  catch (error) { results.push({ name, status: "failed", error: String(error) }); }
  finally {
    await page.evaluate(() => {
      if ((window as any).__nuviaStorage) Storage.prototype.setItem = (window as any).__nuviaStorage;
    }).catch(() => {});
  }
}
async function go(path: string) {
  await page.goto(root + path);
  await page.getByTestId("button-language").waitFor();
}
try {
  await check("fictional example is separate; coach never alters writing", async () => {
    await go("/write?space=example&lang=ko");
    await page.getByTestId("input-editor").fill("가상 검증 글입니다. 실제 사용자 기록이 아닙니다.");
    await page.getByTestId("button-next-coach").click();
    assert.equal(await page.getByTestId("input-editor").inputValue(), "가상 검증 글입니다. 실제 사용자 기록이 아닙니다.");
    assert.equal(await page.evaluate(() => localStorage.getItem("nuvia:guest:state")), null);
  });
  await check("deep link language updates without losing query/hash or writing", async () => {
    await go("/write?space=example&lang=ko&context=synthetic#keep-context");
    await page.getByTestId("input-editor").waitFor();
    await page.getByTestId("button-language").click();
    await page.getByTestId("option-language-km").click();
    await page.getByRole("menu").waitFor({ state: "hidden" });
    const url = new URL(page.url());
    assert.equal(url.searchParams.get("context"), "synthetic");
    assert.equal(url.searchParams.get("lang"), "km");
    assert.equal(url.hash, "#keep-context");
    await page.reload();
    await page.getByTestId("input-editor").waitFor();
    assert.equal(await page.locator("html").getAttribute("lang"), "km");
    assert.equal(await page.getByTestId("input-editor").inputValue(), "가상 검증 글입니다. 실제 사용자 기록이 아닙니다.");
  });
  await check("device storage failure is explicit; Retry recovers latest input", async () => {
    await page.evaluate(`window.__nuviaStorage = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key.startsWith('nuvia:example:')) throw new DOMException('synthetic storage failure', 'QuotaExceededError');
        return window.__nuviaStorage.call(this, key, value);
      };`);
    await page.getByTestId("input-editor").fill("저장 실패 후 복구할 직접 작성 글");
    await page.locator('[data-testid="button-save-retry"]:visible').first().waitFor();
    await page.screenshot({ path: `${out}/edge-storage-error-km-360.png` });
    await page.evaluate(() => { Storage.prototype.setItem = (window as any).__nuviaStorage; });
    await page.locator('[data-testid="button-save-retry"]:visible').first().click();
    await page.reload();
    await page.getByTestId("input-editor").waitFor();
    assert.equal(await page.getByTestId("input-editor").inputValue(), "저장 실패 후 복구할 직접 작성 글");
  });
  await check("clipboard rejection exposes selectable exact text alternative", async () => {
    await go("/export?space=example&lang=ko");
    await page.getByTestId("checkbox-facts").check();
    await page.evaluate(`Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText: () => Promise.reject(new Error('synthetic clipboard denial')) }
    });`);
    await page.getByTestId("button-copy").click();
    await page.getByTestId("textarea-manual-copy").waitFor();
    const text = await page.getByTestId("textarea-manual-copy").inputValue();
    assert(text.includes("저장 실패 후 복구할 직접 작성 글"));
    assert(!text.includes("fixture-student") && !text.includes("fixture-result"));
    await page.getByTestId("button-manual-select").click();
    assert(await page.getByTestId("textarea-manual-copy").evaluate((e: HTMLTextAreaElement) => e.selectionEnd === e.value.length && e.selectionStart === 0));
  });
  await check("export network failure is explicit; Retry downloads genuine HWPX", async () => {
    const reject = async (route: any) => route.fulfill({ status: 503, contentType: "application/json", body: '{"error":"SYNTHETIC_UNAVAILABLE"}' });
    await page.route("**/api/career/export", reject);
    await page.getByTestId("button-export-hwpx").click();
    await page.getByTestId("button-export-retry").waitFor();
    await page.screenshot({ path: `${out}/edge-export-error-ko-360.png` });
    await page.unroute("**/api/career/export", reject);
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByTestId("button-export-retry").click()]);
    assert.equal(await download.failure(), null);
    await download.saveAs(`${out}/edge-retry.hwpx`);
  });
  await check("over-limit submission disables export despite fact confirmation", async () => {
    await go("/questions?space=example&lang=ko");
    await page.getByTestId("input-limit").fill("5");
    await page.getByTestId("button-go-write").click();
    await page.getByTestId("input-editor").waitFor();
    await page.getByTestId("link-go-export").click();
    await page.getByTestId("checkbox-facts").check();
    for (const id of ["button-copy", "button-export-txt", "button-export-docx", "button-export-hwpx"])
      assert(await page.getByTestId(id).isDisabled(), `${id} not disabled`);
    await page.screenshot({ path: `${out}/edge-over-limit-ko-360.png` });
  });
  await check("source changes/deletion preserve independent writing and old version", async () => {
    await go("/activities?space=example&lang=ko");
    await page.locator('[data-testid^="button-import-"]').first().click();
    await page.getByTestId("button-confirm-import").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const importedId = await page.evaluate(() => JSON.parse(localStorage.getItem("nuvia:example:state")!).experiences.find((e: any) => e.source === "local_activity").id);
    await go("/questions?space=example&lang=ko");
    await page.getByTestId(`checkbox-app-exp-${importedId}`).check();
    await go("/write?space=example&lang=ko");
    await page.getByTestId("button-save-version").click();
    await page.getByTestId("input-version-label").fill("가상 원본 변경 검증");
    await page.getByTestId("button-confirm-version").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    const original = await page.getByTestId("input-editor").inputValue();
    await go("/activities?space=example&lang=ko");
    await page.locator('[data-testid^="button-edit-act-"]').first().click();
    await page.getByTestId("input-act-action").fill("가상 원본 변경 내용");
    await page.getByTestId("button-save-act").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await go("/write?space=example&lang=ko");
    assert.equal(await page.getByTestId("input-editor").inputValue(), original);
    await go("/activities?space=example&lang=ko");
    await page.locator('[data-testid^="button-delete-act-"]').first().click();
    await page.getByTestId("button-confirm-delete-act").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await go("/write?space=example&lang=ko");
    assert.equal(await page.getByTestId("input-editor").inputValue(), original);
    const s = await page.evaluate(() => JSON.parse(localStorage.getItem("nuvia:example:state")!));
    assert.equal(s.experiences.find((e: any) => e.source === "local_activity").permissionStatus, "deleted");
    await go("/versions?space=example&lang=ko");
    await page.locator('[data-testid^="row-version-"]').first().waitFor();
    assert.equal(await page.locator('[data-testid^="row-version-"]').count(), 1);
  });
  await check("anonymous private API reads/writes reject with 401", async () => {
    for (const method of ["get", "put"] as const) {
      const response = await ctx.request[method](root + "/api/career/workspace", method === "put" ? { data: {} } : undefined);
      assert.equal(response.status(), 401);
    }
    assert.equal((await ctx.request.get(root + "/api/career/versions")).status(), 401);
  });
} finally {
  await ctx.close(); await browser.close();
  await writeFile(`${out}/edge-cases.json`, JSON.stringify({ scope: "synthetic example/device mode; NOT real planner/Clerk-session E2E", results }, null, 2));
  for (const row of results) console.log(`${row.name}: ${row.status}${row.error ? ` ${row.error}` : ""}`);
  if (results.some((r) => r.status === "failed")) process.exitCode = 1;
}

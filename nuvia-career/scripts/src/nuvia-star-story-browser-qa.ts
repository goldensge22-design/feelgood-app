/// <reference lib="dom" />
/** Korean-first STAR UI QA in isolated public-demo sessions; not account or connector QA. */
import { chromium, type Page } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const origin = process.env.NUVIA_TEST_ORIGIN ?? 'http://127.0.0.1:4319';
const out = resolve('generated-artifacts/star-story-qa');
const sizes = [
  { width: 1440, height: 1000 },
  { width: 768, height: 1024 },
  { width: 360, height: 800 },
];
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
await mkdir(out, { recursive: true });
const results: unknown[] = [];

async function go(page: Page, route: string) {
  await page.goto(`${origin}/demo${route}${route.includes('?') ? '&' : '?'}space=example&lang=ko`);
  await page.getByTestId('button-language').waitFor();
  await page.locator('h1').first().waitFor();
}

async function importSeed(page: Page, key: string) {
  await page.getByTestId(`button-pick-seed-${key}`).click();
  await page.getByTestId('checkbox-fact-consent').check();
  await page.getByTestId('checkbox-usage-consent').check();
  await page.getByTestId('button-add-synthetic').click();
  await page.getByTestId('status-import-added').waitFor();
}

async function saveVersion(page: Page, label: string) {
  await page.getByTestId('button-save-version').click();
  await page.getByTestId('input-version-label').fill(label);
  await page.getByTestId('button-confirm-version').click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}

async function getStored(page: Page) {
  return page.evaluate(() => {
    const prefix = 'nuvia:public-demo:v1:';
    return {
      state: JSON.parse(sessionStorage.getItem(prefix + 'nuvia:example:state') || '{}'),
      sidecar: JSON.parse(sessionStorage.getItem(prefix + 'nuvia:provenance:v1:demo') || '{}'),
      versions: JSON.parse(sessionStorage.getItem(prefix + 'nuvia:example:versions') || '[]'),
    };
  });
}

for (const size of sizes) {
  const ctx = await browser.newContext({ viewport: size, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const checks: string[] = [];
  try {
    await go(page, '/experiences?synthetic=1');
    await page.getByTestId('button-pick-seed-syn-daily-actual').waitFor();
    await page.getByTestId('checkbox-synthetic-ack').check();
    await importSeed(page, 'syn-daily-actual');
    await importSeed(page, 'syn-scenario-sim');
    const imported = await getStored(page);
    const daily = imported.state.experiences.find((e: any) => imported.sidecar.exps[e.id]?.nature === 'actual');
    const simulation = imported.state.experiences.find((e: any) => imported.sidecar.exps[e.id]?.nature === 'simulation');
    assert(daily && simulation);
    assert.equal(imported.sidecar.exps[daily.id].cardType, 'daily_application');
    assert.equal(imported.sidecar.exps[simulation.id].cardType, 'job_scenario');
    assert.equal(await page.getByTestId(`badge-nature-${daily.id}`).innerText(), '실제 경험');
    assert.equal(await page.getByTestId(`badge-nature-${simulation.id}`).innerText(), '모의 연습');
    assert.equal(await page.getByTestId(`badge-cardtype-${daily.id}`).innerText(), '일상 적용형');
    assert.equal(await page.getByTestId(`badge-cardtype-${simulation.id}`).innerText(), '직무 상황형');
    checks.push('card type and experience nature are separately visible for synthetic actual and simulation records');
    await page.getByTestId('button-close-synthetic').click();

    const title = `합성 STAR 기록 ${size.width}`;
    await page.getByTestId('button-new-exp').click();
    await page.getByTestId('input-exp-title').fill(title);
    await page.getByTestId('input-exp-action').fill('예약 안내 두 곳을 비교하고 차이를 기록했다.');
    await page.getByTestId('input-exp-result').fill('안내에서 요구하는 준비 자료가 달랐다.');
    await page.getByTestId('input-exp-learning').fill('판단 전에 원문 안내를 대조해야 한다고 배웠다.');
    await page.getByTestId('archive-star-situation').fill('교내 예약 절차를 찾다가 서로 다른 안내를 보았다.');
    await page.getByTestId('archive-star-roleGoal').fill('학생으로서 차이를 정리해 필요한 준비물을 확인하려 했다.');
    await page.getByTestId('button-save-exp').click();
    const saved = await getStored(page);
    const manual = saved.state.experiences.find((e: any) => e.title === title);
    assert(manual);
    assert.equal(saved.sidecar.exps[manual.id].nature, 'unconfirmed');
    assert.equal(saved.sidecar.exps[manual.id].star.situation, '교내 예약 절차를 찾다가 서로 다른 안내를 보았다.');
    assert.equal(await page.getByTestId(`badge-nature-${manual.id}`).innerText(), '확인 전');
    assert.equal(await page.getByTestId(`summary-star-${manual.id}`).count(), 1);
    checks.push('legacy/manual experience stays unconfirmed; optional situation and role/goal save locally without inventing provenance');

    await go(page, '/questions');
    await page.getByTestId('button-new-app').click();
    await page.getByTestId('input-company').fill(`합성 기업 ${size.width}`);
    await page.getByTestId('input-job').fill('IT 서비스 기획');
    await page.getByTestId('input-question').fill('모의 상황에서 무엇을 먼저 확인하고 왜 판단했는지 설명하세요.');
    await page.getByTestId('input-limit').fill('0');
    await page.getByTestId(`checkbox-app-exp-${simulation.id}`).check();
    await page.getByTestId('radio-requirement-preparation').click();
    const current = await getStored(page);
    const app = current.state.applications.at(-1);
    assert(app);
    await page.getByTestId('button-go-write').click();
    await page.getByTestId('input-editor').fill('모의 활동에서 예약 안내를 비교하고 서로 다른 준비 자료를 확인했습니다.');
    const essay = await page.getByTestId('input-editor').inputValue();
    const coachBefore = await page.getByTestId('text-coach-question').innerText();
    assert(coachBefore.includes('모의'));
    await page.getByTestId('button-next-coach').click();
    assert.notEqual(await page.getByTestId('text-coach-question').innerText(), coachBefore);
    assert.equal(await page.getByTestId('input-editor').inputValue(), essay);
    const help = page.getByTestId(`details-star-help-${simulation.id}`);
    assert.equal(await help.evaluate((el) => (el as HTMLDetailsElement).open), false);
    await help.locator('summary').click();
    const situationField = page.getByTestId(`star-help-${app.id}-${simulation.id}-situation`);
    const situationText = '모의 화면에서 신청 안내가 서로 달랐다.';
    await situationField.fill(situationText);
    await page.getByTestId('button-language').click();
    await page.getByTestId('option-language-en').click();
    await page.getByTestId(`option-language-ko`).waitFor({ state: 'detached' });
    assert.equal(new URL(page.url()).pathname, '/demo/write');
    await page.getByTestId('button-language').click();
    await page.getByTestId('option-language-ko').click();
    assert.equal(await situationField.inputValue(), situationText);
    checks.push('single-question simulation-aware coach, closed-by-default optional helper, essay remains student-authored, locale/path/input preserved');
    const helpAfterLocale = page.getByTestId(`details-star-help-${simulation.id}`);
    if (!(await helpAfterLocale.evaluate((el) => (el as HTMLDetailsElement).open))) {
      await helpAfterLocale.locator('summary').click();
    }

    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      (window as any).__restoreSetItem = () => { Storage.prototype.setItem = original; };
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key.includes('nuvia:provenance:v1:demo')) throw new DOMException('synthetic quota failure', 'QuotaExceededError');
        return original.call(this, key, value);
      };
    });
    await page.getByTestId(`button-save-star-help-${simulation.id}`).click();
    await page.getByRole('alert').filter({ hasText: '기기 저장에 실패' }).waitFor();
    assert.equal(await situationField.inputValue(), situationText);
    await page.evaluate(() => (window as any).__restoreSetItem());
    await page.getByTestId(`button-save-star-help-${simulation.id}`).click();
    await page.getByText('자소서 본문은 바꾸지 않았습니다.').waitFor();
    await page.reload();
    await page.getByTestId('input-editor').waitFor();
    await page.getByTestId(`details-star-help-${simulation.id}`).locator('summary').click();
    assert.equal(await page.getByTestId(`star-help-${app.id}-${simulation.id}-situation`).inputValue(), situationText);
    assert.equal(await page.getByTestId('input-editor').inputValue(), essay);
    checks.push('local sidecar save failure keeps text and offers retry; successful save survives refresh without appending to essay');

    await go(page, '/questions');
    await page.getByTestId('button-new-app').click();
    await page.getByTestId('input-company').fill(`지원동기 합성 기업 ${size.width}`);
    await page.getByTestId('input-job').fill('IT 서비스 기획');
    await page.getByTestId('input-question').fill('지원 동기를 설명해 주세요.');
    await page.getByTestId('input-limit').fill('0');
    await page.getByTestId(`checkbox-app-exp-${simulation.id}`).check();
    const motivationApp = (await getStored(page)).state.applications.at(-1);
    await page.getByTestId('button-go-write').click();
    assert.match(await page.getByTestId('text-coach-question').innerText(), /모의 연습이었다는/);
    const starToggle = page.getByTestId('button-toggle-star-coach');
    assert.equal(await starToggle.innerText(), 'STAR 질문 사용');
    await starToggle.click();
    assert.match(await page.getByTestId('text-coach-question').innerText(), /맡은 역할과 해결하려던 목표/);
    await page.getByTestId('button-toggle-star-coach').click();
    assert.match(await page.getByTestId('text-coach-question').innerText(), /모의 연습이었다는/);
    await go(page, '/questions');
    await page.getByTestId(`tab-app-${app.id}`).click();
    await page.getByTestId('button-go-write').click();
    assert.equal(await page.getByTestId('input-editor').inputValue(), essay);
    assert(motivationApp);
    checks.push('motivation question keeps the existing coach by default; student can opt into STAR and return without losing another question draft');

    await page.getByTestId('input-editor').fill(`${essay}\n첫 번째 합성 버전.`);
    const versionOneText = await page.getByTestId('input-editor').inputValue();
    await saveVersion(page, `STAR ${size.width} A`);
    await page.getByTestId('input-editor').fill(`${essay}\n두 번째 합성 버전.`);
    await saveVersion(page, `STAR ${size.width} B`);
    await go(page, '/versions');
    const storedVersions = (await getStored(page)).versions;
    const oldVersion = storedVersions.find((v: any) => v.label === `STAR ${size.width} A`);
    const newerVersion = storedVersions.find((v: any) => v.label === `STAR ${size.width} B`);
    assert(oldVersion && newerVersion);
    await page.getByTestId(`checkbox-version-${oldVersion.id}`).check();
    await page.getByTestId(`checkbox-version-${newerVersion.id}`).check();
    assert.equal(await page.getByTestId(`compare-col-${oldVersion.id}`).count(), 1);
    assert.equal(await page.getByTestId(`compare-col-${newerVersion.id}`).count(), 1);
    await page.getByTestId(`button-restore-${oldVersion.id}`).click();
    await page.getByTestId('input-editor').waitFor();
    assert.equal(await page.getByTestId('input-editor').inputValue(), versionOneText);
    const afterRestore = await getStored(page);
    assert(afterRestore.versions.some((v: any) => v.id === oldVersion.id && v.application.text === versionOneText));
    checks.push('two immutable versions compare; restoring older content creates a draft and preserves saved version');

    await go(page, '/export');
    assert.equal(await page.getByTestId('preview-text').innerText(), versionOneText);
    assert(!await page.getByTestId('preview-text').innerText().then((text) => /교내 예약 절차|모의 화면에서|코치/.test(text)));
    const requests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/career/export') && request.method() === 'POST') requests.push(request.postDataJSON());
    });
    await page.getByTestId(`checkbox-fact-${simulation.id}`).check();
    await page.getByTestId('checkbox-facts').check();
    await page.getByTestId('button-copy').click();
    await page.getByTestId('status-export').waitFor();
    for (const format of ['docx', 'hwpx']) {
      const download = page.waitForEvent('download');
      await page.getByTestId(`button-export-${format}`).click();
      await (await download).saveAs(`${out}/ko-${size.width}-synthetic.${format}`);
    }
    const expectedPayloadKeys = ['company', 'confirmed', 'format', 'job', 'question', 'text'];
    for (const payload of requests) {
      assert.deepEqual(Object.keys(payload).sort(), expectedPayloadKeys);
      assert.equal(payload.text, versionOneText);
      assert(!JSON.stringify(payload).includes(situationText));
      await writeFile(`${out}/ko-${size.width}-${payload.format}-input.json`, JSON.stringify(payload, null, 2));
    }
    assert.equal(requests.length, 2);
    checks.push('copy, DOCX and HWPX downloads succeed; export payload has only company/job/question/student text/confirmation/format and excludes STAR sidecar');

    const dimensions = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      selector: (() => { const r = document.querySelector('[data-testid="button-language"]')!.getBoundingClientRect(); return { x: r.x, width: r.width, height: r.height }; })(),
      lang: document.documentElement.lang,
    }));
    assert(dimensions.scrollWidth <= dimensions.width + 1);
    assert(dimensions.selector.width >= 44 && dimensions.selector.height >= 44);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${out}/ko-${size.width}-export.jpg`, fullPage: false });
    results.push({ size, status: 'passed', dimensions, checks });
    console.log(`PASSED ko-${size.width}: ${checks.length} checks`);
  } catch (error) {
    await page.screenshot({ path: `${out}/ko-${size.width}-failure.jpg` }).catch(() => {});
    results.push({ size, status: 'failed', error: String(error), url: page.url(), browserErrors: errors, checks });
    console.error(`FAILED ko-${size.width}: ${String(error)}`);
  } finally {
    await ctx.close();
    await writeFile(`${out}/results.json`, JSON.stringify({ checkedAt: new Date().toISOString(), origin, scope: 'public synthetic demo; device-only; no account or real integrations', results }, null, 2));
  }
}
await browser.close();
if (results.some((r: any) => r.status !== 'passed')) process.exitCode = 1;

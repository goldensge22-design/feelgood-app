/** Synthetic only; uses the actual review UI, no server fixtures or AI. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium, type Page } from 'playwright';

const origin = process.env.NUVIA_TEST_ORIGIN ?? 'http://localhost:80';
const out = resolve(import.meta.dirname, '../../generated-artifacts/nuvia-review-planner-qa');
const url = `${origin}/demo/review?lang=ko`;
const startedAt = new Date().toISOString();
const results: {name:string; state:'PASS'|'FAIL'; error?:string}[] = [];
const errors: string[] = [];
const sections = [
  '모의 실습에서 다르게 적힌 안내를 확인했습니다.\n비교 기준을 먼저 정했습니다.',
  '교내 예약 안내를 이해하기 쉬운 순서로 설명하는 일에 관심이 있습니다.',
  '두 안내의 자격과 마감을 대조해 차이를 확인 질문으로 남겼습니다.',
  '확정 사실과 질문을 구분해 전달해야 함을 배웠습니다.',
];
const privateMarker = '검증용 다음 행동: 출력에 포함하지 않음.';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE ?? '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
await mkdir(out, { recursive: true });
async function check(name: string, fn: () => Promise<void>) {
  try { await fn(); results.push({name,state:'PASS'}); console.log('PASS',name); }
  catch (err) { results.push({name,state:'FAIL',error:String(err)}); throw err; }
}
const test = (page: Page) => (id: string) => page.getByTestId(id);
const equals = async (page: Page, id:string, value:string) => { assert.equal(await test(page)(id).inputValue(), value); };
const noOverflow = async (page:Page) => {
  const fit = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert(fit, `overflow ${page.url()} at ${page.viewportSize()?.width}`);
};
const openPlan = async (page:Page, option: string) => {
  const by = test(page);
  await by(`option-review-${option}`).click();
  await by('link-review-make-card').click();
  await by('input-review-plan-goal').waitFor();
};
async function completePlan(page:Page, label:string, duplicate = false) {
  const by = test(page);
  for (const [key,value] of Object.entries({goal: label, scenario:'서로 다른 안내에 신청 조건이 두 가지로 쓰여 있음', action:'신청 안내 두 편 대조', criterion:'확인할 차이 한 가지 적기', when:'2026-11-19T14:30'}))
    await by(`input-review-plan-${key}`).fill(value);
  await by('button-review-plan-preview').click();
  assert(await by('button-review-add-card').isDisabled());
  await by('checkbox-review-add').click();
  if (duplicate) await by('button-review-add-card').evaluate((el:HTMLButtonElement) => { el.click(); el.click(); });
  else await by('button-review-add-card').click();
  await by('view-review-planner-card').waitFor();
  const id = page.url().split('/').at(-1)!;
  assert.match(id, /^review-card-/);
  return id;
}
async function choose(page:Page, card: string) {
  const by = test(page);
  await by(`link-review-history-${card}`).click();
  assert(await by('button-review-use-record').isDisabled());
  await by('checkbox-review-use-record').click();
  await by('button-review-use-record').click();
  await by('input-section-1').waitFor();
}
async function confirm(page:Page) {
  const by = test(page);
  await by('checkbox-fact').click();
  await by('checkbox-use').click();
  await by('button-confirm-storyboard').click();
  await by('status-confirmed').waitFor();
}

try {
  const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 360, height: 800 } });
  await ctx.addCookies([{ name: 'synthetic_qa_cookie', value: 'no-private-data', url: origin }]);
  const page = await ctx.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());
  const by = test(page);
  let a = '', b = '';
  await check('login experience → home → report → LAB; partial input survives back/reload/re-entry', async () => {
    assert.equal((await page.goto(url))?.status(), 200);
    await by('button-review-start').waitFor();
    await page.screenshot({path:`${out}/01-login-360.png`});
    await by('button-review-start').click();
    await by('link-review-report').click();
    await by('link-review-lab').click();
    await openPlan(page,'service');
    await by('input-review-plan-goal').fill('직접 쓴 A 초안');
    await by('input-review-plan-action').fill('한글로 입력한\n둘째 줄');
    await page.goBack();
    await by('link-review-make-card').click();
    await equals(page,'input-review-plan-action','한글로 입력한\n둘째 줄');
    await page.reload();
    await equals(page,'input-review-plan-goal','직접 쓴 A 초안');
    await by('button-review-exit').click();
    await by('button-review-start').click();
    await by('link-review-report').click();
    await by('link-review-lab').click();
    await openPlan(page,'service');
    await equals(page,'input-review-plan-action','한글로 입력한\n둘째 줄');
    await noOverflow(page);
  });
  await check('explicit preview + duplicate click creates one; independent status and no invented results', async () => {
    a = await completePlan(page,'A · 예약 안내 대조',true);
    assert(await by('button-review-status-completed').isDisabled());
    await equals(page,'input-review-note-result','');
    await equals(page,'input-review-note-learning','');
    await by('button-review-status-active').click();
    await by('button-review-status-paused').click();
    await by('button-review-status-active').click();
    await by('input-review-note-action').fill('A: 신청 조건 두 줄을 실제로 비교했다.');
    await by('link-review-back-planner').click();
    assert.equal(await page.locator('[data-testid^=\"link-review-card-review-card-\"]').count(),1);
    await by(`link-review-card-${a}`).click();
    await equals(page,'input-review-note-action','A: 신청 조건 두 줄을 실제로 비교했다.');
    await page.reload();
    await equals(page,'input-review-note-action','A: 신청 조건 두 줄을 실제로 비교했다.');
    await by('button-review-save-note').click();
    assert(await by('button-review-status-completed').isDisabled());
    await by('input-review-note-result').fill('A: 문구 차이 한 곳을 관찰했다.');
    await by('input-review-note-learning').fill('A: 확정과 질문을 나누어야 한다.');
    await by('input-review-note-next').fill(privateMarker);
    await by('button-review-save-note').click();
    await by('button-review-status-completed').click();
    await page.screenshot({path:`${out}/02-planner-360.png`,fullPage:true});
  });
  await check('two separate cards, edit and explicitly select A then B from History', async () => {
    await page.goto(`${origin}/demo/review/lab`);
    await openPlan(page,'education');
    b = await completePlan(page,'B · 수업 안내 확인');
    assert.notEqual(a,b);
    await by('input-review-plan-goal').fill('B · 수업 안내 최신본 확인');
    await by('button-review-save-plan').click();
    await by('input-review-note-action').fill('B: 안내표의 날짜를 대조했다.');
    await by('input-review-note-result').fill('B: 다른 날짜라는 점을 기록했다.');
    await by('input-review-note-learning').fill('B: 적용 대상부터 확인한다.');
    await by('button-review-save-note').click();
    await page.goto(`${origin}/demo/review/history`);
    assert.equal(await page.locator('[data-testid^=\"link-review-history-review-card-\"]').count(),2);
    await choose(page,a);
    assert.equal(await by('text-source-title').textContent(),'A · 예약 안내 대조');
    await equals(page,'input-company','모아서비스 (가상)');
    await by('link-storyboard-source').click();
    await choose(page,b);
    assert.equal(await by('text-source-title').textContent(),'B · 수업 안내 최신본 확인');
    await equals(page,'input-company','새봄교육 (가상)');
    for (const [i, value] of sections.entries()) await by(`input-section-${i+1}`).fill(value);
    await confirm(page);
  });
  await check('saved source revision invalidates export; same body and old version remain; re-confirm and restore', async () => {
    await by('link-storyboard-source').click();
    await by(`link-review-history-${b}`).click();
    await by('link-review-edit-card').click();
    await by('input-review-note-result').fill('B: 날짜를 다시 확인해 질문으로 옮겼다.');
    await by('button-review-save-note').click();
    await by('link-review-card-history').click();
    assert.match((await by('text-review-revision').textContent())!,/확인한 버전/);
    await by('link-review-versions').click();
    await by('input-section-1').waitFor();
    await equals(page,'input-section-1',sections[0]);
    assert.equal(await by('status-confirmed').count(),0);
    assert(await by('button-download').isDisabled());
    assert.equal(await page.locator('[data-testid^=\"button-restore-\"]').count(),1);
    await by('link-storyboard-source').click();
    await choose(page,b);
    for (const [i, value] of sections.entries()) await equals(page,`input-section-${i+1}`,value);
    await by('input-section-1').fill('B의 두 번째 초안');
    await confirm(page);
    await page.reload();
    await equals(page,'input-section-1','B의 두 번째 초안');
    assert.equal(await page.locator('[data-testid^=\"button-restore-\"]').count(),2);
    await page.getByRole('button',{ name:/· V1$/ }).click();
    await equals(page,'input-section-1',sections[0]);
    await by('link-storyboard-source').click();
    await choose(page,b);
    await confirm(page);
  });
  await check('real TXT/PDF/DOCX/HWPX downloads; expected body, one-page A4 and no private fields', async () => {
    for (const format of ['txt','docx','hwpx','pdf']) {
      await by(`option-format-${format}`).click();
      const network = ['docx','hwpx'].includes(format)
        ? page.waitForRequest((r) => r.method() === 'POST' && r.url().endsWith('/api/career/export')) : null;
      const [file] = await Promise.all([page.waitForEvent('download',{timeout:35000}), by('button-download').click()]);
      assert.equal(await file.failure(), null);
      assert.equal(file.suggestedFilename(), `NUVIA-storyboard.${format}`);
      await file.saveAs(`${out}/synthetic-storyboard.${format}`);
      if (network) {
        const req = await network;
        assert.equal((await req.allHeaders()).cookie, undefined);
        assert.deepEqual(Object.keys(req.postDataJSON()).sort(), ['company','confirmed','format','job','question','text']);
        assert(!req.postData()!.includes(privateMarker));
      }
    }
    const txt = await readFile(`${out}/synthetic-storyboard.txt`,'utf8');
    for (const s of sections) assert(txt.includes(s));
    assert(txt.includes('새봄교육 (가상) · 교육 운영 지원'));
    assert(!txt.includes(privateMarker) && !txt.includes('review-card-'));
    const xml = spawnSync('python',['-c',`
import json, sys, zipfile, xml.etree.ElementTree as ET
lines=json.loads(sys.stdin.read())
for ext,entry in [('docx','word/document.xml'),('hwpx','Contents/section0.xml')]:
 with zipfile.ZipFile(sys.argv[1]+'/synthetic-storyboard.'+ext) as z:
  assert z.testzip() is None
  if ext=='hwpx': assert z.read('mimetype') == b'application/hwp+zip'
  text='\\n'.join(e.text or '' for e in ET.fromstring(z.read(entry)).iter() if e.tag.endswith('}t'))
  for line in lines: assert line in text, (ext,line)
  assert 'review-card-' not in text and '출력에 포함하지 않음' not in text
`,out],{encoding:'utf8',input:JSON.stringify(['새봄교육 (가상)','교육 운영 지원',...sections.flatMap((s)=>s.split('\n'))])});
    assert.equal(xml.status,0,xml.stderr);
    const path = `${out}/synthetic-storyboard.pdf`;
    assert((await readFile(path)).subarray(0,5).equals(Buffer.from('%PDF-')));
    const pdf = spawnSync('pdfinfo',[path],{encoding:'utf8'});
    assert.equal(pdf.status,0,pdf.stderr);
    assert.match(pdf.stdout,/Pages:\s+1\b/);
    assert.match(pdf.stdout,/Page size:.*A4/);
    assert.equal(spawnSync('pdftoppm',['-f','1','-l','1','-r','100','-singlefile','-png',path,`${out}/synthetic-storyboard-pdf`]).status,0);
    await page.screenshot({path:`${out}/03-storyboard-360.png`,fullPage:true});
  });
  await check('360/768/1440 responsive, new isolated tab and original-language input', async () => {
    for (const width of [360,768,1440]) {
      await page.setViewportSize({width,height:850});
      for (const route of ['lab','planner',`planner/card/${a}`,`history/${b}`,'storyboard']) {
        await page.goto(`${origin}/demo/review/${route}`);
        await page.locator('[data-testid^=\"view-review-\"] ,.storyboard-page, [data-testid=\"input-section-1\"]').first().waitFor();
        await noOverflow(page);
      }
    }
    await page.goto(`${origin}/demo/review/storyboard?lang=ar`);
    await equals(page,'input-section-1',sections[0]);
    const other = await ctx.newPage();
    await other.goto(`${origin}/demo/review/history?lang=ko`);
    await test(other)('button-review-start').click();
    await other.goto(`${origin}/demo/review/history?lang=ko`);
    await test(other)('view-review-planner-history').waitFor();
    assert.equal(await other.locator('[data-testid^=\"link-review-history-review-card-\"]').count(),0);
    assert.deepEqual(errors,[]);
  });
  await check('storage write failure retains input until explicit retry succeeds', async () => {
    await page.goto(`${origin}/demo/review/planner/card/${a}?lang=ko`);
    const action = by('input-review-note-action');
    await action.waitFor();
    // Keep source verbatim: tsx's keepNames helper is unavailable in Chromium.
    await page.evaluate(`(() => {
      const original = Storage.prototype.setItem;
      Object.assign(window, { qaRestoreStorage: () => { Storage.prototype.setItem = original; } });
      Storage.prototype.setItem = function (key, value) {
        if (key.endsWith('review:planner:v1')) throw new DOMException('synthetic write failure', 'QuotaExceededError');
        return original.call(this,key,value);
      };
    })()`);
    const raw = '실패 전 입력한 원문을\n내용 변경 없이 복구한다.';
    await action.fill(raw);
    await by('status-review-planner-error').waitFor();
    await equals(page,'input-review-note-action',raw);
    await page.evaluate(() => (window as unknown as {qaRestoreStorage:()=>void}).qaRestoreStorage());
    await by('button-review-planner-retry').click();
    await by('status-review-planner-error').waitFor({state:'hidden'});
    await page.reload();
    await equals(page,'input-review-note-action',raw);
    assert.deepEqual(errors,[]);
  });
} finally {
  const evidence = { startedAtUtc: startedAt, finishedAtUtc: new Date().toISOString(), origin, browser: browser.version(),
    target: process.env.NUVIA_QA_SOURCE ?? 'working tree', results, errors, actualAI: false, centralAuth: false, nativeOffice: false };
  await writeFile(`${out}/browser-results.json`,JSON.stringify(evidence,null,2));
  await browser.close();
}

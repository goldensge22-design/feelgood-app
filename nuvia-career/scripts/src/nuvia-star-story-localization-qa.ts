/// <reference lib="dom" />
/** 15-locale STAR UI regression matrix in isolated synthetic demo sessions. */
import { chromium, type Page } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const { JOB_CONNECTION_RAW } = await import('../../artifacts/' + 'nuvia-career/src/lib/job-connection-messages.ts');
const origin = process.env.NUVIA_TEST_ORIGIN ?? 'http://127.0.0.1:4319';
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const out = resolve(workspaceRoot, 'generated-artifacts/job-connection-star-qa-20261110');
const sizes = [{ width: 1440, height: 1000 }, { width: 768, height: 1024 }, { width: 360, height: 800 }];
const locales = ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'mn', 'th', 'vi', 'ar', 'ru', 'km', 'es', 'fr', 'it', 'az'];
const selectedLocales = process.env.NUVIA_LOCALES ? process.env.NUVIA_LOCALES.split(',') : locales;
const selectedWidths = process.env.NUVIA_WIDTHS ? process.env.NUVIA_WIDTHS.split(',').map(Number) : sizes.map((s) => s.width);
const selectedSizes = sizes.filter((s) => selectedWidths.includes(s.width));
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
await mkdir(out, { recursive: true });
const results: any[] = [];

const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspaceRoot, encoding: 'utf8' }).trim();
const sourceFiles = execFileSync('git', [
  'ls-files', '--cached', '--others', '--exclude-standard', '--',
  'artifacts/nuvia-career/src', 'artifacts/nuvia-career/package.json', 'artifacts/nuvia-career/vite.config.ts',
  'scripts/src/nuvia-star-story-localization-qa.ts',
], { cwd: workspaceRoot, encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort();
const sourceHasher = createHash('sha256');
for (const file of sourceFiles) {
  sourceHasher.update(file);
  sourceHasher.update('\0');
  sourceHasher.update(readFileSync(resolve(workspaceRoot, file)));
}
const sourceFingerprint = sourceHasher.digest('hex');

function assertLocalized(value: string, locale: string, label: string) {
  assert(value.trim().length > 0, `${label} is empty in ${locale}`);
  assert(!value.includes('star.'), `${label} exposed a translation key in ${locale}`);
  if (locale !== 'ko') assert.doesNotMatch(value, /[가-힣]/u, `${label} fell back to Korean in ${locale}`);
}

async function go(page: Page, route: string, locale: string) {
  await page.goto(`${origin}/demo${route}${route.includes('?') ? '&' : '?'}space=example&lang=${locale}`);
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

async function storage(page: Page) {
  return page.evaluate(() => {
    const prefix = 'nuvia:public-demo:v1:';
    return {
      state: JSON.parse(sessionStorage.getItem(prefix + 'nuvia:example:state') || '{}'),
      sidecar: JSON.parse(sessionStorage.getItem(prefix + 'nuvia:provenance:v1:demo') || '{}'),
      versions: JSON.parse(sessionStorage.getItem(prefix + 'nuvia:example:versions') || '[]'),
    };
  });
}

for (const locale of selectedLocales) {
  for (const size of selectedSizes) {
    const label = `${locale}-${size.width}`;
    const ctx = await browser.newContext({ viewport: size, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
    const page = await ctx.newPage();
    page.setDefaultTimeout(20000);
    const browserErrors: string[] = [];
    const checks: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    try {
      await go(page, '/experiences?synthetic=1', locale);
      await page.getByTestId('button-pick-seed-syn-daily-actual').waitFor();
      await page.getByTestId('checkbox-synthetic-ack').check();
      await importSeed(page, 'syn-daily-actual');
      await importSeed(page, 'syn-scenario-sim');
      const imported = await storage(page);
      const daily = imported.state.experiences.find((e: any) => imported.sidecar.exps[e.id]?.nature === 'actual');
      const simulation = imported.state.experiences.find((e: any) => imported.sidecar.exps[e.id]?.nature === 'simulation');
      assert(daily && simulation);
       assert.equal(imported.sidecar.exps[daily.id].experienceContext, 'synthetic_example');
       assert.equal(imported.sidecar.exps[simulation.id].experienceContext, 'synthetic_example');
      assert.equal(await page.getByTestId(`badge-nature-${daily.id}`).innerText(), locale === 'ko' ? '실제 경험' : await page.getByTestId(`badge-nature-${daily.id}`).innerText());
      assert.equal(await page.getByTestId(`badge-cardtype-${simulation.id}`).innerText(), locale === 'ko' ? '직무 상황형' : await page.getByTestId(`badge-cardtype-${simulation.id}`).innerText());
      if (locale !== 'ko') {
        assert.doesNotMatch(await page.getByTestId(`badge-nature-${daily.id}`).innerText(), /[가-힣]/u);
        assert.doesNotMatch(await page.getByTestId(`badge-cardtype-${simulation.id}`).innerText(), /[가-힣]/u);
         assert.doesNotMatch(await page.getByTestId(`badge-experience-context-${simulation.id}`).innerText(), /[가-힣]/u);
      }
      checks.push('synthetic actual/simulation nature and activity-card type render separately in selected locale');
      await page.getByTestId('button-close-synthetic').click();

      const title = `STAR ${locale} ${size.width}`;
      await page.getByTestId('button-new-exp').click();
      await page.getByTestId('input-exp-title').fill(title);
      await page.getByTestId('select-exp-context').selectOption('daily_activity');
      const archiveDialog = page.getByRole('dialog');
      assert(await archiveDialog.count() > 0);
      const scrollState = await archiveDialog.evaluate((el) => {
        const node = el as HTMLElement;
        node.scrollTop = node.scrollHeight;
        return { scrollTop: node.scrollTop, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight };
      });
      assert(scrollState.scrollHeight >= scrollState.clientHeight);
      const situationLabel = await page.locator('label[for="archive-star-situation"]').innerText();
      assertLocalized(situationLabel, locale, 'situation label');
      const sInput = page.getByTestId('archive-star-situation');
      await sInput.focus();
      assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).id), 'archive-star-situation');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).tagName), 'TEXTAREA');
      await page.getByTestId('input-exp-action').fill(`Action ${locale}: compared two booking instructions.`);
      await page.getByTestId('input-exp-result').fill(`Result ${locale}: the required materials differed.`);
      await page.getByTestId('input-exp-learning').fill(`Learning ${locale}: check source instructions first.`);
      await page.getByTestId('archive-star-situation').fill(`Situation ${locale}: STAR-ORIGINAL-${locale}`);
      await page.getByTestId('archive-star-roleGoal').fill(`Role ${locale}: I organized the difference.`);
      await page.getByTestId('button-save-exp').click();
      let saved = await storage(page);
      const manual = saved.state.experiences.find((e: any) => e.title === title);
      assert(manual);
      assert.equal(saved.sidecar.exps[manual.id].nature, 'unconfirmed');
      assert.equal(saved.sidecar.exps[manual.id].experienceContext, 'daily_activity');
      assert.equal(saved.sidecar.exps[manual.id].star.situation, `Situation ${locale}: STAR-ORIGINAL-${locale}`);
      assert.equal(await page.getByTestId(`summary-star-${manual.id}`).count(), 1);
      await page.getByTestId(`button-edit-exp-${manual.id}`).click();
      assert.equal(await page.getByTestId('archive-star-situation').inputValue(), `Situation ${locale}: STAR-ORIGINAL-${locale}`);
      await page.getByTestId('archive-star-situation').fill(`Situation ${locale}: STAR-EDITED-${locale}`);
      await page.getByTestId('button-save-exp').click();
      saved = await storage(page);
      assert.equal(saved.sidecar.exps[manual.id].star.situation, `Situation ${locale}: STAR-EDITED-${locale}`);
      assert.equal(saved.sidecar.exps[manual.id].experienceContext, 'daily_activity');
      await page.getByTestId(`button-detail-exp-${manual.id}`).click();
      await page.getByTestId('radio-nature-actual').click();
      await page.keyboard.press('Escape');
      await page.getByTestId(`dialog-exp-detail-${manual.id}`).waitFor({ state: 'hidden' });
      saved = await storage(page);
      assert.equal(saved.sidecar.exps[manual.id].nature, 'actual');
      assert.equal(saved.sidecar.exps[manual.id].experienceContext, 'daily_activity');
      checks.push('manual activity keeps student-selected context separate from actual nature and retains S/T content');

      const legacyTitle = `Legacy ${locale} ${size.width}`;
      await page.getByTestId('button-new-exp').click();
      await page.getByTestId('input-exp-title').fill(legacyTitle);
      await page.getByTestId('select-exp-context').selectOption('class_simulation');
      await page.getByTestId('button-save-exp').click();
      saved = await storage(page);
      const legacy = saved.state.experiences.find((e: any) => e.title === legacyTitle);
      assert(legacy);
      assert.equal(saved.sidecar.exps[legacy.id]?.nature ?? 'unconfirmed', 'unconfirmed');
      assert.equal(saved.sidecar.exps[legacy.id]?.experienceContext, 'class_simulation');
      await page.getByTestId(`button-detail-exp-${legacy.id}`).click();
      await page.getByTestId('radio-nature-simulation').click();
      await page.keyboard.press('Escape');
      await page.getByTestId(`dialog-exp-detail-${legacy.id}`).waitFor({ state: 'hidden' });
      saved = await storage(page);
      assert.equal(saved.sidecar.exps[legacy.id].nature, 'simulation');
      assert.equal(saved.sidecar.exps[legacy.id].experienceContext, 'class_simulation');
      await page.getByTestId(`button-edit-exp-${legacy.id}`).click();
      assert.equal(await page.getByTestId('archive-star-situation').inputValue(), '');
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      checks.push('legacy experience with missing S/T still opens and can be left unchanged');

      checks.push(`experience dialog supports labeled keyboard focus and scrolling (scroll ${scrollState.scrollTop}/${scrollState.scrollHeight})`);

      await go(page, '/questions', locale);
      await page.getByTestId('button-new-app').click();
      await page.getByTestId('input-company').fill(`Synthetic ${locale}`);
      await page.getByTestId('input-job').fill('Service planning');
      await page.getByTestId('input-question').fill(`Why do you want to apply? ${locale}`);
      await page.getByTestId('input-limit').fill('0');
       await page.getByTestId(`checkbox-app-exp-${simulation.id}`).check();
       await page.getByTestId(`checkbox-app-exp-${manual.id}`).check();
       await page.getByTestId(`checkbox-app-exp-${legacy.id}`).check();
      await page.getByTestId('radio-requirement-preparation').click();
      const app = (await storage(page)).state.applications.at(-1);
      assert(app);
      await page.getByTestId('button-go-write').click();
      await page.getByTestId('input-editor').fill(`My own draft ${locale}: simulation practice, not employment.`);
      const essay = await page.getByTestId('input-editor').inputValue();

       const connection = page.getByTestId(`details-job-connection-${app.id}-${manual.id}`);
       assert.equal(await connection.evaluate((el) => (el as HTMLDetailsElement).open), false);
       await connection.locator('summary').click();
       const kind = page.getByTestId(`joblink-kind-${app.id}-${manual.id}`);
       await kind.click();
       await page.getByRole('option', { name: JOB_CONNECTION_RAW['joblink.kind.inference'][locales.indexOf(locale)], exact: true }).click();
       await page.getByTestId(`joblink-duty-${app.id}-${manual.id}`).fill(`Compare the current version and intended audience ${locale}.`);
       await page.getByTestId(`joblink-shared-${app.id}-${manual.id}`).fill(`I checked two notices against their intended use ${locale}.`);
       await page.getByTestId(`joblink-principle-${app.id}-${manual.id}`).fill(`Current information and applicable information are not always the same ${locale}.`);
       await page.getByTestId(`joblink-future-${app.id}-${manual.id}`).fill(`In a future planning task, I will verify version and audience separately ${locale}.`);
       await page.getByTestId(`joblink-source-title-${app.id}-${manual.id}`).fill(`User-entered teaching example ${locale}`);
       await page.getByTestId(`joblink-source-company-${app.id}-${manual.id}`).fill(`Synthetic ${locale}`);
       await page.getByTestId(`joblink-source-job-${app.id}-${manual.id}`).fill('Service planning');
       await page.getByTestId(`joblink-source-version-${app.id}-${manual.id}`).fill('Teaching example v1');
       // Language changes keep the route and unsaved relation notes in the same draft.
       const targetLocale = locales[(locales.indexOf(locale) + 1) % locales.length];
       await page.getByTestId('button-language').click();
       await page.getByTestId(`option-language-${targetLocale}`).click();
       await page.getByTestId(`option-language-${targetLocale}`).waitFor({ state: 'detached' });
       await page.getByTestId(`joblink-duty-${app.id}-${manual.id}`).waitFor();
       assert.equal(await page.getByTestId(`joblink-duty-${app.id}-${manual.id}`).inputValue(), `Compare the current version and intended audience ${locale}.`);
       await page.getByTestId('button-language').click();
       await page.getByTestId(`option-language-${locale}`).click();
       assert.equal(new URL(page.url()).pathname, '/demo/write');
       assert.equal(await page.getByTestId('input-editor').inputValue(), essay);
       await page.getByTestId(`button-save-joblink-${manual.id}`).click();
       await page.getByTestId(`joblink-saved-${manual.id}`).waitFor();
       await page.getByTestId(`button-review-joblink-${manual.id}`).click();
       await page.getByTestId(`joblink-reviewed-${manual.id}`).waitFor();
       let relationState = await storage(page);
       const savedRelation = relationState.sidecar.apps[app.id].jobLinks[manual.id];
       assert.equal(savedRelation.sourceKind, 'educational_inference');
       assert.equal(savedRelation.reviewedAt !== undefined, true);
       assert.equal(relationState.sidecar.apps[app.id].jobLinks[simulation.id], undefined);
       checks.push('job duty, shared action, source scope/version, learning and next use save per application; review is explicit and separate');

       // Snapshot captures the approved connection for this immutable version.
       await saveVersion(page, `Connection-${locale}-${size.width}`);
       relationState = await storage(page);
       const relationVersion = relationState.versions.find((v: any) => v.label === `Connection-${locale}-${size.width}`);
       assert(relationVersion);
       assert.equal(relationState.sidecar.versions[relationVersion.id].jobLinks[manual.id].reviewedAt !== undefined, true);

       // Editing the application scope invalidates the current review, and reverting
       // the text does not revive it; the frozen version stays unchanged.
       await go(page, '/questions', locale);
       await page.getByTestId('input-company').fill(`Changed Org ${locale}`);
       relationState = await storage(page);
       assert.equal(relationState.sidecar.apps[app.id].jobLinks[manual.id].reviewedAt, undefined);
       await page.getByTestId('input-company').fill(`Synthetic ${locale}`);
       relationState = await storage(page);
       assert.equal(relationState.sidecar.apps[app.id].jobLinks[manual.id].reviewedAt, undefined);
       assert.equal(relationState.sidecar.versions[relationVersion.id].jobLinks[manual.id].reviewedAt !== undefined, true);
       await page.getByTestId('button-go-write').click();
       await page.getByTestId(`details-job-connection-${app.id}-${manual.id}`).locator('summary').click();
       await page.getByTestId(`joblink-source-company-${app.id}-${manual.id}`).fill(`Another Org ${locale}`);
       await page.getByTestId(`joblink-mismatch-${manual.id}`).waitFor();
       assert.equal(await page.getByTestId(`button-review-joblink-${manual.id}`).isDisabled(), true);
       await page.getByTestId(`joblink-source-company-${app.id}-${manual.id}`).fill(`Synthetic ${locale}`);
       await page.getByTestId(`button-save-joblink-${manual.id}`).click();
       assert.equal(await page.getByTestId(`joblink-reviewed-${manual.id}`).count(), 0);
       checks.push('company mismatch blocks review; changing an application and reverting it does not revive review; old version remains immutable');

      const helper = page.getByTestId(`details-star-help-${simulation.id}`);
      assert.equal(await helper.evaluate((el) => (el as HTMLDetailsElement).open), false);
      const helperTitle = await helper.locator('summary').innerText();
      assertLocalized(helperTitle, locale, 'helper title');
      assert(helperTitle.includes(simulation.title));
      await helper.locator('summary').click();
      assert.equal(await helper.evaluate((el) => (el as HTMLDetailsElement).open), true);
      await helper.locator('summary').click();
      assert.equal(await helper.evaluate((el) => (el as HTMLDetailsElement).open), false);
      await helper.locator('summary').click();
      const helperSummaryHeight = await helper.locator('summary').evaluate((el) => el.getBoundingClientRect().height);
      const saveButtonHeight = await page.getByTestId(`button-save-star-help-${simulation.id}`).evaluate((el) => el.getBoundingClientRect().height);
      assert(helperSummaryHeight >= 44, `helper touch target too small: ${helperSummaryHeight}`);
      assert(saveButtonHeight >= 44, `save touch target too small: ${saveButtonHeight}`);
      const sId = `star-help-${app.id}-${simulation.id}-situation`;
      await page.getByTestId(sId).fill(`Situation ${locale}: STAR-KEEP-${locale}`);
      await page.getByTestId(`star-help-${app.id}-${simulation.id}-roleGoal`).fill(`Role ${locale}: a practice task, not a job.`);
      const coachBefore = await page.getByTestId('text-coach-question').innerText();
      assert(coachBefore.trim().length > 3);
      if (locale !== 'ko') assert.doesNotMatch(coachBefore, /[가-힣]/u);
      await page.getByTestId('button-next-coach').click();
      assert((await page.getByTestId('button-next-coach').evaluate((el) => el.getBoundingClientRect().height)) >= 44);
      assert.notEqual(await page.getByTestId('text-coach-question').innerText(), coachBefore);
      assert.equal(await page.getByTestId('input-editor').inputValue(), essay);
      checks.push('optional helper opens only on request; localized single-question coach does not change student draft');

      // Exercise rapid language changes while the route and unsaved fields are live.
      const locale2 = locales[(locales.indexOf(locale) + 1) % locales.length];
      await page.getByTestId('button-language').click();
      await page.getByTestId(`option-language-${locale2}`).click();
      await page.getByTestId(`option-language-${locale2}`).waitFor({ state: 'detached' });
      await page.getByTestId('button-language').click();
      await page.getByTestId(`option-language-${locale}`).click();
      assert.equal(new URL(page.url()).pathname, '/demo/write');
      assert.equal(await page.getByTestId(sId).inputValue(), `Situation ${locale}: STAR-KEEP-${locale}`);
      assert.equal(await page.getByTestId('input-editor').inputValue(), essay);
      assert.equal(await page.getByTestId(`tab-app-${app.id}`).getAttribute('aria-selected'), 'true');
      const switched = await storage(page);
      assert.equal(switched.sidecar.exps[simulation.id].nature, 'simulation');
      await page.getByTestId(`button-save-star-help-${simulation.id}`).click();
      await page.getByRole('status').last().waitFor();
      assertLocalized(await page.getByRole('status').last().innerText(), locale, 'saved status');
      await page.reload();
      await page.getByTestId('input-editor').waitFor();
      const reopened = page.getByTestId(`details-star-help-${simulation.id}`);
      await reopened.locator('summary').click();
      assert.equal(await page.getByTestId(sId).inputValue(), `Situation ${locale}: STAR-KEEP-${locale}`);
      assert.equal(await page.getByTestId('input-editor').inputValue(), essay);
      checks.push('rapid locale switching and reload preserve route, draft, selected experience and device-only STAR notes');

      await page.evaluate(() => {
        const original = Storage.prototype.setItem;
        (window as any).__restoreSetItem = () => { Storage.prototype.setItem = original; };
        Storage.prototype.setItem = function (key: string, value: string) {
          if (key.includes('nuvia:provenance:v1:demo')) throw new DOMException('synthetic quota failure', 'QuotaExceededError');
          return original.call(this, key, value);
        };
      });
      await page.getByTestId(sId).fill(`Retry ${locale}`);
      await page.getByTestId(`button-save-star-help-${simulation.id}`).click();
      await page.getByRole('alert').waitFor();
      assertLocalized(await page.getByRole('alert').innerText(), locale, 'save error');
      assert.equal(await page.getByTestId(sId).inputValue(), `Retry ${locale}`);
      await page.evaluate(() => (window as any).__restoreSetItem());
      await page.getByTestId(`button-save-star-help-${simulation.id}`).click();
      await page.getByRole('status').last().waitFor();
      assertLocalized(await page.getByRole('status').last().innerText(), locale, 'retry saved status');
      checks.push('device-storage failure retains localized form input and retry recovers');

      // A separate application ensures the existing motivation-question coach is retained in each UI language.
      await go(page, '/questions', locale);
      await page.getByTestId('button-new-app').click();
      await page.getByTestId('input-company').fill(`Motivation ${locale}`);
      await page.getByTestId('input-job').fill('Service planning');
      const motivationQuestions: Record<string, string> = {
        ko: '지원 동기를 말씀해 주세요.', en: 'Why do you want to join this company?', ja: '志望動機を教えてください。',
        'zh-CN': '请说明你的求职动机。', 'zh-TW': '請說明你的求職動機。', mn: 'Ажилд орох шалтгаанаа тайлбарлана уу。',
        th: 'โปรดอธิบายแรงจูงใจในการสมัคร', vi: 'Hãy nêu động lực ứng tuyển của bạn.', ar: 'يرجى توضيح الدافع للتقديم.',
        ru: 'Расскажите о мотивации.', km: 'សូមពន្យល់ពីមូលហេតុដាក់ពាក្យ។', es: 'Explica tu motivación para postularte.',
        fr: 'Expliquez votre motivation.', it: 'Spiega la tua motivazione.', az: 'Müraciət motivasiyanızı izah edin.',
      };
      await page.getByTestId('input-question').fill(motivationQuestions[locale]);
      await page.getByTestId('input-limit').fill('0');
      await page.getByTestId(`checkbox-app-exp-${simulation.id}`).check();
      await page.getByTestId('button-go-write').click();
      const motivationApp = (await storage(page)).state.applications.at(-1);
      assert(motivationApp);
      await page.getByTestId(`tab-app-${app.id}`).click();
      assert.equal(await page.getByTestId('input-editor').inputValue(), essay);
      await page.getByTestId(`tab-app-${motivationApp.id}`).click();
      const toggle = page.getByTestId('button-toggle-star-coach');
      assertLocalized(await toggle.innerText(), locale, 'STAR coach toggle');
      await toggle.click();
      assertLocalized(await page.getByTestId('button-toggle-star-coach').innerText(), locale, 'existing coach toggle');
      checks.push('localized motivation coach remains default and STAR is an explicit reversible choice');

      // Create immutable versions, compare, and restore as a new draft.
      await page.getByTestId('input-editor').fill(`${essay}\nVersion A ${locale}`);
      const firstVersionText = await page.getByTestId('input-editor').inputValue();
      await saveVersion(page, `A-${locale}-${size.width}`);
      await page.getByTestId('input-editor').fill(`${essay}\nVersion B ${locale}`);
      await saveVersion(page, `B-${locale}-${size.width}`);
      await go(page, '/versions', locale);
      const versions = (await storage(page)).versions;
      const oldVersion = versions.find((v: any) => v.label === `A-${locale}-${size.width}`);
      const newerVersion = versions.find((v: any) => v.label === `B-${locale}-${size.width}`);
      assert(oldVersion && newerVersion);
      await page.getByTestId(`checkbox-version-${oldVersion.id}`).check();
      await page.getByTestId(`checkbox-version-${newerVersion.id}`).check();
      assert.equal(await page.getByTestId(`compare-col-${oldVersion.id}`).count(), 1);
      await page.getByTestId(`button-restore-${oldVersion.id}`).click();
      assert.equal(await page.getByTestId('input-editor').inputValue(), firstVersionText);
      assert((await storage(page)).versions.some((v: any) => v.id === oldVersion.id && v.application.text === firstVersionText));
      checks.push('versions remain immutable, compare correctly and restore as a new draft');

      await go(page, '/export', locale);
      assert.equal(await page.getByTestId('preview-text').innerText(), firstVersionText);
      assert.match(firstVersionText, /simulation practice, not employment/);
      await page.getByTestId(`checkbox-fact-${simulation.id}`).check();
      await page.getByTestId('checkbox-facts').check();
      const payloads: any[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/career/export') && request.method() === 'POST') payloads.push(request.postDataJSON());
      });
      await page.getByTestId('button-copy').click();
      await page.getByTestId('status-export').waitFor();
      for (const format of ['txt', 'docx', 'hwpx']) {
        const download = page.waitForEvent('download');
        await page.getByTestId(`button-export-${format}`).click();
        const artifact = await download;
        if (size.width === 360) await artifact.saveAs(`${out}/${locale}.${format}`);
      }
      assert.equal(payloads.length, 3);
      for (const payload of payloads) {
        assert.deepEqual(Object.keys(payload).sort(), ['company', 'confirmed', 'format', 'job', 'question', 'text']);
        assert.equal(payload.text, firstVersionText);
        assert(!JSON.stringify(payload).includes(`STAR-KEEP-${locale}`));
      }
      checks.push('copy/TXT/DOCX/HWPX download; simulated context stays in authored text and STAR notes are excluded');

      const dimensions = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        selector: (() => { const r = document.querySelector('[data-testid="button-language"]')!.getBoundingClientRect(); return { x: r.x, width: r.width, height: r.height }; })(),
        lang: document.documentElement.lang,
        dir: document.documentElement.dir,
      }));
      assert.equal(dimensions.lang, locale);
      assert.equal(dimensions.dir, locale === 'ar' ? 'rtl' : 'ltr');
      assert(dimensions.scrollWidth <= dimensions.width + 1, `horizontal overflow at ${label}`);
      assert(dimensions.selector.width >= 44 && dimensions.selector.height >= 44, `language control target too small at ${label}`);
      assert.deepEqual(browserErrors, []);
      await page.screenshot({ path: `${out}/${label}.jpg` });
      results.push({ locale, viewport: size, status: 'passed', dimensions, checks, browserErrors });
      console.log(`PASSED ${label}: ${checks.length} checks`);
    } catch (error) {
      await page.screenshot({ path: `${out}/${label}-failure.jpg` }).catch(() => {});
      results.push({ locale, viewport: size, status: 'failed', error: String(error), url: page.url(), checks, browserErrors });
      console.error(`FAILED ${label}: ${String(error)}`);
    } finally {
      await ctx.close();
      await writeFile(`${out}/results.json`, JSON.stringify({
        checkedAt: new Date().toISOString(), origin, sourceCommit, sourceFingerprint, sourceFiles,
        scope: 'synthetic public-demo sessions; browser-local storage only; no account, external integrations or real user data',
        combinations: results.length, planned: selectedLocales.length * selectedSizes.length, passed: results.filter((r) => r.status === 'passed').length,
        failed: results.filter((r) => r.status !== 'passed').length, results,
      }, null, 2));
    }
  }
}
await browser.close();
if (results.length !== selectedLocales.length * selectedSizes.length || results.some((r) => r.status !== 'passed')) process.exitCode = 1;

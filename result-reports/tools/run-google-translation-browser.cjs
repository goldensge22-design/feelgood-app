const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const catalogPath = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3]);
const onlyLocale = process.argv.find((arg) => arg.startsWith('--locale='))?.slice(9);
const maxChars = Number(process.argv.find((arg) => arg.startsWith('--max-chars='))?.slice(12) || 1200);
const maxBatches = Number(process.argv.find((arg) => arg.startsWith('--max-batches='))?.slice(14) || Infinity);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const korean = /[가-힣]/;
const compositions = new Map();
const units = [];
let unitIndex = 0;
for (const item of catalog.items) {
  const composition = [];
  for (const part of item.protected.text.split(/(__FGPH_\d{3}__)/g)) {
    if (!part || /^__FGPH_\d{3}__$/.test(part) || !korean.test(part)) {
      composition.push({ literal:part });
    } else {
      const key = `FGU_${String(unitIndex++).padStart(6, '0')}`;
      units.push({ key, text:part });
      composition.push({ unit:key });
    }
  }
  compositions.set(item.key, composition);
}

const batches = [];
let batch = [], length = 0;
for (const unit of units) {
  const line = `[[${unit.key}]]\n${unit.text.replace(/\r?\n/g, ' ')}\n`;
  if (batch.length && length + line.length + 1 > maxChars) {
    batches.push(batch); batch = []; length = 0;
  }
  batch.push({ ...unit, line });
  length += line.length + 1;
}
if (batch.length) batches.push(batch);

const locales = [
  ['en','en'], ['ja','ja'], ['zh','zh-CN'], ['es','es'], ['ru','ru'], ['vi','vi'],
  ['th','th'], ['ar','ar'], ['it','it'], ['az','az'], ['km','km']
].filter(([locale]) => !onlyLocale || locale === onlyLocale);
fs.mkdirSync(outDir, { recursive:true });

function outputPath(locale) { return path.join(outDir, `${locale}.google-raw.json`); }
function readResult(locale) {
  const file = outputPath(locale);
  if (!fs.existsSync(file)) return { locale, completedBatches:{}, unitTranslations:{}, translations:{}, errors:[] };
  const result = JSON.parse(fs.readFileSync(file, 'utf8'));
  result.unitTranslations ||= {};
  return result;
}
function compose(result) {
  const translations = {};
  for (const item of catalog.items) {
    const parts = compositions.get(item.key);
    if (parts.some((part) => part.unit && !Object.hasOwn(result.unitTranslations, part.unit))) continue;
    translations[item.key] = parts.map((part) => part.unit ? result.unitTranslations[part.unit] : part.literal).join('');
  }
  result.translations = translations;
}
function writeResult(locale, result) {
  compose(result);
  result.updatedAt = new Date().toISOString();
  result.translationProvider = 'google-translate-web';
  result.reviewStatus = 'machine-translated';
  const file = outputPath(locale), temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(result, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, file);
}
function parse(text, expected) {
  const seen = new Set();
  const normalized = text.replace(/\[{1,2}\s*(FGU_\d{6})\s*\]{1,2}/g, (_marker, key) => {
    if (seen.has(key)) return '';
    seen.add(key);
    return `[[${key}]]`;
  });
  const found = new Map();
  const regex = /\[\[(FGU_\d{6})\]\]\s*([\s\S]*?)(?=\s*\[\[FGU_\d{6}\]\]|$)/g;
  for (const match of normalized.matchAll(regex)) found.set(match[1], match[2].trim());
  const missing = expected.filter((item) => !found.has(item.key));
  if (missing.length) throw new Error(`missing markers ${missing.map((item) => item.key).join(',')}`);
  return found;
}

async function readOutput(page) {
  return page.locator('span.ryNqvb').allTextContents().then((parts) => parts.join('\n'));
}

function markerKeys(text) {
  return [...text.matchAll(/\[{1,2}\s*(FGU_\d{6})\s*\]{1,2}/g)].map((match) => match[1]);
}

(async () => {
  const browser = await chromium.launch({
    executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:true,
    args:['--disable-gpu','--no-first-run','--no-default-browser-check']
  });
  try {
    for (const [locale, googleCode] of locales) {
      const result = readResult(locale);
      const page = await browser.newPage({ locale:'ko-KR' });
      await page.goto(`https://translate.google.com/?sl=ko&tl=${googleCode}&op=translate&hl=ko`, { waitUntil:'domcontentloaded', timeout:60000 });
      const input = page.locator('textarea').first();
      await input.waitFor({ state:'visible', timeout:30000 });
      for (let index = 0; index < batches.length; index++) {
        if (Object.keys(result.completedBatches).length >= maxBatches) break;
        if (result.completedBatches[String(index)]) continue;
        const expected = batches[index];
        const source = expected.map((unit) => unit.line).join('\n');
        let parsed = null, lastError = null;
        for (let attempt = 1; attempt <= 4 && !parsed; attempt++) {
          await input.fill('');
          await page.waitForTimeout(250);
          await input.fill(source);
          try {
            await page.waitForFunction(({ keys }) => {
              const text = [...document.querySelectorAll('span.ryNqvb')].map((el) => el.innerText).join('\n');
              const found = [...text.matchAll(/\[{1,2}\s*(FGU_\d{6})\s*\]{1,2}/g)].map((match) => match[1]);
              return keys.every((key) => found.includes(key));
            }, { keys:expected.map((item) => item.key) }, { timeout:20000 });
            parsed = parse(await readOutput(page), expected);
          } catch (error) {
            lastError = error;
            const head = await readOutput(page).catch(() => '');
            const found = markerKeys(head);
            const missing = expected.filter((item) => !found.includes(item.key));
            if (missing.length > 0 && missing.length <= 10) {
              const subset = missing.map((item) => item.line).join('\n');
              await input.fill(subset);
              try {
                await page.waitForFunction(({ keys }) => {
                  const text = [...document.querySelectorAll('span.ryNqvb')].map((el) => el.innerText).join('\n');
                  const found = [...text.matchAll(/\[{1,2}\s*(FGU_\d{6})\s*\]{1,2}/g)].map((match) => match[1]);
                  return keys.every((key) => found.includes(key));
                }, { keys:missing.map((item) => item.key) }, { timeout:15000 });
                parsed = parse(`${head}\n\n${await readOutput(page)}`, expected);
                continue;
              } catch (repairError) {
                lastError = repairError;
              }
            }
            if (attempt === 4) {
              const debugText = await readOutput(page).catch(() => 'NO_OUTPUT_REGION');
              console.error(`DEBUG ${locale} batch=${index + 1} input=${await input.inputValue().catch(() => 'NO_INPUT')} output=${debugText.slice(0, 1000)}`);
            }
            await page.waitForTimeout(800 * attempt);
          }
        }
        if (!parsed) throw new Error(`${locale} batch ${index + 1}/${batches.length}: ${lastError}`);
        for (const item of expected) result.unitTranslations[item.key] = parsed.get(item.key);
        result.completedBatches[String(index)] = true;
        writeResult(locale, result);
        console.log(`PROGRESS ${locale} ${index + 1}/${batches.length} items=${Object.keys(result.translations).length}/${catalog.items.length}`);
        await page.waitForTimeout(350);
      }
      writeResult(locale, result);
      console.log(`COMPLETE ${locale} batches=${batches.length} items=${Object.keys(result.translations).length}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('C:/Users/golde/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const repo = path.resolve(__dirname, '..', '..');
const output = path.join(repo, 'result-reports/i18n-work/dynamic-source-catalog.ko.json');
const baseCatalog = JSON.parse(fs.readFileSync(path.join(repo, 'result-reports/i18n-work/source-catalog.v7.ko.json'),'utf8'));
const baseSources = new Set(baseCatalog.items.map((item) => item.source));
const reportDefs = [
  {id:'kpass-child',file:path.join(repo,'result-reports/kpass/candidate/report.kpass.final.html'),levels:{L:80,M:100,H:125}},
  {id:'dcas-teen',file:path.join(repo,'result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_TEEN/teen.work.html'),levels:{L:40,M:60,H:80}},
  {id:'dcas-adult',file:path.join(repo,'result-reports/dcas81/unpacked/APPLIED_FULL/DCAS_ADULT/adult.work.html'),levels:{L:40,M:60,H:80}}
];
const tiers = ['L','M','H'];

function profiles(def) {
  const result = [];
  for (const p of tiers) for (const a of tiers) for (const s of tiers) for (const q of tiers) {
    const scores = {P:def.levels[p],A:def.levels[a],S:def.levels[s],Q:def.levels[q]};
    if (def.id === 'kpass-child') result.push({name:'Alex Kim',genderKey:'X',ageYears:10,ageMonths:4,testDate:{y:2026,m:9,d:21},fullScaleScore:112,scores});
    else result.push({fullName:'Alex Kim',givenName:'Alex',fullNameEn:'Alex Kim',genderKey:'X',ageYears:def.id === 'dcas-teen' ? 16 : 23,gradeLabel:def.id === 'dcas-teen' ? 'Grade 10' : 'University Year 4',majorName:'Cognitive Science',testDate:{y:2026,m:9,d:21},scores});
  }
  const specialScores = def.id === 'kpass-child'
    ? [{P:120,A:108,S:100,Q:90},{P:145,A:131,S:117,Q:95},{P:86,A:85,S:119,Q:120},{P:100,A:100,S:100,Q:100}]
    : [{P:52,A:53,S:74,Q:75},{P:80,A:56,S:89,Q:89},{P:80,A:56,S:89,Q:79},{P:80,A:56,S:89,Q:78},{P:80,A:56,S:78,Q:89}];
  for (const scores of specialScores) {
    if (def.id === 'kpass-child') result.push({name:'Alex Kim',genderKey:'X',ageYears:10,ageMonths:4,testDate:{y:2026,m:9,d:21},fullScaleScore:112,scores});
    else result.push({fullName:'Alex Kim',givenName:'Alex',fullNameEn:'Alex Kim',genderKey:'X',ageYears:def.id === 'dcas-teen' ? 16 : 23,gradeLabel:def.id === 'dcas-teen' ? 'Grade 10' : 'University Year 4',majorName:'Cognitive Science',testDate:{y:2026,m:9,d:21},scores});
  }
  if (def.id === 'kpass-child') {
    for (const fullScaleScore of [75,85,90,101,110,120,130]) {
      result.push({
        name:'Alex Kim', genderKey:'X', ageYears:10, ageMonths:4,
        testDate:{y:2026,m:9,d:21}, fullScaleScore,
        scores:{P:130,A:119,S:80,Q:71}
      });
    }
  }
  return result;
}

function normalize(text) {
  let source = String(text).replace(/\s+/g, ' ').trim();
  if (!/[가-힣]/.test(source) || source.length > 6000) return null;
  source = source.replaceAll('Alex Kim', '{name}').replaceAll('Alex', '{given}').replaceAll('Cognitive Science', '{major}');
  let numberIndex = 0;
  source = source.replace(/\d+(?:\.\d+)?%?/g, () => `{n${numberIndex++}}`);
  const placeholders = [...new Set(source.match(/\{(?:name|given|major|n\d+)\}/g) || [])];
  let protectedText = source;
  placeholders.forEach((placeholder, index) => { protectedText = protectedText.replaceAll(placeholder, `__FGPH_${String(index).padStart(3,'0')}__`); });
  return {source,placeholders,protectedText};
}

(async () => {
  const browser = await chromium.launch({
    executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:true,
    args:['--disable-gpu','--no-first-run','--no-default-browser-check','--allow-file-access-from-files']
  });
  const items = new Map();
  try {
    for (const def of reportDefs) {
      const context = await browser.newContext();
      await context.route(/^https?:/, (route) => route.abort());
      const page = await context.newPage();
      await page.addInitScript(() => { window.__REPORT_LOCALE__='ko';window.__DCAS_LANG__='ko'; });
      await page.goto(`file:///${def.file.replace(/\\/g,'/').replace(/ /g,'%20')}`, {waitUntil:'load',timeout:30000});
      for (const profile of profiles(def)) {
        const strings = await page.evaluate(({id,profile}) => {
          if (id === 'kpass-child') window.KPassEngine.applyPersonalization(profile);
          else if (id === 'dcas-teen') window.DCasTeenEngine.render(profile);
          else window.DCasAdultEngine.render(profile);
          const values = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node;
          while ((node = walker.nextNode())) {
            if (!node.parentElement || ['SCRIPT','STYLE','NOSCRIPT','TEXTAREA'].includes(node.parentElement.tagName)) continue;
            values.push(node.nodeValue);
          }
          for (const element of document.querySelectorAll('[aria-label],[alt],[title],[placeholder]')) {
            for (const name of ['aria-label','alt','title','placeholder']) if (element.hasAttribute(name)) values.push(element.getAttribute(name));
          }
          return values;
        }, {id:def.id,profile});
        for (const text of strings) {
          const normalized = normalize(text);
          if (!normalized) continue;
          if (baseSources.has(normalized.source)) continue;
          const key = `FGD_${crypto.createHash('sha256').update(normalized.source).digest('hex').slice(0,16).toUpperCase()}`;
          const existing = items.get(key);
          if (existing) {
            if (!existing.contexts.includes(`${def.id}:dynamic-render`)) existing.contexts.push(`${def.id}:dynamic-render`);
          } else {
            items.set(key,{key,source:normalized.source,protected:{text:normalized.protectedText,placeholders:normalized.placeholders},contexts:[`${def.id}:dynamic-render`]});
          }
        }
      }
      await context.close();
      console.log(`HARVESTED ${def.id} cumulative=${items.size}`);
    }
  } finally {
    await browser.close();
  }
  const catalog = {schemaVersion:1,sourceLocale:'ko',generatedAt:new Date().toISOString(),translationProvider:'google-translate-web',reports:reportDefs.map((item)=>item.id),itemCount:items.size,items:[...items.values()].sort((a,b)=>a.key.localeCompare(b.key))};
  fs.writeFileSync(output, JSON.stringify(catalog,null,2)+'\n','utf8');
  console.log(`WROTE ${output} ITEMS ${catalog.itemCount}`);
})().catch((error) => { console.error(error.stack || error);process.exitCode=1; });

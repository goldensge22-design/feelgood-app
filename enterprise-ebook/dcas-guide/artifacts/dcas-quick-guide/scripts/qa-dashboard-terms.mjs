import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../src/i18n/', import.meta.url));
const fixture = JSON.parse(readFileSync(new URL('../../../qa/dcas-guide/dashboard-terms.json', import.meta.url)));
const titles = JSON.parse(readFileSync(new URL('../../../qa/dcas-guide/dashboard-entry-titles.json', import.meta.url)));
const config = JSON.parse(readFileSync(`${root}guide-config.json`));
let menus = 0, buttons = 0;
for (const [code, source] of Object.entries(fixture)) {
  const pack = JSON.parse(readFileSync(`${root}packs/${code}.json`));
  assert.ok(pack.chapters[1].open.includes(titles[code]['performance.entryTitle']), `${code}/employee entry title`);
  assert.ok(pack.chapters[4].open.includes(titles[code]['modelEvaluation.title']), `${code}/applicant entry title`);
  config.chapterHashes.forEach((hashes, i) => hashes.forEach((hash, j) => {
    assert.equal(pack.chapters[i].links[j], source.menus[hash], `${code}/chapter${i + 1}/${hash}`);
    menus++;
  }));
  for (const [chapter, step, flow, key] of [
    [1, 2, 1, 'performance.saveDraft'],
    [1, 3, 2, 'performance.applyAnalysis'],
    [4, 2, 1, 'modelEvaluation.apply'],
  ]) {
    const label = source.buttons[key];
    assert.equal(pack.chapters[chapter].flow[flow], label, `${code}/${key}/flow`);
    assert.ok(pack.chapters[chapter].steps[step].includes(label), `${code}/${key}/step`);
    buttons++;
  }
}
console.log(`PASS: ${menus} menu links and ${buttons} employee/applicant evaluation buttons match fetched public source.`);
console.log('Limitation: non-Korean competency lifecycle keys contain generic duplicate copy in the external source; those labels remain translations of the verified Korean source, not operational UI certification.');

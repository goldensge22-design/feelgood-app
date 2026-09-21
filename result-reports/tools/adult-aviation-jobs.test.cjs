const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const adult = path.resolve(__dirname, '..', 'dcas81', 'unpacked', 'APPLIED_FULL', 'DCAS_ADULT');
const sandbox = { window:{} };
sandbox.globalThis = sandbox.window;
vm.runInNewContext(fs.readFileSync(path.join(adult, 'dcas-job-engine.js'), 'utf8'), sandbox);
vm.runInNewContext(fs.readFileSync(path.join(adult, 'dcas-jobs-extra.js'), 'utf8'), sandbox);

const expected = [
  '공항보안 사무직', '항공사보안 사무직', '항공보안검색요원', '항공경비요원', '대테러보안요원',
  '항공사보안요원', '항공화물보안요원', '산업보안 사무직', '산업보안 경비요원', '산업보안검색요원'
];
const pool = sandbox.window.DCasJobsExtra.JOB_POOL_EXTRA;
const aviation = pool.filter((job) => job.id >= 9101 && job.id <= 9110);
assert.deepStrictEqual(Array.from(aviation, (job) => job.label_ko), expected);
assert.strictEqual(new Set(aviation.map((job) => job.id)).size, 10, 'aviation job ids must be unique');
assert.ok(aviation.every((job) => job.attr_source === 'estimated' && job.attr_confidence === 0.5));

const scores = {P:80,A:85,S:78,Q:82};
for (const major of ['항공보안과', '항공보안학과']) {
  const ranked = sandbox.window.DCasJobEngine.rankJobsForMajor(scores, major, pool);
  assert.strictEqual(ranked.length, 10, `${major}: all ten jobs must be ranked`);
  assert.deepStrictEqual(new Set(ranked.map((item) => item.job.label_ko)), new Set(expected));
}
assert.ok(aviation.some((job) => job.ncs.middle_name === '공공행정·치안(산업보안)'), 'industrial-security jobs missing');
console.log('PASS: adult aviation-security major ranks all 10 files.zip jobs for both major aliases');

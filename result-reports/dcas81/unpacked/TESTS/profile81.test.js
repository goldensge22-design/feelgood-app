const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load(file, context) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename:file });
}

const base = path.resolve(__dirname, '..');
const root = fs.existsSync(path.join(base, 'DCAS_TEEN')) ? base : path.join(base, 'APPLIED_FULL');
const ctx = vm.createContext({ console });
ctx.globalThis = ctx;
load(path.join(root, 'DCAS_TEEN', 'dcas-profile81-bank.js'), ctx);

assert.deepStrictEqual(Array.from(ctx.DCasProfile81.LANGS), ['ko','en','ja','zh','es','ru','vi','th','ar','it','az']);

const values = { L:40, M:60, H:85 };
const codes = new Set();
['L','M','H'].forEach(P => ['L','M','H'].forEach(A => ['L','M','H'].forEach(S => ['L','M','H'].forEach(Q => {
  const p = ctx.DCasProfile81.classify({P:values[P],A:values[A],S:values[S],Q:values[Q]}, 'ko');
  codes.add(p.code);
}))));
assert.strictEqual(codes.size, 81, '81개의 고유 코드가 생성되어야 함');

const allLow = ctx.DCasProfile81.classify({P:40,A:45,S:50,Q:52}, 'ko');
assert.strictEqual(allLow.compactCode, 'LLLL');
assert.strictEqual(allLow.kind, 'ALL_L');
assert.strictEqual(allLow.title, '균형형·전반적 기반 강화형');

const allMid = ctx.DCasProfile81.classify({P:53,A:60,S:68,Q:74}, 'ko');
assert.strictEqual(allMid.compactCode, 'MMMM');
assert.strictEqual(allMid.kind, 'ALL_M');
assert.strictEqual(allMid.title, '균형형·표준 범위 탐색형');

const allHigh = ctx.DCasProfile81.classify({P:75,A:80,S:90,Q:99}, 'ko');
assert.strictEqual(allHigh.kind, 'ALL_H');

assert.strictEqual(ctx.DCasProfile81.classify({P:52,A:52,S:52,Q:52}, 'ko').compactCode, 'LLLL');
assert.strictEqual(ctx.DCasProfile81.classify({P:53,A:53,S:53,Q:53}, 'ko').compactCode, 'MMMM');
assert.strictEqual(ctx.DCasProfile81.classify({P:74,A:74,S:74,Q:74}, 'ko').compactCode, 'MMMM');
assert.strictEqual(ctx.DCasProfile81.classify({P:75,A:75,S:75,Q:75}, 'ko').compactCode, 'HHHH');
assert.strictEqual(ctx.DCasProfile81.classify({P:60,A:60,S:60,Q:60}, 'ko').exactTie, true);

ctx.DCasProfile81.LANGS.forEach(lang => {
  const p = ctx.DCasProfile81.classify({P:60,A:85,S:40,Q:60}, lang);
  assert.ok(p.title && p.summary && p.fragments.length === 4);
  assert.ok(p.recommendations.learning && p.recommendations.career && p.recommendations.job);
  if (lang === 'ar') assert.strictEqual(p.dir, 'rtl');
});

load(path.join(root, 'DCAS_TEEN', 'dcas-teen-combo-bank.js'), ctx);
load(path.join(root, 'DCAS_ADULT', 'dcas-combo-bank.js'), ctx);
assert.strictEqual(ctx.DCasTeenComboBank.pickComboKey({P:53,A:60,S:68,Q:74}), 'BAL');
assert.strictEqual(ctx.DCasTeenComboBank.pickComboKey({P:30,A:40,S:45,Q:52}), 'BAL');
assert.strictEqual(ctx.DCasComboBank.pickComboKey({P:76,A:83,S:90,Q:99}), 'BAL');

console.log('PASS: 81 unique profiles, 11 locales, special cases, and BAL routing');

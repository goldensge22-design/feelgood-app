const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.resolve(__dirname, '..');
const root = fs.existsSync(path.join(base, 'DCAS_TEEN')) ? base : path.join(base, 'APPLIED_FULL');
const tracks = ['DCAS_TEEN', 'DCAS_ADULT'];
const locales = ['ko','en','ja','zh','zh-TW','es','fr','ru','vi','th','ar','it','az','km','mn'];
const levels = ['L','M','H'];
const values = {L:40,M:60,H:85};

function load(track, withPatch) {
  const context = vm.createContext({console});
  context.globalThis = context;
  const trackRoot = path.join(root, track);
  vm.runInContext(fs.readFileSync(path.join(trackRoot, 'dcas-profile81-bank.js'), 'utf8'), context);
  if (withPatch) {
    vm.runInContext(fs.readFileSync(path.join(trackRoot, 'dcas-profile81-unique-names.js'), 'utf8'), context);
  }
  return context.DCasProfile81;
}

for (const track of tracks) {
  const baseBank = load(track, false);
  const patchedBank = load(track, true);
  assert.deepStrictEqual(Array.from(patchedBank.NAME_LANGS), locales);

  for (const locale of locales) {
    const names = new Set();
    for (const P of levels) for (const A of levels) for (const S of levels) for (const Q of levels) {
      const scores = {P:values[P],A:values[A],S:values[S],Q:values[Q]};
      const before = baseBank.classify(scores, baseBank.normalizeLang(locale));
      const after = patchedBank.classify(scores, locale);
      names.add(after.title);

      assert.strictEqual(after.code, before.code);
      assert.strictEqual(after.compactCode, before.compactCode);
      assert.strictEqual(after.kind, before.kind);
      assert.strictEqual(after.summary, before.summary);
      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(after.recommendations)),
        JSON.parse(JSON.stringify(before.recommendations))
      );
      assert.strictEqual(after.nameSchema, 'dcas81-unique-v1');
    }
    assert.strictEqual(names.size, 81, track + ' ' + locale + ': 81 unique titles required');
  }

  assert.strictEqual(patchedBank.classify({P:85,A:85,S:85,Q:60}, 'ko').title, '전략통찰 · 절차주도 안정형 전략가');
  assert.strictEqual(patchedBank.classify({P:60,A:60,S:60,Q:85}, 'ko').title, '절차주도 · 전략통찰 안정형 실행가');
  assert.strictEqual(patchedBank.classify({P:60,A:60,S:60,Q:60}, 'ko').title, '전영역 균형형 전략 탐색가');
  assert.strictEqual(patchedBank.classify({P:85,A:85,S:85,Q:85}, 'ko').title, '전영역 고역량 균형형 올라운더');
  assert.strictEqual(patchedBank.classify({P:40,A:40,S:40,Q:40}, 'ko').title, '전영역 균형형 성장 인재');
}

console.log('PASS: teen/adult, 15 locales, 81 unique display names; scoring and recommendations unchanged');

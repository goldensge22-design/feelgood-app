const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const base = path.resolve(__dirname, '..');
const root = fs.existsSync(path.join(base, 'DCAS_TEEN')) ? base : path.join(base, 'APPLIED_FULL');
const expectedLangs = ['ko','en','ja','zh','es','ru','vi','th','ar','it','az','km'];
const levels = ['L','M','H'];
const values = { L:40, M:60, H:85 };

function loadBank(track) {
  const context = vm.createContext({ console });
  context.globalThis = context;
  const file = path.join(root, track, 'dcas-profile81-bank.js');
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename:file });
  return context.DCasProfile81;
}

function assertThrowsScore(bank, scores, axis) {
  assert.throws(
    () => bank.classify(scores, 'ko'),
    error => error && /finite 0-100/.test(error.message) && error.message.includes(axis)
  );
}

const teen = loadBank('DCAS_TEEN');
const adult = loadBank('DCAS_ADULT');
assert.deepStrictEqual(Array.from(teen.LANGS), expectedLangs);
assert.deepStrictEqual(Array.from(adult.LANGS), expectedLangs);
assert.strictEqual(teen.normalizeLang('km-KH'), 'km');
assert.strictEqual(adult.normalizeLang('km'), 'km');
assert.strictEqual(teen.LOCALE_META.km.status, 'ai-draft');
assert.strictEqual(adult.LOCALE_META.km.sourceVersion, 'ko-profile81-v1');

for (const bank of [teen, adult]) {
  const codes = new Set();
  for (const P of levels) for (const A of levels) for (const S of levels) for (const Q of levels) {
    const profile = bank.classify({P:values[P], A:values[A], S:values[S], Q:values[Q]}, 'ko');
    codes.add(profile.code);
    assert.strictEqual(profile.fragments.length, 4);
    assert.ok(profile.recommendations.learning);
    assert.ok(profile.recommendations.career);
    assert.ok(profile.recommendations.job);
  }
  assert.strictEqual(codes.size, 81, '각 트랙에서 81개의 고유 코드가 생성되어야 함');

  assert.strictEqual(bank.classify({P:52,A:52,S:52,Q:52}, 'ko').compactCode, 'LLLL');
  assert.strictEqual(bank.classify({P:53,A:53,S:53,Q:53}, 'ko').compactCode, 'MMMM');
  assert.strictEqual(bank.classify({P:74,A:74,S:74,Q:74}, 'ko').compactCode, 'MMMM');
  assert.strictEqual(bank.classify({P:75,A:75,S:75,Q:75}, 'ko').compactCode, 'HHHH');

  const allLow = bank.classify({P:40,A:45,S:50,Q:52}, 'ko');
  assert.strictEqual(allLow.kind, 'ALL_L');
  assert.strictEqual(allLow.title, '균형형·전반적 기반 강화형');
  assert.strictEqual(bank.classify({P:53,A:60,S:68,Q:74}, 'ko').kind, 'ALL_M');
  assert.strictEqual(bank.classify({P:75,A:80,S:90,Q:99}, 'ko').kind, 'ALL_H');
  assert.strictEqual(bank.classify({P:60,A:60,S:60,Q:60}, 'ko').exactTie, true);

  const processingCases = [
    [{P:60,A:60,S:60,Q:60}, 0, 'BALANCED', null],
    [{P:60,A:60,S:70,Q:60}, 10, 'BALANCED', null],
    [{P:60,A:60,S:71,Q:60}, 11, 'S_DOMINANT', 'S'],
    [{P:60,A:60,S:60,Q:71}, 11, 'Q_DOMINANT', 'Q']
  ];
  for (const [scores, diff, kind, dominant] of processingCases) {
    const result = bank.classifyProcessing(scores);
    assert.strictEqual(result.diff, diff);
    assert.strictEqual(result.kind, kind);
    assert.strictEqual(result.dominant, dominant);
  }

  assertThrowsScore(bank, {P:60,A:60,S:60}, 'Q');
  assertThrowsScore(bank, {P:60,A:60,S:'bad',Q:60}, 'S');
  assertThrowsScore(bank, {P:60,A:60,S:-1,Q:60}, 'S');
  assertThrowsScore(bank, {P:60,A:60,S:101,Q:60}, 'S');

  for (const lang of expectedLangs) {
    for (const P of levels) for (const A of levels) for (const S of levels) for (const Q of levels) {
      const profile = bank.classify({P:values[P], A:values[A], S:values[S], Q:values[Q]}, lang);
      assert.ok(profile.title && profile.summary && profile.fragments.every(f => f.text));
      assert.ok(profile.recommendations.learning && profile.recommendations.career && profile.recommendations.job);
      if (lang === 'ar') assert.strictEqual(profile.dir, 'rtl');
      if (lang === 'km') {
        const khmerText = [profile.title, profile.summary]
          .concat(profile.fragments.map(f => f.text))
          .concat([profile.recommendations.learning, profile.recommendations.career, profile.recommendations.job])
          .join(' ');
        assert.ok(/[\u1780-\u17FF]/.test(khmerText), '크메르어 문자가 포함되어야 함');
        assert.strictEqual(profile.dir, 'ltr');
      }
    }
  }
}

for (const lang of expectedLangs) {
  const scores = {P:60,A:85,S:40,Q:71};
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(teen.classify(scores, lang))),
    JSON.parse(JSON.stringify(adult.classify(scores, lang))),
    '청소년·성인 81유형 bank가 동일해야 함: ' + lang
  );
}

const comboContext = vm.createContext({ console });
comboContext.globalThis = comboContext;
vm.runInContext(fs.readFileSync(path.join(root, 'DCAS_TEEN', 'dcas-teen-combo-bank.js'), 'utf8'), comboContext);
vm.runInContext(fs.readFileSync(path.join(root, 'DCAS_ADULT', 'dcas-combo-bank.js'), 'utf8'), comboContext);
assert.strictEqual(comboContext.DCasTeenComboBank.pickComboKey({P:53,A:60,S:68,Q:74}), 'BAL');
assert.strictEqual(comboContext.DCasTeenComboBank.pickComboKey({P:30,A:40,S:45,Q:52}), 'BAL');
assert.strictEqual(comboContext.DCasComboBank.pickComboKey({P:76,A:83,S:90,Q:99}), 'BAL');

console.log('PASS: teen/adult 81 profiles, H/M/L boundaries, S/Q 0/10/11, invalid scores, 12 locales including Khmer, special cases, and BAL routing');

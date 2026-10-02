const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const candidate = path.resolve(__dirname, '..', 'kpass', 'candidate');
const context = { console };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(candidate, 'kpass-content-engine.js'), 'utf8'), context);

const originalBuild = context.KPassEngine.buildDerived;
const before = originalBuild({
  fullScaleScore: 101,
  scores: { P: 130, A: 119, S: 80, Q: 71 }
});

vm.runInContext(fs.readFileSync(path.join(candidate, 'kpass-profile81-unique-names.js'), 'utf8'), context);
const names = context.KPassProfile81Names;
assert.ok(names, 'unique-name patch must expose KPassProfile81Names');

const levels = ['H', 'M', 'L'];
const score = { H: 120, M: 100, L: 85 };
for (const locale of names.LANGS) {
  const found = new Set();
  for (const P of levels) for (const A of levels) for (const S of levels) for (const Q of levels) {
    const profile = names.classify({ P:score[P], A:score[A], S:score[S], Q:score[Q] }, locale);
    assert.equal(profile.nameSchema, 'kpass81-unique-v1');
    assert.equal(profile.code, `P-${P} / A-${A} / S-${S} / Q-${Q}`);
    assert.ok(profile.title.trim(), `${locale}/${profile.code}: title missing`);
    assert.ok(!found.has(profile.title), `${locale}: duplicate title ${profile.title}`);
    found.add(profile.title);
  }
  assert.equal(found.size, 81, `${locale}: expected 81 unique names`);
}

assert.equal(names.getLevel(85), 'L');
assert.equal(names.getLevel(86), 'M');
assert.equal(names.getLevel(119), 'M');
assert.equal(names.getLevel(120), 'H');
assert.equal(names.classify({P:120,A:120,S:120,Q:120}, 'ko').title, '전영역 고역량 균형형 올라운더');
assert.equal(names.classify({P:100,A:100,S:100,Q:100}, 'ko').title, '전영역 균형형 전략 탐색가');
assert.equal(names.classify({P:85,A:85,S:85,Q:85}, 'ko').title, '전영역 균형형 성장 탐험가');
assert.throws(() => names.classify({P:NaN,A:100,S:100,Q:100}, 'ko'), /finite/);

const after = context.KPassEngine.buildDerived({
  fullScaleScore: 101,
  scores: { P: 130, A: 119, S: 80, Q: 71 }
});
for (const key of ['comboKey','fullScaleScore','balancedTier','weakAxisKey','isBalanced','strongCount','compassPolygon']) {
  assert.deepEqual(after[key], before[key], `existing derived field changed: ${key}`);
}
assert.deepEqual(JSON.parse(JSON.stringify(after.perAxis)), JSON.parse(JSON.stringify(before.perAxis)));
assert.equal(after.profile81.code, 'P-H / A-M / S-L / Q-L');
assert.equal(after.profile81.title, '계획주도 · 구조표현 보완형 실행가');

console.log('PASS: K-PASS 15 locales × 81 unique names, 85/86 and 119/120 boundaries, core scoring unchanged');

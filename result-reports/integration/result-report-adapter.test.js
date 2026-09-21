const assert = require('assert');
const path = require('path');

require(path.join(__dirname, 'result-report-adapter.js'));
const adapter = globalThis.ResultReportAdapter;

const dcas = adapter.install({
  schemaVersion: 1,
  reportKind: 'dcas-adult',
  locale: 'km-KH',
  person: { fullName:'검증 사용자', givenName:'사용자', genderKey:'X', ageYears:20, ageMonths:0, gradeLabel:'성인' },
  test: { date:{y:2026,m:9,d:21} },
  scores: { P:75, A:53, S:64, Q:75 }
});
assert.strictEqual(dcas.locale, 'km-kh');
assert.deepStrictEqual(globalThis.__TEST_PROFILE__.scores, {P:75,A:53,S:64,Q:75});
assert.strictEqual(globalThis.__TEST_PROFILE__.givenName, '사용자');

adapter.install({
  schemaVersion: 1,
  reportKind: 'kpass-child',
  locale: 'ko',
  person: { fullName:'검증 아동', givenName:'아동', genderKey:'F', ageYears:9, ageMonths:4 },
  test: { date:{y:2026,m:9,d:21} },
  scores: { fullScale:100, P:101, A:99, S:100, Q:100 }
});
assert.strictEqual(globalThis.__TEST_PROFILE__.name, '검증 아동');
assert.strictEqual(globalThis.__TEST_PROFILE__.fullScaleScore, 100);

assert.throws(() => adapter.normalize({
  schemaVersion:1, reportKind:'dcas-teen', locale:'ko',
  person:{fullName:'오류',givenName:'오류',genderKey:'M',ageYears:16,gradeLabel:'고1'},
  test:{date:{y:2026,m:9,d:21}}, scores:{P:101,A:50,S:50,Q:50}
}), /between 0 and 100/);

assert.throws(() => adapter.normalize({
  schemaVersion:1, reportKind:'kpass-child', locale:'ko',
  person:{fullName:'오류',givenName:'오류',genderKey:'M',ageYears:9,ageMonths:0},
  test:{date:{y:2026,m:9,d:21}}, scores:{P:100,A:100,S:100,Q:100}
}), /scores.fullScale/);

console.log('PASS: common result-report adapter contracts');

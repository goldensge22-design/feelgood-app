import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../profile-engine.js');
const combinations = engine.allCombinations();
const codes = combinations.map(engine.profileCode);
const requiredTeacherFields = ['code','name','tags','classification','summary','priorities','coreLearning','strengthUses','bottlenecks','lessonDesign','management','teacherScripts','risks','expectedBehaviors','bridge'];
const requiredParentFields = ['code','name','tags','classification','summary','parentCore','behaviors','questions','homeSupports','scripts','avoid','jointObservation','priorities','bridge'];
const prohibited = ['게으르다','머리가 한쪽으로만 발달했다','이 과목이나 직업에는 맞지 않는다','상이므로 영재다','하이므로 능력이 낮다','undefined','null'];

assert.equal(combinations.length, 81, 'PASS 조합은 81개여야 합니다.');
assert.equal(new Set(codes).size, 81, '81개 유형 코드는 모두 고유해야 합니다.');

function assertComplete(result, fields, label) {
  fields.forEach(field => {
    assert.ok(Object.hasOwn(result, field), `${label}: ${field} 필드가 없습니다.`);
    const value = result[field];
    if (Array.isArray(value)) assert.ok(value.length > 0 && value.every(item => String(item).trim()), `${label}: ${field} 배열이 비었습니다.`);
    else assert.ok(String(value).trim(), `${label}: ${field} 내용이 비었습니다.`);
  });
  const serialized = JSON.stringify(result);
  prohibited.forEach(term => assert.ok(!serialized.includes(term), `${label}: 금지 표현이 포함되었습니다: ${term}`));
}

const teachers = [];
const parents = [];
for (const combination of combinations) {
  const code = engine.profileCode(combination);
  const teacher = engine.teacherAnalysis(combination);
  const parent = engine.parentAnalysis(combination);
  teachers.push(teacher);
  parents.push(parent);
  assert.equal(teacher.code, code, `${code}: 수업 분석 코드 불일치`);
  assert.equal(parent.code, code, `${code}: 상담 분석 코드 불일치`);
  assertComplete(teacher, requiredTeacherFields, `수업 ${code}`);
  assertComplete(parent, requiredParentFields, `상담 ${code}`);
  assert.equal(teacher.priorities.length, 3, `${code}: 지원 우선순위는 3단계여야 합니다.`);
  assert.equal(teacher.lessonDesign.length, 8, `${code}: 맞춤 수업 설계는 8항목이어야 합니다.`);
  assert.equal(teacher.management.length, 8, `${code}: 맞춤 관리팁은 8항목이어야 합니다.`);
  assert.equal(teacher.teacherScripts.length, 3, `${code}: 교사 문장은 3개여야 합니다.`);
  assert.ok(parent.questions.length >= 3 && parent.questions.length <= 5, `${code}: 보호자 질문은 3~5개여야 합니다.`);
  assert.equal(parent.homeSupports.length, 3, `${code}: 가정 지원은 3개여야 합니다.`);
  assert.notEqual(teacher.summary, parent.summary, `${code}: 수업과 상담 설명이 같으면 안 됩니다.`);
}

assert.equal(new Set(teachers.map(item => item.summary)).size, 81, '수업 통합 요약은 81개 조합별로 구분되어야 합니다.');
assert.equal(new Set(teachers.map(item => item.priorities.join('|'))).size, 81, '수업 지원 우선순위는 81개 조합별로 구분되어야 합니다.');
assert.equal(new Set(parents.map(item => item.summary)).size, 81, '상담 통합 요약은 81개 조합별로 구분되어야 합니다.');

const comparisonCases = [
  {levels:{plan:'H',attention:'H',simultaneous:'H',successive:'L'},must:['전체 구조','순서 카드']},
  {levels:{plan:'L',attention:'H',simultaneous:'H',successive:'L'},must:['목표와 첫 단계','순서표']},
  {levels:{plan:'H',attention:'L',simultaneous:'H',successive:'L'},must:['짧은 집중 구간','시각적 단계표']},
  {levels:{plan:'L',attention:'H',simultaneous:'L',successive:'H'},must:['목표·완성 예시·전체 구조','주의·순차']},
  {levels:{plan:'L',attention:'L',simultaneous:'H',successive:'H'},must:['이해능력','실제 과제 시작·완료']},
  {levels:{plan:'H',attention:'H',simultaneous:'L',successive:'L'},must:['자기관리','학습내용']},
  {levels:{plan:'M',attention:'M',simultaneous:'M',successive:'M'},must:['낯섦·복잡성·흥미·시간 압박','2~4주']},
  {levels:{plan:'L',attention:'L',simultaneous:'L',successive:'L'},must:['검사환경·피로·불안·언어 이해','전문기관의 종합평가']}
];
const caseOutputs = comparisonCases.map(({levels,must}) => {
  const teacher = engine.teacherAnalysis(levels);
  const serialized = JSON.stringify(teacher);
  must.forEach(term => assert.ok(serialized.includes(term), `${teacher.code}: 비교 사례 필수 내용 누락: ${term}`));
  return teacher.summary + teacher.priorities.join('|');
});
assert.equal(new Set(caseOutputs).size, comparisonCases.length, '8개 비교 사례는 실질적으로 서로 달라야 합니다.');

console.log(JSON.stringify({
  status:'PASS', combinations:81, uniqueCodes:81,
  uniqueTeacherSummaries:new Set(teachers.map(item => item.summary)).size,
  uniqueTeacherPriorities:new Set(teachers.map(item => item.priorities.join('|'))).size,
  uniqueParentSummaries:new Set(parents.map(item => item.summary)).size,
  comparisonCases:comparisonCases.length,
  teacherFields:requiredTeacherFields.length,
  parentFields:requiredParentFields.length
}, null, 2));

import assert from 'node:assert/strict';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const engine = require('../profile-engine.js');

const combinations = engine.allCombinations();
assert.equal(combinations.length, 81, 'PASS 조합은 81개여야 합니다.');

const codes = combinations.map(engine.profileCode);
assert.equal(new Set(codes).size, 81, '81개 유형 코드는 모두 고유해야 합니다.');

const requiredTeacherFields = [
  'code', 'name', 'tags', 'summary', 'highPotential', 'balance', 'tilt', 'executiveGap',
  'lowSupport', 'extensions', 'materials', 'management', 'observation', 'teachingTips', 'cautions'
];
const requiredParentFields = [
  'code', 'name', 'tags', 'summary', 'keyMessage', 'behaviors', 'questions', 'homeSupports',
  'scripts', 'avoid', 'jointObservation'
];
const prohibited = [
  '게으르다', '머리가 한쪽으로만 발달했다', '이 과목이나 직업에는 맞지 않는다',
  '상이므로 영재다', '하이므로 능력이 낮다', 'undefined', 'null'
];

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

for (const combination of combinations) {
  const code = engine.profileCode(combination);
  const teacher = engine.teacherAnalysis(combination);
  const parent = engine.parentAnalysis(combination);
  assert.equal(teacher.code, code, `${code}: 수업 분석 코드 불일치`);
  assert.equal(parent.code, code, `${code}: 상담 분석 코드 불일치`);
  assertComplete(teacher, requiredTeacherFields, `수업 ${code}`);
  assertComplete(parent, requiredParentFields, `상담 ${code}`);
  assert.ok(teacher.teachingTips.length >= 4 && teacher.teachingTips.length <= 6, `${code}: 수업 TIP은 4~6개여야 합니다.`);
  assert.ok(teacher.management.length >= 4 && teacher.management.length <= 6, `${code}: 관리 TIP은 4~6개여야 합니다.`);
  assert.notEqual(teacher.summary, parent.summary, `${code}: 수업과 상담 설명이 같으면 안 됩니다.`);
}

const allHigh = engine.teacherAnalysis({plan:'H', attention:'H', simultaneous:'H', successive:'H'});
assert.ok(allHigh.name.includes('전 영역 고강점'));
assert.ok(allHigh.cautions.some(item => item.includes('영재 판정이 아니')));

const allLow = engine.teacherAnalysis({plan:'L', attention:'L', simultaneous:'L', successive:'L'});
assert.ok(allLow.name.includes('전 영역 지원'));
assert.ok(allLow.cautions.some(item => item.includes('검사환경')));
assert.ok(allLow.lowSupport.some(item => item.includes('종합평가')));

const oppositeA = engine.teacherAnalysis({plan:'M', attention:'M', simultaneous:'H', successive:'L'});
const oppositeB = engine.teacherAnalysis({plan:'M', attention:'M', simultaneous:'L', successive:'H'});
assert.notDeepEqual(oppositeA.lowSupport, oppositeB.lowSupport);
assert.notDeepEqual(oppositeA.extensions, oppositeB.extensions);

console.log(JSON.stringify({status:'PASS', combinations:81, uniqueCodes:81, teacherFields:requiredTeacherFields.length, parentFields:requiredParentFields.length}, null, 2));

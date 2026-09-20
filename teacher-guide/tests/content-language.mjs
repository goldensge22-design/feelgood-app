import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import '../profile-engine.js';

const root = resolve(import.meta.dirname, '..');
const [index, app, rules] = await Promise.all([
  readFile(resolve(root, 'index.html'), 'utf8'),
  readFile(resolve(root, 'app.js'), 'utf8'),
  readFile(resolve(root, 'docs', '교사용_쉬운말_실행중심_콘텐츠_규칙.md'), 'utf8')
]);
const engine = globalThis.GuideProfileEngine;

assert.match(rules, /^# 교사용 쉬운 말·실행 중심 콘텐츠 규칙/m, '공통 콘텐츠 규칙 제목이 없습니다.');
assert.match(index, /좌뇌·우뇌 관련 표기는 이해를 돕기 위한 간단한 설명입니다/, '좌뇌·우뇌 주의문구가 없습니다.');
assert.match(index, /결과지 공통 읽기 순서/, '결과지 공통 읽기 순서가 없습니다.');
assert.match(index, /수업과 NUVIA로 옮기기/, 'K-PASS 결과지의 수업·NUVIA 연결이 없습니다.');
assert.match(index, /수업과 NUVIA에서 연습할 한 가지/, '청소년 결과지의 수업·NUVIA 연결이 없습니다.');
assert.match(index, /성장계획·자기소개서·NUVIA/, '성인 결과지의 NUVIA 연결이 없습니다.');
assert.match(index, /검사정보를 외부로 전송하지 않습니다/, '사용자 보호 목적의 개인정보 안내가 없습니다.');

const internalStatusUi = [
  'translationNotice',
  'reader-notice',
  'data-status',
  'AI 자동 번역 초안입니다.',
  'AI 생성 설명이 아닙니다.'
];
for (const marker of internalStatusUi) {
  assert.ok(!index.includes(marker) && !app.includes(marker), `일반 사용자 UI 생성 코드에 내부 상태 문구가 남았습니다: ${marker}`);
}

const vagueOnly = [
  '강점을 활용합니다.',
  '구조화된 지원을 제공합니다.',
  '단계적으로 접근합니다.',
  '연결해 줍니다.',
  '지속적으로 관찰합니다.',
  '적절히 조절합니다.',
  '학습을 관리합니다.',
  '전략을 적용합니다.',
  '학생을 지원합니다.',
  '가정과 협력합니다.'
];
for (const phrase of vagueOnly) {
  assert.ok(!index.includes(phrase) && !app.includes(phrase), `모호한 단독 문장이 남았습니다: ${phrase}`);
}

const studentForbidden = ['순차처리','동시처리','좌뇌영역','우뇌영역','인지처리 병목','규준적 약점','내적 약점','처리 효율성','전략 일반화'];
const requiredTeacherFields = ['plainProfile','strengthUses','bottlenecks','subjectTips','lessonDesign','management','teacherScripts','observationPlan','helpDecisions'];
const requiredParentFields = ['plainProfile','confirmedStrengths','schoolScenes','combinedInterpretation','homeAction','schoolAction','reviewCriteria','questions','scripts','avoid'];

for (const levels of engine.allCombinations()) {
  const teacher = engine.teacherAnalysis(levels);
  const parent = engine.parentAnalysis(levels);
  requiredTeacherFields.forEach(field => assert.ok(teacher[field] && (!Array.isArray(teacher[field]) || teacher[field].length), `${teacher.code}: 교사지도 ${field} 누락`));
  requiredParentFields.forEach(field => assert.ok(parent[field] && (!Array.isArray(parent[field]) || parent[field].length), `${parent.code}: 보호자상담 ${field} 누락`));
  studentForbidden.forEach(term => assert.ok(!teacher.teacherScripts.join(' ').includes(term), `${teacher.code}: 학생 문장 금지용어 ${term}`));
  studentForbidden.forEach(term => assert.ok(!parent.scripts.join(' ').includes(term), `${parent.code}: 보호자 문장 금지용어 ${term}`));
}

console.log(JSON.stringify({
  status:'PASS',
  rule:'교사용 쉬운 말·실행 중심 콘텐츠 규칙',
  combinations:81,
  vagueStandalonePhrases:0,
  studentForbiddenTerms:0,
  internalStatusUiMarkers:0,
  resultGuides:['kpass','teen','adult']
}, null, 2));

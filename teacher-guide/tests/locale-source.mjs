import '../profile-engine.js';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const engine = globalThis.GuideProfileEngine;

export const dynamicHeadings = [
  '선택 결과를 쉬운 말로 읽기',
  '잘할 가능성이 높은 수업 장면',
  '어려움을 보일 수 있는 수업 장면',
  '과목별로 내일 바꿀 수업',
  '수업 시작부터 마무리까지',
  '자리·자료·시간 관리',
  '학생에게 바로 말할 문장',
  '2주 관찰표',
  '도움을 유지·축소·변경하는 기준',
  '먼저 할 일 세 가지',
  '단정하지 말아야 할 것',
  '1. 확인된 강점',
  '2. 학교에서 관찰된 장면',
  '3. 검사 결과와 관찰을 함께 본 해석',
  '4. 가정에서 할 행동 한 가지',
  '5. 학교에서 할 행동 한 가지',
  '6. 2~4주 뒤 함께 확인할 기준',
  '상담 중 교사가 물어볼 질문',
  '교사가 바로 사용할 상담 문장',
  '피해야 할 낙인과 단정'
];

function staticInterfaceSources() {
  const guideRoot = resolve(import.meta.dirname, '..');
  const html = readFileSync(resolve(guideRoot, 'index.html'), 'utf8');
  const app = readFileSync(resolve(guideRoot, 'app.js'), 'utf8');
  const sources = new Set();
  for (const match of html.matchAll(/>([^<>]+)</g)) {
    const value = match[1].replace(/\s+/g, ' ').trim();
    if (/[가-힣]/.test(value)) sources.add(value);
  }
  for (const match of html.matchAll(/(?:aria-label|title|placeholder|data-chapter-title)="([^"]+)"/g)) {
    const value = match[1].trim();
    if (/[가-힣]/.test(value)) sources.add(value);
  }
  const stringPatterns = [/'((?:\\.|[^'\\])*)'/g, /"((?:\\.|[^"\\])*)"/g, /`((?:\\.|[^`\\])*)`/g];
  for (const pattern of stringPatterns) {
    for (const match of app.matchAll(pattern)) {
      const value = match[1].replace(/\\(['"`])/g, '$1').trim();
      if (/[가-힣]/.test(value) && !/[<>]/.test(value)) sources.add(value);
    }
  }
  return [...sources];
}

function collectUsage(value, group, inventory) {
  if (Array.isArray(value)) {
    value.forEach(item => collectUsage(item, group, inventory));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(item => collectUsage(item, group, inventory));
    return;
  }
  if (typeof value !== 'string' || !/[가-힣]/.test(value)) return;
  const source = value.trim();
  inventory.usage.set(source, (inventory.usage.get(source) || 0) + 1);
  inventory.groups[group].add(source);
}

export function profileLocaleInventory() {
  const inventory = {
    usage: new Map(),
    groups: {teacher:new Set(dynamicHeadings), student:new Set(), parent:new Set()}
  };
  dynamicHeadings.forEach(source => inventory.usage.set(source, 1));
  staticInterfaceSources().forEach(source => {
    inventory.usage.set(source, (inventory.usage.get(source) || 0) + 1);
    inventory.groups.teacher.add(source);
  });
  engine.allCombinations().forEach(levels => {
    const teacher = engine.teacherAnalysis(levels);
    const parent = engine.parentAnalysis(levels);
    Object.entries(teacher).forEach(([field, value]) => collectUsage(value, field === 'teacherScripts' ? 'student' : 'teacher', inventory));
    Object.entries(parent).forEach(([field, value]) => collectUsage(value, field === 'scripts' ? 'parent' : 'parent', inventory));
  });
  const sources = [...inventory.usage.keys()].sort((left, right) => left.localeCompare(right, 'ko'));
  const reusedKeys = sources.filter(source => inventory.usage.get(source) > 1);
  const occurrences = [...inventory.usage.values()].reduce((sum, count) => sum + count, 0);
  return {
    sources,
    occurrences,
    uniqueKeys:sources.length,
    reusedKeys:reusedKeys.length,
    reusedOccurrences:reusedKeys.reduce((sum, source) => sum + inventory.usage.get(source) - 1, 0),
    groups:Object.fromEntries(Object.entries(inventory.groups).map(([group, values]) => [group, [...values].sort((left, right) => left.localeCompare(right, 'ko'))]))
  };
}

export function profileLocaleSources() {
  return profileLocaleInventory().sources;
}

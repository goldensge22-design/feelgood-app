import '../profile-engine.js';

const engine = globalThis.GuideProfileEngine;

export const dynamicHeadings = [
  '수업에서 먼저 활용할 강점',
  '수업에서 막힐 가능성이 큰 지점',
  '맞춤 수업 설계',
  '맞춤 관리팁',
  '교사가 사용할 문장',
  '이 조합의 지원 우선순위',
  '관찰할 위험과 오해',
  '가정에서 확인할 실제 행동',
  '상담 중 교사가 물어볼 질문',
  '가정에서 실천할 지원',
  '상담 문장 예시',
  '피해야 할 해석',
  '학교와 가정이 함께 관찰할 기준'
];

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

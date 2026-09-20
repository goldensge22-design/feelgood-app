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

function collectKorean(value, output) {
  if (Array.isArray(value)) {
    value.forEach(item => collectKorean(item, output));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach(item => collectKorean(item, output));
    return;
  }
  if (typeof value === 'string' && /[가-힣]/.test(value)) output.add(value.trim());
}

export function profileLocaleSources() {
  const sources = new Set(dynamicHeadings);
  engine.allCombinations().forEach(levels => {
    collectKorean(engine.teacherAnalysis(levels), sources);
    collectKorean(engine.parentAnalysis(levels), sources);
  });
  return [...sources].sort((left, right) => left.localeCompare(right, 'ko'));
}


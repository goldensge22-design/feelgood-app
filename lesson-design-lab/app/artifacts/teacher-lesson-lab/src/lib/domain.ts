import type { Stage } from '@/data/worksheets';
import type { Lesson, Block } from '@/data/lessons';

/* ---------------- Support engine ---------------- */
export const DOMAINS = ['planning', 'attention', 'simultaneous', 'sequential'] as const;
export type Domain = (typeof DOMAINS)[number];
export const DOMAIN_KO: Record<Domain, string> = { planning: '계획', attention: '주의', simultaneous: '동시', sequential: '순차' };
export type Level = 'H' | 'M' | 'L';
export type Levels = Partial<Record<Domain, Level>>;

export interface ReportInfo { verified: boolean; testName: string; version: string; criteria: string; levels: Levels; top5: { title: string; reason: string }[] }

export const reportVerified = (r?: ReportInfo) => !!r && r.verified && !!r.testName.trim() && !!r.version.trim() && !!r.criteria.trim();

const LOW_SUPPORT: Record<Domain, string> = {
  planning: '활동 시작 전 "먼저-다음-마지막" 3칸 계획 카드를 함께 채운다',
  attention: '10분마다 짧은 확인(체크인)과 분량을 나눈 짧은 자료를 제공한다',
  simultaneous: '전체 그림(완성 예시·지도)을 먼저 보여 주고 부분 작업으로 들어간다',
  sequential: '단계 번호가 붙은 안내와 교사 시범 후 한 단계씩 따라 하기를 제공한다',
};
const HIGH_OPTION: Record<Domain, string> = {
  planning: '자기 계획을 스스로 세우고 대안 계획을 하나 더 만드는 선택지',
  attention: '긴 자료를 스스로 요약하고 핵심을 동료에게 설명하는 선택지',
  simultaneous: '여러 자료를 한 장의 비교 지도로 통합하는 확장 과제',
  sequential: '절차를 직접 설계해 다른 학생이 따라 할 안내서로 만드는 확장 과제',
};
export const GENERAL_SUPPORTS = [
  '완성 예시 먼저 보기', '교사 시범 다시 보기', '단계 체크 칸', '짝과 말로 먼저 정리', '짧게 나눈 읽기 자료', '중간 체크인 1회', '확장 과제 선택', '다른 방법으로 다시 해 보기',
];

export interface SupportPlan { verified: boolean; pattern: string | null; supports: string[]; lows: Domain[]; highs: Domain[]; note: string }

export function supportPlan(stage: Stage, report?: ReportInfo): SupportPlan {
  if (!reportVerified(report)) {
    return { verified: false, pattern: null, lows: [], highs: [], supports: GENERAL_SUPPORTS, note: '결과지 검사명·버전·기준이 확인되지 않아 수준을 추정하지 않습니다. 일반 지원 중 교사가 선택합니다.' };
  }
  const lv = report!.levels;
  if (DOMAINS.some((d) => !lv[d])) {
    return { verified: false, pattern: null, lows: [], highs: [], supports: GENERAL_SUPPORTS, note: '4개 영역 수준이 모두 입력되지 않아 빈 값을 추정하지 않습니다.' };
  }
  const pattern = DOMAINS.map((d) => lv[d]).join('');
  const lows = DOMAINS.filter((d) => lv[d] === 'L');
  const highs = DOMAINS.filter((d) => lv[d] === 'H');
  const stageFrame = stage === 'middle' ? '짧은 체험 과제 안에서' : stage === 'high' ? '교과 탐구 과제 안에서' : '업무 산출물 과제 안에서';
  let supports: string[] = [];
  if (pattern === 'HHHH') supports = [`${stageFrame} 독립 수행`, '대안 방법 하나 더 설계', '확장 과제 선택'];
  else if (pattern === 'MMMM') supports = [`${stageFrame} 두 가지 방법 비교 후 선택`, '방법별 결과 기록', '중간 체크인 1회'];
  else if (pattern === 'LLLL') supports = ['짧게 나눈 자료', '교사 시범', '단계별 안내', '자주 짧은 체크인', `${stageFrame} 분량 조정`];
  else {
    // every low domain gets a support (ties preserved, no priority choosing)
    supports = lows.map((d) => LOW_SUPPORT[d]);
    highs.forEach((d) => supports.push(HIGH_OPTION[d]));
    if (!lows.length) supports.push('두 가지 방법 비교 후 선택');
  }
  return { verified: true, pattern, lows, highs, supports, note: '확인된 결과에 따른 제안입니다. 진로 선택을 제한하지 않으며, 의식적 연습 목표는 교사·학생이 1~2개만 고릅니다.' };
}

export function allConditions() {
  const L: Level[] = ['H', 'M', 'L'];
  const out: { stage: Stage; pattern: string; supports: number }[] = [];
  (['middle', 'high', 'university'] as Stage[]).forEach((stage) => {
    L.forEach((a) => L.forEach((b) => L.forEach((c) => L.forEach((d) => {
      const levels: Levels = { planning: a, attention: b, simultaneous: c, sequential: d };
      const p = supportPlan(stage, { verified: true, testName: 'x', version: 'x', criteria: 'x', levels, top5: [] });
      out.push({ stage, pattern: p.pattern!, supports: p.supports.length });
    }))));
  });
  return out;
}

/* ---------------- Time engine ---------------- */
export interface Timed { blocks: (Block & { isBreak?: boolean })[]; instruction: number; breaks: number; total: number; scope: 'short' | 'base' | 'long'; writing: number; writingReduced: boolean }

const MIN_OTHER = 2;
/** Re-times a lesson so instruction + breaks === target exactly. Writing time is preserved unless
 * the target is too short to give every other block MIN_OTHER minutes (then it is reduced and disclosed). */
export function retime(lesson: Lesson, target: number): Timed {
  const base = lesson.blocks.reduce((s, b) => s + b.minutes, 0);
  const baseWriting = lesson.blocks.filter((b) => b.kind === 'writing').reduce((s, b) => s + b.minutes, 0);
  const sessions = target > 60 ? Math.ceil(target / 50) : 1;
  const breaks = sessions > 1 ? (sessions - 1) * 10 : 0;
  const instruction = target - breaks;
  const others = lesson.blocks.filter((b) => b.kind !== 'writing');
  const writers = lesson.blocks.filter((b) => b.kind === 'writing');
  let writing = baseWriting;
  if (instruction - writing < others.length * MIN_OTHER) writing = Math.max(writers.length * MIN_OTHER, instruction - others.length * MIN_OTHER);
  const writingReduced = writing < baseWriting;
  const distribute = (items: Block[], total: number) => {
    const sum = items.reduce((s, b) => s + b.minutes, 0) || 1;
    const spare = total - items.length * MIN_OTHER;
    const raw = items.map((b) => (b.minutes / sum) * spare);
    const out = raw.map((r) => MIN_OTHER + Math.floor(r));
    let rest = total - out.reduce((s, x) => s + x, 0);
    const order = raw.map((r, i) => [r - Math.floor(r), i] as const).sort((x, y) => y[0] - x[0]);
    for (let k = 0; rest > 0; k = (k + 1) % order.length, rest--) out[order[k][1]]++;
    return out;
  };
  const om = distribute(others, instruction - writing);
  const wm = distribute(writers, writing);
  let oi = 0, wi = 0;
  const scaled = lesson.blocks.map((b) => ({ ...b, minutes: b.kind === 'writing' ? wm[wi++] : om[oi++] }));
  let blocks: Timed['blocks'] = scaled;
  if (sessions > 1) {
    const out: Timed['blocks'] = [];
    let t = 0; let n = 1;
    scaled.forEach((b, i) => {
      out.push(b); t += b.minutes;
      if (t >= (instruction / sessions) * n && n < sessions && i < scaled.length - 1) { out.push({ phase: '쉬는 시간', minutes: 10, kind: 'intro', text: '', isBreak: true }); n++; }
    });
    while (n < sessions) { out.splice(out.length - 1, 0, { phase: '쉬는 시간', minutes: 10, kind: 'intro', text: '', isBreak: true }); n++; }
    blocks = out;
  }
  const scope = target < base - 5 ? 'short' : target > base + 15 ? 'long' : 'base';
  const ins = blocks.filter((b) => !b.isBreak).reduce((s, b) => s + b.minutes, 0);
  const brk = blocks.filter((b) => b.isBreak).reduce((s, b) => s + b.minutes, 0);
  return { blocks, instruction: ins, breaks: brk, total: ins + brk, scope, writing: wm.reduce((s, x) => s + x, 0), writingReduced };
}

export const TIMES = [25, 45, 50, 90, 100, 150, 200];

/* ---------------- Majors → families ---------------- */
export const JOB_FAMILIES: Record<string, string[]> = {
  '공항 운영': ['공항 고객 안내', '터미널 운영 지원', '공항 행정'],
  '항공사 서비스': ['고객서비스 기획', '탑승 수속 지원', '다국어 안내'],
  '보안·물류': ['물류 운영 매니저', '화물 기록 관리', '절차 문서화(교육용)'],
  '교육·상담': ['진로 상담 보조', '교육 프로그램 기획'],
  '디자인·콘텐츠': ['UI 디자인', '안내물 디자인', '영상 콘텐츠'],
  '연구·데이터': ['데이터 분석', '식품 연구', '환경 조사'],
  '창업·기획': ['서비스 기획', '소셜벤처 창업', '행사 기획'],
  '돌봄·생명': ['동물 보호', '보건 행정', '수의 간호'],
};
export const MAJOR_FAMILIES: Record<string, string[]> = {
  '항공보안': ['보안·물류', '공항 운영', '항공사 서비스', '교육·상담'],
  '교통물류': ['보안·물류', '공항 운영', '연구·데이터', '창업·기획'],
  '공항행정': ['공항 운영', '항공사 서비스', '창업·기획', '교육·상담'],
  '항공외국어': ['항공사 서비스', '공항 운영', '디자인·콘텐츠', '교육·상담'],
  '경영': ['창업·기획', '연구·데이터', '공항 운영'],
  '미정': Object.keys(JOB_FAMILIES),
};

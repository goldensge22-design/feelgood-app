import type { CardType, Nature, PlannerInput } from '@/lib/provenance';
import { SEED_TEXT } from './synthetic-seed-i18n';

/**
 * Explicit synthetic records for the device-only integration preview.
 * Fictional, Korean original text. Never sent to the server, never labelled
 * as planner or manual. Private notes exist only to prove they are excluded.
 */
export interface SyntheticSeed {
  key: string;
  title: string;
  cardType: CardType;
  nature: Nature;
  selectedJob: string;
  input: PlannerInput;
  privateNote: string;
  strengths: string[];
  practiceAction?: string;
  checkCriterion?: string;
  strengthStrategy?: string;
  supportProvided?: string;
  independentSteps?: string[];
  observedEvidence?: string;
  /** Locale the content is written in, and its revision-suffix template ({n}). */
  locale?: string;
  revSuffix?: string;
}

export const SYNTHETIC_SEEDS: SyntheticSeed[] = [
  {
    key: 'syn-daily-actual',
    title: '[합성] 동아리 출석 앱 불편 신고 정리',
    cardType: 'daily_application',
    nature: 'actual',
    selectedJob: 'IT 서비스기획',
    input: {
      selectedAction: '2주 동안 들어온 불편 신고 23건을 유형별로 나눠 표로 정리하고 운영진에게 공유했다.',
      selectionReason: '같은 불만이 반복되는지 먼저 확인해야 무엇을 고칠지 정할 수 있다고 봤다.',
      changed: '운영진이 출석 알림 시간을 오후 6시에서 9시로 옮겼다.',
      result: '다음 2주 동안 알림 관련 문의가 23건 중 11건에서 4건으로 줄었다.',
      learning: '기능을 더하기 전에 실제 불편의 빈도를 세어 보는 것이 우선이었다.',
    },
    privateNote: '[개인 메모 - 가져오지 않음]',
    strengths: ['계획'],
    practiceAction: '신고 분류 기준 3개를 정하고 직접 분류',
    checkCriterion: '같은 유형이 3건 이상이면 우선 검토',
    strengthStrategy: '계획 강점을 살려 분류 기준을 먼저 세움',
    observedEvidence: '운영진 공지와 이후 2주 문의 기록',
  },
  {
    key: 'syn-scenario-sim',
    title: '[합성] 가상 시나리오: 배달앱 쿠폰 오류 대응 기획',
    cardType: 'job_scenario',
    nature: 'simulation',
    selectedJob: 'IT 서비스기획',
    input: {
      selectedAction: '가상 쿠폰 오류 상황에서 영향 범위를 추정하고 대응 우선순위 표를 만들었다.',
      selectionReason: '서비스기획 직무에서 장애 대응을 어떻게 판단하는지 연습해 보고 싶었다.',
      changed: '처음엔 공지부터 쓰려 했지만 영향 범위 확인을 먼저 하도록 순서를 바꿨다.',
      result: '연습용 우선순위 표 1장과 공지 문안 초안 1개를 만들었다 (실제 서비스에 적용되지 않음).',
      learning: '실제 데이터가 없으면 추정의 한계를 적어 두어야 한다는 것을 알게 됐다.',
    },
    privateNote: '[개인 메모 - 가져오지 않음]',
    strengths: ['계획', '순차'],
    practiceAction: '가상 장애 시나리오 대응 순서 정하기',
    checkCriterion: '영향 범위, 우선순위, 공지 세 가지를 모두 다뤘는가',
    strengthStrategy: '순차처리 강점으로 단계별 체크리스트 작성',
    supportProvided: '시나리오 문제와 체크리스트 양식이 제공됨',
    independentSteps: ['영향 범위 추정', '우선순위 표 작성', '공지 문안 초안'],
    observedEvidence: '연습 결과물(표와 초안) - 실제 성과 아님',
  },
  {
    key: 'syn-missing-data',
    title: '[합성] 가상 시나리오: 마케팅 지표 읽기 연습',
    cardType: 'job_scenario',
    nature: 'simulation',
    selectedJob: '디지털 마케팅',
    input: {
      selectedAction: '가상 광고 지표 표에서 클릭률이 낮은 캠페인을 골라 보았다.',
      selectionReason: '마케팅 직무가 나와 맞는지 탐색해 보고 싶었다.',
      changed: '',
      result: '',
      learning: '',
    },
    privateNote: '[개인 메모 - 가져오지 않음]',
    strengths: [],
    practiceAction: '가상 지표 표 읽기',
  },
];

/** A synthetic "source change": revision 2 alters the result line. */
export function seedInput(seed: SyntheticSeed, revision: number): PlannerInput {
  if (revision <= 1) return seed.input;
  const suffix = (seed.revSuffix ?? '[원본 수정 r{n}]').split('{n}').join(String(revision));
  return { ...seed.input, result: `${seed.input.result} ${suffix}`.trim() };
}

/**
 * Returns the seed with content in the UI locale (Korean source for 'ko' or unknown).
 * Callers copy this ONCE at import time; stored records are never re-localized.
 */
export function localizeSeed(seed: SyntheticSeed, locale: string): SyntheticSeed {
  const L = SEED_TEXT[locale];
  if (!L) return { ...seed, locale: 'ko' };
  const base = { ...seed, locale, revSuffix: L[30], privateNote: L[31] };
  if (seed.key === 'syn-daily-actual') return { ...base, title: L[0], selectedJob: L[1],
    input: { selectedAction: L[2], selectionReason: L[3], changed: L[4], result: L[5], learning: L[6] },
    practiceAction: L[7], checkCriterion: L[8], strengthStrategy: L[9], observedEvidence: L[10] };
  if (seed.key === 'syn-scenario-sim') return { ...base, title: L[11], selectedJob: L[1],
    input: { selectedAction: L[12], selectionReason: L[13], changed: L[14], result: L[15], learning: L[16] },
    practiceAction: L[17], checkCriterion: L[18], strengthStrategy: L[19], supportProvided: L[20], independentSteps: [L[21], L[22], L[23]], observedEvidence: L[24] };
  if (seed.key === 'syn-missing-data') return { ...base, title: L[25], selectedJob: L[26],
    input: { ...seed.input, selectedAction: L[27], selectionReason: L[28] }, practiceAction: L[29] };
  return base;
}

export const findSeed = (key?: string) => SYNTHETIC_SEEDS.find((s) => s.key === key);

import type { CareerExperience } from '@workspace/api-client-react';
import type { ExpMeta, JobConnectionNotes, Nature, StarNotes } from '@/lib/provenance';
import type { LocaleId } from '@/lib/i18n';

export interface StarStoryValues extends StarNotes {
  action: string;
  result: string;
  learning: string;
}

export interface StarCoachPrompt {
  id: string;
  experienceId: string;
  title: string;
  question: string;
  nature: Nature;
  topic: string;
}

type StoryExperience = CareerExperience & Partial<StarNotes>;

const has = (value?: string | null) => !!value?.trim();

/** Keep the existing question flow by default for motivation, values and plans. */
export function prefersExistingQuestionCoach(question: string, _locale?: LocaleId): boolean {
  const patterns: Record<LocaleId, RegExp> = {
    ko: /(지원\s*동기|지원한?\s*이유|왜\s*(?:우리|이\s*회사)|가치관|중요하게\s*생각(?:하는|하나요)|입사\s*후\s*(?:포부|계획|목표)|향후\s*(?:계획|목표)|앞으로\s*계획|미래(?:의)?\s*(?:계획|목표)|5\s*년\s*후)/u,
    en: /(why\s+(?:do\s+you\s+want|join|this company)|motivation|values?|after joining|career plan|future plan|five years|5 years)/iu,
    ja: /(志望動機|応募理由|価値観|入社後|今後の計画|将来の目標|5年後)/u,
    'zh-CN': /(求职动机|申请动机|价值观|入职后|未来计划|五年后|5年后)/u,
    'zh-TW': /(求職動機|應徵動機|價值觀|入職後|未來計畫|五年後|5年後)/u,
    mn: /(ажилд орох шалтгаан|үнэт зүйл|ажилд орсны дараа|ирээдүйн төлөвлөгөө|5 жилийн дараа)/iu,
    th: /(แรงจูงใจ|ค่านิยม|หลังเข้าทำงาน|แผนในอนาคต|อีก\s*5\s*ปี)/u,
    vi: /(động lực ứng tuyển|lý do ứng tuyển|giá trị|sau khi gia nhập|kế hoạch tương lai|5 năm tới)/iu,
    ar: /(الدافع|سبب التقديم|القيم|بعد الانضمام|الخطة المستقبلية|بعد خمس سنوات)/u,
    ru: /(мотивац|почему вы хотите|ценност|после трудоустройства|план на будущее|через пять лет|через 5 лет)/iu,
    km: /(មូលហេតុដាក់ពាក្យ|តម្លៃ|ក្រោយចូលធ្វើការ|ផែនការអនាគត|ប្រាំឆ្នាំ)/u,
    es: /(motivación|por qué quieres|valores|después de incorporarte|plan de futuro|dentro de cinco años|en 5 años)/iu,
    fr: /(motivation|pourquoi souhaitez-vous|valeurs|après votre arrivée|projet d'avenir|dans cinq ans|dans 5 ans)/iu,
    it: /(motivazione|perché vuoi|valori|dopo l'assunzione|piano futuro|tra cinque anni|tra 5 anni)/iu,
    az: /(müraciət səbəbi|motivasiya|dəyərlər|işə başladıqdan sonra|gələcək plan|5 ildən sonra)/iu,
  };
  // Writing language is independent from UI language, so preserve the existing
  // coach if the pasted question matches any supported language.
  return Object.values(patterns).some((pattern) => pattern.test(question));
}

export function starCoachQuestionKey(prompt: StarCoachPrompt): string {
  if (prompt.topic === 'situation') {
    if (prompt.nature === 'simulation') return 'star.coach.situationSimulation';
    if (prompt.nature === 'unconfirmed') return 'star.coach.situationUnknown';
    return 'star.coach.situationActual';
  }
  if (prompt.topic === 'result') return prompt.nature === 'simulation' ? 'star.coach.resultSimulation' : 'star.coach.resultActual';
  if (prompt.topic === 'resultEvidence') return prompt.nature === 'simulation' ? 'star.coach.evidenceSimulation' : 'star.coach.evidenceActual';
  if (prompt.topic === 'jobDuty') return 'joblink.coach.duty';
  if (prompt.topic === 'jobShared') return 'joblink.coach.shared';
  if (prompt.topic === 'jobPrincipleSpecific') return 'joblink.coach.principleSpecific';
  if (prompt.topic === 'jobPrinciple') return 'joblink.coach.principle';
  if (prompt.topic === 'jobFuture') return 'joblink.coach.future';
  if (prompt.topic === 'jobSource') return 'joblink.coach.source';
  const keys: Record<string, string> = {
    roleGoal: 'star.coach.roleGoal', supportProvided: 'star.coach.support', independentSteps: 'star.coach.independent',
    action: 'star.coach.action', selectionReason: 'star.coach.reason', learning: 'star.coach.learning', reflection: 'star.coach.reflection',
  };
  return keys[prompt.topic] ?? 'star.coach.reflection';
}

/** Preset job-link prompts are about the current application, never a model analysis. */
export function jobConnectionPrompts(
  experiences: CareerExperience[],
  metaFor: (experienceId: string) => ExpMeta,
  notesFor: (experienceId: string) => JobConnectionNotes | undefined,
  job: string,
  company: string,
): StarCoachPrompt[] {
  if (!experiences.length || !job.trim()) return [];
  const prompts: StarCoachPrompt[] = [];
  for (const e of experiences) {
    const meta = metaFor(e.id);
    const notes = notesFor(e.id);
    const add = (topic: string, question: string) => prompts.push(promptFor(e, meta, storyValues(e, meta), topic, question));
    if (!notes?.specificDuty.trim()) add('jobDuty', `지원 직무(${job})의 어떤 구체 업무와 관련되나요?`);
    if (!notes || (notes.sourceKind !== 'educational_inference' && !notes.sourceTitle?.trim())) {
      add('jobSource', `회사 ${company || '—'} · 직무 ${job}: 이 업무를 확인한 자료는 무엇인가요?`);
    }
    if (!notes?.sharedAction.trim()) add('jobShared', '내가 한 행동 중 해당 업무와 공통되는 부분은 무엇인가요?');
    const learning = notes?.learnedPrinciple.trim() || e.learning.trim();
    if (!learning) add('jobPrinciple', '무엇을 판단하는 원칙을 배웠나요?');
    else if (/성실|꼼꼼|열심|책임감|diligent|careful|meticulous|responsible|誠実|丁寧|认真|細心|勤勉|努力|саратель|вниматель|аккурат|chăm chỉ|cẩn thận|ละเอียด|ขยัน|مجتهد|دقيق|مجتهد|ការប្រុងប្រយ័ត្ន/iu.test(learning)) {
      add('jobPrincipleSpecific', '성실함이나 꼼꼼함 뒤에 실제로 무엇을 확인하고 어떤 기준으로 판단했나요?');
    }
    if (!notes?.futureApplication.trim()) add('jobFuture', '다음에는 어디에서 어떻게 적용하겠나요?');
  }
  return prompts;
}

/** Existing planner-selected answers take precedence over asking the same thing again. */
export function storyValues(e: CareerExperience, m: ExpMeta): StarStoryValues {
  const upstream = e as StoryExperience;
  return {
    situation: m.star?.situation ?? upstream.situation ?? '',
    roleGoal: m.star?.roleGoal ?? upstream.roleGoal ?? '',
    selectionReason: m.star?.selectionReason ?? m.planner?.selectionReason ?? upstream.selectionReason ?? '',
    resultEvidence: m.star?.resultEvidence ?? m.observedEvidence ?? upstream.resultEvidence ?? '',
    action: e.action || m.planner?.selectedAction || '',
    result: e.result || m.planner?.result || '',
    learning: e.learning || m.planner?.learning || '',
  };
}

function promptFor(
  e: CareerExperience,
  m: ExpMeta,
  values: StarStoryValues,
  topic: string,
  question: string,
): StarCoachPrompt {
  return { id: `${e.id}:${topic}`, experienceId: e.id, title: e.title, question, nature: m.nature, topic };
}

/** Deterministic Korean prompts; no body or capability analysis and no scoring. */
export function starCoachPrompts(
  experiences: CareerExperience[],
  metaFor: (experienceId: string) => ExpMeta,
): StarCoachPrompt[] {
  if (!experiences.length) return [];
  const prompts: StarCoachPrompt[] = [];
  for (const e of experiences) {
    const m = metaFor(e.id);
    const v = storyValues(e, m);
    const simulated = m.nature === 'simulation';
    const neutral = m.nature === 'unconfirmed';
    const add = (topic: string, question: string) => prompts.push(promptFor(e, m, v, topic, question));

    if (!has(v.situation)) add('situation', simulated
      ? '모의 상황에서 어떤 과제가 주어졌나요?'
      : neutral ? '당시 어떤 상황에서 이루어진 경험인가요?' : '당시 어떤 상황이나 불편이 있었나요?');
    if (!has(v.roleGoal)) add('roleGoal', '그때 본인이 맡은 역할과 해결하려던 목표는 무엇이었나요?');
    if (simulated && !m.supportProvided?.trim()) add('supportProvided', '모의 연습에서 어떤 도움이나 안내를 제공받았나요?');
    if (simulated && !m.independentSteps?.length) add('independentSteps', '제공된 도움과 구분해, 스스로 정하거나 선택한 행동은 무엇인가요?');
    if (!has(v.action)) add('action', '본인이 직접 한 구체적인 행동은 무엇이었나요?');
    if (!has(v.selectionReason)) add('selectionReason', '그 행동을 선택한 이유는 무엇이었나요?');
    if (!has(v.result)) add('result', simulated
      ? '모의 연습에서 관찰하거나 판단한 결과는 무엇이었나요?'
      : '관찰하거나 경험한 결과는 무엇이었나요?');
    if (!has(v.resultEvidence)) add('resultEvidence', simulated
      ? '모의 연습에서 어떤 정보나 기준을 근거로 판단했나요?'
      : '그 결과를 어떤 자료나 관찰로 확인했나요?');
    if (!has(v.learning)) add('learning', '이 경험에서 새롭게 알게 된 점은 무엇인가요?');
  }

  if (!prompts.length) {
    const e = experiences[0];
    const m = metaFor(e.id);
    return [promptFor(e, m, storyValues(e, m), 'reflection', '이 경험에서 배운 점이 현재 문항과 어떻게 연결되나요?')];
  }
  return prompts;
}


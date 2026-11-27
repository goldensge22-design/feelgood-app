import { tx } from '@/i18n/tx';
import { now, uid, type AppState } from './store';
import { localizedWorksheet, localizedPlanner } from './material-language';
import { formatDateTime, formatDate, formatNumber, printLines } from '@/i18n/format';
import type {
  MaterialBlock, MaterialPanel, MaterialPage, MaterialBundle, MaterialPrintMode, CardLayout,
  PersonalWorksheet, PlannerActivity,
} from './material-types';

export interface MaterialPrintOptions {
  studentIds: string[]; mode: MaterialPrintMode; layout: CardLayout; includeName?: boolean;
  worksheetIds?: string[]; activityIds?: string[];
}
// Conservative line budgets leave room for readable type, link/version headers, footers and handwriting.
// We paginate content rather than truncate or hide overflow. Actual-browser PDF verification remains necessary.
const wrap = (text: string, columns = 45) => printLines(text,columns).length;
const cost = (b: MaterialBlock) => (b.label ? 2 : 0) + (b.text ? wrap(b.text) : 0) + (b.writingLines ?? 0) + 1;
function paginate(blocks: MaterialBlock[], budget: number): MaterialBlock[][] {
  const small: MaterialBlock[] = [];
  for (const b of blocks) {
    if (cost(b) <= budget) { small.push({ ...b }); continue; }
    if (!b.text.length) {
      let lines = b.writingLines ?? 0;
      while (lines > 0) { const n = Math.min(lines, budget - 4); small.push({ ...b, writingLines: n }); lines -= n; }
      continue;
    }
    const lines = b.text.split('\n').flatMap((line) => {
      return printLines(line,45);
    });
    const count = budget - 5;
    for (let i = 0; i < lines.length; i += count) small.push({ label: i ? `${b.label} ↳` : b.label, text: lines.slice(i, i + count).join('\n') });
    if (b.writingLines) small.push({ label: b.label, text: '', writingLines: b.writingLines });
  }
  const pages: MaterialBlock[][] = [];
  let page: MaterialBlock[] = []; let used = 0;
  for (const b of small) {
    if (page.length && used + cost(b) > budget) { pages.push(page); page = []; used = 0; }
    page.push(b); used += cost(b);
  }
  if (page.length) pages.push(page);
  return pages;
}
function worksheetBlocks(w: PersonalWorksheet, lang: string): MaterialBlock[] {
  const tr = (s: string) => tx(lang, s);
  const f = w.fields;
  return [
    { label: tr('학습 목표'), text: f.goal },
    { label: tr('관심 분야·직무'), text: f.job },
    { label: f.readingTitle || tr('읽을 자료'), text: f.reading },
    ...f.questions.map((text, i) => ({ label: `${tr('질문')} ${i + 1}`, text, writingLines: 2 })),
    ...f.actions.map((text, i) => ({ label: `${tr('수행 과제')} ${i + 1}`, text })),
    { label: tr('필요한 도움'), text: f.help.join('\n') },
    { label: tr('제출물'), text: f.deliverable },
    { label: tr('제출 기준'), text: f.criterion },
    { label: tr('답안·산출물 작성'), text: f.answer, writingLines: 6 },
  ];
}
function plannerBlocks(a: PlannerActivity, lang: string): MaterialBlock[] {
  const tr = (s: string) => tx(lang, s);
  const f = a.fields; const r = a.record;
  const field = (label: string, text: string, lines = 0) => ({ label: tr(label), text, writingLines: text ? 0 : lines });
  return [
    field('활동 목표', f.goal), field('선택 이유', f.reason, 1), field('관심 분야·직무', f.job),
    field('날짜·예상 시간·범위', `${f.date ? formatDate(f.date,lang) : '________'} · ${formatNumber(f.minutes,lang)} ${tr('분')}\n${f.scope}`),
    field('첫 행동', f.firstAction), field('진행 순서', f.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')),
    field('도움 방식', f.help.join('\n')), field('완료 기준', f.criterion),
    field('수행 기록 상태', tr(r.state === 'performed' ? '확인된 실제 수행' : r.state === 'in-progress' ? '진행 중' : '계획 · 수행 확인 전')),
    field('실제 한 일', r.actual, 2), field('변경한 방법', r.changedMethod, 1),
    field('결과물', r.artifact, 1), field('피드백', r.feedback, 1),
    field('다음 행동', r.nextAction || f.nextAction, 1),
  ];
}
export function buildMaterialBundle(state: AppState, options: MaterialPrintOptions): MaterialBundle {
  const ids = options.studentIds;
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error('출력할 학생을 중복 없이 선택하세요.');
  const selected = state.students.filter((s) => ids.includes(s.id));
  if (selected.length !== ids.length) throw new Error('선택 학생을 명단에서 확인하세요.');
  if (!['worksheets', 'cards', 'both'].includes(options.mode) || !['A4', 'A5x2'].includes(options.layout)) throw new Error('출력 종류와 용지 배치를 확인하세요.');
  const selectedWorksheets = state.personalWorksheets.filter((w) => !w.archived && ids.includes(w.studentId) && (!options.worksheetIds || options.worksheetIds.includes(w.id))).map(w=>localizedWorksheet(state,w));
  const selectedActivities = state.plannerActivities.filter((a) => !a.archived && ids.includes(a.studentId) && (!options.activityIds || options.activityIds.includes(a.id))).map(a=>localizedPlanner(state,a));
  const needWorksheets = options.mode !== 'cards'; const needCards = options.mode !== 'worksheets';
  if (options.worksheetIds?.some((id) => !selectedWorksheets.some((w) => w.id === id)) || options.activityIds?.some((id) => !selectedActivities.some((a) => a.id === id))) throw new Error('출력 선택에 다른 학생의 자료 또는 없는 자료가 포함되어 있습니다.');
  const worksheets = needWorksheets ? selectedWorksheets : [];
  const activities = needCards ? selectedActivities : [];
  for (const student of selected) {
    if (needWorksheets && !worksheets.some((w) => w.studentId === student.id)) throw new Error('선택 학생 중 개인 활동지가 없는 학생이 있습니다.');
    if (needCards && !activities.some((a) => a.studentId === student.id)) throw new Error('선택 학생 중 플래너 활동카드가 없는 학생이 있습니다.');
  }
  if (worksheets.some((w) => w.status !== 'confirmed') || activities.some((a) => a.status !== 'confirmed')) throw new Error('선택한 모든 자료를 교사가 확인·확정한 뒤 출력하세요.');
  const pages: MaterialPage[] = [];
  for (const student of selected) {
    const personal: MaterialPage[] = [];
    const panel = (type: MaterialPanel['type'], doc: PersonalWorksheet | PlannerActivity, blocks: MaterialBlock[], links: string[], budget: number): MaterialPanel[] => {
      const parts = paginate(blocks, budget);
      return parts.map((blocks, i) => ({
        type, documentId: doc.id, studentId: student.id, code: student.code,
        ...(options.includeName && student.displayName ? { name: student.displayName } : {}),
        title: doc.fields.title, links: [...links, `${tx(state.lang, '수정 시각')}: ${formatDateTime(doc.versions.at(-1)!.at,state.lang)}`], version: doc.versions.at(-1)!.version,
        segment: i + 1, segments: parts.length, blocks,
      }));
    };
    for (const w of worksheets.filter((w) => w.studentId === student.id)) {
      const links = state.plannerActivities.filter((a) => !a.archived && a.studentId === student.id && a.worksheetIds.includes(w.id)).map((a) => `${a.id} · v${a.versions.at(-1)!.version}`);
      for (const p of panel('worksheet', w, worksheetBlocks(w, state.lang), links, 44)) personal.push({
        studentId: student.id, code: student.code, layout: 'worksheet', panels: [p], studentPage: 0, studentPages: 0, globalPage: 0,
      });
    }
    const cardPanels: MaterialPanel[] = [];
    for (const a of activities.filter((a) => a.studentId === student.id)) {
      const links = a.worksheetIds.map((id) => {
        const w = state.personalWorksheets.find((w) => w.id === id);
        if (!w || w.studentId !== student.id) throw new Error('활동카드의 개인 활동지 연결을 확인하세요.');
        return `${w.id} · v${w.versions.at(-1)!.version}`;
      });
      cardPanels.push(...panel('card', a, plannerBlocks(a, state.lang), links, options.layout === 'A4' ? 44 : 21));
    }
    const perPage = options.layout === 'A4' ? 1 : 2;
    for (let i = 0; i < cardPanels.length; i += perPage) personal.push({
      studentId: student.id, code: student.code, layout: options.layout, panels: cardPanels.slice(i, i + perPage),
      studentPage: 0, studentPages: 0, globalPage: 0,
    });
    personal.forEach((p, i) => { p.studentPage = i + 1; p.studentPages = personal.length; p.globalPage = pages.length + i + 1; p.language=state.lang; });
    pages.push(...personal);
  }
  return structuredClone({
    id: uid('material-print'), at: now(), mode: options.mode, layout: options.layout,
    studentIds: selected.map((s) => s.id), pages,
    counts: {
      students: selected.length, worksheets: worksheets.length, cards: activities.length,
      outputs: worksheets.length + activities.length, sheets: pages.length, panels: pages.reduce((sum, p) => sum + p.panels.length, 0),
    },
    state: 'prepared', printRequests: [], language: state.lang,
  });
}

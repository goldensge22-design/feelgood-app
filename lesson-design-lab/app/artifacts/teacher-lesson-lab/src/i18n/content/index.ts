/**
 * CONTENT TRANSLATION CONTRACT
 * Generated packs: src/i18n/content/generated/<lang>.json (owned by main agent; do not edit here).
 * { lang, reviewed:false, worksheets:{ M01:{title,goal,readingTitle,reading,actions[],supports[],deliverable,criterion} },
 *   lessons:{ ML1:{title,goal,preparation[],reportItems[],labContent,teacherDemo,studentActions[],blocks:[{phase,text}],
 *   questions[],observations[],deliverable,nextAction,scopeByTime:{short,base,long}} } }
 * Missing fields fall back to the Korean original and the UI shows "한국어 원문 · 번역 대기".
 * User-authored text is never translated.
 */
import type { Worksheet } from '@/data/worksheets';
import type { Lesson } from '@/data/lessons';

export interface WSText { title?: string; goal?: string; readingTitle?: string; reading?: string; actions?: string[]; supports?: string[]; deliverable?: string; criterion?: string }
export interface LessonText {
  title?: string; goal?: string; preparation?: string[]; reportItems?: string[]; labContent?: string; teacherDemo?: string;
  studentActions?: string[]; blocks?: { phase?: string; text?: string }[]; questions?: string[]; observations?: string[];
  deliverable?: string; nextAction?: string; scopeByTime?: { short?: string; base?: string; long?: string };
}
export interface ContentPack { lang: string; reviewed: boolean; worksheets: Record<string, WSText>; lessons: Record<string, LessonText> }

const mods = import.meta.glob('./generated/*.json', { eager: true, import: 'default' }) as Record<string, ContentPack>;
export const PACKS: Record<string, ContentPack> = {};
Object.entries(mods).forEach(([path, p]) => {
  const code = p?.lang ?? path.split('/').pop()!.replace('.json', '');
  if (p && typeof p === 'object') PACKS[code] = { lang: code, reviewed: !!p.reviewed, worksheets: p.worksheets ?? {}, lessons: p.lessons ?? {} };
});

const arr = (tx: string[] | undefined, src: string[]) => (Array.isArray(tx) && tx.length === src.length ? tx : src);

export function locWorksheet(lang: string, w: Worksheet) {
  const p = lang === 'ko' ? undefined : PACKS[lang];
  const t = p?.worksheets[w.id];
  const translated = lang === 'ko' || (!!t?.title && !!t?.goal && !!t?.reading && Array.isArray(t?.actions));
  if (!t) return { w, translated, reviewed: lang === 'ko' || !!p?.reviewed };
  return {
    w: { ...w, title: t.title ?? w.title, goal: t.goal ?? w.goal, readingTitle: t.readingTitle ?? w.readingTitle, reading: t.reading ?? w.reading, actions: arr(t.actions, w.actions), supports: arr(t.supports, w.supports), deliverable: t.deliverable ?? w.deliverable, criterion: t.criterion ?? w.criterion },
    translated, reviewed: !!p?.reviewed,
  };
}

export function locLesson(lang: string, l: Lesson) {
  const p = lang === 'ko' ? undefined : PACKS[lang];
  const t = p?.lessons[l.id];
  const translated = lang === 'ko' || (!!t?.title && !!t?.goal && !!t?.teacherDemo && Array.isArray(t?.blocks));
  if (!t) return { l, translated, reviewed: lang === 'ko' || !!p?.reviewed };
  return {
    l: {
      ...l, title: t.title ?? l.title, goal: t.goal ?? l.goal, preparation: arr(t.preparation, l.preparation), reportItems: arr(t.reportItems, l.reportItems),
      labContent: t.labContent ?? l.labContent, teacherDemo: t.teacherDemo ?? l.teacherDemo, studentActions: arr(t.studentActions, l.studentActions),
      blocks: l.blocks.map((b, i) => ({ ...b, phase: t.blocks?.[i]?.phase ?? b.phase, text: t.blocks?.[i]?.text ?? b.text })),
      questions: arr(t.questions, l.questions), observations: arr(t.observations, l.observations), deliverable: t.deliverable ?? l.deliverable, nextAction: t.nextAction ?? l.nextAction,
      scopeByTime: { short: t.scopeByTime?.short ?? l.scopeByTime.short, base: t.scopeByTime?.base ?? l.scopeByTime.base, long: t.scopeByTime?.long ?? l.scopeByTime.long },
    },
    translated, reviewed: !!p?.reviewed,
  };
}

/** legacy helpers used by list pages */
export function wsText(lang: string, id: string) {
  const p = PACKS[lang]; const tx = p?.worksheets[id];
  return { text: (lang === 'ko' ? {} : tx ?? {}) as WSText, translated: lang === 'ko' || (!!tx?.title && !!tx?.goal && !!tx?.reading), reviewed: lang === 'ko' || !!p?.reviewed };
}
export function lessonText(lang: string, id: string) {
  const p = PACKS[lang]; const tx = p?.lessons[id];
  return { text: (lang === 'ko' ? {} : tx ?? {}) as LessonText, translated: lang === 'ko' || (!!tx?.title && !!tx?.goal) };
}
export function coverage(lang: string) {
  if (lang === 'ko') return { ws: 36, lessons: 18, reviewed: true };
  const p = PACKS[lang];
  return {
    ws: p ? Object.values(p.worksheets).filter((w) => w.title && w.goal && w.reading && w.actions?.length).length : 0,
    lessons: p ? Object.values(p.lessons).filter((l) => l.title && l.goal && l.teacherDemo && l.blocks?.length).length : 0,
    reviewed: !!p?.reviewed,
  };
}

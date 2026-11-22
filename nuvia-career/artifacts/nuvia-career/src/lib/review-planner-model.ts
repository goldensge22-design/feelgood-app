import type { CareerExperience } from '@workspace/api-client-react';
import { REVIEW_OPTIONS } from './review-demo-fixture';
import { REVIEW_ROLES, matchOf, matchKey, validEverydayPlan, type EverydayAttachment } from './review-everyday-model';
import { isDailyAttachment, validDailyDate, type DailyAttachment } from './review-daily-model';

export type ReviewPlan = { goal: string; scenario: string; action: string; criterion: string; when: string };
export type ReviewNote = { action: string; result: string; learning: string; next: string };
export type ReviewCardStatus = 'planned' | 'active' | 'paused' | 'completed';
export type ReviewNewDraft = { id: string; plan: ReviewPlan };
export type ReviewCard = ReviewNewDraft & {
  option: string;
  status: ReviewCardStatus;
  revision: number;
  note: ReviewNote | null;
  approvedRevision?: number;
  everyday?: EverydayAttachment;
  daily?: DailyAttachment;
  kind?:'free';
};
export type ReviewPlannerBook = {
  cards: Record<string, ReviewCard>;
  drafts: Record<string, ReviewNewDraft>;
  planEdits: Record<string, ReviewPlan>;
  noteEdits: Record<string, ReviewNote>;
};

export const REVIEW_CARD_ID = /^review-card-[a-f0-9-]{36}$/;
export const emptyReviewPlan = (): ReviewPlan => ({ goal: '', scenario: '', action: '', criterion: '', when: '' });
export const emptyReviewNote = (): ReviewNote => ({ action: '', result: '', learning: '', next: '' });
export const cardActivity = (card:ReviewCard) => card.daily ?? card.everyday;
export const newReviewBook = (): ReviewPlannerBook => ({ cards: {}, drafts: {}, planEdits: {}, noteEdits: {} });
export const isReviewOption = (id: string) => REVIEW_OPTIONS.some((o) => o.id === id);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fields = (value: unknown, keys: string[], max: number): boolean =>
  !!value && typeof value === 'object' && keys.every((k) => typeof (value as Record<string, unknown>)[k] === 'string' && ((value as Record<string, string>)[k]).length <= max);
const planFields = Object.keys(emptyReviewPlan());
const noteFields = Object.keys(emptyReviewNote());
export const isReviewPlan = (p: unknown): p is ReviewPlan => fields(p, planFields, 500);
export const isReviewNote = (n: unknown): n is ReviewNote => fields(n, noteFields, 3000);
export const validReviewPlan = (p: ReviewPlan) => isReviewPlan(p) && planFields.every((k) => p[k as keyof ReviewPlan].trim()) &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(p.when) && Number.isFinite(Date.parse(p.when));
function validEverydayAttachment(a: EverydayAttachment | undefined) {
  if (a === undefined) return true;
  const m = a?.match && matchOf(a.match);
  return !!m && matchKey(m) === matchKey(a.match) && !!a.activity &&
    fields(a.activity, ['id','goal','scene','materials','linkReason','supportReason'], 1500) &&
    Array.isArray(a.activity.steps) && a.activity.steps.every((s) => typeof s === 'string' && s.length <= 500) &&
    validEverydayPlan(a.activity) && fields(a.worksheet, ['before','observation','reflection','date'],3000);
}
const statuses: ReviewCardStatus[] = ['planned', 'active', 'paused', 'completed'];

export function isReviewBook(x: unknown): x is ReviewPlannerBook {
  if (!x || typeof x !== 'object') return false;
  const b = x as ReviewPlannerBook;
  if (!['cards', 'drafts', 'planEdits', 'noteEdits'].every((k) => {
    const map = b[k as keyof ReviewPlannerBook];
    return !!map && typeof map === 'object' && !Array.isArray(map);
  })) return false;
  return Object.entries(b.cards).every(([id, c]) => !!c && id === c.id && REVIEW_CARD_ID.test(id) &&
    (isReviewOption(c.option) || c.kind==='free' && c.option==='free' || c.option==='daily' && !!c.daily ||
      c.everyday?.match?.role===c.option && REVIEW_ROLES.some(role=>role.id===c.option)) && validReviewPlan(c.plan) && statuses.includes(c.status) &&
    Number.isSafeInteger(c.revision) && c.revision >= 1 && validEverydayAttachment(c.everyday) && (!c.daily || validDailyRecord(c.daily)) &&
    (c.approvedRevision === undefined || (Number.isSafeInteger(c.approvedRevision) && c.approvedRevision >= 1 && c.approvedRevision <= c.revision && c.note !== null)) &&
    (c.note === null || (isReviewNote(c.note) && !!c.note.action.trim()))) &&
    Object.entries(b.drafts).every(([option, d]) => isReviewOption(option) && !!d && REVIEW_CARD_ID.test(d.id) && isReviewPlan(d.plan)) &&
    Object.entries(b.planEdits).every(([id, plan]) => !!b.cards[id] && isReviewPlan(plan)) &&
    Object.entries(b.noteEdits).every(([id, note]) => !!b.cards[id] && isReviewNote(note));
}
function validDailyRecord(a:DailyAttachment) {
  return isDailyAttachment(a) && fields(a.activity,['id','goal','scene','materials','linkReason','supportReason'],1500) &&
    Array.isArray(a.activity.steps) && a.activity.steps.every(s=>typeof s==='string' && s.length<=500) && validEverydayPlan(a.activity) &&
    fields(a.worksheet,['before','observation','reflection','date'],3000) && validDailyDate(a.worksheet.date);
}
export function registerDailyCard(book: ReviewPlannerBook,id:string, daily:DailyAttachment):ReviewPlannerBook|null {
  if(!REVIEW_CARD_ID.test(id) || !validDailyRecord(daily)) return null;
  if(book.cards[id]) return same(book.cards[id].daily,daily)?book:null;
  const plan={goal:daily.activity.goal,scenario:daily.activity.scene,action:daily.activity.steps[1],criterion:daily.activity.question ?? daily.activity.steps[2],when:`${daily.worksheet.date}T09:00`};
  if(!validReviewPlan(plan))return null;
  return {...book,cards:{...book.cards,[id]:{id,option:'daily',plan,note:null,status:'planned',revision:1,daily}}};
}

export function createFreeReviewCard(book:ReviewPlannerBook,id:string,date:string):ReviewPlannerBook|null {
  if(!REVIEW_CARD_ID.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date))return null;
  if(book.cards[id]) return book.cards[id].kind==='free'?book:null;
  const plan={goal:'직접 적은 일상 기록',scenario:'나의 일상',action:'내가 기록한 일상',criterion:'내 말로 짧게 남기기',when:`${date}T09:00`};
  if(!validReviewPlan(plan))return null;
  const card:ReviewCard={id,plan,option:'free',kind:'free',status:'planned',revision:1,note:null};
  return {...book,cards:{...book.cards,[id]:card}};
}

export function registerEverydayCard(book: ReviewPlannerBook, id:string, attachment: EverydayAttachment): ReviewPlannerBook | null {
  if (!REVIEW_CARD_ID.test(id) || !validEverydayAttachment(attachment)) return null;
  if (book.cards[id]) return same(book.cards[id].everyday,attachment) ? book : null;
  const { activity, worksheet, match } = attachment;
  const plan: ReviewPlan = {
    goal:activity.goal, scenario:activity.scene, action:activity.steps[1] ?? activity.steps[0],
    criterion:activity.kind==='thought'?'내 선택과 이유를 짧게 적기':'내가 실제로 한 행동을 짧게 적기', when:`${worksheet.date}T09:00`,
  };
  if (!validReviewPlan(plan)) return null;
  const card: ReviewCard = {id,option:match.role,plan,status:'planned',revision:1,note:null,everyday:attachment};
  return {...book,cards:{...book.cards,[id]:card}};
}

export function addCardFromPreview(book: ReviewPlannerBook, option: string, expected: ReviewNewDraft): ReviewPlannerBook | null {
  if (!isReviewOption(option) || !REVIEW_CARD_ID.test(expected.id) || !validReviewPlan(expected.plan)) return null;
  const existing = book.cards[expected.id];
  if (existing) return existing.option === option && same(existing.plan, expected.plan) ? book : null;
  if (!same(book.drafts[option], expected)) return null;
  const drafts = { ...book.drafts }; delete drafts[option];
  const card: ReviewCard = { ...expected, option, status: 'planned', revision: 1, note: null };
  return { ...book, drafts, cards: { ...book.cards, [card.id]: card } };
}

export function applyCardPlan(book: ReviewPlannerBook, id: string): ReviewPlannerBook | null {
  const card = book.cards[id], plan = book.planEdits[id];
  if (!card || !plan || !validReviewPlan(plan)) return null;
  const planEdits = { ...book.planEdits }; delete planEdits[id];
  return { ...book, planEdits, cards: { ...book.cards, [id]: same(card.plan, plan) ? card : { ...card, plan, revision: card.revision + 1 } } };
}

export function applyCardNote(book: ReviewPlannerBook, id: string): ReviewPlannerBook | null {
  const card = book.cards[id], note = book.noteEdits[id];
  if (!card || !isReviewNote(note) || !note.action.trim()) return null;
  const noteEdits = { ...book.noteEdits }; delete noteEdits[id];
  const status = card.status === 'completed' && cardActivity(card)?.activity.kind!=='thought' && !note.result.trim() && !note.learning.trim() ? 'active' : card.status;
  return { ...book, noteEdits, cards: { ...book.cards, [id]: same(card.note, note) ? card : { ...card, note, status, revision: card.revision + 1 } } };
}

export function applyCardStatus(book: ReviewPlannerBook, id: string, status: ReviewCardStatus): ReviewPlannerBook | null {
  const card = book.cards[id];
  if (!card || !statuses.includes(status)) return null;
  if (status === 'completed' && (!card.note?.action.trim() || !(cardActivity(card)?.activity.kind==='thought' || card.note.result.trim() || card.note.learning.trim()))) return null;
  return card.status === status ? book : { ...book, cards: { ...book.cards, [id]: { ...card, status } } };
}

export function approveCardRevision(book: ReviewPlannerBook, id: string, revision: number): ReviewPlannerBook | null {
  const card = book.cards[id];
  if (!card || !card.note?.action.trim() || card.revision !== revision || book.planEdits[id] || book.noteEdits[id]) return null;
  return card.approvedRevision === revision ? book :
    { ...book, cards: { ...book.cards, [id]: { ...card, approvedRevision: revision } } };
}

/** Result/learning are the user's recorded values only. Plan, next and status are not evidence. */
export function reviewCardExperience(card: ReviewCard): CareerExperience | null {
  if (card.approvedRevision === undefined || !card.note) return null;
  return {
    id: card.id, title: card.plan.goal, action: card.note.action, result: card.note.result,
    learning: card.note.learning, source: 'example', sourceVersion: `review-card-v${card.revision}`,
    strengths: [], criterionIds: [], confirmed: card.approvedRevision === card.revision,
  };
}

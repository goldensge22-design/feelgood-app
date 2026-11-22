import { useSyncExternalStore } from 'react';
import { clientStorage } from './public-demo';
import {
  addCardFromPreview, applyCardNote, applyCardPlan, applyCardStatus, approveCardRevision, createFreeReviewCard, emptyReviewNote,
  emptyReviewPlan, isReviewBook, isReviewNote, isReviewOption, isReviewPlan, newReviewBook, registerEverydayCard, registerDailyCard,
  type ReviewCardStatus, type ReviewNewDraft, type ReviewNote, type ReviewPlan, type ReviewPlannerBook,
} from './review-planner-model';
import type { EverydayAttachment } from './review-everyday-model';
import type { DailyAttachment } from './review-daily-model';

export type { ReviewCard, ReviewCardStatus, ReviewNewDraft, ReviewNote, ReviewPlan, ReviewPlannerBook } from './review-planner-model';
export { emptyReviewNote, emptyReviewPlan, validReviewPlan } from './review-planner-model';

const KEY = 'review:planner:v1';
type Snapshot = { book: ReviewPlannerBook; error: 'read' | 'write' | null };
let snapshot: Snapshot | undefined;
const listeners = new Set<() => void>();
function read(): Snapshot {
  try {
    const { storage, key } = clientStorage(KEY);
    const raw = storage.getItem(key);
    if (raw === null) return { book: newReviewBook(), error: null };
    const book: unknown = JSON.parse(raw);
    if (!isReviewBook(book)) throw new Error('INVALID_REVIEW_PLANNER');
    return { book, error: null };
  } catch { return { book: newReviewBook(), error: 'read' }; }
}
const current = () => (snapshot ??= read());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((fn) => fn());
}
function write(book: ReviewPlannerBook, preserveInMemory: boolean) {
  const prior = current();
  if (prior.error === 'read') return false;
  try {
    const { storage, key } = clientStorage(KEY);
    storage.setItem(key, JSON.stringify(book));
    publish({ book, error: null });
    return true;
  } catch {
    publish({ book: preserveInMemory ? book : prior.book, error: 'write' });
    return false;
  }
}
export function useReviewPlanner() {
  return useSyncExternalStore(subscribe, current);
}
export const getReviewPlannerSnapshot = current;
export function retryReviewPlanner() {
  const prior = current();
  if (prior.error === 'read') { const next = read(); publish(next); return next.error === null; }
  return write(prior.book, true);
}
export function saveNewReviewDraft(option: string, patch: Partial<ReviewPlan>) {
  if (!isReviewOption(option)) return false;
  const book = current().book;
  const old = book.drafts[option];
  const draft = { id: old?.id ?? `review-card-${crypto.randomUUID()}`, plan: { ...(old?.plan ?? emptyReviewPlan()), ...patch } };
  if (!isReviewPlan(draft.plan)) return false;
  return write({ ...book, drafts: { ...book.drafts, [option]: draft } }, true);
}
export function addReviewCard(option: string, expected: ReviewNewDraft) {
  const next = addCardFromPreview(current().book, option, expected);
  return next && write(next, false) ? expected.id : null;
}
export function saveReviewPlanDraft(id: string, patch: Partial<ReviewPlan>) {
  const book = current().book, card = book.cards[id];
  if (!card) return false;
  const plan = { ...(book.planEdits[id] ?? card.plan), ...patch };
  if (!isReviewPlan(plan)) return false;
  const planEdits = { ...book.planEdits, [id]: plan };
  if (JSON.stringify(plan) === JSON.stringify(card.plan)) delete planEdits[id];
  return write({ ...book, planEdits }, true);
}
export function saveReviewNoteDraft(id: string, patch: Partial<ReviewNote>) {
  const book = current().book, card = book.cards[id];
  if (!card) return false;
  const note = { ...(book.noteEdits[id] ?? card.note ?? emptyReviewNote()), ...patch };
  if (!isReviewNote(note)) return false;
  const noteEdits = { ...book.noteEdits, [id]: note };
  if (JSON.stringify(note) === JSON.stringify(card.note ?? emptyReviewNote())) delete noteEdits[id];
  return write({ ...book, noteEdits }, true);
}
function commit(book: ReviewPlannerBook | null) { return !!book && write(book, false); }
export const commitReviewPlan = (id: string) => commit(applyCardPlan(current().book, id));
export const commitReviewNote = (id: string) => commit(applyCardNote(current().book, id));
export const setReviewStatus = (id: string, status: ReviewCardStatus) => commit(applyCardStatus(current().book, id, status));
export const addEverydayCard = (id: string, attachment: EverydayAttachment) => commit(registerEverydayCard(current().book,id,attachment));
export const addDailyCard = (id:string, attachment:DailyAttachment) => commit(registerDailyCard(current().book,id,attachment));
export const addFreeReviewCard = (id:string,date:string) => commit(createFreeReviewCard(current().book,id,date));
export function approveReviewCard(id: string, revision: number) {
  const next = approveCardRevision(current().book, id, revision);
  return next && write(next, false) ? next.cards[id] : null;
}
export function approveReviewCards(sources:{id:string;revision:number}[]) {
  let next:ReviewPlannerBook|null=current().book;
  for (const source of sources) {
    next=next && approveCardRevision(next,source.id,source.revision);
    if (!next) return false;
  }
  return write(next,false);
}

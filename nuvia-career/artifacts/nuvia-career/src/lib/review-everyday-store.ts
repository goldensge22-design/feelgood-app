import { useSyncExternalStore } from 'react';
import { clientStorage } from './public-demo';
import { createDailyDraft, validDailyDate, type DailyContext, type DailyKind, type DailyTranslate } from './review-daily-model';
import {
  contextOf, dailyDate, generateEverydayPlans, initialChoice, matchKey, matchOf,
  emptyStoryThoughts, type EverydayDraftSections, type EverydayPlan, type EverydayPreview, type EverydayState, type ReviewChoice, type WorksheetNotes, type StoryThoughts,
} from './review-everyday-model';

const KEY = 'review:everyday:v1';
type Snapshot = { value: EverydayState; error: 'read'|'write'|null };
const empty = (): EverydayState => ({ choice: initialChoice, version: 1, confirmedVersion: null, drafts: {}, cursor: {}, previews: {}, originals: {} });
let state: Snapshot | undefined;
const listeners = new Set<()=>void>();
function read(): Snapshot {
  try {
    const {storage,key} = clientStorage(KEY);
    const raw = storage.getItem(key);
    if (!raw) return {value: empty(),error:null};
    const value = JSON.parse(raw) as EverydayState;
    if (!contextOf(value.choice) || !Number.isSafeInteger(value.version) ||
      ![value.drafts,value.cursor,value.previews,value.originals].every(x => x && typeof x === 'object' && !Array.isArray(x))) throw Error();
    return {value,error:null};
  } catch { return {value:empty(),error:'read'}; }
}
const get = () => state ??= read();
export const getEveryday = get;
function publish(next: Snapshot) { state = next; listeners.forEach((f)=>f()); }
function subscribe(f:()=>void) { listeners.add(f); return () => {listeners.delete(f);}; }
export function writeEveryday(value: EverydayState, keepDraft = false) {
  const old = get();
  if (old.error === 'read') return false;
  try {
    const {storage,key} = clientStorage(KEY);
    storage.setItem(key, JSON.stringify(value));
    publish({value,error:null});
    return true;
  } catch {
    publish({value: keepDraft ? value : old.value,error:'write'});
    return false;
  }
}
export function useEveryday() { return useSyncExternalStore(subscribe,get); }
export function recommendDaily(date: string, context: DailyContext, t: DailyTranslate, extra?: DailyKind) {
  if (!validDailyDate(date) || get().error) return false;
  const old = get().value;
  const drafts = {...old.dailyDrafts};
  const onDate = Object.values(drafts).filter(d=>d.worksheet.date===date);
  const kinds: DailyKind[] = extra ? [extra] : ['cognitive','job'];
  for (const kind of kinds) {
    const count = onDate.filter(d=>d.category===kind).length;
    if (count && !extra) continue;
    const id = `review-card-${crypto.randomUUID()}`;
    let draft = createDailyDraft(id,date,kind,context,count,t);
    if (!extra && Object.values(drafts).some(d=>d.worksheet.date===date && d.activity.id===draft.activity.id)) {
      draft = createDailyDraft(id,date,kind,context,count+1,t);
    }
    drafts[id] = draft;
  }
  return writeEveryday({...old,dailyDrafts:drafts,dailySelectedDate:date});
}
export function selectDailyDate(date: string) {
  return validDailyDate(date) && writeEveryday({...get().value,dailySelectedDate:date},true);
}
export function editDailyWorksheet(id: string, before: string) {
  const old = get().value;
  const draft = old.dailyDrafts?.[id];
  if (!draft || before.length>3000) return false;
  return writeEveryday({...old,dailyDrafts:{...old.dailyDrafts,[id]:{...draft,worksheet:{...draft.worksheet,before}}}}, true);
}
export function retryEveryday() {
  if (get().error === 'read') { publish(read()); return !get().error; }
  return writeEveryday(get().value,true);
}
export function changeEverydayChoice(patch: Partial<ReviewChoice>) {
  const s = get().value, choice = {...s.choice,...patch};
  if (!contextOf(choice)) return false;
  if (JSON.stringify(s.choice) === JSON.stringify(choice)) return !get().error;
  return writeEveryday({...s,choice,version:s.version+1,confirmedVersion:null},true);
}
export function confirmEverydayChoice() {
  const s = get().value;
  return writeEveryday({...s,confirmedVersion:s.version});
}
export function everydayKey(s: EverydayState) { const m = matchOf(s.choice); return m ? matchKey(m) : ''; }
export function beginEverydayDraft() {
  const s = get().value, ctx = contextOf(s.choice), key = everydayKey(s);
  if (!ctx?.focus || s.confirmedVersion !== s.version) return false;
  if (s.drafts[key] && !s.drafts[key].registeredId) return true;
  const draft = {
    id: `review-card-${crypto.randomUUID()}`, options:generateEverydayPlans(ctx.need,ctx.trait,ctx.focus), selected:null,
    phase:'candidates' as const, worksheet:{before:'',observation:'',reflection:'',date:dailyDate()},
  };
  return writeEveryday({...s,drafts:{...s.drafts,[key]:draft}});
}
export function chooseEverydayPlan(id: string) {
  const s = get().value, key = everydayKey(s), draft = s.drafts[key], plan = draft?.options.find(p=>p.id===id);
  if (!draft || !plan || draft.registeredId || s.confirmedVersion !== s.version) return false;
  if (draft.selected?.id === id) return true;
  const bank={...draft.worksheetsByPlan};
  if(draft.selected)bank[draft.selected.id]=draft.worksheet;
  return writeEveryday({...s,drafts:{...s.drafts,[key]:{...draft,selected:plan,phase:'candidates',worksheetsByPlan:bank,
    worksheet:bank[id] ?? {before:'',observation:'',reflection:'',date:dailyDate()}}}},true);
}
export function editEverydayPlan(patch: Partial<EverydayPlan>) {
  const s = get().value, key = everydayKey(s), d = s.drafts[key];
  if (!d?.selected || d.registeredId || s.confirmedVersion !== s.version) return false;
  return writeEveryday({...s,drafts:{...s.drafts,[key]:{...d,selected:{...d.selected,...patch}}}},true);
}
export function editEverydayWorksheet(patch: Partial<WorksheetNotes>) {
  const s = get().value, key = everydayKey(s), d = s.drafts[key];
  if (!d || d.phase !== 'worksheet' || d.registeredId || s.confirmedVersion !== s.version) return false;
  return writeEveryday({...s,drafts:{...s.drafts,[key]:{...d,worksheet:{...d.worksheet,...patch}}}},true);
}
export function setEverydayPhase(phase: 'worksheet') {
  const s = get().value, key = everydayKey(s), d = s.drafts[key];
  return !!d?.selected && writeEveryday({...s,drafts:{...s.drafts,[key]:{...d,phase}}});
}
export function setEverydayRegistered(id: string) {
  const s = get().value, key = everydayKey(s), d = s.drafts[key];
  return !!d && d.id === id && writeEveryday({...s,drafts:{...s.drafts,[key]:{...d,registeredId:id}}});
}
export function moveEverydayCursor(id: string, position:number) {
  const s = get().value;
  return writeEveryday({...s,cursor:{...s.cursor,[id]:position}},true);
}
export function saveEverydayPreview(id:string, preview:EverydayPreview, refine=false) {
  const s = get().value;
  return writeEveryday(refine ? {...s,refinements:{...s.refinements,[id]:preview}} : {...s,previews:{...s.previews,[id]:preview}},true);
}
export function selectEverydaySources(ids:string[], scope?:string) {
  const s=get().value;
  return writeEveryday({...s,selected:{...s.selected,[scope ?? everydayKey(s)]:[...new Set(ids)]}},true);
}
export function saveStoryThoughts(id:string,patch:Partial<StoryThoughts>) {
  const s=get().value;
  return writeEveryday({...s,thoughts:{...s.thoughts,[id]:{...(s.thoughts?.[id] ?? emptyStoryThoughts),...patch}}},true);
}
export function saveEverydayOriginal(id:string, sections:EverydayDraftSections) {
  const s = get().value;
  return writeEveryday({...s,originals:{...s.originals,[id]:[...sections]}});
}

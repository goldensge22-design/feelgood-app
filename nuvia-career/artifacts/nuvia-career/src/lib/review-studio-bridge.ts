import { clientStorage, REVIEW_DEMO } from './public-demo';
import { DAILY_EVIDENCE, type DailyDraft } from './review-daily-model';
import { getEveryday, selectEverydaySources } from './review-everyday-store';
import { addDailyCard, addFreeReviewCard, approveReviewCards, commitReviewNote, getReviewPlannerSnapshot, saveReviewNoteDraft } from './review-planner';
import { reviewCardExperience } from './review-planner-model';
import { REVIEW_RECORD_META } from './provenance';
import { editStoryboard, emptyStoryboard, saveStoryboard, sourceRevision, storedStoryboard } from './storyboard';
import { reviewStorage } from './review-device';

export const STUDIO_TAB_KEY='nuvia:review-demo:v1:original-studio:v1';
type Ref = {type:'card';text:string;stamp:string} | {type:'free';date:string;text:string;stamp:string};
const KEY='review:studio-source-ref:v1';
function readRefs():Record<string,Ref> {
  const {storage,key}=clientStorage(KEY);
  return JSON.parse(storage.getItem(key) ?? '{}');
}
export function studioReviewStamp(card: {id:string;title:string;date:string;scope:string;firstAction:string}) {
  return JSON.stringify([card.id,card.title,card.date,card.scope,card.firstAction]);
}
export function reviewStudioSourcePath(id:string) {
  try{
    const ref=REVIEW_DEMO?readRefs()[id]:null;
    return ref ? (ref.type==='free'?'/planner#studio-daily-note':`/planner#studio-${id}`) : `/planner/card/${id}`;
  }catch{return '/planner';}
}
export function reviewStudioSourceCurrent(id:string) {
  if(!REVIEW_DEMO)return true;
  try {
    const ref=readRefs()[id];
    if(!ref)return true; // Earlier review records were not created in the original Studio.
    const store=JSON.parse(reviewStorage.getItem(STUDIO_TAB_KEY) ?? 'null');
    if(ref.type==='free') {
      const note=store?.studio?.dailyNotes?.[ref.date];
      return note?.updatedAt===ref.stamp && typeof note?.text==='string' && note.text.includes(ref.text);
    }
    const originalId=store?.studio?.creations?.[`review-daily:${id}`];
    const card=store?.lab?.students?.[store.studentId]?.cards?.find((c:{id:string})=>c.id===originalId);
    return !!card && studioReviewStamp(card)===ref.stamp && getEveryday().value.dailyDrafts?.[id]?.worksheet.before===ref.text;
  } catch { return false; }
}

/** Synthetic device workspace only. Copy the selected excerpt, not the Studio workspace. */
export function attachStudioRecord(input:{id:string;date:string;ref:Ref;draft?:DailyDraft}) {
  if(!REVIEW_DEMO || !location.pathname.endsWith('/demo/review/studio-frame.html') || !input.ref.text.trim() || input.ref.text.length>3000)return false;
  const {id,date,ref,draft}=input;
  try {
    let book=getReviewPlannerSnapshot().book;
    if(!book.cards[id]) {
      if(draft) {
        const {id:_,...attachment}=draft;
        if(!addDailyCard(id,attachment))return false;
      } else if(!addFreeReviewCard(id,date))return false;
      book=getReviewPlannerSnapshot().book;
    }
    if(book.cards[id].note?.action!==ref.text) {
      if(!saveReviewNoteDraft(id,{action:ref.text}) || !commitReviewNote(id))return false;
    }
    book=getReviewPlannerSnapshot().book;
    const current=storedStoryboard('demo');
    const existing=(current?.evidenceSources ?? []).filter(s=>s.id!==id && book.cards[s.id]?.revision===s.revision &&
      book.cards[s.id]?.approvedRevision===s.revision && reviewStudioSourceCurrent(s.id));
    const sources=[...existing,{id,revision:book.cards[id].revision}];
    if(!approveReviewCards(sources))return false;
    const record=reviewCardExperience(getReviewPlannerSnapshot().book.cards[id]);
    if(!record || !selectEverydaySources(sources.map(s=>s.id),DAILY_EVIDENCE))return false;
    const {storage,key}=clientStorage(KEY);
    storage.setItem(key,JSON.stringify({...readRefs(),[id]:ref}));
    if(!reviewStudioSourceCurrent(id))return false;
    const revised=editStoryboard(current ?? emptyStoryboard(),{experienceId:id,sourceRevision:sourceRevision(record,{meta:REVIEW_RECORD_META,syntheticStatus:null}),
      evidenceKey:DAILY_EVIDENCE,evidenceSources:sources});
    return saveStoryboard('demo',revised,current);
  } catch { return false; }
}

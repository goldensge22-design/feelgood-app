import {validateLab} from '../enhancement/persistence';
import type {PersonalState} from './model';
import type {Card} from '../enhancement/model';
export const ACTIVITIES=['학습','생활','업무','기타'] as const;
export type Activity=typeof ACTIVITIES[number];
export interface TaskInput {
 title:string;activity?:Activity;activityExplicit?:boolean;subject?:string;minutes?:number|null;
 timeChosen?:boolean;scopeChosen?:boolean;planReviewed?:boolean;scope?:string;firstAction?:string;
 date?:string;startTime?:string;materials?:string;steps?:string[];requestId?:string;
}
export const timeLabel=(minutes:number)=>minutes>0?`${minutes}분`:'예상 미정';
export const activityOf=(s:PersonalState,c:Card):Activity=>s.studio?.placements[c.id]?.activity??c.domain;
export function checkMinutes(n:number|null){if(n!==null&&(!Number.isInteger(n)||n<1||n>1440))throw Error('예상 시간은 1~1440분의 정수로 입력하거나 아직 모르겠어요를 골라 주세요.');}
/** Local-only untimed representation. No shared schema or server contract is changed.
 * Existing validator sees a disposable positive-number view; canonical storage keeps 0
 * with explicit provenance, never an invented 1/15/25-minute plan. */
export function validateStudioLab(s:PersonalState){
 const view=structuredClone(s.lab),zeroCards:{actor:string;id:string}[]=[],zeroRuns:{actor:string;id:string}[]=[];
 for(const [actor,p] of Object.entries(view.students)){
  for(const c of p.cards){
   const marked=actor===s.studentId&&s.studio?.placements[c.id]?.estimateKnown===false;
   if(marked!== (c.minutes===0)&&marked)throw Error('미정 시간과 과제의 연결이 맞지 않습니다.');
   if(c.minutes===0){if(!marked)throw Error('미정 시간 표시가 없는 과제입니다.');zeroCards.push({actor,id:c.id});c.minutes=1;}
  }
  for(const r of p.runs)if(r.budgetMinutes===0){
   if(actor!==s.studentId||!s.studio?.unknownRuns?.includes(r.id))throw Error('미정 실행의 연결이 맞지 않습니다.');
   zeroRuns.push({actor,id:r.id});r.budgetMinutes=1;
  }
 }
 const lab=validateLab(view);
 for(const {actor,id} of zeroCards)(lab.students as Record<string,typeof lab.students['student-a']>)[actor].cards.find(c=>c.id===id)!.minutes=0;
 for(const {actor,id} of zeroRuns)(lab.students as Record<string,typeof lab.students['student-a']>)[actor].runs.find(r=>r.id===id)!.budgetMinutes=0;
 for(const id of s.studio?.unknownRuns??[])if(!lab.students[s.studentId].runs.some(r=>r.id===id&&r.budgetMinutes===0))throw Error('미정 실행 기록이 없습니다.');
 if(new Set(s.studio?.unknownRuns??[]).size!==(s.studio?.unknownRuns??[]).length)throw Error('미정 실행 식별자가 중복입니다.');
 for(const id of Object.values(s.studio?.creations??{}))if(!lab.students[s.studentId].cards.some(c=>c.id===id))throw Error('추가 요청과 과제의 연결이 맞지 않습니다.');
 for(const c of Object.values(s.insights?.contexts??{}))if((c.plannedMinutes===0)!==!!s.studio?.unknownRuns?.includes(c.runId))throw Error('예상 시간과 실행 근거가 다릅니다.');
 return lab;
}

import { coachText, stageCoach } from '@/i18n/experience-coach';
import { now, type AppState } from '../store';
import { copy, requireCourse, requireStudent } from './core';
import type { ExperienceNote, ExperienceNoteData, ConfirmedFact, Course } from './types';

/** Notes are deliberately separate from confirmed facts, essay text and essay versions. */
export function emptyExperienceNote(): ExperienceNoteData {
  return { purpose:'experience', customPurpose:'', mode:'auto', expanded:false, questionIndex:0,
    fields:{situation:'',roleGoal:'',action:'',result:'',learning:'',evidence:''},
    sourceKind:'unverified', factId:'', includePrint:false, shareNotes:false };
}
const dataOf = (n:ExperienceNote):ExperienceNoteData => {
  const {purpose,customPurpose,mode,expanded,questionIndex,fields,sourceKind,factId,includePrint,shareNotes}=n;
  return structuredClone({purpose,customPurpose,mode,expanded,questionIndex,fields,sourceKind,factId,includePrint,shareNotes});
};
const sourceOf=(s:AppState,n:Pick<ExperienceNote,'courseId'|'studentId'|'factId'>)=>s.studio.facts.find(f=>f.id===n.factId&&f.courseId===n.courseId&&f.studentId===n.studentId);
const fingerprint=(f:ConfirmedFact)=>JSON.stringify(f);
export function experienceSourceState(s:AppState,n:ExperienceNote):'none'|'unconfirmed'|'changed'|'withdrawn'|'current' {
  if(!n.factId)return 'none';
  const f=sourceOf(s,n);
  if(!f||f.withdrawn||!f.studentConfirmed)return 'withdrawn';
  if(!n.sourceReceipt||n.sourceReceipt.factId!==n.factId)return 'unconfirmed';
  return n.sourceReceipt.fingerprint===fingerprint(f)?'current':'changed';
}
export function getExperienceNote(s:AppState,courseId:string,studentId:string):ExperienceNote|null {
  const c=requireCourse(s,courseId),a=s.studio.actor;
  if(!c.studentIds.includes(studentId))return null;
  const n=s.studio.experienceNotes?.find(x=>x.courseId===courseId&&x.studentId===studentId);
  if(!n)return null;
  if(a.role==='student'&&a.id===studentId)return structuredClone(n);
  if(!n.shareNotes)return null;
  const shared=structuredClone(n);shared.versions=[];delete shared.sourceReceipt;
  if(a.role==='teacher'&&a.id===c.ownerId)return shared;
  const w=s.studio.writings.find(w=>w.courseId===courseId&&w.studentId===studentId);
  if(a.role==='counselor'&&w?.sharing.experiences&&w.sharing.counselorIds.includes(a.id))return shared;
  return null;
}
export function saveExperienceNote(s:AppState,courseId:string,studentId:string,input:ExperienceNoteData):AppState {
  requireStudent(s,courseId,studentId,true);
  const clean:ExperienceNoteData={
    purpose:input.purpose,customPurpose:String(input.customPurpose),mode:input.mode,
    expanded:!!input.expanded,questionIndex:Math.max(0,Math.min(5,Math.trunc(input.questionIndex)||0)),
    fields:Object.fromEntries(Object.entries(emptyExperienceNote().fields).map(([k])=>[k,String(input.fields[k as keyof ExperienceNoteData['fields']]??'')])) as ExperienceNoteData['fields'],
    sourceKind:input.sourceKind,factId:input.factId,includePrint:!!input.includePrint,shareNotes:!!input.shareNotes,
  };
  if(!['experience','motivation','values','plan','custom'].includes(clean.purpose)||!['auto','star','purpose','none'].includes(clean.mode)||!['actual','simulation','unverified'].includes(clean.sourceKind))throw Error(coachText('error'));
  const linked=sourceOf(s,{courseId,studentId,factId:clean.factId});
  if(clean.factId&&!linked)throw Error(coachText('sourceWithdrawn'));
  // A classroom simulation must never be relabelled as an actual workplace experience.
  if(linked?.simulation)clean.sourceKind='simulation';
  const n=copy(s),notes=n.studio.experienceNotes??(n.studio.experienceNotes=[]);
  const old=notes.find(x=>x.courseId===courseId&&x.studentId===studentId),at=now();
  const next:ExperienceNote={...clean,courseId,studentId,revision:(old?.revision??0)+1,updatedAt:at,
    sourceReceipt:old?.factId===clean.factId?structuredClone(old.sourceReceipt):undefined,
    versions:old?[...old.versions,{revision:old.revision,at:old.updatedAt,data:dataOf(old),sourceReceipt:structuredClone(old.sourceReceipt)}]:[]};
  if(old)notes[notes.indexOf(old)]=next;else notes.push(next);
  return n;
}
export function confirmExperienceSource(s:AppState,courseId:string,studentId:string):AppState {
  requireStudent(s,courseId,studentId,true);
  const note=getExperienceNote(s,courseId,studentId),f=note&&sourceOf(s,note);
  if(!note||!f||!f.studentConfirmed||f.withdrawn)throw Error(coachText('sourceWithdrawn'));
  // Store a receipt only after explicit student action. Existing note/essay versions remain unchanged.
  const n=saveExperienceNote(s,courseId,studentId,dataOf(note));
  const target=n.studio.experienceNotes!.find(x=>x.courseId===courseId&&x.studentId===studentId)!;
  target.sourceReceipt={factId:f.id,fingerprint:fingerprint(f)};
  if(f.simulation)target.sourceKind='simulation';
  return n;
}
export function coachQuestions(note:ExperienceNoteData,stage:Course['stage']):string[] {
  if(note.mode==='none')return [];
  if(note.mode==='star'||(note.mode==='auto'&&note.purpose==='experience')) {
    const fields=Object.keys(emptyExperienceNote().fields) as (keyof ExperienceNoteData['fields'])[];
    return stageCoach(stage).questions.filter((_,i)=>!note.fields[fields[i]]?.trim());
  }
  return [coachText(note.purpose==='motivation'?'motivationQuestion':note.purpose==='values'?'valuesQuestion':note.purpose==='plan'?'planQuestion':'customQuestion')];
}

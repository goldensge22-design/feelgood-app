import { displayAppText, worksheetGoalWarning } from '@/i18n/authored';
import { T } from '@/i18n/tx';
import { now, type AppState } from './store';
import type { PersonalWorksheet, PlannerActivity, WorksheetFields, PlannerFields } from './material-types';

export type MaterialLanguagePreview = {
  id:string;kind:'worksheet'|'card';sourceLang:string;targetLang:string;
  fields:WorksheetFields|PlannerFields;changedKeys:string[];preservedKeys:string[];untranslated:string[];originalVersion:number;
};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const worksheetKeys=['title','goal','readingTitle','reading','questions','actions','help','deliverable','criterion'];
const plannerKeys=['title','goal','reason','scope','firstAction','steps','help','criterion'];
function protectedPhrases(s:AppState,doc:PersonalWorksheet|PlannerActivity) {
  const student=s.students.find(x=>x.id===doc.studentId);
  const course=s.studio.courses.find(c=>c.studentIds.includes(doc.studentId));
  return [...(doc.protectedText??[]),student?.job,student?.family,student?.task,course?.readingCandidates,
    ...s.studio.companies.flatMap(x=>[x.source,x.duties,...x.behaviors])]
    .filter((x):x is string=>!!x).sort((a,b)=>b.length-a.length);
}
/** Presentation projection: app fields can change language; original stored fields/versions cannot. */
export function previewMaterialLanguage(s:AppState,id:string,kind:'worksheet'|'card',targetLang:string):MaterialLanguagePreview {
  const doc=kind==='worksheet'?s.personalWorksheets.find(x=>x.id===id):s.plannerActivities.find(x=>x.id===id);
  if(!doc)throw new Error(T('수정할 활동지를 확인하세요.'));
  const fields=structuredClone(doc.fields),baseline=doc.generated??doc.versions[0]?.fields;
  const changedKeys:string[]=[],preservedKeys:string[]=[],untranslated:string[]=[];
  const protectedText=protectedPhrases(s,doc);
  let keys=kind==='worksheet'?worksheetKeys:plannerKeys;
  // The missing-job notice is authored UI text, unlike a student's chosen job.
  if(kind==='card'&&displayAppText((fields as PlannerFields).job,doc.lang,'ko')==='(학생이 직무를 아직 선택하지 않음)')keys=[...keys,'job'];
  // Student-selected goals/first actions in studio missions are never authored template instructions.
  if(doc.id.startsWith('studio-')) keys=keys.filter(k=>!['goal','firstAction','reason'].includes(k));
  if(doc.id.startsWith('basic-practice-')) keys=keys.filter(k=>!['goal','firstAction'].includes(k));
  const translate=(text:string)=>{
    const tokens:string[]=[];
    // A verified curriculum-goal wrapper is fully app-owned. Do not mask coincidental
    // matches with a student's interest words inside this static curriculum goal.
    const composition=worksheetGoalWarning(text,targetLang);
    let shielded=composition??text;
    for(const phrase of protectedText)if(shielded.includes(phrase)){const token=`⟦PROTECTED${tokens.length}⟧`;tokens.push(phrase);shielded=shielded.split(phrase).join(token)}
    let translated=composition===undefined?displayAppText(shielded,doc.lang,targetLang):shielded;
    const prose=translated.replace(/수업설계LAB|한서대학교|한서대|새빛/g,'');
    if(targetLang!=='ko'&&/[가-힣]/.test(prose))untranslated.push(translated);
    translated=translated.replace(/⟦PROTECTED(\d+)⟧/g,(_,i)=>tokens[+i]);
    return translated;
  };
  for(const key of keys){
    const value=(fields as unknown as Record<string,unknown>)[key],base=(baseline as unknown as Record<string,unknown>)?.[key];
    if(doc.userOwnedKeys?.includes(key)){preservedKeys.push(key);continue}
    if(Array.isArray(value)&&Array.isArray(base)){
      const next=value.map((item,i)=>same(item,base[i])&&!doc.userOwnedKeys?.includes(`${key}.${i}`)?translate(String(item)):(preservedKeys.push(`${key}.${i}`),item));
      (fields as unknown as Record<string,unknown>)[key]=next;
      if(!same(value,next))changedKeys.push(key);
    }else if(same(value,base)&&typeof value==='string'){
      const next=translate(value);(fields as unknown as Record<string,unknown>)[key]=next;
      if(value!==next)changedKeys.push(key);
    }else preservedKeys.push(key);
  }
  return {id,kind,sourceLang:doc.lang,targetLang,fields,changedKeys,preservedKeys,untranslated:[...new Set(untranslated)],originalVersion:doc.versions.at(-1)?.version??1};
}
/** Explicit confirmation appends a revision. Execution, registration, user originals and old versions remain unchanged. */
export function applyMaterialLanguage(s:AppState,p:MaterialLanguagePreview):AppState{
  if(s.studio.actor.role!=='teacher')throw new Error(T('담당 교사만 수업을 만들 수 있습니다.'));
  const current=p.kind==='worksheet'?s.personalWorksheets.find(x=>x.id===p.id):s.plannerActivities.find(x=>x.id===p.id);
  if(!current||current.versions.at(-1)?.version!==p.originalVersion)throw new Error(T('자료가 변경되었습니다. 미리보기를 다시 확인하세요.'));
  const fresh=previewMaterialLanguage(s,p.id,p.kind,p.targetLang);
  if(!same(fresh.fields,p.fields))throw new Error(T('자료가 변경되었습니다. 미리보기를 다시 확인하세요.'));
  if(fresh.untranslated.length)throw new Error(T('번역되지 않은 앱 문구가 있습니다. 원문을 확인하세요.'));
  const n=structuredClone(s),reason=T('언어 자료 새 버전 · 직접 작성 내용 보존');
  if(p.kind==='worksheet'){
    const doc=n.personalWorksheets.find(x=>x.id===p.id)!;
    doc.fields=structuredClone(p.fields as WorksheetFields);doc.lang=p.targetLang;
    doc.generated=structuredClone(doc.fields);
    doc.userOwnedKeys=[...new Set([...(doc.userOwnedKeys??[]),...p.preservedKeys])];
    doc.versions.push({version:p.originalVersion+1,at:now(),reason,fields:structuredClone(doc.fields)});
  }else{
    const doc=n.plannerActivities.find(x=>x.id===p.id)!;
    doc.fields=structuredClone(p.fields as PlannerFields);doc.lang=p.targetLang;
    doc.generated=structuredClone(doc.fields);
    doc.userOwnedKeys=[...new Set([...(doc.userOwnedKeys??[]),...p.preservedKeys])];
    doc.versions.push({version:p.originalVersion+1,at:now(),reason,fields:structuredClone(doc.fields),record:structuredClone(doc.record),worksheetIds:[...doc.worksheetIds]});
  }
  return n;
}
export function localizedWorksheet(s:AppState,w:PersonalWorksheet,lang=s.lang):PersonalWorksheet {
  const p=previewMaterialLanguage(s,w.id,'worksheet',lang);
  if(p.untranslated.length)throw new Error(T('번역되지 않은 앱 문구가 있습니다. 원문을 확인하세요.'));
  return {...w,fields:p.fields as WorksheetFields};
}
export function localizedPlanner(s:AppState,a:PlannerActivity,lang=s.lang):PlannerActivity {
  const p=previewMaterialLanguage(s,a.id,'card',lang);
  if(p.untranslated.length)throw new Error(T('번역되지 않은 앱 문구가 있습니다. 원문을 확인하세요.'));
  return {...a,fields:p.fields as PlannerFields};
}

import type { CareerApplication, CareerExperience, CareerIntegratedSource, CareerState } from '@workspace/api-client-react';
import { hashStr, newActivity, newApplication, uid } from './career';

export type AccountAudience = 'youth' | 'adult';
export type PlannerEvidence = { reference: string; title: string; date: string; action: string; context: 'self_reported'|'thought_exercise'; version: string };
export const storyKey = (audience: AccountAudience) => audience === 'youth' ? 'youthStoryId' : 'adultStoryId';
export const studyApp = (s: CareerState, audience: AccountAudience) => s.applications.find(a => a.id === s.integrated?.[storyKey(audience)]);

export function accountPlannerSourceCurrent(raw:string|undefined, item:CareerExperience):boolean {
  if(!raw||!item.plannerReference)return false;
  try{
    const planner=JSON.parse(raw);
    if(item.plannerReference.startsWith('note:')){
      const note=planner.studio?.dailyNotes?.[item.plannerReference.slice(5)];
      return !!note&&note.updatedAt===item.sourceVersion&&note.text.includes(item.action);
    }
    if(item.plannerReference.startsWith('desk:')){
      const card=planner.lab?.students?.['student-a']?.cards?.find((c:{id:string})=>`desk:${c.id}`===item.plannerReference);
      return !!card&&item.sourceVersion===`account:${hashStr(JSON.stringify(card))}`;
    }
  }catch{/* The original could not be read. Do not treat it as current. */}
  return false;
}

export function editAccountStory(s: CareerState, audience: AccountAudience, changes: Partial<CareerApplication>, title: string) {
  const current = studyApp(s, audience);
  if (!current && s.applications.length >= 200) return s;
  const app = { ...(current ?? {...newApplication(), question:title}), ...changes,
    id:current?.id ?? uid('story'),integratedAudience:audience };
  return {
    ...s, integrated:{...s.integrated,[storyKey(audience)]:app.id},
    applications:current?s.applications.map(a=>a.id===app.id?app:a):[...s.applications,app],
  };
}

export function confirmPlannerEvidence(s: CareerState, input: PlannerEvidence): [CareerState,string|null] {
  if (!input.action.trim()) return [s,null];
  const dupe=s.experiences.find(e=>e.plannerReference===input.reference&&e.sourceVersion===input.version&&e.action===input.action&&e.activityContext===input.context);
  if (dupe) return [s,dupe.id];
  if(s.experiences.length>=500||s.activities.length>=500) return [s,null];
  const activity={...newActivity(),title:input.title,date:input.date,action:input.action,status:'partial' as const};
  const id=uid('exp');
  return [{
    ...s,
    activities:[...s.activities,activity],
    experiences:[...s.experiences,{
      id,title:input.title,action:input.action,result:'',learning:'',strengths:[],criterionIds:[],
      confirmed:true,source:'local_activity',sourceId:activity.id,sourceVersion:input.version,
      plannerReference:input.reference,activityContext:input.context,
    }],
  },id];
}

export function pickCompany(s:CareerState,source:CareerIntegratedSource,title:string) {
  const next=editAccountStory(s,'adult',{company:source.company,job:source.job},title);
  return {...next,integrated:{...next.integrated,companySource:source}};
}

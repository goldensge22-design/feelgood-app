import { RESEARCH_CONSENT, reviewProfile, reviewStorage, reviewWrite } from './review-device';
import { getEveryday } from './review-everyday-store';
import { reviewHomeFixture } from './review-home-profile';

export const REVIEW_PREFS='review:lab-interests:v1';
export type Preference={id:string;kind:'company'|'job';label:string;source:string};
const TRAIL='review:activity-event:v1:';
const recent=new Map<string,number>();

export function recordSyntheticReport() {
  const {trait,focus}=getEveryday().value.choice;
  try {
    reviewWrite(`review:assessment-example:${trait}:${focus??'not-provided'}`,JSON.stringify({
      synthetic:true,originalVersion:'example-2026-01-01-v1',interpretationVersion:'example-v1',top5Version:'example-top5-v1',
      summary:reviewHomeFixture(trait,focus),
    }),'assessment.synthetic-referenced');
    return true;
  }catch{return false;}
}

export function safeLabTerm(term:string) {
  // Do not retain URLs or obvious credentials/contact details as search terms.
  return /https?:|www\.|@|(?:password|token|secret|api.?key|비밀번호|토큰)\s*[:=]|\b[A-Za-z0-9_-]{44,}\b/i.test(term)?'':term.trim().slice(0,160);
}
export function publicSourceRef(value:string) {
  try {
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||
      /(^|\/)(auth|oauth|login|signin|session|callback|sso|reset|invite|token|secure)(\/|$)/i.test(url.pathname)||
      /%|[A-Za-z0-9_-]{44,}/.test(url.pathname))return '';
    return `${url.origin}${url.pathname}`; // Never retain a query string or fragment in the activity trail.
  }catch{return '';}
}
export function recordReviewAction(type:string,source:string,detail:Record<string,string|number|string[]>= {}) {
  const signature=JSON.stringify([type,source,detail]);
  const now=Date.now();
  if(now-(recent.get(signature)??0)<600)return true;
  const id=crypto.randomUUID();
  try {
    const {choice}=getEveryday().value;
    const consent=JSON.parse(reviewStorage.getItem(RESEARCH_CONSENT)??'null');
    const ref=`synthetic-review:${choice.trait}:${choice.focus??'not-provided'}`;
    reviewWrite(TRAIL+id,JSON.stringify({
      schema:1,id,type,source,detail,profile:reviewProfile(),synthetic:true,
      report:{id:ref,originalVersion:'example-2026-01-01-v1',interpretationVersion:'example-v1',top5Version:'example-top5-v1'},
      clientAt:new Date(now).toISOString(),receivedAt:null,receipt:'device-only',
      servicePurpose:'sample-workspace-storage',researchConsent:{state:consent?.state??'not-selected',version:consent?.policyVersion??null},
    }),type,id);
    if(recent.size>500)recent.clear();
    recent.set(signature,now);
    return true;
  }catch{return false;}
}
export function reviewPreferences():Preference[] {
  try {const value=JSON.parse(reviewStorage.getItem(REVIEW_PREFS)??'[]');return Array.isArray(value)?value:[];}catch{return [];}
}
export function setReviewPreference(pref:Preference,active:boolean) {
  const previous=reviewPreferences();
  if(previous.some(p=>p.id===pref.id)===active)return previous;
  const next=active?[...previous,pref]:previous.filter(p=>p.id!==pref.id);
  try {
    reviewWrite(REVIEW_PREFS,JSON.stringify(next),active?'lab.preference.added':'lab.preference.removed');
    recordReviewAction(active?'lab.preference.added':'lab.preference.removed',pref.source,{preferenceId:pref.id,kind:pref.kind,label:pref.label});
    return next;
  }catch{return null;}
}

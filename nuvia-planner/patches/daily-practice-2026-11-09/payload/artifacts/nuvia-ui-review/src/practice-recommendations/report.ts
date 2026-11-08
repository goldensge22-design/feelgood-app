import type {PersonalState} from '../studio/model';
import {practiceStats} from './domain';
import {practiceTitle} from './display';
import {text} from './i18n';
import {localeOf} from '../studio/i18n/config';
const esc=(x:unknown)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function practiceReport(s:PersonalState,month:string){
 const t=(k:string)=>esc(text(localeOf(s),k)),p=s.lab.students[s.studentId];
 const records=Object.values(s.studio?.practice?.attachments??{}).filter(a=>a.addedAt.slice(0,7)===month||p.runs.some(r=>r.cardId===a.taskId&&r.startedAt.slice(0,7)===month));
 if(!records.length)return '';
 return `<section><h2>${t('heading')}</h2><p>${t('noEffect')}</p>${records.map(a=>{
  const c=p.cards.find(c=>c.id===a.taskId)!,q=practiceStats(s,a.taskId,month);
  return `<h3>${esc(practiceTitle(s,c))}</h3><p>${t('useCount')}: ${q.uses} · ${t('responseCount')}: ${q.responses} · ${t('yes')}: ${q.yes} · ${t('neutral')}: ${q.neutral} · ${t('no')}: ${q.no} · ${t('unanswered')}: ${q.unanswered}</p>`;
 }).join('')}</section>`;
}

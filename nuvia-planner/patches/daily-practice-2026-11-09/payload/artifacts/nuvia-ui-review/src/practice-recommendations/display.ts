import type {PersonalState} from '../studio/model';
import type {Card} from '../enhancement/model';
import {localeOf} from '../studio/i18n/config';
import {content,ageContent} from './i18n';
import type {PracticeAttachment} from './model';
export function initialText(a:PracticeAttachment,locale:string,field:'title'|'firstAction'|'scope'){
 const value=a.initial[field];
 if(!a.provided?.[field])return value;
 const original=field==='scope'?ageContent(a.creationLocale,a.stage,'scope'):content(a.creationLocale,a.templateId,field==='title'?'title':'action');
 return value===original?(field==='scope'?ageContent(locale,a.stage,'scope'):content(locale,a.templateId,field==='title'?'title':'action')):value;
}
/** Presentation only: authored/edited strings never become translation targets. */
export function practiceTitle(s:PersonalState,c:Card){
 return practiceField(s,c,'title');
}
export function practiceField(s:PersonalState,c:Card,field:'title'|'firstAction'|'scope'){
 const a=s.studio?.practice?.attachments[c.id];
 const pristine=c.history.every(h=>{try{return JSON.parse(h.plan)[field]===a?.initial[field];}catch{return false;}});
 return a&&pristine&&c[field]===a.initial[field]?initialText(a,localeOf(s),field):c[field];
}

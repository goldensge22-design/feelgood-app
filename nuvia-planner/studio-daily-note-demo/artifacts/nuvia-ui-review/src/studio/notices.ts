import {resources,t,label} from './i18n/runtime';
import type {Locale} from './i18n/config';

/** Transient system UI only. Never use this to interpret student-authored text. */
export type Notice={key:string}|{text:string};
export const SAVED_NOTICE_KEY='s.623a8f3b87e87c98';
const known=new Map<string,string>();
for(const dictionary of Object.values(resources))for(const [key,text] of Object.entries(dictionary)){
 if(!/\{[A-Za-z][A-Za-z0-9_]*\}/.test(text))known.set(text,key);
}
export function noticeFromText(text:string):Notice{
 const key=known.get(text);
 return key?{key}:{text};
}
export function noticeText(notice:Notice|null,locale:Locale):string{
 if(!notice)return '';
 return 'key' in notice?t(notice.key,{},locale):String(label(notice.text,locale));
}

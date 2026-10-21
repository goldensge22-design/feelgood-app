import ko from './locales/ko.json';
import en from './locales/en.json';
import ja from './locales/ja.json';
import zhCN from './locales/zh-CN.json';
import zhTW from './locales/zh-TW.json';
import mn from './locales/mn.json';
import th from './locales/th.json';
import vi from './locales/vi.json';
import ar from './locales/ar.json';
import ru from './locales/ru.json';
import km from './locales/km.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import az from './locales/az.json';
import noteResources from './note-resources.json';
import {isLocale,type Locale} from './config';
import {createElement} from 'react';
export {locales,localeNames,localeOf} from './config';
export const resources:Record<Locale,Record<string,string>>={ko,en,ja,'zh-CN':zhCN,'zh-TW':zhTW,mn,th,vi,ar,ru,km,es,fr,it,az};
for(const locale of Object.keys(resources) as Locale[]){
 resources[locale]={...resources[locale],...Object.fromEntries(noteResources.keys.map((key,i)=>['note.'+key,noteResources[locale][i]]))};
}
let active:Locale='ko';
export const currentLocale=()=>active;
export function rawText<T>(value:T){return typeof value==='string'||typeof value==='number'?createElement('bdi',{'data-st-user':'true',dir:'auto',translate:'no'},value):value;}
export function setLocale(locale:Locale){
 if(!isLocale(locale))throw new Error('Unsupported Studio locale: '+String(locale));
 active=locale;
 if(typeof document!=='undefined'){document.documentElement.lang=locale;document.documentElement.dir=locale==='ar'?'rtl':'ltr';}
}
const numberFormat=(locale:Locale)=>new Intl.NumberFormat(locale,{maximumFractionDigits:10});
export function t(key:string,values:Record<string,unknown>={},locale:Locale=active):string{
 const text=resources[locale][key];
 if(typeof text!=='string')throw new Error(`Missing Studio translation: ${locale}/${key}`);
 const result=text.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g,(_,name)=>{
  if(!(name in values))throw new Error(`Missing Studio placeholder: ${key}/${name}`);
  const v=values[name];return typeof v==='number'?numberFormat(locale).format(v):String(v??'');
 });
 if(!result.startsWith('<!doctype html>'))return result;
 const document=result.replace(/<html lang="[^"]*">/,`<html lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}">`);
 // Keep words intact in Korean/Mongolian printed and downloaded documents too.
 // Emergency wrapping is only for an otherwise unbreakable token (e.g. a URL).
 return locale==='ko'||locale==='mn'?document.replace('</style>',
  `body,p,li,h1,h2,h3,small,section{word-break:${locale==='ko'?'keep-all':'normal'};overflow-wrap:break-word;hyphens:none;min-width:0}body{box-sizing:border-box;max-width:100%}a,code,pre{overflow-wrap:anywhere}</style>`):document;
}
const sourceIndex=new Map(Object.entries(ko).map(([k,v])=>[v,k]));
const translatedIndex=new Map(Object.values(resources).flatMap(r=>Object.entries(r).filter(([,v])=>!/\{[A-Za-z]\w*\}/.test(v)).map(([k,v])=>[v,k])));
const escapeReg=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const patterns=Object.entries(ko).filter(([,s])=>/\{value\d+\}/.test(s)&&!s.includes('<')).map(([key,s])=>{
 const names:string[]=[];let offset=0,pattern='^';
 for(const m of s.matchAll(/\{(value\d+)\}/g)){pattern+=escapeReg(s.slice(offset,m.index))+'([\\s\\S]*?)';names.push(m[1]);offset=m.index!+m[0].length;}
 return {key,names,re:new RegExp(pattern+escapeReg(s.slice(offset))+'$'),length:s.length};
}).sort((a,b)=>b.length-a.length);
// Use only at a system-label/error display boundary, never for student text/input.
export function label<T>(value:T,locale:Locale=active):T|string{
 if(typeof value==='number')return ' '+numberFormat(locale).format(value)+' ';
 if(typeof value!=='string'||locale==='ko')return value;
 const key=sourceIndex.get(value)??translatedIndex.get(value);
 if(key)return t(key,{},locale);
 for(const p of patterns){const match=value.match(p.re);if(match)return t(p.key,Object.fromEntries(p.names.map((n,i)=>[n,match[i+1]])),locale);}
 return value;
}
export function intlDate(value:string|Date,options:Intl.DateTimeFormatOptions={dateStyle:'medium'},locale:Locale=active){
 const date=value instanceof Date?value:new Date(value.length===10?value+'T12:00:00':value);
 return Number.isNaN(date.getTime())?String(value):new Intl.DateTimeFormat(locale,options).format(date);
}

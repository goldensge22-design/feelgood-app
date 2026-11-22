import {currentLocale,resources,formatNumber} from './i18n/runtime';
// Reuse the reviewed sentence. Remove only the unit belonging to an absent value,
// before interpolation, so neither student text nor valid durations are altered.
export function timeComparisonHTML(values:Record<string,string|number>,previousMissing:boolean,currentMissing:boolean){
 const key='s.4ea9dee184e16b58';
 const original=resources[currentLocale()][key];
 let template=original;
 for(const [missing,value,count] of [[previousMissing,3,4],[currentMissing,5,6]] as const){
  if(missing)template=template.replace(new RegExp(`(\\{value${value}\\})[^{}]*?(\\(\\{value${count}\\})`),'$1 $2');
 }
 return template.replace(/\{(value\d+)\}/g,(_,key)=>{
  const value=values[key];
  return typeof value==='number'?formatNumber(value):String(value??'');
 });
}

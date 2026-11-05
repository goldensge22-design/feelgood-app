import { WORKSHEETS } from '@/data/worksheets';
import { LESSONS } from '@/data/lessons';
import { PACKS } from './content';
import { authoredDictionaries, tx, txLang } from './tx';
import aliases from './authored-aliases.json';

type Entry = { source: string; values: Record<string,string> };
let entries: Entry[] | undefined;
const byLanguage = new Map<string,Map<string,Entry>>();
const stringLeaves = (a: unknown, b: unknown, visit: (source:string,target:string)=>void) => {
  if (typeof a === 'string' && typeof b === 'string') visit(a,b);
  else if (a && b && typeof a === 'object' && typeof b === 'object') for (const key of Object.keys(a)) {
    if (key !== 'kind') stringLeaves((a as Record<string,unknown>)[key],(b as Record<string,unknown>)[key],visit);
  }
};
function catalog() {
  if (entries) return entries;
  const all = new Map<string,Entry>();
  const put = (source:string,target:string,lang:string) => {
    if (!source || !target) return;
    if (!all.has(source)) all.set(source,{source,values:{ko:source}});
    all.get(source)!.values[lang]=target;
  };
  const {ui,jobs}=authoredDictionaries();
  for (const dictionaries of [jobs,ui]) for (const [lang,d] of Object.entries(dictionaries)) for (const [source,value] of Object.entries(d)) put(source,value,lang);
  for (const [lang,p] of Object.entries(PACKS)) {
    for (const w of WORKSHEETS) stringLeaves(w,p.worksheets[w.id],(a,b)=>put(a,b,lang));
    for (const l of LESSONS) stringLeaves(l,p.lessons[l.id],(a,b)=>put(a,b,lang));
  }
  for(const alias of aliases){const entry=all.get(alias.source);const current=ui[alias.lang as keyof typeof ui]?.[alias.source];if(entry&&current)entry.values[alias.lang]=current;}
  entries=[...all.values()];
  for (const entry of entries) for (const [lang,text] of Object.entries(entry.values)) {
    if (!byLanguage.has(lang)) byLanguage.set(lang,new Map());
    byLanguage.get(lang)!.set(text,entry);
  }
  for(const alias of aliases){const entry=all.get(alias.source);if(entry)byLanguage.get(alias.lang)?.set(alias.old,entry);}
  return entries;
}
const escape = (s:string) => s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
let templates: {entry:Entry;lang:string;prefix:string;suffix:string;expression:RegExp;slots:number[]}[]|undefined;
const rendered=new Map<string,string>();
function compiled() {
  if(templates)return templates;
  templates=[];
  for(const entry of catalog())for(const [lang,source]of Object.entries(entry.values)){
    if(!/\{\d+\}/.test(source))continue;
    const slots:number[]=[];
    const parts=source.split(/(\{\d+\})/);
    const expression=new RegExp('^'+parts.map(part=>/^\{\d+\}$/.test(part)?(slots.push(Number(part.slice(1,-1))),'([\\s\\S]*?)'):escape(part)).join('')+'$');
    templates.push({entry,lang,prefix:parts[0],suffix:parts.at(-1)??'',expression,slots});
  }return templates;
}
const worksheetGoals=new Set(WORKSHEETS.map(w=>w.goal));
let warningTemplates:ReturnType<typeof compiled>|undefined;
/** Only this factory-owned wrapper contains a curriculum goal, not an opaque user slot. */
export function worksheetGoalWarning(text:string,targetLang=txLang()):string|undefined {
  warningTemplates??=compiled().filter(t=>t.entry.source==='[직무 과제 미확인 - 교사 확인 필요] {0}');
  for(const template of warningTemplates){
    if(!text.startsWith(template.prefix)||!text.endsWith(template.suffix))continue;
    const match=template.expression.exec(text);if(!match)continue;
    const goal=match[1];
    for(const dictionary of byLanguage.values()){
      const entry=dictionary.get(goal);
      if(entry&&worksheetGoals.has(entry.source))return(template.entry.values[targetLang]??template.entry.source).replace('{0}',entry.values[targetLang]??entry.source);
    }
  }
  return undefined;
}
/** Translate ONLY an app-owned value. Unknown fragments (quotes/names/input) are returned verbatim.
 * Never call on arbitrary student essays, facts, free-form goals or counselor notes. */
export function displayAppText(text: string, fromLang?: string, targetLang = txLang()): string {
  if (!text) return text;
  const composition=worksheetGoalWarning(text,targetLang);if(composition!==undefined)return composition;
  catalog();
  const dictionaries = fromLang ? [byLanguage.get(fromLang), ...byLanguage.values()] : [...byLanguage.values()];
  for (const d of dictionaries) { const match=d?.get(text); if (match) return match.values[targetLang] ?? match.source; }
  const key=`${fromLang??''}\0${targetLang}\0${text}`;
  if(rendered.has(key))return rendered.get(key)!;
  // Template slots are opaque original text. Compile once; avoid scanning regexes for every PDF row.
  for(const {entry,lang,prefix,suffix,expression,slots}of compiled()){
    if((fromLang&&lang!==fromLang)||!text.startsWith(prefix)||!text.endsWith(suffix))continue;
    const match=expression.exec(text);
    if(match){const value=(entry.values[targetLang]??entry.source).replace(/\{(\d+)\}/g,(slot,i)=>{const ix=slots.indexOf(+i);return ix<0?slot:match[ix+1]});rendered.set(key,value);return value;}
  }
  if(text.includes('\n'))return text.split('\n').map(x=>displayAppText(x,fromLang,targetLang)).join('\n');
  if(text.includes(' · '))return text.split(' · ').map(x=>displayAppText(x,fromLang,targetLang)).join(' · ');
  if(text.includes(' / '))return text.split(' / ').map(x=>displayAppText(x,fromLang,targetLang)).join(' / ');
  rendered.set(key,text);return text;
}
export const localizedSupport = (text:string, targetLang=txLang()) => displayAppText(text,undefined,targetLang);
export const appTextTranslated = (text:string, fromLang:string, targetLang:string) => {
  catalog();
  const entry=byLanguage.get(fromLang)?.get(text);
  return !entry || targetLang==='ko' || !!entry.values[targetLang];
};

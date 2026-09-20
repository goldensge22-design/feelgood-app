import registry from '../../i18n/programs.json';
import catalog from './generated/catalog.json';
import ui from './locales/ko.json';
import content from './generated/content.ko.json';

export type Mission = typeof catalog.missions[number];
export const common = registry.programs.find(p => p.id === 'nuvia-history')!;
export const releasedLocales = common.languages!.filter(l => l.availability === 'release').map(l=>l.code);
export class LocaleError extends Error {
  constructor(public code:'LANGUAGE_NOT_PROVIDED'|'LOCALE_PACK_INCOMPLETE'|'TRANSLATION_KEY_MISSING') {super(code);}
}
export function resolveLocale(explicit:string|null, stored:string|null):string {
  const chosen = explicit ?? stored ?? common.defaultLocale;
  if (!releasedLocales.includes(chosen) || chosen !== ui.locale) throw new LocaleError('LANGUAGE_NOT_PROVIDED');
  return chosen;
}
export function validatePack(locale:string, messages:Record<string,string>, required:string[]) {
  if(locale!=='ko')throw new LocaleError('LANGUAGE_NOT_PROVIDED');
  if(!required.length || required.some(key=>typeof messages[key]!=='string'||!messages[key].trim()||messages[key]===key))throw new LocaleError('LOCALE_PACK_INCOMPLETE');
}
export function translator(messages:Record<string,string>) {
  return (key:string, values:Record<string,string|number>={}) => {
    const text=messages[key];
    if(typeof text!=='string'||!text.trim()||text===key)throw new LocaleError('TRANSLATION_KEY_MISSING');
    return text.replace(/\{(\w+)\}/g,(_,name)=>{if(values[name]===undefined)throw new LocaleError('LOCALE_PACK_INCOMPLETE');return String(values[name]);});
  };
}
export const messages:Record<string,string>={...ui.messages,...content.messages};
export const requiredKeys=[...Object.keys(ui.messages),...catalog.missions.flatMap(m=>[m.titleKey,...m.conditions.flatMap(c=>[c.actualHistoryKey,c.actualSceneKey,c.changedConditionKey,c.mechanismKey,c.directEffectKey,c.shortTermKey,c.longTermLimitKey,c.additionalConditionKey,...c.level3Keys])])];
export function missionByWeek(week:number):Mission {
  const mission=catalog.missions.find(m=>m.week===week);
  if(!mission)throw Error('MISSION_NOT_FOUND');return mission;
}
// Boundary adapter only: W24 owns its engine, storage, result IDs and approved overrides.
export function w24Url(mission:Mission, current:string, locale:string) {
  if(mission.week!==24||mission.state!=='executable'||mission.runtime?.missionId!=='gutenberg')throw Error('MISSION_NOT_READY');
  if(locale!=='ko')throw new LocaleError('LANGUAGE_NOT_PROVIDED');
  const source=new URL(current), target=new URL(source.origin);
  target.port='5192';target.pathname='/';
  target.searchParams.set('mission','gutenberg');target.searchParams.set('lang',locale);
  if(source.searchParams.get('qa')==='1'){
    for(const key of ['qa','age','grade','pass','support','learner','new']){
      const value=source.searchParams.get(key);if(value!==null)target.searchParams.set(key,value);
    }
  }
  return target.href;
}
export {catalog};

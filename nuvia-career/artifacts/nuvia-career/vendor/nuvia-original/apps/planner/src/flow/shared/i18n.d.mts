export type FlowLocale='ko'|'en'|'ja'|'zh-CN'|'zh-TW'|'mn'|'th'|'vi'|'ar'|'ru'|'km'|'es'|'fr'|'it'|'az';
export const LANGUAGES:{code:FlowLocale;name:string;dir:'ltr'|'rtl'}[];
export function resolveLocale(value:unknown):FlowLocale|null;
export function direction(locale:string):'ltr'|'rtl';
export function translate(locale:string,key:string,vars?:Record<string,string|number>):string;
export function candidatePlans(research:any,locale?:string):{title:string;goal:string;targetCapability:string;steps:string;date:string;status:'planned';successCriteria:string;artifactPlan:string}[];
export const errorKeys:Record<string,string>;
export function errorKey(error:unknown):string;

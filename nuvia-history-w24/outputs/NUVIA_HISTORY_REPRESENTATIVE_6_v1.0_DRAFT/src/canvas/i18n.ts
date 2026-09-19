import {ko} from '../locales/ko/creation';
export const supportedLocales = ['ko','en','zh','ja','vi','th','mn','ru','ar','es','fr'] as const;
export function t(key:string, variables:Record<string,string|number>={}) {
 if(!(key in ko)) throw new Error(`Missing translation: ${key}`);
 return ko[key].replace(/\{(\w+)\}/g,(_,name)=>String(variables[name]??`{${name}}`));
}

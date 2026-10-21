export const locales=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'] as const;
export type Locale=typeof locales[number];
export const localeNames:Record<Locale,string>={ko:'한국어',en:'English',ja:'日本語','zh-CN':'简体中文','zh-TW':'繁體中文',mn:'Монгол',th:'ไทย',vi:'Tiếng Việt',ar:'العربية',ru:'Русский',km:'ខ្មែរ',es:'Español',fr:'Français',it:'Italiano',az:'Azərbaycan dili'};
export const isLocale=(s:unknown):s is Locale=>typeof s==='string'&&(locales as readonly string[]).includes(s);
export function localeOf(s:{studio?:{locale?:string};lab:{language:string}}):Locale{return isLocale(s.studio?.locale)?s.studio.locale:isLocale(s.lab.language)?s.lab.language:'ko';}

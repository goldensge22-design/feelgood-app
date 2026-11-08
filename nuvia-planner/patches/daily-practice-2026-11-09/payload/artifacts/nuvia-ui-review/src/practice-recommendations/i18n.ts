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
import type {Locale} from '../studio/i18n/config';
import type {Stage} from '../studio/model';
export const resources:Record<Locale,Record<string,string>>={ko,en,ja,'zh-CN':zhCN,'zh-TW':zhTW,mn,th,vi,ar,ru,km,es,fr,it,az};
export function text(locale:string,key:string):string{
 const value=resources[locale as Locale]?.[key];
 if(!value)throw Error('Missing practice translation: '+locale+'/'+key);
 return value;
}
export const content=(locale:string,id:string,field:'title'|'action'|'confirm')=>text(locale,id+'.'+field);
export const ageContent=(locale:string,stage:Stage,field:'items'|'scope'|'context')=>text(locale,stage+'.'+field);

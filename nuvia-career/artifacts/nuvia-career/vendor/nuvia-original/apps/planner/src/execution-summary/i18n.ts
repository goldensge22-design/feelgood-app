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
export const summaryResources:Record<string,Record<string,string>>={ko,en,ja,'zh-CN':zhCN,'zh-TW':zhTW,mn,th,vi,ar,ru,km,es,fr,it,az};
export function summaryText(locale:string,key:string){const v=summaryResources[locale]?.[key];if(!v)throw Error('Missing execution-summary translation: '+locale+'/'+key);return v;}

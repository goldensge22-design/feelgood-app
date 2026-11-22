import ko from './locales/ko.json';import en from './locales/en.json';import ja from './locales/ja.json';import zhCN from './locales/zh-CN.json';import zhTW from './locales/zh-TW.json';
import mn from './locales/mn.json';import th from './locales/th.json';import vi from './locales/vi.json';import ar from './locales/ar.json';import ru from './locales/ru.json';
import km from './locales/km.json';import es from './locales/es.json';import fr from './locales/fr.json';import it from './locales/it.json';import az from './locales/az.json';
import jobReview from './job-review-locales.json';
import jobReviewWarning from './job-review-warning.json';
export const labResources:Record<string,Record<string,string>>={ko,en,ja,'zh-CN':zhCN,'zh-TW':zhTW,mn,th,vi,ar,ru,km,es,fr,it,az};
for(const [locale,messages] of Object.entries(jobReview))Object.assign(labResources[locale],messages);
for(const [locale,message] of Object.entries(jobReviewWarning))labResources[locale].jobReviewWarning=message;
/** Placeholders carry student-confirmed original names; those are never translated. */
export function labText(locale:string,key:string,params:Record<string,string|number>={}){
 const v=labResources[locale]?.[key];if(!v)throw Error('Missing lab-daily translation: '+locale+'/'+key);
 return v.replace(/\{(\w+)\}/g,(_,k)=>k in params?String(params[k]):'{'+k+'}');
}
/** Only explicitly marked product SAMPLE data interprets `@sample:<key>`.
 * Real student-entered text is unchanged, even if it happens to use that prefix. */
export const SAMPLE='@sample:';
export const sampleText=(locale:string,v:string,productSample=false)=>productSample&&v.startsWith(SAMPLE)?labText(locale,'sample.'+v.slice(SAMPLE.length)):v;

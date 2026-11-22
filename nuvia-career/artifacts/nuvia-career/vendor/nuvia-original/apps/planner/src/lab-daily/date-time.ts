import {intlDate} from '../studio/i18n/runtime';
import type {Locale} from '../studio/i18n/config';
/** System timestamp, never student text. Guard unsupported mn/km on Windows.
 * Reuse the common formatter, force Gregorian/Latin digits/24-hour clock.
 * If an engine still emits words or a day-period, return neutral numeric parts. */
export function formatLabConfirmation(value:string,locale:string,timeZone:string){
 const options:Intl.DateTimeFormatOptions={timeZone,calendar:'gregory',numberingSystem:'latn',
  year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'};
 const effective=Intl.DateTimeFormat.supportedLocalesOf([locale]).length?locale:'en';
 const result=intlDate(value,options,effective as Locale);
 if(/^[0-9\s/.,:\-\u200e\u200f\u061c]+$/.test(result))return result;
 const parts=new Intl.DateTimeFormat('en',options).formatToParts(new Date(value));
 const part=(t:Intl.DateTimeFormatPartTypes)=>parts.find(p=>p.type===t)?.value??'';
 return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}

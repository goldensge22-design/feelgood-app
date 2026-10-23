import resource from './resources.json';
import type {Locale} from '../studio/i18n/config';
export type LibraryKey='nav'|'unavailable'|'review'|'language'|'occupation'|'kind'|'daily'|'simulation'|'task'|'attach'|'newTask'|'linked'|'answers'|'saved'|'save'|'error'|'reported'|'pending'|'confirm'|'personal'|'reportTitle'|'viewTask'|'middleHelp'|'highHelp'|'adultHelp';
export function libText(locale:Locale,key:LibraryKey){
 const value=resource[locale][resource.keys.indexOf(key)];
 if(!value)throw Error(`Missing library UI translation: ${locale}/${key}`);
 return value;
}

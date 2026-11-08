import type {PersonalState} from '../studio/model';
import {localeOf} from '../studio/i18n/config';
import {libText} from '../planner-library/i18n';

// The public bundle deliberately imports NO draft catalog or binding data.
export const contextOf=(_state:PersonalState,_id:string):undefined=>undefined;
export function applyLibrary(state:PersonalState,_action:unknown,_at:string,_review:boolean):never {
 throw Error(libText(localeOf(state),'unavailable'));
}
export function validateLibrary(state:PersonalState){
 if(state.mode!=='personal'||Object.keys(state.studio?.libraryAttachments??{}).length||
    Object.values(state.studio?.sources??{}).some(s=>s.snapshot.practiceContext&&!(s.snapshot.practiceContext==='daily-practice'&&state.studio?.practice?.attachments[s.cardId]))){
  throw Error(libText(localeOf(state),'unavailable'));
 }
}

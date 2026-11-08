import type {Stage,Target} from '../studio/model';
import {templateIds} from './model';
export const templates=templateIds.map(id=>({id,target:id.split('.')[0] as Target,version:'daily-practice/1',contentReview:'ai-draft',efficacy:'not-established'}));
export const ageDesign:Record<Stage,{minutes:number;objects:number;steps:number;scope:'picture-and-one-action'|'school-and-short-reason'|'study-and-explanation'|'deadlines-and-conditions'|'life-work-and-transfer'}>={
 elementary_1_3:{minutes:3,objects:2,steps:2,scope:'picture-and-one-action'},
 elementary_4_6:{minutes:5,objects:3,steps:3,scope:'school-and-short-reason'},
 middle:{minutes:7,objects:3,steps:3,scope:'study-and-explanation'},
 high:{minutes:10,objects:4,steps:4,scope:'deadlines-and-conditions'},
 adult:{minutes:10,objects:4,steps:5,scope:'life-work-and-transfer'},
};
/** Calendar and ownership context are not task-internal action steps. */
export const stepOffset=(stage:keyof typeof ageDesign)=>stage==='high'?2:stage==='adult'?3:0;
export function previewSteps(stage:keyof typeof ageDesign,target:string,details:string[]){
 return target==='successive'?details.slice(stepOffset(stage)).map(v=>v.trim()).filter(Boolean):undefined;
}

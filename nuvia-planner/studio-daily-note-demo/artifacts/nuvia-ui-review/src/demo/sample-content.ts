import samples from './sample-content.json';
import type {Audience} from './audiences';
import {student} from '../studio/domain';
import type {PersonalState} from '../studio/model';
import type {Locale} from '../studio/i18n/config';

type Sample={title:string;subject:string};
const content=samples.content as Record<Locale,Record<Audience,Sample>>;
const knownTitles=new Set(Object.values(content).flatMap(group=>Object.values(group).map(item=>item.title)));

// Project only our synthetic fixture for display. Never rewrite stored student input.
export function localizedDemoState(state:PersonalState,audience:Audience,locale:Locale):PersonalState{
 const card=student(state).cards[0];
 if(!card||!knownTitles.has(card.title))return state;
 const target=content[locale]?.[audience];
 if(!target||card.title===target.title)return state;
 const next=structuredClone(state);
 const display=student(next).cards[0];
 const originalTitle=display.title;
 display.title=target.title;
 if(display.goal===originalTitle)display.goal=target.title;
 if(Object.values(content).some(group=>group[audience].subject===display.subject))display.subject=target.subject;
 // Synthetic plan snapshots are created by the demo fixture. User-edited snapshots stay untouched.
 for(const item of display.history){
  if(item.reason!=='최초 계획')continue;
  try{const plan=JSON.parse(item.plan);if(plan.title===originalTitle){plan.title=target.title;if(plan.goal===originalTitle)plan.goal=target.title;plan.subject=target.subject;item.plan=JSON.stringify(plan);}}catch{/* Preserve unknown history. */}
 }
 for(const run of student(next).runs){if(run.cardId===display.id&&run.initialPlan===originalTitle)run.initialPlan=target.title;}
 for(const entry of next.entries){if(entry.cardTitle===originalTitle)entry.cardTitle=target.title;}
 return next;
}

export const sampleTranslationStatus=samples.status;

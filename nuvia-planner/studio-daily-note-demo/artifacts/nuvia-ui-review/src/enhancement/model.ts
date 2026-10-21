import type {Axis,Assessment} from '../official/adaptive/engine';
export type {Axis,Assessment};
export type Target=Axis|'integrated';
export type Stage=Assessment['educationStage'];
export type Actor='teacher'|'student-a'|'student-b';
export type Domain='학습'|'생활'|'업무';
export interface Evidence {
  round:number; planConfirmed:boolean; planChanged:boolean; actionSelected:boolean; linksConfirmed:boolean;
  stepsConfirmed:boolean; progressed:string[]; skipped:boolean;
}
export interface Card {
  id:string; title:string; subject:string; goal:string; scope:string; firstAction:string;
  method:string; condition:string; alternative:string; reflection:string; minutes:number;
  date:string; startTime:string; deadline:string; middleDeadline:string; owner:string;
  dependency:string; waiting:boolean; handoff:string; domain:Domain; status:'planned'|'done';
  steps:{id:string;title:string;done:boolean}[]; links:string[]; linkItems:Record<string,string>; relationship:string;
  evidence:Evidence; history:{at:string;reason:string;plan:string}[];
  sourceClassId?:string; repeat:'none'|'daily'|'weekdays';
}
export interface Run {
  id:string; practiceId:string; cardId:string; round:number; target:Target;
  support:Axis|'universal'|'none'; phase:'running'|'paused'|'review'|'closed';
  startedAt:string; runningSince:string; segments:{start:string;end:string}[];
  budgetMinutes:number; flag:string; thoughts:string; returns:number;
  initialPlan:string; actualMinutes?:number; completion?:'yes'|'no';
  evidenceStatus?:'performed'|'skipped'|'unobserved';
  optionalAttention?:'used'|'not_applicable'|'unobserved'; reflection:string;
  nextMethod:string; feelingBefore:string; feelingAfter:string; helpRequested:boolean;
  supportHistory:{at:string;support:Axis|'universal'|'none';reduced:boolean}[];
}
export interface Experience {
  id:string; cardId:string; runId:string; fact:string; situation:string; role:string;
  action:string; result:string; selected:boolean; createdAt:string;
}
export interface Goal {id:string;far:string;middle:string;weekly:string;date:string;status:'active'|'paused';cardId?:string;}
export interface Method {id:string;name:string;support:Axis|'universal'|'none';helpful:'yes'|'no'|'unsure';note:string;runId:string;}
export interface Student {
  id:'student-a'|'student-b'; name:string; stage:Stage; assessment:Assessment|null;
  officialType?:{id:string;axes:Record<Axis,'high'|'mid'|'low'>};
  difficulty:Axis; round:number; creditedPractices:string[]; supportChoice:'official'|'none'|Axis;
  reduceHelp:boolean; dailyCapacity:number; cards:Card[]; runs:Run[]; experiences:Experience[];
  methods:Method[]; goals:Goal[]; joined:string[]; campDays:Record<string,1|2>; comparison:'agree'|'different'|'unsure'|'';
  comparisonNote:string; exploration:{first:string;second:string;common:string;different:string;question:string;action:string};
}
export interface Lesson {
  id:string; title:string; code:string; template:'45'|'90'|'overnight'; minutes:number; startDate:string; endDate:string;
  activities:string; published:boolean; ended:boolean; members:string[]; createdAt:string;
}
export interface Shared {
  id:string; classId:string; studentId:string; cardId:string; title:string;
  fields:{goal?:string;method?:string;reflection?:string;experience?:string};
  at:string; feedback:{id:string;text:string;nextDate:string;at:string}[];
}
export interface HelpRequest {id:string;studentId:string;classId:string;cardId:string;point:string;need:string;status:'open'|'answered';answer:string;nextDate:string;}
export interface LabState {
  schema:'nuvia-enhancement-1'; owner:'synthetic-lab-only'; labId:string; active:Actor; language:'ko'|'en'|'km'|'ar';
  students:Record<'student-a'|'student-b',Student>; lessons:Lesson[]; shared:Shared[]; requests:HelpRequest[];
}
export type ActionName=
 'role'|'language'|'student.settings'|'student.general'|'student.comparison'|'student.exploration'|
 'card.create'|'card.update'|'card.move'|'card.plan'|'card.action'|'card.links'|'card.steps'|'card.progress'|
 'card.skip'|'card.repeat'|'run.start'|'run.pause'|'run.flag'|'run.thought'|'run.resume'|'run.review'|'run.close'|
 'method.save'|'method.choose'|'goal.save'|'goal.schedule'|'experience.save'|'lesson.create'|'lesson.update'|
 'lesson.publish'|'lesson.end'|'lesson.join'|'lesson.leave'|'lesson.card'|'lesson.day'|'share.save'|'share.withdraw'|
 'feedback.save'|'help.create'|'help.answer'|'qa.profile';
export interface Command {type:ActionName;[key:string]:any;}
export const AXIS_NAMES:Record<Target,string>={planning:'할 만큼 정하기',attention:'지금 한 가지',simultaneous:'전체 연결하기',successive:'단계대로 해보기',integrated:'계획하고 해보기'};
export const STAGE_NAMES:Record<Stage,string>={elementary_1_3:'초등 1~3학년',elementary_4_6:'초등 4~6학년',middle:'중학생',high:'고등학생',adult:'대학·성인'};
export const SUPPORT_NAMES:Record<Axis|'universal'|'none',string>={planning:'목표와 완료 기준',attention:'핵심만 또렷하게',simultaneous:'전체 지도와 관계 묶음',successive:'현재와 다음 단계',universal:'짧은 공통 안내',none:'도움 없이 바로'};

import type {LabState,Target,Axis,Stage,Command as LegacyCommand} from '../enhancement/model';
import type {Insights,InsightsAction} from './insights';
import type {StudioData,StudioAction} from './studio-model';
import type {TaskInput} from './task-plan';
import type {LibraryAction} from '../planner-library/model';
export type {Target,Axis,Stage,LegacyCommand};
export type Status='performed'|'skipped'|'unobserved';
export interface Meta {kind:string;examDate:string;weeklyScope:string;materials:string;nextPosition:string;output:string;difficulty:string;proposal?:string;originDraft?:string;helpPreference?:string}
export interface Agreement {id:string;month:string;axis:Target;count:number;at:string;reason:string;after:string;previousId?:string}
export interface Entry {id:string;practiceId:string;runId:string;axis:Target;status:Status;localDate:string;originalDate:string;enteredAt:string;cardTitle:string;proof:string[];optionalAttention:string;output:string;feeling:string;difficulty:string;assessment:unknown;corrections:{at:string;from:string;to:string;reason:string}[]}
export interface Draft {id:string;fromMonth:string;toMonth:string;axis:Target;count:number;chunk:string;method:string;help:string;date:string;reasons:string[];baseline:{count:number;chunk:string;method:string;help:string};status:'pending'|'accepted'|'deferred';createdAt:string;acceptedAt?:string;cardIds:string[]}
export interface PersonalState {schema:'nuvia-personal-monthly-1';mode:'personal'|'review';workspaceId:string;studentId:'student-a';lab:LabState;meta:Record<string,Meta>;agreements:Agreement[];entries:Entry[];drafts:Draft[];onboarding:boolean;lastSeen:string;recovery:boolean;assessmentHistory:{at:string;source:string;assessment:unknown}[];insights?:Insights;studio?:StudioData}
export type Action = StudioAction|InsightsAction|LibraryAction
 |{type:'legacy';command:LegacyCommand}
 |({type:'create';kind?:string}&TaskInput)
 |{type:'meta';cardId:string;changes:Partial<Meta>}
 |{type:'onboarding';done:boolean}
 |{type:'stage';stage:Stage}
 |{type:'agreement';month:string;axis:Target;count:number;reason:string}
 |{type:'correct';entryId:string;date:string;reason:string}
 |{type:'draft.make';month:string;axis:Target}
 |{type:'draft.edit';id:string;changes:Partial<Pick<Draft,'count'|'chunk'|'method'|'help'|'date'>>}
 |{type:'draft.defer';id:string}
 |{type:'draft.accept';id:string;conflict?:'keep'|'separate'|'none'}
 |{type:'split.accept';cardId:string;parts:{date:string;scope:string;minutes:number}[];reason:string}
 |{type:'review.fixture';scenario:'monthly'|'same-data'|'board'|'empty'};

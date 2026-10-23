import {z} from 'zod';
import {attachmentSchema,type Attachment} from '../planner-library/model';
import {locales,type Locale} from './i18n/config';
import type {TaskInput,Activity} from './task-plan';
import type {Card} from '../enhancement/model';
export const places=['shelf','desk','archive','collection','excluded'] as const;
export type Place=typeof places[number];
export type Tone='blue'|'purple'|'orange'|'sky';
export interface Placement {place:Place;previous?:Place;tone:Tone;timeSet?:boolean;estimateKnown?:boolean;timeEvidence?:boolean;activity?:Activity;archivedAt?:string;noticeAt?:string;noticeSession?:string;kept?:boolean;nextDate?:string}
export interface SourceSnapshot {
 practiceContext?:'simulation'|'daily-practice';
 title:string;subject:string;kind:string;goal:string;scope:string;firstAction:string;minutes:number;date:string;startTime:string;output:string;materials:string;
 changes:{at:string;reason:string}[];
 runs:{id:string;practiceId:string;at:string;closed:boolean;completed:boolean;returns:number;reflection:string;actualMs:number;nextPosition:string}[];
}
export interface RoadSource {id:string;cardId:string;month:string;version:number;available:boolean;initialKnown?:boolean;initial:SourceSnapshot;snapshot:SourceSnapshot;updatedAt:string}
export const experienceFields=['situation','difficulty','action','adjustment','result','learning'] as const;
export type ExperienceField=typeof experienceFields[number];
export interface RoadExperience {id:string;sourceId:string;sourceVersion:number;fields:Record<ExperienceField,string>;confirmed:boolean;selected:boolean;updatedAt:string}
export interface Sentence {id:string;text:string;experienceId:string;sourceId:string;sourceVersion:number;field:ExperienceField;confirmed:boolean;selected:boolean;edited:boolean}
export interface RoadDraft {id:string;key:string;createdAt:string;sentences:Sentence[]}
export interface StudioData {
 libraryAttachments?:Record<string,Attachment>;
 dailyNotes?:Record<string,{text:string;updatedAt:string}>;
 locale?:Locale;
 placements:Record<string,Placement>;selectedId:string;deskId:string;archiveReminders:boolean;appearance:'ivory'|'navy';
 lastNoticeSession:string;stageChosen?:boolean;lastActivity?:Activity;unknownRuns?:string[];creations?:Record<string,string>;sources:Record<string,RoadSource>;experiences:RoadExperience[];draft?:RoadDraft;
}
export type StudioAction=
 |{type:'studio.note';date:string;text:string}
 |{type:'studio.locale';locale:Locale}
 |{type:'studio.setup';stage:'middle'|'high'|'adult';title?:string;task?:TaskInput}
 |{type:'studio.estimate';cardId:string;minutes:number|null}
 |{type:'studio.editPlan';cardId:string;minutes:number|null;activity?:Activity;changes:Partial<Card>}
 |{type:'studio.select';cardId:string}|{type:'studio.place';cardId:string}
 |{type:'studio.archive';cardId:string;flag?:string;nextDate?:string}
 |{type:'studio.take';cardId:string}|{type:'studio.exclude';cardId:string}|{type:'studio.restore';cardId:string}
 |{type:'studio.keep';cardId:string}|{type:'studio.color';cardId:string;tone:Tone}
 |{type:'studio.settings';archiveReminders?:boolean;appearance?:'ivory'|'navy'}
 |{type:'studio.visit';sessionId:string}|{type:'studio.sync'}
 |{type:'studio.schedule';day:string;start:string}
 |{type:'roadmap.create';sourceId:string}
 |{type:'roadmap.edit';id:string;fields:Partial<Record<ExperienceField,string>>}
 |{type:'roadmap.refresh';id:string}|{type:'roadmap.confirm';id:string}|{type:'roadmap.select';id:string;selected:boolean}
 |{type:'roadmap.draft'}|{type:'roadmap.sentence';id:string;text?:string;selected?:boolean;confirmed?:boolean};
const text=z.string().max(20000),id=z.string().min(1).max(200),stamp=z.string().datetime();
const snapshot=z.object({practiceContext:z.enum(['simulation','daily-practice']).optional(),title:text,subject:text,kind:text,goal:text,scope:text,firstAction:text,minutes:z.number().min(0),date:text,startTime:text,output:text,materials:text,changes:z.array(z.object({at:stamp,reason:text}).strict()),runs:z.array(z.object({id,practiceId:id,at:stamp,closed:z.boolean(),completed:z.boolean(),returns:z.number().int().min(0),reflection:text,actualMs:z.number().min(0),nextPosition:text}).strict())}).strict();
export const studioSchema=z.object({
 libraryAttachments:z.record(z.string(),attachmentSchema).optional(),
 dailyNotes:z.record(z.string().refine(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)&&Number.isFinite(Date.parse(x))&&new Date(x+'T12:00:00Z').toISOString().slice(0,10)===x),z.object({text,updatedAt:stamp}).strict()).optional(),
 locale:z.enum(locales).optional(),
 placements:z.record(z.string(),z.object({place:z.enum(places),previous:z.enum(places).optional(),tone:z.enum(['blue','purple','orange','sky']),timeSet:z.boolean().optional(),estimateKnown:z.boolean().optional(),timeEvidence:z.boolean().optional(),activity:z.enum(['학습','생활','업무','기타']).optional(),archivedAt:stamp.optional(),noticeAt:stamp.optional(),noticeSession:text.optional(),kept:z.boolean().optional(),nextDate:text.optional()}).strict()),
 selectedId:text,deskId:text,archiveReminders:z.boolean(),appearance:z.enum(['ivory','navy']),lastNoticeSession:text,stageChosen:z.boolean().optional(),
 lastActivity:z.enum(['학습','생활','업무','기타']).optional(),unknownRuns:z.array(id).optional(),creations:z.record(z.string(),id).optional(),
 sources:z.record(z.string(),z.object({id,cardId:id,month:z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),version:z.number().int().min(1),available:z.boolean(),initialKnown:z.boolean().optional(),snapshot,initial:snapshot,updatedAt:stamp}).strict()),
 experiences:z.array(z.object({id,sourceId:id,sourceVersion:z.number().int().min(1),fields:z.object({situation:text,difficulty:text,action:text,adjustment:text,result:text,learning:text}).strict(),confirmed:z.boolean(),selected:z.boolean(),updatedAt:stamp}).strict()),
 draft:z.object({id,key:z.string().max(1000000),createdAt:stamp,sentences:z.array(z.object({id,text,experienceId:id,sourceId:id,sourceVersion:z.number().int().min(1),field:z.enum(experienceFields),confirmed:z.boolean(),selected:z.boolean(),edited:z.boolean()}).strict())}).strict().optional()
}).strict();

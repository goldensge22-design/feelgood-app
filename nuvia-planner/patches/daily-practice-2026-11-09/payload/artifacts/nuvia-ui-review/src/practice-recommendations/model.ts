import {z} from 'zod';
import type {Stage,Target,Axis} from '../studio/model';
import type {TaskInput} from '../studio/task-plan';
export type Help=Axis|'universal'|'none';
export const VERSION='daily-practice/1';
export const templateIds=['planning.prepare','planning.tidy','attention.choose','attention.find','simultaneous.positions','simultaneous.prepare','successive.event','successive.prepare','integrated.small','integrated.tomorrow'] as const;
export const stages=['elementary_1_3','elementary_4_6','middle','high','adult'] as const;
export interface Recommendation {id:typeof templateIds[number];stage:Stage;target:Target;help:Help;officialHelp:Help;basis:'result'|'general';minutes:number;version:string}
export interface PracticeAttachment {
 taskId:string;templateId:string;stage:Stage;target:Target;help:Help;officialHelp:Help;basis:'result'|'general';
 version:string;creationLocale:string;addedAt:string;source?:unknown;roundAtSelection:number;
 initial:{title:string;scope:string;firstAction:string;minutes:number};
 provided?:{title:boolean;firstAction:boolean;scope:boolean};
 supportChoiceAtAdd?:Axis|'official'|'none';
 reports:{at:string;runId:string;value:'yes'|'neutral'|'no'}[];
}
const help=z.enum(['planning','attention','simultaneous','successive','universal','none']);
export const practiceSchema=z.object({
 views:z.array(z.object({templateId:z.enum(templateIds),stage:z.enum(stages),at:z.string().datetime()}).strict()).max(2000),
 attachments:z.record(z.string(),z.object({
  taskId:z.string().min(1),templateId:z.enum(templateIds),stage:z.enum(stages),
  target:z.enum(['planning','attention','simultaneous','successive','integrated']),help,officialHelp:help,
  basis:z.enum(['result','general']),version:z.literal(VERSION),creationLocale:z.string(),addedAt:z.string().datetime(),source:z.unknown(),roundAtSelection:z.number().int().min(0),
  initial:z.object({title:z.string(),scope:z.string(),firstAction:z.string(),minutes:z.number().min(0)}).strict(),
  provided:z.object({title:z.boolean(),firstAction:z.boolean(),scope:z.boolean()}).strict().optional(),
  supportChoiceAtAdd:z.enum(['planning','attention','simultaneous','successive','official','none']).optional(),
  reports:z.array(z.object({at:z.string().datetime(),runId:z.string(),value:z.enum(['yes','neutral','no'])}).strict()),
 }).strict()),
}).strict();
export type PracticeData=z.infer<typeof practiceSchema>;
export type PracticeAction=
 |{type:'practice.view';templateId:string;stage:Stage}
 |{type:'practice.add';templateId:string;stage:Stage;help:Help;requestId:string;task:TaskInput;provided?:{title:boolean;firstAction:boolean;scope:boolean};details?:{deadline?:string;owner?:string;dependency?:string;handoff?:string;waiting?:boolean}}
 |{type:'practice.respond';cardId:string;value:'yes'|'neutral'|'no'};

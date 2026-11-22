export type LearningStage='school'|'university'|'unknown';
export type HubService={href:string|null;allowed:boolean};
export const HUB_KEYS:string[];
export function serviceHref(value:unknown,locale:string,allowedOrigins:string[]):string|null;
export function hubCards(stage:LearningStage,services:Record<string,HubService>):{id:string;label:string;secondary:boolean;href:string|null;allowed:boolean}[];

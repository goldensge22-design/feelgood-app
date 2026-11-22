import { z } from "zod";

export const scenarioLanguages = ["ko","en","ja","zh-CN","zh-TW","mn","th","vi","ar","ru","km","es","fr","it","az"] as const;
export const scenarioFamilies = ["software","manufacturing","administration","logistics","aviation"] as const;
export const scenarioInputSchema = z.object({
  language:z.enum(scenarioLanguages).default("ko"),
  type:z.enum(["job","daily","workplace","bundle"]).default("job"),
  family:z.enum(scenarioFamilies).default("software"),
  audience:z.enum(["secondary","university"]).default("university"),
  mode:z.enum(["solo","group"]).default("solo"),
  format:z.enum(["lecture","course"]).default("lecture"),
  support:z.enum(["independent","guided"]).optional(),
  minutes:z.number().int().min(20).max(30).default(25),
  participants:z.number().int().min(1).max(8).default(1),
  materialCount:z.number().int().min(2).max(4).optional(),
  companyId:z.string().max(100).optional(),
  jobId:z.string().max(100).optional(),
  timedDecision:z.boolean().optional(),
  decisionProfileId:z.string().max(100).optional(),
  decisionDifficulty:z.enum(["introductory","standard","advanced"]).optional(),
}).strict().superRefine((v,c)=>{
  if(v.mode==="solo"&&v.participants!==1)c.addIssue({code:"custom",path:["participants"],message:"solo_requires_one"});
  if(v.mode==="group"&&v.participants<2)c.addIssue({code:"custom",path:["participants"],message:"group_requires_two"});
}).transform(v=>({...v,
  support:v.support??(v.audience==="secondary"?"guided" as const:"independent" as const),
  materialCount:v.materialCount??(v.audience==="secondary"?2:3),
}));
export type ScenarioInput = z.infer<typeof scenarioInputSchema>;
export type ScenarioLanguage = typeof scenarioLanguages[number];
export type ScenarioFamily = typeof scenarioFamilies[number];
export type ScenarioSource = {url:string;title:string;summary:string;checkedAt:string;scope:string;language?:ScenarioLanguage};
export type ScenarioSection = {key:string;title:string;items:string[]};
export type ScenarioCardDocument = {
  timedDecision?:import("./timed-decision").TimedDecision;
  decisionPacket?: {
    caseId:string;factsVersion:string;fictional:true;
    documents:{id:string;actorId:string;author:string;issuedAt:string;
      facts:{key:string;label:string;rawValue:string}[];
      verification:{question:string;method:string;target:string}}[];
    changes:{afterOption:string;information:string;question:string;updates:Record<string,string>;actorId:string;issuedAt:string}[];
  };
  id:string; commonCardId:string; contentVersion:string; localizedVersion:string; ruleVersion:string; locale:ScenarioLanguage;
  type:"job"|"daily"|"workplace"; family:ScenarioFamily;
  input:ScenarioInput; title:string; recordKind:"daily_practice"|"job_simulation"|"consented_roleplay";
  officialFacts:ScenarioSource[]; companyMode:"official_context"|"generic"; companyName?:string;
  sections:ScenarioSection[];
  options:{id:string;text:string;benefit:string;tradeoff:string}[];
  changes:{afterOption:string;information:string;question:string}[];
  prompts:{key:string;label:string}[];
  rubric:string[]; createdAt:string; generator:"rules_not_ai";
};
export type ScenarioResponse = {
  attemptId:string;round:1;language:ScenarioLanguage;
  fields:Record<string,string>; chosenOption:string; status:"draft";
  contribution:string; studentApproved:boolean;
};
export const scenarioResponseSchema=z.object({
  attemptId:z.string().min(1).max(100),round:z.literal(1),
  language:z.enum(scenarioLanguages), fields:z.record(z.string().max(4000)).refine(v=>Object.keys(v).length<=12),
  chosenOption:z.enum(["","A","B","custom"]),status:z.literal("draft"),
  contribution:z.string().max(4000),studentApproved:z.boolean(),
}).strict();
export const scenarioMutationSchema=z.object({
  action:z.enum(["select","response","remove","reveal"]),expectedRevision:z.number().int().positive(),
  selected:z.boolean().optional(),response:scenarioResponseSchema.optional(),
  cognitiveStrategies:z.array(z.enum(["planning","attention","simultaneous","sequential"])).max(4).optional(),
}).strict();
export const scenarioExportSchema=z.object({
  requestId:z.string().min(8).max(100),includeResponses:z.boolean(),attemptId:z.string().max(100).optional(),
}).strict();
export type SavedScenarioCard = {
  cognitiveStrategies?:("planning"|"attention"|"simultaneous"|"sequential")[];
  selectionContext?:import("./timed-decision").DecisionSelectionContext;
  id:string;card:ScenarioCardDocument; selected:boolean; revision:number;
  responses:ScenarioResponse[]; createdAt:string;updatedAt:string;
  externalStatus:"not_connected";exportCount:number;
  disclosure?:import("./card-planner").CardDisclosure;
};
export type ScenarioLexicon = {
  ui:Record<string,string>;
  common:Record<string,string>;
  families:Record<ScenarioFamily,Record<string,string>>;
};

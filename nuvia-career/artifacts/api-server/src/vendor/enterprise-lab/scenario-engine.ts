import {createHash} from "node:crypto";
import {enterpriseScenario} from "@workspace/api-zod";
import type {enterpriseScenario as Types} from "@workspace/api-zod";
import {aviationScenarioSource} from "./aviation-scenario-context";
const {scenarioInputSchema,scenarioLexicons,scenarioDecisionPacket,scenarioOccupationPacket,packetDocumentText,canonicalScenarioCases,packetKo}=enterpriseScenario;
type ScenarioInput=Types.ScenarioInput;
type ScenarioCardDocument=Types.ScenarioCardDocument;
type ScenarioSource=Types.ScenarioSource;
type SavedScenarioCard=Types.SavedScenarioCard;

export const SCENARIO_RULE_VERSION="scenario-card-rules/1.2/2026-11-10";
export const SOURCE_CHECKED_AT="2026-11-09T15:48:29.175Z";
type CompanyContext={id:string;name:string;website?:string};
const digest=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
// Explicitly allowlisted official public-service contexts. No text fetched at generation
// time is executed, inserted as instructions, or used to infer private corporate culture.
export function officialScenarioContext(input:ScenarioInput,company?:CompanyContext):"ktl"|"cj"|null {
  if(!company||!input.companyId||company.id!==input.companyId)return null;
  let host="";try{host=new URL(company.website??"").hostname.toLowerCase();}catch{return null;}
  if(input.family==="software"&&/한국산업기술시험원|KTL/i.test(company.name)&&/(^|\.)ktl\.re\.kr$|(^|\.)ktlsw\.kr$/.test(host))return "ktl";
  if(input.family==="logistics"&&/CJ대한통운|씨제이대한통운/.test(company.name)&&/(^|\.)cjlogistics\.com$/.test(host))return "cj";
  return null;
}
export function generateScenarioDocuments(raw:unknown,company?:CompanyContext):ScenarioCardDocument[] {
  const input=scenarioInputSchema.parse(raw);
  if(input.timedDecision)throw Error("TIMED_DECISION_LIBRARY_NOT_MOUNTED");
  const lex=scenarioLexicons[input.language];
  if(!lex)throw new Error("unsupported_language");
  const c=lex.common,f=lex.families[input.family];
  const txt=(key:string)=>{if(!c[key])throw new Error(`missing_translation:${input.language}:${key}`);return c[key].replaceAll("{minutes}",String(input.minutes)).replaceAll("{participants}",String(input.participants));};
  const context=officialScenarioContext(input,company);
  const aviationSource=aviationScenarioSource(input,company);
  const facts:ScenarioSource[]=aviationSource?[aviationSource]:context?[{
    url:context==="ktl"?"https://www.ktlsw.kr/user/SW_Test/SW_Test_Info.do":"https://www.cjlogistics.com/ko/business/fulfillment",
    title:txt(context==="ktl"?"sourceTitleKtl":"sourceTitleCj"),
    summary:txt(context==="ktl"?"ktlFact":"cjFact"),checkedAt:SOURCE_CHECKED_AT,
    scope:txt(context==="ktl"?"ktlScope":"cjScope"),
  }]:[];
  // Bundles are explicitly requested; normal requests return one proposal, never 3 by force.
  const types=input.type==="bundle"?["job","daily","workplace"] as const:[input.type];
  return types.map(type=>{
    const daily=type==="daily",workplace=type==="workplace";
    const occupation=scenarioOccupationPacket(input.language,input.jobId,type);
    const packet=occupation?.packet??scenarioDecisionPacket(input.language,input.family,type);
    const count=input.materialCount??(input.audience==="secondary"?2:3);
    const artifact=occupation?.artifact??(daily?txt("dailyArtifact"):workplace?txt("workplaceArtifact"):f.artifact);
    const materials=packet.documents.slice(0,count).map(document=>packetDocumentText(packet,document));
    const optionPrefix=daily?"daily":"";
    const option=(id:"A"|"B")=>occupation?.options[id]??({
      id,text:daily?packet.dailyOptions![id]:f[`option${id}`],
      benefit:optionPrefix?txt(`${optionPrefix}Pro${id}`):f[`pro${id}`],
      tradeoff:optionPrefix?txt(`${optionPrefix}Con${id}`):f[`con${id}`],
    });
    const boundary=occupation?.boundary??txt(daily?"dailyBoundary":workplace?"workplaceBoundary":"jobBoundary");
    const sections=[
      {key:"role",title:txt("role"),items:[txt("roleText"),txt("authority"),packet.role,...(input.mode==="group"?[txt("constraintPeople")]:[]),...(workplace?[txt("workplaceTask")]:[]),...(facts.filter(s=>!s.language||s.language===input.language).map(s=>s.scope))]},
      {key:"goal",title:txt("goal"),items:[txt("goalText"),artifact,...(daily?[f.dailyTask]:[])]},
      {key:"conflict",title:txt("conflict"),items:[packet.conflict,txt("constraintTime"),...(input.audience==="university"?[txt("constraintResource")]:[])]},
      {key:"materials",title:txt("materials"),items:materials.map((m,i)=>`${i+1}. ${m}${i===0&&facts.length?`\n${!facts[0].language||facts[0].language===input.language?facts[0].summary+"\n":""}${facts[0].url} · ${facts[0].checkedAt}`:""}`)},
      {key:"alternatives",title:txt("alternatives"),items:[txt(input.support==="guided"?"guided":"independent")]},
      {key:"studentAction",title:txt("studentAction"),items:[txt("verifyInfo"),txt(input.mode==="group"?"groupHelp":"soloHelp")]},
      {key:"change",title:txt("change"),items:[txt("askChange")]},
      {key:"summary",title:txt("summary"),items:[artifact,txt("reflection")]},
      ...(daily?[{key:"dailyTransfer",title:txt("dailyTransfer"),items:[f.jobContext,f.dailyTask,f.transfer,f.professionDifference,boundary]}]:[]),
      {key:"safety",title:txt("safety"),items:[boundary,txt("noCost"),txt("safeChoices")]},
      {key:"schedule",title:txt("schedule"),items:[txt(input.format==="course"?"coursePlan":"lecturePlan"),txt("constraintTime")]},
      {key:"evidence",title:txt("evidence"),items:[txt(facts.length?"verifiedNotice":"genericNotice"),txt("fictionNotice"),txt("rulesNotice"),...(facts.filter(s=>!s.language||s.language===input.language).map(s=>s.summary))]},
    ];
    const changes=packet.changes.map(({afterOption,information,question})=>({afterOption,information,question}));
    // Own alternatives are valid: both distinct new facts are disclosed, without
    // pretending to infer the semantics of a student's free-written decision.
    changes.push({afterOption:"custom",information:changes.map(ch=>ch.information).join("\n"),question:txt("revise")});
    const prompts=["alternativeA","alternativeB","decision","execute","why","revise","reflection",...(input.mode==="group"?["groupRole","contribution"]:[])].map(key=>({key,label:txt(key==="groupRole"?"role":key)}));
    const stable={
      ruleVersion:SCENARIO_RULE_VERSION,locale:input.language,type,family:input.family,input,
      title:`${occupation?.title??f.title} · ${txt(daily?"dailyTransfer":workplace?"studentAction":"alternatives")}`,
      recordKind:daily?"daily_practice":workplace?"consented_roleplay":"job_simulation",
      officialFacts:facts,companyMode:facts.length?"official_context":"generic",
      ...(facts.length&&company?{companyName:company.name}:{}),
      sections,options:[option("A"),option("B")],changes,prompts,
      decisionPacket:{...packet,documents:packet.documents.slice(0,count)},
      rubric:["rubric1","rubric2","rubric3","rubric4","rubric5"].map(txt),generator:"rules_not_ai",
    };
    const {language:_locale,type:_requestedBundle,...semanticInput}=input;
    const version=digest({
      ruleVersion:SCENARIO_RULE_VERSION,input:semanticInput,type,
      officialContext:aviationSource??context,sourceCheckedAt:aviationSource?.checkedAt??(context?SOURCE_CHECKED_AT:null),
      canonicalFamily:scenarioLexicons.ko.families[input.family],canonicalCommon:scenarioLexicons.ko.common,
      canonicalDecisionCases:canonicalScenarioCases,canonicalDecisionText:packetKo,
      canonicalOccupation:scenarioOccupationPacket("ko",input.jobId,type),
    });
    const localizedVersion=digest(stable);
    return {...stable,id:`scn-${localizedVersion.slice(0,24)}`,commonCardId:`activity-${version.slice(0,24)}`,
      contentVersion:version,localizedVersion,createdAt:new Date().toISOString()} as ScenarioCardDocument;
  });
}
export function wrapScenario(card:ScenarioCardDocument):SavedScenarioCard{
  return {id:card.id,card,selected:false,revision:1,responses:[],disclosure:{historyStatus:"recorded",revision:0,opened:[]},createdAt:card.createdAt,updatedAt:card.createdAt,externalStatus:"not_connected",exportCount:0};
}
export function scenarioExport(record:SavedScenarioCard,includeResponses:boolean,attemptId?:string){
  const practiceDraft=includeResponses?record.responses.find(r=>r.studentApproved&&(!attemptId||r.attemptId===attemptId))??null:null;
  return {
    contractVersion:"scenario-handoff/1.0",ownerProgram:"dcas-company-job-lab",
    cardId:record.card.commonCardId,renditionId:record.id,
    contentVersion:record.card.contentVersion,localizedVersion:record.card.localizedVersion,ruleVersion:record.card.ruleVersion,
    deduplicationKey:`${record.card.commonCardId}:${record.card.contentVersion}`,
    recordKind:record.card.recordKind,language:record.card.locale,card:record.card,
    selection:{selected:record.selected},registration:{status:"not_connected",externalReceipt:null},
    practiceDraft,
    execution:{status:"not_recorded_here",canonicalProgram:"planner",verified:false},
    // Downstream MUST bind authentication + camp ownership from its own verified context,
    // never from an unsigned file. No student identifiers or campus credentials exported.
    importRequirements:{verifiedAccountBinding:true,campOwnershipCheck:true,explicitStudentConsent:true,
      idempotencyFields:["cardId","contentVersion"],classroomFlowV3:"external_patch_reported_not_installed_here"},
  };
}

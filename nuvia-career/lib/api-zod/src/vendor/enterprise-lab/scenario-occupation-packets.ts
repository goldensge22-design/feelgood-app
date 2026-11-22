import type {ScenarioLanguage} from "./scenario-model";
import {scenarioDecisionPacket} from "./scenario-packets";
import {occupationCases,scenarioOccupationFamily,scenarioOccupationIds,scenarioOccupationName,type ScenarioOccupationId} from "./scenario-occupations";
import {occupationText} from "./scenario-occupation-locales";
export function scenarioOccupationPacket(language:ScenarioLanguage,jobId:string|undefined,type:"job"|"daily"|"workplace"){
 if(!jobId||!(scenarioOccupationIds as readonly string[]).includes(jobId))return null;
 const id=jobId as ScenarioOccupationId,definition=occupationCases[id],l=occupationText(language);
 const packet=scenarioDecisionPacket(language,scenarioOccupationFamily(id)!,type);
 const subject=l.labels[definition.subject],artifact=l.artifacts[definition.artifact];
 const question=packet.changes[0].question;
 packet.caseId="occupation-"+id+"-"+type;packet.factsVersion="occupation-decision-packets/1.0";
 packet.role=scenarioOccupationName(language,id)+" · "+l.boundary;
 packet.conflict=`${subject}: ${l.uncertain}. ${l.ask}.`;
 packet.documents=packet.documents.map((document,index)=>({...document,
  facts:index<2?Object.entries(index===0?definition.a:definition.b).map(([key,rawValue])=>({key,label:l.labels[key],rawValue})):document.facts,
  verification:{...document.verification,question:`${question} (${subject})`}}));
 packet.changes=definition.updates.map((updates,index)=>({afterOption:index===0?"A":"B",
  information:[packet.fictionNotice,`${packet.metadataLabels.author}: ${packet.documents[2].author} · ${packet.metadataLabels.issued}: 2026-11-10T09:${index===0?"40":"45"}:00+09:00`,
   ...Object.entries(updates).map(([key,value])=>`${l.labels[key]}: ${value}`)].join("\n"),
  question:`${question} (${artifact})`,updates,actorId:"actorLead",issuedAt:`2026-11-10T09:${index===0?"40":"45"}:00+09:00`}));
 const options={
  A:{id:"A",text:`${l.compare}: ${subject} → ${artifact}`,benefit:l.trace,tradeoff:l.uncertain},
  B:{id:"B",text:`${l.ask}: ${subject} → ${artifact}`,benefit:l.authority,tradeoff:l.delay},
 };
 if(type==="daily")packet.dailyOptions={A:options.A.text,B:options.B.text};
 return {packet,subject,artifact,boundary:l.boundary,title:scenarioOccupationName(language,id),options};
}

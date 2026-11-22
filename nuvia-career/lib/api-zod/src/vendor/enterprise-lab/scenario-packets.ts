import type {ScenarioFamily,ScenarioLanguage} from "./scenario-model";
import {packetLexicons} from "./scenario-packet-locales";
export const PACKET_FACTS_VERSION="decision-packets/1.1";
type Values=Record<string,string>;
type Case={role:string;verify:string;params:Values;a:Values;b:Values;changes:[Values,Values];daily:boolean;family:ScenarioFamily};
const job:Record<ScenarioFamily,Case>={
 software:{family:"software",daily:false,role:"roleSoftware",verify:"verifySoftware",
  params:{normal:"<3 s",slow:"1",measured:"3.4 s"},
  a:{revision:"2",criterion:"<3 s"},b:{slow:"1",measured:"3.4 s",trials:"4/5"},
  changes:[{normal:"<3 s",measured:"3.4 s",scope:"normal"},{slow:"1",measured:"3.4 s",scope:"slow"}]},
 manufacturing:{family:"manufacturing",daily:false,role:"roleManufacturing",verify:"verifyManufacturing",
  params:{required:"24",observed:"23",uncertain:"1"},
  a:{required:"24",allowedFrontScratches:"0"},b:{observed:"23",uncertain:"1"},
  changes:[{observed:"24",frontScratches:"1"},{observed:"23",uncertain:"1",otherTray:"1"}]},
 administration:{family:"administration",daily:false,role:"roleAdministration",verify:"verifyAdministration",
  params:{timeA:"13:00–15:00",placeA:"101",timeB:"14:00–16:00",placeB:"204",stairsFree:"3"},
  a:{revision:"1",time:"13:00–15:00",place:"101",floor:"1"},b:{revision:"2",time:"14:00–16:00",place:"204",floor:"2",elevator:"0",visitors:"31",stairsFree:"3"},
  changes:[{roomAvailable:"14:30"},{staff:"1"}]},
 logistics:{family:"logistics",daily:false,role:"roleLogistics",verify:"verifyLogistics",
  params:{quantityA:"40",quantityB:"34",orders:"3",perOrder:"12",deadline:"11:00"},
  a:{quantity:"40",orders:"3",perOrder:"12",deadline:"11:00"},b:{observed:"34",issued:"09:20"},
  changes:[{deadline:"10:30",end:"12:00",available:"34"},{amendment:"2",available:"36"}]},
 aviation:{family:"aviation",daily:false,role:"roleAviation",verify:"verifyAviation",
  params:{departure:"17:00",openA:"120",openB:"90",point:"B"},
  a:{departure:"17:00",openBefore:"120",deskOpen:"15:00"},b:{openBefore:"90",deskOpen:"15:30",help:"2",point:"B"},
  changes:[{deskOpen:"15:30",point:"C",help:"2"},{prep:"15:00",deskOpen:"15:30"}]},
};
const daily:Record<ScenarioFamily,Case>={
 software:{family:"software",daily:true,role:"roleDailySoftware",verify:"verifyDailySoftware",
  params:{slidesA:"5",slidesB:"4",references:"2"},a:{revision:"1",slides:"5"},b:{revision:"2",slides:"4",references:"2"},
  changes:[{slidesB:"4",references:"2",optionalSlides:"1"},{slides:"6",references:"2"}]},
 manufacturing:{family:"manufacturing",daily:true,role:"roleDailyManufacturing",verify:"verifyDailyManufacturing",
  params:{quantityA:"12",quantityB:"10"},a:{quantity:"12"},b:{observed:"10"},
  changes:[{amendment:"2",available:"12"},{quantityB:"10",uncertain:"2",usable:"8"}]},
 administration:{family:"administration",daily:true,role:"roleDailyAdministration",verify:"verifyDailyAdministration",
  params:{timeA:"16:00",placeA:"101",timeB:"16:30",placeB:"204"},a:{time:"16:00",place:"101"},b:{time:"16:30",place:"204"},
  changes:[{prep:"16:00",entry:"16:30"},{roomAvailable:"17:00"}]},
 logistics:{family:"logistics",daily:true,role:"roleDailyLogistics",verify:"verifyDailyLogistics",
  params:{required:"8",milk:"3",water:"8"},a:{required:"8",visitors:"8"},b:{milk:"3",water:"8"},
  changes:[{amendment:"2",milk:"5",required:"8"},{visitors:"8",uncertain:"2",water:"8"}]},
 aviation:{family:"aviation",daily:true,role:"roleDailyAviation",verify:"verifyDailyAviation",
  params:{timeA:"14:00",placeA:"101",timeB:"14:30",placeB:"204"},a:{time:"14:00",place:"101",capacity:"30"},b:{time:"14:30",place:"204",visitors:"30"},
  changes:[{prep:"14:00",entry:"14:30"},{roomAvailable:"14:45"}]},
};
export const canonicalScenarioCases={job,daily};
const capital=(s:string)=>s[0].toUpperCase()+s.slice(1);
export function scenarioDecisionPacket(language:ScenarioLanguage,family:ScenarioFamily,type:"job"|"daily"|"workplace"){
 const definition=(type==="daily"?daily:job)[family],texts=packetLexicons[language];
 if(!texts)throw new Error("missing_packet_language");
 const render=(key:string,values:Values=definition.params)=>{
  const template=texts[key];if(!template)throw new Error("missing_packet_translation:"+language+":"+key);
  return template.replace(/\{(\w+)\}/g,(_,param)=>{if(values[param]===undefined)throw new Error("missing_packet_value:"+key+":"+param);return values[param];});
 };
 const verify=render(definition.verify);
 const makeDocument=(id:string,titleKey:string,actorId:string,issuedAt:string,values:Values)=>({
  id,title:render(titleKey),actorId,author:render(actorId),issuedAt,
  facts:Object.entries(values).map(([key,rawValue])=>({key,label:render(key),rawValue})),
  verification:{question:verify,method:render("methodText"),target:[render("actorA"),render("actorB"),render("actorLead")].join(" / ")},
 });
 const date="2026-11-10T";
 const documents=[
  makeDocument("A","sourceA","actorA",date+"09:00:00+09:00",definition.a),
  makeDocument("B","sourceB","actorB",date+"09:20:00+09:00",definition.b),
  makeDocument("C","sourceC","actorLead",date+"09:25:00+09:00",{draftMinutes:"5"}),
  makeDocument("D","sourceD","actorLead",date+"09:30:00+09:00",{handoverLines:"2"}),
 ];
 const suffix=(definition.daily?"Daily":"")+capital(family);
 const changes=definition.changes.map((updates,index)=>{
  const values={...definition.params,...updates},afterOption=index===0?"A":"B";
  const actorId=family==="software"&&!definition.daily?(index===0?"actorA":"actorB"):"actorLead";
  const issuedAt=date+(index===0?"09:40:00":"09:45:00")+"+09:00";
  return {afterOption,information:[render("fiction"),`${render("author")}: ${render(actorId)} · ${render("issued")}: ${issuedAt}`,render("change"+suffix+afterOption,values)].join("\n"),
   question:render("question"),updates,actorId,issuedAt};
 });
 return {
  caseId:family+"-"+(definition.daily?"daily":"job-workplace"),factsVersion:PACKET_FACTS_VERSION,fictional:true as const,
  fictionNotice:render("fiction"),role:render(definition.role),conflict:render("conflict"),documents,changes,
  dailyOptions:definition.daily?{A:render("daily"+capital(family)+"A"),B:render("daily"+capital(family)+"B")}:null,
  metadataLabels:{author:render("author"),issued:render("issued"),verify:render("verify"),method:render("method"),target:render("target")},
 };
}
export function packetDocumentText(packet:ReturnType<typeof scenarioDecisionPacket>,document:ReturnType<typeof scenarioDecisionPacket>["documents"][number]){
 const l=packet.metadataLabels;
 return [document.title,packet.fictionNotice,`${l.author}: ${document.author} · ${l.issued}: ${document.issuedAt}`,
  ...document.facts.map(f=>`${f.label}: ${f.rawValue}`),
  `${l.verify}: ${document.verification.question}`,`${l.method}: ${document.verification.method}`,`${l.target}: ${document.verification.target}`].join("\n");
}

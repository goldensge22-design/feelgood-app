import {AGE_BANDS,ACTIONS,type ContentBundle,type MissionDefinition} from './types';
import {need} from './contracts';
export async function loadContent(locale='ko'):Promise<ContentBundle>{
 need(locale==='ko','LANGUAGE_NOT_PROVIDED');
 const [definitions,messages]=await Promise.all([import('../content/missions.json'),import('../content/locales/ko.json')]);
 const bundle={locale:'ko' as const,missions:definitions.default as MissionDefinition[],strings:messages.default};
 validateContent(bundle);return bundle;
}
export function validateContent(b:ContentBundle){
 const missions=new Set<string>(),conditions=new Set<string>();const version=/^\d+\.\d+\.\d+$/;
 const key=(k:string)=>need(typeof b.strings[k]==='string'&&b.strings[k].trim()&&!b.strings[k].includes('조건별 표현 없음'),'MISSING_TRANSLATION:'+k);
 for(const m of b.missions){need(!missions.has(m.id),'DUPLICATE_MISSION');missions.add(m.id);need(version.test(m.missionVersion)&&version.test(m.contentVersion),'INVALID_VERSION');key(m.titleKey);need(m.conditions.length===2,'TWO_CONDITIONS_REQUIRED');
  for(const c of m.conditions){need(!conditions.has(c.id)&&c.missionId===m.id,'CONDITION_ID_MISMATCH');conditions.add(c.id);need(c.missionVersion===m.missionVersion&&c.contentVersion===m.contentVersion,'CONDITION_VERSION_MISMATCH');need([1,2].includes(c.mechanismLevel)&&c.sourceIds.length&&c.sourceLocatorKeys.length,'MISSING_EVIDENCE');need(c.bookTemplateId==='nuvia.book.mission-8page.v1','BOOK_CONTRACT');need(c.resultIdPolicy.includes('sameResultId'),'RESULT_CONTRACT');need(ACTIONS.includes(c.activity.actionKind)&&c.activity.contractId===`action.${c.activity.actionKind}.r2`,'UNKNOWN_ACTION_CONTRACT');
   [...(c.historySummaryKey?[c.historySummaryKey]:[]),...(c.historyKeyPointKey?[c.historyKeyPointKey]:[]),c.conditionKey,c.actualHistoryKey,c.actualSceneKey,c.mechanismKey,c.directKey,c.shortTermKey,c.longTermKey,c.additionalKey,...c.sourceLocatorKeys,...c.alternateKeys,c.activity.promptKey,c.activity.observationKey].forEach(key);
   need(c.alternateKeys.length===2,'TWO_POSSIBILITIES_REQUIRED');
   for(const age of AGE_BANDS){const v=c.ageVariants[age];need(v&&v.ageBandRuleId===`nuvia.age.${age}.v1`,'INVALID_AGE_RULE');key(v.promptKey);key(v.instructionKey);}
   const ids=new Set<string>();for(const v of c.activity.materials){need(!ids.has(v.id),'DUPLICATE_MATERIAL');ids.add(v.id);key(v.labelKey);}
   if(c.semantic){for(const age of AGE_BANDS){const stages=c.semantic.stages[age];need(stages&&Object.keys(stages).length===8,'SEMANTIC_STAGES_REQUIRED');for(const screen of [...Object.values(stages),...Object.values(c.semantic.subquestions[age])]){key(screen.promptKey);key(screen.instructionKey);need(Object.keys(screen.semanticFields).length===18,'SEMANTIC_FIELDS_REQUIRED');need(screen.semanticFields.conditionId===c.id&&screen.semanticFields.missionId===m.id&&screen.semanticFields.ageBandRuleId===c.ageVariants[age].ageBandRuleId,'SEMANTIC_LINK_ERROR');}}need(c.semantic.predictionOptions.length===2,'PREDICTION_OPTIONS_REQUIRED');for(const option of c.semantic.predictionOptions)key(option.textKey);}
   need(!('prohibitedClaims' in c),'INTERNAL_FIELD_EXPOSED');
  }
 }
}
export function translator(strings:Record<string,string>){return (key:string)=>{need(Object.hasOwn(strings,key),'MISSING_TRANSLATION:'+key);return strings[key];};}

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {daily,families,teen} from './source.ko.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const hash=x=>crypto.createHash('sha256').update(String(x).replace(/\r\n/g,'\n')).digest('hex');
const check=process.argv.includes('--check');
const write=(p,v)=>{const s=typeof v==='string'?v:JSON.stringify(v,null,2)+'\n';const file=path.join(root,p);if(check){if(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==s)throw Error('STALE_GENERATED_FILE '+p);}else {fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,s);}};
const catalog=read('catalog.json'),baseCards=read('../cards.json'),baseMessages=read('../locales/ko.json'),baseManifest=read('../manifest.json'),behaviors=read('../behaviors.json');
const messages={},cards=[],bindings=[];
const key=(id,field,value)=>{const k=`library.expansion.${id}.${field}`;if(k in messages)throw Error('DUPLICATE_KEY '+k);messages[k]=value;return k;};
const notices={daily:'실제로 해본 행동만 기록해요. 하지 않은 행동이나 없었던 어려움을 만들어 쓰지 않아요.',adult:'가상 상황 연습입니다. 실제 직무 수행·자격·인지능력 향상의 증거가 아니며, 전문 판단이나 현장 절차를 대신하지 않아요.',teen:'학교에서 해보는 진로 탐색 연습입니다. 실제 직무 수행이나 능력 점수를 뜻하지 않아요. 다른 사람의 개인정보는 쓰지 않아요.'};
for(const [id,value] of Object.entries(notices))key('notice',id,value);
function add(id,kind,context,row,audiences,risk='general'){
 const [behaviorId,title,scenario,example]=row;
 const original=baseCards.find(c=>c.id==='daily-'+behaviorId);
 if(!original)throw Error('UNKNOWN_BEHAVIOR');
 const card={...structuredClone(original),id,kind,contextId:context,audiences,risk};
 card.text={...original.text,titleKey:key(id,'title',title),scenarioKey:key(id,'scenario',scenario),exampleKey:key(id,'example',example),noticeKey:`library.expansion.notice.${kind==='daily'?'daily':audiences.includes('middle')?'teen':'adult'}`};
 cards.push(card);return id;
}
for(const [slug,...row] of daily)add('daily-'+slug,'daily',null,row,['middle','high','university-adult']);
const familyDefs=Object.entries(families).map(([id,f])=>({id,labelKey:key('family-'+id,'label',f.label),sourceGroups:f.groups,templateIds:f.cards.map((row,i)=>add(`adult-${id}-${i+1}`,'job-simulation','family-'+id,row,['university-adult'],f.risk||'general'))}));
const allDaily=[...baseCards,...cards].filter(c=>c.kind==='daily');
function dailyLinks(ids,index){return ids.map(id=>{const b=cards.find(c=>c.id===id).behaviorId;const options=allDaily.filter(c=>c.behaviorId===b);return options[index%options.length].id;});}
function binding(id,population,sourceId,templateIds,index,extra={}){
 const record={id,version:'1.0.0',population,sourceRef:{id:sourceId,version:catalog.sourceCommit},status:'draft',reviewedBy:null,reviewedAt:null,domainReviewRequired:true,domainReviewedBy:null,domainReviewedAt:null,templateIds,dailyTemplateIds:dailyLinks(templateIds,index),...extra};
 bindings.push(record);return record;
}
const displayCatalog={adult:[],teen:[]};
catalog.adult.jobs.forEach((j,i)=>{
 const matches=familyDefs.filter(f=>f.sourceGroups.includes(j.sourceGroup));if(matches.length!==1)throw Error('AMBIGUOUS_FAMILY '+j.id+' '+j.sourceGroup);
 binding('adult-'+j.id,'adult',j.id,matches[0].templateIds,i,{familyId:matches[0].id,mappingBasis:'source-group-editorial-candidate-not-job-competency-validation'});
 displayCatalog.adult.push({id:j.id,labelKey:key('occupation-adult-'+j.id,'label',j.label)});
});
if(Object.keys(teen).length!==catalog.teen.jobs.length)throw Error('TEEN_COVERAGE');
catalog.teen.jobs.forEach((j,i)=>{
 const rows=teen[j.label];if(!rows||rows.length!==3)throw Error('TEEN_MISSING '+j.label);
 const ids=rows.map((row,n)=>add(`${j.id}-${n+1}`,'job-simulation',j.id,row,['middle','high']));
 binding(j.id,'teen',j.id,ids,i,{mappingBasis:'exact-source-preview-label-school-exploration-not-occupation-top5'});
 displayCatalog.teen.push({id:j.id,labelKey:key('occupation-'+j.id,'label',j.label)});
});
const scenarios=[...baseCards,...cards];
const counts={dailyOriginals:scenarios.filter(c=>c.kind==='daily').length,adultSharedScenarioOriginals:cards.filter(c=>c.contextId?.startsWith('family-')).length,teenSchoolScenarioOriginals:cards.filter(c=>c.audiences.includes('middle')&&c.kind==='job-simulation').length,legacyJobOriginals:baseCards.filter(c=>c.kind==='job-simulation').length,newOriginals:cards.length,totalStoredOriginals:scenarios.length,adultJobs:catalog.adult.jobs.length,adultScenarioConnections:bindings.filter(b=>b.population==='adult').reduce((n,b)=>n+b.templateIds.length,0),teenCareers:catalog.teen.jobs.length,teenScenarioConnections:bindings.filter(b=>b.population==='teen').reduce((n,b)=>n+b.templateIds.length,0),dailyConnections:bindings.reduce((n,b)=>n+b.dailyTemplateIds.length,0),adultFamilies:familyDefs.length,productionReleased:0};
counts.targetAvailabilityUnits=counts.dailyOriginals+counts.adultScenarioConnections+counts.teenScenarioConnections;
const registry=Object.fromEntries(Object.entries(messages).map(([k,v])=>[k,{sourceHash:hash(v),change:'NEW',locales:Object.fromEntries(baseManifest.requiredLocales.map(l=>[l,l==='ko'?'draft':'needs-review']))}]));
const preservedFiles=['manifest.json','behaviors.json','job-contexts.json','cards.json','locales/ko.json','contracts.ts','validate.mjs'];
const manifest={schema:'feelgood.planner.library-expansion/v1',namespace:'feelgood.planner',version:'1.1.0-draft',createdAt:'2026-10-23',status:'editorial-draft',sourceCommit:catalog.sourceCommit,baseLibraryCommit:'1d0f17bc178c203dac019953c8dc59179010eae8',runtimeConnected:false,productionEndpoint:null,aiCallsMade:0,automaticAiFallback:false,requiredLocales:baseManifest.requiredLocales,counts,sourceHash:hash(JSON.stringify(messages)),localeState:Object.fromEntries(baseManifest.requiredLocales.map(l=>[l,{status:l==='ko'?'draft':'needs-review',availableForProduction:false,resource:l==='ko'?'locales/ko.json':null}])),preservedFiles:Object.fromEntries(preservedFiles.map(p=>[p,hash(fs.readFileSync(path.join(root,'..',p)))]))};
write('cards.json',cards);write('bindings.json',bindings);write('families.json',familyDefs);write('display-catalog.json',displayCatalog);write('locales/ko.json',messages);write('translation-plan.json',registry);write('manifest.json',manifest);
const title=id=>{const c=scenarios.find(x=>x.id===id);return messages[c.text.titleKey]??baseMessages[c.text.titleKey];};
const rows=bindings.map(b=>{const j=(b.population==='adult'?catalog.adult.jobs:catalog.teen.jobs).find(j=>j.id===b.sourceRef.id);return `| ${b.population} | ${j.id} | ${j.label} | ${b.templateIds.map(id=>`${title(id)} (${id})`).join('<br>')} | ${b.dailyTemplateIds.map(title).join(' / ')} |`;});
write('CATALOG.md',`# 직무와 청소년 진로 연결 전체 목록\n\n편집 검토용 초안이다. 성인 ${counts.adultJobs}개 ID의 ${counts.adultScenarioConnections}개 연결은 ${counts.adultSharedScenarioOriginals}개 공유 상황 원본을 참조한다. 직무별 독립 전문 훈련 ${counts.adultScenarioConnections}종을 검증했다는 뜻이 아니다. 청소년 ${counts.teenCareers}개 진로에는 학교 중심 상황 ${counts.teenScenarioConnections}개를 연결한다. 기존 직무 예시 ${counts.legacyJobOriginals}개는 별도 보존한다.\n\n| 대상 | 원본 또는 내부 ID | 원본 명칭 | 상황 3개 | 연결한 일상카드 3개 |\n|---|---|---|---|---|\n${rows.join('\n')}\n`);
write('CARD_TEXTS.md',`# 추가 카드 한국어 검토 목록\n\n기존 12개 원본은 상위 SCENARIO_CATALOG.md에 보존한다. 아래 ${cards.length}개는 새 초안이며 전문 검수 및 번역 완료 전 운영 제공하지 않는다. 예시 응답은 유일한 정답이 아니다. 같은 행동의 질문은 기존 locale 키를 재사용한다.\n\n`+cards.map(c=>`## ${messages[c.text.titleKey]}\n\n- ID: ${c.id}\n- 상황: ${messages[c.text.scenarioKey]}\n- 목표: ${baseMessages[c.text.goalKey]}\n- 질문: ${c.text.promptKeys.map(k=>baseMessages[k]).join(' / ')}\n- 응답 예시: ${messages[c.text.exampleKey]}\n- 남길 행동: ${baseMessages[c.text.completionKey]}\n- 안내: ${messages[c.text.noticeKey]}\n`).join('\n'));
console.log(JSON.stringify({mode:check?'check':'build',counts,newTranslationKeys:Object.keys(messages).length},null,2));

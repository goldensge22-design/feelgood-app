import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {ko,ageContent} from '../src/content.mjs';
import {planningCopy} from '../src/locales/ko-planning.mjs';
import {reviewCopy as r} from '../src/locales/ko-review.mjs';
import {STEPS,createRun,evidenceComplete} from '../src/contracts.mjs';

const ages=['middle-school','high-school'];
const pageTitles=[ko.pageActual,ko.pageCondition,ko.pagePrediction,ko.pageThinking,ko.pageResult,ko.pageStory,ko.pageHistoryCompare,ko.pagePredictionCompare];
function entry(age){
 const c={...ageContent[age],...planningCopy.byAge[age]},high=age==='high-school';
 const sample=createRun('planning',1,age);
 sample.evidence={goal:'hear',method:'tell',outcomeSeen:true,decision:'keep'};
 const withoutWriting=evidenceComplete(sample);
 sample.evidence.reasonText='fixture';const reasonOnly=evidenceComplete(sample);
 sample.evidence.uncertaintyText='fixture';const reasonAndUncertainty=evidenceComplete(sample);
 const writing=[{prompt:planningCopy.reasonPrompt,hint:planningCopy.reasonHint,placeholder:planningCopy.reasonPlaceholder,maxLength:1500,required:true,context:r.context}];
 if(high)writing.push({prompt:planningCopy.uncertaintyPrompt,hint:planningCopy.uncertaintyHint,placeholder:planningCopy.uncertaintyPlaceholder,maxLength:1500,required:true});
 return {ageBand:age,ageLabel:planningCopy.ages[age],missionId:'gutenberg',conditionId:'gutenberg.c2',passArea:'planning',
  stages:[
   {id:STEPS[0],title:ko.actualTitle,body:[c.actualBody,c.actualFact],buttons:[ko.begin],completion:r.completion.actual},
   {id:STEPS[1],title:ko.conditionTitle,body:c.conditionBody,buttons:[ko.back,ko.next],completion:r.completion.condition},
   {id:STEPS[2],title:c.predictionTitle,instruction:c.predictionBody,choices:c.predictions,buttons:[ko.back,ko.next],completion:r.completion.prediction},
   {id:STEPS[3],question:c.planningQ,instruction:c.planningHelp,goals:high?planningCopy.highGoals:planningCopy.middleGoals,
    methods:c.methods.map((label,i)=>({id:['tell','time','own'][i],label,outcome:c.outcomes[['tell','time','own'][i]]})),
    help:{label:ko.help,body:c.planningHelp,instruction:r.hintPolicy},decisions:[ko.keep,ko.revise],writing,
    buttons:[ko.seeOutcome,ko.back,ko.help,ko.next],completion:high?r.completion.planningHigh:r.completion.planningMiddle,gateChecks:{withoutWriting,reasonOnly,reasonAndUncertainty}},
   {id:STEPS[4],title:ko.storyTitle,question:ko.storyPrompt,inputModes:[ko.draw,ko.write],initialMode:'text',maxLength:180,placeholder:ko.shortWrite,buttons:[ko.clear,ko.back,ko.saveStory],completion:r.completion.story},
   {id:STEPS[5],title:ko.historyCompareTitle,question:c.historyComparePrompt,actualHistory:c.actualKeyPoint,context:[ko.actualHistoryLabel,ko.myStoryLabel],placeholder:ko.speakOrDraw,maxLength:360,buttons:[ko.back,ko.later,ko.save],completion:r.completion.comparison,missing:ko.comparisonDeferred},
   {id:STEPS[6],title:ko.predictionCompareTitle,question:c.predictionComparePrompt,actualHistory:c.actualKeyPoint,context:[ko.firstPredictionLabel,ko.actualHistoryLabel],placeholder:ko.speakOrDraw,maxLength:360,buttons:[ko.back,ko.later,ko.save],completion:r.completion.comparison,missing:ko.comparisonDeferred},
   {id:STEPS[7],title:ko.bookTitle,pages:pageTitles,buttons:[ko.openBook,ko.previousPage,ko.nextPage,ko.closeBook],completion:r.completion.book}
  ]};
}
const sourceFiles=['src/content.mjs','src/locales/ko-planning.mjs','src/contracts.mjs','src/app.mjs'];
const source=await Promise.all(sourceFiles.map(async path=>({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')})));
const bundle={title:r.title,locale:'ko',generatedAt:new Date().toISOString(),source,scope:r.notes,variants:ages.map(entry)};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function htmlValue(v){if(Array.isArray(v))return `<ul>${v.map(x=>`<li>${htmlValue(x)}</li>`).join('')}</ul>`;if(v&&typeof v==='object')return `<dl>${Object.entries(v).filter(([k])=>k!=='id').map(([k,x])=>`<dt>${esc(r.labels[k]||k)}</dt><dd>${htmlValue(x)}</dd>`).join('')}</dl>`;return esc(v);}
const nav=bundle.variants.map(v=>`<a href="#${v.ageBand}">${v.ageLabel}</a>`).join(' · ');
const html=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${r.title}</title><style>body{font:18px/1.7 system-ui,sans-serif;max-width:980px;margin:auto;padding:24px;color:#18334c;background:#fffcf5}a{color:#214e92}section{margin:30px 0;border-top:2px solid #c7b688;padding-top:20px}article{padding:20px;margin:18px 0;background:white;border:1px solid #d1d5da;border-radius:12px;min-width:0}dt{font-weight:700;margin-top:14px}dd{margin-left:18px}li{margin-bottom:8px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px}nav{display:flex;flex-wrap:wrap;gap:12px}h1{font-size:clamp(25px,4vw,38px)}h2{font-size:27px}h3{font-size:23px}*{overflow-wrap:anywhere}</style></head><body><h1>${r.title}</h1><p>${r.intro}</p><nav>${nav}<a href="./review.json" download>${r.download}</a><a href="./review.md" download>${r.markdown}</a></nav><section><h2>${r.scope}</h2>${htmlValue(r.notes)}</section>${bundle.variants.map(v=>`<section id="${v.ageBand}"><h2>${v.ageLabel}</h2><a href="./?lang=ko&amp;age=${v.ageBand}&amp;qa=1">${r.play}</a>${v.stages.map((s,i)=>`<article><h3>${i+1}. ${esc(s.title||s.question)}</h3>${htmlValue(s)}</article>`).join('')}</section>`).join('')}<section><h2>${r.provenance}</h2><p>${r.generated}: ${bundle.generatedAt}</p><pre>${esc(JSON.stringify(source,null,2))}</pre></section></body></html>`;
function markdown(v,depth=0){if(Array.isArray(v))return v.map(x=>`${'  '.repeat(depth)}- ${typeof x==='object'?'\n'+markdown(x,depth+1):x}`).join('\n');if(v&&typeof v==='object')return Object.entries(v).filter(([k])=>k!=='id').map(([k,x])=>`${'  '.repeat(depth)}- ${r.labels[k]||k}: ${typeof x==='object'?'\n'+markdown(x,depth+1):x}`).join('\n');return String(v);}
const md=`# ${r.title}\n\n${r.intro}\n\n## ${r.scope}\n\n${markdown(r.notes)}\n\n${bundle.variants.map(v=>`## ${v.ageLabel}\n\n${v.stages.map((s,i)=>`### ${i+1}. ${s.title||s.question}\n\n${markdown(s)}`).join('\n\n')}`).join('\n\n')}\n\n## ${r.provenance}\n\n${markdown(source)}\n`;
await mkdir('dist',{recursive:true});
await writeFile('dist/review.html',html);await writeFile('dist/review.json',JSON.stringify(bundle,null,2)+'\n');await writeFile('dist/review.md',md);
const index=await readFile('dist/index.html','utf8');
await writeFile('dist/index.html',index.replace('<body>','<body><noscript><p><a href="./review.html">'+esc(r.title)+'</a></p></noscript>'));
console.log('Exported review.html, review.json, review.md (no learner data; no JavaScript required)');

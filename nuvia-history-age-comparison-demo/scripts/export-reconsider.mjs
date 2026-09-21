import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {reconsiderCopy as c} from '../src/locales/ko-reconsider.mjs';
import {planningCopy} from '../src/locales/ko-planning.mjs';
import {ageContent,ko} from '../src/content.mjs';
import {createRun,STEPS} from '../src/contracts.mjs';
import {initializeReview,writePrediction,lockPrediction,changePlan,reviewComplete,FACT,REVIEW_CONTRACT} from '../src/reconsideration.mjs';
import {esc} from '../src/reconsiderationView.mjs';
function gateChecks(age){
 let r=initializeReview(createRun('planning',1,age));r=writePrediction(r,'direct',0);r=writePrediction(r,'longTerm',1);r=lockPrediction(r,{direct:c.directOptions,longTerm:c.longOptions});
 for(const [a,v] of [['goal','hear'],['compare','tell'],['compare','time'],['method','tell'],['selectionReason','fixture'],['start'],['outcome'],['fact'],['unknownText','fixture'],['connectionText','fixture'],['judge'],['fit','undetermined'],['decision','keep']])r=changePlan(r,a,v);
 const reasonOnly=reviewComplete(r);r=changePlan(r,'limitText','fixture');r=changePlan(r,'judge');r=changePlan(r,'fit','undetermined');r=changePlan(r,'decision','keep');const complete=reviewComplete(r);
 r=changePlan(r,'decision','revise');const revisionWithoutChange=reviewComplete(r);
 return {reasonOnly,allRequiredFields:complete,revisionWithoutChange};
}
const files=['src/locales/ko-reconsider.mjs','src/reconsideration.mjs','src/reconsiderationView.mjs','src/app.mjs'];
const source=await Promise.all(files.map(async path=>({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')})));
const variants=['middle-school','high-school'].map(age=>({ageBand:age,stages:STEPS,actualHistory:[c.actualBody,c.actualFact],changedCondition:c.condition,prediction:{direct:c.directOptions,longTerm:age==='high-school'?c.longOptions:null,lock:true},goals:c.goals,methods:c.methods,possibleOutcomes:c.outcomes,review:age==='high-school'?{fact:FACT,statement:c.fact,unknownOptions:c.unknownOptions,writing:[c.connectionPrompt,c.limitPrompt],judgements:c.judgements}:{writing:[c.middleReason]},story:{prompt:ko.storyPrompt,maxLength:180},comparisons:{history:ageContent[age].historyComparePrompt,prediction:ageContent[age].predictionComparePrompt,maxLength:360},gateChecks:gateChecks(age)}));
const bundle={status:'DRAFT CANDIDATE',contract:REVIEW_CONTRACT,locale:'ko',generatedAt:new Date().toISOString(),source,scope:c.reviewNotes,variants,screenCopy:c};
const mdValue=(v,depth=0)=>Array.isArray(v)?v.map(x=>`${'  '.repeat(depth)}- ${typeof x==='object'?'\n'+mdValue(x,depth+1):x}`).join('\n'):v&&typeof v==='object'?Object.entries(v).map(([k,x])=>`${'  '.repeat(depth)}- ${k}: ${typeof x==='object'&&x!==null?'\n'+mdValue(x,depth+1):x}`).join('\n'):String(v);
const md=`# ${c.title}\n\n${mdValue(bundle)}\n`;
const render=v=>Array.isArray(v)?`<ul>${v.map(x=>`<li>${render(x)}</li>`).join('')}</ul>`:v&&typeof v==='object'?`<dl>${Object.entries(v).map(([k,x])=>`<dt>${esc(k)}</dt><dd>${render(x)}</dd>`).join('')}</dl>`:esc(v);
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${c.title}</title><style>body{max-width:1000px;margin:auto;padding:24px;font:18px/1.7 system-ui;color:#18334c;background:#fffcf5}dt{font-weight:bold;margin-top:16px}dd{margin-inline-start:20px}*{overflow-wrap:anywhere}h1{font-size:clamp(26px,4vw,38px)}nav{display:flex;gap:20px;flex-wrap:wrap}</style><h1>${c.title}</h1><nav><a href="./reconsider.html?lang=ko&age=middle-school&qa=1">${planningCopy.ages['middle-school']}</a><a href="./reconsider.html?lang=ko&age=high-school&qa=1">${planningCopy.ages['high-school']}</a><a href="./reconsider-review.json" download>JSON</a><a href="./reconsider-review.md" download>Markdown</a></nav>${render(bundle)}</html>`;
await writeFile('dist-reconsider/reconsider-review.json',JSON.stringify(bundle,null,2));await writeFile('dist-reconsider/reconsider-review.md',md);await writeFile('dist-reconsider/reconsider-review.html',html);
console.log('Exported reconsider-review HTML / JSON / Markdown; no learner data');

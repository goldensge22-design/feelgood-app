import {writingCopy as c} from './locales/ko-writing.mjs';
import {reconsiderCopy as pc} from './locales/ko-reconsider.mjs';
import {planningView,planBook,predictionRecord,esc} from './reconsiderationView.mjs';
import {inputsComplete,FACT,reviewComplete} from './reconsideration.mjs';
import {sceneFigure} from './sceneRegistry.mjs';
import {WRITING_KEY,WRITING_VERSION,AGES,STAGES,newWriting,predictionFields,storyFields,predictionComplete,commitWrittenPrediction,actPlan,storyComplete,saveWrittenStory,editStoryField,comparisonComplete,saveWrittenComparison,bookStatus,validateWriting} from './writing-contract.mjs';
const root=document.querySelector('#app'),url=new URL(location.href),qa=url.searchParams.get('qa')==='1';
const locale=url.searchParams.get('lang')||'ko',age=url.searchParams.get('age');
let run=null,savedRun=null,pageError=null;
const key=()=>`${WRITING_KEY}.${age}.planning`;
const button=(label,action,disabled=false,primary=false)=>`<button class="button ${primary?'primary':'secondary'}" data-action="${action}" ${disabled?'disabled':''}>${esc(label)}</button>`;
const paragraph=v=>`<p class="learner-text">${esc(v)}</p>`;
const context=()=>`<aside class="context-strip"><strong>${c.conditionLabel}</strong><p>${c.condition}</p></aside>`;
const fact=(full=true,withImage=false)=>`<section class="fact-panel" data-fact-mode="history"><h2>${c.actualLabel}</h2>${withImage?image('storybook-history'):''}<p>${full?c.actualSummary:c.actualKeyPoint}</p>${full?`<p>${c.actualLimit}</p>`:''}<a href="${FACT.url}" target="_blank" rel="noopener noreferrer">${c.sourceLabel}</a></section>`;
const image=(role='history-stage',caption='')=>sceneFigure('gutenberg.history.workshop',role,c.artworkAlt,caption);
const area=(group,field,label,value)=>`<label for="write-${field}">${esc(label)}</label><textarea id="write-${field}" data-group="${group}" data-field="${field}" maxlength="12000">${esc(value)}</textarea>`;
const nav=(label,action,disabled=false)=>`<div class="actions">${button(c.back,'back')}${button(label,action,disabled,true)}</div>`;
const draftNote=()=>`<p class="draft-note">${c.draftNotice}</p><div class="saved-status" role="status"></div>`;
function persist(next){
 try{validateWriting(next);localStorage.setItem(`${WRITING_KEY}.record.${next.resultId}`,JSON.stringify(next));localStorage.setItem(key(),JSON.stringify(next));run=next;return true;}
 catch(e){pageError=c.saveError;render();return false;}
}
function update(next,focus=true){if(persist(next)){render();if(focus)root.querySelector('h1')?.focus();}}
function savedNotice(){const el=root.querySelector('.saved-status');if(el)el.textContent=c.saved;}
function predictionHTML(){
 if(run.prediction?.lockedAt)return `<h1 tabindex="-1">${c.predictionTitle}</h1><p>${c.locked}</p>${predictionSummary()}${nav(c.continue,'prediction-lock')}`;
 const fields=predictionFields(run),field=fields[run.predictionIndex];
 return `<h1 tabindex="-1">${c.predictionTitle}</h1>${context()}<p>${c.predictionHint}</p>${area('prediction',field,c[field],run.predictionDraft[field])}${draftNote()}${nav(run.predictionIndex===fields.length-1?c.lock:c.next,'prediction-next',!run.predictionDraft[field]?.trim())}`;
}
function predictionSummary(){return predictionFields(run).map(k=>`<h3>${c[k]}</h3>${paragraph(run.prediction?.expression[k])}`).join('');}
function storySummary(){return `<section data-author="learner"><h2>${c.myStory}</h2>${paragraph(run.story.text)}${run.story.drawing?`<img class="student-drawing" src="${run.story.drawing}" alt="${c.drawingLabel}">`:''}</section>`;}
function storyHTML(){
 const fields=storyFields(run),field=fields[run.storyIndex],labels={process:c.process,ending:c.ending,fact:c.storyFact,assumption:c.storyAssumption,text:c.storyText};
 const references=`<details class="reference"><summary>${c.reference}</summary><h2>${c.planRecord}</h2>${planBook(run)}${fact()}${image('storybook-history',c.contextCaption)}</details>`;
 let outline='';if(field==='text')outline=`<details class="reference" open><summary>${c.outline}</summary>${paragraph(run.story.process)}${paragraph(run.story.ending)}${run.story.fact?paragraph(run.story.fact):''}${run.story.assumption?paragraph(run.story.assumption):''}${!run.story.text?button(c.useOutline,'use-outline'):''}</details>`;
 const drawing=field==='text'?`<details class="drawing-panel"><summary>${c.optionalDrawing}</summary><canvas class="drawing" width="900" height="360" aria-label="${c.drawingLabel}"></canvas>${button(c.clearDrawing,'clear-drawing')}</details>`:'';
 return `<h1 tabindex="-1">${c.storyTitle}</h1>${context()}<p>${c.storyHint}</p>${references}${field==='ending'?`<aside class="student-panel"><h2>${c.process}</h2>${paragraph(run.story.process)}</aside>`:''}${outline}${area('story',field,labels[field],run.story[field])}${drawing}${draftNote()}${nav(field==='text'?c.saveStory:c.next,'story-next',!run.story[field]?.trim())}`;
}
function comparisonHTML(kind){
 const field=run.comparisonIndex===0?'difference':'reason',d=run.comparisonDrafts[kind];
 const history=kind==='history',title=history?c.historyTitle:c.predictionCompareTitle;
 const sources=history?`<div class="comparison-grid">${fact(true,true)}<section class="student-panel">${storySummary()}</section></div>`:`<section class="student-panel"><h2>${c.myPrediction}</h2>${predictionSummary()}</section>${fact(false)}`;
 return `<h1 tabindex="-1">${title}</h1>${context()}${sources}<p>${history?c.comparisonHint:c.predictionCompareHint}</p>${field==='reason'?`<aside class="student-panel"><h2>${history?c.diff:c.predictionDifference}</h2>${paragraph(d.difference)}</aside>`:''}${area('comparison',field,history?(field==='difference'?c.diff:c.cause):(field==='difference'?c.predictionDifference:c.predictionReflection),d[field])}${draftNote()}${nav(field==='difference'?c.next:c.saveComparison,'comparison-next',!d[field]?.trim())}<div class="actions">${button(c.later,'comparison-later')}</div>`;
}
function recordedComparison(kind){const r=run.comparisons[kind];return r.status==='recorded'?`<section data-comparison-kind="${kind}" data-event-id="${r.eventId}"><h2>${c.comparisonRecord}</h2>${paragraph(r.difference)}${paragraph(r.reason)}</section>`:`<p>${c.missingComparison}</p>`;}
function pageHTML(i){
 const content=[
 ()=>`${image('storybook-history')}${fact()}`,
 ()=>`${context()}<p>${c.conditionHint}</p>`,
 ()=>`<p>${c.locked}</p>${predictionSummary()}`,
 ()=>`<h2>${c.planRecord}</h2>${planBook(run)}`,
 ()=>`<h2>${c.process}</h2>${paragraph(run.story.process)}<h2>${c.ending}</h2>${paragraph(run.story.ending)}${run.story.fact?`<h2>${c.storyFact}</h2>${paragraph(run.story.fact)}`:''}${run.story.assumption?`<h2>${c.storyAssumption}</h2>${paragraph(run.story.assumption)}`:''}`,
 ()=>`${image('storybook-history',c.contextCaption)}${storySummary()}`,
 ()=>`<div class="comparison-grid">${fact(true,true)}<section class="student-panel">${storySummary()}</section></div>${recordedComparison('history')}`,
 ()=>`<section class="student-panel"><h2>${c.myPrediction}</h2>${predictionSummary()}</section>${fact(false)}${recordedComparison('prediction')}`
 ];
 return `<article class="book-page" data-page-role="${['actual','condition','prediction','thinking','result','story','historyComparison','predictionComparison'][i]}"><p>${i+1} / 8</p><h1 tabindex="-1">${c.bookPages[i]}</h1>${content[i]()}</article>`;
}
function bookHTML(){return `<h1 tabindex="-1">${c.bookTitle}</h1><p>${bookStatus(run)==='assembled'?c.bookReady:c.bookPending}</p>${pageHTML(run.bookPage)}<div class="book-controls">${button(c.prevPage,'page-prev',run.bookPage===0)}<span>${run.bookPage+1} / 8</span>${button(c.nextPage,'page-next',run.bookPage===7)}</div><div class="actions">${button(c.editHistory,'edit-history')}${button(c.editPrediction,'edit-prediction')}${button(c.exportRecord,'export')}${button(c.print,'print')}</div>`;}
function landing(){
 const link=a=>{const u=new URL(location.href);u.searchParams.set('age',a);u.searchParams.set('lang','ko');u.searchParams.delete('new');return esc(u.pathname+u.search);};
 return `<h1 tabindex="-1">${c.welcome}</h1><p>${c.definition}</p><p>${c.scope}</p><p>${c.privacy}</p>${AGES.includes(age)?`<div class="actions">${savedRun?button(c.resume,'resume',false,true):''}${button(c.fresh,'new',false,!savedRun)}</div>`:`<div class="actions"><a class="button primary" href="${link('middle-school')}">${c.middle}</a><a class="button primary" href="${link('high-school')}">${c.high}</a></div>`}`;
}
function render(){
 if(locale!=='ko'){const u=new URL(location.href);u.searchParams.set('lang','ko');root.innerHTML=`<main class="app-shell"><a class="button" lang="ko" href="${esc(u.pathname+u.search)}">${c.ko}</a></main>`;return;}
 let body='';
 if(pageError)body=`<div class="error" role="alert">${pageError}</div>`;
 else if(!run)body=landing();
 else if(run.step==='actual')body=`<h1 tabindex="-1">${c.actualTitle}</h1>${image()}<section class="fact-panel" data-fact-mode="history"><h2>${c.actualLabel}</h2><p>${c.actualBody}</p><p>${c.actualFact}</p><p>${c.actualLimit}</p><a href="${FACT.url}" target="_blank" rel="noopener noreferrer">${c.sourceLabel}</a></section>${button(c.next,'next',false,true)}`;
 else if(run.step==='condition')body=`<h1 tabindex="-1">${c.conditionTitle}</h1>${context()}<p>${c.conditionHint}</p>${nav(c.confirmCondition,'confirm-condition')}`;
 else if(run.step==='prediction')body=predictionHTML();
 else if(run.step==='path')body=context()+planningView(run);
 else if(run.step==='story')body=storyHTML();
 else if(run.step==='historyComparison')body=comparisonHTML('history');
 else if(run.step==='predictionComparison')body=comparisonHTML('prediction');
 else body=bookHTML();
 root.innerHTML=`<main class="app-shell writing-shell"><header class="brand-header"><div class="brand">${c.brand}</div><div class="week">${c.week}</div></header><div class="progress" aria-hidden="true"><span style="width:${run?(STAGES.indexOf(run.step)+1)/8*100:0}%"></span></div><section class="scene-frame"><div class="scene-copy wide review-play">${body}</div></section><footer class="link-row"><a href="./rules.md" download="NUVIA_HISTORY_TEEN_RULES_v1.0.md">${c.downloadRules}</a><a href="./review.html">${c.reviewLink}</a></footer>${qa?`<details class="qa"><summary>${c.qaTitle}</summary><p>${c.qaScope}</p><pre>${esc(JSON.stringify(run?{version:run.writingVersion,resultId:run.resultId,age:run.ageBand,step:run.step,planningComplete:reviewComplete(run),bookStatus:bookStatus(run)}:{},null,2))}</pre></details>`:''}${run?.step==='book'?`<div class="print-pages">${Array.from({length:8},(_,i)=>pageHTML(i)).join('')}</div>`:''}</main>`;
 root.querySelectorAll('h1').forEach(h=>h.tabIndex=-1);
 if(run?.step==='story'&&storyFields(run)[run.storyIndex]==='text')setupDrawing();
}
function setupDrawing(){
 const canvas=root.querySelector('canvas');if(!canvas)return;const ctx=canvas.getContext('2d');ctx.strokeStyle='#193a50';ctx.lineWidth=4;ctx.lineCap='round';let drawing=false,prior=run.story.drawing;
 if(prior){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);img.src=prior;}
 const point=e=>{const b=canvas.getBoundingClientRect();return [(e.clientX-b.left)*canvas.width/b.width,(e.clientY-b.top)*canvas.height/b.height];};
 canvas.onpointerdown=e=>{drawing=true;canvas.setPointerCapture(e.pointerId);ctx.beginPath();ctx.moveTo(...point(e));};
 canvas.onpointermove=e=>{if(!drawing)return;ctx.lineTo(...point(e));ctx.stroke();};
 const end=()=>{if(!drawing)return;drawing=false;persist(editStoryField(run,'drawing',canvas.toDataURL()));savedNotice();};
 canvas.onpointerup=end;canvas.onpointercancel=end;
}
root.addEventListener('input',e=>{
 if(!run||pageError)return;
 const t=e.target;
 if(t.dataset.reviewText){const n=actPlan(run,t.dataset.reviewText,t.value);if(persist(n)){const b=root.querySelector('[data-review-action="judge"]');if(b)b.disabled=!inputsComplete(run);savedNotice();}return;}
 const {group,field}=t.dataset;if(!group)return;
 let n=structuredClone(run);
 if(group==='prediction'&&!n.prediction?.lockedAt)n.predictionDraft[field]=t.value;
 if(group==='story')n=editStoryField(n,field,t.value);
 if(group==='comparison'){const kind=n.step==='historyComparison'?'history':'prediction';n.comparisonDrafts[kind][field]=t.value;}
 if(persist(n)){const b=root.querySelector(`[data-action="${group==='prediction'?'prediction-next':group==='story'?'story-next':'comparison-next'}"]`);if(b)b.disabled=!t.value.trim();savedNotice();}
});
root.addEventListener('click',e=>{
 const el=e.target.closest('button');if(!el||el.disabled||pageError)return;
 const a=el.dataset.action,ra=el.dataset.reviewAction,rc=el.dataset.reviewChoice;
 if(rc){update(actPlan(run,rc,el.dataset.value),false);root.querySelector(`[data-review-choice="${rc}"][data-value="${el.dataset.value}"]`)?.focus();return;}
 if(ra){if(ra==='back'){update({...run,step:'prediction'});return;}const action=ra==='keep'||ra==='revise'?'decision':ra;update(actPlan(run,action,action==='decision'?ra:undefined));return;}
 if(a==='new'){update(newWriting(age));return;}if(a==='resume'){update(savedRun);return;}if(!run)return;
 if(a==='next')update({...run,step:'condition'});
 if(a==='confirm-condition')update({...run,step:'prediction',conditionConfirmed:true});
 if(a==='prediction-lock')update(commitWrittenPrediction(run));
 if(a==='prediction-next'){
  if(run.predictionIndex<predictionFields(run).length-1)update({...run,predictionIndex:run.predictionIndex+1});
  else if(predictionComplete(run))update(commitWrittenPrediction(run));
 }
 if(a==='story-next'){
  if(run.storyIndex<storyFields(run).length-1)update({...run,storyIndex:run.storyIndex+1});
  else if(storyComplete(run))update(saveWrittenStory(run));
 }
 if(a==='use-outline'&&!run.story.text)update({...run,story:{...run.story,text:[run.story.process,run.story.ending].join('\n\n'),saved:false}});
 if(a==='clear-drawing')update(editStoryField(run,'drawing',null));
 if(a==='comparison-next'||a==='comparison-later'){
  const kind=run.step==='historyComparison'?'history':'prediction';
  if(a==='comparison-next'&&run.comparisonIndex===0)update({...run,comparisonIndex:1});
  else if(a==='comparison-later'||comparisonComplete(run,kind))update(saveWrittenComparison(run,kind,a==='comparison-later'));
 }
 if(a==='back'){
  if(run.step==='prediction'&&!run.prediction&&run.predictionIndex>0)update({...run,predictionIndex:run.predictionIndex-1});
  else if(run.step==='story'&&run.storyIndex>0)update({...run,storyIndex:run.storyIndex-1});
  else if(run.step.includes('Comparison')&&run.comparisonIndex>0)update({...run,comparisonIndex:0});
  else update({...run,step:STAGES[Math.max(0,STAGES.indexOf(run.step)-1)]});
 }
 if(a==='page-prev'||a==='page-next')update({...run,bookPage:run.bookPage+(a==='page-prev'?-1:1)});
 if(a==='edit-history'||a==='edit-prediction')update({...run,step:a==='edit-history'?'historyComparison':'predictionComparison',comparisonIndex:0});
 if(a==='export'){const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(run,null,2)],{type:'application/json'}));link.download='my-history-story.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
 if(a==='print')window.print();
});
document.title=c.title;
const routeInvalid=(url.searchParams.has('age')&&!AGES.includes(age))||[['mission','gutenberg'],['pass','planning']].some(([k,v])=>url.searchParams.has(k)&&url.searchParams.get(k)!==v)||(url.searchParams.has('condition')&&!['w24-c2','gutenberg.c2'].includes(url.searchParams.get('condition')));
if(routeInvalid)pageError=c.recordUnavailable;
if(locale==='ko'&&AGES.includes(age)&&!pageError){
 try{const raw=localStorage.getItem(key());if(raw){savedRun=JSON.parse(raw);validateWriting(savedRun);if(savedRun.ageBand!==age)throw Error('AGE_MISMATCH');}if(url.searchParams.get('new')==='1')run=newWriting(age);else if(savedRun)run=savedRun;}
 catch{pageError=c.restoreError;}
}
render();

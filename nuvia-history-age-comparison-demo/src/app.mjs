import {ko,pathMeta,ageContent} from './content.mjs';
import {PATHS,AGE_BANDS,STEPS,createRun,evidenceComplete,bookState,event} from './contracts.mjs';
import {load,save} from './storage.mjs';
import {SCENE_POLICY_ID,sceneFigure,sceneQaSummary} from './sceneRegistry.mjs';

const root=document.querySelector('#app');
const params=new URLSearchParams(location.search);
const locale=params.get('lang')||'ko', qa=params.get('qa')==='1';
const ageBand=AGE_BANDS.includes(params.get('age'))?params.get('age'):'preschool';
const requested=PATHS.includes(params.get('pass'))?params.get('pass'):'planning';
const selectedPath=ageBand==='preschool'?requested:'planning';
const copy=ageContent[ageBand];
let run=load(selectedPath,ageBand);
if(!run) run=createRun(selectedPath,Date.now(),ageBand);
let help=false,notice='',drawing=false,storyInk=Boolean(run.story.drawing),lastPoint=null,bookOpen=false,bookPage=0;

if(locale!=='ko'){
  root.innerHTML=`<main class="language-block"><div class="card"><span class="brand">${ko.brand}</span><h1>${ko.unsupportedTitle}</h1><p>${ko.unsupportedBody}</p><a class="button primary" href="?lang=ko">${ko.korean}</a></div></main>`;
}else render();

function set(next,kind,payload={}){run=save(event(next,kind,payload));notice='';render();}
function go(step){set({...run,step},'navigation',{step});}
function button(label,action,cls='secondary',disabled=false){return `<button class="button ${cls}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`}
function choice(label,value,group,selected=false,icon='◆'){return `<button class="choice ${selected?'selected':''}" data-choice="${group}" data-value="${value}" aria-pressed="${selected}"><span class="choice-icon" aria-hidden="true">${icon}</span><span>${label}</span></button>`}
function frame(inner,kind='paper'){return `<section class="scene-frame ${kind}">${inner}</section>`}
function progress(){const i=STEPS.indexOf(run.step);return `<div class="progress" aria-label="${ko.progress} ${i+1}/${STEPS.length}"><span style="width:${(i+1)/STEPS.length*100}%"></span></div>`}

function render(){
 const meta=pathMeta[run.path];
 root.innerHTML=`<div class="app-shell"><header class="brand-header"><div><span class="brand">${ko.brand}</span><span class="demo-chip">${ko.demo}</span></div><span class="week">${ko.week}</span></header>${progress()}<main class="play-area">${screen()}</main>${notice?`<div class="notice" role="status">${notice}</div>`:''}${qa?inspector(meta):''}</div>`;
 bind(); if(run.step==='story') setupCanvas();
}

function screen(){
 if(run.step==='actual') return frame(`${sceneFigure('gutenberg.history.workshop','history-stage',ko.workshopAlt)}<div class="scene-copy"><span class="eyebrow">${ko.actualTitle}</span><h1>${copy.actualBody}</h1><p>${copy.actualFact}</p>${button(ko.begin,'next','primary')}</div>`,'workshop');
 if(run.step==='condition') return frame(`${sceneFigure('gutenberg.c2.altered-access','condition-stage',ko.objectsAlt,ko.imagineCondition,ko.imagePending)}<div class="scene-copy"><h1>${ko.conditionTitle}</h1><p class="big-question">${copy.conditionBody}</p><div class="actions">${button(ko.back,'back')}${button(ko.next,'next','primary')}</div></div>`);
 if(run.step==='prediction') return frame(`<div class="scene-copy wide"><h1>${copy.predictionTitle}</h1><p>${copy.predictionBody}</p><div class="choice-grid ${copy.predictions.length===2?'two':'three'}">${copy.predictions.map((label,i)=>choice(label,`prediction-${i}`,'prediction',run.prediction===`prediction-${i}`,['👂','📖','↔'][i])).join('')}</div><div class="actions">${button(ko.back,'back')}${button(ko.next,'next','primary',!run.prediction)}</div></div>`);
 if(run.step==='path') return frame(`<div class="scene-copy wide"><h1>${pathQuestion()}</h1><p class="instruction">${pathHelp()}</p>${pathActivity()}${help?`<aside class="support-panel"><p>${pathHelp()}</p>${button(ko.closeHelp,'help')}</aside>`:''}<div class="actions">${button(ko.back,'back')}${button(help?ko.closeHelp:ko.help,'help')}${button(ko.next,'next','primary',!evidenceComplete(run))}</div></div>`,'activity');
 if(run.step==='story') return frame(`<div class="scene-copy wide"><h1>${ko.storyTitle}</h1><p class="big-question">${ko.storyPrompt}</p><div class="mode-tabs">${button(ko.draw,'draw',run.story.mode==='drawing'?'primary':'secondary')}${button(ko.write,'write',run.story.mode==='text'?'primary':'secondary')}</div>${run.story.mode==='drawing'?`<canvas id="story-canvas" width="640" height="360" aria-label="${ko.drawingArea}"></canvas>${button(ko.clear,'clear')}`:`<label class="sr-only" for="story-text">${ko.shortWrite}</label><textarea id="story-text" maxlength="180" placeholder="${ko.shortWrite}">${escapeHtml(run.story.text)}</textarea>`}<div class="actions">${button(ko.back,'back')}${button(ko.saveStory,'save-story','primary')}</div></div>`,'story');
 if(run.step==='historyComparison') return comparison('history',ko.historyCompareTitle,copy.historyComparePrompt);
 if(run.step==='predictionComparison') return comparison('prediction',ko.predictionCompareTitle,copy.predictionComparePrompt);
 const state=bookState(run),status=state==='assembled'?ko.bookReady:ko.bookMissing;
 if(bookOpen)return resultBook();
 return frame(`<div class="book-cover"><span>${ko.week}</span><h1>${ko.bookTitle}</h1>${sceneFigure('gutenberg.history.workshop','storybook-cover',ko.workshopShortAlt)}<p>${status}</p><dl><div><dt>${ko.firstThought}</dt><dd>${predictionText()}</dd></div><div><dt>${ko.thinkingPlay}</dt><dd>${pathMeta[run.path].label}</dd></div><div><dt>${ko.myRecord}</dt><dd>${run.story.text||ko.drawingSaved}</dd></div></dl><div class="actions book-actions">${button(ko.openBook,'open-book','primary')}${button(ko.again,'restart')}</div></div>`,'book');
}

function resultBook(){const pages=bookPages(),page=pages[bookPage];return frame(`<article class="result-book"><header><span>${ko.week}</span><strong>${bookPage+1} / ${pages.length} ${ko.pageOf}</strong></header><div class="book-spread"><div class="page-number">${String(bookPage+1).padStart(2,'0')}</div><h1>${page.title}</h1>${page.image||''}<div class="page-body">${page.body}</div></div><nav class="book-nav" aria-label="${ko.bookTitle}">${button(ko.previousPage,'book-prev','secondary',bookPage===0)}${button(ko.closeBook,'close-book')}${button(ko.nextPage,'book-next','primary',bookPage===pages.length-1)}</nav></article>`,'book book-open')}
function bookPages(){const story=run.story.text?`<p>${escapeHtml(run.story.text)}</p>`:run.story.drawing?`<figure><img src="${run.story.drawing}" alt="${ko.storyDrawing}"><figcaption>${ko.storyDrawing}</figcaption></figure>`:`<p>${ko.comparisonDeferred}</p>`;return[
 {title:ko.pageActual,image:sceneFigure('gutenberg.history.workshop','storybook-history',ko.workshopAlt),body:`<p>${copy.actualBody}</p><p>${copy.actualFact}</p>`},
 {title:ko.pageCondition,image:sceneFigure('gutenberg.c2.altered-access','storybook-condition',ko.objectsAlt,'',ko.imagePending),body:`<p>${copy.conditionBody}</p>`},
 {title:ko.pagePrediction,body:`<p class="page-quote">${predictionText()}</p>`},
 {title:ko.pageThinking,body:`<div class="page-symbol">${pathSymbol(run.path)}</div><p>${pathMeta[run.path].label}</p><p>${pathQuestion()}</p>`},
 {title:ko.pageResult,image:run.path==='planning'?consequenceVisual():arbitraryPathVisual(),body:`<p>${resultText()}</p>`},
 {title:ko.pageStory,body:story},
 {title:ko.pageHistoryCompare,body:bookComparison('history')},
 {title:ko.pagePredictionCompare,body:bookComparison('prediction')}
]}
function pathSymbol(path){return path==='attention'?'🔎':path==='simultaneous'?'🧩':path==='sequential'?'🪄':'🧭'}

function pathQuestion(){return run.path==='attention'?ko.attentionQ:run.path==='simultaneous'?ko.simultaneousQ:run.path==='sequential'?ko.sequentialQ:copy.planningQ}
function pathHelp(){return run.path==='attention'?ko.attentionHelp:run.path==='simultaneous'?ko.simultaneousHelp:run.path==='sequential'?ko.sequentialHelp:copy.planningHelp}
function pathActivity(){const e=run.evidence;
 if(run.path==='attention') return `<div class="choice-grid clues">${choice(ko.clueWho,'who','clue',e.clues?.includes('who'),'👥')}${choice(ko.clueWhen,'when','clue',e.clues?.includes('when'),'☀️')}${choice(ko.clueColor,'color','clue',e.clues?.includes('color'),'🎨')}${choice(ko.clueWeather,'weather','clue',e.clues?.includes('weather'),'☁️')}</div>`;
 if(run.path==='simultaneous') return `<div class="link-board"><div><strong>${ko.withWhom}</strong>${choice(ko.personReader,'reader','person',e.person==='reader','🧒')}${choice(ko.personPrinter,'printer','person',e.person==='printer','🧑‍🔧')}</div><div><strong>${ko.where}</strong>${choice(ko.placeBench,'bench','place',e.place==='bench','🪑')}${choice(ko.placePress,'press','place',e.place==='press','⚙️')}</div><div><strong>${ko.how}</strong>${choice(ko.methodTell,'tell','method',e.method==='tell','💬')}${choice(ko.methodShow,'show','method',e.method==='show','📖')}</div></div>`;
 if(run.path==='sequential'){const order=e.order||[], cards=[['ask',ko.stepAsk,'🙋'],['meet',ko.stepMeet,'🪑'],['share',ko.stepShare,'💬']];return `<div class="sequence-slots">${[0,1,2].map(i=>`<button data-seq-remove="${i}" class="slot ${order[i]?'filled':''}">${order[i]?cards.find(x=>x[0]===order[i])[2]+' '+cards.find(x=>x[0]===order[i])[1]:ko.placePicture}</button>`).join('')}</div><div class="choice-grid three">${cards.filter(x=>!order.includes(x[0])).map(x=>choice(x[1],x[0],'sequence',false,x[2])).join('')}</div>`}
 return planningActivity(e);
}

function planningActivity(e){
 const goalValues=['hear','see'],methodValues=['tell','time','own'],methodIcons=['💬','🕰️','◇'];
 const goals=`<div><strong>${ko.wantedGoal}</strong><div class="choice-grid two">${copy.goals.map((label,i)=>choice(label,goalValues[i],'goal',e.goal===goalValues[i],i?'📖':'◎')).join('')}</div></div>`;
 const methods=e.goal?`<div><strong>${ko.whichMethod}</strong><div class="choice-grid three">${copy.methods.map((label,i)=>choice(label,methodValues[i],'method',e.method===methodValues[i],methodIcons[i])).join('')}</div></div>`:'';
 if(!e.method)return `<div class="plan-board">${goals}${methods}</div>`;
 const decision=e.outcomeSeen?`<div class="choice-grid two">${choice(ko.keep,'keep','decision',e.decision==='keep','✓')}${choice(ko.revise,'revise','decision',e.decision==='revise','↩')}</div>`:button(ko.seeOutcome,'see-outcome','primary');
 const reasons=e.decision&&copy.reasons?`<div><strong>${ko.reasonTitle}</strong><div class="choice-grid two">${copy.reasons.map((label,i)=>choice(label,`reason-${i}`,'reason',e.reason===`reason-${i}`,'◈')).join('')}</div></div>`:'';
 const uncertainty=e.reason&&copy.uncertainties?`<div><strong>${ko.uncertaintyTitle}</strong><div class="choice-grid two">${copy.uncertainties.map((label,i)=>choice(label,`uncertainty-${i}`,'uncertainty',e.uncertainty===`uncertainty-${i}`,'?')).join('')}</div></div>`:'';
 return `<div class="plan-board">${goals}${methods}<div class="consequence">${consequenceVisual()}<div><p>${resultText()}</p>${decision}</div></div>${reasons}${uncertainty}</div>`;
}

function predictionText(){const index=Number(String(run.prediction||'prediction-0').split('-')[1]);return copy.predictions[index]||copy.predictions[0]}
function resultText(){return run.path==='planning'?(copy.outcomes[run.evidence.method]||pathMeta[run.path].result):pathMeta[run.path].result}
function consequenceSceneId(){return `gutenberg.c2.planning.${run.evidence.method||'own'}`}
function consequenceVisual(){return sceneFigure(consequenceSceneId(),'storybook-result',ko.castAlt,'',ko.imagePending)}
function arbitraryPathVisual(){return ''}
function storyRecord(){return run.story.text?escapeHtml(run.story.text):run.story.drawing?ko.storyDrawing:ko.comparisonDeferred}
function comparisonSources(kind){return kind==='history'?[copy.actualKeyPoint,storyRecord()]:[predictionText(),copy.actualKeyPoint]}
function bookComparison(kind){
 const item=run.comparisons[kind],sources=comparisonSources(kind),leftLabel=kind==='history'?ko.actualHistoryLabel:ko.firstPredictionLabel,rightLabel=kind==='history'?ko.myStoryLabel:ko.actualHistoryLabel;
 const record=item.status==='recorded'?`<section class="comparison-record"><h2>${ko.comparisonRecordLabel}</h2><p>${escapeHtml(item.value)}</p></section>`:`<section class="comparison-record comparison-record--missing"><strong>${ko.comparisonDeferred}</strong></section>`;
 return `<div class="book-comparison"><section><h2>${leftLabel}</h2><p>${sources[0]}</p></section><span aria-hidden="true">↔</span><section><h2>${rightLabel}</h2><p>${sources[1]}</p></section></div>${record}`;
}

function comparison(kind,title,prompt){const item=run.comparisons[kind],sources=comparisonSources(kind);return frame(`<div class="scene-copy wide"><h1>${title}</h1><div class="compare-strip"><div>${sources[0]}</div><span aria-hidden="true">↔</span><div>${sources[1]}</div></div><p class="big-question">${prompt}</p><textarea id="compare-text" maxlength="360" placeholder="${ko.speakOrDraw}">${escapeHtml(item.value)}</textarea><div class="actions">${button(ko.back,'back')}${button(ko.later,'defer')}${button(ko.save,'save-compare','primary')}</div></div>`,'comparison')}
function inspector(meta){return `<details class="qa"><summary>${ko.qa}</summary><pre>${escapeHtml(JSON.stringify({resultId:run.resultId,attemptId:run.attemptId,runMode:run.runMode,ageBand:run.ageBand,pathId:`w24-c2.${meta.passArea}.age-demo.v1`,passArea:meta.passArea,evidenceComplete:evidenceComplete(run),bookState:bookState(run),eventCount:run.events.length,scenePolicyId:SCENE_POLICY_ID,scenes:sceneQaSummary()},null,2))}</pre></details>`}
function escapeHtml(v=''){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function bind(){
 root.querySelectorAll('[data-action]').forEach(el=>el.onclick=()=>act(el.dataset.action));
 root.querySelectorAll('[data-choice]').forEach(el=>el.onclick=()=>pick(el.dataset.choice,el.dataset.value));
 root.querySelectorAll('[data-seq-remove]').forEach(el=>el.onclick=()=>{const order=[...(run.evidence.order||[])];order.splice(Number(el.dataset.seqRemove),1);set({...run,evidence:{...run.evidence,order}},'sequence.removed')});
}
function act(a){
 if(a==='next'){if(run.step==='path'&&!evidenceComplete(run)){notice=ko.needAction;render();return}go(STEPS[STEPS.indexOf(run.step)+1]);return}
 if(a==='back'){go(STEPS[Math.max(0,STEPS.indexOf(run.step)-1)]);return}
 if(a==='help'){help=!help;render();return}
 if(a==='see-outcome'){set({...run,evidence:{...run.evidence,outcomeSeen:true}},'planning.outcomeViewed');return}
 if(a==='draw'||a==='write'){set({...run,story:{...run.story,mode:a==='draw'?'drawing':'text'}},'story.modeChanged',{mode:a});return}
 if(a==='clear'){const c=root.querySelector('#story-canvas');c?.getContext('2d').clearRect(0,0,c.width,c.height);drawing=false;storyInk=false;return}
 if(a==='save-story'){const text=root.querySelector('#story-text')?.value||run.story.text;const c=root.querySelector('#story-canvas');const data=c&&storyInk?c.toDataURL('image/png'):run.story.drawing;if(!text&&!data){notice=ko.drawOrWriteNeeded;render();return}set({...run,story:{...run.story,text,drawing:data,saved:true},step:'historyComparison'},'story.saved',{mode:run.story.mode});return}
 if(a==='save-compare'){const v=root.querySelector('#compare-text').value.trim();if(!v){notice=ko.comparisonNeeded;render();return}saveComparison('recorded',v);return}
 if(a==='defer'){saveComparison('deferred','');return}
 if(a==='open-book'){bookOpen=true;bookPage=0;render();return}
 if(a==='close-book'){bookOpen=false;render();return}
 if(a==='book-prev'){bookPage=Math.max(0,bookPage-1);render();return}
 if(a==='book-next'){bookPage=Math.min(7,bookPage+1);render();return}
 if(a==='restart'){run=createRun(run.path,Date.now(),run.ageBand);save(run);render()}
}
function saveComparison(status,value){const kind=run.step==='historyComparison'?'history':'prediction',nextStep=kind==='history'?'predictionComparison':'book';set({...run,comparisons:{...run.comparisons,[kind]:{status,value}},step:nextStep},`comparison.${kind}.${status}`)}
function pick(group,value){const e={...run.evidence};
 if(group==='prediction'){set({...run,prediction:value},'prediction.recorded',{value});return}
 if(group==='clue'){const s=new Set(e.clues||[]);s.has(value)?s.delete(value):s.add(value);e.clues=[...s];if(!['who','when'].includes(value))notice=ko.clueAgain}
 else if(group==='sequence'){e.order=[...(e.order||[]),value]}
 else e[group]=value;
 set({...run,evidence:e},`${run.path}.${group}.selected`,{value});
}
function setupCanvas(){const c=root.querySelector('#story-canvas');if(!c)return;const ctx=c.getContext('2d');ctx.lineWidth=7;ctx.lineCap='round';ctx.strokeStyle='#17395c';if(run.story.drawing){storyInk=true;const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,c.width,c.height);img.src=run.story.drawing}const pos=e=>{const r=c.getBoundingClientRect(),p=e.touches?.[0]||e;return [(p.clientX-r.left)*c.width/r.width,(p.clientY-r.top)*c.height/r.height]};const start=e=>{drawing=true;lastPoint=pos(e);e.preventDefault()},move=e=>{if(!drawing)return;storyInk=true;const p=pos(e);ctx.beginPath();ctx.moveTo(...lastPoint);ctx.lineTo(...p);ctx.stroke();lastPoint=p;e.preventDefault()},end=()=>{drawing=false};c.onpointerdown=start;c.onpointermove=move;c.onpointerup=end;c.onpointerleave=end}

import {reconsiderCopy as c} from './locales/ko-reconsider.mjs';
import {FACT,METHOD_IDS,canLockPrediction,inputsComplete,unknownRecord} from './reconsideration.mjs';
export const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const btn=(label,action,disabled=false,primary=false)=>`<button class="button ${primary?'primary':'secondary'}" data-review-action="${action}" ${disabled?'disabled':''}>${esc(label)}</button>`;
const pick=(label,action,value,selected=false)=>`<button class="choice ${selected?'selected':''}" data-review-choice="${action}" data-value="${value}" aria-pressed="${selected}"><span>${esc(label)}</span></button>`;
const text=(id,label,hint,value)=>`<div class="planning-writing"><label for="review-${id}">${esc(label)}</label>${hint?`<p id="hint-${id}">${esc(hint)}</p>`:''}<textarea id="review-${id}" data-review-text="${id}" maxlength="1500" ${hint?`aria-describedby="hint-${id}"`:''}>${esc(value)}</textarea></div>`;
export function predictionView(r){
 const locked=Boolean(r.prediction?.lockedAt),high=r.ageBand==='high-school';
 const group=(field,label,options)=>`<fieldset><legend>${esc(label)}</legend><div class="choice-grid">${options.map((s,i)=>locked?`<p class="${r.prediction[field]?.index===i?'selected-prediction':''}">${r.prediction[field]?.index===i?esc(s):''}</p>`:pick(s,`prediction-${field}`,i,r.predictionDraft[field]===i)).join('')}</div></fieldset>`;
 return `<div class="scene-copy wide review-play"><h1>${c.predictionTitle}</h1>${locked?`<p>${c.predictionLocked}</p>`:''}${group('direct',c.predictionDirect,c.directOptions)}${high?group('longTerm',c.predictionLong,c.longOptions):''}<div class="actions">${btn(c.back,'back')}${btn(locked?c.continue:c.lockPrediction,'prediction-lock',!locked&&!canLockPrediction(r),true)}</div></div>`;
}
export function predictionRecord(r){return [r.prediction?.direct?.text,r.prediction?.longTerm?.text].filter(Boolean).map(esc).join('<br>')||esc(c.missing);}
export function planningView(r){
 const p=r.planning,d=p.draft,high=r.ageBand==='high-school';
 const context=`<dl class="reason-context"><dt>${c.selectedGoal}</dt><dd>${esc(c.goals[p.goal]||c.missing)}</dd><dt>${c.selectedMethod}</dt><dd>${esc(c.methods[p.method]||c.missing)}</dd></dl>`;
 let body='';
 if(p.phase==='choose'){
  body=`<h2>${c.selectGoal}</h2><div class="choice-grid two">${Object.entries(c.goals).map(([v,s])=>pick(s,'goal',v,p.goal===v)).join('')}</div>`;
  if(p.goal&&high)body+=`<h2>${c.comparePrompt}</h2><p>${c.compareHint}</p><div class="choice-grid three">${METHOD_IDS.map(v=>pick(c.methods[v],'compare',v,p.comparedMethodIds.includes(v))).join('')}</div>`;
  if(p.goal&&(!high||p.comparedMethodIds.length===2)){
   const ids=high?p.comparedMethodIds:METHOD_IDS;
   body+=`<h2>${c.chooseMethod}</h2><div class="choice-grid ${high?'two':'three'}">${ids.map(v=>`<div class="review-method">${pick(c.methods[v],'method',v,p.method===v)}<p>${c.methodDescriptions[v]}</p></div>`).join('')}</div>`;
   body+=btn(c.startReview,'start',!p.method,true);
  }
 }else if(p.phase==='result'){
  body=`<section class="review-possible"><h2>${c.outcomeLabel}</h2><p>${c.outcomes[p.method]}</p></section>${btn(high?c.showFact:c.showQuestions,'outcome',false,true)}`;
 }else if(p.phase==='fact'){
  body=`${factPanel()}${btn(c.showQuestions,'fact',false,true)}`;
 }else if(p.phase==='replacement'){
  body=`<h2>${c.chooseReplacement}</h2><p>${c.revisionHint}</p><div class="choice-grid two">${METHOD_IDS.filter(v=>v!==p.method).map(v=>pick(c.methods[v],'method',v)).join('')}</div>`;
 }else if(p.phase==='inputs'){
  if(high)body+=`<details class="review-fact"><summary>${c.factLabel}</summary>${factPanel()}</details>`;
  if(p.history.length){const prev=p.history.at(-1);body+=`<details class="previous-draft"><summary>${c.previousDraft}</summary><h3>${esc(c.methods[prev.method])}</h3>${unknownView({...r,planning:{...p,method:prev.method,draft:prev.draft}})}<p class="learner-text">${esc(prev.draft.connectionText)}</p><p class="learner-text">${esc(prev.draft.limitText)}</p>${btn(c.reuseDraft,'reuse')}</details>`;}
  if(high)body+=`<h2>${c.unknownPrompt}</h2><p>${c.unknownHint}</p><div class="choice-grid">${c.unknownOptions[p.method].map(x=>pick(x.label,'unknown',x.id,d.unknownInfoIds.includes(x.id))).join('')}</div>${text('unknownText',c.customUnknown,'',d.unknownText)}`;
  body+=text('connectionText',high?c.connectionPrompt:c.middleReason,high?c.connectionHint:'',d.connectionText);
  if(high)body+=text('limitText',c.limitPrompt,c.limitHint,d.limitText);
  if(d.carried)body+=`<p>${c.reuseNotice}</p>${btn(c.confirmDraft,'confirmCarry',d.carryConfirmed)}`;
  body+=`<p class="draft-note">${c.draftNotice}</p>${btn(c.confirmInputs,'judge',!inputsComplete(r),true)}`;
 }else if(p.phase==='decision'){
  body=`<details><summary>${c.viewWriting}</summary><p class="learner-text">${esc(d.connectionText)}</p>${high?`<p class="learner-text">${esc(d.limitText)}</p>`:''}</details>${btn(c.editInputs,'edit')}`;
  if(high)body+=`<h2>${c.judgePrompt}</h2><div class="choice-grid three">${Object.entries(c.judgements).map(([v,s])=>pick(s,'fit',v,d.goalFit===v)).join('')}</div>`;
  body+=`<div class="actions">${btn(c.keep,'keep',high&&!d.goalFit,true)}${btn(c.revise,'revise',high&&!d.goalFit)}</div>`;
 }
 return `<div class="scene-copy wide review-play"><h1>${c.intro}</h1>${p.phase==='choose'?'':context}${body}<div class="actions review-back">${btn(c.back,'back')}</div></div>`;
}
function factPanel(){return `<section class="review-fact" data-fact-mode="history"><h2>${c.factLabel}</h2><p class="big-question">${c.fact}</p><p>${c.factScope}</p><a href="${FACT.url}" target="_blank" rel="noopener noreferrer">${c.sourceLabel}</a></section>`;}
export function unknownView(r){
 if(r.ageBand!=='high-school')return '';
 const record=unknownRecord(r),options=c.unknownOptions[record.method];
 return `<aside class="review-unknown" data-authorship="separated"><h2>${c.bookUnknown}</h2><p>${c.unknownNotice}</p>${record.systemSelection.ids.length?`<section data-author="system"><h3 class="provenance-badge">${c.systemList}</h3><ul>${record.systemSelection.ids.map(id=>`<li>${esc(options.find(x=>x.id===id)?.label)}</li>`).join('')}</ul></section>`:''}${record.learnerText.text?`<section data-author="learner"><h3 class="provenance-badge">${c.learnerUnknown}</h3><p class="learner-text">${esc(record.learnerText.text)}</p></section>`:''}</aside>`;
}
export function planBook(r){const p=r.planning;return `<dl class="reason-context"><dt>${c.selectedGoal}</dt><dd>${esc(c.goals[p.goal])}</dd><dt>${c.selectedMethod}</dt><dd>${esc(c.methods[p.method])}</dd></dl><section data-author="learner"><h2>${r.ageBand==='high-school'?c.learnerReason:c.middleReason}</h2><p class="learner-text">${esc(p.draft.connectionText)}</p>${r.ageBand==='high-school'?`<h2>${c.learnerLimit}</h2><p class="learner-text">${esc(p.draft.limitText)}</p>`:''}</section>${unknownView(r)}`;}

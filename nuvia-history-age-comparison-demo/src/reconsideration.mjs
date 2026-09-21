export const REVIEW_CONTRACT='nuvia.history.planning-review.demo.v1';
export const REVIEW_KEY='nuviaHistory.planningReviewDemo.v1';
export const METHOD_IDS=['tell','time','own'];
export const UNKNOWN_IDS={tell:['tell.language','tell.explanation','tell.permission-time'],time:['time.permission-time','time.language'],own:['own.reader','own.language','own.check']};
export const FACT={id:'gutenberg.c2.latin-print',sourceId:'S1324-21',version:'w24-c2-approved-fact-v1',factMode:'history',url:'https://www.hrc.utexas.edu/gutenberg-bible/'};
export const hasText=v=>typeof v==='string'&&Boolean(v.replace(/[\s\u200B-\u200D\uFEFF]/gu,'').length);
export function initializeReview(base){
 if(!['middle-school','high-school'].includes(base.ageBand))throw Error('REVIEW_AGE_REQUIRED');
 return {...base,reviewContract:REVIEW_CONTRACT,contentVersion:'w24-c2-planning-review-demo-v1',resultId:base.resultId.replace('age-v1:','planning-review-v1:'),
  prediction:null,predictionDraft:{direct:null,longTerm:null},planning:{goal:null,comparedMethodIds:[],method:null,firstMethodId:null,phase:'choose',pendingRevision:false,history:[],revisions:[],draft:emptyDraft(),completed:false},timing:{activeMs:0,byStep:{},startedAt:null,finishedAt:null}};
}
function emptyDraft(){return {outcomeSeen:false,factSeen:false,unknownInfoIds:[],unknownText:'',connectionText:'',limitText:'',goalFit:null,decision:null,carried:false,carryConfirmed:false};}
const clone=r=>structuredClone(r);
export function canLockPrediction(r){const valid=i=>Number.isInteger(i)&&i>=0&&i<=2;return valid(r.predictionDraft?.direct)&&(r.ageBand!=='high-school'||valid(r.predictionDraft?.longTerm));}
export function writePrediction(r,field,index){
 if(r.prediction?.lockedAt)return r;
 if(!['direct','longTerm'].includes(field)||!Number.isInteger(index)||index<0||index>2)throw Error('INVALID_PREDICTION');
 return {...r,predictionDraft:{...r.predictionDraft,[field]:index}};
}
export function lockPrediction(r,labels,now=Date.now()){
 if(r.prediction?.lockedAt)return {...r,step:'path'};
 if(!canLockPrediction(r))throw Error('PREDICTION_REQUIRED');
 return {...r,prediction:{predictionId:`${r.attemptId}:prediction`,direct:{index:r.predictionDraft.direct,text:labels.direct[r.predictionDraft.direct]},longTerm:r.ageBand==='high-school'?{index:r.predictionDraft.longTerm,text:labels.longTerm[r.predictionDraft.longTerm]}:null,lockedAt:new Date(now).toISOString(),attemptId:r.attemptId,conditionId:r.conditionId,contentVersion:r.contentVersion},step:'path'};
}
function invalidate(p){p.completed=false;p.draft.goalFit=null;p.draft.decision=null;}
export function inputsComplete(r){
 const p=r.planning,d=p.draft;
 if(!d.outcomeSeen||!hasText(d.connectionText)||(d.carried&&!d.carryConfirmed))return false;
 if(r.ageBand==='middle-school')return true;
 return d.factSeen&&d.unknownInfoIds.every(id=>UNKNOWN_IDS[p.method]?.includes(id))&&(d.unknownInfoIds.length>0||hasText(d.unknownText))&&hasText(d.limitText);
}
export function reviewComplete(r){
 const p=r.planning;if(!p||!r.prediction?.lockedAt||!['hear','see'].includes(p.goal)||!METHOD_IDS.includes(p.method))return false;
 if(p.pendingRevision||!p.completed||p.draft.decision!=='keep'||!inputsComplete(r))return false;
 if(p.revisions.some(x=>!METHOD_IDS.includes(x.to)||x.from===x.to))return false;
 if(r.ageBand==='high-school'&&(!['sufficient','insufficient','undetermined'].includes(p.draft.goalFit)||p.comparedMethodIds.length!==2))return false;
 return true;
}
export function changePlan(r,action,value){
 if(!r.prediction?.lockedAt)throw Error('PREDICTION_NOT_LOCKED');
 const n=clone(r),p=n.planning,d=p.draft;
 if(action==='goal'){
  if(p.firstMethodId||!['hear','see'].includes(value))return r;
  p.goal=value;
 }else if(action==='compare'){
  if(p.firstMethodId||!METHOD_IDS.includes(value))return r;
  p.comparedMethodIds=p.comparedMethodIds.includes(value)?p.comparedMethodIds.filter(x=>x!==value):[...p.comparedMethodIds,value].slice(-2);
  p.method=null;
 }else if(action==='method'){
  if(!p.goal||!METHOD_IDS.includes(value))return r;
  if(p.firstMethodId&&!p.pendingRevision)return r;
  if(p.pendingRevision){
   if(value===p.method)return r;
   p.history.push({method:p.method,draft:clone(d)});
   p.revisions.push({from:p.method,to:value,at:new Date().toISOString()});
   p.draft=emptyDraft();p.pendingRevision=false;p.phase='result';
  }else if(n.ageBand==='high-school'&&!p.comparedMethodIds.includes(value))return r;
  p.method=value;p.completed=false;
 }else if(action==='start'){
  if(!p.method||(n.ageBand==='high-school'&&p.comparedMethodIds.length!==2))return r;
  p.firstMethodId ||= p.method;p.phase='result';
 }else if(action==='outcome'){
  if(p.phase!=='result')return r;
  d.outcomeSeen=true;p.phase=n.ageBand==='high-school'?'fact':'inputs';
 }else if(action==='fact'){
  if(!d.outcomeSeen||n.ageBand!=='high-school')return r;
  d.factSeen=true;d.factRef={...FACT};p.phase='inputs';
 }else if(action==='unknown'){
  if(!d.factSeen||!UNKNOWN_IDS[p.method]?.includes(value))return r;
  d.unknownInfoIds=d.unknownInfoIds.includes(value)?d.unknownInfoIds.filter(x=>x!==value):[...d.unknownInfoIds,value];invalidate(p);
 }else if(['unknownText','connectionText','limitText'].includes(action)){
  d[action]=String(value);d.carryConfirmed=false;invalidate(p);
 }else if(action==='reuse'){
  const old=p.history.at(-1);if(!old)return r;
  d.connectionText=old.draft.connectionText;d.limitText=old.draft.limitText;
  d.carried=true;d.carryConfirmed=false;invalidate(p);
 }else if(action==='confirmCarry'){
  d.carryConfirmed=true;invalidate(p);
 }else if(action==='judge'){
  if(!inputsComplete(n))return r;p.phase='decision';
 }else if(action==='edit'){
  p.phase='inputs';invalidate(p);
 }else if(action==='fit'){
  if(p.phase!=='decision'||!inputsComplete(n)||!['sufficient','insufficient','undetermined'].includes(value))return r;
  d.goalFit=value;d.decision=null;p.completed=false;
 }else if(action==='decision'){
  if(p.phase!=='decision'||!inputsComplete(n)||(n.ageBand==='high-school'&&!d.goalFit))return r;
  if(value==='revise'){d.decision='revise';p.pendingRevision=true;p.completed=false;p.phase='replacement';}
  else if(value==='keep'){d.decision='keep';p.completed=true;n.step='story';}
 }
 return n;
}
export function addActiveTime(r,ms,step=r.step){
 if(!r.timing||r.timing.finishedAt||step==='book'||!Number.isFinite(ms)||ms<0||ms>30000)return r;
 return {...r,timing:{...r.timing,startedAt:r.timing.startedAt||new Date().toISOString(),activeMs:r.timing.activeMs+ms,byStep:{...r.timing.byStep,[step]:(r.timing.byStep[step]||0)+ms}}};
}
export function unknownRecord(r){
 const d=r.planning.draft;
 return {status:'unverified',method:r.planning.method,systemSelection:{authorType:'system',selectedBy:'learner',ids:[...d.unknownInfoIds]},learnerText:{authorType:'learner',text:d.unknownText}};
}

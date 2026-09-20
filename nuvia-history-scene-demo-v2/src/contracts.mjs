export const PATHS=['attention','simultaneous','sequential','planning'];
export const STEPS=['actual','condition','prediction','path','story','historyComparison','predictionComparison','book'];

export function createRun(path='attention',now=Date.now()){
  if(!PATHS.includes(path)) path='attention';
  return {schemaVersion:'demo.contract.v1',runMode:'demo',resultId:`demo:w24-c2:${now}:${Math.random().toString(36).slice(2,8)}`,attemptId:`attempt:${now}`,missionId:'gutenberg',conditionId:'gutenberg.c2',locale:'ko',contentVersion:'w24-1.0.0-demo-contract',path,step:'actual',prediction:null,evidence:{},story:{mode:'drawing',drawing:null,text:'',saved:false},comparisons:{history:{status:'empty',value:''},prediction:{status:'empty',value:''}},events:[],updatedAt:new Date(now).toISOString()};
}

export function evidenceComplete(run){
  const e=run.evidence;
  if(run.path==='attention') return Array.isArray(e.clues)&&new Set(e.clues).size>=2&&e.clues.every(x=>['who','when'].includes(x));
  if(run.path==='simultaneous') return ['person','place','method'].every(k=>typeof e[k]==='string'&&e[k]);
  if(run.path==='sequential') return Array.isArray(e.order)&&new Set(e.order).size===3&&['ask','meet','share'].every(x=>e.order.includes(x));
  return Boolean(e.goal&&e.method&&e.outcomeSeen&&['keep','revise'].includes(e.decision));
}

export function bookState(run){
  const provided=['history','prediction'].filter(k=>run.comparisons[k].status==='recorded').length;
  return provided===2?'assembled':provided===1?'partial':'pendingComparison';
}

export function validateRun(run){
  if(run.runMode!=='demo'||!run.resultId.startsWith('demo:')) throw Error('DEMO_NAMESPACE_REQUIRED');
  if(run.locale!=='ko') throw Error('LANGUAGE_NOT_PROVIDED');
  if(!PATHS.includes(run.path)||!STEPS.includes(run.step)) throw Error('INVALID_DEMO_STATE');
  if(run.step!=='actual'&&run.prediction===undefined) throw Error('INVALID_PREDICTION_STATE');
  return true;
}

export function event(run,kind,payload={}){
  return {...run,events:[...run.events,{eventId:`evt:${Date.now()}:${run.events.length}`,attemptId:run.attemptId,actorType:'learner',kind,payload,at:new Date().toISOString()}],updatedAt:new Date().toISOString()};
}

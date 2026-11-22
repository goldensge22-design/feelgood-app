import test from 'node:test';
import assert from 'node:assert/strict';
import {accountPlannerSourceCurrent,confirmPlannerEvidence,editAccountStory,pickCompany,studyApp} from './account-journey';
import {emptyState,mergeAsDraft} from './career';

const sample={reference:'note:2026-11-21',title:'일상 기록',date:'2026-11-21',action:'비교 기준을 먼저 적었어요.',context:'thought_exercise' as const,version:'2026-11-21T05:00:00Z'};

test('only a confirmed excerpt enters the story; it is not an achieved result',()=>{
  const [workspace,id]=confirmPlannerEvidence(emptyState(),sample);
  assert.ok(id);
  assert.equal(workspace.experiences[0].action,sample.action);
  assert.equal(workspace.experiences[0].activityContext,'thought_exercise');
  assert.equal(workspace.experiences[0].result,'');
  assert.equal(workspace.activities[0].status,'partial');
  assert.deepEqual(confirmPlannerEvidence(workspace,sample),[workspace,id]);
  assert.equal(confirmPlannerEvidence(workspace,{...sample,action:''})[1],null);
});

test('original note revision change makes an earlier excerpt unavailable for new confirmation',()=>{
  const [workspace]=confirmPlannerEvidence(emptyState(),sample);
  const attachment=workspace.experiences[0];
  const encode=(updatedAt:string,text:string)=>JSON.stringify({studio:{dailyNotes:{[sample.date]:{updatedAt,text}}}});
  assert.equal(accountPlannerSourceCurrent(encode(sample.version,`비공개 문장\n${sample.action}`),attachment),true);
  assert.equal(accountPlannerSourceCurrent(encode('later',sample.action),attachment),false);
  assert.equal(accountPlannerSourceCurrent(encode(sample.version,'changed'),attachment),false);
});

test('changing adult public material does not change the youth text or the adult draft body',()=>{
  const first=editAccountStory(emptyState(),'youth',{text:'청소년 원문'},'story');
  const second=editAccountStory(first,'adult',{text:'성인 원문'},'story');
  const next=pickCompany(second,{company:'Test',job:'Testing',keyword:'Compare',excerpt:'Public excerpt',url:'https://example.com/',observedAt:'2026-11-21T05:00:00Z'},'story');
  assert.equal(studyApp(next,'youth')?.text,'청소년 원문');
  assert.equal(studyApp(next,'youth')?.company,'');
  assert.equal(studyApp(next,'adult')?.text,'성인 원문');
  assert.equal(studyApp(next,'adult')?.company,'Test');
});

test('conflict recovery does not replace the saved planner or active story',()=>{
  const base=editAccountStory(emptyState(),'youth',{text:'공통'},'story');
  const remote={...editAccountStory(base,'youth',{text:'서버 원문',integratedThought:'서버의 생각'},'story'),integrated:{...base.integrated,planner:'server'}};
  const local={...editAccountStory(base,'youth',{text:'이 탭 원문',integratedThought:'이 탭의 생각'},'story'),integrated:{...base.integrated,planner:'this-tab'}};
  const {state}=mergeAsDraft(remote,local);
  assert.equal(state.integrated?.planner,'server');
  assert.equal(state.integrated?.plannerRecovery,'this-tab');
  assert.equal(studyApp(state,'youth')?.text,'서버 원문');
  assert.equal(studyApp(state,'youth')?.integratedThought,'서버의 생각');
  const copy=state.applications.find(x=>x.text==='이 탭 원문');
  assert.equal(copy?.integratedThought,'이 탭의 생각');
  assert.notEqual(copy?.id,studyApp(state,'youth')?.id);
});

test('LAB recovery keeps newer selection and saves separately reviewable sources',()=>{
  const material={company:'Company',job:'Work',keyword:'Accuracy',excerpt:'Short official excerpt',url:'https://example.com/search',observedAt:'2026-11-21T05:00:00Z'};
  const server={...emptyState(),integrated:{youthInterest:'current',companySource:material}};
  const local={...emptyState(),integrated:{youthInterest:'alternate',companySource:{...material,keyword:'Other'}}};
  const {state}=mergeAsDraft(server,local);
  assert.equal(state.integrated?.youthInterest,'current');
  assert.deepEqual(state.integrated?.recoveredYouthInterests,['alternate']);
  assert.equal(state.integrated?.companySource?.keyword,'Accuracy');
  assert.equal(state.integrated?.recoveredCompanySources?.[0]?.keyword,'Other');
});

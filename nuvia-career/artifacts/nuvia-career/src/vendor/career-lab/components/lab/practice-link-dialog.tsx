import { useEffect, useState, useRef } from 'react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { now, uid, type PracticeCard, type PracticeLink } from '@/vendor/career-lab/lib/types';
import { confirmedPracticeStrengths, contentVersion, linkPractice, PRACTICE_METHODS, type PracticeRequest } from '@/vendor/career-lab/lib/practice';
import { programById } from '@/vendor/career-lab/lib/universities';
import { majorById, ACTIVITY_KINDS, FIELDS } from '@/vendor/career-lab/lib/catalog';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/vendor/career-lab/components/ui/dialog';
import { DialogLanguageHeader as DialogHeader } from './language-controls';
import { LField, TextIn, TextArea, Select } from './ui';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { PublicText } from './public-text';
import { ActivitySupport } from './activity-support';
import { SimulationBuilder } from './simulation-builder';
import { blankSupport, type SimulationTask } from '@/vendor/career-lab/lib/activity-assistance';
import { qualitativeText } from '@/vendor/career-lab/lib/recommendation-policy';
import type { SupportDraft } from '@/vendor/career-lab/lib/types';

function simulationRef(request:PracticeRequest,task:SimulationTask){
  const canonical=JSON.stringify({...task,...task.productSources,productSources:undefined,strengthIds:[...task.strengthIds].sort()});
  return {id:`lab:simulation:${contentVersion(`${request.sourceType}:${request.sourceId}:${canonical}`)}`,version:`sim1-${contentVersion(canonical)}`};
}
export function PracticeLinkDialog(){
  const {state:s,update}=useLab();
  const {t}=useLocale();
  const [request,setRequest]=useState<PracticeRequest|null>(null);
  const [target,setTarget]=useState('new'),[title,setTitle]=useState(''),[date,setDate]=useState(''),[minutes,setMinutes]=useState(30);
  const [kind,setKind]=useState('작은 프로젝트'),[scope,setScope]=useState(''),[strength,setStrength]=useState('');
  const [method,setMethod]=useState<PracticeLink['method']>('original'),[mode,setMode]=useState<PracticeLink['mode']>('everyday');
  const [message,setMessage]=useState('');
  const [support,setSupport]=useState<SupportDraft>(blankSupport),[newStrength,setNewStrength]=useState('');
  const [simulation,setSimulation]=useState<SimulationTask>();
  const [titleSource,setTitleSource]=useState<string>();
  useEffect(()=>{setTitleSource(undefined);},[request]);
  const saved=useRef(false),session=useRef('');
  useEffect(()=>{
    const open=(e:Event)=>{setRequest((e as CustomEvent<PracticeRequest>).detail);setTarget('new');setTitle('');setDate('');setMinutes(30);setScope('');setSupport(blankSupport());setSimulation(undefined);saved.current=false;session.current=uid();setStrength('');setNewStrength('');setMethod('original');setMode('everyday');setMessage('');};
    window.addEventListener('careerlab:practice-request',open);return()=>window.removeEventListener('careerlab:practice-request',open);
  },[]);
  const strengths=confirmedPracticeStrengths(s),chosen=strengths.find(x=>x.id===strength),plan=PRACTICE_METHODS[method];
  const available=s.tests.flatMap(x=>x.strengths).map(x=>({...x,text:qualitativeText(x.text)})).filter(x=>x.text);
  const addStrength=()=>{
    const text=qualitativeText(newStrength);if(!text)return setMessage('점수 대신 내가 확인한 질적 강점을 적어 주세요.');
    const id=uid();update(d=>{
      if(!d.tests.length)d.tests.push({id:uid(),name:'',date:'',results:'',features:'',inputMethod:'manual',strengths:[],updatedAt:now()});
      d.tests[0].strengths.push({id,text,kind:'self',fit:'similar',note:''});
    });setStrength(id);setNewStrength('');setMessage('');
  };
  const save=()=>{
    if(!request)return;
    if(saved.current)return;
    if(mode==='simulation'&&(!simulation||simulation.method!==method||JSON.stringify(simulation.strengthIds)!==JSON.stringify(chosen?[chosen.id]:[])))return setMessage('가상 과제와 제목을 먼저 제안받고 확인해 주세요.');
    if(target!=='new'&&s.activities.find(a=>a.id===target)?.status!=='planned')return setMessage('아직 시작하지 않은 일정에 연결해 주세요.');
    if(target==='new'&&!title.trim())return setMessage('활동 이름을 적어 주세요.');
    if(strength&&!chosen)return setMessage('선택한 특징이 나의 강점인지 먼저 확인해 주세요.');
    const p=request.sourceType==='program'?programById(s,request.sourceId):undefined;
    const field=FIELDS.find(x=>x.id===request.sourceId),major=majorById(request.sourceId);
    const roleField=FIELDS.find(f=>f.roles.some(r=>r.id===request.sourceId)),role=roleField?.roles.find(r=>r.id===request.sourceId);
    const canonicalText=request.sourceType==='field'?field?.tryIt:request.sourceType==='major'?major?.tryIt:request.sourceType==='role'?role?.tryIt:undefined;
    const canonicalLabel=field?.name||major?.name||(role&&roleField?`${role.name} (${roleField.name})`:undefined);
    const card:PracticeCard={...request,simulation:mode==='simulation'?simulation:undefined,text:mode==='simulation'&&simulation?JSON.stringify(simulation):canonicalText||request.text,sourceLabel:canonicalLabel||request.sourceLabel,id:mode==='simulation'&&simulation?simulationRef(request,simulation).id:`lab:${request.sourceType}:${request.sourceId}`,version:'1',
      sourceSnapshot:request.sourceSnapshot||(p?{programId:p.id,universityOriginal:p.universityOriginal,programOriginal:p.programOriginal,sources:p.sources.map(({url,academicVersion,checkedAt,language,status})=>({url,academicVersion,checkedAt,language,status}))}:undefined)};
    card.version=mode==='simulation'&&simulation?simulationRef(request,simulation).version:`lab1-${contentVersion(JSON.stringify([card.text,card.sourceLabel,card.sourceSnapshot]))}`;
    const id=target==='new'?session.current:target,key=`${card.id}@${card.version}`;
    if(s.activities.find(x=>x.id===id)?.practiceLinks?.some(x=>x.cardKey===key))return setMessage('이미 이 과제에 연결된 카드예요. 새 활동을 만들지 않았어요.');
    saved.current=true;
    update(d=>{
      if(target==='new'&&!d.activities.some(a=>a.id===id))d.activities.push({id,title:title.trim(),titleSource:mode==='simulation'?titleSource:undefined,date,durationMin:minutes,kind,purpose:scope,support,simulation:mode==='simulation'?simulation:undefined,todos:mode==='simulation'&&simulation?simulation.steps.map((text,i)=>({id:uid(),text,done:false,productSource:simulation.productSources?.steps?.[i]})):[],artifact:mode==='simulation'&&simulation?simulation.artifact:'',artifactSource:mode==='simulation'&&typeof simulation?.productSources?.artifact==='string'?simulation.productSources.artifact:undefined,sourceType:request.sourceType,sourceId:request.sourceId,sourceLabel:request.sourceLabel,status:'planned',createdAt:now(),updatedAt:now(),sourceSnapshot:card.sourceSnapshot});
      linkPractice(d,card,id,{cardKey:key,strengthIds:chosen?[chosen.id]:[],interestIds:s.interests.map(x=>x.id),majorId:s.tempMajor,method,scope,support,simulation:mode==='simulation'?simulation:undefined,mode,linkedAt:''});
    });setRequest(null);
  };
  return <Dialog open={!!request} onOpenChange={x=>!x&&setRequest(null)}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>활동카드 연결</DialogTitle><DialogDescription>카드는 준비를 돕는 제안이에요. 연결만으로 활동을 시작하거나 완료하지 않아요.</DialogDescription></DialogHeader>
    {request&&<div className="space-y-4" data-testid="practice-link-form">
      <p className="rounded-xl bg-secondary p-3"><b>기본 활동</b><br/><span data-testid="practice-base-text">{request.sourceId==='startup'||request.sourceId.startsWith('job:')?<bdi data-i18n-original>{request.text}</bdi>:t(request.text)}</span></p>
      <p>왜 해보나요? {request.sourceType==='program'&&programById(s,request.sourceId)?.recordKind==='official'?<><PublicText text={programById(s,request.sourceId)!.universityOriginal}/> · <PublicText text={programById(s,request.sourceId)!.programOriginal}/></>:request.sourceType==='program'||request.sourceId==='startup'||request.sourceId.startsWith('job:')?<bdi data-i18n-original>{request.sourceLabel}</bdi>:t(request.sourceLabel)} 탐색을 나의 관심·강점과 연결해 질문을 확인해요.</p>
      <p>관심사: {s.interests.length?<bdi data-i18n-original>{s.interests.map(x=>x.text).join(', ')}</bdi>:'아직 없음'} · 탐색 학과: {majorById(s.tempMajor)?.name||'미정'}</p>
      <LField label="활용할 강점" hint="결과지 또는 직접 적은 특징에서 내가 확인한 강점을 선택해요. 점수로 강점을 진단하지 않아요."><Select value={strength} onChange={e=>setStrength(e.target.value)} options={[{value:'',label:'활용할 강점을 선택하거나 직접 적기'},...available.map(x=>({value:x.id,label:x.text}))]} data-testid="practice-strength"/></LField>
      {strength&&!chosen&&<Button type="button" variant="outline" onClick={()=>update(d=>{for(const test of d.tests)for(const x of test.strengths)if(x.id===strength)x.fit='similar';})} data-testid="practice-confirm-strength">선택한 특징이 나의 강점임을 확인</Button>}
      {!available.length&&<p>아직 확인한 강점이 없어요. 아래에 직접 적거나 나 이해하기에서 결과지를 확인해 주세요.</p>}
      <LField label="강점 직접 적기"><TextIn value={newStrength} onChange={e=>setNewStrength(e.target.value)} data-testid="practice-new-strength" /></LField>
      <Button type="button" variant="outline" onClick={addStrength} data-testid="practice-add-strength">직접 적은 강점 확인·추가</Button>
      <LField label="활동 방식"><Select value={method} onChange={e=>setMethod(e.target.value as PracticeLink['method'])} options={Object.entries(PRACTICE_METHODS).map(([value,x])=>({value,label:x.name}))} data-testid="practice-method"/></LField>
      <p>선택한 강점을 연습에 활용해 보는 방식이지 능력·적합도 판정은 아니에요.</p>
      {chosen&&method!=='original'&&<p data-testid="practice-adaptation">내가 확인한 강점 <bdi data-i18n-original>{chosen.text}</bdi> · 활용 방식: {plan.name} · 이 방식을 아래 단계와 결과물 계획에 적용해요.</p>}
      <ol className="list-inside list-decimal space-y-1" data-testid="practice-steps">{plan.steps.map(x=><li key={x}>{x}</li>)}</ol>
      <p>남길 결과 (계획): {plan.result}</p>
      <ActivitySupport value={support} onChange={v=>{setSupport(v);setScope(v.scope);}} id="practice-support" scopeTestId="practice-scope" method={method} context={{activity:request.text,activityProduct:['field','major','role'].includes(request.sourceType)&&request.sourceId!=='startup'&&!request.sourceId.startsWith('job:'),interests:s.interests.map(x=>x.text),strengths:chosen?[chosen.text]:[]}} />
      <LField label="연습 상황"><Select value={mode} onChange={e=>setMode(e.target.value as PracticeLink['mode'])} options={[{value:'everyday',label:'일상 탐색·연습'},{value:'simulation',label:'가상 직무 상황 연습'}]} data-testid="practice-mode"/></LField>
      <p>가상 연습은 실제 기업 근무·직무 경험이 아니에요. 개인 응답은 외부에 자동 전송하지 않아요.</p>
      {mode==='simulation'&&<SimulationBuilder context={{method,strengthIds:chosen?[chosen.id]:[],strengths:chosen?[chosen.text]:[],interests:s.interests.map(x=>x.text)}} onConfirm={task=>{
        setSimulation(task);setTitle(task.title);setTitleSource(typeof task.productSources?.title==='string'?task.productSources.title:undefined);setMinutes(task.minutes);setScope(task.scope);
        setSupport(v=>({...v,scope:task.scope,scopeSource:typeof task.productSources?.scope==='string'?task.productSources.scope:undefined,questions:[...v.questions,...task.questions.map((question,i)=>({id:uid(),question,answer:'',productSource:Array.isArray(task.productSources?.questions)?task.productSources.questions[i]:undefined})).filter(candidate=>!v.questions.some(q=>q.question===candidate.question))]}));
        const card:PracticeCard={...request,...simulationRef(request,task),text:task.title,simulation:task};
        update(d=>{(d.practiceCards||={})[`${card.id}@${card.version}`] ||= card;});
      }} />}
      <LField label="연결할 과제"><Select value={target} onChange={e=>setTarget(e.target.value)} options={[{value:'new',label:'새 활동에 연결'},...s.activities.filter(x=>x.status==='planned').map(x=>({value:x.id,label:x.title}))]} data-testid="practice-target"/></LField>
      {target==='new'&&<div className="grid gap-3 sm:grid-cols-2">
        <LField label="내 활동 제목"><TextIn value={titleSource?t(titleSource):title} onChange={e=>{setTitle(e.target.value);setTitleSource(undefined);}} data-testid="practice-title"/></LField>
        <LField label="종류"><Select value={kind} onChange={e=>setKind(e.target.value)} options={ACTIVITY_KINDS.map(x=>({value:x,label:x}))}/></LField>
        <LField label="날짜"><TextIn type="date" value={date} onChange={e=>setDate(e.target.value)} data-testid="practice-date"/></LField>
        <LField label="시간(분)"><TextIn type="number" min={0} value={minutes} onChange={e=>setMinutes(Math.max(0,Number(e.target.value)||0))} data-testid="practice-minutes"/></LField>
      </div>}
      <p>기존 과제의 제목·시간·상태·작성 내용을 덮어쓰지 않아요. 실제 실행과 회고는 플래너에서 별도로 남겨요. 외부 플래너는 기존 서버 연결 대기예요.</p>
      {message&&<p role="alert">{message}</p>}<Button onClick={save} data-testid="practice-link-save">이 설정으로 연결</Button>
    </div>}
  </DialogContent></Dialog>;
}

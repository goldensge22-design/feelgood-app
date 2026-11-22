import { useEffect, useRef, useState } from 'react';
import type { CareerAiAssistInput, CareerAiAssistResponse, CareerExperience, CareerState } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { readReport } from '@/lib/career';
import { contextHash, forgetTicket, persistTicket, readTicket, receiveJob, ticketKey, type AiTicket } from '@/lib/ai-job-client';
import { validateAiResponse } from '@/lib/ai-response';
import type { StoryboardDraft, StorySections } from '@/lib/storyboard';

type Kind='draft'|'refine';
type AccountEvidence={item:CareerExperience;simulated:boolean;context:CareerAiAssistInput['experiences'][number]['context'];revision:string;
  connection?:CareerAiAssistInput['experiences'][number]['jobConnection']};
const fields=['느낀 점','말하고 싶은 핵심','선호 표현'];
const empty={ids:[] as string[],thoughts:['','',''],reportOk:false,section:2,results:{} as Partial<Record<Kind,{hash:string;response:CareerAiAssistResponse}>>,original:null as StorySections|null};
const sectionNames=['소개','관심 직무와 이유','내 경험','배움과 다음 적용'];

export function accountStoryInput(args:{draft:StoryboardDraft;report:ReturnType<typeof readReport>;experiences:AccountEvidence[];thoughts:string[];kind:Kind;includeReport:boolean;hash:string;section:number}):CareerAiAssistInput {
  const {draft,report,experiences,thoughts,kind,includeReport,hash,section}=args;
  const limit=(s:string,n:number)=>s.slice(0,n);
  return {
    task:'draft',locale:'ko',writingLanguage:'ko',sourceFingerprint:hash,confirmed:true,factsConfirmed:true,coachPrompt:'',
    application:{company:limit(draft.company,500),job:limit(draft.job,500),
      question:`강점 스토리보드의 ‘${sectionNames[section]}’ 부분에 넣을 짧은 문장 후보를 쓰세요. 사용한 생각 연습이나 모의 상황은 실제 행동이나 근무 성과로 말하지 마세요. 보고서의 인지 특성은 작성 지원 정보일 뿐입니다.${draft.keyword ? ` 사용자가 고른 키워드: ${limit(draft.keyword,150)} (검증된 능력 아님).`:''}`,
      body:kind==='refine'?limit(draft.sections[section],4000):''},
    strengths:includeReport && report && !report.isExample ? [
      ...(report.summary?[{name:'결과지 요약',interpretation:limit(report.summary,2000),recommendationReason:''}]:[]),
      ...report.axes.slice(0,4).map(a=>({name:limit(a.label,200),interpretation:limit(a.description,2000),recommendationReason:limit(a.strategy,2000)})),
    ]:[],
    experiences:experiences.map(({item,simulated,context,connection})=>({
      title:limit(item.title,500),nature:simulated?'simulation':'actual',context,cardType:null,
      source:item.source,sourceVersion:limit(item.sourceVersion ?? '',200),sourceTitle:connection?.sourceTitle ?? '',jobConnection:connection ?? null,
      fields:{situation:'',roleGoal:'',action:limit(item.action,3000),selectionReason:'',changed:'',result:limit(item.result,3000),learning:limit(item.learning,3000),resultEvidence:'',supportProvided:'',independentSteps:[]},
    })),
    userAnswers:kind==='refine'?thoughts.flatMap((answer,i)=>answer.trim()?[{question:`표현 참고 · ${fields[i]} (새 성과나 사실의 근거가 아님)`,answer}]:[]):[],
    voiceSources:[],voiceRules:[],
  };
}

export function StoryboardAccountAi({owner,draft,state,experiences,apply,ready}:{
  owner:string;draft:StoryboardDraft;state:CareerState;
  experiences:Parameters<typeof accountStoryInput>[0]['experiences'];
  apply:(sections:StorySections)=>void;ready:boolean;
}) {
  const key=`nuvia:storyboard-ai:v1:${owner}:${draft.id}`;
  const [data,setData]=useState<typeof empty>(()=>{ try { const v=JSON.parse(sessionStorage.getItem(key) ?? 'null');return v ? {...empty,...v} : empty; } catch {return empty;} });
  const [checked,check]=useState('');
  const {reportOk,section}=data;
  const [active,setActive]=useState<Kind|null>(null);
  const [error,setError]=useState('');
  const request=useRef<AbortController|null>(null);
  const live=useRef('');
  const epoch=useRef(0);
  const chosen=experiences.filter(x=>data.ids.includes(x.item.id));
  const report=readReport(state.report);
  const summaryContext=JSON.stringify([draft.id,draft.revision,draft.company,draft.job,draft.keyword,draft.sections,
    report,reportOk,section,data.ids,chosen,data.thoughts]);
  const nextContext=ready?summaryContext:'';
  if(live.current!==nextContext){live.current=nextContext;epoch.current++;}
  const [computed,setHash]=useState<{value:string;context:string}>();
  const hash=computed?.context===summaryContext ? computed?.value ?? '' : '';
  useEffect(()=>{
    let live=true;
    void contextHash(summaryContext).then(value=>{if(live)setHash({value,context:summaryContext});}).catch(()=>{if(live)setError('안전한 연결에서 다시 열어 주세요.');});
    return ()=>{live=false;};
  },[summaryContext]);
  useEffect(()=>()=>{live.current='';request.current?.abort();},[]);
  function save(next:typeof data) {
    setData(next);
    try {sessionStorage.setItem(key,JSON.stringify(next));return true;}
    catch {setError('이 탭에 저장하지 못했습니다. 본문은 바꾸지 않았습니다.');return false;}
  }
  async function generate(kind:Kind) {
    if (request.current || !ready || checked!==summaryContext || !chosen.length || !hash) return;
    const expected=summaryContext;
    const at=epoch.current;
    const controller=new AbortController();
    const keyForJob=ticketKey(owner,`storyboard:${draft.id}:${kind}`);
    request.current=controller;setActive(kind);setError('');
    try {
      const stamp=await contextHash(JSON.stringify([kind,expected]));
      if(live.current!==expected || epoch.current!==at || controller.signal.aborted)return;
      const old=readTicket(keyForJob);
      const ticket:AiTicket=old?.contextHash===stamp?old:{clientId:crypto.randomUUID(),contextHash:stamp,fingerprint:stamp,
        action:'draft',experienceIds:chosen.map(x=>x.item.id),language:'ko',purpose:'storyboard'};
      persistTicket(keyForJob,ticket);
      const params={draft,report,experiences:chosen,thoughts:data.thoughts,kind,includeReport:reportOk,hash:stamp,section};
      const result=validateAiResponse(await receiveJob(ticket,keyForJob,controller.signal,old===ticket?undefined:accountStoryInput(params)));
      if (live.current!==expected || epoch.current!==at || controller.signal.aborted) return;
      if (result.sourceFingerprint!==stamp || result.task!=='draft') throw new Error('AI_INVALID_RESPONSE');
      // The same account + fingerprint recovers the completed job without dispatching again.
      save({...data,results:{...data.results,[kind]:{hash,response:result}}});
    } catch (err) {
      if (controller.signal.aborted || live.current!==expected) return;
      const code=err instanceof Error?err.message:'';
      if (['AI_NOT_CONFIGURED','AI_MODEL_CONFIG','AI_INVALID_RESPONSE','AI_LOCAL_LIMIT','AI_CLASS_LIMIT','AI_USAGE_LIMIT','AI_PROVIDER_BUSY','AI_INPUT_LIMIT'].includes(code)) {
        const pending=readTicket(keyForJob); if(pending)forgetTicket(keyForJob,pending.clientId);
      }
      const labels:Record<string,string>={AI_NOT_CONFIGURED:'AI 연결 설정이 필요합니다.',AI_MODEL_CONFIG:'현재 모델 설정으로 요청할 수 없습니다.',AI_USAGE_LIMIT:'AI 이용한도에 도달했습니다.',AI_PROVIDER_BUSY:'AI가 잠시 혼잡합니다.',AI_CLASS_LIMIT:'수업의 AI 요청 상한에 도달했습니다.',AI_LOCAL_LIMIT:'현재 요청이 많습니다. 잠시 후 다시 시도해 주세요.',AI_INVALID_RESPONSE:'AI 응답 형식을 확인하지 못했습니다.',AI_RESULT_EXPIRED:'이전 요청 결과의 보관 기간이 지났습니다.',AI_UNCERTAIN:'기존 요청 결과를 확인할 수 없습니다. 새 요청을 자동으로 보내지 않습니다.'};
      setError(labels[code] ?? 'AI 연결을 확인하지 못했습니다. 입력은 그대로 유지됩니다.');
    } finally { if(request.current===controller){request.current=null;setActive(null);} }
  }
  function insert(kind:Kind,text:string) {
    if(!ready || hash!==data.results[kind]?.hash || !hash) return;
    if(!save({...data,original:[...draft.sections]}))return;
    apply(draft.sections.map((old,i)=>i===section?text:old) as StorySections);
  }
  return <details className="space-y-3 rounded-2xl border bg-card p-4" data-testid="account-storyboard-ai">
    <summary className="min-h-11 cursor-pointer content-center font-bold">AI 문장 만들기 · 나의 생각으로 문장 다듬기</summary>
    <p className="text-sm text-muted-foreground">로그인한 계정에서 확인한 기록만 보냅니다. 검사 점수, 미선택 경험, 비공개 메모는 보내지 않습니다. 기업에 공유하지 않습니다.</p>
    {!experiences.length && <p className="text-sm">이 계정에 사용 가능한 확인된 기록이 아직 없습니다. 데모 기록은 이 계정으로 옮겨지지 않습니다.</p>}
    <label className="block text-sm font-bold">문장을 넣을 부분<select value={section} className="ms-2 min-h-11 rounded-lg border bg-card p-2" onChange={e=>save({...data,section:Number(e.target.value)})}>{sectionNames.map((name,i)=><option key={i} value={i}>{name}</option>)}</select></label>
    {report && !report.isExample && <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={reportOk} onChange={e=>save({...data,reportOk:e.target.checked})}/>결과지 해석도 사용 (점수 제외)</label>}
    {reportOk && report && <details className="rounded border p-2"><summary className="min-h-11 cursor-pointer content-center text-sm">전송할 결과지 해석 미리 보기</summary><p className="whitespace-pre-wrap break-words text-sm">{report.summary}</p>{report.axes.map(a=><p key={a.key} className="break-words text-sm">{a.label} · {a.description} · {a.strategy}</p>)}</details>}
    <div className="grid gap-2 md:grid-cols-2">
      {experiences.map(({item,simulated,connection})=><article key={item.id} className="min-w-0 rounded border p-2"><label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={data.ids.includes(item.id)} disabled={!data.ids.includes(item.id) && data.ids.length>=6}
          onChange={e=>save({...data,ids:e.target.checked?[...data.ids,item.id]:data.ids.filter(i=>i!==item.id)})}/>{item.title} {simulated?'· 모의':''}</label>
        <details><summary className="min-h-11 cursor-pointer content-center text-sm">선택한 경우 전송할 내용</summary><p className="whitespace-pre-wrap break-words text-sm">{[item.action,item.result,item.learning].filter(Boolean).join('\n\n')}</p>
          {connection && <p className="mt-2 whitespace-pre-wrap break-words text-sm">확인한 직무 연결: {connection.sourceTitle} · {connection.sourceVersion}{'\n'}{connection.specificDuty}{'\n'}{connection.sharedAction}{'\n'}{connection.learnedPrinciple}{'\n'}{connection.futureApplication}</p>}</details>
      </article>)}
    </div>
    <div className="grid gap-2 md:grid-cols-3">{data.thoughts.map((text,i)=><label key={i} className="text-sm font-semibold">{fields[i]}<textarea dir="auto" className="block min-h-11 w-full rounded border bg-card p-2 font-normal" value={text} maxLength={500} onChange={e=>save({...data,thoughts:data.thoughts.map((s,j)=>j===i?e.target.value:s)})}/></label>)}</div>
    <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={checked===summaryContext} onChange={e=>check(e.target.checked?summaryContext:'')}/>선택한 기록의 사실을 확인했고 위 자료를 AI에 보내는 데 동의합니다. 다듬기에는 내가 고른 부분의 본문과 내 생각도 보냅니다.</label>
    <div className="flex flex-wrap gap-2"><Button disabled={!ready || !chosen.length || checked!==summaryContext || !!active} onClick={()=>void generate('draft')}>AI 문장 만들기</Button>
      <Button variant="outline" disabled={!ready || !chosen.length || checked!==summaryContext || !!active || !data.thoughts.some(s=>s.trim())} onClick={()=>void generate('refine')}>AI로 생각 반영하여 다듬기</Button>
      {active && <Button variant="ghost" onClick={()=>{request.current?.abort();setError('결과 확인을 멈췄습니다. 같은 자료로 다시 열면 기존 요청을 확인합니다.');}}>결과 확인 멈추기</Button>}
    </div>
    {active && <p role="status" className="text-sm">보낸 요청의 결과를 기다리는 중입니다. 화면을 다시 열어도 같은 자료의 요청을 확인할 수 있습니다.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {(data.results.draft || data.results.refine) && <div className="grid gap-2 md:grid-cols-3">
      <div className="min-w-0 rounded border p-3"><h3 className="font-bold">내 원문</h3><p className="whitespace-pre-wrap break-words text-sm">{(data.original ?? draft.sections)[section] || '미작성'}</p></div>
      {(['draft','refine'] as const).map(kind=>{const r=data.results[kind]; return <div key={kind} className="min-w-0 space-y-2 rounded border p-3"><h3 className="font-bold">{kind==='draft'?'AI 제안':'AI · 나의 생각 반영안'}</h3>
        {r && r.hash!==hash && <p className="text-sm text-muted-foreground">이전 자료의 후보 · 적용 불가</p>}
        {r?.response.candidates.map((c,i)=><div key={i} className="space-y-1 rounded border p-2"><p className="whitespace-pre-wrap break-words text-sm">{c.text}</p>
          <p className="break-words text-xs text-muted-foreground">{c.rationale}</p>
          <details><summary className="min-h-11 cursor-pointer content-center text-xs">AI가 제시한 근거와 주의사항</summary><p className="break-words text-sm">{c.sourceFacts.join('\n')} {c.caution}</p></details>
          <Button variant="outline" disabled={!ready || !hash || r.hash!==hash || !!active} onClick={()=>insert(kind,c.text)}>이 후보를 선택해 적용</Button>
        </div>)}
        {r && !r.response.candidates.length && <p className="text-sm">{r.response.coachQuestion || r.response.notice || '기록의 근거를 더 확인해 주세요.'}</p>}
      </div>})}
    </div>}
    {data.original && <Button variant="outline" onClick={()=>{const original=data.original;if(original && save({...data,original:null}))apply(original);}}>적용 전 원문으로 되돌리기</Button>}
    <p className="text-xs text-muted-foreground">AI 비교 후보와 내 생각은 이 계정의 현재 브라우저 탭에만 보관합니다. 적용하지 않은 내용은 내보내지 않습니다.</p>
  </details>;
}

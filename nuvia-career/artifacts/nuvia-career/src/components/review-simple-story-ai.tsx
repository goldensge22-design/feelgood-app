import {useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {getReviewStory,startReviewStory,type ReviewStoryEvidence,type ReviewStoryInput,type ReviewStoryJob} from '@workspace/api-client-react';
import {Link} from 'wouter';
import {Button} from '@/components/ui/button';
import {useI18n} from '@/lib/i18n';
import {contextHash} from '@/lib/ai-job-client';
import {ReviewAiAccount,ReviewLabSession} from '@/lib/review-lab-session';
import {loadJSON,saveJSON} from '@/lib/career';
import {recordReviewAction} from '@/lib/review-trail';

type Kind=ReviewStoryInput['kind'];
type Ticket={id:string;stamp:string;kind:Kind;result?:ReviewStoryJob['result'];dismissed?:boolean};
type Props={id:string;revision:number;materialEpoch:number;persistMaterial:()=>boolean;body:string;thought:string;evidence:ReviewStoryEvidence[];ready:boolean;apply:(text:string)=>void;
  children:(ui:{generate:ReactNode;refine:ReactNode;feedback:ReactNode})=>ReactNode};

function pause(signal:AbortSignal){
  return new Promise<void>((resolve,reject)=>{
    const stop=()=>{clearTimeout(timer);reject(signal.reason);};
    const timer=window.setTimeout(()=>{signal.removeEventListener('abort',stop);resolve();},1250);
    if(signal.aborted)stop();else signal.addEventListener('abort',stop,{once:true});
  });
}

export function ReviewSimpleStoryAi(props:Props){
  const account=useContext(ReviewAiAccount);
  return <StoryAccount key={account??'guest'} {...props} account={account}/>;
}

function StoryAccount({id,revision,materialEpoch,persistMaterial,body,thought,evidence,ready,apply,children,account}:Props&{account:string|null}){
  const {t,locale}=useI18n(),token=useContext(ReviewLabSession);
  const [key,setKey]=useState(''),[ticket,setTicket]=useState<Ticket|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[approved,setApproved]=useState(false);
  const [intent,setIntent]=useState<{kind:Kind;context:string}|null>(null);
  const run=useRef<AbortController|null>(null);
  const context=JSON.stringify([revision,materialEpoch,ready,body,thought,evidence]);
  const contextRef=useRef(context);
  contextRef.current=context;
  const [fingerprint,setFingerprint]=useState<{context:string;stamp:string}>();
  const stamp=fingerprint?.context===context?fingerprint.stamp:'';
  const current=!!stamp&&ticket?.stamp===stamp;
  useEffect(()=>{
    let live=true;
    if(account)void contextHash(account).then(hash=>{
      if(!live)return;
      const scope=`review:story-gpt:v1:${id}:${hash}`;
      setKey(scope);setTicket(loadJSON<Ticket>(scope));
    }).catch(()=>{if(live)setError('simpleStory.setup');});
    return()=>{live=false;run.current?.abort();};
  },[id,account]);
  useEffect(()=>{
    let live=true;
    void contextHash(context).then(next=>{if(live)setFingerprint({context,stamp:next});}).catch(()=>{if(live)setError('simpleStory.setup');});
    return()=>{live=false;};
  },[context]);
  function remember(next:Ticket){
    setTicket(next);
    if(!saveJSON(key,next))setError('daily.failed');
  }
  function open(kind:Kind){
    if(!ready||busy||!stamp||(kind==='refine'&&(!body.trim()||!thought.trim())))return;
    setApproved(false);setIntent({context,kind});setError('');
  }
  async function ask(kind:Kind,resume=false){
    if(run.current||!token||!ready||!stamp||!key||(!resume&&(!approved||intent?.context!==context)))return;
    const original=context;
    const controller=new AbortController();
    run.current=controller;setBusy(true);setError('');setIntent(null);setApproved(false);
    try{
      const jwt=await token();
      if(!jwt)throw Error('AUTH_REQUIRED');
      if(contextRef.current!==original||controller.signal.aborted)return;
      const options={signal:controller.signal,headers:{Authorization:`Bearer ${jwt}`}};
      let job:ReviewStoryJob;
      if(resume&&current&&ticket?.id)job=await getReviewStory(ticket.id,options);
      else {
        if(!persistMaterial()||!recordReviewAction('storyboard.gpt.requested','selected-review-material',{kind,revision,evidence:evidence.map(item=>item.id)}))throw Error('LOCAL_STORAGE');
        job=await startReviewStory({kind,consent:true,evidence,body:kind==='refine'?body:'',thought:kind==='refine'?thought:''},options);
      }
      const pending:Ticket={id:job.id,kind,stamp};
      if(!job.id||controller.signal.aborted||contextRef.current!==original)return;
      remember(pending);
      const deadline=Date.now()+65_000;
      while(job.state==='pending'){
        if(Date.now()>deadline)throw Error('AI_TIMEOUT');
        await pause(controller.signal);
        if(contextRef.current!==original)return;
        job=await getReviewStory(job.id,options);
      }
      if(controller.signal.aborted||contextRef.current!==original)return;
      if(job.state==='failed'){
        remember({...pending,dismissed:true});
        throw Error(job.error||'AI_UPSTREAM_FAILED');
      }
      const result=job.result;
      if(!result||typeof result.text!=='string'||typeof result.missing!=='string'||typeof result.connection!=='string'||
        !Array.isArray(result.used)||result.used.some(ref=>!evidence.some(item=>item.id===ref))||
        (!!result.text.trim()===!!result.missing.trim()))throw Error('AI_INVALID_RESPONSE');
      remember({...pending,result});
      recordReviewAction('storyboard.gpt.result','gpt',{kind,revision,evidence:result.used});
    }catch(err){
      if(controller.signal.aborted||contextRef.current!==original)return;
      const code=err instanceof Error?err.message:'';
      const status=typeof err==='object'&&err&&'status'in err?err.status:null;
      if(status===404&&current&&ticket)remember({...ticket,dismissed:true});
      setError(status===401||code==='AUTH_REQUIRED'?'simpleStory.authHint':status===404?'simpleStory.expired':
        code==='AI_USAGE_LIMIT'?'simpleStory.quota':code==='AI_PROVIDER_BUSY'?'simpleStory.providerBusy':
        code==='AI_TIMEOUT'?'simpleStory.timeout':status===429||code==='AI_LOCAL_LIMIT'?'simpleStory.limited':
        ['AI_NOT_CONFIGURED','AI_MODEL_CONFIG'].includes(code)?'simpleStory.setup':code==='LOCAL_STORAGE'?'daily.failed':'simpleStory.error');
    }finally{if(run.current===controller){run.current=null;setBusy(false);}}
  }
  const actionable=!!account&&!!key&&!!stamp&&ready&&!busy;
  const signIn=<a className="inline-flex min-h-11 items-center font-semibold text-blue underline" href={`${import.meta.env.BASE_URL.replace(/\/$/,'')}/sign-in?review-story=1&lang=${encodeURIComponent(locale)}`} data-testid="link-review-story-login">{t('simpleStory.signIn')}</a>;
  const result=current&&!ticket?.dismissed?ticket?.result:undefined;
  const feedback=<div className="space-y-3">
    {!account&&<p className="text-sm text-muted-foreground">{t('simpleStory.authHint')}<br/>{signIn}</p>}
    {account&&error==='simpleStory.authHint'&&signIn}
    {!ready&&<p className="text-sm text-muted-foreground">{t('simpleStory.need')} <Link className="text-blue underline" href="/planner">{t('nav.activities')}</Link></p>}
    {error&&<p role="alert" className="text-sm text-destructive">{t(error)}</p>}
    {busy&&<div role="status" className="flex flex-wrap items-center gap-2 text-sm">{t('simpleStory.wait')}<Button variant="outline" onClick={()=>run.current?.abort()}>{t('simpleStory.stop')}</Button></div>}
    {current&&ticket&&!ticket.result&&!ticket.dismissed&&!busy&&<Button variant="outline" onClick={()=>void ask(ticket.kind,true)}>{t('simpleStory.resume')}</Button>}
    {ticket&&!current&&stamp&&<p className="text-sm text-muted-foreground">{t('simpleStory.stale')}</p>}
    {intent?.context===context&&<section className="space-y-2 rounded-lg border bg-blue-soft p-3" role="region" aria-label={t('simpleStory.send')}>
      <h3 className="font-bold">{t('simpleStory.send')}</h3><p className="text-sm">{t('simpleStory.sendHint')}</p>
      <ul className="space-y-2 text-sm">{[...evidence.map(e=>({title:e.title,text:e.text})),...(intent.kind==='refine'?[{title:t('simpleStory.body'),text:body},{title:t('simpleStory.thought'),text:thought}]:[])].map((item,i)=>
        <li key={i} className="break-words"><details><summary className="min-h-9 cursor-pointer content-center font-medium">{item.title}</summary><p dir="auto" className="whitespace-pre-wrap">{item.text}</p></details></li>)}</ul>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input className="h-5 w-5 shrink-0" type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/>{t('simpleStory.approve')}</label>
      <div className="flex flex-wrap gap-2"><Button disabled={!approved} onClick={()=>void ask(intent.kind)}>{t('simpleStory.sendNow')}</Button>
      <Button variant="outline" onClick={()=>setIntent(null)}>{t('simpleStory.cancel')}</Button></div>
    </section>}
    {result&&ticket&&<section className="space-y-3 rounded-xl border border-blue/25 bg-blue-soft p-3" data-testid="review-simple-story-result">
      {result.text?<><div className="grid gap-2 sm:grid-cols-2">
        <div className="min-w-0"><h3 className="font-bold">{t('simpleStory.compare')}</h3><p dir="auto" className="whitespace-pre-wrap break-words text-sm">{body||t('simpleStory.none')}</p></div>
        <div className="min-w-0"><h3 className="font-bold">{t('simpleStory.candidate')}</h3><p dir="auto" className="whitespace-pre-wrap break-words text-sm">{result.text}</p></div>
      </div><p className="text-sm">{result.connection}</p><details><summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">{t('simpleStory.details')}</summary><ul className="space-y-2 text-sm">{evidence.filter(item=>result.used.includes(item.id)).map(item=><li key={item.id}><strong>{item.title}</strong><p className="whitespace-pre-wrap break-words">{item.text}</p></li>)}</ul></details>
        <Button onClick={()=>{if(current&&!busy)apply(result.text);}}>{t('simpleStory.apply')}</Button></>:<p className="text-sm">{result.missing}</p>}
      <Button variant="ghost" onClick={()=>remember({...ticket,dismissed:true})}>{t('simpleStory.dismiss')}</Button>
    </section>}
  </div>;
  return children({
    generate:<Button className="min-h-12 w-full sm:w-auto" disabled={!actionable} onClick={()=>open('generate')}>{t('simpleStory.make')}</Button>,
    refine:<Button variant="outline" className="min-h-11" disabled={!actionable||!body.trim()||body.length>10000||!thought.trim()} onClick={()=>open('refine')}>{t('simpleStory.refine')}</Button>,
    feedback,
  });
}

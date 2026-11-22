import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useI18n } from '@/lib/i18n';
import ReviewShortcutActions from '@/components/review-shortcut-actions';

export default function ReviewStudioFrame() {
  const {locale,t}=useI18n();
  const base=import.meta.env.BASE_URL.replace(/\/$/,'');
  const frame=useRef<HTMLIFrameElement>(null);
  const [attempt,setAttempt]=useState(0);
  const [status,setStatus]=useState<'loading'|'ready'|'failed'>('loading');
  const hash=location.hash.startsWith('#studio-')?location.hash:'';
  const direct=`${base}/demo/review/studio-frame.html?lang=${locale}`;
  const src=`${direct}${attempt?`&reload=${attempt}`:''}${hash}`;
  function check() {
    try {
      const value=frame.current?.contentDocument?.getElementById('root')?.dataset.reviewStudio;
      if(value==='ready'||value==='failed'){setStatus(value);return true;}
    } catch { /* status timeout also covers inaccessible documents */ }
    return false;
  }
  useEffect(()=>{
    setStatus('loading');
    const handle=(event:MessageEvent)=>{
      if(event.origin!==location.origin || event.source!==frame.current?.contentWindow || event.data?.type!=='nuvia-career-studio')return;
      if (event.data.status==='ready'||event.data.status==='failed') check();
    };
    window.addEventListener('message',handle);
    // Also covers a cached frame which finished before the listener was installed.
    check();
    const timer=setTimeout(()=>{if(!check())setStatus('failed');},12000);
    return ()=>{window.removeEventListener('message',handle);clearTimeout(timer);};
  },[src]);
  return <section className="review-embedded-studio space-y-3" data-testid="view-review-planner-list">
    <ReviewShortcutActions placement="planner"/>
    {status==='loading'&&<p role="status" data-testid="status-review-studio-loading">{t('daily.studioLoading')}</p>}
    {status==='failed'&&<div role="alert" className="rounded-lg border p-3 text-sm" data-testid="status-review-studio-failed">
      <p>{t('daily.studioFrameError')}</p>
      <button type="button" className="me-3 min-h-11 font-semibold text-blue underline" onClick={()=>setAttempt(n=>n+1)}>{t('daily.studioRetry')}</button>
      <a href={`${direct}${hash}`} className="inline-flex min-h-11 items-center font-semibold text-blue underline">{t('daily.studioOpenDirect')}</a>
    </div>}
    <iframe ref={frame} key={src} src={src} title={t('daily.studioTitle')} onLoad={check}
      className="review-embedded-frame block h-[max(28rem,calc(100dvh-8rem))] w-full rounded-xl border bg-white" data-testid="frame-review-studio" data-ready={status}/>
    <Link href="/planner/previous" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue underline">{t('daily.oldReview')}</Link>
  </section>;
}

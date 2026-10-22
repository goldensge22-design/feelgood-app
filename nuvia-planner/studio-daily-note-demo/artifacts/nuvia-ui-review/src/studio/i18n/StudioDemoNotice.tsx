import {useEffect} from 'react';
import type {Audience} from '../../demo/audiences';
import {demoText} from './demo-resources';
import {demoWarning} from './demo-copy';
import {currentLocale,label} from './runtime';
import '../../demo/notice.css';

export default function StudioDemoNotice({audience}:{audience:Audience}){
 const locale=currentLocale();
 useEffect(()=>{
  document.title=`NUVIA PLANNER · ${demoText(audience)} · ${demoText('demo')}`;
  const meta=document.createElement('meta');meta.name='robots';meta.content='noindex,nofollow';
  document.head.append(meta);return()=>meta.remove();
 },[locale,audience]);
 return <aside className="external-demo-notice" data-testid="external-demo-notice" lang={locale} dir={locale==='ar'?'rtl':'ltr'}>
  <strong>{demoText('demo')} · {demoText(audience)}</strong>
  <p data-testid="external-demo-assessment">{demoText(audience==='school'?'youth':'adult')} · {String(label('정답률'))} (%)</p>
  <p data-testid="external-demo-warning">{demoWarning()}</p>
 </aside>;
}

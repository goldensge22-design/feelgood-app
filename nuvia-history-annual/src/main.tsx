import React,{useState,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {catalog,common,messages,requiredKeys,resolveLocale,validatePack,translator,w24Url,type Mission} from './adapters';
import {HistoryShell,HistoryHeader,HistoryPanel,ChoiceCard,StatusBadge,ProgressIndicator} from '../../nuvia-history-w24/outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT/src/ui/history/HistoryUI';
import {W24Illustration} from '../../nuvia-history-w24/outputs/NUVIA_HISTORY_REPRESENTATIVE_6_v1.0_DRAFT/src/app/W24Illustration';
import './journey.css';
const t=translator(messages),q=new URLSearchParams(location.search);
function previewUrl(m:Mission,locale:string){const previous=new URL(w24Url(m,location.href,locale));previous.host=location.host;previous.pathname='/w24.html';return previous.href;}
function storedLocale(){const profile=sessionStorage.getItem('nuvia.linkedProfile.v1');if(profile){const value=JSON.parse(profile);if(typeof value.locale==='string')return value.locale;}return localStorage.getItem('nuvia.history.annual.locale.v1');}
function LanguagePicker({error}:{error?:unknown}){return <HistoryShell><HistoryHeader brand={t('brand')} wordmark={t('feelgood')}/><main className="language-panel">{common.languages!.filter(x=>x.availability==='release').map(x=><a className="history-button" key={x.code} lang={x.code} href={(()=>{const u=new URL(location.href);u.searchParams.set('lang',x.code);return u.href;})()}>{t(x.code)}</a>)}</main>{q.get('qa')==='1'&&error&&<details data-qa-inspector><summary>QA Inspector</summary><pre>{String(error)}</pre></details>}</HistoryShell>;}
const eras=[[1,4],[5,12],[13,24],[25,31],[32,39],[40,48]];
function Annual({locale}:{locale:string}){
 const [week,setWeek]=useState(()=>{const n=Number(localStorage.getItem('nuvia.history.annual.selection.v1'));return n>=1&&n<=48?n:24;}),[picker,setPicker]=useState(false);
 const selected=catalog.missions.find(m=>m.week===week)!,titleRef=useRef<HTMLHeadingElement>(null);
 function choose(value:number){setWeek(value);try{localStorage.setItem('nuvia.history.annual.selection.v1',String(value));}catch{}requestAnimationFrame(()=>{titleRef.current?.focus();titleRef.current?.scrollIntoView({block:'start',behavior:'instant'});});}
 if(picker)return <LanguagePicker/>;
 return <HistoryShell className="annual-shell"><a className="journey-skip" href="#annual-journey">{t('skip')}</a>
 <HistoryHeader brand={t('brand')} wordmark={t('feelgood')}><button onClick={()=>setPicker(true)} aria-label={t('language')}>{t('ko')}</button></HistoryHeader>
 <main data-student-play><div className="journey-heading"><div><p>{t('intro')}</p><h1>{t('title')}</h1></div><ProgressIndicator current={week} total={48} label={t('selectedWeek',{week})}/></div>
 <HistoryPanel className="selected-mission" data-selected-week={week}><div className="selected-heading"><span>{t('week',{week})}</span><h2 ref={titleRef} tabIndex={-1}>{t(selected.titleKey)}</h2><StatusBadge tone={selected.state==='executable'?'ready':'pending'}>{t(selected.state==='executable'?'executable':'notReady')}</StatusBadge></div>
 {week===24?<W24Illustration clue={false}/>:<p className="asset-notice">{t('imagePending')}</p>}
 <div className="condition-preview"><h3>{t('conditions')}</h3><div>{selected.conditions.map(c=><HistoryPanel key={c.conditionId}><p>{t(c.changedConditionKey)}</p></HistoryPanel>)}</div></div>
 {selected.state==='executable'&&<nav><a className="primary history-link" data-start-mission href={previewUrl(selected,locale)}>{t('open')}</a><a className="history-link" href={w24Url(selected,location.href,locale)}>{t('legacyOpen')}</a></nav>}
 <p className="preview-note">{t('previewNote')}</p>
 </HistoryPanel>
 <section id="annual-journey" tabIndex={-1}><h2>{t('all')}</h2>{eras.map(([first,last],i)=><section className="journey-era" key={first}><h3><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{t('era'+(i+1))}</h3><div className="journey-trail">{catalog.missions.filter(m=>m.week>=first&&m.week<=last).map(m=><ChoiceCard key={m.week} data-week={m.week} aria-pressed={m.week===week} aria-label={t('selectMission',{title:t(m.titleKey)})} onClick={()=>choose(m.week)}><span className="week-seal">{t('week',{week:m.week})}</span>{m.week===24&&<W24Illustration clue={false}/>}<strong>{t(m.titleKey)}</strong><StatusBadge tone={m.state==='executable'?'ready':'pending'}>{t(m.state==='executable'?'executable':'notReady')}</StatusBadge></ChoiceCard>)}</div></section>)}</section>
 </main><footer className="app-footer">{t('preserved')}</footer>
 {q.get('qa')==='1'&&<details className="annual-inspector" data-qa-inspector><summary>QA Inspector</summary><pre>{JSON.stringify({week,readiness:selected.readiness,runtime:selected.runtime},null,2)}</pre></details>}
 </HistoryShell>;
}
let app:React.ReactNode;
try{const locale=resolveLocale(q.get('lang'),storedLocale());validatePack(locale,messages,requiredKeys);document.documentElement.lang=locale;document.documentElement.dir='ltr';app=<Annual locale={locale}/>;}catch(error){document.documentElement.removeAttribute('lang');app=<LanguagePicker error={error}/>;}
createRoot(document.getElementById('app')!).render(app);

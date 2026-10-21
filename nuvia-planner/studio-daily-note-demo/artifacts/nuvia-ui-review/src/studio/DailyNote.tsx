import {useState} from 'react';
import type {Action,PersonalState} from './model';
import {localDate} from './domain';
import {t,intlDate,rawText} from './i18n/runtime';
import './daily-note.css';

/** Private date-keyed record: never feeds runs, assessment, reports or roadmap. */
export default function DailyNote({state,act,history=false}:{state:PersonalState;act:(a:Action)=>boolean;history?:boolean}){
 const [open,setOpen]=useState(false),[date,setDate]=useState(localDate);
 const [hints,setHints]=useState(false),[failed,setFailed]=useState(false);
 const [pending,setPending]=useState<string|null>(null),[excerpt,setExcerpt]=useState('');
 const [preview,setPreview]=useState(false),[copied,setCopied]=useState(false),[copyFailed,setCopyFailed]=useState(false);
 const notes=state.studio?.dailyNotes??{},day=history?date:localDate();
 const text=pending??notes[day]?.text??'';
 const dates=[...new Set([day,...Object.keys(notes).filter(d=>notes[d].text.trim())])].sort().reverse();
 const change=(value:string)=>{
  setPending(value);setPreview(false);setExcerpt('');setCopied(false);setCopyFailed(false);
  const ok=act({type:'studio.note',date:day,text:value});setFailed(!ok);
  if(ok)setPending(null);
 };
 return <section className="st-daily-note" data-testid={history?'daily-note-history':'daily-note'} aria-label={t('note.title')}>
  <button className="st-note-toggle" data-testid="note-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>{t(history?'note.history':'note.open')}</button>
  {open&&<div className="st-note-body">
   <p className="st-note">{t('note.private')}</p>
   {history?<label>{t('note.date')}<select data-testid="note-date" value={day} onChange={e=>{if(pending!==null)return;setDate(e.target.value);setExcerpt('');setPreview(false);setCopied(false);}}>{dates.map(d=><option key={d} value={d}>{intlDate(d)}</option>)}</select></label>:<p>{intlDate(day)}</p>}
   <label>{t('note.title')}<textarea dir="auto" data-testid="note-input" maxLength={20000} rows={3} value={text} onChange={e=>change(e.target.value)} placeholder={t('note.placeholder')}/></label>
   <p role={failed?'alert':'status'} data-testid="note-status">{t(failed?'note.failed':'note.saved')}</p>
   <button aria-expanded={hints} data-testid="note-hints" onClick={()=>setHints(!hints)}>{t('note.hints')}</button>
   {hints&&<ul><li>{t('note.tried')}</li><li>{t('note.hard')}</li><li>{t('note.next')}</li></ul>}
   <details><summary>{t('note.quote')}</summary>
    <p>{t('note.quoteHelp')}</p>
    <label>{t('note.excerpt')}<textarea dir="auto" data-testid="note-excerpt" rows={2} value={excerpt} onChange={e=>{setExcerpt(e.target.value);setPreview(false);setCopied(false);setCopyFailed(false);}}/></label>
    <button data-testid="note-preview" disabled={!excerpt.trim()||!text.includes(excerpt)} onClick={()=>setPreview(true)}>{t('note.preview')}</button>
    {preview&&<div data-testid="note-quote-preview"><blockquote dir="auto">{rawText(excerpt)}</blockquote><p>{t('note.noSend')}</p><button data-testid="note-copy" onClick={async()=>{try{await navigator.clipboard.writeText(excerpt);setCopied(true);setCopyFailed(false);}catch{setCopied(false);setCopyFailed(true);}}}>{t('note.copy')}</button>{copied&&<p role="status">{t('note.copied')}</p>}{copyFailed&&<p role="alert">{t('note.copyFailed')}</p>}</div>}
   </details>
  </div>}
 </section>;
}

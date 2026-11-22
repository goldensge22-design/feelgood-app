import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { CareerLabEvidence, CareerLabResults } from '@workspace/api-client-react';
import { useI18n } from '@/lib/i18n';
import { saveJSON,loadJSON } from '@/lib/career';
import { reviewHomeFixture } from '@/lib/review-home-profile';
import { analysisRef, type LabConnection } from '@/lib/review-lab-analysis';
import type { ReviewTraitId } from '@/lib/review-everyday-model';
import { publicSourceRef, recordReviewAction } from '@/lib/review-trail';
import { reviewBlueAction } from './review-daily-cards';
import type { ReviewInterest } from './review-company-lab';

const categories = {
  overview:['기업 소개','Company overview'],philosophy:['이념·철학','Philosophy'],environment:['명시된 근무환경','Stated working environment'],
  values:['핵심가치','Core values'],talent:['인재상·행동양식','Talent and behaviors'],
  duties:['담당 업무','Duties'],required:['공고 지원요건·경험','Posting qualifications and experience'],
  preferred:['공고 우대','Posting preferences'],skills:['직무 필요역량 키워드','Job skill keywords'],
} as const;
const connectionKey='review:lab-connections:v1';
const selectionKey='review:lab-evidence-selection:v1';
const basic='min-w-0 space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5';

export default function ReviewLabEvidence({results,trait,focus,onUse}:{
  results:CareerLabResults;trait:ReviewTraitId;focus?:ReviewTraitId;onUse:(record:ReviewInterest)=>boolean;
}) {
  const {locale}=useI18n(),ko=locale==='ko';
  const say=(a:string,b:string)=>ko?a:b;
  const legacy=results.mode==='gpt-web'&&results.version==='gpt-cited-lab-v1';
  const keywordBadge=(row:CareerLabEvidence)=>row.keywordOrigin==='official_named'?say('기업이 명명한 공식 가치','Officially named company value'):
    row.keywordOrigin==='ai_interpretation'?say('AI 요약·해석','AI summary or interpretation'):null;
  const [saved,setSaved]=useState(()=>loadJSON<LabConnection[]>(connectionKey)??[]);
  const selection=loadJSON<{version:string;at:string;materialId:string;rowId:string;basis:string}>(selectionKey);
  const same=selection?.version===results.version&&selection.at===results.retrievedAt;
  const [materialId,setMaterial]=useState(same?selection.materialId:'');
  const [rowId,setRow]=useState(same?selection.rowId:'');
  const [consent,setConsent]=useState(false);
  const [status,setStatus]=useState('');
  const strength=reviewHomeFixture(trait,focus).strengths?.[0];
  const material=results.materials.find(item=>item.id===materialId);
  const selected=material?.evidence.find(row=>row.id===rowId);
  const pick=(nextMaterial:string,nextRow:string)=>{
    setMaterial(nextMaterial);setRow(nextRow);setConsent(false);
    const basis=`${trait}/${focus??'not-provided'}`;
    const ok=saveJSON(selectionKey,{version:results.version,at:results.retrievedAt,materialId:nextMaterial,rowId:nextRow,basis})&&
      recordReviewAction('lab.evidence.selected',results.mode,{analysisVersion:results.version,materialId:nextMaterial,rowId:nextRow});
    setStatus(ok?'':say('기기에 선택을 저장하지 못했어요. 다시 골라 주세요.','Could not save the selection on this device. Try again.'));
  };
  const pair=!legacy&&material&&selected&&strength?analysisRef({material,version:results.version,mode:results.mode,retrievedAt:results.retrievedAt},selected,trait,strength,focus??null):null;
  const exact=pair&&saved.find(item=>item.id===pair.id);
  const save=()=>{
    if(!consent||!pair||!material)return;
    const relevant=material.evidence;
    const next=[...saved.filter(item=>item.id!==pair.id),pair];
    // Preserve the dated analysis/evidence snapshot separately from the evolving search results.
    const confirmed={...material,evidence:relevant,version:results.version,retrievedAt:results.retrievedAt,mode:results.mode};
    if (!saveJSON(`review:lab-analysis:${material.id}:${results.retrievedAt.replace(/[^0-9]/g,'')}`,confirmed) ||
        !saveJSON(connectionKey,next)) {
      setStatus(say('기기에 연결을 저장하지 못했어요. 다시 시도해 주세요.','Could not save the connection on this device. Try again.'));return;
    }
    setSaved(next);
    if(!onUse({company:material.company,job:material.job,source:pair.representative.url,synthetic:false,lab:pair}) ||
      !recordReviewAction('lab.connection.confirmed',results.mode,{connectionId:pair.id,materialId:material.id,rowId:pair.representative.id,
        ref:publicSourceRef(pair.representative.url),analysisVersion:pair.version,reportVersion:pair.reportVersion})) {
      setStatus(say('스토리보드 연결을 마치지 못했어요. 작성 내용은 남아 있어요. 다시 시도해 주세요.','The storyboard link was not completed. Your writing remains. Try again.'));return;
    }
    setConsent(false);
    setStatus(say('스토리보드 작성 자료에 연결했어요. 기존 본문과 저장 버전은 그대로예요.','Linked to storyboard evidence. Existing text and saved versions are unchanged.'));
  };
  const renderRow=(row:CareerLabEvidence)=><li key={row.id} className="space-y-1 border-b border-slate-100 pb-2">
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <p className="font-semibold">{row.keyword}</p>
      {keywordBadge(row)&&<span className="rounded bg-white px-2 py-0.5 text-xs text-slate-700" data-testid="text-lab-keyword-origin">{keywordBadge(row)}</span>}
    </div>
    <blockquote dir="auto" className="break-words text-slate-700">“{row.excerpt}”</blockquote>
    {row.sourceSection&&<p className="break-words text-xs text-slate-600">{say('원문 항목','Source section')}: {row.sourceSection}</p>}
    <p className="text-xs text-slate-600">{row.kind==='company'?say('기업 자료','Company source'):row.kind==='role'?say('직무소개 · 공고 아님','Role guide, not a job posting'):say('특정 공고 · 원문에서 기간 재확인','Specific posting; recheck dates at source')}</p>
    <a href={row.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 break-all text-blue underline" onClick={()=>recordReviewAction('lab.external.open-attempt',results.mode,{ref:publicSourceRef(row.url),rowId:row.id})}>
      <ExternalLink aria-hidden className="size-4 shrink-0"/>{row.source} · {say('원문 열기','Open source')}</a>
    <p className="text-xs tabular-nums text-slate-600"><time dateTime={results.retrievedAt}>{new Intl.DateTimeFormat(ko?'ko-KR':'en',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Seoul'}).format(new Date(results.retrievedAt))} KST</time></p>
    {!legacy&&<button className="min-h-11 text-blue underline" aria-pressed={rowId===row.id} onClick={()=>pick(materialId,row.id)} data-testid={`button-lab-evidence-${row.id}`}>{rowId===row.id?say('선택한 근거','Selected evidence'):say('이 근거를 강점과 비교','Compare with my strength')}</button>}
  </li>;
  return <section className={basic} data-testid="view-lab-evidence">
    <h2 className="text-lg font-bold">{results.mode==='gpt-web'?say('GPT 웹 검색 결과','GPT web search results'):say('검토용 공개자료 · GPT 검색 결과 아님','Reviewed public references, not GPT results')}</h2>
    <p className="text-sm">{results.mode==='gpt-web'?say('GPT가 찾은 원문과 발췌입니다. 지원 전 원문에서 기업·직무·지원조건을 다시 확인해 주세요.','These are GPT-retrieved sources and excerpts. Recheck employer, role and requirements before use.'):say('직접 확인한 참고 자료입니다. 모든 기업을 검색하거나 최신 공고를 자동 확인하는 기능은 아닙니다.','A limited collection of reviewed sources, not live search or recruiting status.')}</p>
    {legacy&&<p role="status" className="text-sm">{say('이전 분석은 그대로 보관합니다. 최신 키워드로 새로 연결하려면 위에서 다시 검색해 주세요.','The previous analysis is preserved. Search again above to link evidence with the updated analysis.')}</p>}
    {!results.materials.length&&<p role="status" data-testid="status-lab-no-evidence">{say('확인 가능한 공개자료가 없어요. 기업·직무 이름을 바꾸거나 웹에서 더 찾아보세요.','No verifiable public material was found. Change the search or try the web link.')}</p>}
    {results.materials.map(item=><button key={item.id} className="me-2 mb-2 min-h-11 rounded-lg border px-3 text-sm font-semibold aria-pressed:border-blue aria-pressed:bg-blue-soft" aria-pressed={item.id===materialId} onClick={()=>pick(item.id,'')} data-testid="button-lab-material">{item.company} · {item.job}</button>)}
    {material&&<div className="grid min-w-0 gap-3 md:grid-cols-2" data-testid="view-lab-keywords">
      {([['overview','philosophy','values','talent','environment'],['duties','required','preferred','skills']] as const).map((keys,i)=><section className={`min-w-0 space-y-2 rounded-lg p-3 ${i?'bg-[#fff8ec]':'bg-[#f2f7ff]'}`} key={i}>
        <h3 className="font-bold">{i?say('직무·채용공고 키워드','Role and posting keywords'):say('기업 키워드','Company keywords')}</h3>
        {keys.map(value=>{
          const cat=value as keyof typeof categories, rows=material.evidence.filter(x=>x.category===cat);
          return <details key={cat} open={cat===(i?'duties':'values')||undefined} className="text-sm" data-testid={`group-lab-${cat}`}>
            <summary className="min-h-11 cursor-pointer content-center font-semibold">{categories[cat][ko?0:1]} · {rows.length||say('자료 없음','No material')}</summary>
            <ul className="space-y-2">{rows.map(renderRow)}</ul>
          </details>;
        })}
      </section>)}
    </div>}
    {pair&&<section className="space-y-3 rounded-xl border border-blue/30 p-3 text-sm" data-testid="view-lab-strength">
      <h3 className="font-bold">{say('결과지 강점과 연결','Connect a report strength')}</h3>
      <div className="grid gap-2 sm:grid-cols-2"><p>{say('공개 기업·직무 근거','Public company or role evidence')}: <strong>{pair.representative.keyword}</strong>{keywordBadge(pair.representative)&&` (${keywordBadge(pair.representative)})`} · “{pair.representative.excerpt}”</p>
        <p>{say('가상 결과지 강점','Synthetic report strength')}: <strong>{pair.strength}</strong></p></div>
      <p>{say('작성에 참고할 연결 후보입니다. 채용 적합도나 능력 검증이 아니에요.','This is a writing lead, not a hiring or ability assessment.')}</p>
      <dl className="space-y-1">{[
        [say('지원 포인트','Application angle'),pair.support],[say('내가 확인할 점','What to check'),pair.check],[say('플래너에서 쓸 근거','Planner evidence to look for'),pair.planner],
      ].map(([label,text])=><div key={label}><dt className="font-semibold">{label}</dt><dd>{text}</dd></div>)}</dl>
      {exact&&<p data-testid="status-lab-prior-connection">{say('같은 근거로 저장된 연결이 있어요.','A connection for this evidence is already saved.')}</p>}
      <label className="flex min-h-11 gap-2 items-center"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)} data-testid="checkbox-lab-connection"/>{say('두 자료를 읽었고 이 연결 후보를 작성 자료로 사용합니다.','I reviewed both sources and want to use this connection while writing.')}</label>
      <button className={`${reviewBlueAction} disabled:opacity-50`} disabled={!consent} onClick={save} data-testid="button-lab-link-story">{say('확인하고 스토리보드에 연결','Confirm and link to storyboard')}</button>
    </section>}
    {saved.length>0&&<details className="text-sm" data-testid="list-lab-connections"><summary className="min-h-11 cursor-pointer content-center font-semibold">{say('이전에 확인한 연결','Previously confirmed connections')} · {saved.length}</summary>
      <ul className="space-y-2">{saved.map(item=><li key={item.id}>{[item.company,item.job,item.representative.keyword,item.strength].filter(Boolean).join(' · ')} · <time dateTime={item.confirmedAt}>{item.confirmedAt.slice(0,10)}</time></li>)}</ul></details>}
    {status&&<p role="status" data-testid="status-lab-link">{status}</p>}
  </section>;
}

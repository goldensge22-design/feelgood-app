import {useRef,useState,type ReactNode} from 'react';
import {Link} from 'wouter';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import type {ReviewStoryEvidence} from '@workspace/api-client-react';
import {useI18n} from '@/lib/i18n';
import {formatDate,loadJSON,saveJSON} from '@/lib/career';
import {type StoryboardDraft,type StorySections,type StoryVersion} from '@/lib/storyboard';
import {cardActivity,type ReviewCard,type ReviewPlannerBook} from '@/lib/review-planner-model';
import {contextOf} from '@/lib/review-everyday-model';
import {useEveryday} from '@/lib/review-everyday-store';
import {labReportVersion} from '@/lib/review-lab-analysis';
import {recordReviewAction} from '@/lib/review-trail';
import {ReviewActivityCollection} from './review-activity-collection';
import {ReviewSimpleStoryLayout} from './review-simple-story-layout';
import {ReviewSimpleStoryAi} from './review-simple-story-ai';
import {youthStoryPreview} from '@/lib/review-youth-story';

export const singleStoryText=(draft:Pick<StoryboardDraft,'sections'>)=>draft.sections.filter(section=>section.length>0).join('\n\n');
export const singleStorySections=(text:string):StorySections=>[text,'','',''];
type Preferences={thought:string;withoutCompany?:boolean;withoutReport?:boolean;original?:StorySections;revision?:number};
const minimalText='min-h-11 inline-flex items-center font-semibold text-blue underline';

export function storyActivity(card:ReviewCard,i:number):ReviewStoryEvidence {
  const activity=cardActivity(card)?.activity;
  const thought=activity?.kind==='thought'&&activity.entry!=='daily_note';
  const note=card.note!;
  return {id:`A${i+1}`,kind:thought?'reflection':'activity',title:card.plan.goal.slice(0,180),text:[
    `${thought?'가정 상황에 적어 본 선택과 생각':'사용자가 직접 기록한 행동'}: ${note.action.slice(0,500)}`,
    note.result&&`${thought?'선택 이유':'사용자가 기록한 관찰 결과'}: ${note.result.slice(0,250)}`,
    note.learning&&`사용자가 적은 배움: ${note.learning.slice(0,160)}`,
    note.next&&`${thought?'별도로 적은 적용 기록':'다음 적용 계획'}: ${note.next.slice(0,140)}`,
  ].filter(Boolean).join('\n').slice(0,1200)};
}

export function ReviewSimpleStory({draft,book,cards,ready,confirmed,saveState,canConfirm,modify,saveDraft,saveVersion,restoreVersion,onUse,downloads,youth=false}:{
  draft:StoryboardDraft;book:ReviewPlannerBook;cards:(ReviewCard|undefined)[];ready:boolean;confirmed:boolean;
  saveState:'saved'|'dirty'|'failed';canConfirm:boolean;
  modify:(patch:Partial<StoryboardDraft>)=>boolean;saveDraft:()=>boolean;saveVersion:()=>void;
  restoreVersion:(v:StoryVersion)=>void;onUse:(ids:string[])=>boolean;downloads:ReactNode;
  youth?:boolean;
}){
  const {t,locale}=useI18n();
  const {value}=useEveryday();
  const selection=contextOf(value.choice)!;
  const key=`review:story-simple:v1:${draft.id}`;
  const [youthCandidate,setYouthCandidate]=useState<{text:string;stamp:string}|null>(()=>youth?loadJSON(`${key}:youth-preview`):null);
  const [settings,setSettings]=useState<Preferences>(()=>loadJSON<Preferences>(key)??{thought:''});
  const [picker,show]=useState<string|null>(null);
  const [notice,setNotice]=useState(false);
  const [saveClick,setSaveClick]=useState(0);
  const [approval,setApproval]=useState('');
  const [previous,setPrevious]=useState<string|null>(null);
  const epoch=useRef({stamp:'',value:0});
  const live=JSON.stringify([draft.revision,selection.trait.id,selection.focus?.id,settings.withoutCompany,settings.withoutReport]);
  const all=caredSources(cards);
  const interest=draft.reviewInterest;
  const lab=interest?.lab;
  const official=!youth && !settings.withoutCompany && interest && !interest.synthetic && lab;
  const outdated=!!official && lab.reportVersion!==labReportVersion(selection.trait.id,selection.focus?.id??null);
  const text=singleStoryText(draft);
  const failed=saveState==='failed';
  const evidence:ReviewStoryEvidence[]=ready?all.slice(0,4).map(storyActivity):[];
  if(!settings.withoutReport)evidence.push({id:'R1',kind:'report',title:`가상 결과지 · ${selection.trait.title}`,text:selection.trait.summary});
  if(official&&!outdated)evidence.push({id:'C1',kind:'company',title:[interest.company,interest.job,lab.representative.keyword].filter(Boolean).join(' · ').slice(0,180),
    text:`${lab.representative.excerpt.slice(0,700)}\n${lab.representative.url}\n${lab.mode==='curated'?'공개 출처 참고 자료':'GPT 웹 검색에서 확인한 공개 자료'}`.slice(0,1200)});
  const sourceStamp=JSON.stringify([value.version,selection.trait.id,selection.focus?.id,lab?.id,settings.revision]);
  const epochKey=`${key}:source`;
  if(epoch.current.stamp!==sourceStamp){
    const old=loadJSON<{stamp:string;value:number}>(epochKey);
    const base=epoch.current.stamp?epoch.current:old;
    epoch.current={stamp:sourceStamp,value:base?base.value+(base.stamp===sourceStamp?0:1):0};
  }
  function keep(next:Preferences){
    if(next.thought!==settings.thought||next.withoutCompany!==settings.withoutCompany||next.withoutReport!==settings.withoutReport)
      next={...next,revision:(settings.revision??0)+1};
    setSettings(next);
    const ok=saveJSON(key,next);setNotice(!ok);return ok;
  }
  const material=(id:string,title:string,description:ReactNode)=><article className="min-w-0 space-y-1 rounded-xl border border-blue/15 bg-blue-soft/40 p-3">
    <h3 className="break-words text-sm font-bold">{title}</h3>
    <div className="break-words text-sm text-foreground/80">{description}</div>
    <button type="button" aria-label={`${title} · ${t('simpleStory.change')}`} aria-expanded={picker===id} className={minimalText} onClick={()=>show(picker===id?null:id)}>{t('simpleStory.change')}</button>
  </article>;
  const stamp=JSON.stringify([draft.revision,sourceStamp,locale,ready]);
  function apply(candidate:string){
    if(!keep({...settings,original:[...draft.sections]}))return false;
    if(!modify({sections:singleStorySections(candidate)}))return false;
    recordReviewAction(youth?'storyboard.youth.applied':'storyboard.gpt.applied','explicit-selection',{revision:draft.revision});
    return true;
  }
  function preview(mode:'generate'|'refine'){
    const candidate=youthStoryPreview({lang:locale,actions:all.map(card=>{const entry=cardActivity(card)?.activity;return{
      text:card.note?.action??'',thought:entry?.kind==='thought'&&entry.entry!=='daily_note',
    };}),keyword:draft.keyword,body:text,thought:settings.thought},mode);
    if(!candidate)return;
    const next={text:candidate,stamp};
    if(saveJSON(`${key}:youth-preview`,next))setYouthCandidate(next);else setNotice(true);
  }
  const canUseYouth=ready&&all.length>0&&!failed&&!notice;
  const discardYouth=()=>{if(saveJSON(`${key}:youth-preview`,null))setYouthCandidate(null);else setNotice(true);};
  const render=({generate,refine,feedback}:{generate:ReactNode;refine:ReactNode;feedback:ReactNode})=><ReviewSimpleStoryLayout steps={[
      {title:t('simpleStory.materials'),description:t('simpleStory.materialsHint'),content:<div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {material('report',t('simpleStory.report'),settings.withoutReport?t('simpleStory.none'):<>{selection.trait.title}<br/><span className="text-xs text-muted-foreground">{t('simpleStory.sample')}</span></>)}
          {material('activities',t('simpleStory.activities'),all.length?all.map(card=><p key={card.id}>{card.plan.goal}</p>):t('simpleStory.none'))}
          {material('company',t(youth?'audience.youthInterest':'simpleStory.company'),youth?([draft.job,draft.keyword].filter(Boolean).join(' · ')||t('simpleStory.none')):
            !settings.withoutCompany&&interest?<>{[interest.company,interest.job,lab?.representative.keyword].filter(Boolean).join(' · ')}</>:t('simpleStory.optional'))}
        </div>
        {picker==='report'&&<div className="space-y-2 rounded-xl border p-3 text-sm">
          {!settings.withoutReport&&<><p>{selection.trait.summary}</p><p>{t('simpleStory.sample')}</p></>}
          <div className="flex flex-wrap gap-3"><Link href="/report" className={minimalText}>{t('daily.report')}</Link>
            <Button variant="outline" onClick={()=>{if(keep({...settings,withoutReport:!settings.withoutReport}))recordReviewAction('storyboard.report.selection','explicit', {included:settings.withoutReport?'yes':'no'});}}>
              {t(settings.withoutReport?'simpleStory.useReport':'simpleStory.skipReport')}</Button></div>
        </div>}
        {picker==='activities'&&<ReviewActivityCollection book={book} onUse={onUse}/>}
        {picker==='company'&&youth&&<Link href="/lab" className={minimalText}>{t('audience.youthLink')}</Link>}
        {picker==='company'&&!youth&&<div className="space-y-2 rounded-xl border p-3 text-sm">
          <p>{t('simpleStory.optional')}</p>
          {lab&&<details><summary className="min-h-11 cursor-pointer content-center font-semibold">{t('simpleStory.details')}</summary>
            <p className="break-words">{lab.representative.excerpt}</p>
            {/^https:\/\//.test(lab.representative.url)&&<a className={minimalText} target="_blank" rel="noreferrer" href={lab.representative.url}>{lab.representative.source}</a>}
            <p>{formatDate(lab.retrievedAt,locale)} · {lab.version}</p><p>{lab.support}</p></details>}
          {outdated&&<p role="status">{t('simpleStory.reportStale')}</p>}
          <div className="flex flex-wrap gap-3"><Link href="/lab" className={minimalText}>{t('audience.company')}</Link>
          {interest&&<Button variant="outline" onClick={()=>{if(keep({...settings,withoutCompany:!settings.withoutCompany}))recordReviewAction('storyboard.company.selection','explicit',{included:settings.withoutCompany?'yes':'no'});}}>
            {t(settings.withoutCompany?'simpleStory.useCompany':'simpleStory.skipCompany')}</Button>}</div>
        </div>}
      </div>},
      {title:t('simpleStory.make'),description:t(youth?'audience.youthMakeHint':'simpleStory.makeHint'),content:<div className="space-y-3">
        {!youth&&all.length>4&&<p role="status" className="text-sm">{t('simpleStory.limitActivities')}</p>}
        {official&&!outdated&&<p className="rounded-lg border bg-blue-soft p-3 text-sm">{official.support}</p>}
        {generate}{feedback}
      </div>},
      {title:t('simpleStory.edit'),content:<div className="space-y-4">
        <label className="block text-sm font-semibold">{t('simpleStory.body')}
          <Textarea rows={8} value={text} dir="auto" className="mt-1" onChange={e=>modify({sections:singleStorySections(e.target.value)})} data-testid="input-review-simple-story-body"/>
        </label>
        <label className="block text-sm font-semibold">{t('simpleStory.thought')}
          <Textarea rows={2} value={settings.thought} maxLength={500} dir="auto" className="mt-1" placeholder={t('simpleStory.thoughtHint')}
            onChange={e=>keep({...settings,thought:e.target.value})} data-testid="input-review-simple-story-thought"/>
        </label>
        <div className="flex flex-wrap gap-2">{refine}{settings.original&&<Button variant="outline" onClick={()=>{const old=settings.original;if(old&&modify({sections:old}))keep({...settings,original:undefined});}}>{t('simpleStory.original')}</Button>}</div>
        {youth&&youthCandidate?.stamp===stamp&&<div className="space-y-2 rounded-xl border p-3" data-testid="review-youth-candidate">
          <h3 className="font-bold">{t('audience.youthCandidate')}</h3>
          <p className="whitespace-pre-wrap break-words text-sm" dir="auto">{youthCandidate.text}</p>
          {!settings.withoutReport&&<p className="text-xs">{t('audience.youthReportSource',{trait:selection.trait.title})}</p>}
          {!!draft.keyword&&<p className="text-xs">{t('audience.youthKeywordSource',{keyword:draft.keyword})}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={()=>{if(apply(youthCandidate.text))discardYouth();}} data-testid="button-review-youth-apply">{t('simpleStory.apply')}</Button>
            <Button variant="outline" onClick={discardYouth}>{t('simpleStory.cancel')}</Button>
          </div>
        </div>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button variant="outline" disabled={!text.trim()&&!settings.thought.trim()&&!failed&&!notice} onClick={()=>{
            const textSaved=saveDraft();
            const thoughtsSaved=keep(settings);
            if(textSaved&&thoughtsSaved)setSaveClick(value=>value+1);
          }} data-testid="button-review-simple-story-save-draft">{t('simpleStory.saveDraft')}</Button>
          <p role="status" className="text-sm text-muted-foreground" data-testid="status-review-simple-story-draft">
            {!failed&&!notice&&(saveState==='dirty'?t('simpleStory.saving'):text.trim()||settings.thought.trim()
              ?<span key={saveClick}>{t('simpleStory.draftSaved')}</span>:t('simpleStory.device'))}
          </p>
        </div>
        {(failed||notice)&&<p role="alert" className="text-sm text-destructive">{t('simpleStory.draftFailed')}</p>}
        {!confirmed&&<div className="space-y-2 border-t pt-3">
          <p className="text-sm text-muted-foreground">{t(canConfirm?'simpleStory.downloadHint':'simpleStory.recheckHint')}</p>
          {canConfirm&&<label className="flex min-h-11 items-center gap-2 text-sm"><input className="h-5 w-5 shrink-0" type="checkbox" checked={approval===live}
            disabled={!text.trim()||failed||notice} onChange={e=>setApproval(e.target.checked?live:'')}/>{t('simpleStory.confirm')}</label>}
          {canConfirm&&<Button disabled={!text.trim()||approval!==live||failed||notice} onClick={()=>{saveVersion();setApproval('');}} data-testid="button-review-simple-story-save">{t('simpleStory.saveVersion')}</Button>}
        </div>}
        {confirmed&&<p role="status" className="text-sm font-semibold text-emerald-800">{t('sb.confirmed')}</p>}
        {downloads}
        <details id="storyboard-versions" className="rounded-xl border p-3">
          <summary className="min-h-11 cursor-pointer content-center font-semibold">{t('sb.versions')} · {draft.versions.length}</summary>
          {[...draft.versions].reverse().map((v,i)=><article className="space-y-2 border-t py-2 text-sm" key={v.id}>
            <button type="button" className={minimalText} aria-expanded={previous===v.id} onClick={()=>setPrevious(previous===v.id?null:v.id)}>V{draft.versions.length-i} · {formatDate(v.at,locale)}</button>
            {previous===v.id&&<><p className="whitespace-pre-wrap break-words">{singleStoryText(v)}</p>
              <Button variant="outline" onClick={()=>restoreVersion(v)}>{t('sb.restore')}</Button></>}
          </article>)}
        </details>
      </div>},
    ]}/>;
  if(youth)return render({
    generate:<Button disabled={!canUseYouth} onClick={()=>{preview('generate');requestAnimationFrame(()=>document.querySelector('[data-testid=review-youth-candidate]')?.scrollIntoView({block:'nearest'}));}} data-testid="button-review-youth-preview">{t('audience.youthPreview')}</Button>,
    refine:<Button variant="outline" disabled={!text.trim()||!settings.thought.trim()||failed||notice} onClick={()=>preview('refine')} data-testid="button-review-youth-refine">{t('audience.youthRefine')}</Button>,
    feedback:!ready&&<Link href="/planner" className={minimalText} data-testid="link-review-youth-planner">{t('audience.activity')}</Link>,
  });
  return <ReviewSimpleStoryAi id={draft.id} revision={draft.revision} materialEpoch={epoch.current.value} persistMaterial={()=>saveJSON(epochKey,epoch.current)}
    body={text} thought={settings.thought} evidence={evidence} ready={ready&&all.length>0&&all.length<=4&&!failed} apply={apply}>
    {render}
  </ReviewSimpleStoryAi>;
}

function caredSources(cards:(ReviewCard|undefined)[]){
  return cards.filter((card):card is ReviewCard=>!!card?.note);
}

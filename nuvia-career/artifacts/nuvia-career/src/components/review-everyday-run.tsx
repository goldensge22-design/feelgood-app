import { useEffect, useId, useState } from 'react';
import { Link } from 'wouter';
import { contextOf, REVIEW_PROFILES } from '@/lib/review-everyday-model';
import { moveEverydayCursor, retryEveryday, useEveryday } from '@/lib/review-everyday-store';
import { commitReviewNote, getReviewPlannerSnapshot } from '@/lib/review-planner';
import type { ReviewCard, ReviewNote } from '@/lib/review-planner-model';
import { cardActivity } from '@/lib/review-planner-model';
import { useI18n } from '@/lib/i18n';
import { reviewBlueAction } from '@/components/review-daily-cards';

const stepButton = 'min-h-11 rounded-lg border bg-card px-3 text-sm font-semibold disabled:opacity-40';
export function EverydayRun({card}:{card:ReviewCard}) {
  const {value,error} = useEveryday();
  const {t}=useI18n();
  const beforeId = useId();
  const source = cardActivity(card);
  const c = card.everyday && contextOf(card.everyday.match);
  const trait = c?.trait ?? REVIEW_PROFILES.find(p=>p.id===card.daily?.context.trait);
  if (!source) return null;
  const {steps,minutes,materials} = source.activity;
  const position = Math.max(0,Math.min(steps.length-1,value.cursor[card.id] ?? 0));
  const single = trait?.id==='attention' || trait?.id==='sequential';
  return <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-5" data-testid="view-review-run">
    <h2 className="font-display text-lg font-bold">{source.activity.kind==='thought'?'생각 도움':'연습 도우미'}{trait ? ` · ${trait.title}`:''}</h2>
    <p className="text-sm">{minutes}분 · {materials}</p>
    <p className="rounded-xl bg-blue-soft p-3 text-sm text-blue" data-testid="text-review-run-support">{source.activity.supportReason}</p>
    {error && <p role="alert" className="text-sm text-destructive">도움 위치를 저장하지 못했습니다. <button className="min-h-11 underline" onClick={retryEveryday}>다시 시도</button></p>}
    <p className="text-xs text-muted-foreground">{c ? `업무역량: ${c.need.title} · 보완할 인지영역: ${c.focus?.title ?? '이전 기록 · 별도 자료 없음'} · 가상 결과지`:
      `${t(`daily.${card.daily?.category}`)} · ${source.activity.linkReason}`}</p>
    {single ? <>
      <div className="rounded-xl bg-muted/60 p-3" aria-live="polite" data-testid="text-review-run-position">
        <p className="font-semibold">{card.status==='paused' ? '멈춘 위치' : trait?.id==='attention' ? '지금 볼 항목' : '현재 단계'} {position+1}/{steps.length}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{steps[position]}</p>
        {trait?.id==='sequential' && <p className="mt-2 text-xs text-muted-foreground">{position+1<steps.length ? `다음은 ${position+2}단계입니다.` : '마지막 단계입니다.'}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={stepButton} disabled={position===0} onClick={()=>moveEverydayCursor(card.id,position-1)} data-testid="button-review-run-prev">이전</button>
        <button type="button" className={stepButton} disabled={position+1===steps.length} onClick={()=>moveEverydayCursor(card.id,position+1)} data-testid="button-review-run-next">{trait?.id==='attention'?'다음 항목':'다음 단계'}</button>
      </div>
    </> : <>
      {trait && <p className="text-sm font-semibold">{trait.id==='planning' ? '먼저 목표와 끝낼 기준을 확인하세요.' : '전체를 보고 두 항목을 나란히 비교하세요.'}</p>}
      {trait?.id==='simultaneous' && <div className="grid grid-cols-2 gap-2 text-sm" data-testid="view-review-compare-board"><p className="rounded-lg bg-muted p-2">같은 점을 확인</p><p className="rounded-lg bg-muted p-2">다른 점을 확인</p></div>}
      <ol className="list-decimal space-y-2 ps-5 text-sm" data-testid="list-review-run-steps">{steps.map((s,i)=><li key={i} className="break-words">{s}</li>)}</ol>
    </>}
    <details className="rounded-xl border px-3">
      <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold" aria-controls={beforeId}>등록한 활동지 원본 보기</summary>
      <dl className="space-y-2 pb-3 text-sm" id={beforeId} data-testid="view-registered-worksheet">
        <dt className="text-muted-foreground">생활 장면</dt><dd className="whitespace-pre-wrap break-words">{source.activity.scene}</dd>
        <dt className="text-muted-foreground">{source.activity.kind==='thought'?'내 생각':'시작 전 생각'}</dt><dd className="whitespace-pre-wrap break-words">{source.worksheet.before || '미작성'}</dd>
        <dt className="text-muted-foreground">{source.activity.kind==='thought'?'선택한 이유':'활동지 관찰 메모'}</dt><dd className="whitespace-pre-wrap break-words">{source.worksheet.observation || '미작성'}</dd>
        <dt className="text-muted-foreground">{source.activity.kind==='thought'?'달리 보게 된 점':'활동지 돌아보기'}</dt><dd className="whitespace-pre-wrap break-words">{source.worksheet.reflection || '미작성'}</dd>
      </dl>
    </details>
  </section>;
}

export function EverydayRecordUse({card,note,noteDirty,planDirty,linked,onUse}: {
  card:ReviewCard;note:ReviewNote;noteDirty:boolean;planDirty:boolean;linked:boolean;onUse:(id:string,revision:number)=>boolean;
}) {
  const {error}=useEveryday();
  const {t}=useI18n();
  const eligible=!error;
  return <section id="review-use-record" tabIndex={-1} className="scroll-mt-4 space-y-3 rounded-2xl border border-primary/40 bg-card p-4 sm:p-5" data-testid="view-review-record-use">
    <h2 className="font-display text-lg font-bold">다음 활동 · 사용할 기록 확인</h2>
    {card.approvedRevision !== undefined && card.approvedRevision !== card.revision && <p role="alert" className="text-sm text-destructive">원본이 바뀌었습니다. 지금 기록을 다시 확인해 주세요.</p>}
    {!eligible && <p className="text-sm">{t('daily.failed')}</p>}
    {eligible && <p className="text-sm text-blue">{t('daily.independent')}</p>}
    {!note.action.trim() && <p className="text-sm text-muted-foreground">위에 직접 쓴 기록이 있어야 사용할 수 있어요. 계획만으로는 이야기의 근거가 되지 않아요.</p>}
    {planDirty && <p className="text-sm text-destructive">수정한 계획을 먼저 저장해 주세요.</p>}
    {eligible && (
      linked && !planDirty && !noteDirty ? <>
        <p role="status" className="text-sm font-semibold text-ok" data-testid="status-review-record-linked">스토리보드 작성 자료에 저장됨</p>
        <Link href="/storyboard" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue underline" data-testid="link-review-open-linked-story">나의 강점 스토리보드에서 이어쓰기</Link>
      </> : note.action.trim() && <RecordApproval key={card.id} card={card} note={note} noteDirty={noteDirty} disabled={planDirty} onUse={onUse} />)}
    {eligible && card.note && !planDirty && !noteDirty && <Link href="/planner#review-records" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue underline" data-testid="link-review-choose-multiple">여러 기록을 모아 쓰기</Link>}
  </section>;
}

function RecordApproval({card,note,noteDirty,disabled,onUse}: {card:ReviewCard;note:ReviewNote;noteDirty:boolean;disabled:boolean;onUse:(id:string,r:number)=>boolean}) {
  const [confirmedNote,confirmNote]=useState<string|null>(null);
  const [failure,setFailure]=useState<string|null>(null);
  const noteKey=JSON.stringify([card.revision,note]);
  const checked=confirmedNote===noteKey;
  useEffect(()=>{confirmNote(previous=>previous===noteKey?previous:null);},[noteKey]);
  function saveAndConnect() {
    if (disabled || !checked || !note.action.trim()) return;
    if (noteDirty && !commitReviewNote(card.id)) {
      setFailure('기록을 저장하지 못했어요. 이 화면에서 입력을 유지하고 다시 시도하세요.');
      return;
    }
    const {book,error}=getReviewPlannerSnapshot();
    const saved=book.cards[card.id];
    if (!error && saved?.note && JSON.stringify(saved.note)===JSON.stringify(note) && onUse(card.id,saved.revision)) return;
    if (saved?.note) confirmNote(JSON.stringify([saved.revision,saved.note]));
    setFailure('기록은 플래너에 저장됐지만 스토리보드에는 연결하지 못했어요. 다시 시도하세요.');
  }
  return <>
    <dl className="space-y-2 text-sm" data-testid="view-review-selected-facts">{(cardActivity(card)?.activity.kind==='thought'
      ? [['내 선택과 생각',note.action],['이유',note.result],['달리 보게 된 점',note.learning],['별도 실제 적용 기록',note.next]]
      : [['내 행동',note.action],['관찰 결과',note.result],['배운 점',note.learning],['다음 적용',note.next]]).map(([title,raw])=>
      <div key={title}><dt className="font-semibold">{title}</dt><dd className="whitespace-pre-wrap break-words">{raw || '미작성'}</dd></div>)}</dl>
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={e=>confirmNote(e.target.checked?noteKey:null)} className="h-5 w-5 shrink-0" data-testid="checkbox-review-use-record" />
      이 일상기록과 선택한 연결을 확인했고 스토리보드 작성에 사용합니다.
    </label>
    <button type="button" className={reviewBlueAction} disabled={!checked || disabled}
      onClick={saveAndConnect} data-testid="button-review-use-record">기록 저장하고 나의 강점 스토리보드로</button>
    {failure && <p role="alert" className="mt-1 text-sm text-destructive" data-testid="status-review-record-link-failure">{failure}</p>}
  </>;
}

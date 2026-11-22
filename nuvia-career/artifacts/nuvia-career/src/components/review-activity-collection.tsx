import { useState } from 'react';
import { Link } from 'wouter';
import { contextOf } from '@/lib/review-everyday-model';
import { selectEverydaySources, useEveryday } from '@/lib/review-everyday-store';
import { cardActivity, type ReviewPlannerBook } from '@/lib/review-planner-model';
import { DAILY_EVIDENCE } from '@/lib/review-daily-model';
import { useI18n } from '@/lib/i18n';
import { reviewStudioSourceCurrent,reviewStudioSourcePath } from '@/lib/review-studio-bridge';

export function ReviewActivityCollection({book,onUse}:{book:ReviewPlannerBook;onUse:(ids:string[])=>boolean}) {
  const {value,error}=useEveryday();
  const [approved,setApproved]=useState('');
  const {t}=useI18n();
  const ids=value.selected?.[DAILY_EVIDENCE] ?? [];
  const cards=Object.values(book.cards);
  const current=JSON.stringify(ids.map(id=>[id,book.cards[id]?.revision]));
  const cannotPick=(id:string)=>!book.cards[id]?.note || !!error || !reviewStudioSourceCurrent(id) ||
    !!(book.planEdits[id] || book.noteEdits[id]);
  const canConfirm=ids.length>0 && ids.every(id=>!cannotPick(id));
  return <section id="review-records" tabIndex={-1} className="scroll-mt-4 space-y-3 rounded-2xl border bg-card p-4 sm:p-5" data-testid="view-review-activity-collection">
    <h2 className="font-display text-lg font-bold">플래너 일상 활동 자료 모음</h2>
    <p className="text-sm text-muted-foreground">사용할 활동을 여러 개 고를 수 있어요. 계획과 활동지 메모만 남은 경우에는 수행 근거로 쓰지 않습니다.</p>
    <p className="text-sm">{t('daily.independent')}</p>
    {cards.length===0 && <p className="text-sm">등록한 활동이 아직 없어요. 위의 ‘일상 직접 기록’으로 짧은 메모부터 쓸 수 있어요.</p>}
    {cards.length>0 && ids.length===0 && <p className="text-sm">이야기에 담을 저장 기록을 하나 이상 선택해 주세요.</p>}
    <div className="grid gap-2 md:grid-cols-2">
      {cards.map(card=>{ const activity=cardActivity(card)?.activity;const thought=activity?.kind==='thought'; return <article key={card.id} className="min-w-0 space-y-1 rounded-xl border p-3" data-testid={`row-review-collection-${card.id}`}>
        <label className="flex min-h-11 items-center gap-2 text-sm font-bold">
          <input type="checkbox" className="h-5 w-5 shrink-0" disabled={cannotPick(card.id)} checked={ids.includes(card.id)}
            onChange={e=>{setApproved('');selectEverydaySources(e.target.checked?[...ids,card.id]:ids.filter(id=>id!==card.id),DAILY_EVIDENCE);}} data-testid={`checkbox-review-collection-${card.id}`} />
          <span className="min-w-0 break-words">{card.plan.goal}</span>
        </label>
        <p className="text-xs text-muted-foreground">{card.plan.when.slice(0,10)} · 플래너 일상기록 r{card.revision} · {card.note?(card.kind==='free'?'본인이 직접 작성':activity?.entry==='daily_note'?'직접 적은 일상 기록 · 자기보고':thought?'가정 상황 생각 연습 · 실제 행동과 별도':'사용자 작성 수행기록'):card.status==='planned'?'미실행 · 확인한 기록 없음':'확인한 기록 없음'}</p>
        <p className="text-xs text-muted-foreground">검토용 데모 · {card.kind==='free'?'직접 일상 기록':card.daily?t(`daily.${card.daily.category}`):card.everyday?'오늘의 생각 한 장 · 활동지 출처':'이전 체험 기록'}{thought && card.note?.next.trim()?' · 별도 실제 적용 기록':''}</p>
        {card.everyday && (()=>{const origin=contextOf(card.everyday.match);return origin && <p className="text-xs text-muted-foreground">원래 연결: {origin.need.title} × {origin.focus?.title ?? '보완영역 없음'} · 지원 {origin.trait.title}</p>;})()}
        {card.daily && <p className="text-xs text-muted-foreground">{card.daily.activity.linkReason}</p>}
        {!reviewStudioSourceCurrent(card.id)&&<p className="text-sm font-semibold">{t('daily.studioSourceChanged')}</p>}
        <details>
          <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">생활 장면과 기록 보기</summary>
          <dl className="space-y-2 text-sm">{[
            ['생활 장면',card.plan.scenario],[activity?.id==='simple-bag'?'준비물과 다시 확인한 내용':activity?.entry==='daily_note'?'내가 적은 일상':thought?'내 선택과 생각':'실제로 한 행동',card.note?.action],[thought?'선택 이유':'관찰 결과',card.note?.result],[thought?'달리 보게 된 점이나 다음에 바꿀 점':'배운 점',card.note?.learning],[thought?'별도 실제 적용 기록':'다음 적용',card.note?.next],
          ].map(([name,value])=><div key={name}><dt className="font-semibold">{name}</dt><dd className="whitespace-pre-wrap break-words">{value || '미작성'}</dd></div>)}</dl>
        </details>
        <Link href={reviewStudioSourcePath(card.id)} className="inline-flex min-h-11 items-center text-sm text-blue underline">플래너에서 활동 열기</Link>
      </article>})}
    </div>
    {ids.length>0 && <div className="flex flex-wrap items-center gap-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={canConfirm && approved===current}
        disabled={!canConfirm} onChange={e=>setApproved(e.target.checked?current:'')} data-testid="checkbox-review-confirm-collection"/>선택한 {ids.length}개 기록을 확인했고 문장 작성에 사용합니다.</label>
      <button type="button" className="min-h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-45"
        disabled={!canConfirm || approved!==current} onClick={()=>{if(onUse(ids)) setApproved('');}} data-testid="button-review-use-collection">이 기록 {ids.length}개로 강점 이야기 만들기</button>
    </div>}
  </section>;
}

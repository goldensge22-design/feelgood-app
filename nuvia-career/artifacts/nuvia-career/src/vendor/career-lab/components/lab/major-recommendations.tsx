import { useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Bookmark, Download, EyeOff, PauseCircle, Printer, RotateCcw, School, ArrowRight, AlertTriangle } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { useLocale } from '@/vendor/career-lab/lib/locale';
import { formatMessage, localizeValue } from '@/vendor/career-lab/lib/i18n-runtime';
import { majorById } from '@/vendor/career-lab/lib/catalog';
import { recommendationsFor, decideRecommendation, type Recommendation, type RecommendationEvidence } from '@/vendor/career-lab/lib/recommendations';
import { RECOMMENDATION_NOTICE } from '@/vendor/career-lab/lib/recommendation-policy';
import { cn } from '@/vendor/career-lab/lib/utils';
import { Panel, Tag, Empty } from './ui';

type View = Recommendation['decision'];
const btn = 'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60';
const P = (v: string) => String(localizeValue(v, true));

function Orig({ children, testid }: { children: string; testid?: string }) {
  return <bdi dir="auto" className="original-text" data-i18n-original="true" data-testid={testid}>{children}</bdi>;
}

function EvidenceBlock({ e }: { e: RecommendationEvidence }) {
  const { t } = useLocale();
  const exp = e.kind === 'experience';
  return (
    <div className={cn('rounded-xl border p-4', exp ? 'border-[hsl(var(--coral)/0.35)] bg-accent/40' : 'border-primary/20 bg-secondary/40')}>
      <Tag tone={exp ? 'coral' : 'teal'}>{t(exp ? '경험에서 새로 발견' : '처음 관심에서 연결')}</Tag>
      <dl className="mt-3 grid gap-2 text-sm">
        {e.strengths.length > 0 && <div><dt className="font-semibold">{t('내가 확인한 강점')}</dt><dd className="flex flex-wrap gap-1.5">{e.strengths.map((s, i) => <span key={i} className="rounded-md bg-card px-2 py-0.5">“<Orig>{s}</Orig>”</span>)}</dd></div>}
        {e.interests.length > 0 && <div><dt className="font-semibold">{t('내 관심사')}</dt><dd className="flex flex-wrap gap-1.5">{e.interests.map((s, i) => <span key={i} className="rounded-md bg-card px-2 py-0.5">“<Orig>{s}</Orig>”</span>)}</dd></div>}
        {e.did && <div><dt className="font-semibold">{t('직접 한 일')}</dt><dd>“<Orig>{e.did}</Orig>”</dd></div>}
        {e.role && <div><dt className="font-semibold">{t('나의 역할')}</dt><dd>“<Orig>{e.role}</Orig>”</dd></div>}
        {e.learning && <div><dt className="font-semibold">{t('배우고 느낀 점')}</dt><dd>“<Orig>{e.learning}</Orig>”</dd></div>}
      </dl>
      <p className="mt-3 text-sm text-muted-foreground">{t(e.bridge)}</p>
      {e.study.length > 0 && <p className="mt-2 text-sm"><span className="font-semibold">{t('이 학과에서 일반적으로 배우는 것')}: </span>{e.study.map(P).join(' · ')}</p>}
    </div>
  );
}

function RecCard({ r }: { r: Recommendation }) {
  const { update, state } = useLab();
  const { t } = useLocale();
  const m = majorById(r.majorId);
  if (!m) return null;
  const id = m.id;
  const save = () => update(d => { if (!d.savedMajors.includes(id)) d.savedMajors.push(id); });
  const decide = (x: View) => update(d => decideRecommendation(d, id, x));
  const initial = r.evidence.filter(e => e.kind === 'initial');
  const extra = r.evidence.filter(e => e.kind === 'experience');
  return (
    <article className="lift rounded-2xl border bg-card p-5" data-testid={`rec-card-${id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold">{P(m.name)}</h3>
          <p className="text-xs text-muted-foreground">{m.en}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={r.origin === 'initial' ? 'teal' : 'coral'}>{t(r.origin === 'initial' ? '처음 발견: 관심사' : '처음 발견: 활동 경험')}</Tag>
          {r.saved && <Tag tone="navy">{t('저장됨')}</Tag>}
          {r.blocked && <Tag tone="outline">{t('흥미 없음 분야와 겹쳐 숨김')}</Tag>}
        </div>
      </div>
      {r.stale ? (
        <div role="status" className="mt-4 flex gap-2 rounded-xl border border-dashed p-4 text-sm" data-testid={`rec-stale-${id}`}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-coral" aria-hidden />
          <p>{t('이 추천의 근거가 된 기록이 지금은 없거나 바뀌었어요. 원래 기록을 다시 확인해 주세요. 지워진 문장은 보관하거나 보여 주지 않아요.')}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {initial.length > 0 && <div className="grid gap-2"><p className="text-xs font-semibold tracking-wide text-primary">{t('처음 근거')}</p>{initial.map(e => <EvidenceBlock key={e.id} e={e} />)}</div>}
          {extra.length > 0 && <div className="grid gap-2"><p className="text-xs font-semibold tracking-wide text-coral">{t('추가된 경험 근거')}</p>{extra.map(e => <EvidenceBlock key={e.id} e={e} />)}</div>}
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/majors?m=${id}`} className={btn} data-testid={`rec-detail-${id}`}>{t('학과 자세히 보기')}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
        <Link href={`/majors?operatorMajor=${id}#operator-universities`} className={btn} data-testid={`rec-operators-${id}`}><School className="h-4 w-4" aria-hidden />{t('운영 대학 보기')}</Link>
        {r.decision !== 'hidden' && <button type="button" className={cn(btn, 'border-primary/40 text-primary')} onClick={save} disabled={state.savedMajors.includes(id)} data-testid={`rec-save-${id}`}><Bookmark className="h-4 w-4" aria-hidden />{t(state.savedMajors.includes(id) ? '저장됨' : '관심 학과에 저장')}</button>}
        {r.decision === 'active' && <button type="button" className={btn} onClick={() => decide('hold')} data-testid={`rec-hold-${id}`}><PauseCircle className="h-4 w-4" aria-hidden />{t('잠시 보류')}</button>}
        {r.decision !== 'hidden' && <button type="button" className={btn} onClick={() => decide('hidden')} data-testid={`rec-hide-${id}`}><EyeOff className="h-4 w-4" aria-hidden />{t('숨기기')}</button>}
        {r.decision !== 'active' && <button type="button" className={btn} onClick={() => decide('active')} data-testid={`rec-review-${id}`}><RotateCcw className="h-4 w-4" aria-hidden />{t('다시 검토하기')}</button>}
      </div>
    </article>
  );
}

export function MajorRecommendations() {
  const { state } = useLab();
  const { t } = useLocale();
  const [view, setView] = useState<View>('active');
  const all = useMemo(() => recommendationsFor(state), [state]);
  const counts = { active: 0, hold: 0, hidden: 0 } as Record<View, number>;
  all.forEach(r => { counts[r.decision]++; });
  const shown = all.filter(r => r.decision === view);
  const views: { v: View; label: string }[] = [{ v: 'active', label: '탐색 중' }, { v: 'hold', label: '보류' }, { v: 'hidden', label: '숨김' }];

  const exportText = () => {
    const L: string[] = [t('추천 학과 탐색 기록'), t('규칙 기반 안내이며 실제 AI 분석이 아니에요. 저장·보류·숨김은 내가 직접 고른 결정이에요.'), t(RECOMMENDATION_NOTICE), ''];
    for (const r of shown) {
      const m = majorById(r.majorId); if (!m) continue;
      L.push(`# ${P(m.name)} (${m.en})`);
      if (r.stale) L.push(t('근거 기록이 바뀌었거나 없어요. 원래 기록을 다시 확인해 주세요.'));
      for (const e of r.evidence) {
        L.push(`- ${t(e.kind === 'experience' ? '추가된 경험 근거' : '처음 근거')}`);
        if (e.strengths.length) L.push(`  ${formatMessage('강점: {0}', [e.strengths.join(' / ')])}`);
        if (e.interests.length) L.push(`  ${formatMessage('관심사: {0}', [e.interests.join(' / ')])}`);
        if (e.did) L.push(`  ${formatMessage('직접 한 일: {0}', [e.did])}`);
        if (e.role) L.push(`  ${formatMessage('역할: {0}', [e.role])}`);
        if (e.learning) L.push(`  ${formatMessage('배운 점: {0}', [e.learning])}`);
        L.push(`  ${t(e.bridge)}`);
        L.push(`  ${t('일반적으로 배우는 것')}: ${e.study.map(P).join(' · ')}`);
      }
      L.push('');
    }
    const url = URL.createObjectURL(new Blob([L.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `career-lab-recommendations-${view}.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <Panel title="경험에서 발견한 학과" hint="내 선택은 그대로 두고, 기록에서 이어지는 학과를 더 살펴봐요." tone="teal">
      <div data-testid="rec-panel">
        <p className="rounded-xl border border-primary/20 bg-card p-4 text-base leading-relaxed" role="note" data-testid="rec-notice">{t(RECOMMENDATION_NOTICE)}</p>
        <p className="mt-2 text-xs text-muted-foreground">{t('규칙 기반 안내이며 실제 AI 분석이 아니에요.')}</p>
        <div className="no-print mt-4 flex flex-wrap items-center gap-2" role="tablist" aria-label={t('추천 보기')}>
          {views.map(({ v, label }) => (
            <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)} data-testid={`rec-view-${v}`}
              className={cn(btn, view === v && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90')}>
              {formatMessage('{0} {1}개', [t(label), counts[v]])}
            </button>
          ))}
          <div className="ms-auto flex flex-wrap gap-2">
            <button type="button" className={btn} onClick={exportText} disabled={!shown.length} data-testid="rec-export"><Download className="h-4 w-4" aria-hidden />{t('텍스트로 내보내기')}</button>
            <button type="button" className={btn} onClick={() => window.print()} data-testid="rec-print"><Printer className="h-4 w-4" aria-hidden />{t('인쇄')}</button>
          </div>
        </div>
        {view === 'hidden' && <p className="mt-3 text-sm text-muted-foreground">{t('숨긴 학과는 자동으로 다시 나타나지 않아요. 다시 검토하기를 눌러야 탐색 중으로 돌아가요.')}</p>}
        <div className="mt-4 grid gap-4">
          {shown.length ? shown.map(r => <RecCard key={r.majorId} r={r} />) : (
            <Empty title={all.length ? '이 보기에는 학과가 없어요' : '아직 연결된 기록이 없어요'}
              desc="기록이 없다고 가능성이 줄어드는 것은 아니에요. 강점·관심사·활동 회고를 남기면 이어지는 학과를 함께 찾아봐요." />
          )}
        </div>
      </div>
    </Panel>
  );
}

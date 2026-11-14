import { T } from '@/i18n/tx';
import type { ReactNode } from 'react';
import type { CardFields } from '@/lib/store';
import { STAGE_LABEL, type Stage } from '@/data/worksheets';
import { cn } from '@/lib/utils';

/** Student-facing card. Contains only student content (no teacher notes, level codes, or source warnings).
 * Screen and print render the same content; print CSS adjusts size for A4 (1) or A5 x2 per A4. */
export function JobCardView({ f, code, stage, version, compact }: { f: CardFields; code: string; stage: Stage; version: number; compact?: boolean }) {
  const Box = ({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) => (
    <div className={cn('break-inside-avoid', wide && 'col-span-2')}>
      <div className="cs-label text-[11px] font-bold tracking-wide text-primary">{label}</div>
      <div className={cn('cs-text whitespace-pre-line', compact ? 'text-[11.5px] leading-[1.35]' : 'text-[13px] leading-snug')}>{children}</div>
    </div>
  );
  const Blank = ({ label }: { label: string }) => (
    <div className="break-inside-avoid">
      <div className="cs-label text-[11px] font-bold text-primary">{label}</div>
      {[0, 1, 2].map((i) => <div key={i} className={cn('cs-line border-b border-dashed border-foreground/45', compact ? 'h-6' : 'h-9')} />)}
    </div>
  );
  return (
    <article className={cn('card-sheet rounded-xl border-2 border-sidebar bg-card', compact ? 'p-3 space-y-1.5' : 'p-4 space-y-2.5')} data-testid="card-preview">
      <header className="flex items-start justify-between gap-2 border-b-2 border-sidebar pb-1.5">
        <div><div className="cs-label font-mono text-[10px]">{T("FeelGood 수업설계LAB ·")}{' '}{T(STAGE_LABEL[stage])} · v{version}</div><div className={cn('font-bold', compact ? 'text-base' : 'text-lg')}>[{T(f.kind)}{T("] 개인 직무 카드")}</div></div>
        <div className="cs-text text-end text-xs"><div className="font-mono font-bold">{code}</div><div>{T("날짜 ________")}</div></div>
      </header>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <Box label={T("공동 직무 목표")}>{f.sharedGoal}</Box>
        <Box label={T("핵심 기준")}>{f.sharedCriterion}</Box>
        <Box label={T("오늘 목표")}>{f.todayGoal}</Box>
        <Box label={T("직무")}>{f.job}</Box>
        <Box label={T("교육용 장면")} wide>{f.scenario}</Box>
        <Box label={T("읽기 자료")} wide>{f.reading}</Box>
        <Box label={T("첫 행동")}>{f.firstAction}</Box>
        <Box label={T("단계")}><ol className="list-decimal ps-4">{f.steps.filter(Boolean).map((s, i) => <li key={i}>{s}</li>)}</ol></Box>
        <Box label={T("방법 · 도움")}>{f.method}{f.help ? `\n${f.help}` : ''}</Box>
        <Box label={T("나의 역할 · 시간")}>{f.role}{`\n${f.time}`}</Box>
        <Box label={T("산출물")}>{f.deliverable}</Box>
        <Box label={T("완료 기준")}>{f.criterion}</Box>
        <Box label={T("중간 확인")} wide>{f.checkIn}</Box>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-1">
        <Blank label={T("실제 행동 · 조정")} />
        <Blank label={T("산출물 · 피드백")} />
        <Blank label={T("다음 행동")} />
      </div>
    </article>
  );
}

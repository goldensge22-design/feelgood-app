import { Fragment, useState } from 'react';
import { T } from '@/i18n/tx';
import { buildAgenda, courseStats, formatOffset } from '@/lib/studio';
import type { AgendaRow } from '@/lib/studio/types';
import { Pill } from '@/components/shell';
import { cn } from '@/lib/utils';
import { StudioFrame, Section, useStudio, tryOr, Empty, errText } from './common';

export default function Agenda() {
  const { course } = useStudio();
  const [open, setOpen] = useState<string>('');
  let rows: AgendaRow[] = []; let err = '';
  if (course) { try { rows = buildAgenda(course); } catch (e) { err = errText(e); } }
  const st = course ? tryOr(() => courseStats(course), null) : null;
  const sessions = Array.from(new Set(rows.map((r) => r.session)));
  return (
    <StudioFrame kicker="STUDIO 1.5 · AGENDA" title={T('진행표')}>
      {st && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5" data-testid="stats-agenda">
          {([['수업', st.instruction], ['쉬는 시간', st.breaks], ['검사', st.test], ['합계', st.total], ['회차', st.sessions]] as const).map(([k, v]) => (
            <div key={k} className="rounded-lg border bg-card px-3 py-2"><div className="text-xs text-muted-foreground">{T(k)}</div><div className="font-mono text-xl font-semibold">{v}{k !== '회차' && <span className="text-xs text-muted-foreground"> {T('분')}</span>}</div></div>
          ))}
        </div>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
      {!rows.length && !err ? <Empty title={T('진행표가 비어 있습니다')} /> : sessions.map((n) => (
        <Section key={n} title={T('{0}회차', n + 1)}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-start text-xs text-muted-foreground"><th className="py-1.5 text-start">{T('시간')}</th><th className="text-start">{T('단계')}</th><th className="text-start">{T('프로그램')}</th><th className="text-start">{T('학생 산출물')}</th><th className="text-start">{T('분')}</th></tr></thead>
              <tbody>{rows.filter((r) => r.session === n).map((r) => (
                <Fragment key={r.id}>
                  <tr onClick={() => setOpen(open === r.id ? '' : r.id)} className={cn('cursor-pointer border-b transition hover:bg-muted/60', open === r.id && 'bg-secondary')} data-testid={`row-agenda-${r.id}`}>
                    <td className="whitespace-nowrap py-2 font-mono text-xs">{tryOr(() => `${formatOffset(r.start, course)}–${formatOffset(r.end, course)}`, `${r.start}-${r.end}`)}</td>
                    <td><Pill tone="gray">{r.phase}</Pill></td><td className="font-semibold">{r.program}</td><td className="text-muted-foreground">{r.deliverable}</td><td className="font-mono">{r.minutes}</td>
                  </tr>
                  {open === r.id && <tr className="border-b bg-muted/40"><td colSpan={5} className="p-3"><dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">{([['화면', r.screen], ['교사', r.teacher], ['학생', r.student], ['완료 기준', r.completion], ['대안', r.alternative]] as const).map(([k, v]) => <Fragment key={k}><dt className="font-semibold">{T(k)}</dt><dd>{v}</dd></Fragment>)}</dl></td></tr>}
                </Fragment>
              ))}</tbody>
            </table>
          </div>
        </Section>
      ))}
    </StudioFrame>
  );
}

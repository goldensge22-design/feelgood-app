import { useState } from 'react';
import { ClipboardCheck, Check as CheckIcon, Timer, CalendarClock } from 'lucide-react';
import { T } from '@/i18n/tx';
import { planPractice, completePractice, saveNextAction } from '@/lib/studio';
import type { Course } from '@/lib/studio/types';
import { Btn, Pill } from '@/components/shell';
import { Section, Txt, Check, act, useDraft, useStudio } from './common';

/** 3-minute planner basic practice. Registers a real local PlannerActivity (stable ID) — never an external planner. */
export function PracticePanel({ course, sid }: { course: Course; sid: string }) {
  const { s, actor } = useStudio();
  const p = s.studio.practices.find((x) => x.courseId === course.id && x.studentId === sid);
  const [d, setD] = useDraft(`practice-${course.id}-${sid}`, { goal: '', first: '', actual: '', reflection: '', confirmed: false });
  const student = actor.role === 'student';
  const goal = d.first.trim() ? `${d.goal.trim()} — ${T('첫 행동')}: ${d.first.trim()}` : d.goal.trim();
  return (
    <Section title={T('0 · 3분 플래너 기본 연습')} hint={T('직무 탐색 전에 짧은 실제 활동 하나를 계획하고, 하고, 기록합니다. 완료해야 후보를 받을 수 있습니다.')} right={p ? (p.done ? <Pill tone="blue">{T('연습 완료')}</Pill> : <Pill tone="orange">{T('계획 등록됨')}</Pill>) : <Pill tone="gray">{T('시작 전')}</Pill>}>
      {!p && (
        <div className="space-y-2">
          <Txt label={T('3분 안에 할 목표')} value={d.goal} onChange={(v) => setD({ ...d, goal: v })} testid="input-practice-goal" placeholder={T('예: 책상 위 자료 3개를 순서대로 정리하기')} />
          <Txt label={T('첫 계획 행동')} value={d.first} onChange={(v) => setD({ ...d, first: v })} testid="input-practice-first" />
          <Btn disabled={!d.goal.trim() || !d.first.trim()} onClick={() => act((st) => planPractice(st, course.id, sid, goal), '로컬 플래너에 등록했습니다')} data-testid="button-plan-practice"><ClipboardCheck className="h-4 w-4" />{T('로컬 플래너에 등록')}</Btn>
        </div>
      )}
      {p && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-sm"><Timer className="h-4 w-4 text-primary" /><b>{p.goal}</b><span className="font-mono text-[11px] text-muted-foreground">{p.plannerId}</span></div>
          {p.done ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm"><dt className="text-muted-foreground">{T('실제로 한 일')}</dt><dd>{p.actual}</dd><dt className="text-muted-foreground">{T('돌아보기')}</dt><dd>{p.reflection}</dd></dl>
          ) : (
            <>
              <Txt rows={2} label={T('실제로 한 일')} value={d.actual} onChange={(v) => setD({ ...d, actual: v })} testid="input-practice-actual" />
              <Txt rows={2} label={T('돌아보기')} value={d.reflection} onChange={(v) => setD({ ...d, reflection: v })} testid="input-practice-reflection" />
              <Check label={T('학생 본인이 실제로 했음을 확인')} checked={d.confirmed} disabled={!student} onChange={(v) => setD({ ...d, confirmed: v })} testid="check-practice-confirmed" />
              {!student && <p className="text-xs text-muted-foreground">{T('본인 확인은 학생 역할에서만 할 수 있습니다.')}</p>}
              <Btn variant="orange" disabled={!d.confirmed || !d.actual.trim() || !d.reflection.trim()} onClick={() => act((st) => completePractice(st, course.id, sid, d.actual, d.reflection), '연습을 완료했습니다')} data-testid="button-complete-practice"><CheckIcon className="h-4 w-4" />{T('연습 완료 기록')}</Btn>
            </>
          )}
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">{T('이 브라우저 안의 플래너 활동으로만 저장되며 외부 플래너에 전송되지 않습니다.')}</p>
    </Section>
  );
}

/** Next action within 7 days — saved to studio followups and the latest local planner activity. */
export function NextActionPanel({ course, sid }: { course: Course; sid: string }) {
  const { s } = useStudio();
  const [text, setText] = useDraft(`next-${course.id}-${sid}`, '');
  const [date, setDate] = useState('');
  const list = s.studio.followups.filter((f) => f.courseId === course.id && f.studentId === sid);
  const today = new Date().toISOString().slice(0, 10);
  const max = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const bad = !!date && (date < today || date > max);
  return (
    <Section title={T('7일 안에 할 다음 행동')} hint={T('마무리에서 실제 날짜와 행동을 정해 최신 로컬 플래너 활동에 저장합니다.')}>
      <div className="grid gap-2 sm:grid-cols-[150px_1fr_auto] sm:items-end">
        <label className="text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{T('날짜')}</span><input type="date" min={today} max={max} value={date} onChange={(e) => setDate(e.target.value)} data-testid="input-next-date" className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm" /></label>
        <Txt label={T('행동')} value={text} onChange={setText} testid="input-next-action" />
        <Btn disabled={!date || bad || !text.trim()} onClick={() => { if (act((st) => saveNextAction(st, course.id, sid, `${date} ${text.trim()}`), '다음 행동을 저장했습니다')) setText(''); }} data-testid="button-save-next"><CalendarClock className="h-4 w-4" />{T('저장')}</Btn>
      </div>
      {bad && <p className="mt-1 text-xs text-destructive">{T('오늘부터 7일 안의 날짜를 고르세요.')}</p>}
      {list.length > 0 && <ul className="mt-2 space-y-1 text-sm">{list.map((f, i) => <li key={i} className="flex gap-2"><span className="font-mono text-[11px] text-muted-foreground">{f.at.slice(0, 10)}</span>{f.text}</li>)}</ul>}
    </Section>
  );
}

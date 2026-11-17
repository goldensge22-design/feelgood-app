import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { ShieldAlert, UserRound, ChevronDown } from 'lucide-react';
import { T } from '@/i18n/tx';
import { useApp, setState, type AppState } from '@/lib/store';
import { switchActor, visibleCourses } from '@/lib/studio';
import type { StudioRole, Course } from '@/lib/studio/types';
import { toast } from '@/hooks/use-toast';
import { Pill, inputCls } from '@/components/shell';
import { cn } from '@/lib/utils';

export const STUDIO_TABS: [string, string][] = [
  ['/studio', '과정'], ['/studio/results', '결과지'], ['/studio/sources', '기업·직무 출처'], ['/studio/agenda', '진행표'],
  ['/studio/live', '현장 탐색·미션'], ['/studio/writing', '글쓰기·상담'], ['/studio/interview', '모의 면접'],
  ['/studio/print', '인쇄'], ['/studio/status', '상태 점검'],
];

/** Runs a pure engine mutation; errors become a toast instead of a broken screen. */
export function act(fn: (s: AppState) => AppState, ok?: string): boolean {
  try { setState(fn); if (ok) toast({ title: T(ok) }); return true; }
  catch (e) { toast({ title: T('처리하지 못했습니다'), description: e instanceof Error ? T(e.message) : String(e), variant: 'destructive' }); return false; }
}

const DK = 'lesson-lab-studio-draft:';
/** Draft state persisted in localStorage so unsaved input survives refresh and language switching. */
export function useDraft<V>(key: string, init: V | (() => V)): [V, (v: V | ((p: V) => V)) => void, () => void] {
  const read = (k: string): V => {
    try { const r = localStorage.getItem(DK + k); if (r) return JSON.parse(r) as V; } catch { /* ignore */ }
    return typeof init === 'function' ? (init as () => V)() : init;
  };
  const [v, setV] = useState<V>(() => read(key));
  const kRef = useRef(key);
  useEffect(() => { if (kRef.current !== key) { kRef.current = key; setV(read(key)); } }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { try { localStorage.setItem(DK + kRef.current, JSON.stringify(v)); } catch { /* storage full: draft stays in memory */ } }, [v]);
  const clear = () => { try { localStorage.removeItem(DK + key); } catch { /* ignore */ } setV(typeof init === 'function' ? (init as () => V)() : init); };
  return [v, setV, clear];
}

export function useStudio() {
  const s = useApp((x) => x);
  let courses: Course[] = [];
  try { courses = visibleCourses(s); } catch { courses = []; }
  const course = courses.find((c) => c.id === s.studio.activeCourseId) ?? courses[0];
  return { s, studio: s.studio, actor: s.studio.actor, courses, course, students: s.students };
}

export const studentName = (s: AppState, id: string) => { const st = s.students.find((x) => x.id === id); return st ? (st.displayName || st.code) : id; };

export function StudioFrame({ kicker, title, children, actions }: { kicker: string; title: string; children: ReactNode; actions?: ReactNode }) {
  const [loc] = useLocation();
  const { s, actor, courses, course } = useStudio();
  const counselors = course?.counseling.counselors ?? [];
  const roster = course ? s.students.filter((x) => course.studentIds.includes(x.id)) : [];
  const setRole = (role: StudioRole) => {
    const id = role === 'teacher' ? 'teacher-demo' : role === 'student' ? roster[0]?.id ?? '' : counselors[0]?.id ?? '';
    if (!id) { toast({ title: T(role === 'student' ? '과정에 학생이 없습니다' : '등록된 상담자가 없습니다'), variant: 'destructive' }); return; }
    act((st) => switchActor(st, { role, id }));
  };
  return (
    <div className="space-y-5">
      <div className="no-print rise">
        <div className="font-mono text-xs tracking-[0.18em] text-[hsl(var(--sidebar-primary))] uppercase">{kicker}</div>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
        <nav className="mt-4 -mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="studio">
          {STUDIO_TABS.map(([h, l]) => (
            <Link key={h} href={h} data-testid={`link-studio-${h.split('/').pop()}`} className={cn('whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-semibold transition', loc === h ? 'bg-sidebar text-white border-sidebar' : 'bg-card hover:border-primary/50')}>{T(l)}</Link>
          ))}
        </nav>
        <div className="mt-3 grid gap-2 rounded-xl border bg-sidebar p-3 text-sidebar-foreground md:grid-cols-[1fr_auto_auto] md:items-center">
          <label className="flex min-w-0 items-center gap-2 text-sm">
            <span className="shrink-0 font-mono text-[11px] tracking-widest text-sidebar-primary">{T('과정')}</span>
            <select data-testid="select-active-course" value={course?.id ?? ''} onChange={(e) => act((st) => ({ ...st, studio: { ...st.studio, activeCourseId: e.target.value } }))} className="min-w-0 flex-1 rounded-md bg-sidebar-accent px-2 py-1.5 text-white outline-none">
              {courses.length === 0 && <option value="">{T('과정 없음 — 먼저 만드세요')}</option>}
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <div className="flex items-center gap-1.5 text-sm">
            <UserRound className="h-4 w-4 text-sidebar-primary" />
            <span className="font-mono text-[11px] tracking-widest text-sidebar-primary">{T('역할 미리보기')}</span>
            <div className="inline-flex rounded-md bg-sidebar-accent p-0.5">
              {(['teacher', 'student', 'counselor'] as StudioRole[]).map((r) => (
                <button key={r} type="button" data-testid={`button-actor-${r}`} onClick={() => setRole(r)} className={cn('rounded px-2.5 py-1 text-xs font-bold', actor.role === r ? 'bg-sidebar-primary text-sidebar' : 'text-white/80 hover:text-white')}>{T(r === 'teacher' ? '교사' : r === 'student' ? '학생' : '상담자')}</button>
              ))}
            </div>
          </div>
          {actor.role !== 'teacher' && (
            <div className="relative">
              <select data-testid="select-actor-id" value={actor.id} onChange={(e) => act((st) => switchActor(st, { role: actor.role, id: e.target.value }))} className="appearance-none rounded-md bg-sidebar-accent py-1.5 pe-7 ps-2 text-sm text-white outline-none">
                {(actor.role === 'student' ? roster.map((x) => [x.id, x.displayName || x.code]) : counselors.map((c) => [c.id, c.name])).map(([id, n]) => <option key={id} value={id}>{n}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute end-1.5 top-2 h-4 w-4" />
            </div>
          )}
          <p className="flex items-start gap-1.5 text-[11px] text-sidebar-foreground/70 md:col-span-3"><ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-sidebar-primary" />{T('데모 역할 전환입니다. 실제 로그인·권한 보안이 아니며, 모든 학생 정보는 이 브라우저에만 저장된 가상 데이터입니다. 서버·외부 AI·외부 서비스와 연결되지 않습니다.')}</p>
        </div>
      </div>
      {!course && loc !== '/studio' ? <NeedCourse /> : children}
    </div>
  );
}

export function NeedCourse() {
  return (
    <Empty title={T('활성 과정이 없습니다')} body={T('과정 화면에서 하루 수업 또는 장기 과정을 먼저 만드세요.')}>
      <Link href="/studio" className="inline-flex rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground" data-testid="link-go-studio">{T('과정 만들기')}</Link>
    </Empty>
  );
}

export function Empty({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed bg-card/60 p-8 text-center">
      <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border-2 border-[hsl(var(--sidebar-primary))]/50 font-mono text-xs text-[hsl(var(--sidebar-primary))]">0</div>
      <div className="font-bold">{title}</div>
      {body && <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{body}</p>}
      {children && <div className="mt-3 flex justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Section({ title, hint, children, right, className }: { title: string; hint?: string; children: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-xl border bg-card p-4 md:p-5', className)}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div><h2 className="font-bold">{title}</h2>{hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Txt({ label, value, onChange, rows, testid, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; rows?: number; testid: string; placeholder?: string; disabled?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{label}</span>
      {rows ? <textarea data-testid={testid} rows={rows} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, 'resize-y leading-6')} />
        : <input data-testid={testid} value={value} disabled={disabled} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />}
    </label>
  );
}

export function Check({ label, checked, onChange, testid, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; testid: string; disabled?: boolean }) {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm', disabled && 'opacity-50')}>
      <input type="checkbox" data-testid={testid} checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
      <span>{label}</span>
    </label>
  );
}

const STATUS: Record<string, [string, 'blue' | 'orange' | 'gray' | 'red']> = {
  'student-selected': ['학생 선택', 'gray'], 'review-needed': ['교사 검토 필요', 'orange'], confirmed: ['확정', 'blue'],
  'planner-registered': ['로컬 플래너 등록', 'blue'], 'in-progress': ['진행 중', 'orange'], partial: ['부분 수행', 'orange'],
  performed: ['수행 기록됨', 'blue'], 'experience-confirmed': ['학생 경험 확인', 'blue'],
  'draft-saved': ['초안 저장', 'gray'], scheduled: ['상담 예약', 'orange'], consulted: ['상담 완료', 'blue'],
  'facts-confirmed': ['사실 확인', 'blue'], revising: ['수정 중', 'orange'], 'student-final': ['학생 최종', 'blue'],
  unregistered: ['미등록', 'gray'], failed: ['등록 실패', 'red'], local: ['이 브라우저에만 등록', 'blue'],
  exploring: ['탐색 중', 'gray'], 'candidates-ready': ['후보 준비', 'orange'], selected: ['선택 완료', 'blue'],
  booked: ['예약됨', 'orange'], completed: ['완료', 'blue'], cancelled: ['취소', 'gray'],
};
export function Status({ v }: { v: string }) { const [l, t] = STATUS[v] ?? [v, 'gray']; return <Pill tone={t}>{T(l)}</Pill>; }

export const SimTag = ({ on }: { on: boolean }) => (on ? <Pill tone="orange">{T('모의·가상 경험')}</Pill> : null);
export const errText = (e: unknown) => (e instanceof Error ? T(e.message) : String(e));
export function tryOr<V>(f: () => V, d: V): V { try { return f(); } catch { return d; } }

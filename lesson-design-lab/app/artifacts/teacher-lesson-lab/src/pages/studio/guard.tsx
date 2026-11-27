import type { ComponentType } from 'react';
import { Link } from 'wouter';
import { ShieldAlert } from 'lucide-react';
import { T } from '@/i18n/tx';
import { useApp } from '@/lib/store';
import { switchActor } from '@/lib/studio';
import { Btn } from '@/components/shell';
import { act } from './common';

/** Simulated client-side role filter for legacy teacher pages. NOT real authentication: it only hides
 * all-student lists, reports and writing while the demo actor is a student or counselor. */
export function teacherOnly(C: ComponentType) {
  return function Guarded() {
    const role = useApp((s) => s.studio.actor.role);
    if (role === 'teacher') return <C />;
    return (
      <div className="mx-auto max-w-xl rounded-xl border bg-card p-6 text-center rise" data-testid="panel-role-guard">
        <ShieldAlert className="mx-auto h-8 w-8 text-[hsl(var(--sidebar-primary))]" />
        <h1 className="mt-2 text-xl font-bold">{T('교사 전용 화면입니다')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{T('현재 데모 역할({0})에서는 전체 학생의 결과지·글·카드 목록을 표시하지 않습니다. 이는 브라우저 안의 역할 미리보기 필터이며 실제 인증·보안이 아닙니다.', T(role === 'student' ? '학생' : '상담자'))}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {role === 'student' && <Link href="/studio/live" className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground" data-testid="link-guard-live">{T('나의 미션')}</Link>}
          <Link href="/studio/writing" className="rounded-lg border px-3.5 py-2 text-sm font-semibold" data-testid="link-guard-writing">{role === 'student' ? T('나의 글') : T('공유받은 글')}</Link>
          <Btn variant="ghost" onClick={() => act((s) => switchActor(s, { role: 'teacher', id: 'teacher-demo' }))} data-testid="button-guard-teacher">{T('교사 역할로 전환 (데모)')}</Btn>
        </div>
      </div>
    );
  };
}

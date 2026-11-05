import { AlertTriangle } from 'lucide-react';
import { T } from '@/i18n/tx';
import { Pill } from '@/components/shell';
import { StudioFrame, Section, useStudio, studentName, Status, SimTag, Empty } from './common';

const M_ORDER = ['student-selected', 'review-needed', 'confirmed', 'planner-registered', 'in-progress', 'partial', 'performed', 'experience-confirmed'];
const W_ORDER = ['draft-saved', 'scheduled', 'consulted', 'facts-confirmed', 'revising', 'student-final'];

export default function StudioStatus() {
  const { s, course, actor } = useStudio();
  if (!course) return <StudioFrame kicker="STUDIO 1.5 · STATUS" title={T('상태 점검')}>{null}</StudioFrame>;
  const ms = s.studio.missions.filter((m) => m.courseId === course.id && (actor.role !== 'student' || m.studentId === actor.id));
  const ws = s.studio.writings.filter((w) => w.courseId === course.id && (actor.role !== 'student' || w.studentId === actor.id));
  const facts = s.studio.facts.filter((f) => f.courseId === course.id && (actor.role !== 'student' || f.studentId === actor.id));
  const guards: { id: string; who: string; msg: string }[] = [];
  ms.forEach((m) => {
    if (['performed', 'experience-confirmed'].includes(m.status) && !m.record.actual.trim()) guards.push({ id: m.id, who: m.studentId, msg: '수행 표시이지만 실제 기록이 비어 있음' });
    if (m.status === 'experience-confirmed' && !m.studentConfirmed) guards.push({ id: m.id + 'c', who: m.studentId, msg: '경험 확인 상태이나 학생 본인 확인 없음' });
    if (m.registration === 'local') guards.push({ id: m.id + 'r', who: m.studentId, msg: '로컬 등록만 됨 — 외부 플래너 등록 아님' });
  });
  facts.filter((f) => !f.studentConfirmed).forEach((f) => guards.push({ id: f.id, who: f.studentId, msg: '학생 미확인 사실 — 글에 사용 불가' }));
  ws.forEach((w) => { if (w.status === 'student-final' && !Object.values(w.checklist).every(Boolean)) guards.push({ id: w.id, who: w.studentId, msg: '최종 표시이나 점검표 미완료' }); });
  if (actor.role === 'counselor') return <StudioFrame kicker="STUDIO 1.5 · STATUS" title={T('상태 점검')}><Empty title={T('상담자 역할은 과정 전체 상태를 보지 않습니다')} /></StudioFrame>;
  return (
    <StudioFrame kicker="STUDIO 1.5 · STATUS" title={T('상태 점검')}>
      <Section title={T('미션 단계')} hint={T('각 단계는 별개입니다. 선택·확정·등록·수행·경험 확인을 섞지 않습니다.')}>
        <Flow order={M_ORDER} counts={(k) => ms.filter((m) => m.status === k).length} />
      </Section>
      <Section title={T('글쓰기 단계')}><Flow order={W_ORDER} counts={(k) => ws.filter((w) => w.status === k).length} /></Section>
      <Section title={T('거짓 성과 방지 점검')} hint={T('아래 항목은 성과로 집계하지 않습니다.')} right={<Pill tone={guards.length ? 'orange' : 'blue'}>{guards.length}</Pill>}>
        {guards.length === 0 ? <p className="text-sm text-muted-foreground">{T('경고 없음')}</p> : <ul className="divide-y text-sm">{guards.map((g) => <li key={g.id} className="flex items-center gap-2 py-1.5" data-testid={`row-guard-${g.id}`}><AlertTriangle className="h-4 w-4 shrink-0 text-[hsl(var(--sidebar-primary))]" /><b className="font-mono text-xs">{studentName(s, g.who)}</b><span>{T(g.msg)}</span></li>)}</ul>}
      </Section>
      <Section title={T('학생별 현황')}>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-xs text-muted-foreground"><th className="py-1.5 text-start">{T('학생')}</th><th className="text-start">{T('미션')}</th><th className="text-start">{T('확인 사실')}</th><th className="text-start">{T('글')}</th></tr></thead>
          <tbody>{course.studentIds.filter((id) => actor.role !== 'student' || id === actor.id).map((id) => { const m = ms.filter((x) => x.studentId === id); const w = ws.find((x) => x.studentId === id); const f = facts.filter((x) => x.studentId === id); return (
            <tr key={id} className="border-b"><td className="py-1.5 font-mono text-xs">{studentName(s, id)}</td><td><div className="flex flex-wrap gap-1">{m.length ? m.map((x) => <Status key={x.id} v={x.status} />) : '—'}</div></td><td className="font-mono">{f.filter((x) => x.studentConfirmed).length}/{f.length} {f.some((x) => x.simulation) && <SimTag on />}</td><td>{w ? <span className="flex items-center gap-1"><Status v={w.status} /><span className="font-mono text-xs">V{w.versions.length}</span></span> : '—'}</td></tr>
          ); })}</tbody></table></div>
      </Section>
    </StudioFrame>
  );
}

function Flow({ order, counts }: { order: string[]; counts: (k: string) => number }) {
  return (
    <ol className="flex flex-wrap gap-1.5">{order.map((k, i) => { const n = counts(k); return (
      <li key={k} className="flex items-center gap-1.5"><div className={`rounded-lg border px-2.5 py-1.5 ${n ? 'bg-secondary border-primary/30' : 'bg-card'}`}><Status v={k} /><span className="ms-1.5 font-mono text-sm font-semibold">{n}</span></div>{i < order.length - 1 && <span className="text-muted-foreground">›</span>}</li>
    ); })}</ol>
  );
}

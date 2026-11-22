import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useLab } from '@/vendor/career-lab/lib/store';
import { activityTitle,reflectionTitle } from '@/vendor/career-lab/lib/activity-assistance';
import { FIELDS, majorById } from '@/vendor/career-lab/lib/catalog';
import { reasonsFor, strengthsOf } from '@/vendor/career-lab/lib/links';
import { statusLabel } from '@/vendor/career-lab/lib/types';
import { programById } from '@/vendor/career-lab/lib/universities';
import { PageHeader, Panel, Empty, Tag } from '@/vendor/career-lab/components/lab/ui';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { cn } from '@/vendor/career-lab/lib/utils';
import { useLocale } from '@/vendor/career-lab/lib/locale';

interface Node { id: string; col: number; label: string; tentative?: boolean; reason: string; records: string[]; edit: string; links: string[] }
const COLS = ['강점', '관심사', '분야', '학과', '직업·직무·창업', '실제 활동'];

export default function MapPage() {
  const {t,effectiveLocale}=useLocale();
  const { state: s, update } = useLab();
  const [sel, setSel] = useState('');
  const nodes = useMemo(() => {
    const n: Node[] = [];
    const strengths = strengthsOf(s);
    const fields = FIELDS.filter(f => s.fields[f.id]?.status === 'interested');
    strengths.forEach(x => n.push({ id: `s-${x.id}`, col: 0, label: x.text, reason: `${x.kind === 'test' ? `검사 결과(${x.testName})` : '내가 적은 강점'} · 느낌: ${x.fit ? { similar: '비슷해요', partial: '일부만 맞아요', unsure: '잘 모르겠어요' }[x.fit] : '미판단'}`, records: x.note ? [x.note] : [], edit: '/understand', links: fields.filter(f => f.keywords.some(k => x.text.includes(k))).map(f => `f-${f.id}`) }));
    s.interests.forEach(i => n.push({ id: `i-${i.id}`, col: 1, label: i.text, reason: i.reason ? `관심 계기: ${i.reason}` : '관심 계기를 아직 적지 않았어요', records: [], edit: '/interests', links: fields.filter(f => f.keywords.some(k => (i.text + i.reason).includes(k))).map(f => `f-${f.id}`) }));
    fields.forEach(f => { const rs = reasonsFor(f, s); n.push({ id: `f-${f.id}`, col: 2, label: f.name, tentative: true, reason: rs.length ? rs.map(r => `${r.src} “${r.label}”`).join(', ') + '와 연결' : (s.fields[f.id].note || '직접 골라 탐색 중'), records: s.activities.filter(a => a.sourceId === f.id).map(a => `활동: ${a.title}`), edit: '/explore', links: f.majors.filter(m => s.savedMajors.includes(m)).map(m => `m-${m}`) }); });
    s.savedMajors.forEach(m => { const mj = majorById(m); if (!mj) return; n.push({ id: `m-${m}`, col: 3, label: mj.name, tentative: s.tempMajor !== m, reason: s.tempMajor === m ? '임시 선택한 학과 — 언제든 바꿀 수 있어요' : '저장한 학과 (탐색 중)', records: [...s.uniLinks.filter(l => l.majorId === m).map(l => `대학 링크: ${l.university} (${l.verified ? '확인' : '미확인'})`), ...s.activities.filter(a => a.sourceId === m).map(a => `활동: ${a.title}`)], edit: '/majors', links: s.tempMajor === m ? s.design.jobs.map(j => `j-${j.id}`) : [] }); });
    const programIds = new Set([...(s.savedPrograms || []), ...(s.tempProgram ? [s.tempProgram] : []), ...s.activities.filter(a => a.sourceType === 'program').map(a => a.sourceId)]);
    programIds.forEach(id => {
      const p = programById(s, id);
      const activities = s.activities.filter(a => a.sourceType === 'program' && a.sourceId === id);
      const nodeId = `p-${id}`;
      n.push({ id: nodeId, col: 3, label: p ? (p.recordKind==='official'?`${t(p.universityOriginal)} · ${t(p.programOriginal || p.programDisplay)}`:`${p.universityOriginal} · ${p.programOriginal || p.programDisplay}`) : activities[0]?.sourceLabel || '이전 대학 탐색 · 공식 자료 연결 대기',
        tentative: true, reason: `${s.tempProgram === id ? '임시 선택' : '탐색 중'} · 대학 자료 탐색이지 입학·수강 경험이 아니에요.`,
        records: p ? p.sources.map(src => `${src.title} · ${src.academicVersion || '버전 미확인'} · ${src.status === 'verified' ? `자료 확인 ${src.checkedAt}` : '공식 자료 연결 대기'}`) : ['현재 자료 연결 대기. 활동의 원래 출처 이름은 보존돼요.'],
        edit: '/majors', links: [...activities.map(a => `a-${a.id}`), ...(s.tempProgram === id ? s.design.jobs.map(j => `j-${j.id}`) : [])] });
      if (p) n.find(x => x.id === `m-${p.majorId}`)?.links.push(nodeId);
    });
    s.design.jobs.forEach(j => n.push({ id: `j-${j.id}`, col: 4, label: j.title, tentative: true, reason: j.why || '이유를 아직 적지 않았어요', records: s.activities.filter(a => a.sourceId === `job:${j.id}`).map(a => `활동: ${a.title}`), edit: '/design', links: s.activities.filter(a => a.sourceId === `job:${j.id}`).map(a => `a-${a.id}`) }));
    const usedRoles = new Set<string>();
    s.activities.filter(a => a.sourceType === 'role' && !a.sourceId.startsWith('job:') && a.sourceId !== 'startup').forEach(a => {
      if (usedRoles.has(a.sourceId)) return;
      usedRoles.add(a.sourceId);
      const field = FIELDS.find(f => f.roles.some(r => r.id === a.sourceId));
      const id = `catalog-role-${a.sourceId}`;
      n.push({ id, col: 4, label: a.sourceLabel, tentative: true, reason: `${field?.name || '직무'} 탐색에서 직접 선택한 활동의 출처`, records: [], edit: '/explore',
        links: s.activities.filter(x => x.sourceId === a.sourceId).map(x => `a-${x.id}`) });
      if (field) n.find(x => x.id === `f-${field.id}`)?.links.push(id);
    });
    if (s.design.startup.problem) n.push({ id: 'j-startup', col: 4, label: `창업: ${s.design.startup.problem}`, tentative: true, reason: `대상: ${s.design.startup.target || '미정'} · 검증: ${s.design.startup.experiment || '미정'}`, records: [], edit: '/design', links: s.activities.filter(a => a.sourceId === 'startup').map(a => `a-${a.id}`) });
    s.activities.forEach(a => { const refs = s.reflections.filter(r => r.activityId === a.id); n.push({ id: `a-${a.id}`, col: 5, label: activityTitle(a), tentative: a.status !== 'done', reason: `${statusLabel[a.status]} · 출처: ${a.sourceLabel}`, records: [...refs.map(r => `회고: ${r.learned || r.did}`), ...(a.sourceSnapshot?.sources || []).map(src => `활동을 담을 때의 자료: ${src.academicVersion || '버전 미확인'} · ${src.checkedAt || '확인일 없음'} · ${src.url}`)], edit: refs[0] ? '/experiences' : '/planner', links: [] }); });
    s.reflections.filter(r => !s.activities.some(a => a.id === r.activityId)).forEach(r => n.push({
      id: `r-${r.id}`, col: 5, label: reflectionTitle(r,s.activities), reason: '내가 직접 남긴 실제 경험 기록',
      records: [`실제 한 일: ${r.did}`, ...(r.learned ? [`배움: ${r.learned}`] : []), ...(r.next ? [`다음 행동: ${r.next}`] : [])],
      edit: '/experiences', links: [],
    }));
    // 역방향 연결: 활동 → 출처 노드
    s.activities.forEach(a => { const src = n.find(x => x.id === `f-${a.sourceId}` || x.id === `m-${a.sourceId}`); if (src && !src.links.includes(`a-${a.id}`)) src.links.push(`a-${a.id}`); });
    n.filter(x => x.col === 3).forEach(x => { x.tentative = true; });
    return n;
  }, [s,effectiveLocale]);
  useEffect(() => {
    if (nodes.length && !s.mapViewedAt) update(d => { d.mapViewedAt = new Date().toISOString(); });
  }, [nodes.length, s.mapViewedAt, update]);
  const selected = nodes.find(n => n.id === sel);
  const related = new Set<string>(selected ? [selected.id, ...selected.links, ...nodes.filter(n => n.links.includes(selected.id)).map(n => n.id)] : []);

  return (
    <div>
      <PageHeader step="STEP 08" title="진로 지도" desc="강점에서 실제 활동까지 이어진 길. 점선은 아직 탐색 중이라는 뜻이에요. 노드를 누르면 이유와 기록을 볼 수 있어요.">
        <Link href="/story"><Button variant="outline">이 지도로 이야기 쓰기</Button></Link>
      </PageHeader>
      {nodes.length === 0 ? <Empty title="지도가 아직 비어 있어요" desc="강점이나 관심사를 하나만 적어도 지도가 시작돼요." action={<Link href="/understand"><Button>강점 적기</Button></Link>} /> : (
        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <div className="lab-grid overflow-x-auto rounded-2xl border bg-card/60 p-4">
            <ol className="flex flex-col gap-6 lg:grid lg:min-w-[860px] lg:grid-cols-6 lg:gap-3">
              {COLS.map((c, ci) => (
                <li key={c} className="relative">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground font-mono text-[10px] text-background">{ci + 1}</span>{c}</p>
                  <div className="space-y-2">
                    {nodes.filter(n => n.col === ci).map(n => (
                      <button key={n.id} onClick={() => setSel(sel === n.id ? '' : n.id)} aria-pressed={sel === n.id}
                        className={cn('w-full rounded-xl border-2 bg-card px-3 py-2 text-left text-sm transition', n.tentative ? 'border-dashed' : 'border-solid', ci < 2 ? 'border-primary/40' : ci < 4 ? 'border-foreground/25' : 'border-[hsl(var(--coral)/0.5)]',
                          sel && !related.has(n.id) && 'opacity-35', sel === n.id && 'ring-2 ring-primary', sel && related.has(n.id) && sel !== n.id && 'bg-secondary')} data-testid={`node-${n.id}`}>
                        {n.label}{n.tentative && <span className="ml-1 text-[10px] text-muted-foreground">탐색 중</span>}
                      </button>
                    ))}
                    {nodes.filter(n => n.col === ci).length === 0 && <p className="rounded-xl border border-dashed px-3 py-2 text-xs text-muted-foreground">비어 있음</p>}
                  </div>
                  {ci < 5 && <span className="mx-auto mt-3 block h-4 w-px bg-border lg:hidden" />}
                </li>
              ))}
            </ol>
          </div>
          <Panel title={selected ? selected.label : '노드를 선택하세요'} className="lg:sticky lg:top-6 lg:self-start">
            {selected ? (
              <div className="space-y-4 text-sm" data-testid="panel-node">
                <div><p className="text-xs font-semibold text-muted-foreground">이유</p><p>{selected.reason}</p></div>
                <div><p className="text-xs font-semibold text-muted-foreground">관련 기록</p>{selected.records.length ? <ul className="mt-1 space-y-1">{selected.records.map((r, i) => <li key={i} className="rounded bg-muted/50 px-2 py-1">{r}</li>)}</ul> : <p className="text-muted-foreground">아직 연결된 기록이 없어요.</p>}</div>
                <div className="flex flex-wrap gap-1">{[...related].filter(x => x !== selected.id).map(x => <Tag key={x} tone="teal">{nodes.find(n => n.id === x)?.label}</Tag>)}</div>
                <Link href={selected.edit}><Button size="sm" className="w-full" data-testid="button-node-edit">이 항목 수정하러 가기</Button></Link>
              </div>
            ) : <p className="text-sm text-muted-foreground">선택하면 연결된 노드가 강조되고, 그 이유와 기록이 여기에 보여요.</p>}
          </Panel>
        </div>
      )}
    </div>
  );
}

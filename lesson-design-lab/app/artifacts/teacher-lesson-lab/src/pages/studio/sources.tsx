import { Plus, Save, Ban, RotateCcw } from 'lucide-react';
import { T } from '@/i18n/tx';
import { uid, now } from '@/lib/store';
import { saveCompany } from '@/lib/studio';
import type { CompanyModel, SourceKind } from '@/lib/studio/types';
import { Btn, Pill, inputCls } from '@/components/shell';
import { cn } from '@/lib/utils';
import { StudioFrame, Section, Txt, Check, act, useDraft, useStudio, Empty } from './common';

export const KIND_LABEL: Record<SourceKind, string> = { official: '공식 자료(근거 필요)', 'approved-model': '사용 승인 모델', 'teacher-example': '교사 작성 예시', 'student-research': '학생 조사', fictional: '가상 예시' };
const blank = (): CompanyModel => ({ id: '', company: '', job: '', duties: '', behaviors: [], knowledge: '', skills: '', attitudes: '', verification: '', sourceKind: 'teacher-example', source: '', checkedAt: '', version: '1', educationAllowed: false, officialEvidence: '', approvalReceipt: '', revoked: false, changedAt: '' });

export function sourceWarnings(m: CompanyModel): string[] {
  const w: string[] = [];
  if (m.sourceKind === 'official' && !m.officialEvidence.trim()) w.push('공식 근거 미입력 — 공식으로 표시하지 않습니다');
  if (m.sourceKind === 'approved-model' && !m.approvalReceipt.trim()) w.push('승인 증빙 미입력');
  if (!m.educationAllowed) w.push('교육 사용 허락 미확인');
  if (m.revoked) w.push('철회됨 — 새 미션에 사용 불가');
  return w;
}

export default function Sources() {
  const { studio, actor } = useStudio();
  const [d, setD, clear] = useDraft<CompanyModel>('company-form', blank);
  const set = (p: Partial<CompanyModel>) => setD((x) => ({ ...x, ...p }));
  const save = (m: CompanyModel) => act((s) => saveCompany(s, { ...m, id: m.id || uid('co'), changedAt: now() }), '출처를 저장했습니다');
  const teacher = actor.role === 'teacher';
  return (
    <StudioFrame kicker="STUDIO 1.5 · SOURCES" title={T('기업·직무 모델과 출처')}>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Section title={T('모델 목록')} hint={T('출처 분류는 교사가 입력한 근거만 반영합니다. 공식 인증을 대신하지 않습니다.')}>
          {studio.companies.length === 0 ? <Empty title={T('등록된 모델이 없습니다')} /> : (
            <ul className="space-y-2">{studio.companies.map((m) => {
              const w = sourceWarnings(m);
              return (
                <li key={m.id} className={cn('rounded-lg border p-3', m.revoked && 'opacity-60')} data-testid={`row-company-${m.id}`}>
                  <div className="flex flex-wrap items-center gap-2"><b>{m.company}</b><span className="text-sm">· {m.job}</span><Pill tone={m.sourceKind === 'official' && !w.length ? 'blue' : 'gray'}>{T(KIND_LABEL[m.sourceKind])}</Pill><span className="font-mono text-xs text-muted-foreground">v{m.version}</span></div>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{m.duties}</p>
                  <div className="mt-1 text-xs">{T('출처')}: {m.source || '—'} · <span className="font-mono">{m.checkedAt || '—'}</span></div>
                  {w.length > 0 && <div className="mt-1.5 flex flex-wrap gap-1">{w.map((x) => <Pill key={x} tone="orange">{T(x)}</Pill>)}</div>}
                  {teacher && <div className="mt-2 flex gap-2"><Btn variant="outline" className="py-1 text-xs" onClick={() => setD(m)} data-testid={`button-edit-company-${m.id}`}>{T('수정')}</Btn><Btn variant={m.revoked ? 'outline' : 'danger'} className="py-1 text-xs" onClick={() => save({ ...m, revoked: !m.revoked })} data-testid={`button-revoke-company-${m.id}`}>{m.revoked ? <><RotateCcw className="h-3.5 w-3.5" />{T('복원')}</> : <><Ban className="h-3.5 w-3.5" />{T('철회')}</>}</Btn></div>}
                </li>
              );
            })}</ul>
          )}
        </Section>
        <Section title={d.id ? T('모델 수정') : T('새 모델')} right={d.id ? <Btn variant="ghost" onClick={clear} data-testid="button-new-company"><Plus className="h-4 w-4" />{T('새로')}</Btn> : undefined}>
          {!teacher ? <p className="text-sm text-muted-foreground">{T('교사 역할에서만 편집합니다.')}</p> : (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2"><Txt label={T('기업·기관')} value={d.company} onChange={(v) => set({ company: v })} testid="input-company" /><Txt label={T('직무')} value={d.job} onChange={(v) => set({ job: v })} testid="input-company-job" /></div>
              <Txt rows={2} label={T('주요 업무')} value={d.duties} onChange={(v) => set({ duties: v })} testid="input-duties" />
              <Txt rows={2} label={T('관찰 가능한 행동 (한 줄에 하나)')} value={d.behaviors.join('\n')} onChange={(v) => set({ behaviors: v.split('\n') })} testid="input-behaviors" />
              <div className="grid grid-cols-3 gap-2"><Txt label={T('지식')} value={d.knowledge} onChange={(v) => set({ knowledge: v })} testid="input-knowledge" /><Txt label={T('기술')} value={d.skills} onChange={(v) => set({ skills: v })} testid="input-skills" /><Txt label={T('태도')} value={d.attitudes} onChange={(v) => set({ attitudes: v })} testid="input-attitudes" /></div>
              <Txt label={T('확인 방법')} value={d.verification} onChange={(v) => set({ verification: v })} testid="input-verification" />
              <label className="block text-sm"><span className="mb-1 block text-[13px] font-semibold text-muted-foreground">{T('출처 분류')}</span><select data-testid="select-source-kind" value={d.sourceKind} onChange={(e) => set({ sourceKind: e.target.value as SourceKind })} className={inputCls}>{(Object.keys(KIND_LABEL) as SourceKind[]).map((k) => <option key={k} value={k}>{T(KIND_LABEL[k])}</option>)}</select></label>
              <div className="grid grid-cols-3 gap-2"><Txt label={T('출처')} value={d.source} onChange={(v) => set({ source: v })} testid="input-source" /><Txt label={T('확인일')} value={d.checkedAt} onChange={(v) => set({ checkedAt: v })} testid="input-checked" /><Txt label={T('버전')} value={d.version} onChange={(v) => set({ version: v })} testid="input-company-version" /></div>
              {d.sourceKind === 'official' && <Txt rows={2} label={T('공식 근거 (문서명·발행처·쪽)')} value={d.officialEvidence} onChange={(v) => set({ officialEvidence: v })} testid="input-official-evidence" />}
              <Txt label={T('공유·교육 사용 승인 증빙')} value={d.approvalReceipt} onChange={(v) => set({ approvalReceipt: v })} testid="input-approval" />
              <Check label={T('교육 목적 사용 허락을 확인함')} checked={d.educationAllowed} onChange={(v) => set({ educationAllowed: v })} testid="check-education" />
              {sourceWarnings(d).length > 0 && <div className="flex flex-wrap gap-1">{sourceWarnings(d).map((x) => <Pill key={x} tone="orange">{T(x)}</Pill>)}</div>}
              <Btn onClick={() => { if (save(d)) clear(); }} data-testid="button-save-company"><Save className="h-4 w-4" />{T('저장')}</Btn>
            </div>
          )}
        </Section>
      </div>
    </StudioFrame>
  );
}

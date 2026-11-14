import { T } from '@/i18n/tx';
import { Link } from 'wouter';
import { Copy, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useApp, setState, uid, now } from '@/lib/store';
import { MODE_LABELS } from '@/lib/teaching';
import { LESSONS, MODELS, lessonById } from '@/data/lessons';
import { STAGES, STAGE_LABEL, type Stage } from '@/data/worksheets';
import { lessonText } from '@/i18n/content';
import { PageHead, Panel, Pill, Btn, PendingBadge } from '@/components/shell';
import { cn } from '@/lib/utils';

export default function Lessons() {
  const { stage, lessons, lang } = useApp((s) => s);
  const [nStage, setNStage] = useState<Stage>(stage);
  const [nModel, setNModel] = useState(0);
  const target = LESSONS.find((l) => l.stage === nStage && l.model === nModel) ?? LESSONS.find((l) => l.stage === nStage);
  return (
    <div>
      <PageHead kicker="Lesson library" title={T("수업 라이브러리")} />
      <Panel className="mb-5 border-2 border-primary/40" >
        <div id="new" className="font-bold">{T("새 수업 만들기")}</div>
        <p className="text-xs text-muted-foreground">{T("학교급과 모델을 고르면 원본 수업을 바탕으로 빈 운영 정보(기관·코호트·형태)로 시작합니다. 예시는 불러오지 않습니다.")}</p>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="text-sm"><span className="mb-1 block font-semibold text-muted-foreground">{T("학교급")}</span><select className="rounded-lg border bg-background px-3 py-2 text-sm" value={nStage} onChange={(e) => setNStage(e.target.value as Stage)} data-testid="select-new-stage">{STAGES.map((s) => <option key={s} value={s}>{T(STAGE_LABEL[s])}</option>)}</select></label>
          <label className="text-sm"><span className="mb-1 block font-semibold text-muted-foreground">{T("수업 모델")}</span><select className="rounded-lg border bg-background px-3 py-2 text-sm" value={nModel} onChange={(e) => setNModel(Number(e.target.value))} data-testid="select-new-model">{MODELS.map((m, i) => <option key={m} value={i}>{T(m)}</option>)}</select></label>
          {target && <Link href={`/lessons/${target.id}`} data-testid="link-start-new-lesson" className="rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground">{T("이 조건으로 시작")}</Link>}
        </div>
      </Panel>
      <div className="no-print mb-4 flex flex-wrap gap-2">
        {STAGES.map((s) => <button key={s} data-testid={`filter-stage-${s}`} onClick={() => setState((st) => ({ ...st, stage: s }))} className={cn('rounded-full border px-4 py-1.5 text-sm font-semibold', stage === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card')}>{T(STAGE_LABEL[s])}</button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {LESSONS.filter((l) => l.stage === stage).map((l, i) => {
          const tx = lessonText(lang, l.id);
          return (
            <Link key={l.id} href={`/lessons/${l.id}`} data-testid={`card-lesson-${l.id}`} className="rise group rounded-xl border bg-card p-5 transition hover:border-primary hover:-translate-y-0.5" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-2"><span className="font-mono text-xs text-muted-foreground">{l.id}</span><Pill>{MODELS[l.model]}</Pill>{!tx.translated && <PendingBadge lang={lang} />}</div>
              <h3 className="mt-2 font-bold text-lg leading-snug">{tx.text.title ?? l.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{tx.text.goal ?? l.goal}</p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">{l.worksheets.map((w) => <span key={w} className="rounded border px-1.5 py-0.5 font-mono">{w}</span>)}<span className="ms-auto font-mono text-muted-foreground">{l.blocks.reduce((s, b) => s + b.minutes, 0)}{T("분 기준")}</span></div>
            </Link>
          );
        })}
      </div>

      <h2 className="mt-10 mb-3 text-xl font-bold">{T("저장한 수업")}{' '}<span className="text-sm font-normal text-muted-foreground">{T("브라우저 저장")}</span></h2>
      {lessons.length === 0 ? (
        <Panel className="text-center py-10"><p className="font-semibold">{T("아직 저장한 수업이 없습니다")}</p><p className="text-sm text-muted-foreground mt-1">{T("수업을 열어 시간과 목표를 맞춘 뒤 저장하면 여기에 쌓입니다.")}</p></Panel>
      ) : (
        <div className="space-y-2">
          {lessons.map((sl) => {
            const base = lessonById(sl.baseId);
            return (
              <Panel key={sl.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><div className="font-semibold">{sl.name}</div><div className="text-xs text-muted-foreground">{base && STAGE_LABEL[base.stage]} · {sl.minutes}{T("분 ·")}{' '}{sl.classSize}{T("명")} · {T(MODE_LABELS[sl.mode ?? 'individual'])}{sl.groupSize > 0 && (sl.mode === 'group' || sl.mode === 'mixed') ? ` · ${T('{0}인 모둠', sl.groupSize)}` : ''}{sl.cohort ? ` · ${sl.cohort}` : ''}{T(" · 활동 교체")}{' '}{sl.changes.length}{T("회 ·")}{' '}{new Date(sl.savedAt).toLocaleString()}</div></div>
                <Link href={`/lessons/${sl.baseId}?saved=${sl.id}`} data-testid={`link-open-saved-${sl.id}`} className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold"><Pencil className="h-3.5 w-3.5" />{T("열기")}</Link>
                <Btn variant="outline" data-testid={`button-dup-${sl.id}`} onClick={() => setState((s) => ({ ...s, lessons: [...s.lessons, { ...sl, id: uid('ls'), name: sl.name + ' (사본)', savedAt: now() }] }))}><Copy className="h-3.5 w-3.5" />{T("복제")}</Btn>
                <Btn variant="danger" data-testid={`button-del-${sl.id}`} onClick={() => confirm(T("이 저장 수업을 삭제할까요?")) && setState((s) => ({ ...s, lessons: s.lessons.filter((x) => x.id !== sl.id) }))}><Trash2 className="h-3.5 w-3.5" /></Btn>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}

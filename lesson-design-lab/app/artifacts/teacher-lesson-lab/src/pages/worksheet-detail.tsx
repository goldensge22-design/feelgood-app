import { T } from '@/i18n/tx';
import { useState } from 'react';
import { Link, useParams } from 'wouter';
import { ArrowLeft, Printer } from 'lucide-react';
import { wsById, FAMILIES, STAGE_LABEL } from '@/data/worksheets';
import { useApp } from '@/lib/store';
import { locWorksheet } from '@/i18n/content';
import { Btn, Pill, PendingBadge } from '@/components/shell';
import NotFound from './not-found';

export default function WorksheetDetail() {
  const { id } = useParams<{ id: string }>();
  const w = wsById(id);
  const lang = useApp((s) => s.lang);
  const [support, setSupport] = useState<string[]>([]);
  if (!w) return <NotFound />;
  const tr = locWorksheet(lang, w);
  const W = tr.w;
  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link href="/worksheets" className="inline-flex items-center gap-1 text-sm font-semibold text-primary" data-testid="link-back"><ArrowLeft className="h-4 w-4" />{T("활동지")}</Link>
        <div className="ms-auto flex gap-2">{!tr.translated ? <PendingBadge lang={lang} /> : !tr.reviewed && <Pill tone="orange">{T("작성 번역 · 사람 검토 대기")}</Pill>}<Btn variant="orange" onClick={() => window.print()} data-testid="button-print"><Printer className="h-4 w-4" />{T("인쇄·PDF")}</Btn></div>
      </div>
      <article className="ws-print card-sheet mx-auto max-w-[210mm] rounded-xl border bg-card p-6 md:p-10 rise">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-foreground pb-3">
          <div><div className="font-mono text-xs">{w.id} · {T(STAGE_LABEL[w.stage])} · {T(FAMILIES[w.family - 1])}</div><h1 className="mt-1 text-2xl font-bold">{W.title}</h1></div>
          <div className="text-sm space-y-1 text-end"><div>{T("이름/코드 ____________")}</div><div>{T("날짜 ____________ ·")}{' '}{w.minutes}{T("분")}</div></div>
        </header>
        <section className="mt-4"><h2 className="font-bold">{T("학습 목표")}</h2><p className="mt-1">{W.goal}</p></section>
        <section className="mt-4 rounded-lg border-s-4 border-[hsl(var(--sidebar-primary))] bg-muted p-4"><h2 className="font-bold">{T("읽기 자료:")}{' '}{W.readingTitle}</h2><p className="mt-2 leading-7">{W.reading}</p></section>
        <section className="mt-4"><h2 className="font-bold">{T("해 볼 일")}</h2>
          <ol className="mt-2 space-y-3">{W.actions.map((a, i) => <li key={i}><div className="flex gap-2"><span className="font-mono font-bold">{i + 1}.</span><span>{a}</span></div><div className="ruled mt-1 ms-5" /></li>)}</ol>
        </section>
        <section className="mt-4"><h2 className="font-bold">{T("도움 선택")}{' '}<span className="text-xs font-normal">{T("(원하는 것에 표시)")}</span></h2>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-sm">{W.supports.map((s) => <li key={s}><label className="flex gap-2"><input type="checkbox" checked={support.includes(s)} onChange={(e) => setSupport((x) => (e.target.checked ? [...x, s] : x.filter((y) => y !== s)))} data-testid="check-support" />{s}</label></li>)}</ul>
        </section>
        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3"><h2 className="font-bold text-sm">{T("산출물")}</h2><p className="text-sm mt-1">{W.deliverable}</p></div>
          <div className="rounded-lg border p-3"><h2 className="font-bold text-sm">{T("완료 기준")}</h2><p className="text-sm mt-1">{W.criterion}</p></div>
        </section>
        <footer className="mt-4 text-[11px] text-muted-foreground">{T("FeelGood 수업설계LAB · 규칙 1.2(1.1·1.0 승계) · 읽기 자료는 교육용 가상 자료이며 실제 기관·기업 정보가 아닙니다.")}</footer>
      </article>
    </div>
  );
}

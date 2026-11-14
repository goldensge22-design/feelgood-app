import { T } from '@/i18n/tx';
import { useState } from 'react';
import { Link } from 'wouter';
import { Search } from 'lucide-react';
import { WORKSHEETS, FAMILIES, STAGES, STAGE_LABEL } from '@/data/worksheets';
import { useApp, setState } from '@/lib/store';
import { wsText } from '@/i18n/content';
import { PageHead, PendingBadge, inputCls } from '@/components/shell';
import { cn } from '@/lib/utils';

export default function Worksheets() {
  const { stage, lang } = useApp((s) => s);
  const [q, setQ] = useState('');
  const list = WORKSHEETS.filter((w) => w.stage === stage && (!q || (w.title + w.goal + FAMILIES[w.family - 1]).includes(q)));
  return (
    <div>
      <PageHead kicker="36 worksheets · 12 families x 3 stages" title={T("활동지 라이브러리")} />
      <div className="no-print mb-5 flex flex-wrap items-center gap-2">
        {STAGES.map((s) => <button key={s} data-testid={`filter-ws-${s}`} onClick={() => setState((st) => ({ ...st, stage: s }))} className={cn('rounded-full border px-4 py-1.5 text-sm font-semibold', stage === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-card')}>{T(STAGE_LABEL[s])} 12</button>)}
        <div className="relative ms-auto w-full sm:w-64"><Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><input className={inputCls + ' ps-8'} placeholder={T("검색")} value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search" /></div>
      </div>
      {list.length === 0 && <p className="py-10 text-center text-muted-foreground">{T("검색 결과가 없습니다.")}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((w, i) => {
          const tr = wsText(lang, w.id);
          return (
            <Link key={w.id} href={`/worksheets/${w.id}`} data-testid={`card-ws-${w.id}`} className="rise group relative rounded-xl border bg-card p-4 pt-5 transition hover:-translate-y-0.5 hover:border-primary" style={{ animationDelay: `${i * 35}ms` }}>
              <span className="absolute -top-2.5 start-4 rounded-md bg-sidebar px-2 py-0.5 font-mono text-xs text-white">{w.id}</span>
              <div className="text-xs font-semibold text-[hsl(var(--sidebar-primary))]">{String(w.family).padStart(2, '0')} · {T(FAMILIES[w.family - 1])}</div>
              <h3 className="mt-1 font-bold leading-snug">{tr.text.title ?? w.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{tr.text.goal ?? w.goal}</p>
              <div className="mt-3 flex items-center justify-between text-xs"><span className="font-mono text-muted-foreground">{w.minutes}{T("분 · 행동")}{' '}{w.actions.length}</span>{!tr.translated && <PendingBadge lang={lang} />}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

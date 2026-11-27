import { T, tx, txLang } from '@/i18n/tx';
import type { MaterialPage, MaterialPanel } from '@/lib/material-types';
import { cn } from '@/lib/utils';

/** Renders frozen MaterialBundle pages. The SAME markup is used for screen preview and print:
 * each .mat-page is physically one A4 sheet. Never shows internal QA, type, score or teacher-only notes. */
export function MaterialPages({ pages, className }: { pages: MaterialPage[]; className?: string }) {
  return (
    <div className={cn('mat-pages', className)} data-testid="material-pages">
      {pages.map((p) => (
        <section key={p.globalPage} lang={p.language??txLang()} dir={(p.language??txLang())==='ar'?'rtl':'ltr'} className={cn('mat-page', p.layout === 'A5x2' && 'mat-a5x2')} data-testid={`material-page-${p.globalPage}`}>
          {p.panels.map((x, i) => <PanelView key={`${x.documentId}-${x.segment}-${i}`} panel={x} lang={p.language??txLang()} />)}
          <div className="mat-foot">
            <span className="font-mono">{p.code}</span>
            <span data-current-page={p.studentPage} data-total-pages={p.studentPages}>{tx(p.language??txLang(),'학생 {0}쪽 중 {1}쪽', p.studentPages, p.studentPage)}</span>
            <span className="font-mono">#{p.globalPage}</span>
          </div>
        </section>
      ))}
    </div>
  );
}

function PanelView({ panel, lang }: { panel: MaterialPanel; lang:string }) {
  const T=(source:string,...args:unknown[])=>tx(lang,source,...args);
  return (
    <article className={cn('mat-panel', panel.type === 'card' ? 'mat-card' : 'mat-ws')}>
      <div className="mat-head">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="mat-kind">{panel.kindLabel ?? (panel.type === 'card' ? T('플래너 활동 카드') : T('개인 활동지'))}</span>
          <span className="font-mono text-[10px]">{panel.code}</span>
          {panel.name && <span className="text-[11px]">{panel.name}</span>}
          <span className="ms-auto font-mono text-[10px]">v{panel.version} · {panel.documentId}</span>
        </div>
        <h3 className="mat-title">{panel.title}</h3>
        {panel.segments > 1 && <div className="text-[10px] font-semibold">{T('이어짐 {0}/{1}', panel.segment, panel.segments)}</div>}
        {panel.links.length > 0 && <div className="text-[10px]">{T('연결')}: <span className="font-mono">{panel.links.join(', ')}</span></div>}
      </div>
      <div className="mat-body">
        {panel.blocks.map((b, i) => (
          <div key={i} className="mat-block">
            {b.label && <div className="mat-label">{b.label}</div>}
            {b.text && <p className="mat-text">{b.text}</p>}
            {(b.writingLines ?? 0) > 0 && <div className="mat-lines" style={{ height: `${(b.writingLines ?? 0) * 7}mm` }} aria-hidden />}
          </div>
        ))}
      </div>
    </article>
  );
}

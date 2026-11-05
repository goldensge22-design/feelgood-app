import { useState } from 'react';
import { Languages, Eye, Save, X } from 'lucide-react';
import { T, txLang } from '@/i18n/tx';
import { LANGS } from '@/i18n/ui';
import { getState, setState } from '@/lib/store';
import { previewMaterialLanguage, applyMaterialLanguage } from '@/lib/material-language';
import { Btn, Pill, inputCls } from '@/components/shell';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Preview = ReturnType<typeof previewMaterialLanguage>;
const langName = (c: string) => LANGS.find((l) => l.code === c)?.name ?? c;
const show = (v: unknown) => (Array.isArray(v) ? v.join('\n') : v == null ? '' : String(v));

/** Explicit per-document language preview; applying saves a NEW version and never overwrites old versions. */
export function MaterialLanguagePreview({ id, kind, docLang, title }: { id: string; kind: 'worksheet' | 'card'; docLang?: string; title?: string }) {
  const { toast } = useToast();
  const [lang, setLang] = useState(() => (txLang() !== docLang ? txLang() : LANGS.find((l) => l.code !== docLang)?.code ?? 'ko'));
  const [pv, setPv] = useState<Preview | null>(null);
  const [ok, setOk] = useState(false);
  const fail = (e: unknown) => toast({ title: T('처리하지 못했습니다'), description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
  const make = () => { try { setPv(previewMaterialLanguage(getState(), id, kind, lang)); setOk(false); } catch (e) { fail(e); } };
  const apply = () => {
    if (!pv) return;
    try { setState((s) => applyMaterialLanguage(s, pv)); setPv(null); setOk(false); toast({ title: T('새 버전으로 저장했습니다. 이전 버전은 그대로 남아 있습니다.') }); }
    catch (e) { setPv(null); setOk(false); fail(e); }
  };
  return (
    <div className="rounded-lg border border-dashed p-2.5 text-sm" data-testid={`lang-preview-${id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Languages className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold">{title ?? T('문서 언어 바꾸기')}</span>
        {docLang && <Pill tone="gray">{T('현재 {0}', langName(docLang))}</Pill>}
        <select className={cn(inputCls, 'w-auto py-1 text-xs')} value={lang} onChange={(e) => { setLang(e.target.value); setPv(null); setOk(false); }} data-testid={`select-doc-lang-${id}`}>
          {LANGS.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </select>
        <Btn variant="outline" className="py-1 text-xs" onClick={make} data-testid={`button-lang-preview-${id}`}><Eye className="h-3.5 w-3.5" />{T('언어 미리보기')}</Btn>
        {pv && <Btn variant="ghost" className="py-1 text-xs" onClick={() => { setPv(null); setOk(false); }} data-testid={`button-lang-cancel-${id}`}><X className="h-3.5 w-3.5" />{T('취소')}</Btn>}
      </div>
      {pv && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-muted-foreground" data-testid={`text-lang-summary-${id}`}>{T('{0} → {1} · 기준 버전 v{2} · 바뀜 {3} · 보존 {4} · 번역 없음 {5}', langName(pv.sourceLang), langName(pv.targetLang), pv.originalVersion, pv.changedKeys.length, pv.preservedKeys.length, pv.untranslated.length)}</p>
          <dl className="max-h-64 space-y-1 overflow-y-auto rounded-md bg-muted/40 p-2 text-xs">
            {Object.entries(pv.fields as unknown as Record<string, unknown>).map(([k, v]) => {
              const st = pv.preservedKeys.some(x=>x===k||x.startsWith(k+'.')) ? 'kept' : pv.untranslated.some(x=>JSON.stringify(v).includes(x)) ? 'none' : pv.changedKeys.includes(k) ? 'changed' : 'same';
              return (
                <div key={k} className="grid gap-1 sm:grid-cols-[130px_1fr]" data-testid={`row-lang-field-${id}-${k}`}>
                  <dt className="flex items-start gap-1">{T(({title:'제목',goal:'학습 목표',job:'관심 분야·직무',readingTitle:'읽을 자료',reading:'읽을 자료',questions:'질문',actions:'수행 과제',help:'필요한 도움',deliverable:'제출물',criterion:'완료 기준',answer:'답안·산출물 작성',reason:'선택 이유',date:'날짜',minutes:'예상 시간',scope:'범위',firstAction:'첫 행동',steps:'진행 순서',nextAction:'다음 행동'} as Record<string,string>)[k]??k)}{st === 'kept' && <Pill tone="orange">{T('편집값 보존')}</Pill>}{st === 'none' && <Pill tone="gray">{T('번역 없음')}</Pill>}{st === 'changed' && <Pill tone="blue">{T('바뀜')}</Pill>}</dt>
                  <dd className="whitespace-pre-wrap">{show(v)}</dd>
                </div>
              );
            })}
          </dl>
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} data-testid={`check-lang-apply-${id}`} />{T('바뀐 항목과 보존된 편집 항목, 번역 없음 상태를 확인했습니다. 새 버전으로 저장합니다.')}</label>
          <Btn className="py-1 text-xs" disabled={!ok||pv.untranslated.length>0} onClick={apply} data-testid={`button-lang-apply-${id}`}><Save className="h-3.5 w-3.5" />{T('새 버전으로 저장')}</Btn>
        </div>
      )}
    </div>
  );
}

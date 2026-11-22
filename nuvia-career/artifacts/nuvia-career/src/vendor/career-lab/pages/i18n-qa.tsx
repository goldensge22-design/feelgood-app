import { useEffect, useState } from 'react';
import { APPROVED_LANGUAGES, type AppLanguage } from '@/vendor/career-lab/lib/languages';
import { hasLanguagePack, fetchLanguage, missingMessages } from '@/vendor/career-lab/lib/i18n-runtime';
import { useLocale, type LayoutDirection } from '@/vendor/career-lab/lib/locale';
import { PageHeader, Panel, Select, LField, Tag } from '@/vendor/career-lab/components/lab/ui';
import catalogueManifest from '@/vendor/career-lab/lib/data/catalogue-language-manifest.json';

type Row = { count: number; method: string; checked: number; pending: number; catalogue: number } | 'none' | 'error' | 'loading';

export default function I18nQa() {
  const { layoutDirection, setLayoutDirection } = useLocale();
  const [rows, setRows] = useState<Record<string, Row>>({});
  const [missing, setMissing] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    setMissing(missingMessages());
    APPROVED_LANGUAGES.forEach(l => {
      if (!hasLanguagePack(l.code)) { setRows(r => ({ ...r, [l.code]: 'none' })); return; }
      setRows(r => ({ ...r, [l.code]: 'loading' }));
      fetchLanguage(l.code as AppLanguage)
        .then(p => { if (alive) setRows(r => ({ ...r, [l.code]: { count: Object.keys(p?.messages || {}).length, method: p?.review?.method || '-', checked: p?.review?.checked ?? 0, pending: p?.review?.pending ?? 0, catalogue:Object.keys(p?.catalogue?.messages||{}).length } })); })
        .catch(() => { if (alive) setRows(r => ({ ...r, [l.code]: 'error' })); });
    });
    return () => { alive = false; };
  }, []);

  return (
    <div className="max-w-4xl" data-testid="page-i18n-qa">
      <PageHeader title="i18n QA" desc="읽기 전용 내부 점검 화면. 학생 기록과 계정 정보는 표시하지 않아요." />
      <div className="space-y-6">
        <Panel title="Public catalogue translation coverage">
          <p className="text-sm">Public-data strings per language: {catalogueManifest.sourceCount}. Technical coverage is not native-language approval.</p>
          <ul className="mt-2 space-y-1 font-mono text-xs">{APPROVED_LANGUAGES.map(l=>{
            const row=rows[l.code];
            return <li key={l.code}>{l.code}: {typeof row==='object'?row.catalogue:'…'} / {catalogueManifest.sourceCount}</li>;
          })}</ul>
        </Panel>
        <Panel title="승인 언어 15개" hint="언어 팩 메타데이터에서 계산한 값이에요.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-language-packs">
              <thead><tr className="text-left text-xs text-muted-foreground"><th className="p-2">#</th><th className="p-2">code</th><th className="p-2">name</th><th className="p-2">dir</th><th className="p-2">messages</th><th className="p-2">review method</th><th className="p-2">checked / pending</th></tr></thead>
              <tbody>
                {APPROVED_LANGUAGES.map((l, i) => {
                  const r = rows[l.code];
                  return (
                    <tr key={l.code} className="border-t" data-testid={`row-pack-${l.code}`}>
                      <td className="p-2 font-mono text-xs">{i + 1}</td>
                      <td className="p-2 font-mono">{l.code}</td>
                      <td className="p-2"><bdi lang={l.code} data-i18n-original={l.name}>{l.name}</bdi></td>
                      <td className="p-2 font-mono text-xs">{l.direction}</td>
                      {l.code === 'ko' ? <td className="p-2" colSpan={3}><Tag tone="teal">source</Tag></td>
                        : r === 'none' ? <td className="p-2" colSpan={3}><Tag tone="outline">no pack</Tag></td>
                        : r === 'error' ? <td className="p-2" colSpan={3}><Tag tone="coral">load failed</Tag></td>
                        : !r || r === 'loading' ? <td className="p-2 text-muted-foreground" colSpan={3}>…</td>
                        : <><td className="p-2 font-mono">{r.count}</td><td className="p-2 font-mono text-xs">{r.method}</td><td className="p-2 font-mono text-xs">{r.checked} / {r.pending}</td></>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="누락된 런타임 문구" hint="현재 화면 언어에서 번역을 찾지 못한 원문이에요.">
          {missing.length ? <ul className="max-h-80 space-y-1 overflow-y-auto font-mono text-xs" data-testid="list-missing-messages">{missing.map(m => <li key={m} className="rounded bg-muted/50 px-2 py-1">{m}</li>)}</ul>
            : <p className="text-sm text-muted-foreground" data-testid="list-missing-messages">없음</p>}
        </Panel>
        <Panel title="레이아웃 방향 점검">
          <LField label="방향 덮어쓰기 (번역 아님)">
            <Select value={layoutDirection} onChange={e => setLayoutDirection(e.target.value as LayoutDirection)} options={[{ value: 'auto', label: 'auto' }, { value: 'ltr', label: 'LTR' }, { value: 'rtl', label: 'RTL' }]} data-testid="select-layout-direction" />
          </LField>
        </Panel>
      </div>
    </div>
  );
}

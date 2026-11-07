import { useEffect, useState } from 'react';
type Row = { language: string; width: number; role: string; status: string; pass: number; fail: number; recommendation: string };
type Summary = { executedAt: string; baseline: string; unchanged: boolean; rows: Row[]; evidence: string; limitations: string[] };
/** Technical execution metadata, mounted only inside the explicit review space. */
export function ReviewQa() {
  const [data, setData] = useState<Summary | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetch(`${import.meta.env.BASE_URL}review-qa-summary.json`, { cache: 'no-store', signal: ac.signal })
      .then(r => { if (!r.ok) throw new Error('No executed summary'); return r.json(); })
      .then(setData).catch(() => {});
    return () => ac.abort();
  }, []);
  return (
    <section className="no-print space-y-3 rounded-2xl border border-border bg-card p-5" data-testid="full-qa-evidence">
      <h2 className="font-display text-xl font-bold">15-language browser QA · execution evidence</h2>
      {!data ? <p>NOT RUN / no final execution summary loaded. Target: 15 languages × 3 viewports × family/teacher roles.</p> : <>
        <p className="break-all font-mono text-xs">{data.executedAt} · SHA-256 {data.baseline} · source unchanged during execution: {String(data.unchanged)}</p>
        <p className="break-words text-sm">{data.evidence}</p>
        <div className="max-h-[32rem] overflow-auto" tabIndex={0} aria-label="QA execution matrix">
          <table className="w-full text-start text-xs">
            <thead><tr>{['Language','Width','Role','Status','Pass / Fail'].map(h => <th key={h} className="p-2 text-start">{h}</th>)}</tr></thead>
            <tbody>{data.rows.map(r => <tr key={`${r.language}-${r.width}-${r.role}`} className="border-t border-border"><td className="p-2">{r.language}</td><td className="p-2">{r.width}</td><td className="p-2">{r.role}</td><td className="p-2">{r.status}</td><td className="p-2">{r.pass} / {r.fail}</td></tr>)}</tbody>
          </table>
        </div>
        <ul className="list-disc space-y-1 ps-5 text-sm">{data.limitations.map(s => <li key={s}>{s}</li>)}</ul>
      </>}
    </section>
  );
}

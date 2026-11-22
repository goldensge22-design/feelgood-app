import { formatMessage, tx } from './i18n-runtime';
import { storyReflection } from './practice';
import { FIELDS, majorById, type Field } from './catalog';
import { productKeywordIn } from './i18n-runtime';
import type { LabState } from './types';
import { programById } from './universities';
import { qualitativeText } from './recommendation-policy';

export function strengthsOf(s: LabState) { return s.tests.flatMap(t => t.strengths.map(x => ({ ...x, testName: t.name }))); }

/** 키워드가 겹치는 강점·관심사를 이유로 보여줄 뿐, 점수나 적합도는 계산하지 않는다. */
export function reasonsFor(field: Field, s: LabState) {
  const words = [...strengthsOf(s).filter(x=>x.fit==='similar'||x.fit==='partial').map(x => ({ src: '강점', text: qualitativeText(x.text) })), ...s.interests.map(i => ({ src: '관심사', text: qualitativeText(i.text) + ' ' + qualitativeText(i.reason) }))];
  const out: { src: string; label: string; kw: string }[] = [];
  for (const w of words) { const kw = field.keywords.find(k => productKeywordIn(w.text, k)); if (kw) out.push({ src: w.src, label: w.text, kw }); }
  return out;
}
export function fieldsWithReasons(s: LabState) { return FIELDS.map(f => ({ field: f, reasons: reasonsFor(f, s) })); }
export function hasPersonalData(s: LabState) { return s.tests.length + s.interests.length + s.activities.length + s.reflections.length > 0; }
export function latestRecordAt(s: LabState) {
  return [...s.reflections.map(r => r.updatedAt), ...s.activities.map(a => a.updatedAt), ...s.tests.map(t => t.updatedAt), s.design.updatedAt, s.sourceUpdatedAt].filter(Boolean).sort().pop() || '';
}

/** 이야기 문단 근거로 쓸 수 있는 사용자 입력 목록 */
export function evidenceOptions(s: LabState) {
  const o: { id: string; label: string; group: string }[] = [];
  (s.savedPrograms || []).forEach(id => {
    const p = programById(s, id);
    const name=p?(p.recordKind==='official'?`${tx(p.universityOriginal)} · ${tx(p.programOriginal || p.programDisplay)}`:`${p.universityOriginal} · ${p.programOriginal || p.programDisplay}`):'';
    o.push({ id: `program:${id}`, label: p ? formatMessage('{0} (탐색·임시 선택, 입학 아님)',[name]) : '이전 대학 탐색 · 자료 연결 대기', group: '대학·전공 탐색' });
  });
  strengthsOf(s).forEach(x => o.push({ id: `str:${x.id}`, label: `${x.text} (${x.kind === 'test' ? '검사 결과' : '자기 진술'})`, group: '강점' }));
  s.interests.forEach(i => o.push({ id: `int:${i.id}`, label: `${i.text}${i.reason ? ' — ' + i.reason : ''}`, group: '관심사' }));
  s.reflections.filter(r=>storyReflection(r,s)).forEach(r => o.push({ id: `ref:${r.id}`, label: `${r.title} (${r.date})`, group: '경험 기록' }));
  s.activities.filter(a => a.status !== 'done').forEach(a => o.push({ id: `act:${a.id}`, label: `[계획] ${a.title}`, group: '계획' }));
  s.savedMajors.forEach(m => o.push({ id: `maj:${m}`, label: majorById(m)?.name ?? m, group: '학과' }));
  s.design.jobs.forEach(j => o.push({ id: `job:${j.id}`, label: j.title, group: '진로 설계' }));
  if (s.statement) o.push({ id: 'stmt', label: s.statement, group: '탐색 문장' });
  return o;
}

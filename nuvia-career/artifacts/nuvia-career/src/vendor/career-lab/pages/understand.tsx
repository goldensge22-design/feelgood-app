import { useState } from 'react';
import { Plus, Trash2, Upload, FileWarning, Pencil } from 'lucide-react';
import { useLab } from '@/vendor/career-lab/lib/store';
import { fitLabel, now, uid, type Fit, type TestResult } from '@/vendor/career-lab/lib/types';
import { PageHeader, Panel, Empty, Tag, LField, TextIn, TextArea, Select, Confirm, NextLink } from '@/vendor/career-lab/components/lab/ui';
import { AiPanel } from '@/vendor/career-lab/components/lab/ai-panel';
import { Button } from '@/vendor/career-lab/components/ui/button';

const blank = (): TestResult => ({ id: uid(), name: '', date: '', results: '', features: '', inputMethod: 'manual', strengths: [], updatedAt: '' });
const MAX_IMG = 5 * 1024 * 1024;

function Editor({ initial, onSave, onCancel }: { initial: TestResult; onSave: (t: TestResult) => void; onCancel: () => void }) {
  const [t, setT] = useState<TestResult>(initial);
  const [img, setImg] = useState('');
  const [fileMsg, setFileMsg] = useState('');
  const [sText, setSText] = useState('');
  const set = (p: Partial<TestResult>) => setT(x => ({ ...x, ...p }));
  const onFile = (f?: File) => {
    setFileMsg(''); setImg('');
    if (!f) return;
    if (f.type === 'application/pdf') { set({ inputMethod: 'pdf-manual' }); setFileMsg('기존 서버의 결과지 해석 연결을 기다리고 있어요. PDF 해석은 실행되지 않았어요. PDF를 직접 열어 내용을 복사해 붙여 넣어 주세요. 파일은 전송·저장되지 않아요.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setFileMsg('이미지(JPG, PNG, WebP) 또는 PDF만 올릴 수 있어요.'); return; }
    if (f.size > MAX_IMG) { setFileMsg('이미지가 5MB보다 커요. 캡처 범위를 줄이거나 해상도를 낮춰 주세요.'); return; }
    const r = new FileReader();
    r.onload = () => { setImg(String(r.result)); set({ inputMethod: 'image' }); };
    r.onerror = () => setFileMsg('파일을 읽지 못했어요. 직접 입력해 주세요.');
    r.readAsDataURL(f);
  };
  const addStrength = (kind: 'test' | 'self') => { if (!sText.trim()) return; set({ strengths: [...t.strengths, { id: uid(), text: sText.trim(), kind, fit: '', note: '' }] }); setSText(''); };
  return (
    <div className="space-y-5" data-testid="form-test">
      <div className="grid gap-4 md:grid-cols-2">
        <LField label="검사 이름"><TextIn value={t.name} onChange={e => set({ name: e.target.value })} placeholder="예: 학교에서 받은 진로 흥미 검사" data-testid="input-test-name" /></LField>
        <LField label="검사 날짜 (선택)"><TextIn type="date" value={t.date} onChange={e => set({ date: e.target.value })} data-testid="input-test-date" /></LField>
      </div>
      <div className="rounded-xl border border-dashed p-4">
        <p className="text-sm font-semibold">결과지 파일로 돕기 (선택)</p>
        <p className="mt-1 text-xs text-muted-foreground">기존 서버의 파일 해석 연결 대기 중이에요. 이미지는 이 화면에서만 미리 보며 전송·저장하지 않아요. 내용을 직접 입력·확인할 수 있어요.</p>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted"><Upload className="h-4 w-4" />이미지 또는 PDF 선택<input type="file" accept="image/*,application/pdf" className="sr-only" onChange={e => onFile(e.target.files?.[0])} data-testid="input-test-file" /></label>
        {fileMsg && <p className="mt-3 flex gap-2 rounded-lg bg-accent p-3 text-sm text-accent-foreground" role="status"><FileWarning className="h-4 w-4 shrink-0" />{fileMsg}</p>}
        {img && <div className="mt-3 space-y-3"><img src={img} alt="올린 결과지 미리보기" className="max-h-56 rounded-lg border" />
          <AiPanel task="interpret" testId="interpret" label="결과지 내용 정리 요청" desc="AI는 이미지 속 글자를 정리할 뿐, 진단하거나 점수를 매기지 않아요." image={img}
            getContext={() => ({ testName: t.name, instruction: '이미지 속 검사 결과에서 검사명, 주요 결과, 강점, 특징을 있는 그대로 옮겨 정리하세요. 알 수 없는 검사를 채점하거나 해석을 지어내지 마세요.' })}
            applyLabel="결과 칸에 덧붙이기" onApply={x => set({ results: t.results ? `${t.results}\n\n${x}` : x })} /></div>}
      </div>
      <LField label="주요 결과" hint="결과지에 적힌 내용을 그대로 옮겨 주세요."><TextArea rows={5} value={t.results} onChange={e => set({ results: e.target.value })} data-testid="input-test-results" /></LField>
      <LField label="특징 (결과지 설명 또는 내 생각)"><TextArea value={t.features} onChange={e => set({ features: e.target.value })} data-testid="input-test-features" /></LField>
      {(t.results.trim() || t.features.trim()) && <AiPanel task="interpret" testId="interpret-text" label="입력한 내용 이해하기" desc="내가 입력한 결과와 자기 진술을 구분해 해석 도움을 받아요. 제안을 확인한 뒤 필요한 부분만 덧붙이세요."
        getContext={() => ({ testName: t.name, results: t.results, features: t.features, strengths: t.strengths })}
        applyLabel="특징 칸에 제안 추가" onApply={x => set({ features: `${t.features}${t.features ? '\n\n' : ''}[AI 해석 제안 — 내가 확인한 내용]\n${x}` })} />}
      <div>
        <p className="mb-2 text-sm font-semibold">강점</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextIn value={sText} onChange={e => setSText(e.target.value)} placeholder="예: 관찰하고 원인 찾기" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addStrength('test'); } }} data-testid="input-strength" />
          <Button type="button" variant="outline" onClick={() => addStrength('test')} data-testid="button-add-strength-test">검사 결과로 추가</Button>
          <Button type="button" variant="outline" onClick={() => addStrength('self')} data-testid="button-add-strength-self">내 생각으로 추가</Button>
        </div>
        <ul className="mt-3 space-y-2">{t.strengths.map((s, i) => (
          <li key={s.id} className="grid gap-2 rounded-lg bg-muted/50 p-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
            <TextIn value={s.text} onChange={e => set({ strengths: t.strengths.map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} />
            <Tag tone={s.kind === 'test' ? 'teal' : 'coral'}>{s.kind === 'test' ? '검사 결과' : '자기 진술'}</Tag>
            <Select value={s.fit} onChange={e => set({ strengths: t.strengths.map((x, j) => j === i ? { ...x, fit: e.target.value as Fit } : x) })} options={(Object.keys(fitLabel) as Fit[]).map(k => ({ value: k, label: fitLabel[k] }))} className="md:w-40" data-testid={`select-fit-${i}`} />
            <button onClick={() => set({ strengths: t.strengths.filter((_, j) => j !== i) })} aria-label="강점 삭제" className="justify-self-end rounded p-2 text-muted-foreground hover:bg-background hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}</ul>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>취소</Button>
        <Button onClick={() => onSave({ ...t, name: t.name.trim() || (t.strengths.length && t.strengths.every(x => x.kind === 'self') ? '내가 적은 나의 특징' : '이름 없는 검사'), updatedAt: now() })} data-testid="button-save-test">확인하고 저장</Button>
      </div>
    </div>
  );
}

export default function Understand() {
  const { state: s, update } = useLab();
  const [editing, setEditing] = useState<TestResult | null>(null);
  const save = (t: TestResult) => { update(d => { const i = d.tests.findIndex(x => x.id === t.id); if (i >= 0) d.tests[i] = t; else d.tests.push(t); }); setEditing(null); };
  return (
    <div>
      <PageHeader step="STEP 01" title="나 이해하기" desc="검사 결과지에 적힌 내용과 내 생각을 구분해서 적어요. 결과가 나와 비슷한지는 내가 판단해요.">
        {!editing && <Button onClick={() => setEditing(blank())} data-testid="button-new-test"><Plus className="h-4 w-4" />결과 입력</Button>}
      </PageHeader>
      <p className="mb-5 rounded-xl border bg-secondary/40 p-4 text-sm leading-relaxed">학생이 확인한 질적 강점만 탐색에 활용해요. 성적·등급·IQ 수치로 학과나 대학을 판단하지 않아요. 파일 자동 해석은 기존 서버 연결 대기이며, 추천과 AI 요청에는 원본 결과지나 성적 정보를 보내지 않아요.</p>
      {editing && <Panel title={s.tests.some(t => t.id === editing.id) ? '결과 수정' : '새 결과 입력'} tone="teal" className="mb-6"><Editor initial={editing} onSave={save} onCancel={() => setEditing(null)} /></Panel>}
      {s.tests.length === 0 && !editing ? (
        <Empty title="아직 입력한 결과가 없어요" desc="진로·흥미·성격 검사 결과지가 있다면 옮겨 적고, 없다면 ‘내 생각으로’ 강점을 적어도 좋아요." action={<Button onClick={() => setEditing(blank())}>첫 결과 입력</Button>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {s.tests.map(t => (
            <Panel key={t.id} title={t.name} hint={`${t.date || '날짜 없음'} · ${t.inputMethod === 'manual' ? '직접 입력' : t.inputMethod === 'image' ? '이미지 확인 후 입력' : 'PDF 내용 직접 붙여넣기'}`}
              action={<div className="flex gap-1">
                <button onClick={() => setEditing(t)} aria-label="수정" className="rounded p-2 hover:bg-muted" data-testid={`button-edit-test-${t.id}`}><Pencil className="h-4 w-4" /></button>
                <Confirm title="이 결과를 삭제할까요?" desc="삭제하면 이 브라우저에서 되돌릴 수 없어요." onConfirm={() => update(d => { d.tests = d.tests.filter(x => x.id !== t.id); })} trigger={o => <button onClick={o} aria-label="삭제" className="rounded p-2 hover:bg-muted hover:text-destructive" data-testid={`button-delete-test-${t.id}`}><Trash2 className="h-4 w-4" /></button>} />
              </div>}>
              {t.results && <p className="whitespace-pre-wrap text-sm">{t.results}</p>}
              {t.features && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{t.features}</p>}
              <ul className="mt-4 space-y-1.5">{t.strengths.map(x => <li key={x.id} className="flex flex-wrap items-center gap-2 text-sm"><Tag tone={x.kind === 'test' ? 'teal' : 'coral'}>{x.kind === 'test' ? '검사' : '자기 진술'}</Tag>{x.text}<span className="text-xs text-muted-foreground">· {fitLabel[x.fit]}</span></li>)}</ul>
            </Panel>
          ))}
        </div>
      )}
      {s.tests.length > 0 && <div className="mt-8 text-right"><NextLink href="/interests">다음: 관심사 더하기 →</NextLink></div>}
    </div>
  );
}

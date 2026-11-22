import { useState } from 'react';
import { assistanceContext } from '@/vendor/career-lab/lib/assistance-context';
import { Sparkles, Check, X, PlugZap, Info } from 'lucide-react';
import { Button } from '@/vendor/career-lab/components/ui/button';
import { useAssist, type AiTask } from '@/vendor/career-lab/lib/ai';
import { useLab } from '@/vendor/career-lab/lib/store';
import { Confirm } from './ui';

/** AI 기능은 기존 서버 연결 전까지 대기 상태. 실제 생성 결과를 흉내 내지 않는다. 직접 작성 흐름은 그대로 쓸 수 있다. */
export function AiPanel({ task, label, desc, getContext, image, applyLabel = '내 기록에 추가', applyDesc = '기존 내용은 그대로 두고 아래에 덧붙여요.', onApply, testId }: {
  task: AiTask; label: string; desc?: string; getContext: () => Record<string, unknown>; image?: string;
  applyLabel?: string; applyDesc?: string; onApply?: (text: string) => void; testId: string;
}) {
  const { state, mode } = useLab();
  const ai = useAssist(task);
  const [asked, setAsked] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const go = async () => { setAsked(true); setDraft(null); await ai.run(assistanceContext(state,getContext()), state.grade); };
  const shown = draft ?? ai.text;
  return (
    <div className="rounded-xl border border-primary/20 bg-secondary/40 p-4" data-testid={`ai-${testId}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-secondary-foreground"><Sparkles className="h-4 w-4" />{label}</p>
          {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
          <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-dashed border-primary/40 px-2.5 py-0.5 text-[11px] font-semibold text-primary" data-testid={`status-ai-${testId}`}><PlugZap className="h-3 w-3" />기존 서버 AI 연결 대기</p>
        </div>
        <Button size="sm" variant="outline" onClick={go} disabled={ai.pending} data-testid={`button-ai-${testId}`}>{ai.pending ? '확인 중…' : 'AI 연결 상태 보기'}</Button>
      </div>
      {mode === 'demo' && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground" data-testid={`text-ai-demo-note-${testId}`}><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />예시 글은 미리 준비한 편집용 자료이며 AI 생성 결과가 아니에요.</p>
      )}
      {asked && !ai.pending && !ai.text && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-primary/25 bg-card p-3 text-sm" role="status" data-testid={`error-ai-${testId}`}>
          <PlugZap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="flex-1">{ai.error || '기존 서버 AI 연결 대기 중이에요.'} 지금은 어떤 내용도 외부로 보내지 않고, AI 제안도 만들지 않아요. 직접 작성은 그대로 계속할 수 있어요.</span>
          <button className="text-xs font-semibold underline" onClick={() => { setAsked(false); ai.clear(); }} data-testid={`button-ai-dismiss-${testId}`}>닫기</button>
        </div>
      )}
      {ai.text && !ai.pending && (
        <div className="mt-4 rounded-lg border border-dashed border-[hsl(var(--coral)/0.5)] bg-card p-3">
          <p className="mb-2 text-xs font-semibold text-accent-foreground">제안 — 아직 적용되지 않았어요. 읽고 고친 뒤 결정하세요.</p>
          <textarea className="min-h-[140px] w-full resize-y bg-transparent text-[15px] leading-relaxed outline-none" value={shown} onChange={e => setDraft(e.target.value)} data-testid={`text-ai-${testId}`} />
          <div className="mt-2 flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { ai.clear(); setDraft(''); }} data-testid={`button-ai-discard-${testId}`}><X className="h-4 w-4" />버리기</Button>
            {onApply && (
              <Confirm destructive={false} confirmLabel="적용하기" title="이 제안을 적용할까요?" desc={applyDesc}
                onConfirm={() => { onApply(shown); ai.clear(); setDraft(''); }}
                trigger={open => <Button size="sm" onClick={open} data-testid={`button-ai-apply-${testId}`}><Check className="h-4 w-4" />{applyLabel}</Button>} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

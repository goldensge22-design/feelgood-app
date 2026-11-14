import { T } from '@/i18n/tx';
import { useState } from 'react';
import { DOMAINS, DOMAIN_KO, supportPlan, type Level, type Levels } from '@/lib/domain';
import { STAGES, STAGE_LABEL, type Stage } from '@/data/worksheets';
import { PageHead, Panel, Pill, Field, inputCls } from '@/components/shell';

export default function Supports() {
  const [stage, setStage] = useState<Stage>('middle');
  const [verified, setVerified] = useState(false);
  const [levels, setLevels] = useState<Levels>({});
  const plan = supportPlan(stage, { verified, testName: verified ? '교사 확인' : '', version: verified ? '확인' : '', criteria: verified ? '확인' : '', levels, top5: [] });
  return (
    <div>
      <PageHead kicker="Support engine · 243 conditions" title={T("수업 지원 탐색기")} />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Panel className="space-y-3 h-fit">
          <Field label={T("학교급(나이·지원과 독립)")}><select className={inputCls} value={stage} onChange={(e) => setStage(e.target.value as Stage)} data-testid="select-sup-stage">{STAGES.map((s) => <option key={s} value={s}>{T(STAGE_LABEL[s])}</option>)}</select></Field>
          <label className="flex gap-2 text-sm font-semibold"><input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} data-testid="check-sup-verified" />{T("결과지 검사명·버전·기준 확인됨")}</label>
          <div className="grid grid-cols-2 gap-2">
            {DOMAINS.map((d) => <Field key={d} label={T(DOMAIN_KO[d])}><select disabled={!verified} className={inputCls} value={levels[d] ?? ''} onChange={(e) => setLevels({ ...levels, [d]: (e.target.value || undefined) as Level | undefined })} data-testid={`select-sup-${d}`}><option value="">{T("미입력")}</option><option>H</option><option>M</option><option>L</option></select></Field>)}
          </div>
          <p className="text-xs text-muted-foreground">{T("수준 코드는 교사 화면에만 표시하며 학생 카드에 인쇄되지 않습니다. 이 화면은 로그인이 없는 데모이므로 접근 통제를 보장하지 않습니다.")}</p>
        </Panel>
        <Panel>
          <div className="flex flex-wrap items-center gap-2">{plan.verified ? <Pill>{T("확인된 결과 기반")}</Pill> : <Pill tone="gray">{T("일반 선택형 지원")}</Pill>}{plan.lows.length > 1 && <Pill tone="orange">{T("지원 필요 영역")}{' '}{plan.lows.length}{T("개 모두 반영(우선순위 없음)")}</Pill>}</div>
          <p className="mt-2 text-sm text-muted-foreground">{T(plan.note)}</p>
          <ul className="mt-4 space-y-2">{plan.supports.map((s, i) => <li key={s} className="rise flex gap-3 rounded-lg border p-3" style={{ animationDelay: `${i * 40}ms` }}><span className="font-mono text-[hsl(var(--sidebar-primary))] font-bold">{String(i + 1).padStart(2, '0')}</span><span className="text-sm">{T(s)}</span></li>)}</ul>
          <div className="mt-5 rounded-lg bg-muted p-3 text-sm space-y-1">
            <b>{T("원칙")}</b>
            <p>{T("여러 지원을 함께 제공하되, 의식적 연습 목표는 1~2개만 고릅니다.")}</p>
            <p>{T("지원 유형으로 진로를 제한하지 않고, 이전 경험·수행 근거를 함께 봅니다.")}</p>
            <p>{T("\"약점\" 같은 꼬리표와 유형 코드·점수는 학생 자료에 쓰지 않습니다.")}</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

import { useLocale } from '@/vendor/career-lab/lib/locale';
import { TASK_KINDS, type SimulationTask } from '@/vendor/career-lab/lib/activity-assistance';
export function SimulationDetails({task}:{task:SimulationTask}){
  const {t}=useLocale();
  const text=(key:'title'|'role'|'problem'|'scope'|'artifact'|'scenario')=>{
    const source=task.productSources?.[key];return typeof source==='string'?t(source):task[key];
  };
  const steps=task.productSources?.steps;
  return <div className="space-y-2 rounded-lg border p-3" data-testid="simulation-card">
    <b>{t('가상 직무 상황 연습')} · {t(TASK_KINDS[task.kind].name)}</b>
    <h4 className="font-semibold">{text('title')}</h4>
    <p>{t('가상 상황')} · <bdi>{text('scenario')}</bdi></p>
    <p>{t('역할')} · <bdi>{text('role')}</bdi></p>
    <p>{t('해결할 일')} · <bdi>{text('problem')}</bdi></p>
    <ol className="list-inside list-decimal">{task.steps.map((s,i)=><li key={i}>{Array.isArray(steps)&&steps[i]?t(steps[i]):s}</li>)}</ol>
    <p>{text('scope')}</p><p>{t('남길 결과 (계획)')} · {text('artifact')}</p>
    <p className="text-sm">{t('가상 연습은 실제 기업 근무·직무 경험이 아니에요. 개인 응답은 외부에 자동 전송하지 않아요.')}</p>
  </div>;
}

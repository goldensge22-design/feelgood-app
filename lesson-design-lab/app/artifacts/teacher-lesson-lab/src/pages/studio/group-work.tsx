import { T } from '@/i18n/tx';
import { formatDateTime } from '@/i18n/format';
import type { Course } from '@/lib/studio/types';
import { interviewCapacity, saveGroupWork, visibleGroupWorks } from '@/lib/studio';
import { Btn, inputCls } from '@/components/shell';
import { Section, Txt, act, useDraft, useStudio } from './common';

export function ExtraCourseWork({course}:{course:Course}) {
  const {s,actor}=useStudio();
  const [d,set]=useDraft(`group-work-${course.id}`,{kind:'job-group' as 'job-group'|'joint',group:'',task:'',artifact:''});
  const map=d.kind==='job-group'?course.jobGroups:course.jointGroups;
  const groups=[...new Set(course.studentIds.map(id=>map[id]?.trim()).filter(Boolean))];
  const records=visibleGroupWorks(s,course.id);
  return <div className="space-y-5">
    {actor.role==='teacher'&&<InterviewCapacity course={course}/>}
    {course.period!=='day'&&course.mode!=='individual'&&<Section title={T('장기 과정 공동 과제·공동 결과물')} hint={T('공동 결과물을 개인 수행 경험으로 자동 인정하지 않습니다. 각 학생의 행동·경험·글은 현장 화면에서 따로 기록합니다.')}>
      {actor.role==='teacher'&&<div className="space-y-3">
        <div className="flex flex-wrap gap-2"><select data-testid="select-group-kind" className={inputCls} value={d.kind} onChange={e=>set({...d,kind:e.target.value as typeof d.kind,group:''})}><option value="job-group">{T('직무 분반 공통 과제')}</option><option value="joint">{T('분반 합동 과제')}</option></select><select data-testid="select-group-name" className={inputCls} value={d.group} onChange={e=>set({...d,group:e.target.value})}><option value="">{T('교사가 확정한 분반 선택')}</option>{groups.map(g=><option key={g}>{g}</option>)}</select></div>
        <Txt label={T('공동 과제')} rows={2} value={d.task} onChange={task=>set({...d,task})} testid="input-group-task"/>
        <Txt label={T('공동 결과물·제출 링크 또는 교사 확인 기록')} rows={3} value={d.artifact} onChange={artifact=>set({...d,artifact})} testid="input-group-artifact"/>
        <Btn disabled={!course.groupingConfirmed||!d.group} onClick={()=>act(st=>saveGroupWork(st,course.id,d.kind,d.group,d.task,d.artifact),'공동 과제를 별도 기록했습니다.')} data-testid="button-save-group-work">{T('공동 과제 별도 저장')}</Btn>
      </div>}
      <div className="mt-3 space-y-2">{records.map(r=><article key={r.id} className="rounded-lg border p-3"><div className="font-semibold">{r.group} · v{r.versions.length}</div><p className="whitespace-pre-wrap text-sm">{r.task}</p><p className="mt-2 whitespace-pre-wrap text-sm">{r.artifact||T('공동 결과물 미제출')}</p><details className="mt-2 text-xs"><summary>{T('이전 공동 과제·결과물 보존 이력')}</summary>{r.versions.map(v=><p key={v.number} className="whitespace-pre-wrap border-t py-2">v{v.number} · {formatDateTime(v.at)}<br/>{v.task}<br/>{v.artifact}</p>)}</details></article>)}</div>
    </Section>}
  </div>;
}
function InterviewCapacity({course}:{course:Course}) {
  const [d,set]=useDraft(`interview-capacity-${course.id}`,{block:60,conversation:8,handover:2});
  const counselors=course.counseling.counselors.filter(c=>!c.lead).length;
  let result:ReturnType<typeof interviewCapacity>|null=null;
  try{result=interviewCapacity(course.studentIds.length,counselors,d.block,d.conversation,d.handover);}catch{ /* a visible correction prompt below replaces invalid calculations */ }
  return <Section title={T('전원 모의면접 심화 · 추가 시간 계산')} hint={T('기존 수업 밖의 추가 운영 계획이며 예약이 아닙니다. 전체 진행 강사는 전담 상담자에서 제외합니다. 실제 가용 시간과 휴식은 별도 확인하세요.')}>
    <p className="mb-2 text-sm">{T('학생 {0}명 · 진행 강사 제외 전담 상담자 {1}명',course.studentIds.length,counselors)}</p>
    <div className="flex flex-wrap gap-3">{([['block','추가 운영 블록(분)'],['conversation','1인 대화(분)'],['handover','기록·교대(분)']] as const).map(([k,label])=><label key={k} className="text-sm">{T(label)}<input className={`${inputCls} mt-1 block w-28`} min={0} type="number" data-testid={`input-interview-${k}`} value={d[k]} onChange={e=>set({...d,[k]:Number(e.target.value)})}/></label>)}</div>
    {result?<div className="mt-3 rounded-lg bg-muted p-3 text-sm" data-testid="stats-interview-capacity">
      <p>{T('예상 수용 {0}명 · 부족 {1}명 · 총 상담자 시간 {2}분',result.capacity,result.shortage,result.staffMinutes)}</p>
      <p>{result.extraMinutes===null?T('추가 전담 상담자가 필요합니다.'):T('전원 심화에 별도로 필요한 운영 시간: 최소 {0}분',result.extraMinutes)}</p>
      <p>{result.requiredCounselors===null?T('블록을 늘리거나 후속 면담으로 나누세요.'):T('현재 블록에서 전원 진행 시 전담 상담자 {0}명이 필요합니다.',result.requiredCounselors)}</p>
    </div>:<p className="mt-2 text-sm text-destructive">{T('인원·대화 시간·교대 시간을 확인하세요.')}</p>}
  </Section>;
}

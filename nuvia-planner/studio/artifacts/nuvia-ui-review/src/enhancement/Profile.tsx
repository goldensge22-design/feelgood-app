import {AXES,LEVEL_LABEL} from '../official/adaptive/engine';
import {routeFor} from './domain';
import {AXIS_NAMES,STAGE_NAMES,SUPPORT_NAMES,type Student} from './model';
import {STAGE_HELP,OFFICIAL_NAMES} from './copy';

export default function Profile({student,compact=false}:{student:Student;compact?:boolean}){
 const a=student.assessment;const r=routeFor(student);
 if(!a)return <section className="nx-card nx-profile"><h3>결과지 없이 시작</h3><p>점수 없이도 계획과 시작은 모두 할 수 있어요. 도움은 짧은 공통 안내로 보여줘요.</p></section>;
 const metric=a.scoreSystem?.metric==='standard_score'?'표준점수':a.scoreSystem?.metric==='percentile'?'백분위':a.scoreSystem?.metric==='accuracy_rate'?'정답률':'결과지 점수';
 return <section className="nx-card nx-profile" aria-label="결과지 PASS 4영역" data-testid="section-profile">
  <p className="nx-eyebrow">{STAGE_NAMES[student.stage]} · {a.scoreSystem?.label??'결과지 PASS 4영역'} · {metric}</p>
  <div className="nx-axes">{AXES.map(x=>{const s=a.axes[x];return <div key={x} className={'nx-axis lv-'+s.level} data-testid={'text-axis-'+x}><span>{OFFICIAL_NAMES[x]}</span><b>{s.value!==undefined?s.value+(s.unit==='%'?'%':s.unit?' '+s.unit:''):'표시값 없음'}</b><small>공식 {LEVEL_LABEL[s.level]}</small></div>;})}</div>
  {r.warning? <p className="nx-warn" role="alert" data-testid="text-type-warning">{r.warning} 해석과 맞춤 도움은 꺼두고 공통 안내만 보여줘요.</p>
  : !compact&&<p className="nx-support">이번 연습: <b>{AXIS_NAMES[r.target]}</b> · 도움: {SUPPORT_NAMES[r.support]}{r.targets.length>1?' · 다음 순서 '+r.targets.slice(1).map(x=>AXIS_NAMES[x as keyof typeof AXIS_NAMES]).join(', '):''}</p>}
  {!compact&&<small>{STAGE_HELP[student.stage]} 점수는 처음 도움의 기준일 뿐, 완료 기록이 점수를 바꾸지 않아요.</small>}
 </section>;
}

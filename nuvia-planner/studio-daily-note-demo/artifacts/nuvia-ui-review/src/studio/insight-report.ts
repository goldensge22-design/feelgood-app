import type {PersonalState,Target} from './model';
import {stats,student} from './monthly';
import {assessmentView,executionFacts,insightsOf,methodFacts,previousMonth} from './insights';
import type {Source} from './insights';
import {SUPPORT_NAMES} from '../enhancement/model';
import {label} from './i18n/runtime';
import {assessmentLabel,levelLabel,metricLabel,responseLabel} from './i18n/assessment-labels';
const esc=(x:unknown)=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const num=(n:number|null)=>n===null?'자료 부족':Number(n.toFixed(2)).toString();
export function baselineHTML(s:PersonalState,month:string,selected:boolean){
 if(!selected)return '<p>검사 상세는 선택하지 않아 포함하지 않았습니다. 검사 점수는 실행 수행률과 별개이며 활동으로 재계산하지 않습니다.</p>';
 const contexts=executionFacts(s,month).contexts;
 const sources=[...new Map(contexts.filter(c=>c.source).map(c=>[c.source!.id,c.source!])).values()];
 const current=assessmentView(s);
 const display=(src:Source)=>`<h3>${esc(assessmentLabel(src.kind,src.assessment.assessmentId))} · 검사일 ${esc(src.date||'미확인')}</h3><p>${src.mode==='example'?'명시적 합성 예시 · 실제 학생 결과 아님':'로컬 결과 계약 입력 · 실제 서버·소유자 검증 미연결'} · 고정된 입력값</p><ul>${Object.entries(src.assessment.axes).map(([axis,v])=>`<li>${esc(label(({planning:'계획',attention:'주의',simultaneous:'동시',successive:'순차'} as Record<string,string>)[axis]))}: ${esc(v.value??'값 미확인')} ${esc(v.unit??'단위 미확인')} · ${esc(levelLabel(v.level))}</li>`).join('')}</ul><p>점수 체계: ${esc(assessmentLabel(src.assessment.scoreSystem?.label,src.assessment.assessmentId))} / ${esc(metricLabel(src.assessment.scoreSystem?.metric))}. 공식 상중하·순서는 입력을 보존하고 새 경계를 만들지 않습니다.</p>`;
 if(sources.length)return sources.map(display).join('')+(contexts.some(c=>!c.source)?'<p>일부 실행에는 출발점 메타데이터가 없습니다. 현재 검사를 과거 실행에 덧붙이지 않습니다.</p>':'');
 const stored=insightsOf(s).source;
 return '<p>이 달 실행에 연결된 검사 출발점은 확인되지 않았습니다.</p>'+(stored&&current.mode!=='unverified'?'<p>아래는 현재 보관된 입력이며 이 달의 검사로 소급 연결하지 않습니다.</p>'+display(stored):`<p>${esc(current.notice)}</p>`);
}
export function monthlyComparison(s:PersonalState,month:string,axis:Target){
 const now=stats(s,month,axis),before=stats(s,previousMonth(month),axis),limits:string[]=[];
 if(now.rawRate===null||before.rawRate===null)return {now,before,delta:null,comparable:false,limits:['두 달 중 목표 또는 유효 기록이 부족해 증감을 계산하지 않습니다.']};
 if(now.denominator!==before.denominator)limits.push('합의 목표 부담이 다릅니다.');
 if(now.versions.length>1||before.versions.length>1)limits.push('목표 수정 이력이 있어 최초 기준/남은 기준을 구분해야 합니다.');
 if(now.observedDays!==before.observedDays)limits.push('관찰 기간이 다릅니다.');
 if(now.provisional||before.provisional)limits.push('진행 중인 부분 월의 잠정값이 포함됩니다.');
 const a=executionFacts(s,month).contexts.filter(c=>c.axis===axis),b=executionFacts(s,previousMonth(month)).contexts.filter(c=>c.axis===axis);
 const keys=(rows:typeof a)=>[...new Set(rows.map(c=>c.scope&&c.scope===c.finalScope?JSON.stringify([c.cardTitle,c.subject,c.scope,c.kind]):''))].sort();
 if(!a.length||!b.length||keys(a).includes('')||JSON.stringify(keys(a))!==JSON.stringify(keys(b)))limits.push('동일한 과제·과목·분량 조건을 확인하지 못했습니다.');
 if(new Set([...a,...b].map(c=>c.source?JSON.stringify(c.source.assessment):'없음')).size>1)limits.push('검사 출발점이 달라 과거 수행을 재분류하지 않습니다.');
 return {now,before,delta:Math.min(100,now.rawRate)-Math.min(100,before.rawRate),comparable:limits.length===0,limits};
}
export function changeHTML(s:PersonalState,month:string,axes:Target[],includeEvidence:boolean,includeMethods:boolean){
 const facts=executionFacts(s,month),prev=executionFacts(s,previousMonth(month));
 let html='';
 if(includeEvidence){
  html+='<h3>이전 달과 합의한 연습 비교</h3>'+axes.map(axis=>{const c=monthlyComparison(s,month,axis);return `<p>${esc(({planning:'할 만큼 정하기',attention:'지금 한 가지',simultaneous:'전체 연결하기',successive:'단계대로 해보기',integrated:'계획하고 해보기'} as Record<string,string>)[axis])}: ${previousMonth(month)} ${c.before.performed}/${c.before.denominator}회 (${c.before.displayRate}) → ${month} ${c.now.performed}/${c.now.denominator}회 (${c.now.displayRate}). ${c.delta===null?'자료 부족':`${num(c.delta)}퍼센트포인트 ${c.delta===0?'변화 없음':c.delta>0?'증가':'감소'}`}.</p><p>${c.comparable?'기록상 합의 횟수·관찰 범위·과제 분량 조건이 같습니다.':'직접 효과 비교 불가: '+c.limits.join(' ')} 능력 향상률이나 효과 검증이 아닙니다. 같은 조건 표시도 환경·난도를 독립 검증한 것은 아닙니다.</p>`;}).join('');
  html+=`<h3>멈춤 뒤 다시 이어간 경험</h3><p>확장 실행 기록 ${facts.contexts.length}개 · 멈춤 후 재개 ${facts.returns}회 · 계획 수정 기록 ${facts.edits}건. 복귀 횟수가 많아 더 잘했다는 평가가 아닙니다. 이전 달 ${prev.contexts.length?`${prev.returns}회 (관찰 실행 ${prev.contexts.length}개)`:'자료 부족'} — 과제·관찰 수가 달라질 수 있어 수치만으로 우열을 비교하지 않습니다.</p>`;
  html+='<h3>예상 시간과 일시정지 제외 실행 시간</h3><p>수행 기록일의 달 기준이며 날짜 정정은 이력과 함께 반영합니다. 본인이 고친 실제 시간은 자기보고이며 이 계산에 섞지 않습니다. 이전 기록의 없는 시간·맥락을 추정하지 않습니다.</p>';
  html+=facts.contexts.length?'<ul>'+facts.contexts.map(c=>`<li>${esc(c.cardTitle)} · ${esc(c.subject)} · 범위 ${esc(c.scope||'미입력')} · ${c.plannedMinutes>0?`예상 ${c.plannedMinutes}분 / 실행 ${num(c.actualMs/60000)}분 / 차이 ${num(c.actualMs/60000-c.plannedMinutes)}분`:`예상 미정 / 실행 ${num(c.actualMs/60000)}분 / 시간 차이 계산 안 함`} · 중단 후 재개 ${c.resumes.length}회${c.scope!==c.finalScope?' · 실행 중 범위 변경, 시간 직접 비교 제외':''}</li>`).join('')+'</ul>':'<p>확장 기록이 없어 시간 변화는 자료 부족입니다. 기존 기록은 삭제하지 않았습니다.</p>';
  html+=facts.groups.map(g=>`<p>동일 제목·과목·분량 그룹 ‘${esc(g.title)} / ${esc(g.scope)}’: 평균 절대 시간 차이 ${g.previousN?num(g.before):'자료 부족'}분 (${g.previousN}회) → ${num(g.now)}분 (${g.n}회). ${g.previousN?'기술적 분류의 참고 비교이며 환경·난도·시간예측 능력의 향상을 입증하지 않습니다.':'이전 달 같은 조건이 없어 변화는 계산하지 않습니다.'}</p>`).join('');
 }
 if(includeMethods){
  html+='<h3>써 본 도움과 선택적 자기보고</h3>';
  const methods=methodFacts(s,month);
  html+=methods.length?methods.map(m=>`<p>${esc(SUPPORT_NAMES[m.support])}: 실행에서 사용 ${m.uses}회 / 도움 여부에 응답 ${m.responses}회 / 도움 됨 ${m.yes} · 중립 ${m.neutral} · 도움 안 됨 ${m.no} · 모르겠음 ${m.unsure} · 미응답 ${m.unanswered}.</p><ul>${m.contexts.map(c=>`<li>${esc(c.cardTitle)} · ${esc(c.subject)} · 범위 ${esc(c.scope||'미입력')} · ${esc(responseLabel(c.feedback?.answer))} · ${esc(c.feedback?.at??'응답 없음')}</li>`).join('')}</ul>`).join(''):'<p>확장 기록의 방법 사용 자료가 없습니다. 이전 단일 방법 메모를 새 사용 횟수로 추정하지 않습니다.</p>';
  const responses=insightsOf(s).comparisons.filter(c=>{const d=new Date(c.at);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`===month;});
  const latest=responses.filter(c=>!responses.some(n=>n.previousId===c.id));
  html+=`<h3>설명과 내 경험의 응답 기록</h3><p>응답 사건 ${responses.length}건(변경 포함), 현재 응답 맥락 ${latest.length}건. 맞아요 ${latest.filter(c=>c.answer==='agree').length} · 달라요 ${latest.filter(c=>c.answer==='different').length} · 모르겠어요 ${latest.filter(c=>c.answer==='unsure').length}. 미응답한 설명은 동의로 보지 않습니다. 설명 응답 횟수와 방법 사용 횟수는 별개입니다.</p><ul>${responses.map(c=>`<li>${esc(c.at)} · ${c.previousId?'응답 변경':'최초 맥락 응답'} · ${esc(c.cardTitle)} · ${esc(c.text)} · ${esc(responseLabel(c.answer))}</li>`).join('')}</ul>`;
  html+='<p>방법의 응답 수는 사용 건별 최신 응답이며 나중에 바꾸면 해당 사용월 보고서에 반영됩니다. 응답 시각을 함께 표시합니다. 설명 미응답 총수는 노출 기록이 없어 추정하지 않습니다. 앱의 안내를 받은 행동과 자기보고는 독립적인 검사 검증 자료가 아닙니다. 검사와 활동의 일치율·검사 정확성·역산 PASS 점수·인지능력 향상률을 만들지 않습니다. 미응답·중립·부정은 실패나 오답이 아닙니다. 과제·환경이 다른 비교는 효과 검증이 아닙니다.</p>';
 }
 return html;
}

import type {PersonalState} from './model';
import {areas,stats,suggest,student,localDate} from './monthly';
import {AXIS_NAMES} from '../enhancement/model';
import {baselineHTML,changeHTML} from './insight-report';
import {currentLocale} from './i18n/runtime';
export interface ReportFields {summary:boolean;evidence:boolean;methods:boolean;outputs:boolean;assessment?:boolean}
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function reportHTML(s:PersonalState,month:string,fields:ReportFields):string{
 const p=student(s),rows=areas(s).map(axis=>stats(s,month,axis)),drafts=s.drafts.filter(d=>d.fromMonth===month);
 const section=(title:string,body:string)=>`<section><h2>${esc(title)}</h2>${body}</section>`;
 let body='<h1>NUVIA PLANNER · 월간 활용 요약</h1><p>'+esc(month)+' · 브라우저 개인 기록 · 실제 학생 독립 사용/비교 연구/4주 추적 미검증</p><p>수행률은 합의한 연습을 얼마나 해봤는가의 참고값입니다. 인지능력·자존감·치료효과가 아닙니다. '+(fields.assessment?'검사 상세는 본인이 선택한 항목으로 포함됩니다.':'검사 상세점수는 선택하지 않아 포함하지 않습니다.')+' 생각 보관·개인 메모 원문은 자동 포함하지 않습니다. 선택한 과제명·산출물에 개인정보를 적었다면 공유 전에 확인하세요.</p>';
 if(s.mode==='review')body+='<p><strong>합성 검토 공간의 자료입니다. 실제 학생의 수행 통계가 아닙니다.</strong></p>';
 body+=section('1. 고정된 검사 출발점',baselineHTML(s,month,fields.assessment===true));
 body+='<section><h2>2. 나의 실행 변화</h2>';
 if(fields.summary)body+=section('다음에 바꿀 한 가지',rows.map(r=>`<p>${esc(AXIS_NAMES[r.axis])}: ${esc(suggest(s,month,r.axis).reasons.at(2))}</p>`).join(''));
 if(fields.evidence){
  const corrections=s.entries.flatMap(e=>e.corrections.filter(c=>c.from.startsWith(month)||c.to.startsWith(month)).map(c=>`<p>${esc(c.from)} → ${esc(c.to)} · ${esc(c.reason)} · 정정 시각 ${esc(c.at)}. 영역·수행 여부를 재분류하지 않았습니다.</p>`));
  const late=s.entries.filter(e=>e.localDate.startsWith(month)&&!localDate(new Date(e.enteredAt)).startsWith(month)).map(e=>`<p>수행일 ${esc(e.localDate)} / 입력 시각 ${esc(e.enteredAt)}: 다른 달에 입력한 기록이며 입력 사실을 표시합니다.</p>`);
  if(corrections.length||late.length)body+=section('보고서 변경·늦은 입력 안내',corrections.join('')+late.join(''));
 }
 if(fields.evidence)body+=section('영역별 목표·수행·근거',rows.map(r=>`<h3>${esc(AXIS_NAMES[r.axis])} · ${r.performed}/${r.denominator}회 · ${r.displayRate}</h3><p>${esc(r.label)}${r.provisional?' · 진행 중인 월의 잠정값':''} · 관찰 ${r.observedDays}일 · 추가 수행 ${r.extra}회 · 명시 건너뜀 ${r.skipped} · 미확인 ${r.unobserved} · 상황상 해당 없음 ${r.notApplicable}(보관/복귀에 한함)</p><p>기본 분모는 최초 합의입니다. 변경 목표는 앞으로 남은 계획이며 과거 실적에 소급 적용하지 않습니다.</p><ul>${r.versions.map(v=>{const revised=stats(s,month,r.axis,v.id);return `<li>${esc(v.at)}: ${v.previousId?'이후 남은':'최초'} ${v.count}회 / ${esc(v.reason)} · 이 기준 수행 ${revised.performed}/${revised.denominator}회 · ${revised.displayRate}</li>`;}).join('')}</ul><ol>${r.evidence.map(e=>`<li>${esc(e.localDate)} · ${esc(e.cardTitle)} · ${esc(e.status==='performed'?'수행 확인':e.status==='skipped'?'명시 건너뜀':'미확인')}<ul>${e.proof.map(p=>'<li>'+esc(p)+'</li>').join('')}</ul>${e.corrections.map(c=>`<p>정정 ${esc(c.from)} → ${esc(c.to)}: ${esc(c.reason)} (${esc(c.at)})</p>`).join('')}</li>`).join('')}</ol>`).join(''));
 body+=changeHTML(s,month,areas(s),fields.evidence,fields.methods);
 if(fields.methods)body+=section('기존 개인 방법 메모 — 사용 횟수와 별개',p.methods.map(m=>`<p>${esc(m.name)} · ${m.helpful==='yes'?'도움 됨':m.helpful==='no'?'도움되지 않음':'모르겠음'}. 기존 단일 메모이며 응답 변경 이력을 추정하지 않습니다.</p>`).join('')||'<p>기존 방법 메모 없음</p>');
 if(fields.outputs)body+=section('실제 적용 결과와 선택적 자기보고',s.entries.filter(e=>e.localDate.startsWith(month)).map(e=>`<p>${esc(e.cardTitle)} · 본인이 적은 산출물: ${esc(e.output||'미입력')} · 느낌: ${esc(e.feeling||'미입력')}</p>`).join('')+'<p>과제 산출물은 자기기록이며 외부 확인이나 효과 입증이 아닙니다. 외부 수행 확인 서버는 미연결입니다.</p>');
 body+='</section>';
 body+=section('3. 다음 달 제안 — 수락 전 일정 반영 없음',fields.summary?(drafts.map(d=>`<h3>${esc(AXIS_NAMES[d.axis])} · ${esc(d.toMonth)} · ${esc(d.status)}</h3><p>목표 ${d.baseline.count} → ${d.count}회 · 분량 ${esc(d.baseline.chunk)} → ${esc(d.chunk)} · 방법 ${esc(d.method)} · 도움 ${esc(d.help)}</p><ul>${d.reasons.map(r=>'<li>'+esc(r)+'</li>').join('')}</ul>`).join('')||'<p>아직 만든 초안이 없습니다.</p>'):'다음 달 제안은 공유 항목으로 선택하지 않았습니다.');
 if(!Object.values(fields).some(Boolean))body+='<p>공유할 항목을 선택하지 않았습니다.</p>';
 const locale=currentLocale();
 return `<!doctype html><html lang="${locale}" dir="${locale==='ar'?'rtl':'ltr'}"><meta charset="utf-8"><title>NUVIA ${esc(month)} 월간 요약</title><style>body{font:17px/1.7 system-ui;color:#172c4c;max-width:900px;margin:30px auto;padding:20px}section{border-top:2px solid #c6cbd2;margin:26px 0;break-inside:avoid}p,li{overflow-wrap:anywhere}h1{font-size:28px}@media print{body{margin:0;padding:0;font-size:11pt}section{break-inside:auto}}</style><body>${body}</body></html>`;
}

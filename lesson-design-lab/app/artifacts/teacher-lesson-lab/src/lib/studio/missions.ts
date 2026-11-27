import { T, txLang } from '@/i18n/tx';
import { localizedSupport, displayAppText } from '@/i18n/authored';
import { now, uid, type AppState } from '../store';
import { DOMAINS, supportPlan, type Level, type Levels } from '../domain';
import { emptyPerformance } from '../materials';
import type { ExplorationInput, Candidate, Mission, CompanyModel } from './types';
import { copy, requireCourse, requireTeacher, requireStudent, needed, finite } from './core';

export function displayCandidate(candidate:Candidate,quotes:string[]=[],lang=txLang()):Candidate {
  const convert=(text:string)=>{
    let protectedText=text;const used:string[]=[];
    for(const quote of quotes.filter(Boolean).sort((a,b)=>b.length-a.length))if(protectedText.includes(quote)){protectedText=protectedText.split(quote).join(`⟦Q${used.length}⟧`);used.push(quote);}
    return displayAppText(protectedText,undefined,lang).replace(/⟦Q(\d+)⟧/g,(_,i)=>used[+i]);
  };
  const reason=candidate.reason.split('\n');
  return {...candidate,title:convert(candidate.title),reading:convert(candidate.reading),actions:candidate.actions.map(convert),
    reason:reason.map((line,i)=>i===1?line:convert(line)).join('\n'),help:candidate.help.map(convert),deliverable:convert(candidate.deliverable),criterion:convert(candidate.criterion)};
}

export function saveExploration(s: AppState, courseId: string, studentId: string, data: ExplorationInput) {
  requireStudent(s, courseId, studentId); finite(data.remaining, 1, 300);
  const n=copy(s);
  let old=n.studio.explorations.find((x)=>x.courseId===courseId&&x.studentId===studentId);
  if(old?.status==='selected'&&Object.keys(data).some((key)=>JSON.stringify(data[key as keyof ExplorationInput])!==JSON.stringify(old![key as keyof ExplorationInput])))old=undefined;
  const source=n.studio.companies.find((x)=>x.id===data.companyId);
  const value={...data,id:old?.id??uid('explore'),courseId,studentId,at:now(),...(source?{sourceVersion:source.version,sourceUpdatedAt:source.changedAt}:{}),status:old?.status==='selected'?'selected' as const:'exploring' as const};
  if(old) { if(!source){delete old.sourceVersion;delete old.sourceUpdatedAt;}Object.assign(old,value); } else n.studio.explorations.unshift(value);
  if(value.status!=='selected')try{getCandidates(n,courseId,studentId);n.studio.explorations.find((x)=>x.id===value.id)!.status='candidates-ready';}catch{ /* unfinished exploration is a valid saved draft, never a mission */ }
  return n;
}
function sourceFor(s:AppState,id:string):CompanyModel|undefined {
  if(!id) return undefined;
  const m=s.studio.companies.find((x)=>x.id===id);
  if(!m || m.revoked || !m.educationAllowed) throw new Error(T('자료 공유가 철회되었거나 교육 활용이 허용되지 않았습니다. 자료를 다시 확인하세요.'));
  return m;
}
export function getCandidates(s:AppState,courseId:string,studentId:string):Candidate[] {
  const c=requireStudent(s,courseId,studentId);
  if(!s.studio.practices.some((p)=>p.courseId===courseId&&p.studentId===studentId&&p.done)) throw new Error(T('짧은 실제 활동으로 플래너 기본 연습을 완료하세요.'));
  const e=s.studio.explorations.find((x)=>x.courseId===courseId&&x.studentId===studentId);
  if(!e) throw new Error(T('TOP5만으로 카드를 만들지 않습니다. 직무 탐색을 먼저 기록하세요.'));
  for(const [v,k] of [[e.job,'선택 직무'],[e.question,'탐색 질문'],[e.duties,'업무·학습 내용'],[e.reason,'선택 이유'],[e.source,'출처'],[e.behavior,'요구 행동']]) needed(v,T(k));
  const report=s.studio.reports.find((x)=>x.studentId===studentId);
  if(report?.top5.length&&!report.top5.some((x)=>x.title===e.job)&&!e.outsideReason.trim()) throw new Error(T('TOP5 밖 관심 직무의 선택 이유를 기록하세요.'));
  const model=sourceFor(s,e.companyId);
  if(model && (model.version!==e.sourceVersion||model.changedAt!==e.sourceUpdatedAt)) throw new Error(T('외부 자료가 변경되었습니다. 탐색 기록과 공유 상태를 다시 확인하세요.'));
  const st=s.students.find((x)=>x.id===studentId)!;
  const help=e.supports.length?e.supports:st.supports.length?st.supports:supportForStudent(s,courseId,studentId).supports;
  const frames=st.stage==='middle'
    ? [
      {title:T('생활 불편 한 가지와 아이디어'),reading:T('교육용 생활 사례: 쉬는 시간에 안내가 길어 친구가 준비물을 놓쳤다. 불편한 장면을 그림으로 고르고, 짧은 문장과 선택지로 개선 아이디어를 표현한다.'),actions:[T('불편한 장면 하나를 그림 또는 선택지로 고른다.'),T('누가 무엇이 불편한지 말하고 아이디어 하나를 그린다.')],deliverable:T('불편 그림 또는 선택지와 아이디어 한 문장'),criterion:T('불편 한 가지·관심 역할·아이디어 이유를 본인 말로 표현한다.')},
      {title:T('두 안내 방법 짧게 체험'),reading:T('교육용 선택지: 글 안내와 그림 안내를 각각 읽고 어떤 안내가 이해하기 쉬운지 짧게 체험한다.'),actions:[T('두 안내 중 하나를 직접 사용해 본다.'),T('좋았던 점과 바꿀 점을 그림이나 짧은 말로 기록한다.')],deliverable:T('관심 방법 선택과 짧은 체험 기록'),criterion:T('직접 한 행동 하나와 선택 이유를 남긴다.')},
      {title:T('역할의 첫 행동 표현하기'),reading:T('교육용 역할 예시: 고객이 질문하면 먼저 요청을 확인하고 필요한 정보를 안전하게 안내한다.'),actions:[T('내가 해 보고 싶은 역할을 고른다.'),T('그 역할의 첫 행동을 짧게 시연한다.')],deliverable:T('첫 행동 시연과 나의 관심 기록'),criterion:T('관심 역할과 실제로 시도한 행동을 구분한다.')},
    ] : st.stage==='high'
    ? [
      {title:T('출처를 비교한 한 쪽 개선안'),reading:T('교육용 사례 비교: 안내자료 A는 운영 시간이 변경되었다고 쓰고, 자료 B는 기존 시간을 유지한다. 두 자료의 출처와 확인일을 대조하고 확인된 사실과 미확인 내용을 나눈다.'),actions:[T('사례와 출처 두 개를 비교하고 확인 여부를 표시한다.'),T('관련 교과·학과의 배울 내용과 연결해 개선안 한 쪽을 작성한다.')],deliverable:T('출처 비교와 교과 연결을 담은 한 쪽 개선안'),criterion:T('비교 근거·교과 연결·확인 한계와 다음 탐구를 제시한다.')},
      {title:T('학과·교과 경로 탐구'),reading:T('공식 교육과정이 있으면 실제 수업·과제·전공 결합 기회를 비교한다. 자료가 없으면 교육용 가상 경로임을 표시하고 학교 사실을 만들지 않는다.'),actions:[T('배울 수업과 과제 두 항목을 비교한다.'),T('관련 교과와 준비 행동을 정하고 탐구 질문을 작성한다.')],deliverable:T('수업·과제 비교표와 다음 탐구 계획'),criterion:T('학과 이름이나 순위가 아니라 배울 내용과 근거를 비교한다.')},
      {title:T('고객 안내문 개선 실험'),reading:T('교육용 고객 문제: 안내가 서로 달라 이용자가 이동 경로를 혼동한다. 근거가 확인된 정보만으로 안내문을 개선한다.'),actions:[T('고객이 혼동하는 근거를 찾는다.'),T('개선 안내문과 확인이 필요한 내용을 분리한다.')],deliverable:T('개선 안내문과 출처·미확인 목록'),criterion:T('출처·사실·미확인 정보를 구분하고 개선 이유를 설명한다.')},
    ] : [
      {title:T('직무 요구 행동 기반 문제 해결 보고서'),reading:model?.sourceKind==='official'
        ? `${T('공식 직무 자료 · 출처와 버전 확인')}\n${model.source}\n${model.duties}\n${model.behaviors.join('\n')}`
        : T('일반 직무 연습 · 교육용 모의 과제: 두 고객 안내가 달라 고객이 잘못된 장소로 이동했다. 공식 기업 자료가 없는 상태이며 실제 기업 의뢰나 회사 규정이 아니다. 문제 가설과 대안·우선순위·검증 방법 및 한계를 설계한다.'),
        actions:[T('직무 자료에서 요구 행동과 문제 가설을 구분한다.'),T('대안과 우선순위·검증 방법·한계를 담은 보고서를 작성한다.')],deliverable:T('가설·대안·우선순위·검증 방법·한계 보고서'),criterion:T('요구 행동에 맞는 근거와 대안 비교를 제시하고 보유 역량을 과장하지 않는다.')},
      {title:T('자료 불일치 대조와 수정 요청'),reading:T('일반 직무 연습 · 교육용 가상 자료 A: 고객 안내 마감 14:00. 가상 자료 B: 마감 14:30. 실제 회사 지침이 아니다. 확인되지 않은 내용을 확정 공지하지 않고 담당자에게 확인 요청을 작성한다.'),actions:[T('버전과 항목별 불일치 목록을 만든다.'),T('영향·확인 요청·임시 안내를 구분한 수정 요청을 작성한다.')],deliverable:T('근거 대조표와 수정 요청문'),criterion:T('불일치 근거·영향·확인 요청을 구분하고 미확인 내용을 확정하지 않는다.')},
      {title:T('안전한 절차·기록 점검'),reading:T('일반 직무 연습 · 교육용 가상 절차: 접수→항목 확인→담당자 확인→기록 보존. 기록의 누락을 안전하게 보고한다. 실제 보안 취약점이나 우회 방법을 다루지 않는다.'),actions:[T('절차 순서 또는 기록 누락을 대조한다.'),T('확인한 사실과 담당자에게 요청할 내용을 보고한다.')],deliverable:T('절차·기록 점검표와 안전한 누락 보고'),criterion:T('절차 준수·정확성·보고·협업 행동을 근거로 설명한다.')},
    ];
  if(e.remaining<5) throw new Error(T('남은 시간이 짧습니다. 마감 기록을 남기고 다음 회차 활동을 계획하세요.'));
  return frames.map((f,i)=>{
    const base=st.stage==='middle'?[10,8,12][i]:st.stage==='high'?[25,20,18][i]:[35,20,25][i];
    const minutes=Math.min(base,e.remaining,c.maxMissionMinutes);
    const short=minutes<base;
    const rank = report?.top5.findIndex((item) => !!item.title.trim() && item.title === e.job) ?? -1;
    return {id:`${e.id}-candidate-${i}`,...(rank >= 0 ? {reportRank:rank + 1} : {}),title:f.title,reason:`${T('학생이 선택한 직무와 요구 행동을 연습합니다.')}\n${e.job} · ${e.behavior}${short?`\n${T('남은 시간에 맞춰 사례 한 가지와 핵심 산출물로 범위를 줄였습니다.')}`:''}`,
      reading:[f.reading,c.readingCandidates?`${T('교사 준비 읽기 자료')}\n${c.readingCandidates}`:''].filter(Boolean).join('\n\n'),actions:short?[f.actions[0],T('확인한 근거 한 가지와 다음 보완 행동을 짧게 남긴다.')]:f.actions,
      minutes,deliverable:short?(st.stage==='middle'?T('생활 장면 한 개와 아이디어 한 줄'):st.stage==='high'?T('한 출처의 근거 한 개·교과 연결·추가 조사 질문 메모'):T('요구 행동 한 개·근거 한 개·미확인 질문 한 개의 미니 메모')):f.deliverable,
      criterion:short?T('선택한 한 항목의 근거와 실제 한 행동·다음 확인 질문을 남긴다. 전체 과제 완료로 표시하지 않는다.'):f.criterion,
      help:[st.stage==='middle'?T('그림·선택지로 생활 불편을 표시하고 짧게 말하기'):st.stage==='high'?T('출처 비교표와 교과 연결 질문으로 탐구 정리'):T('직무 요구 행동·근거·가설 검증 점검표'),...help.map(x=>localizedSupport(x,s.lang))],behavior:e.behavior,simulation:true};
  });
}

/** Read a confirmed original type, never derive H/M/L from scores or corporate normalized data. */
export function supportForStudent(s:AppState,courseId:string,studentId:string){
  requireStudent(s,courseId,studentId,s.studio.actor.role!=='teacher');
  const st=s.students.find((x)=>x.id===studentId)!;
  const report=s.studio.reports.find((r)=>r.studentId===studentId);
  const original=report
    ? report.kind==='accuracy-percent'&&report.confirmed&&/^[HML]{4}$/.test(report.pattern)
      ? {verified:true,testName:report.test,version:report.version,criteria:report.scale,levels:Object.fromEntries(DOMAINS.map((key,i)=>[key,report.pattern[i] as Level])) as Levels,top5:report.top5}
      : undefined
    : st.report;
  return supportPlan(st.stage,original);
}
export function planPractice(s:AppState,courseId:string,studentId:string,goal:string) {
  requireStudent(s,courseId,studentId);needed(goal,T('기본 연습 목표'));
  const existing=s.studio.practices.find((p)=>p.courseId===courseId&&p.studentId===studentId);if(existing)return s;
  const n=copy(s),id=`basic-practice-${courseId}-${studentId}`;
  const fields={title:T('플래너 기본 연습 · 실제 3분 활동'),goal,reason:T('플래너 기본 사용을 실제 활동으로 연습'),job:'',date:'',minutes:3,scope:T('준비 행동 한 가지'),
    firstAction:goal,steps:[T('할 일을 정한다.'),T('실제 3분 행동을 한다.'),T('계획과 실제 한 일을 구분해 기록한다.')],help:[T('단계 체크 칸')],criterion:T('실제 행동과 회고를 학생이 확인한다.'),nextAction:''};
  n.plannerActivities.push({id,studentId,worksheetIds:[],kind:null,lang:s.lang,fields,generated:structuredClone(fields),record:emptyPerformance(),status:'confirmed',registration:{state:'disconnected',events:[{at:now(),state:'local-only'}]},
    versions:[{version:1,at:now(),reason:T('기본 사용 계획'),fields:structuredClone(fields),record:emptyPerformance(),worksheetIds:[]}]});
  n.studio.practices.push({courseId,studentId,plannerId:id,goal,actual:'',reflection:'',done:false,at:now()});return n;
}
export function completePractice(s:AppState,courseId:string,studentId:string,actual:string,reflection:string) {
  requireStudent(s,courseId,studentId,true);needed(actual,T('실제 행동'));needed(reflection,T('회고'));
  const n=copy(s),p=n.studio.practices.find((x)=>x.courseId===courseId&&x.studentId===studentId);
  if(!p)throw new Error(T('기본 연습 계획을 먼저 담으세요.'));
  Object.assign(p,{actual,reflection,done:true,at:now()});
  const planner=n.plannerActivities.find((x)=>x.id===p.plannerId)!;
  planner.record={...planner.record,state:'performed',actual,feedback:reflection,confirmedBy:'student'};
  planner.versions.push({version:planner.versions.length+1,at:now(),reason:T('기본 사용 실제 행동 확인'),fields:structuredClone(planner.fields),record:structuredClone(planner.record),worksheetIds:[]});
  return n;
}
export function saveNextAction(s:AppState,courseId:string,studentId:string,text:string) {
  requireStudent(s,courseId,studentId,true);needed(text,T('다음 7일 실행'));
  const n=copy(s),existing=n.studio.followups.find((x)=>x.courseId===courseId&&x.studentId===studentId);
  if(existing)Object.assign(existing,{versions:[...(existing.versions??[{text:existing.text,at:existing.at}]),{text,at:now()}],text,at:now()});else n.studio.followups.push({courseId,studentId,text,at:now(),versions:[{text,at:now()}]});
  const mission=n.studio.missions.filter((x)=>x.courseId===courseId&&x.studentId===studentId&&x.plannerId).at(-1);
  if(mission){const p=n.plannerActivities.find((x)=>x.id===mission.plannerId)!;p.fields.nextAction=text;p.record.nextAction=text;p.versions.push({version:p.versions.length+1,at:now(),reason:T('다음 실행 계획'),fields:structuredClone(p.fields),record:structuredClone(p.record),worksheetIds:[...p.worksheetIds]});}
  return n;
}
export function selectCandidate(s:AppState,explorationId:string,candidate:Candidate,goal:string,firstAction:string) {
  const e=s.studio.explorations.find((x)=>x.id===explorationId); if(!e) throw new Error(T('탐색 기록이 없습니다.'));
  const c=requireStudent(s,e.courseId,e.studentId); needed(goal,T('나의 목표')); needed(firstAction,T('첫 행동'));
  const canonical=getCandidates(s,e.courseId,e.studentId).find((x)=>x.id===candidate.id);
  if(!canonical) throw new Error(T('현재 탐색에서 제시된 후보를 선택하세요.'));
  const n=copy(s), existing=n.studio.missions.find((x)=>x.explorationId===e.id&&!x.parentId);
  if(existing) throw new Error(T('이미 선택한 카드가 있습니다. 기존 카드 수정 또는 후속 카드로 연결하세요.'));
  const reasons=[];
  if(!c.autoApprove) reasons.push(T('교사 확인 틀을 벗어난 선택'));
  if(!c.readingCandidates.trim()&&!e.companyId) reasons.push(T('읽기 자료를 교사가 확인해야 합니다.'));
  if(!e.tools.length) reasons.push(T('사용할 도구 확인 필요'));
  if(e.tools.some((tool)=>!c.tools.includes(tool))) reasons.push(T('교사 준비 도구 범위 밖의 선택'));
  const id=uid('mission');
  const m:Mission={id,courseId:e.courseId,studentId:e.studentId,explorationId:e.id,candidate:canonical,
    reportBasis:structuredClone(s.studio.reports.find((r)=>r.studentId===e.studentId) ?? null),
    goal,firstAction,scopeConfirmed:true,selection:{job:e.job,companyId:e.companyId,reason:e.reason,source:e.source,behavior:e.behavior},
    status:reasons.length?'review-needed':'confirmed',reviewReasons:reasons,reviewNote:'',plannerId:'',worksheetId:'',registration:'unregistered',remoteRegistered:false,
    helpRequest:'',record:{actual:'',result:'',reflection:'',evidence:'',changed:''},simulation:true,studentConfirmed:false,updatedAt:now(),versions:[]};
  m.versions.push({number:1,at:now(),goal,firstAction,candidate:structuredClone(canonical),record:{...m.record},reason:T('학생 후보 선택')});
  n.studio.missions.push(m); n.studio.explorations.find((x)=>x.id===e.id)!.status='selected'; return n;
}
export function reviewMission(s:AppState,id:string,approve:boolean,note:string) {
  const old=s.studio.missions.find((x)=>x.id===id); if(!old) throw new Error(T('카드를 찾을 수 없습니다.'));
  requireTeacher(s,requireCourse(s,old.courseId)); needed(note,T('검토 의견'));
  const n=copy(s),m=n.studio.missions.find((x)=>x.id===id)!; m.status=approve?'confirmed':'review-needed';m.reviewNote=note;m.updatedAt=now();return n;
}
export function reviseMission(s:AppState,id:string,goal:string,firstAction:string,reason:string) {
  const old=s.studio.missions.find((x)=>x.id===id);if(!old)throw new Error(T('카드를 찾을 수 없습니다.'));
  requireStudent(s,old.courseId,old.studentId);needed(goal,T('목표'));needed(firstAction,T('첫 행동'));needed(reason,T('변경 이유'));
  const n=copy(s),m=n.studio.missions.find((x)=>x.id===id)!;
  // An executed card is immutable. Corrections become a linked follow-up and keep the actual record intact.
  if(m.record.actual.trim()||m.plannerId) {
    const next:Mission={...structuredClone(m),id:uid('mission'),parentId:m.id,goal,firstAction,plannerId:'',worksheetId:'',registration:'unregistered',status:'review-needed',
      studentConfirmed:false,record:{actual:'',result:'',reflection:'',evidence:'',changed:''},versions:[],updatedAt:now(),reviewReasons:[T('수행 또는 등록된 카드의 후속 활동 확인')]};
    next.versions=[{number:1,at:now(),goal,firstAction,candidate:structuredClone(next.candidate),record:{...next.record},reason}];n.studio.missions.push(next);
  }else{m.goal=goal;m.firstAction=firstAction;m.updatedAt=now();m.versions.push({number:m.versions.length+1,at:now(),goal,firstAction,candidate:structuredClone(m.candidate),record:{...m.record},reason});}
  return n;
}
export function registerMission(s:AppState,id:string,forceFailure=false) {
  const old=s.studio.missions.find((x)=>x.id===id);if(!old)throw new Error(T('카드를 찾을 수 없습니다.'));
  requireStudent(s,old.courseId,old.studentId);
  if(old.registration==='local'&&old.plannerId) return s;
  if(old.status!=='confirmed') throw new Error(T('교사 검토와 범위 확인 후 플래너에 담을 수 있습니다.'));
  const n=copy(s),m=n.studio.missions.find((x)=>x.id===id)!;
  if(forceFailure){m.registration='failed';m.updatedAt=now();return n;}
  const st=n.students.find((x)=>x.id===m.studentId)!;
  const template=st.stage==='middle'?'M09':st.stage==='high'?'H09':'U09';
  const wid=m.worksheetId||`studio-worksheet-${m.id}`,pid=m.plannerId||`studio-planner-${m.id}`;
  const fields={title:m.candidate.title,goal:m.goal,job:m.selection.job,
    readingTitle:T('수업용 모의 과제 · 읽기 자료'),reading:m.candidate.reading,
    questions:[T('어떤 사실과 근거를 확인했나요?'),T('본인이 실제로 한 행동은 무엇인가요?'),T('다음에 바꾸거나 확인할 것은 무엇인가요?')],
    actions:m.candidate.actions,help:m.candidate.help,deliverable:m.candidate.deliverable,criterion:m.candidate.criterion,answer:''};
  n.personalWorksheets.push({id:wid,studentId:st.id,templateId:template,stage:st.stage,lang:s.lang,context:{family:st.family,job:fields.job,task:m.candidate.title},source:'job-task',status:'confirmed',
    fields,generated:structuredClone(fields),protectedText:[n.studio.courses.find(c=>c.id===m.courseId)?.readingCandidates??'',...n.studio.companies.flatMap(x=>[x.source,x.duties,...x.behaviors])].filter(Boolean),versions:[{version:1,at:now(),reason:T('현장 학생 선택 후 생성'),fields:structuredClone(fields)}]});
  const pfields={title:m.candidate.title,goal:m.goal,reason:m.selection.reason,job:fields.job,date:'',
    minutes:m.candidate.minutes,scope:m.candidate.deliverable,firstAction:m.firstAction,steps:m.candidate.actions,help:m.candidate.help,criterion:m.candidate.criterion,nextAction:''};
  n.plannerActivities.push({id:pid,studentId:st.id,worksheetIds:[wid],kind:null,lang:s.lang,fields:pfields,generated:structuredClone(pfields),record:emptyPerformance(),status:'confirmed',
    registration:{state:'disconnected',events:[{at:now(),state:'local-only'}]},versions:[{version:1,at:now(),reason:T('로컬 플래너에 담기 · 외부 미연동'),fields:structuredClone(pfields),record:emptyPerformance(),worksheetIds:[wid]}]});
  m.plannerId=pid;m.worksheetId=wid;m.registration='local';m.status='planner-registered';m.updatedAt=now();return n;
}
export function recordMission(s:AppState,id:string,record:Mission['record'],status:'in-progress'|'partial'|'performed',helpRequest='') {
  const old=s.studio.missions.find((x)=>x.id===id);if(!old)throw new Error(T('카드를 찾을 수 없습니다.'));
  requireStudent(s,old.courseId,old.studentId);
  if(!old.plannerId||old.registration!=='local') throw new Error(T('플래너에 담기 실패 상태입니다. 임시 기록을 보존하고 다시 시도하세요.'));
  if(status==='performed'){needed(record.actual,T('실제 행동'));needed(record.result,T('결과'));needed(record.reflection,T('회고'));}
  const n=copy(s),m=n.studio.missions.find((x)=>x.id===id)!;m.record=record;m.status=status;m.helpRequest=helpRequest;m.updatedAt=now();
  m.versions.push({number:m.versions.length+1,at:now(),goal:m.goal,firstAction:m.firstAction,candidate:structuredClone(m.candidate),record:structuredClone(record),reason:T('실제 수행 기록')});
  const p=n.plannerActivities.find((x)=>x.id===m.plannerId)!;
  p.record={...p.record,state:status==='performed'?'in-progress':'in-progress',actual:record.actual,artifact:record.result,feedback:record.reflection,changedMethod:record.changed};
  p.versions.push({version:p.versions.length+1,at:now(),reason:T('현장 수행 기록'),fields:structuredClone(p.fields),record:structuredClone(p.record),worksheetIds:[...p.worksheetIds]});
  return n;
}
export function confirmExperience(s:AppState,id:string,studentConfirmed:boolean) {
  const old=s.studio.missions.find((x)=>x.id===id);if(!old)throw new Error(T('카드를 찾을 수 없습니다.'));
  requireStudent(s,old.courseId,old.studentId,true);
  if(!studentConfirmed||old.status!=='performed'||!old.record.actual.trim()||!old.record.result.trim()||!old.record.reflection.trim()) throw new Error(T('완료 버튼만으로 경험을 인정하지 않습니다. 실제 행동·결과·회고와 학생 확인이 필요합니다.'));
  const n=copy(s),m=n.studio.missions.find((x)=>x.id===id)!;m.studentConfirmed=true;m.status='experience-confirmed';m.updatedAt=now();
  if(!n.studio.facts.some((x)=>x.missionId===id)) n.studio.facts.push({id:uid('fact'),courseId:m.courseId,studentId:m.studentId,missionId:id,action:m.record.actual,result:m.record.result,learning:m.record.reflection,evidence:m.record.evidence,simulation:m.simulation,studentConfirmed:true,at:now()});
  const p=n.plannerActivities.find((x)=>x.id===m.plannerId)!;p.record={...p.record,state:'performed',confirmedBy:'student'};
  p.versions.push({version:p.versions.length+1,at:now(),reason:T('학생 경험 확인'),fields:structuredClone(p.fields),record:structuredClone(p.record),worksheetIds:[...p.worksheetIds]});return n;
}
export function addExperience(s:AppState,courseId:string,studentId:string,fields:{action:string;result:string;learning:string;evidence:string;simulation:boolean;studentConfirmed:boolean}) {
  requireStudent(s,courseId,studentId,true);needed(fields.action,T('실제 행동'));needed(fields.result,T('결과'));needed(fields.learning,T('배운 점'));
  if(!fields.studentConfirmed) throw new Error(T('학생이 실제 사실을 확인해야 합니다.'));
  const n=copy(s);n.studio.facts.push({...fields,id:uid('fact'),courseId,studentId,at:now()});return n;
}

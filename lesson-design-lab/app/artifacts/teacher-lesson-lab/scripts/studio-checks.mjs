import { createServer } from 'vite';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server=await createServer({root,configFile:false,logLevel:'error',appType:'custom',server:{middlewareMode:true,hmr:false},optimizeDeps:{noDiscovery:true},resolve:{alias:{'@':path.join(root,'src')}}});
let passed=0;
const check=(label,f)=>{f();console.log(`PASS ${label}`);passed++;};
try {
  const e=await server.ssrLoadModule('/src/lib/studio/index.ts');
  const store=await server.ssrLoadModule('/src/lib/store.ts');
  const data=await server.ssrLoadModule('/src/data/lessons.ts');
  const worksheets=await server.ssrLoadModule('/src/data/worksheets.ts');
  const {buildMaterialBundle}=await server.ssrLoadModule('/src/lib/material-print.ts');
  let s=store.normalizeState({students:[],experiences:[{id:'old-experience',studentId:'legacy',period:'weekly',text:'기존 사용자가 쓴 원문',confirmedByStudent:true,at:'2026-10-27'}]});
  check('기존 원문과 18수업·36종 및 새 저장 영역',()=>{
    assert.equal(data.LESSONS.length,18);assert.equal(worksheets.WORKSHEETS.length,36);
    assert.equal(s.experiences[0].text,'기존 사용자가 쓴 원문');assert.equal(s.studio.version,'1.5');
  });
  check('180/240/300분과 별도 검사 시간·학생 행동·발문·제출물',()=>{
    for(const preset of ['180','240','300','300-counseling']){
      const n=e.createCourse(s,{...e.defaultCourse('university'),preset,testMinutes:17});
      const c=n.studio.courses[0],a=e.buildAgenda(c);
      assert.equal(e.courseStats(c).total,Number(preset.slice(0,3))+17);
      assert.equal(a[0].minutes,17);assert.ok(a.every(r=>r.teacher&&r.student&&r.completion));
      assert.equal(c.mode,'individual');
    }
  });
  check('1개월·2개월 회차와 실제 시수는 기본 콘텐츠 수에 더하지 않음',()=>{
    for(const period of ['month','two-month']){
      const n=e.createCourse(s,{...e.defaultCourse('high'),period,sessionMinutes:90});
      const c=n.studio.courses[0];assert.equal(c.sessions,period==='month'?4:8);assert.equal(e.courseStats(c).total,c.sessions*90);
      assert.equal(c.sessionDates.length,c.sessions);
    }
  });
  s=e.createCourse(s,{...e.defaultCourse('university'),name:'가상 개인 미션 과정',preset:'300-counseling'});
  const cid=s.studio.activeCourseId;
  s=e.addDemoRoster(s,cid,30);const ids=s.studio.courses[0].studentIds, sid=ids[0], sid2=ids[1];
  const baseCourse=s.studio.courses[0],block=baseCourse.counseling.blocks[0];
  s=e.updateCourse(s,cid,{readingCandidates:'교사가 확인한 교육용 비교 자료',counseling:{...baseCourse.counseling,counselors:[{id:'counselor-demo',name:'가상 상담자',lead:false,available:[block]}]}});
  check('상담자 한 명 60분/10분=6명,30명은5명필요·부족24명',()=>{
    const cap=e.counselingCapacity(s,cid);assert.equal(cap.capacity,6);assert.equal(cap.requiredCounselors,5);assert.equal(cap.shortage,24);
    const n=e.updateCourse(s,cid,{counseling:{...s.studio.courses[0].counseling,counselors:[{id:'counselor-demo',name:'진행 강사',lead:true,available:[block]}]}});
    assert.equal(e.counselingCapacity(n,cid).capacity,0);
  });
  const top5=[{title:'선택 직무 B',reason:'원본 공동 순위'},{title:'선택 직무 A',reason:'원본 순서'},{title:'선택 직무 C',reason:'관심'},{title:'선택 직무 D',reason:'탐색'},{title:'선택 직무 E',reason:'확인'}];
  s=e.saveReport(s,{studentId:sid,kind:'accuracy-percent',scores:{P:72,A:65,S:80,Q:64},pattern:'HMLM',top5,test:'가상 검사',date:'2026-11-04',scale:'정답률 %',version:'교육용 가상',connected:false,confirmed:true});
  check('PASS 정답률과 TOP5 원본 순서·유형 보존, 자동 카드 생성 없음',()=>{
    assert.deepEqual(s.studio.reports[0].top5,top5);assert.equal(s.studio.reports[0].pattern,'HMLM');assert.equal(s.studio.missions.length,0);
    assert.equal(s.students.find(x=>x.id===sid).job,'');assert.throws(()=>e.getCandidates(s,cid,sid));
  });
  const prep={job:'고객 문제 해결',companyId:'',question:'고객 안내가 달라지면 무엇을 확인하나요?',duties:'자료를 비교하고 확인 요청 작성',reason:'확인 행동을 연습하고 싶어서',outsideReason:'TOP5 밖 직무를 직접 체험하고 싶음',source:'교사 수업 예시',behavior:'근거 확인과 정확한 안내',remaining:12,tools:['종이','펜'],supports:['순서 안내']};
  s=e.switchActor(s,{role:'student',id:sid});
  s=e.planPractice(s,cid,sid,'필요한 읽기 자료를 책상에 준비한다.');
  check('플래너 계획만으로 기본 연습 완료가 되지 않음',()=>{
    assert.equal(s.studio.practices[0].done,false);assert.throws(()=>e.getCandidates(s,cid,sid));
  });
  s=e.completePractice(s,cid,sid,'자료 두 장과 펜을 직접 준비했다.','필요한 준비물을 미리 정하니 다음 활동을 시작하기 쉬웠다.');
  s=e.saveExploration(s,cid,sid,prep);
  let candidates=e.getCandidates(s,cid,sid);
  check('탐색 후 3개 후보·12분 내 축소 범위·읽기·지원·제출 기준',()=>{
    assert.equal(candidates.length,3);assert.ok(candidates.every(c=>c.minutes<=12&&c.reading&&c.deliverable&&c.criterion&&c.help.length));
    assert.ok(candidates[0].deliverable.includes('미니 메모'));assert.ok(!candidates[0].deliverable.includes('가설·대안·우선순위·검증 방법·한계 보고서'));
    const bad=e.saveExploration(s,cid,sid,{...prep,outsideReason:''});assert.throws(()=>e.getCandidates(bad,cid,sid));
  });
  s=e.selectCandidate(s,s.studio.explorations[0].id,candidates[0],'근거를 확인하며 개선 가설 한 가지를 만든다.','자료의 출처와 확인일을 먼저 표시한다.');
  const mid=s.studio.missions[0].id;
  check('학생 선택 후 확정·등록 실패는 미등록·재시도 중복 없음',()=>{
    const failed=e.registerMission(s,mid,true);assert.equal(failed.studio.missions[0].registration,'failed');assert.equal(failed.personalWorksheets.length,0);
    s=e.registerMission(failed,mid);const again=e.registerMission(s,mid);
    assert.equal(again.personalWorksheets.length,1);assert.equal(again.plannerActivities.length,2);assert.equal(again.studio.missions[0].remoteRegistered,false);
    assert.equal(again.plannerActivities.at(-1).registration.state,'disconnected');
  });
  check('완료만 클릭한 기록과 교사의 학생 사실 확인 대행 차단',()=>{
    assert.throws(()=>e.recordMission(s,mid,{actual:'',result:'',reflection:'',evidence:'',changed:''},'performed'));
    assert.throws(()=>e.confirmExperience(s,mid,true));
  });
  s=e.recordMission(s,mid,{actual:'두 안내문의 시간이 다른 곳을 표시하고 확인 요청을 작성했다.',result:'시간 불일치 한 곳과 담당자 확인 질문을 문서로 남겼다.',reflection:'확인하지 않은 시간은 공지하지 않아야 한다는 점을 배웠다.',evidence:'교육용 비교표',changed:'전체를 읽기 전에 항목별 표시로 바꿈'},'performed');
  s=e.confirmExperience(s,mid,true);
  check('학생 경험 확인은 실제 행동·결과·회고 이후, 모의 표시 보존',()=>{
    assert.equal(s.studio.facts.length,1);assert.equal(s.studio.facts[0].simulation,true);assert.equal(s.studio.missions[0].status,'experience-confirmed');
    assert.equal(s.experiences[0].text,'기존 사용자가 쓴 원문');
  });
  check('등록 후 수정은 원본과 실제 기록을 보존한 후속 카드',()=>{
    const n=e.reviseMission(s,mid,'다음 확인 목표','추가 자료부터 확인','학생이 다음 행동 선택');
    assert.equal(n.studio.missions.length,2);assert.equal(n.studio.missions[1].parentId,mid);assert.equal(n.studio.missions[0].record.actual,s.studio.missions[0].record.actual);
  });
  const win={courseId:cid,studentId:sid,question:'본인의 행동과 배운 점을 설명하세요.',job:'고객 문제 해결',limit:1000,factIds:[s.studio.facts[0].id],selectedFacts:{action:true,result:true,learning:true},requirements:'근거 확인과 안전한 안내',text:'V1 학생 원문: 안내 자료를 대조하고 확인 질문을 작성했다.'};
  s=e.saveWriting(s,null,win);const wid=s.studio.writings[0].id;
  check('V1 사실 기반 초안 미리보기는 원문과 PASS 점수를 바꾸거나 전달하지 않음',()=>{
    const before=s.studio.writings[0].versions[0].text,proposal=e.draftSuggestion(s,wid);
    assert.ok(proposal.includes('모의'));assert.ok(!proposal.includes('72'));assert.equal(s.studio.writings[0].versions[0].text,before);
  });
  s=e.setSharing(s,wid,{v1:true,experiences:true,requirements:false,counselorIds:['counselor-demo']});
  check('수용량과 V1 이후 슬롯·상담자 중복·학생 중복 예약 차단',()=>{
    const slots=e.counselingSlots(s,cid);assert.equal(slots.filter(x=>x.available).length,6);
    s=e.bookSlot(s,wid,'counselor-demo',slots.find(x=>x.available).start);
    assert.throws(()=>e.bookSlot(s,wid,'counselor-demo',slots.find(x=>x.available).start));
    assert.throws(()=>e.bookSlot(s,wid,'counselor-demo',0));
    const c=s.studio.courses[0];
    assert.throws(()=>e.updateCourse(e.switchActor(s,{role:'teacher',id:'teacher-demo'}),cid,{counseling:{...c.counseling,absences:[block]}}));
  });
  s=e.switchActor(s,{role:'counselor',id:'counselor-demo'});
  check('상담 선택 공유만 반환, 교사·다른학생·PASS 기본 접근 차단',()=>{
    const v=e.getWritingView(s,wid);assert.equal(v.v1,win.text);assert.equal(v.requirements,'');assert.equal(v.writing.requirements,'');assert.equal(v.writing.draft,'');
    assert.equal(e.visibleReports(s,cid).length,0);
    assert.equal(e.getWritingView(e.switchActor(s,{role:'teacher',id:'teacher-demo'}),wid),null);
    assert.equal(e.getWritingView(e.switchActor(s,{role:'student',id:sid2}),wid),null);
  });
  s=e.saveConsultation(s,wid,['본인이 확인 요청을 어떻게 작성했나요?'],['작성 후 담당자 확인 문장을 덧붙였다.'],'문장의 행동 순서를 먼저 쓰면 이해하기 쉽습니다.');
  check('면담 완료는 글 최종 완료 아님·추가 사실은 미확인 후보',()=>{
    assert.equal(s.studio.writings[0].status,'consulted');assert.equal(s.studio.writings[0].factCandidates[0].confirmed,false);
  });
  s=e.switchActor(s,{role:'student',id:sid});
  check('미확인 면담 사실로 V2 저장 차단',()=>assert.throws(()=>e.addWritingVersion(s,wid,'V2 초안',true)));
  s=e.confirmFact(s,wid,s.studio.writings[0].factCandidates[0].id,true);
  s=e.addWritingVersion(s,wid,'V2 학생 수정: 실제 확인 요청 순서와 배운 점을 덧붙였다.',true);
  check('V1 보존·V2 append·비교와 내보내기·미공유V2 상담자에게 숨김',()=>{
    assert.equal(s.studio.writings[0].versions[0].text,win.text);assert.equal(s.studio.writings[0].versions[1].number,2);
    assert.ok(e.writingExport(s,wid).includes('V2'));
    const v=e.getWritingView(e.switchActor(s,{role:'counselor',id:'counselor-demo'}),wid);assert.equal(v.writing.versions.length,1);
  });
  check('가정 답변은 실제 경험으로 전환 금지, 실제 추가 사실은V3확인',()=>{
    const input={writingId:wid,kind:'hypothetical',question:'새로운 상황이라면?',answer:'확인하겠습니다.',followUp:'어떤 근거로?',feedback:'근거를 구체화',reanswer:'출처부터 확인하겠습니다.',additionalFact:'가정 성과',factConfirmed:true};
    assert.throws(()=>e.saveMockInterview(s,input));
    s=e.saveMockInterview(s,{...input,kind:'experience',question:'실제 어떻게 했나요?',additionalFact:'비교표에 확인일을 적었다.',factConfirmed:true});
    s=e.addWritingVersion(s,wid,'V3 학생 원문: 확인일을 적은 실제 행동을 보완했다.',true);
    assert.equal(s.studio.writings[0].versions.length,3);
  });
  s=e.saveNextAction(s,cid,sid,'다음 7일 안에 다른 안내 자료 한 개를 비교한다.');
  check('개인 출력·공용 출력 정보 분리 및 학생별 페이지 경계',()=>{
    const teacher=e.switchActor(s,{role:'teacher',id:'teacher-demo'});
    const common=e.coursePrint(teacher,cid,ids.slice(0,2),'blank');
    assert.ok(common.pages.every(p=>p.panels.every(x=>x.studentId===p.studentId)));
    assert.ok(!JSON.stringify(common).includes('V1 학생 원문'));assert.ok(!JSON.stringify(common).includes('72'));
    assert.throws(()=>e.coursePrint(teacher,cid,ids.slice(0,2),'summary'));
    assert.throws(()=>e.coursePrint(teacher,cid,[sid],'consultation'));
    const personal=e.coursePrint(s,cid,[sid],'comparison');assert.ok(JSON.stringify(personal).includes('V1 학생 원문'));
    const materials=buildMaterialBundle(s,{studentIds:[sid],mode:'both',layout:'A5x2',worksheetIds:[s.studio.missions[0].worksheetId],activityIds:[s.studio.missions[0].plannerId]});
    assert.equal(materials.counts.worksheets,1);assert.equal(materials.counts.cards,1);
    assert.ok(materials.pages.every(p=>p.studentId===sid));
  });
  check('학생 사실 원문과 작업 상태는 새로고침용 JSON 복원에서 보존',()=>{
    const restore=store.normalizeState(JSON.parse(JSON.stringify(s)));assert.deepEqual(restore.studio,s.studio);assert.equal(restore.experiences[0].text,'기존 사용자가 쓴 원문');
  });
  check('세 교육단계의 읽기·행동·제출물이 실질적으로 다름',()=>{
    const content=[];
    for(const stage of ['middle','high','university']){
      let n=e.createCourse(e.switchActor(s,{role:'teacher',id:'teacher-demo'}),{...e.defaultCourse(stage),name:`가상 ${stage}`});
      const c=n.studio.courses[0];n=e.addDemoRoster(n,c.id,1);const id=n.studio.courses[0].studentIds[0];
      n=e.switchActor(n,{role:'student',id});n=e.planPractice(n,c.id,id,'자료 준비');n=e.completePractice(n,c.id,id,'자료를 준비했다.','직접 확인했다.');
      n=e.saveExploration(n,c.id,id,prep);content.push(e.getCandidates(n,c.id,id)[0]);
    }
    assert.equal(new Set(content.map(x=>x.reading)).size,3);assert.equal(new Set(content.map(x=>x.actions.join())).size,3);assert.equal(new Set(content.map(x=>x.deliverable)).size,3);assert.equal(new Set(content.map(x=>x.help.join())).size,3);
  });
  check('자료 출처·교육공유·변경 및 철회 후 새 제안 차단',()=>{
    let n=e.switchActor(s,{role:'teacher',id:'teacher-demo'});
    const model={id:'source-test',company:'가상 교육 기관',job:win.job,duties:'고객 요청 확인',behaviors:['근거 확인'],knowledge:'자료 출처',skills:'대조',attitudes:'정확성',verification:'문서 대조',sourceKind:'official',source:'https://example.com/demo',checkedAt:'2026-11-04',version:'v1',educationAllowed:true,officialEvidence:'',approvalReceipt:'',revoked:false,changedAt:''};
    assert.throws(()=>e.saveCompany(n,model));
    n=e.saveCompany(n,{...model,sourceKind:'teacher-example'});
    n=e.switchActor(n,{role:'student',id:sid});
    n=e.refreshWritingSources(n,wid,true);
    const origin=n.studio.writings[0].versions[0].text;
    n=e.saveCompany(e.switchActor(n,{role:'teacher',id:'teacher-demo'}),{...n.studio.companies[0],version:'v2'});
    n=e.switchActor(n,{role:'student',id:sid});
    assert.throws(()=>e.draftSuggestion(n,wid));
    n=e.refreshWritingSources(n,wid,true);assert.ok(e.draftSuggestion(n,wid));
    n=e.saveCompany(e.switchActor(n,{role:'teacher',id:'teacher-demo'}),{...n.studio.companies[0],revoked:true});
    n=e.switchActor(n,{role:'student',id:sid});assert.throws(()=>e.refreshWritingSources(n,wid,true));assert.equal(n.studio.writings[0].versions[0].text,origin);
  });
  check('다른 담당 교사의 수업 접근 및 쓰기 거절',()=>{
    const outsider=e.switchActor(s,{role:'teacher',id:'other-teacher'});
    assert.equal(e.visibleCourses(outsider).length,0);assert.throws(()=>e.requireCourse(outsider,cid));assert.equal(e.getWritingView(outsider,wid),null);
  });
  check('탐색 직무 변경은 이전 카드의 선택 원본·수행 기록을 덮어쓰지 않음',()=>{
    const n=e.saveExploration(s,cid,sid,{...prep,job:'새 관심 직무',outsideReason:'새로운 역할을 탐색'});
    assert.equal(n.studio.missions[0].selection.job,'고객 문제 해결');assert.equal(n.studio.explorations.length,2);assert.equal(n.studio.explorations[0].job,'새 관심 직무');
  });
  check('수정본 공유는 학생 별도 선택이며 초안은 공유하지 않음',()=>{
    const n=e.setSharing(s,wid,{...s.studio.writings[0].sharing,versions:true});
    const counselor=e.switchActor(n,{role:'counselor',id:'counselor-demo'});
    assert.equal(e.getWritingView(counselor,wid).writing.versions.length,3);assert.equal(e.getWritingView(counselor,wid).writing.draft,'');
  });
  check('장기 공동 과제·공동 결과물은 개인 경험과 분리·수정 이력 보존',()=>{
    const teacher=e.switchActor(s,{role:'teacher',id:'teacher-demo'});
    assert.throws(()=>e.saveGroupWork(teacher,cid,'job-group','탐구반','공동 문제','공동 결과'));
    let n=e.createCourse(teacher,{...e.defaultCourse('university'),name:'공동 과제 검수',period:'month',mode:'mixed',studentIds:[sid,sid2]});
    const long=n.studio.courses[0];n=e.updateCourse(n,long.id,{jobGroups:{[sid]:'탐구반',[sid2]:'탐구반'},groupingConfirmed:true});
    n=e.saveGroupWork(n,long.id,'job-group','탐구반','공동 자료 비교','공동 대조표');
    n=e.saveGroupWork(n,long.id,'job-group','탐구반','교사 확인을 더한 비교','수정 공동 대조표');
    assert.equal(n.studio.groupWorks[0].versions.length,2);assert.equal(n.studio.facts.length,s.studio.facts.length);assert.deepEqual(n.studio.groupWorks[0].studentIds,[sid,sid2]);
  });
  check('전원 모의면접 추가 시수와 상담자 수를 별도 계산',()=>{
    const r=e.interviewCapacity(30,1,60,8,2);assert.equal(r.capacity,6);assert.equal(r.shortage,24);assert.equal(r.extraMinutes,300);assert.equal(r.requiredCounselors,5);
    assert.equal(e.interviewCapacity(30,0,60,8,2).extraMinutes,null);assert.throws(()=>e.interviewCapacity(30,1,60,0,0));
  });
  check('새 결과지의 확정 유형을 우선하며 네 영역 도움을 자르거나 정규화 점수로 추정하지 않음',()=>{
    let n=e.switchActor(s,{role:'teacher',id:'teacher-demo'});
    const original=n.studio.reports.find(r=>r.studentId===sid);
    n=e.saveReport(n,{...original,pattern:'LLLL',confirmed:true,test:'원본 검사',version:'제공된 버전',scale:'제공된 정답률·원본 확정 유형'});
    const plan=e.supportForStudent(n,cid,sid);assert.equal(plan.pattern,'LLLL');assert.equal(plan.lows.length,4);assert.ok(plan.supports.length>=4);
    n=e.saveReport(n,{...n.studio.reports.find(r=>r.studentId===sid),kind:'demo-normalized'});assert.equal(e.supportForStudent(n,cid,sid).pattern,null);
  });
  await fs.writeFile('/tmp/lesson-lab-studio-fixture.json',JSON.stringify(s));
  console.log(`Studio1.5: ${passed} checks passed. External connections/auth/AI remain disconnected.`);
}finally{await server.close();}

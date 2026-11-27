import { T } from '@/i18n/tx';
import { formatDateTime, printLines } from '@/i18n/format';
import { now, uid, type AppState } from '../store';
import type { MaterialBundle, MaterialBlock, MaterialPage, MaterialPanel } from '../material-types';
import { requireCourse, requireTeacher } from './core';
import { buildAgenda, courseStats } from './curriculum';
import { getWritingView, writingQuestions, interviewQuestions } from './writing';
import { top5Text } from './reports';
import { reportLabel } from './report-labels';
import { coachText, stageCoach } from '@/i18n/experience-coach';
import { getExperienceNote, experienceSourceState } from './experience-coach';

export type StudioPrintKind='guide'|'blank'|'example'|'summary'|'consultation'|'feedback'|'comparison'|'interview'|'experience-notes'|'writing-check'|'revision-record';
const printTitle=(kind:StudioPrintKind)=>({guide:T('교사 진행안'),blank:T('개인 빈 활동지'),example:T('대상별 학습 예시'),summary:T('본인 결과 요약'),consultation:T('면담 준비표'),feedback:T('상담자 질문·피드백표'),comparison:T('수정 전후 확인표'),interview:T('모의면접 회고표'),'experience-notes':coachText('experienceSheet'),'writing-check':coachText('writingSheet'),'revision-record':coachText('revisionSheet')})[kind];
export function coursePrint(s:AppState,courseId:string,studentIds:string[],kind:StudioPrintKind):MaterialBundle {
  const c=requireCourse(s,courseId),actor=s.studio.actor;
  const isCommon=['guide','blank','example'].includes(kind);
  if(isCommon)requireTeacher(s,c);
  const ids=kind==='guide'?['teacher-guide']:c.studentIds.filter((id)=>studentIds.includes(id));
  if(kind!=='guide'&&(!ids.length||studentIds.some((id)=>!c.studentIds.includes(id))))throw new Error(T('담당 수업의 출력할 학생을 선택하세요.'));
  if(['summary','consultation','comparison'].includes(kind)&&ids.length!==1)throw new Error(T('결과 요약과 원문 상담자료는 학생 한 명씩 별도 개인 출력하세요.'));
  if(actor.role==='student'&&ids.some((id)=>id!==actor.id))throw new Error(T('본인 자료만 개인 출력할 수 있습니다.'));
  const pages:MaterialPage[]=[];
  let documents=0;
  for(const sid of ids){
    const code=kind==='guide'?T('교사용 진행안'):s.students.find((x)=>x.id===sid)!.code;
    let blocks:MaterialBlock[]=[];
    let version=1,modified=c.updatedAt;
    if(kind==='guide'){
      const stats=courseStats(c);
      blocks=[{label:c.name,text:`${T('교육')}: ${stats.instruction} · ${T('휴식')}: ${stats.breaks} · ${T('별도 검사')}: ${stats.test} · ${T('합계')}: ${stats.total}`},
        ...buildAgenda(c).map((r)=>({label:`${r.session+1} / ${r.phase} · ${r.minutes}${T('분')}`,text:
          `${r.program} / ${r.screen}\n${T('교사 안내')}: ${r.teacher}\n${T('학생 행동')}: ${r.student}\n${T('제출물')}: ${r.deliverable}\n${T('완료 확인')}: ${r.completion}\n${T('막혔을 때 대안')}: ${r.alternative}`}))];
    }else if(kind==='blank'||kind==='example'){
      const middle=c.stage==='middle',high=c.stage==='high';
      blocks=[
        {label:T('해석·탐색·비교 작업 공간'),text:kind==='example'?(middle?T('교육용 생활 사례: 안내를 읽기 어려운 친구의 불편을 그림이나 선택지로 표현합니다.'):high?T('교육용 사례 두 개의 출처를 비교하고 교과와 연결한 한 쪽 개선안을 만듭니다.'):T('기업 공식자료가 없다면 일반 직무 연습입니다. 문제 가설·대안·우선순위·검증 방법·한계를 보고합니다.')):'',writingLines:3},
        {label:T('오늘 탐색할 직무·선택 이유·질문'),text:'',writingLines:3},
        {label:T('읽은 자료·출처·확인일·요구 행동'),text:'',writingLines:3},
        {label:T('나의 첫 행동·필요한 도움'),text:'',writingLines:3},
        {label:T('실제로 한 행동·결과·배운 점'),text:'',writingLines:4},
        {label:T('글쓰기: 사실 확인과 다음 행동'),text:'',writingLines:4},
      ];
    }else if(['experience-notes','writing-check','revision-record'].includes(kind)){
      const stage=stageCoach(c.stage),n=getExperienceNote(s,courseId,sid);
      const raw=s.studio.experienceNotes?.find(x=>x.courseId===courseId&&x.studentId===sid);
      const state=raw?experienceSourceState(s,raw):'none';
      // Printing the blank scaffolding is safe for a class; student notes require separate opt-in.
      const include=!!n?.includePrint&&!['changed','withdrawn','unconfirmed'].includes(state);
      version=n?.revision??1;modified=n?.updatedAt??c.updatedAt;
      blocks=[{label:printTitle(kind),text:stage.reading},
        {label:coachText('optional'),text:`${coachText('writeFreely')}\n${stage.help}\n${stage.deliverable}`}];
      if(kind==='experience-notes'){
        const keys=['situation','roleGoal','action','result','learning','evidence'] as const;
        blocks.push(...keys.map((key,i)=>({label:coachText(key),text:`${stage.questions[i]}${include&&n?.fields[key]?'\n'+n.fields[key]:''}`,writingLines:3})));
      }else if(kind==='writing-check'){
        blocks.push({label:coachText('purpose'),text:include&&n?(n.customPurpose||coachText(n.purpose)):'',writingLines:2},
          {label:coachText('writeFreely'),text:coachText('guideFlow'),writingLines:5},
          {label:coachText('checkFacts'),text:stage.questions.slice(2).join('\n'),writingLines:3});
      }else{
        const w=s.studio.writings.find(w=>w.courseId===courseId&&w.studentId===sid);
        const view=w?getWritingView(s,w.id):null;
        blocks.push({label:'V1 → V2',text:coachText('guideConsult'),writingLines:3},
          {label:coachText('teacherQuestion'),text:view?.writing.questions.join('\n')??'',writingLines:3},
          {label:coachText('checkFacts'),text:view?.writing.factCandidates.map(f=>`${f.confirmed?T('확인'):f.rejected?T('제외'):T('확인 대기')}: ${f.text}`).join('\n')??'',writingLines:4},
          {label:coachText('revisionSheet'),text:'',writingLines:4});
      }
      blocks.push({label:coachText(include&&n? n.sourceKind==='simulation'?'sourceSimulation':n.sourceKind==='actual'?'sourceActual':'sourceUnverified':'notesPrivate'),
        text:state==='changed'?coachText('sourceChanged'):state==='withdrawn'?coachText('sourceWithdrawn'):coachText('previewOnly')});
    }else if(kind==='summary'){
      if(actor.role==='counselor')throw new Error(T('PASS 결과는 상담 공유 기본 대상이 아닙니다.'));
      const r=s.studio.reports.find((x)=>x.studentId===sid);
      version=r?.revision??1;
      if(r?.savedAt) modified=r.savedAt;
      blocks=[{label:T('본인 결과 요약 · 별도 개인 자료'),text:r?`${r.kind==='accuracy-percent'?T('P/A/S/Q 정답률'):T('정규화 가상 점수 · 결과지와 혼용 금지')}\n${r.scores?Object.entries(r.scores).map(([k,v])=>`${k}: ${v}`).join(' / '):T('점수 없음')}\n${T('원본 유형')}: ${r.pattern||T('미입력')}\n${r.test} / ${r.date} / ${r.scale} / ${r.version}`:T('결과지 없음 · 점수나 유형을 추정하지 않습니다.')},
        {label:T('TOP5 원본 순서'),text:r?top5Text(r):''},
        ...(r?[{label:reportLabel('revision'),text:`v${r.revision??1} · ${r.savedAt?formatDateTime(r.savedAt):reportLabel('legacy')}`}]:[])];
    }else{
      const writing=s.studio.writings.find((w)=>w.courseId===courseId&&w.studentId===sid);
      if(!writing)throw new Error(T('선택 학생의 글이 아직 없습니다.'));
      const view=getWritingView(s,writing.id);
      if(!view)throw new Error(T('개인 상담 출력은 학생이 선택 공유한 범위에서만 가능합니다.'));
      version=view.writing.versions.at(-1)?.number??1;
      modified=view.writing.updatedAt;
      blocks=[{label:T('문항·직무'),text:`${writing.question}\n${writing.job}`}];
      if(kind==='consultation')blocks.push({label:T('면담 준비표 · 선택 공유 V1'),text:view.v1},{label:T('선택 경험과 요구 행동'),text:[...view.facts.map((f)=>`${f.simulation?T('모의 과제'):T('실제 경험')}: ${f.action} / ${f.result}`),view.requirements].join('\n')},{label:T('질문·근거 준비'),text:writingQuestions(s,writing.id).join('\n'),writingLines:4});
      if(kind==='feedback')blocks.push({label:T('상담자 질문·피드백표'),text:view.writing.questions.join('\n'),writingLines:4},{label:T('추가 사실 후보 · 학생 확인 전 글에 반영 금지'),text:view.writing.factCandidates.map((f)=>`${f.confirmed?T('확인'):f.rejected?T('제외'):T('확인 대기')}: ${f.text}`).join('\n'),writingLines:3},{label:T('표현 제안 · 사실과 별도'),text:view.writing.expressionSuggestions,writingLines:3});
      if(kind==='comparison')blocks.push(...view.writing.versions.map((v)=>({label:`V${v.number} · ${formatDateTime(v.at)}`,text:v.text})),{label:T('수정 전후 확인표'),text:T('문항 응답 / 본인 행동 / 근거 / 직무 연결 / 사실 확인 / 학생 검토 / 저장'),writingLines:3});
      if(kind==='interview')blocks.push({label:T('모의면접 회고표 · 경험과 가정 구분'),text:interviewQuestions(s,writing.id).map((q)=>`${q.kind==='experience'?T('경험 질문'):T('가정 상황 질문')}: ${q.question}`).join('\n'),writingLines:3},
        {label:T('답변·꼬리질문·피드백·재답변'),text:s.studio.interviews.filter((i)=>i.writingId===writing.id&&actor.role==='student'&&actor.id===sid).map((i)=>`${i.question}\n${i.answer}\n${i.followUp}\n${i.feedback}\n${i.reanswer}`).join('\n'),writingLines:5});
    }
    // Small text chunks + explicit handwriting space; never truncate student text.
    const chunks:MaterialBlock[]=[];
    for(const b of blocks){
      const lines=printLines(b.text,42);
      for(let start=0;start<lines.length;start+=14)chunks.push({label:start?`${b.label} ↳`:b.label,text:lines.slice(start,start+14).join('\n')});
      if(b.writingLines)chunks.push({label:b.label,text:'',writingLines:b.writingLines});
    }
    const segments:MaterialBlock[][]=[];let row:MaterialBlock[]=[],cost=0;
    for(const b of chunks){const size=3+b.text.split('\n').length+(b.writingLines??0)*2;if(row.length&&cost+size>36){segments.push(row);row=[];cost=0;}row.push(b);cost+=size;}if(row.length)segments.push(row);
    const count=segments.length;
    segments.forEach((segment,i)=>{
      const panel:MaterialPanel={type:'worksheet',kindLabel:printTitle(kind),documentId:`${kind}-${courseId}-${sid}`,studentId:sid,code,title:`${c.name} · ${printTitle(kind)}`,links:[`${T('수정 시각')}: ${formatDateTime(modified,s.lang)}`],version,segment:i+1,segments:count,blocks:segment};
      pages.push({studentId:sid,code,studentPage:i+1,studentPages:count,globalPage:pages.length+1,layout:'worksheet',panels:[panel],language:s.lang});
    });documents++;
  }
  return {id:uid('studio-print'),at:now(),mode:'worksheets',layout:'A4',studentIds:ids,pages,counts:{students:kind==='guide'?0:ids.length,worksheets:documents,cards:0,outputs:documents,sheets:pages.length,panels:pages.length},state:'prepared',printRequests:[],language:s.lang};
}

/** Optional writing worksheets are appended inside each student's boundary, never across students. */
export function buildCoachingBundle(s:AppState,courseId:string,studentIds:string[],kinds:('experience-notes'|'writing-check'|'revision-record')[],base?:MaterialBundle):MaterialBundle {
  const c=requireCourse(s,courseId);
  const ids=c.studentIds.filter(id=>studentIds.includes(id));
  const unique=[...new Set(kinds)];
  if(!ids.length||studentIds.some(id=>!c.studentIds.includes(id)))throw Error(T('담당 수업의 출력할 학생을 선택하세요.'));
  const extra=unique.map(kind=>coursePrint(s,courseId,ids,kind));
  const pages:MaterialPage[]=[];
  for(const sid of ids) {
    const group=[...(base?.pages.filter(p=>p.studentId===sid)??[]),...extra.flatMap(b=>b.pages.filter(p=>p.studentId===sid))];
    group.forEach((p,i)=>pages.push({...structuredClone(p),studentPage:i+1,studentPages:group.length,globalPage:pages.length+1}));
  }
  const worksheets=(base?.counts.worksheets??0)+extra.reduce((n,b)=>n+b.counts.worksheets,0),cards=base?.counts.cards??0;
  return {id:uid('coaching-print'),at:now(),mode:base?.mode??'worksheets',layout:base?.layout??'A4',studentIds:ids,
    pages,counts:{students:ids.length,worksheets,cards,outputs:worksheets+cards,sheets:pages.length,panels:pages.reduce((n,p)=>n+p.panels.length,0)},
    state:'prepared',printRequests:[],language:s.lang};
}

import { uid, type AppState } from '../store';
import { T } from '@/i18n/tx';
import { copy, needed, requireCourse, requireTeacher } from './core';

/** Joint output is deliberately not a personal fact or a writing source. */
export function saveGroupWork(s:AppState,courseId:string,kind:'job-group'|'joint',group:string,task:string,artifact:string):AppState {
  const c=requireCourse(s,courseId);requireTeacher(s,c);
  if(c.period==='day'||c.mode==='individual')throw new Error(T('하루·개인 미션에는 공동 프로젝트를 배정하지 않습니다.'));
  if(!c.groupingConfirmed)throw new Error(T('학생별 분반·합동 조를 교사가 먼저 확인하세요.'));
  if(c.mode!=='mixed'&&c.mode!==kind)throw new Error(T('선택한 장기 수업방식과 공동 과제 구분이 다릅니다.'));
  needed(task,T('공동 과제'));
  const map=kind==='job-group'?c.jobGroups:c.jointGroups;
  const studentIds=c.studentIds.filter((id)=>map[id]?.trim()===group.trim());
  if(!studentIds.length)throw new Error(T('교사가 확정한 해당 분반의 학생이 없습니다.'));
  const n=copy(s),existing=n.studio.groupWorks.find((x)=>x.courseId===courseId&&x.kind===kind&&x.group===group.trim());
  const version={number:(existing?.versions.length??0)+1,task,artifact,studentIds:[...studentIds],at:new Date().toISOString()};
  if(existing)Object.assign(existing,{task,artifact,studentIds,versions:[...existing.versions,version]});
  else n.studio.groupWorks.push({id:uid('group-work'),courseId,kind,group:group.trim(),studentIds,task,artifact,versions:[version]});
  return n;
}
export function visibleGroupWorks(s:AppState,courseId:string) {
  requireCourse(s,courseId);
  return s.studio.groupWorks.filter((x)=>x.courseId===courseId&&(s.studio.actor.role==='teacher'||s.studio.actor.role==='student'&&x.studentIds.includes(s.studio.actor.id)));
}
export function interviewCapacity(students:number,counselors:number,block:number,conversation:number,handover:number) {
  for(const v of [students,counselors,block,conversation,handover])if(!Number.isFinite(v)||v<0)throw new Error(T('인원과 시간은 0 이상의 수로 입력하세요.'));
  if(!Number.isInteger(students)||!Number.isInteger(counselors)||conversation<=0)throw new Error(T('인원은 정수이고 대화 시간은 0보다 커야 합니다.'));
  const slot=conversation+handover,perCounselor=Math.floor(block/slot),capacity=counselors*perCounselor;
  return {slot,capacity,shortage:Math.max(0,students-capacity),staffMinutes:students*slot,extraMinutes:counselors?Math.ceil(students/counselors)*slot:null,requiredCounselors:perCounselor?Math.ceil(students/perCounselor):null};
}

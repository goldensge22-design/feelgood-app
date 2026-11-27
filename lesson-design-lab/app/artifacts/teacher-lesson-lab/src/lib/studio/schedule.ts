import { T } from '@/i18n/tx';
import { now, uid, type AppState } from '../store';
import type { Course, TimeRange } from './types';
import { copy, requireCourse, requireStudent } from './core';
import { buildAgenda } from './curriculum';
const overlaps=(a:TimeRange,b:TimeRange)=>a.start<b.end&&b.start<a.end;

export function rawSlots(s:AppState,c:Course) {
  const agenda=buildAgenda(c), ready=agenda.find((r)=>r.id.startsWith('v1')||r.id.startsWith('writing'))?.end;
  const breaks=agenda.filter((r)=>r.id.startsWith('break'));
  const duration=c.counseling.conversation+c.counseling.handover;
  if(duration<=0)return [];
  const out:{counselorId:string;start:number;end:number;available:boolean;reason:string}[]=[];
  for(const counselor of c.counseling.counselors)for(const block of c.counseling.blocks){
    for(let start=block.start;start+duration<=block.end;start+=duration){
      const range={start,end:start+duration};
      let reason='';
      if(counselor.lead)reason=T('전체 진행 강사는 같은 시간 전담 상담자로 계산하지 않습니다.');
      else if(ready===undefined||start<ready||range.end>c.counseling.deadline)reason=T('V1 이후와 수정 마감 전 슬롯만 예약할 수 있습니다.');
      else if(!counselor.available.some((a)=>a.start<=range.start&&a.end>=range.end))reason=T('상담자 가능 시간 밖');
      else if([...breaks,...c.counseling.absences].some((a)=>overlaps(a,range)))reason=T('휴식 또는 부재와 겹침');
      // Deduplicate overlapping configured blocks; never inflate capacity.
      if(!out.some((x)=>x.counselorId===counselor.id&&overlaps(x,range)))out.push({counselorId:counselor.id,...range,available:!reason,reason});
    }
  }return out;
}
export function counselingSlots(s:AppState,courseId:string) {
  const c=requireCourse(s,courseId);
  return rawSlots(s,c).map((slot)=>{
    const booking=s.studio.bookings.some((b)=>b.courseId===courseId&&b.status!=='cancelled'&&b.counselorId===slot.counselorId&&overlaps(slot,b));
    return {...slot,available:slot.available&&!booking,reason:slot.reason||(booking?T('이미 예약됨'):'')};
  });
}
export function counselingCapacity(s:AppState,id:string) {
  const c=requireCourse(s,id),slots=rawSlots(s,c),capacity=slots.filter((x)=>x.available).length;
  const students=c.studentIds.length, shortage=Math.max(0,students-capacity);
  const perPerson=slots.filter((x)=>x.available&&x.counselorId===c.counseling.counselors.find((p)=>!p.lead)?.id).length;
  const blockMinutes=c.counseling.blocks.reduce((sum,b)=>sum+b.end-b.start,0);
  const theoretical=Math.floor(blockMinutes/(c.counseling.conversation+c.counseling.handover))||1;
  return {capacity,students,shortage,requiredCounselors:Math.ceil(students/(perPerson||theoretical)),
    suggestions:shortage?[T('상담자를 추가하세요.'),T('시차 분반 또는 시간 연장을 검토하세요.'),T('후속 면담으로 일부 학생을 분산하세요.')]:[]};
}
export function bookSlot(s:AppState,writingId:string,counselorId:string,start:number) {
  const w=s.studio.writings.find((x)=>x.id===writingId);if(!w)throw new Error(T('V1을 먼저 저장하세요.'));
  requireStudent(s,w.courseId,w.studentId);
  if(!w.versions.length||!w.sharing.v1||!w.sharing.counselorIds.includes(counselorId))throw new Error(T('예약 상담자에게 V1을 선택 공유한 후 예약하세요.'));
  const slot=counselingSlots(s,w.courseId).find((x)=>x.counselorId===counselorId&&x.start===start&&x.available);
  if(!slot)throw new Error(T('상담 시간·휴식·부재·중복 예약을 확인하세요.'));
  if(s.studio.bookings.some((b)=>b.studentId===w.studentId&&b.status!=='cancelled'&&overlaps(b,slot)))throw new Error(T('학생의 다른 면담 예약과 시간이 겹칩니다.'));
  const n=copy(s);
  n.studio.bookings.push({id:uid('booking'),courseId:w.courseId,writingId,studentId:w.studentId,counselorId,start,end:slot.end,status:'booked'});
  n.studio.writings.find((x)=>x.id===writingId)!.status='scheduled';return n;
}
export function cancelBooking(s:AppState,id:string) {
  const b=s.studio.bookings.find((x)=>x.id===id);if(!b)throw new Error(T('예약이 없습니다.'));
  const c=requireCourse(s,b.courseId),actor=s.studio.actor;
  if(!(actor.role==='teacher'&&actor.id===c.ownerId)&&actor.id!==b.studentId&&actor.id!==b.counselorId)throw new Error(T('예약 변경 권한이 없습니다.'));
  const n=copy(s);n.studio.bookings.find((x)=>x.id===id)!.status='cancelled';return n;
}

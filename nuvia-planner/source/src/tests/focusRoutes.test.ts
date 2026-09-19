import {describe,expect,it} from 'vitest';
import {createTask} from '../adaptive/workspace';
import {focusRouteFor,focusRouteReady} from '../adaptive/focusRoutes';

describe('B profile age-specific activity contracts',()=>{
 it('maps all five age stages to independent stored routes',()=>{
  expect([
   focusRouteFor('A',true),focusRouteFor('A',false),focusRouteFor('B',false),focusRouteFor('C',false),focusRouteFor('D',false),
  ]).toEqual(['picture_routine','step_card','subject_scope','deadline_triage','handoff']);
 });
 it('requires picture materials and a confirmed first action for grades 1-3',()=>{
  const task={...createTask('숙제','책 펼기'),focusRoute:'picture_routine' as const,routeConfirmed:true,materials:[{id:'m',title:'책',done:true}]};
  expect(focusRouteReady(task,'A',true,false)).toBe(true);
  expect(focusRouteReady({...task,materials:[{...task.materials[0],done:false}]},'A',true,false)).toBe(false);
 });
 it('requires a chosen card and return location for grades 4-6',()=>{
  const task={...createTask('숙제','1단계'),focusRoute:'step_card' as const,routeConfirmed:true,resumeNote:'2단계로 돌아오기'};
  expect(focusRouteReady(task,'A',false,false)).toBe(true);
  expect(focusRouteReady({...task,routeConfirmed:false},'A',false,false)).toBe(false);
 });
 it('requires subject/scope/amount and a ten-minute resume plan after interruption for middle school',()=>{
  const task={...createTask('수학','10번 풀기'),focusRoute:'subject_scope' as const,subject:'수학',learningScope:'10~20번',minutes:20};
  expect(focusRouteReady(task,'B',false,false)).toBe(true);
  expect(focusRouteReady(task,'B',false,true)).toBe(false);
  expect(focusRouteReady({...task,remainingScope:'15~20번',nextTenAction:'15번부터 풀기'},'B',false,true)).toBe(true);
 });
 it('requires deadline triage decisions and real split steps for high school',()=>{
  const task={...createTask('수행평가','자료 찾기'),focusRoute:'deadline_triage' as const,deadlineDecision:'continue' as const};
  expect(focusRouteReady(task,'C',false,false)).toBe(true);
  expect(focusRouteReady({...task,deadlineDecision:'split'},'C',false,false)).toBe(false);
  expect(focusRouteReady({...task,deadlineDecision:'split',steps:[...task.steps,{id:'2',title:'요약하기',done:false,date:''}]},'C',false,false)).toBe(true);
 });
 it('requires an actionable handoff category and memo for college/adult',()=>{
  const task={...createTask('업무','답장 작성'),focusRoute:'handoff' as const,handoffState:'now' as const,adjustment:'담당자 확인 후 3시에 재확인'};
  expect(focusRouteReady(task,'D',false,false)).toBe(true);
  expect(focusRouteReady({...task,handoffState:'waiting',waiting:true},'D',false,false)).toBe(false);
 });
});

import {describe,expect,it} from 'vitest';
import {dateForReschedule,timeAdjustmentLabel,timeDifferenceText} from '../adaptive/PlannerEnhancements';
import {blankWorkspace,createTask,scopeFor,validateWorkspace} from '../adaptive/workspace';
import {DEMOS} from '../adaptive/engine';

describe('planner 2.5 adjustment helpers',()=>{
 it('describes predicted and actual time neutrally',()=>{
  expect(timeDifferenceText(20,35)).toBe('실제 시간이 예상보다 15분 길었어요.');
  expect(timeDifferenceText(20,12)).toBe('실제 시간이 예상보다 8분 짧았어요.');
  expect(timeDifferenceText(20,20)).toBe('예상과 실제가 모두 20분이었어요.');
 });
 it('keeps all three next-plan choices explicit',()=>{
  expect(['reduce','split','same'].map(x=>timeAdjustmentLabel(x as any))).toEqual(['시간을 줄여 보기','일을 나누어 보기','다음에도 같은 시간으로 하기']);
 });
 it('reschedules only to the selected date bucket',()=>{
  expect(dateForReschedule('today','2026-09-18')).toBe('2026-09-18');
  expect(dateForReschedule('tomorrow','2026-09-18')).toBe('2026-09-19');
  expect(dateForReschedule('week','2026-09-18','2026-09-20')).toBe('2026-09-20');
 });
 it('round-trips saved adjustment and reschedule metadata',()=>{
  const scope=scopeFor('demo',DEMOS[0],'A'),workspace=blankWorkspace(scope),task=createTask('실제 과제','첫 단계');
  Object.assign(task,{timeAdjustment:'split',planningReference:'reduce',rescheduleChoice:'tomorrow',rescheduledAt:'2026-09-18T12:00:00.000Z'});
  workspace.tasks=[task];
  expect(validateWorkspace(JSON.parse(JSON.stringify(workspace)),scope).tasks[0]).toMatchObject({timeAdjustment:'split',planningReference:'reduce',rescheduleChoice:'tomorrow'});
 });
});

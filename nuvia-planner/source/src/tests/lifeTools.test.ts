import {describe,it,expect} from 'vitest';
import {nextRepeat,recentStreak,weeklyRecordDays} from '../adaptive/LifeTools';
import {createTask} from '../adaptive/workspace';
describe('repeat occurrences and neutral completion history',()=>{
 it('skips weekends and creates clean independent copies',()=>{const t={...createTask('운동','준비'),repeat:'weekdays' as const,date:'2026-09-18',waiting:true,dependsOn:'old',practice:{firstId:'x',reason:'deadline',focusAction:'park',parked:'memo',returns:4}};t.steps[0].done=true;t.materials=[{id:'m',title:'신발',done:true}];const n=nextRepeat(t,'2026-09-18')!;expect(n.date).toBe('2026-09-21');expect(n.repeatOf).toBe(t.id);expect(n.steps[0].done).toBe(false);expect(n.steps[0].id).not.toBe(t.steps[0].id);expect(n.materials[0].done).toBe(false);expect(n.dependsOn).toBe('');expect(n.practice).toBeUndefined();expect(n.waiting).toBe(false);});
 it('does not generate missed-day backlog',()=>{const t={...createTask('숙제','준비'),date:'2020-01-01',repeat:'daily' as const};expect(nextRepeat(t,'2026-09-14')?.date).toBe('2026-09-15');});
 it('does not recur when not selected',()=>expect(nextRepeat(createTask('숙제','준비'))).toBe(null));
 it('counts unique local days and retains yesterday until today is complete',()=>{const a=['2026-09-12','2026-09-13','2026-09-13'].map(d=>({...createTask('일','행동'),status:'done' as const,completedAt:d+'T12:00:00'}));expect(recentStreak(a,'2026-09-14')).toBe(2);expect(recentStreak(a,'2026-09-16')).toBe(0);});
 it('shows weekly recorded days without resetting or penalizing gaps',()=>{const dates=['2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-19','2026-09-20'];const tasks=['2026-09-14','2026-09-16','2026-09-16'].map(d=>({...createTask('일','행동'),status:'done' as const,completedAt:d+'T12:00:00'}));expect(weeklyRecordDays(tasks,dates)).toEqual({count:2,days:[true,false,true,false,false,false,false]});});
});

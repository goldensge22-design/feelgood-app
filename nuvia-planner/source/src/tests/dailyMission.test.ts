import {describe,it,expect} from 'vitest';
import {dailyScenario,checkDailyPlan} from '../adaptive/dailyMission';
import type {Band} from '../adaptive/engine';
describe('daily planner order constraints',()=>{
 it('allows two meaningful elementary orders',()=>{const s=dailyScenario('A');expect(checkDailyPlan(s,['fix','pack','send'])).toEqual([]);expect(checkDailyPlan(s,['fix','send','pack'])).toEqual([]);});
 it('blocks sending before finishing',()=>expect(checkDailyPlan(dailyScenario('A'),['send','pack','fix']).join()).toContain('다음'));
 it('middle deadline changes which otherwise valid plan works',()=>{expect(checkDailyPlan(dailyScenario('B'),['fix','pack','send']).join()).toContain('15분');expect(checkDailyPlan(dailyScenario('B'),['fix','send','pack'])).toEqual([]);});
 it('older learners need review before delivery',()=>{for(const b of ['C','D'] as Band[]){const s=dailyScenario(b);expect(checkDailyPlan(s,['fix','review','send','pack'])).toEqual([]);expect(checkDailyPlan(s,['fix','send','review','pack']).length).toBeGreaterThan(0);expect(s.tasks.reduce((n,t)=>n+t.minutes,0)).toBe(s.total);}});
 it('rejects duplicates and omitted jobs',()=>{expect(checkDailyPlan(dailyScenario('A'),['fix','fix','send']).length).toBeGreaterThan(0);expect(checkDailyPlan(dailyScenario('A'),[]).length).toBeGreaterThan(0);});
});

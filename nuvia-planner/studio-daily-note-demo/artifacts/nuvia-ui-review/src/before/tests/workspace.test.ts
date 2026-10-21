import {describe,it,expect} from 'vitest';
import {blankWorkspace,createTask,scopeFor,validateWorkspace,canDependOn,dependencyBlocked,localDate,weekDates} from '../adaptive/workspace';
import {DEMOS} from '../adaptive/engine';
const scope=scopeFor('demo',DEMOS[0],'A');
describe('2.0 personal workspace safety',()=>{
 it('round trips editable task and materials',()=>{const w=blankWorkspace(scope);const t=createTask('내 실제 과제','자료 펼치기');t.materials.push({id:'m1',title:'내 준비물',done:false});w.tasks.push(t);expect(validateWorkspace(JSON.parse(JSON.stringify(w)),scope)).toEqual(w);});
 it('isolates mode, identity and band',()=>{const w=blankWorkspace(scope);expect(()=>validateWorkspace(w,scopeFor('production',DEMOS[0],'A'))).toThrow();expect(()=>validateWorkspace(w,scopeFor('demo',DEMOS[1],'A'))).toThrow();expect(()=>validateWorkspace(w,scopeFor('demo',DEMOS[0],'B'))).toThrow();});
 it('rejects malformed nested items and invalid dates',()=>{const w=blankWorkspace(scope);w.tasks.push(createTask('과제','시작'));w.tasks[0].steps[0].date='2026-02-31';expect(()=>validateWorkspace(w,scope)).toThrow();w.tasks[0].steps[0].date='';(w.tasks[0].materials as any)=[null];expect(()=>validateWorkspace(w,scope)).toThrow();});
 it('rejects duplicate ids and unconfirmed completions',()=>{const w=blankWorkspace(scope),t=createTask('과제','시작');w.tasks=[t,{...t}];expect(()=>validateWorkspace(w,scope)).toThrow();w.tasks=[t];t.status='done';expect(()=>validateWorkspace(w,scope)).toThrow();});
 it('prevents self dependencies, missing targets and cycles',()=>{const a=createTask('A','첫 단계'),b=createTask('B','첫 단계'),c=createTask('C','첫 단계');a.dependsOn=b.id;b.dependsOn=c.id;const ts=[a,b,c];expect(canDependOn(ts,c.id,a.id)).toBe(false);expect(canDependOn(ts,c.id,c.id)).toBe(false);expect(canDependOn(ts,c.id,'missing')).toBe(false);expect(canDependOn(ts,a.id,c.id)).toBe(true);c.dependsOn=a.id;const w={...blankWorkspace(scope),tasks:ts};expect(()=>validateWorkspace(w,scope)).toThrow();});
 it('unblocks only after predecessor completion',()=>{const a=createTask('A','처음'),b=createTask('B','다음');b.dependsOn=a.id;expect(dependencyBlocked(b,[a,b])).toBe(true);a.status='done';expect(dependencyBlocked(b,[a,b])).toBe(false);});
 it('rejects foreign completion records',()=>{const w=blankWorkspace(scope);w.records=[{id:'x',createdAt:new Date().toISOString(),kind:'real_task',source:'self_report',context:{mode:'production',profileKey:'other',band:'A',rulesVersion:'planner-2.0'},measures:{}} as any];expect(()=>validateWorkspace(w,scope)).toThrow();});
 it('returns current week with local dates',()=>{const dates=weekDates();expect(dates).toHaveLength(7);expect(dates).toContain(localDate());expect(new Date(dates[0]+'T12:00:00').getDay()).toBe(1);});
});

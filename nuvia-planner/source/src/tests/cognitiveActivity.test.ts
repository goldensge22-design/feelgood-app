import {it,expect} from 'vitest';
import {emptyPractice,practiceReady} from '../adaptive/CognitiveActivity';
import {createTask,blankWorkspace,validateWorkspace,scopeFor} from '../adaptive/workspace';
import {DEMOS} from '../adaptive/engine';
it('planning requires first-action decision and rationale; changing order invalidates it',()=>{const t=createTask('목표','자료 읽기');expect(practiceReady(t,false)).toBe(false);t.practice={...emptyPractice,firstId:t.steps[0].id,reason:'dependency'};expect(practiceReady(t,false)).toBe(true);t.steps.unshift({id:'other',title:'다른 행동',date:'',done:false});expect(practiceReady(t,false)).toBe(false);});
it('attention has its own start condition, independent of planning answers',()=>{const t=createTask('목표','자료 읽기');t.practice={...emptyPractice,focusAction:'park'};expect(practiceReady(t,true)).toBe(true);expect(practiceReady(t,false)).toBe(false);});
it('existing workspaces remain compatible; malformed practice is rejected',()=>{const scope=scopeFor('demo',DEMOS[0],'A'),w=blankWorkspace(scope);const t=createTask('목표','첫 행동');w.tasks.push(t);expect(validateWorkspace(w,scope)).toEqual(w);t.practice={...emptyPractice,returns:-1};expect(()=>validateWorkspace(w,scope)).toThrow();});

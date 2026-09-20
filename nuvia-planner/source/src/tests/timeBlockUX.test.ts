import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import TimeBlockBoard from '../adaptive/TimeBlockBoard';
import {blankWorkspace,createTask,type PlannerTask} from '../adaptive/workspace';
import {newTimeBlock} from '../adaptive/timeBlocks';
const task=():PlannerTask=>({...createTask('수학','문제집 1~10번'),minutes:15,timeBlock:newTimeBlock('19:00',15)});
const screen=(t:PlannerTask)=>renderToStaticMarkup(React.createElement(TimeBlockBoard,{data:{...blankWorkspace('test'),tasks:[t]},band:'A',lower:false,focused:false,selected:t.id,select:()=>{},commit:()=>{},complete:()=>{}}));
describe('simple timer entry',()=>{
 it('shows the duration and start button without a premature return memo or duplicate step choice',()=>{const html=screen(task());expect(html).toContain('15분 시작');expect(html).toContain('aria-label="시작 전 시간"');expect(html).not.toContain('aria-label="계획 다음 시작 위치"');expect(html).not.toContain('aria-label="지금 할 단계 카드"');expect(html).not.toContain('시간·범위·단계 수정');});
 it('asks for the return position only once paused and keeps an existing note',()=>{const t=task();t.status='paused';t.timeBlock!.phase='paused';t.timeBlock!.nextStart='13번부터';const html=screen(t);expect(html).toContain('aria-label="중단 다음 시작 위치"');expect(html).toContain('value="13번부터"');expect(html).toContain('이어서 시작');});
 it('keeps deliberate step selection for a multi-step task',()=>{const t=task();t.steps.push({id:'second',title:'답 확인',done:false,date:''});const html=screen(t);expect(html).toContain('aria-label="지금 할 단계 카드"');expect(html).toContain('disabled="">15분 시작');});
});

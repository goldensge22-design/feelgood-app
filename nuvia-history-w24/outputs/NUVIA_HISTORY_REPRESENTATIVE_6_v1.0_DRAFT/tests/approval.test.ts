import test from 'node:test';import assert from 'node:assert/strict';
import approved from '../src/content/w01-age-approved.ko.json';import {loadContent} from '../src/core/content';import {AGE_BANDS} from '../src/core/types';
test('twelve approved rows; exact five corrected fields and plain age IDs',async()=>{
 assert.equal(approved.length,12);assert.equal(new Set(approved.map(r=>r.conditionId+'|'+r.ageBandRuleId)).size,12);const row=(suffix:string,age:string)=>approved.find(r=>r.conditionId.endsWith(suffix)&&r.ageBandRuleId===`nuvia.age.${age}.v1`)!;
 assert.equal(row('.c1','preschool').displayedPrompt,'곡물 둘 자리가 작아지면 어디에 둘까요?');
 assert.equal(row('.c1','elementary-high').instructionText,'같은 적재 방식에서 직접 달라지는 점과, 다른 저장 자리가 있는지 확인한 뒤 가능한 대응을 구분해요.');
 assert.equal(row('.c2','elementary-low').displayedPrompt,'갈돌을 하나 쓸 수 없으면 다음에는 어떻게 할까요?');
 assert.equal(row('.c2','elementary-low').instructionText,'갈돌과 곡물을 잇고 가능한 다음 작업을 말이나 그림으로 남겨요.');
 assert.equal(row('.c2','elementary-high').instructionText,'도구 수의 직접 변화와, 다른 도구가 있는지 확인하거나 작업 차례를 바꾸는 대응을 구분해요.');
 const b=await loadContent();for(const r of approved){assert.ok(AGE_BANDS.some(age=>r.ageBandRuleId===`nuvia.age.${age}.v1`));assert.ok(!r.ageBandRuleId.includes('\\'));assert.ok(r.displayedPrompt.trim()&&r.instructionText.trim());assert.ok(!/조건별 표현 없음|농경·정착이 실패|농경이나 정착이 실패|어떤 도구를 찾을까요|다른 저장 자리를 이용하는 대응/.test(r.displayedPrompt+r.instructionText));const c=b.missions.flatMap(m=>m.conditions).find(c=>c.id===r.conditionId)!;const a=Object.values(c.ageVariants).find(a=>a.ageBandRuleId===r.ageBandRuleId)!;assert.equal(b.strings[a.promptKey],r.displayedPrompt);assert.equal(b.strings[a.instructionKey],r.instructionText);}
});

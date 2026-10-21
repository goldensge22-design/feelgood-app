import assert from 'node:assert/strict';
import {createStudio,updateStudio} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {validate,exportBackup,importBackup,checksum} from '../../artifacts/nuvia-ui-review/src/studio/persistence';
import {reportHTML} from '../../artifacts/nuvia-ui-review/src/studio/report';
import {locales} from '../../artifacts/nuvia-ui-review/src/studio/i18n/config';
import {resources,t} from '../../artifacts/nuvia-ui-review/src/studio/i18n/runtime';
let count=0;
function check(fn:()=>void){fn();count++;}
const at='2026-10-21T10:00:00Z',date='2026-10-21',secret='PRIVATE_NOTE_SENTINEL <script>alert(1)</script>';
let s=createStudio(at);
s=validate(updateStudio(s,{type:'studio.setup',stage:'middle'},at));
const before=structuredClone(s);
s=validate(updateStudio(s,{type:'studio.note',date,text:secret},at));
check(()=>assert.equal(s.studio?.dailyNotes?.[date].text,secret));
for(const k of ['lab','meta','agreements','entries','drafts','assessmentHistory','insights'] as const)check(()=>assert.deepEqual(s[k],before[k]));
check(()=>assert.deepEqual(s.studio?.sources,before.studio?.sources));
for(let i=0;i<5;i++)s=validate(updateStudio(s,{type:'studio.note',date,text:secret+' '+i},at));
check(()=>assert.equal(Object.keys(s.studio!.dailyNotes!).length,1));
check(()=>assert.equal(s.studio?.dailyNotes?.[date].text,secret+' 4'));
s=validate(updateStudio(s,{type:'studio.note',date:'2026-10-20',text:'Yesterday'},at));
check(()=>assert.equal(Object.keys(s.studio!.dailyNotes!).length,2));
check(()=>assert.equal(validate(JSON.parse(JSON.stringify(s))).studio?.dailyNotes?.[date].text,secret+' 4'));
for(const invalid of ['2026-02-30','2026-13-01','__proto__','2026-1-1'])check(()=>assert.throws(()=>updateStudio(s,{type:'studio.note',date:invalid,text:'x'},at)));
check(()=>assert.throws(()=>updateStudio(s,{type:'studio.note',date,text:'a'.repeat(20001)},at)));
const malformed=structuredClone(s);malformed.studio!.dailyNotes!['2026-02-30']={text:'bad',updatedAt:at};
check(()=>assert.throws(()=>validate(malformed)));
check(()=>assert(!reportHTML(s,'2026-10',{summary:true,evidence:true,methods:true,outputs:true,assessment:true}).includes('PRIVATE_NOTE_SENTINEL')));
for(const locale of locales){
 const translated=validate(updateStudio(s,{type:'studio.locale',locale},at));
 check(()=>assert.deepEqual(translated.studio?.dailyNotes,s.studio?.dailyNotes));
 const keys=Object.keys(resources[locale]).filter(k=>k.startsWith('note.'));
 check(()=>assert.equal(keys.length,20));
 for(const key of keys)check(()=>{const value=t(key,{},locale);assert(value);if(locale!=='ko')assert(!/[가-힣]/.test(value));});
}
for(const scope of ['personal','workspace'] as const){
 const target=structuredClone(s);if(scope==='workspace')target.mode='review';
 const backup=await exportBackup(target,scope);
 check(()=>assert(backup.includes('PRIVATE_NOTE_SENTINEL')));
 check(()=>assert.deepEqual(JSON.parse(backup).data.studio.dailyNotes,target.studio?.dailyNotes));
 const restored=await importBackup(backup,target);
 check(()=>assert.deepEqual(restored.studio?.dailyNotes,target.studio?.dailyNotes));
 const old=JSON.parse(backup);delete old.data.studio.dailyNotes;old.checksum=await checksum(old.data);
 const legacy=await importBackup(JSON.stringify(old),target);
 check(()=>assert.equal(legacy.studio?.dailyNotes,undefined));
 check(()=>assert.deepEqual(legacy.lab.students['student-a'].cards,target.lab.students['student-a'].cards));
 const corrupt=JSON.parse(backup);corrupt.data.studio.dailyNotes[date].text='tampered';
 await assert.rejects(importBackup(JSON.stringify(corrupt),target));count++;
 const other=JSON.parse(backup);other.workspaceId='someone-else';
 await assert.rejects(importBackup(JSON.stringify(other),target));count++;
}
s=validate(updateStudio(s,{type:'studio.note',date,text:''},at));
check(()=>assert.equal(s.studio?.dailyNotes?.[date].text,''));
console.log(`Daily notes: ${count} assertions PASS (including 15 locale resources, private report exclusion, personal/workspace and old backup compatibility).`);

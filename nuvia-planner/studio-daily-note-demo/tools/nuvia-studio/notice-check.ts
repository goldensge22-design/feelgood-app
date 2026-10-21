import assert from 'node:assert/strict';
import {noticeFromText,noticeText,SAVED_NOTICE_KEY} from '../../artifacts/nuvia-ui-review/src/studio/notices';
import {resources,t,setLocale} from '../../artifacts/nuvia-ui-review/src/studio/i18n/runtime';
import {locales} from '../../artifacts/nuvia-ui-review/src/studio/i18n/config';
import {createStudio,updateStudio} from '../../artifacts/nuvia-ui-review/src/studio/studio-logic';
import {validate,exportBackup,importBackup} from '../../artifacts/nuvia-ui-review/src/studio/persistence';
import {student} from '../../artifacts/nuvia-ui-review/src/studio/domain';
let checks=0;
function check(fn:()=>void){fn();checks++;}
const at='2026-10-21T10:00:00Z';
let s=createStudio(at);
const act=(a:Parameters<typeof updateStudio>[1])=>{s=validate(updateStudio(s,a,at));};
act({type:'studio.setup',stage:'high'});
act({type:'create',title:'Synthetic retained plan',scope:'1–3',minutes:25,date:'2026-10-21'});
const cardId=student(s).cards.at(-1)!.id;
act({type:'studio.place',cardId});
act({type:'legacy',command:{type:'run.start',cardId}});
act({type:'studio.note',date:'2026-10-21',text:'Synthetic retained note / 원문 보존'});
const records=JSON.stringify(s.lab.students),notes=JSON.stringify(s.studio!.dailyNotes);
const plans=JSON.stringify({meta:s.meta,agreements:s.agreements,entries:s.entries,drafts:s.drafts,placements:s.studio!.placements});
const saved={key:SAVED_NOTICE_KEY};
for(const previous of locales){
 setLocale(previous);
 const captured=noticeFromText(t(SAVED_NOTICE_KEY));
 check(()=>assert.deepEqual(captured,saved));
 for(const next of locales){
  // Render must use requested locale, even while ambient runtime is still previous.
  check(()=>assert.equal(noticeText(saved,next),resources[next][SAVED_NOTICE_KEY]));
  check(()=>assert.equal(noticeText(captured,next),resources[next][SAVED_NOTICE_KEY]));
 }
}
for(const locale of locales){
 act({type:'studio.locale',locale});
 check(()=>assert.equal(JSON.stringify(s.lab.students),records));
 check(()=>assert.equal(JSON.stringify(s.studio!.dailyNotes),notes));
 check(()=>assert.equal(JSON.stringify({meta:s.meta,agreements:s.agreements,entries:s.entries,drafts:s.drafts,placements:s.studio!.placements}),plans));
 check(()=>assert.equal(noticeText(saved,locale),t(SAVED_NOTICE_KEY,{},locale)));
 check(()=>assert.equal(student(s).runs.at(-1)!.phase,'running'));
}
const backup=await exportBackup(s,'personal'),restored=await importBackup(backup,s);
check(()=>assert.equal(JSON.stringify(restored.studio!.dailyNotes),notes));
check(()=>assert.equal(student(restored).runs.at(-1)!.phase,'paused'));
check(()=>assert(!JSON.stringify(s).includes(SAVED_NOTICE_KEY)));
check(()=>assert.equal(noticeText(null,'ko'),''));
check(()=>assert.equal(noticeText(noticeFromText('Unmapped diagnostic'),'az'),'Unmapped diagnostic'));
setLocale('ko');
console.log(`PASS notifications: ${checks} assertions; all 225 locale transitions (including az→ko), key-based current-language rendering, note/active-run/plan preservation, backup.`);

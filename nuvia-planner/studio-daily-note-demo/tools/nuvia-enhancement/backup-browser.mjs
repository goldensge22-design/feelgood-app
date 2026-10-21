import fs from 'node:fs';
import assert from 'node:assert/strict';
import {browser,sleep} from './browser-lib.mjs';
const dir='/tmp/nuvia-enhancement-ui-backup';fs.mkdirSync(dir,{recursive:true});
const b=await browser(9236);
try{
 await b.go('/enhancement.html');
 await b.call('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
 await b.click('[data-testid="button-backup"]');
 const filename=dir+'/NUVIA_synthetic_enhancement_backup.json';
 for(let i=0;i<40&&!fs.existsSync(filename);i++)await sleep(100);
 assert(fs.existsSync(filename));
 const original=await b.state();
 await b.fill('[data-testid="input-new-title"]','백업 이후 추가한 합성 블록');await b.click('[data-testid="button-create-card"]');
 assert.equal((await b.state()).students['student-a'].cards.length,3);
 const upload=async file=>{
  await b.call('DOM.enable');const doc=await b.call('DOM.getDocument');
  const q=await b.call('DOM.querySelector',{nodeId:doc.root.nodeId,selector:'[data-testid="input-restore"]'});
  await b.call('DOM.setFileInputFiles',{nodeId:q.nodeId,files:[file]});await sleep(350);
 };
 await b.run('window.confirm=()=>true');await upload(filename);
 assert.deepEqual(await b.state(),original);
 await b.go('/enhancement.html');assert.deepEqual(await b.state(),original);
 const damaged=dir+'/damaged.json';fs.writeFileSync(damaged,fs.readFileSync(filename,'utf8').replace('발표 자료 준비하기','무단 변경'));
 await upload(damaged);assert.deepEqual(await b.state(),original);
 assert((await b.run('document.querySelector("[data-testid=text-message]").textContent')).includes('검사값이 맞지'));
 await b.run(`(async()=>{const {createLab}=await import('/src/enhancement/domain.ts');const {exportLab}=await import('/src/enhancement/persistence.ts');window.foreignBackup=await exportLab(createLab());})()`);
 const foreign=dir+'/foreign.json';fs.writeFileSync(foreign,await b.run('window.foreignBackup'));
 await upload(foreign);assert.deepEqual(await b.state(),original);
 assert((await b.run('document.querySelector("[data-testid=text-message]").textContent')).includes('이 검토 공간에서 내려받은'));
 assert.deepEqual(b.errors,[]);console.log('PASS UI: backup download → modify → validated restore → reconnect; corrupt and foreign files rejected without writes.');
}finally{b.close();}

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url))),app=path.join(root,'artifacts/teacher-lesson-lab');
const command=process.argv[2]??'dev',pnpm=process.platform==='win32'?'pnpm.cmd':'pnpm';
const qa=command==='qa'||command==='unit',port=process.env.PORT??(qa?'5175':'5173'),cdp=process.env.QA_CDP_PORT??'9233';
const origin=`http://127.0.0.1:${port}`,env={...process.env,PORT:port,BASE_PATH:process.env.BASE_PATH??'/'};
const processes=new Set();
function start(bin,args,options={}){
 const child=spawn(bin,args,{cwd:root,env,stdio:'inherit',detached:process.platform!=='win32',shell:process.platform==='win32'&&bin===pnpm,...options});
 processes.add(child);child.on('exit',()=>processes.delete(child));return child;
}
const wait=child=>new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error(`Command failed (${code})`)))});
async function ready(url){for(let i=0;i<300;i++){try{if((await fetch(url)).ok)return}catch{}await new Promise(r=>setTimeout(r,100))}throw Error(`Server did not become ready: ${url}`)}
const out=path.join(root,'generated-artifacts/lesson-lab-report-history-qa');
await fs.mkdir(out,{recursive:true});await fs.mkdir(path.join(root,'generated-artifacts/lesson-lab-qa'),{recursive:true});
await fs.mkdir(path.join(root,'generated-artifacts/lesson-lab-star-qa'),{recursive:true});
async function test(file,log){
 const source=await fs.readFile(path.join(app,'scripts',file),'utf8');
 // Disposable test copy only: preserve original test logic and app source, replace Replit routing/temp paths.
 const adapted=source.replaceAll('http://127.0.0.1:80',origin)
   .replaceAll('https://${process.env.REPLIT_DEV_DOMAIN}',origin)
   .replaceAll('http://127.0.0.1:9227',`http://127.0.0.1:${cdp}`)
   .replaceAll('/tmp/',os.tmpdir().replaceAll('\\','/')+'/');
 const temp=path.join(app,'scripts',`.portable-${file}`);
 await fs.writeFile(temp,adapted);
 const output=await fs.open(path.join(out,log),'w');
 try{console.log(`RUN ${file}`);await wait(start(process.execPath,[temp],{stdio:['ignore',output.fd,output.fd]}))}
 finally{await output.close();await fs.rm(temp,{force:true})}
}
try{
 if(!qa){
   if(command==='typecheck'){await wait(start(pnpm,['exec','tsc','--build']));await wait(start(pnpm,['--filter','@workspace/teacher-lesson-lab','typecheck']))}
   else if(['dev','build','preview'].includes(command))await wait(start(pnpm,['--filter','@workspace/teacher-lesson-lab',command==='preview'?'serve':command]));
   else throw Error('Commands: dev, build, preview, typecheck, unit, qa');
 }else{
   await test('studio-checks.mjs','core.log');
   await test('diagnostics.mjs','legacy.log');
   await test('language-regressions.mjs','language-regression.log');
   await test('u09-language-regressions.mjs','u09-regression.log');
   await test('report-history-checks.mjs','new-logic.log');
   await test('star-coach-checks.mjs','star-logic.log');
   if(command==='qa'){
     if(!process.env.CHROME_BIN)throw Error('Set CHROME_BIN to Chrome/Chromium. Also install pdfinfo, pdftotext, pdffonts (Poppler).');
     start(pnpm,['--filter','@workspace/teacher-lesson-lab','dev']);
     const profile=await fs.mkdtemp(path.join(os.tmpdir(),'lesson-lab-handoff-chrome-'));
     const chrome=start(process.env.CHROME_BIN,['--headless','--no-sandbox','--disable-dev-shm-usage',`--remote-debugging-port=${cdp}`,`--user-data-dir=${profile}`,'about:blank']);
     await ready(origin);await ready(`http://127.0.0.1:${cdp}/json/version`);
     await test('browser-studio-checks.mjs','browser-existing.log');
     await test('browser-report-history-checks.mjs','new-browser.log');
     await test('browser-star-coach-checks.mjs','star-browser.log');
     // Report builder expects successful type/build logs: run real checks, never seed success text.
     for(const [name,args]of [['typecheck',['--filter','@workspace/teacher-lesson-lab','typecheck']],['build',['--filter','@workspace/teacher-lesson-lab','build']]]){
       const log=await fs.open(path.join(out,`${name}.log`),'w');
       try{await wait(start(pnpm,args,{stdio:['ignore',log.fd,log.fd]}))}finally{await log.close()}
     }
     await test('report-history-report.mjs','report.log');
     await test('star-coach-report.mjs','star-report.log');
     console.log(`QA completed. Fresh baseline evidence: ${out}. STAR evidence: generated-artifacts/lesson-lab-star-qa/`);
     chrome.kill();
   }else console.log('Unit scope: existing 508 checks + new STAR logic checks. Browser/PDF checks not run.');
 }
}catch(e){console.error(e);process.exitCode=1}
finally{for(const child of processes){try{if(process.platform==='win32')child.kill();else process.kill(-child.pid,'SIGTERM')}catch{}}}

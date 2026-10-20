import fs from 'node:fs';
import {spawn} from 'node:child_process';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function browser(port=9231){
 const chrome=spawn('chromium',['--headless','--no-sandbox','--disable-dev-shm-usage',`--remote-debugging-port=${port}`,'--remote-allow-origins=*',`--user-data-dir=/tmp/nuvia-enhancement-qa-${process.pid}`,'about:blank'],{stdio:'ignore'});
 let targets;
 for(let i=0;i<60;i++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json`)).json();if(targets?.length)break;}catch{}await sleep(100);}
 if(!targets?.length)throw Error('Chromium startup failed');
 const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 const pending=new Map();let id=0;const errors=[];
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}
  if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
  if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args.map(a=>a.value||a.description).join(' '));
 };
 const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
 const run=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
 const wait=async expression=>{for(let i=0;i<60;i++){if(await run(expression))return;await sleep(80);}throw Error('Timeout: '+expression);};
 const origin=process.env.REPLIT_DEV_DOMAIN?`https://${process.env.REPLIT_DEV_DOMAIN}`:'http://localhost:80';
 const go=async path=>{await call('Page.navigate',{url:origin+path});await wait('!!document.querySelector(".nx-root")');await sleep(120);};
 const rect=async expression=>{await wait(`!!(${expression})`);return run(`(()=>{const e=${expression};e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);};
 const clickExpr=async expr=>{const p=await rect(expr);await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...p});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...p});await sleep(100);};
 const click=selector=>clickExpr(`document.querySelector(${JSON.stringify(selector)})`);
 const clickText=(text,scope='document')=>clickExpr(`Array.from(${scope}.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(text)})`);
 const inputExpr=async(expr,value)=>{await wait(`!!(${expr})`);await run(`(()=>{const e=${expr};const proto=e.tagName==='SELECT'?HTMLSelectElement.prototype:e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(80);};
 const fill=(selector,value)=>inputExpr(`document.querySelector(${JSON.stringify(selector)})`,value);
 const fillLabel=(text,value,scope='document')=>inputExpr(`Array.from(${scope}.querySelectorAll('label')).find(e=>e.textContent.trim().startsWith(${JSON.stringify(text)}))?.querySelector('input:not([type=checkbox]),textarea,select')`,value);
 const image=async name=>{await run('scrollTo(0,0)');const r=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.mkdirSync('screenshots/enhancement',{recursive:true});fs.writeFileSync(`screenshots/enhancement/${name}.png`,Buffer.from(r.data,'base64'));};
 const state=()=>run('JSON.parse(localStorage.getItem("nuvia:enhancement:synthetic:v1"))');
 const reset=async()=>{await run('for(const k of ["nuvia:enhancement:synthetic:v1","nuvia:enhancement:synthetic:v1:id"])localStorage.removeItem(k);sessionStorage.clear()');await go('/enhancement.html');};
 const viewport=(width,height=900)=>call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
 await call('Page.enable');await call('Runtime.enable');
 return {call,run,wait,go,click,clickText,inputExpr,fill,fillLabel,image,state,reset,viewport,errors,close:()=>{socket.close();chrome.kill();}};
}

import {browser as base,sleep} from '../nuvia-enhancement/browser-lib.mjs';
export {sleep};
/** Follow the actual optional-disclosure path before driving its control. */
export async function browser(port){
 const b=await base(port);
 const call=b.call;
 b.call=async(method,args)=>{const r=await call(method,args);if(method==='Page.reload'||method==='Page.navigate')await sleep(350);return r;};
 const reveal=async expression=>b.run(`(()=>{const e=${expression};if(!e)return;const a=[];for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open)a.push(p);a.reverse().forEach(p=>p.querySelector(':scope > summary')?.click());})()`);
 const click=b.click,fill=b.fill,input=b.inputExpr,text=b.clickText,label=b.fillLabel;
 b.click=async s=>{await reveal(`document.querySelector(${JSON.stringify(s)})`);return click(s);};
 b.fill=async(s,v)=>{await reveal(`document.querySelector(${JSON.stringify(s)})`);return fill(s,v);};
 b.inputExpr=async(e,v)=>{await reveal(e);return input(e,v);};
 b.clickText=async(t,scope='document')=>{await reveal(`Array.from(${scope}.querySelectorAll('button')).find(e=>e.textContent.trim()===${JSON.stringify(t)})`);return text(t,scope);};
 b.fillLabel=async(t,v,scope='document')=>{await reveal(`Array.from(${scope}.querySelectorAll('label')).find(e=>e.textContent.trim().startsWith(${JSON.stringify(t)}))?.querySelector('input:not([type=checkbox]),textarea,select')`);return label(t,v,scope);};
 return b;
}

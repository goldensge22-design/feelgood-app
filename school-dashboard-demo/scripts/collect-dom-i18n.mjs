import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(import.meta.dirname,'..');
const base=process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8767';

function stableKey(value){
  let hash=2166136261;
  for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return `dom.${(hash>>>0).toString(36)}`;
}

function normalize(value){
  let index=0;
  return value.replace(/\b(?:Class\s+[A-Z0-9-]+|(?:BIZ|EDU|ART|MED|ICT)[0-9]+|[A-Z][0-9]+)\b|[+-]?[0-9]+(?:\.[0-9]+)?%?/g,()=>`__V${index++}__`);
}

const executablePath=process.env.DASHBOARD_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser=await chromium.launch({headless:true,executablePath});
const page=await browser.newPage({viewport:{width:1280,height:900}});
const found=new Map();

async function collect(owner){
  const values=await page.evaluate(()=>{
    const out=[];
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()){
      const node=walker.currentNode;
      if(!node.parentElement||node.parentElement.closest('script,style,#language-select'))continue;
      const value=node.nodeValue.replace(/\s+/g,' ').trim();
      if(/[가-힣]/.test(value))out.push(value);
    }
    document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(el=>{
      for(const attr of ['aria-label','title','placeholder']){
        const value=(el.getAttribute(attr)||'').replace(/\s+/g,' ').trim();
        if(/[가-힣]/.test(value))out.push(value);
      }
    });
    if(/[가-힣]/.test(document.title))out.push(document.title.trim());
    return out;
  });
  for(const value of values){
    const template=normalize(value);
    if(!found.has(template))found.set(template,new Set());
    found.get(template).add(owner);
  }
}

async function selectEvery(id,owner,limit=Infinity){
  const locator=page.locator(`#${id}`);
  if(!await locator.count())return;
  const values=await locator.locator('option').evaluateAll(options=>options.map(option=>option.value));
  for(const value of values.slice(0,limit)){
    await locator.selectOption(value);
    await page.waitForTimeout(20);
    await collect(owner);
  }
}

for(const mode of ['homeroom','school','track']){
  await page.goto(`${base}/${mode}.html?lang=ko`,{waitUntil:'networkidle'});
  await collect(mode);
  if(mode==='homeroom'){
    await selectEvery('student-pick',mode);
    await selectEvery('parent-student',mode);
    await selectEvery('pair-scale',mode);
  }else if(mode==='school'){
    await selectEvery('class-select',mode);
    await selectEvery('pair-scale',mode);
  }else{
    await selectEvery('class-select',mode);
    await selectEvery('career-student',mode);
  }
}

await browser.close();
const strings=[...found].sort((a,b)=>a[0].localeCompare(b[0],'ko')).map(([source,owners])=>({key:stableKey(source),source,owners:[...owners].sort()}));
const collisions=strings.filter((entry,index)=>strings.findIndex(other=>other.key===entry.key)!==index);
if(collisions.length)throw new Error(`Stable-key collision: ${collisions.map(x=>x.key).join(', ')}`);
const output={generatedAt:new Date().toISOString(),normalizationVersion:1,count:strings.length,strings};
fs.mkdirSync(path.join(root,'i18n-source'),{recursive:true});
fs.writeFileSync(path.join(root,'i18n-source','dom-ko.json'),`${JSON.stringify(output,null,2)}\n`);
console.log(`Collected ${strings.length} Korean DOM strings.`);

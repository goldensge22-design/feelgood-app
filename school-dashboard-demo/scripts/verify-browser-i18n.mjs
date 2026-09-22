import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const root=path.resolve(import.meta.dirname,'..');
const base=process.env.DASHBOARD_BASE_URL||'http://127.0.0.1:8767';
const executablePath=process.env.DASHBOARD_CHROME||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const modes=(process.env.QA_MODES||'homeroom,school,track').split(',');
const locales=(process.env.QA_LOCALES||'ko,en,ja,zh-CN,zh-TW,es,fr,ru,vi,th,ar,it,az,mn,km').split(',');
const viewportParts=(process.env.QA_VIEWPORT||'1280x900').split('x').map(Number);
const viewport={width:viewportParts[0],height:viewportParts[1]};
const browser=await chromium.launch({headless:true,executablePath});
const page=await browser.newPage({viewport});
const failures=[];

for(const mode of modes){
  for(const locale of locales){
    await page.goto(`${base}/${mode}.html?lang=${encodeURIComponent(locale)}`,{waitUntil:'networkidle'});
    await page.waitForTimeout(50);
    const result=await page.evaluate(({locale})=>{
      const residual=[];
      if(locale!=='ko'){
        const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
        while(walker.nextNode()){
          const node=walker.currentNode;
          if(!node.parentElement||node.parentElement.closest('script,style,#language-select'))continue;
          const value=node.nodeValue.replace(/\s+/g,' ').trim();
          if(/[가-힣]/.test(value))residual.push(value);
        }
        document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(el=>{
          if(el.closest('#language-select'))return;
          for(const attr of ['aria-label','title','placeholder']){
            const value=(el.getAttribute(attr)||'').trim();
            if(/[가-힣]/.test(value))residual.push(`${attr}: ${value}`);
          }
        });
        if(/[가-힣]/.test(document.title))residual.push(`document.title: ${document.title}`);
      }
      return {
        lang:document.documentElement.lang,
        dir:document.documentElement.dir,
        placeholderLeak:document.body.innerText.includes('__V'),
        documentWidth:document.documentElement.scrollWidth,
        viewportWidth:window.innerWidth,
        bodyOverflow:document.documentElement.scrollWidth>window.innerWidth+1,
        overflowElements:[...document.querySelectorAll('body *')].filter(el=>{
          const style=getComputedStyle(el),rect=el.getBoundingClientRect();
          if(style.display==='none'||style.visibility==='hidden'||rect.width===0||rect.height===0)return false;
          if(el.closest('.tw,#toc'))return false;
          return rect.right>window.innerWidth+1||rect.left<-1;
        }).slice(0,12).map(el=>({tag:el.tagName,id:el.id,className:String(el.className||'').slice(0,80),text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,100)})),
        overflowContainers:[...document.querySelectorAll('body *')].filter(el=>el.scrollWidth>el.clientWidth+1).slice(0,12).map(el=>({tag:el.tagName,id:el.id,className:String(el.className||'').slice(0,80),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth,text:(el.textContent||'').replace(/\s+/g,' ').trim().slice(0,100)})),
        residual:[...new Set(residual)].slice(0,30),
      };
    },{locale});
    const expectedDir=locale==='ar'?'rtl':'ltr';
    if(result.lang!==locale||result.dir!==expectedDir||result.placeholderLeak||result.bodyOverflow||result.residual.length){
      failures.push({mode,locale,...result});
    }
    console.log(`${mode}/${locale}: ${result.residual.length?'FAIL':'PASS'}`);
  }
}

await browser.close();
fs.writeFileSync(path.join(root,'i18n-source',`browser-qa-${viewport.width}.json`),`${JSON.stringify({generatedAt:new Date().toISOString(),viewport,failures},null,2)}\n`);
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1;}
else console.log('Browser i18n QA: PASS');

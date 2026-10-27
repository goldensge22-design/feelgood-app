/// <reference lib="dom" />
/** Settled rendering snapshots; waits for modal opacity, unlike action assertions. */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const out=fileURLToPath(new URL('../../generated-artifacts/provenance-qa/settled',import.meta.url));
const origin=process.env.NUVIA_TEST_ORIGIN??'http://localhost:80';
const langs=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const sizes=[{width:1440,height:1000},{width:768,height:1024},{width:360,height:800}];
const b=await chromium.launch({executablePath:'/repl/tools/bin/chromium',args:['--no-sandbox']});
await mkdir(out,{recursive:true});
const results:any[]=[];
async function run(lang:string,size:typeof sizes[number]){
 const c=await b.newContext({viewport:size}),p=await c.newPage(),row:any={lang,size};
 try{
  await p.goto(`${origin}/experiences?space=guest&synthetic=1&lang=${lang}`);
  await p.getByTestId('checkbox-synthetic-ack').check();
  await p.getByTestId('button-pick-seed-syn-scenario-sim').click();
  await p.getByTestId('checkbox-fact-consent').check();await p.getByTestId('checkbox-usage-consent').check();
  await p.getByTestId('button-add-synthetic').click();await p.getByTestId('status-import-added').waitFor();
  await p.getByTestId('button-close-synthetic').click();
  await p.locator('[data-testid^="button-detail-exp-"]').first().click();
  const dialog=p.getByRole('dialog');await dialog.waitFor();await p.waitForTimeout(450);
  const info=await dialog.evaluate(e=>{
   const r=e.getBoundingClientRect();
   return {opacity:getComputedStyle(e).opacity,width:r.width,left:r.left,right:r.right,scroll:e.scrollWidth,client:e.clientWidth,font:getComputedStyle(e).fontFamily,dir:document.documentElement.dir,text:e.textContent};
  });
  assert.equal(info.opacity,'1');assert(info.left>=-1&&info.right<=size.width+1);
  assert(info.scroll<=info.client+2);assert(!info.text?.includes('pv.'));
  if(lang==='ar')assert.equal(info.dir,'rtl');
  const selector=p.getByTestId('button-language');
  assert.equal(await selector.getAttribute('aria-expanded'),'false');
  await p.screenshot({path:`${out}/${lang}-${size.width}-detail-top.jpg`});
  await dialog.evaluate(e=>{e.scrollTop=e.scrollHeight;});await p.waitForTimeout(100);
  await p.screenshot({path:`${out}/${lang}-${size.width}-detail-bottom.jpg`});
  row.status='passed';row.geometry={...info,text:undefined};
 }catch(e){row.status='failed';row.error=String(e);}
 finally{await c.close();}
 results.push(row);console.log(`${row.status.toUpperCase()} render ${lang}-${size.width}`);
 await writeFile(`${out}/render-matrix.json`,JSON.stringify({checkedAt:new Date().toISOString(),scope:'Synthetic device-only settled modal geometry/rendering; not native linguistic review',results},null,2));
}
try{const all=langs.flatMap(l=>sizes.map(s=>({l,s})));for(let i=0;i<all.length;i+=3)await Promise.all(all.slice(i,i+3).map(({l,s})=>run(l,s)));}
finally{await b.close();}
if(results.some(r=>r.status!=='passed'))process.exitCode=1;

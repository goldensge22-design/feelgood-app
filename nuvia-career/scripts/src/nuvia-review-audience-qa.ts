import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,type Page} from 'playwright';

const origin=process.env.NUVIA_QA_ORIGIN??`https://${process.env.REPLIT_DEV_DOMAIN}`;
const output=process.env.NUVIA_QA_DIRECTORY?resolve(process.env.NUVIA_QA_DIRECTORY):resolve(import.meta.dirname,'../../generated-artifacts/nuvia-review-audience-qa');
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const from=new Date().toISOString();
const locales=['ko','en','ja','zh-CN','zh-TW','mn','th','vi','ar','ru','km','es','fr','it','az'];
const base=`${origin}/demo/review`;
const browser=await chromium.launch({executablePath:process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE??'/repl/tools/bin/chromium',args:['--no-sandbox']});
const records:{name:string;result:string;detail?:string}[]=[];
await mkdir(output,{recursive:true});
async function step(name:string,run:()=>Promise<void>){
  try{await run();records.push({name,result:'PASS'});}
  catch(error){records.push({name,result:'FAIL',detail:String(error)});throw error;}
}
type Role='adult'|'youth';
const entry=(role:Role)=>role==='adult'?'button-review-start':'button-review-start-youth';
function route(page:Page,path='',lang='ko'){return page.goto(`${base}${path}?lang=${lang}`,{waitUntil:'domcontentloaded'});}

async function checkMenu(page:Page,role:Role,home=false){
  const nav=page.getByTestId('nav-review-services');
  const products=[role==='adult'?'company':'career','storyboard'];
  await nav.waitFor();
  assert.equal(await nav.getByRole('link').count(),3);
  assert.deepEqual(await nav.locator('[data-review-product]').evaluateAll(items=>items.map(item=>item.getAttribute('data-review-product'))),products);
  if(home)assert.deepEqual(await page.getByTestId('layout-review-home-services').locator('[data-review-product]').evaluateAll(items=>items.map(item=>item.getAttribute('data-review-product'))),products);
  assert.equal(await page.locator('a[href*="/history"],a[href*="/kids"],[data-review-product="history"]').count(),0);
  assert.doesNotMatch(await nav.innerText(),/히스토리|키즈|\bHistory\b|\bKids\b/i);
  const geometry=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth}));
  assert.ok(geometry.scroll<=geometry.width+1,JSON.stringify(geometry));
}

try{
  await Promise.all([360,768,1440].map(async width=>{
    for(const role of ['adult','youth'] as const){
      const ctx=await browser.newContext({viewport:{width,height:900},acceptDownloads:true});
      const page=await ctx.newPage();page.setDefaultTimeout(15000);
      const el=(id:string)=>page.getByTestId(id);
      const frame=page.frameLocator('[data-testid="frame-review-studio"]');
      const st=(id:string)=>frame.getByTestId(id);
      const errors:string[]=[];
      page.on('pageerror',error=>errors.push(error.message));
      const message=`[가상 ${role}-${width}] 준비물 목록을 비교하고 빠진 내용을 기록했어요.`;
      const body=el('input-review-simple-story-body');
      try{
        await step(`${role}/${width} 한국어 홈·LAB·추천 진입`,async()=>{
          await route(page);
          await el(entry(role)).click();
          await el('view-review-home').waitFor();
          await checkMenu(page,role,true);
          assert.equal(await el('card-review-home-planner').count(),0);
          assert.equal(await el('link-review-service-1').getAttribute('aria-label'),role==='adult'?'기업직무 LAB':'진로 LAB');
          await page.screenshot({path:`${output}/${role}-${width}-home.png`,animations:'disabled',fullPage:true});
          await el('link-review-service-1').click();
          await el(role==='adult'?'view-review-company-lab':'view-review-youth-lab').waitFor();
          if(role==='adult')assert.match(await el('view-review-company-lab').innerText(),/프로에스콤/);
          else{
            assert.equal(await el('view-review-company-lab').count(),0);
            assert.doesNotMatch(await el('view-review-youth-lab').innerText(),/협력기관 공고|프로에스콤/);
            await el('card-review-career-service').getByRole('radio').check();
            await page.reload();
            assert.equal(await el('card-review-career-service').getByRole('radio').isChecked(),true);
            await el('button-review-career-save').click();
            await body.waitFor();
            assert.match(await el('step-review-simple-story-1').innerText(),/비교 기준 세우기/);
          }
          await checkMenu(page,role);
        });
        await step(`${role}/${width} 이전 주소·새로고침·가족 전용 경로`,async()=>{
          for(const path of ['/kids','/kids/catalog','/family']){
            await route(page,path);
            await page.waitForURL('**/demo/review/home');
            await checkMenu(page,role,true);
          }
          for(const path of ['/history','/history/previous/deep','/experiences']){
            await route(page,path);
            await page.waitForURL('**/demo/review/planner');
            await checkMenu(page,role);
            await el('frame-review-studio').waitFor();
          }
          await route(page,'/report');await page.reload();
          await el('link-report-daily').click();
          await el('frame-review-studio').waitFor();
          await checkMenu(page,role);
        });
        await step(`${role}/${width} 원본 플래너→스토리보드·수정·버전·다시 방문`,async()=>{
          await st('button-studio-daily-create').click();await st('button-studio-add-cognitive').click();
          const btn=st('section-shelf').locator('[data-testid^="button-select-"]').first();
          const id=(await btn.getAttribute('data-testid'))!.slice('button-select-'.length);
          await btn.click();await st(`button-place-${id}`).click();
          await st('input-studio-worksheet').fill(message);
          await st('button-studio-worksheet-save').click();
          await st('checkbox-studio-worksheet-use').check();await st('button-studio-worksheet-use').click();
          await body.waitFor();
          await checkMenu(page,role);
          const initial='[가상 원문] 내가 먼저 쓴 문장입니다.';
          await body.fill(initial);
          await el('input-review-simple-story-thought').fill('다음에는 기준을 먼저 적고 싶어요.');
          if(role==='youth'){
            await el('button-review-youth-preview').click();
            assert.match(await el('review-youth-candidate').innerText(),/가정 상황에서 적은 생각/);
            assert.ok((await el('review-youth-candidate').innerText()).includes(message));
            assert.equal(await body.inputValue(),initial);
            await el('button-review-youth-apply').click();
            assert.ok((await body.inputValue()).includes(message));
            await el('button-review-youth-refine').click();
            assert.match(await el('review-youth-candidate').innerText(),/다음에는 기준을 먼저 적고/);
            await el('button-review-youth-apply').click();
          } else assert.equal(await el('link-review-story-login').count(),1);
          const saved=await body.inputValue();
          await el('button-review-simple-story-save-draft').click();
          await page.getByRole('checkbox',{name:'본문을 확인했어요.'}).check();
          await el('button-review-simple-story-save').click();
          for(const format of width===1440?['txt','pdf','docx','hwpx']:['txt']){
            await page.getByRole('radio',{name:new RegExp(format,'i')}).check();
            const [download]=await Promise.all([page.waitForEvent('download',{timeout:25000}),el('button-download').click()]);
            assert.equal(await download.failure(),null);
            assert.equal(download.suggestedFilename(),`NUVIA-storyboard.${format}`);
            await download.saveAs(`${output}/${role}-${width}.${format}`);
            if(format==='txt'){
              const stream=await download.createReadStream();
              let file='';for await(const chunk of stream!)file+=chunk.toString();
              assert.ok(file.includes(saved));
            }
          }
          if(width===1440){
            assert.match(execFileSync('pdfinfo',[`${output}/${role}-${width}.pdf`],{encoding:'utf8'}),/Pages:\s+1\b/);
            execFileSync('python',['-c',`
import json,sys,zipfile,xml.etree.ElementTree as ET
for ext,entry in [('docx','word/document.xml'),('hwpx','Contents/section0.xml')]:
 with zipfile.ZipFile(f'{sys.argv[1]}.{ext}') as z:
  assert z.testzip() is None
  text='\\n'.join(e.text or '' for e in ET.fromstring(z.read(entry)).iter() if e.tag.endswith('}t'))
  assert all(line in text for line in json.loads(sys.argv[2])), (ext,text)
  assert '가상 결과지' not in text and 'review-card-' not in text
`,`${output}/${role}-${width}`,JSON.stringify(saved.split('\n').filter(x=>x.trim()))]);
          }
          await page.reload();
          assert.equal(await body.inputValue(),saved);
          await page.screenshot({path:`${output}/${role}-${width}-story.png`,animations:'disabled'});
          await page.close();
          const reopened=await ctx.newPage();
          await route(reopened,'/storyboard');
          assert.equal(await reopened.getByTestId('input-review-simple-story-body').inputValue(),saved);
          assert.match(await reopened.locator('#storyboard-versions summary').innerText(),/1/);
          assert.deepEqual(errors,[]);
        });
      }catch{/* individual result is recorded; preserve other widths */}finally{await ctx.close();}
    }
  }));
  for(const role of ['adult','youth'] as const){
    const ctx=await browser.newContext({viewport:{width:1440,height:900}});
    try{
      const page=await ctx.newPage();page.setDefaultTimeout(12000);
      await route(page);await page.getByTestId(entry(role)).click();
      for(const locale of locales)await step(`${role}/${locale} 자동 제품·이전 경로 검사`,async()=>{
        await route(page,'/home',locale);
        await checkMenu(page,role,true);
        assert.equal(await page.locator('html').getAttribute('lang'),locale);
        await route(page,'/history',locale);
        await page.waitForURL('**/demo/review/planner');
        await checkMenu(page,role);
        await route(page,'/kids',locale);
        await page.waitForURL('**/demo/review/home');
        await checkMenu(page,role,true);
      }).catch(()=>{});
    }finally{await ctx.close();}
  }
  await step('미분류·역할 변경 분리·가족 히스토리·교사용 분리',async()=>{
    const ctx=await browser.newContext();
    try{
      const page=await ctx.newPage();const el=(id:string)=>page.getByTestId(id);
      await route(page,'/history/one');
      await el('button-review-start-youth').waitFor();
      assert.equal(await el('nav-review-services').count(),0);
      await el(entry('adult')).click();
      await el('link-review-service-2').click();
      await el('input-review-simple-story-body').fill('[가상] 성인 프로필 원문');
      await el('button-review-simple-story-save-draft').click();
      await el('button-review-exit').click();
      await el(entry('youth')).click();
      await el('link-review-service-2').click();
      assert.equal(await el('input-review-simple-story-body').inputValue(),'');
      await el('input-review-simple-story-body').fill('[가상] 청소년 프로필 원문');
      await el('button-review-simple-story-save-draft').click();
      await el('button-review-exit').click();
      await el(entry('adult')).click();
      await el('link-review-service-2').click();
      assert.equal(await el('input-review-simple-story-body').inputValue(),'[가상] 성인 프로필 원문');
      await el('button-review-exit').click();
      await el(entry('youth')).click();
      await el('link-review-service-2').click();
      assert.equal(await el('input-review-simple-story-body').inputValue(),'[가상] 청소년 프로필 원문');
      await el('button-review-exit').click();
      await el('link-review-family-entry').click();
      await el('button-review-start-child').click();
      await page.getByTestId('nav-review-services').locator('[data-review-product="history"]').click();
      await page.getByRole('heading',{name:'연습 히스토리'}).waitFor();
      await route(page,'/teacher');
      await page.getByRole('heading',{name:'교사용 안내'}).waitFor();
      assert.equal(await el('nav-review-services').count(),0);
    }finally{await ctx.close();}
  }).catch(()=>{});
}finally{
  const report={commit,from,until:new Date().toISOString(),origin,browser:browser.version(),records};
  await writeFile(`${output}/browser.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  await browser.close();
}
if(records.length!==49||records.some(r=>r.result!=='PASS'))process.exitCode=1;

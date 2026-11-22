import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const start=new Date().toISOString();
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const origin=process.env.NUVIA_QA_ORIGIN??`https://${process.env.REPLIT_DEV_DOMAIN}`;
const out=resolve(import.meta.dirname,process.env.NUVIA_QA_DIRECTORY??'../../generated-artifacts/nuvia-simple-story-qa');
const EXPECTED_BUILD=process.env.NUVIA_QA_COMPILED==='1';
await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE??'/repl/tools/bin/chromium',args:['--no-sandbox']});
const report:{name:string;status:string;error?:string}[]=[];
const main='[가상 QA] 안내문 두 버전에서 적용 날짜가 다른 부분을 표시했습니다.\n원문을 비교한 기준을 기록했습니다.';
const second='[가상 QA] 목록에서 빠진 준비물 항목을 메모했습니다.';
const thought='내가 먼저 확인한 기준을 강조하고 싶어요.';
try{
  for(const width of [360,768,1440]){
    const ctx=await b.newContext({viewport:{width,height:900},acceptDownloads:true});
    const p=await ctx.newPage();p.setDefaultTimeout(11_000);
    const runtimeErrors:string[]=[];
    p.on('pageerror',error=>runtimeErrors.push(error.message));
    const el=(id:string)=>p.getByTestId(id);
    const st=(id:string)=>p.frameLocator('[data-testid=frame-review-studio]').getByTestId(id);
    const input=el('input-review-simple-story-body');
    const path=(slug='')=>`${origin}/demo/review${slug}?lang=ko`;
    async function step(name:string,run:()=>Promise<void>){
      try{await run();report.push({name:`${width} ${name}`,status:'PASS'});}
      catch(err){report.push({name:`${width} ${name}`,status:'FAIL',error:String(err)});throw err;}
    }
    try{
      await step('새 진입·로그인 복귀 주소 렌더 및 자료 없는 초안 저장, 실패 복구, TXT 다운로드',async()=>{
        const landing=await p.goto(path());assert.equal(landing?.status(),200);
        if(EXPECTED_BUILD)assert.match(await landing!.text(),/\/assets\/[^" ]+\.js/);
        await el('button-review-start').click();
        await p.goto(path('/storyboard'));
        await input.waitFor();
        assert.equal(await p.getByRole('heading',{level:1,name:'나의 강점 스토리보드',exact:true}).count(),1);
        assert.equal(await p.getByRole('navigation',{name:'성인 체험 단계'}).count(),0);
        assert.match(await el('review-scope').innerText(),/다듬을 때는 내 글과 생각/);
        const first=await el('step-review-simple-story-1').boundingBox();
        assert(first&&first.y<420,`first step starts at ${first?.y}px`);
        await input.fill(second);await el('input-review-simple-story-thought').fill(thought);
        const draftSave=el('button-review-simple-story-save-draft');
        await draftSave.click();
        assert.match(await el('status-review-simple-story-draft').innerText(),/이 기기에 저장/);
        assert.equal(await p.getByRole('button',{name:'나의 강점 문장 만들기',exact:true}).isDisabled(),true);
        assert.equal(await el('button-download').isDisabled(),true);
        // Limit failure injection to this isolated synthetic profile, never a real browser's storage.
        await p.evaluate(`(() => {
          const real=Storage.prototype.setItem;
          Object.assign(window,{qaRestoreSetItem:()=>{Storage.prototype.setItem=real;}});
          Storage.prototype.setItem=function (key,val){
            if(this===localStorage&&key.startsWith('nuvia:review-device:v2:data:'))throw Error('synthetic QA write failure');
            return real.call(this,key,val);
          };
        })()`);
        await input.fill(`${second} 다시 저장할 줄.`);
        await p.getByRole('alert').filter({hasText:'화면을 닫기 전에 초안 저장'}).waitFor();
        await p.evaluate(()=>(window as Window&{qaRestoreSetItem:()=>void}).qaRestoreSetItem());
        await draftSave.click();
        await el('status-review-simple-story-draft').getByText('초안이 이 기기에 저장됐어요.').waitFor();
        const loginReturn=await p.goto(`${path('/storyboard')}&labAccount=1`);
        assert.equal(loginReturn?.status(),200);
        assert.equal(await input.inputValue(),`${second} 다시 저장할 줄.`);
        assert.equal(await el('input-review-simple-story-thought').inputValue(),thought);
        await p.goto(path('/home'));await p.goto(path('/storyboard'));await p.reload();
        assert.equal(await input.inputValue(),`${second} 다시 저장할 줄.`);
        await p.getByRole('checkbox',{name:'본문을 확인했어요.'}).check();
        await el('button-review-simple-story-save').click();
        await p.getByRole('radio',{name:/txt/i}).click();
        const [download]=await Promise.all([p.waitForEvent('download'),el('button-download').click()]);
        assert.equal(await download.failure(),null);
        assert.equal((await readFile((await download.path())!,'utf8')).split('\n\n').at(-1),`${second} 다시 저장할 줄.`);
        await p.screenshot({path:`${out}/${width}-manual-confirmed.png`,fullPage:true});
        assert.deepEqual(runtimeErrors,[]);
      });
      await step('LAB 미방문 원본 작업대 → 활동지 → 3단계 편집',async()=>{
        await p.goto(path('/home'));
        await el('link-review-routine-planner').click();
        await st('button-studio-daily-create').click();await st('button-studio-add-cognitive').click();
        const btn=st('section-shelf').locator('[data-testid^="button-select-"]').first();
        const id=(await btn.getAttribute('data-testid'))!.slice('button-select-'.length);
        await btn.click();await st(`button-place-${id}`).click();
        await st('input-studio-worksheet').fill(main);await st('button-studio-worksheet-save').click();
        await st('checkbox-studio-worksheet-use').check();await st('button-studio-worksheet-use').click();
        await input.waitFor();
        assert.equal(await el('list-review-simple-story').locator(':scope > li').count(),3);
        assert.equal(await input.count(),1);
        assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        await p.screenshot({path:`${out}/${width}-story.png`,fullPage:true});
      });
      await step('작성·생각 저장, 페이지 이동·새로고침 복원, 로그인 인계 확인',async()=>{
        const login=await el('link-review-story-login').getAttribute('href');
        assert.equal(login,'/sign-in?review-story=1');
        await input.fill(main);await el('input-review-simple-story-thought').fill(thought);
        await p.goto(path('/home'));await p.goto(path('/storyboard'));await p.reload();
        assert.equal(await input.inputValue(),main);
        assert.equal(await el('input-review-simple-story-thought').inputValue(),thought);
        assert.equal(await p.getByRole('button',{name:'나의 강점 문장 만들기',exact:true}).isDisabled(),true);
      });
      await step('확정 V1 저장 및 네 형식 실제 브라우저 다운로드',async()=>{
        await p.getByRole('checkbox',{name:'본문을 확인했어요.'}).check();
        await el('button-review-simple-story-save').click();
        for(const format of ['txt','pdf','docx','hwpx']){
          await p.getByRole('radio',{name:new RegExp(format,'i')}).click();
          const [download]=await Promise.all([p.waitForEvent('download',{timeout:25_000}),el('button-download').click()]);
          assert.equal(await download.failure(),null);
          assert.equal(download.suggestedFilename(),`NUVIA-storyboard.${format}`);
          await download.saveAs(`${out}/${width}.${format}`);
        }
        assert.equal((await readFile(`${out}/${width}.txt`,'utf8')).split('\n\n').at(-1),main);
        const textCheck=execFileSync('python',['-c',`
import json,sys,zipfile,xml.etree.ElementTree as ET
for ext,entry in [('docx','word/document.xml'),('hwpx','Contents/section0.xml')]:
 with zipfile.ZipFile(f'{sys.argv[1]}.{ext}') as z:
  assert z.testzip() is None
  nodes=ET.fromstring(z.read(entry)).iter()
  text='\\n'.join(e.text or '' for e in nodes if e.tag.endswith('}t'))
  for line in json.loads(sys.argv[2]):assert line in text, (ext,line,text)
  assert '가상 결과지' not in text and 'review-card-' not in text
`,`${out}/${width}`,JSON.stringify(main.split('\n'))],{encoding:'utf8'});
        assert.equal(textCheck,'');
        const pdf=execFileSync('pdfinfo',[`${out}/${width}.pdf`],{encoding:'utf8'});
        assert.match(pdf,/Pages:\s+1\b/);assert.match(pdf,/Page size:.*A4/);
        if(width===360)execFileSync('pdftoppm',['-f','1','-l','1','-r','110','-singlefile','-png',`${out}/360.pdf`,`${out}/360-pdf`]);
      });
      await step('V2 편집 및 이전 버전 읽기·복원',async()=>{
        await input.fill(second);await p.getByRole('checkbox',{name:'본문을 확인했어요.'}).check();await el('button-review-simple-story-save').click();
        await p.locator('#storyboard-versions > summary').click();
        await p.getByRole('button',{name:/^V1 ·/}).click();
        assert((await p.locator('#storyboard-versions').innerText()).includes(second));
        await p.locator('#storyboard-versions').getByRole('button',{name:'이 버전으로 되돌리기'}).click();
        assert.equal(await input.inputValue(),`${second} 다시 저장할 줄.`);
        assert.equal(await p.getByRole('button',{name:/^V2 ·/}).count(),1);
      });
      await step('LAB 수동 양식 미복구, 공개 링크 선택 및 개인 링크 사전 거절',async()=>{
        await p.goto(path('/lab'));
        assert.match(await p.getByText(/회사명·직무명과 선택 입력한 공개 링크/).innerText(),/결과지와 내 기록은 보내지 않아요/);
        await p.getByText('공개 기업·공고 링크 (선택)',{exact:true}).first().click();
        await el('input-company-lab-public-url').fill('https://company.example.com/jobs?token=sample');
        await el('button-company-lab-search').click();
        await p.getByRole('alert').filter({hasText:'개인·인증 링크'}).waitFor();
        assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
        assert.deepEqual(runtimeErrors,[]);
      });
    }catch(e){if(p.url().startsWith(origin))await p.screenshot({path:`${out}/${width}-failure.png`,fullPage:true}).catch(()=>{});console.error(String(e));}
    finally{await ctx.close();}
  }
}finally{
  await writeFile(`${out}/browser.json`,JSON.stringify({start,end:new Date().toISOString(),commit,browser:b.version(),
    build:EXPECTED_BUILD?'compiled Vite assets':'dev workflow',
    profile:'isolated Chromium, synthetic records; return URL without authenticating; no AI requests or mocked replies',results:report},null,2));
  await b.close();
}
if(report.some(x=>x.status!=='PASS')||report.length!==18)process.exitCode=1;

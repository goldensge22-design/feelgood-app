import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runReviewStory} from '../../artifacts/api-server/src/lib/review-story-ai';
import {aiIdentity} from '../../artifacts/api-server/src/lib/career-ai-settings';
import {runLabWebSearch} from '../../artifacts/api-server/src/lib/career-lab-web';

if(process.env.NUVIA_SIMPLE_STORY_LIVE_QA!=='1')throw Error('Explicitly opt in to the three small, synthetic-only provider requests.');
const out=resolve(import.meta.dirname,'../../generated-artifacts/nuvia-simple-story-qa');
await mkdir(out,{recursive:true});
const start=new Date().toISOString();
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const evidence=[
  {id:'A1',kind:'reflection' as const,title:'가상 안내문 비교',text:'가정한 생활 상황에서 안내문 두 버전을 비교했습니다. 적용 날짜가 다른 부분에 표시를 했고, 사용 대상을 먼저 확인하는 편이 좋겠다고 적었습니다.'},
  {id:'R1',kind:'report' as const,title:'가상 결과지의 계획 해석',text:'확인하는 목표와 순서를 먼저 정하는 방법이 작성에 도움이 됩니다.'},
];
async function trial<T>(name:string,fn:()=>Promise<T>){
  const from=new Date().toISOString();
  try{return {name,from,status:'PASS' as const,result:await fn(),finished:new Date().toISOString()};}
  catch(error){const detail=error as {code?:string;diagnostic?:string};return {name,from,status:'FAIL' as const,code:detail.code??'QA_ASSERTION',diagnostic:detail.diagnostic,finished:new Date().toISOString()};}
}
const linkOnly=process.env.NUVIA_SIMPLE_STORY_LINK_ONLY==='1';
const writingOnly=process.env.NUVIA_SIMPLE_STORY_WRITING_ONLY==='1';
const generated=linkOnly?null:await trial('GPT 강점 문장 생성',async()=>{
  const value=await runReviewStory({kind:'generate',consent:true,evidence,body:'',thought:''});
  assert(value.text&&value.used.includes('A1')&&/비교|날짜/.test(value.text)&&!/\d+%|근무하며|입사 후/.test(value.text));
  return value;
});
const refined=linkOnly?null:await trial('GPT 내 생각 반영 다듬기',async()=>{
  const original=generated?.result?.text??'가정한 생활 상황에서 안내문 두 버전을 비교해 적용 날짜가 다른 부분을 표시했습니다.';
  const thought='사용 대상을 먼저 확인하면 좋겠다는 생각을 문장 앞쪽에 두고 싶습니다.';
  const value=await runReviewStory({kind:'refine',consent:true,evidence,body:original,thought});
  assert(value.text&&value.used.includes('A1')&&value.text!==original&&/대상/.test(value.text)&&
    !/\d+%|근무하며|입사 후|대상[을은] (?:먼저 )?확인(?:한 뒤|했|하였)/.test(value.text));
  return {...value,original,thought};
});
const source=linkOnly?'https://recruit.navercorp.com/rcrt/view.do?annoId=30005630':'https://www.proscom.co.kr/kr/company/summary.php';
const lab=writingOnly?null:await trial('GPT 공개 기업 링크의 정확한 원문 열기와 인용',async()=>{
  const value=await runLabWebSearch({...(linkOnly?{company:'네이버',job:'서비스기획'}:{company:'프로에스콤',job:'보안'}),url:source});
  assert(value.result.materials.some(row=>row.evidence.some(e=>e.url===source)));
  return {source,...value};
});
const results=[generated,refined,lab].filter(x=>x!==null);
await writeFile(`${out}/${linkOnly?'live-public-link':writingOnly?'live-writing-final':'live-provider'}.json`,JSON.stringify({start,end:new Date().toISOString(),commit,
  mode:'Direct invocation of the identical server provider functions, not browser auth or a simulated response',
  model:aiIdentity().model,provider:aiIdentity().provider,evidence,results},null,2));
console.log(results.map(x=>({name:x.name,status:x.status,code:x.code})));
if(results.some(x=>x.status==='FAIL'))process.exitCode=1;

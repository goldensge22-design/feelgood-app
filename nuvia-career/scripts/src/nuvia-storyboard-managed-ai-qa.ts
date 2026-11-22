/** Explicit, maximum two live development-model calls, on synthetic text. No account/production routes. */
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { accountStoryInput } from '../../artifacts/nuvia-career/src/components/storyboard-account-ai';
import { emptyStoryboard } from '../../artifacts/nuvia-career/src/lib/storyboard';
import { aiIdentity } from '../../artifacts/api-server/src/lib/career-ai-settings';
import { runCareerAiAssist, type AiTokenUsage } from '../../artifacts/api-server/src/lib/career-ai';
const identity=aiIdentity();
const results:{kind:string;status:string;observed?:unknown}[]=[];
const begin=new Date().toISOString();
for(const kind of ['draft','refine'] as const) {
  if(process.env.NUVIA_APPROVED_SYNTHETIC_SMOKE!=='1' || identity.provider!=='managed'){
    results.push({kind,status:'BLOCKED',observed:'Managed development smoke only; no BYOK or automatic fallback.'});continue;
  }
  const input=accountStoryInput({
    draft:{...emptyStoryboard(),company:'가상 도서관',job:'운영 보조',keyword:'확인',sections:['','','생각 노트에서 선택 기준을 먼저 적었습니다.','']},
    report:{summary:'단계를 차례로 보는 지원 예시입니다.',title:'합성 보고서',major:'',isExample:false,axes:[],jobs:[]},
    experiences:[
      {item:{id:'not-sent-a',source:'manual',title:'아침의 일상 메모',action:'아침에 물을 마시고 세수한 순서를 적었다.',result:'',learning:'다음에는 준비물을 먼저 적기로 했다.',confirmed:true,strengths:[],criterionIds:[]},context:'daily_activity',simulated:false,revision:'scope-a'},
      {item:{id:'not-sent-b',source:'manual',title:'가정 상황의 생각 노트',action:'가정 상황에서 약속 장소의 두 길 중 익숙한 길을 골라 이유를 적었다. 실제로 걸어가지 않았다.',result:'',learning:'갈림길 위치를 먼저 확인하고 싶었다.',confirmed:true,strengths:[],criterionIds:[]},context:'class_simulation',simulated:true,revision:'scope-b'},
    ],
    thoughts:['짧고 차분하게 말하고 싶다.','선택 전에 무엇을 먼저 확인할지 적었다는 점','쉬운 일상 표현'],
    kind,includeReport:true,hash:`synthetic-test-${kind}`,section:2,
  });
  const text=JSON.stringify(input);
  assert.equal(input.experiences.length,2);
  assert(!text.includes('not-sent') && !text.includes('scope-'));
  assert.equal(input.userAnswers.length,kind==='refine'?3:0);
  let usage:AiTokenUsage|undefined;
  try {
    const response=await runCareerAiAssist(input,AbortSignal.timeout(45000),v=>usage=v);
    assert.equal(response.task,'draft');assert.equal(response.candidates.length,2);
    for(const candidate of response.candidates){
      assert.match(candidate.text,/적|써|기록|메모|생각/);
      assert.doesNotMatch(candidate.text,/달성|개선율|근무했습니다|팀장|입사 후 성과|[0-9]+%/);
      assert.ok(candidate.sourceFacts.some(f=>/물|세수|길|약속|준비물|선택|갈림길/.test(f)));
    }
    if(kind==='refine')assert(response.candidates.some(c=>/먼저|확인/.test(c.text)));
    results.push({kind,status:'PASS',observed:{usage,candidates:response.candidates}});
  } catch(error){
    const code=error instanceof Error && /^[A-Z_]+$/.test(error.message)?error.message:'CANDIDATE_CHECK_FAILED';
    results.push({kind,status:'FAIL',observed:{code,usage}});
  }
}
const out=resolve(import.meta.dirname,'../../generated-artifacts/nuvia-review-adult-qa');
await mkdir(out,{recursive:true});
await writeFile(`${out}/managed-model.json`,JSON.stringify({environment:'managed development provider; real backend function only; not an authenticated browser test',begin,completed:new Date().toISOString(),identity,results},null,2));
console.log(results.map(({kind,status})=>`${kind}: ${status}`).join('\n'));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;

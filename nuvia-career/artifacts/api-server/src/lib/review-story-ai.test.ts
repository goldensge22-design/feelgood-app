import assert from "node:assert/strict";
import test from "node:test";
import type {ReviewStoryInput} from "@workspace/api-zod";
import {validateReviewSuggestion} from "./review-story-ai";

const input:ReviewStoryInput={kind:"generate",consent:true,body:"",thought:"",
  evidence:[{id:"A1",kind:"reflection",title:"생각 연습",text:"두 안내에서 적용 날짜를 먼저 비교할지 생각했다."},
    {id:"R1",kind:"report",title:"가상 결과지",text:"계획: 목표와 순서를 정리합니다."}]};
test("suggestion needs a real input activity reference, not a report-only or invented reference",()=>{
  const sample={text:"생각 연습에서 두 안내의 적용 날짜를 먼저 비교하는 방법을 생각해 보았습니다.",connection:"확인할 순서를 정하는 연습입니다.",used:["A1","R1"],missing:""};
  assert.deepEqual(validateReviewSuggestion(JSON.stringify(sample),input),sample);
  assert.throws(()=>validateReviewSuggestion(JSON.stringify({...sample,used:["R1"]}),input));
  assert.throws(()=>validateReviewSuggestion(JSON.stringify({...sample,used:["A2"]}),input));
  assert.throws(()=>validateReviewSuggestion(JSON.stringify({...sample,text:"업무에서 두 안내를 비교해 결과를 냈습니다."}),input));
});
test("missing evidence and proposed writing are mutually exclusive",()=>{
  const missing={text:"",connection:"",used:[],missing:"두 안내에서 직접 비교한 항목을 기록해 주세요."};
  assert.deepEqual(validateReviewSuggestion(JSON.stringify(missing),input),missing);
  assert.throws(()=>validateReviewSuggestion(JSON.stringify({...missing,text:"추측"}),input));
});

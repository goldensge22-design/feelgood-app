import React from 'react';
import type {ConditionDefinition,Profile,Run} from '../core/types';
import {w24ActivityGuidance} from '../content/w24ActivityGuidance.ko';
import {planningProgress} from '../core/preschoolPolicy';
export function QAInspector({profile,definition,run,error=''}:{profile:Profile;definition:ConditionDefinition;run?:Run;error?:string}){
 if(new URLSearchParams(location.search).get('qa')!=='1')return null;
 const guide=w24ActivityGuidance[definition.id];
 return <aside className="qa-inspector" data-qa-inspector><details><summary>QA Inspector</summary><div className="qa-inspector-body"><h2>교사용 설계 정보</h2><p>{profile.ageBand} / {profile.schoolGrade??'학년 미지정'} / {definition.passDomain} / {run?.stage??'intro'}</p>{error&&<p>{error}</p>}{guide?.context.map(x=><p key={x}>{x}</p>)}{Object.entries(guide?.questions??{}).map(([key,g])=><section key={key}><h3>{key}</h3><dl><dt>이번에 판단할 것</dt><dd>{g.judgement}</dd><dt>목표 PASS 사고 행동</dt><dd>{g.passBehavior}</dd><dt>가능한 답과 대안</dt><dd>{g.allowedResponses}</dd><dt>막혔을 때</dt><dd>{g.helpWhenBlocked}</dd><dt>완료 확인</dt><dd>{g.completionEvidence}</dd></dl></section>)}<h3>관찰된 게임 행동</h3><pre>{JSON.stringify(run?planningProgress(run).map(e=>e.payload):[],null,2)}</pre><p>선택·관찰·수정 기록이며 자유 표현의 이해나 인지 능력 평가가 아닙니다.</p></div></details></aside>;
}

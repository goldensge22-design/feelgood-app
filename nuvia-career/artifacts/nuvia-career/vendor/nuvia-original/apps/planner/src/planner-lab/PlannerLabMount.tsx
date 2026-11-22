// [NUVIA 2026-11-15] 대표 플래너→기업 LAB 추천 카드 패널(PlannerLabRecommendations) 진입. studio/ 밖에 둔다(번역 매크로 대상 아님).
// sessionKey 는 화면 무효화용일 뿐 인증이 아니다 — 셸 /api/planner/lab 이 세션을 다시 확인한다. 학습자 번호는 셸이 주입(NUVIA_PLANNER_LEARNER).
import PlannerLabRecommendations from './PlannerLabRecommendations';

export default function PlannerLabMount(){
 let learner='';
 try{const v=(globalThis as {NUVIA_PLANNER_LEARNER?:unknown}).NUVIA_PLANNER_LEARNER;learner=typeof v==='string'?v:'';}catch{learner='';}
 if(!learner)return null;
 return <PlannerLabRecommendations sessionKey={`nuvia:${learner}`} language="ko"/>;
}

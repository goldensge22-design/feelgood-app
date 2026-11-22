// 대표 v3 host-adapters/PlannerLinkedActivities.tsx — LAB 에서 학생이 고른 활동을 플래너에서 보고 실제 행동·결과·회고를 적는다.
// 같은 활동(공용 기록 fg_flow_activities)을 그대로 보여 주고 고친다 — 플래너 카드로 이중 생성하지 않는다(v3 DEVELOPER-HANDOFF 59행).
// 플래너의 기존 언어를 넘긴다. 로그인 확인은 NUVIA 셸(/api/planner/flow)이 한다.
import {CareerFlowPanel} from '../flow/ui/CareerFlowPanel';
import {FlowLocaleProvider} from '../flow/ui/FlowLocale';

export default function LabActivities({locale}:{locale:string}){
 return <section className="st-block" aria-label="LAB 활동" data-testid="section-lab-activities">
  <FlowLocaleProvider locale={locale}><CareerFlowPanel key="planner" apiBase="/api/planner/flow" mode="planner"/></FlowLocaleProvider>
 </section>;
}

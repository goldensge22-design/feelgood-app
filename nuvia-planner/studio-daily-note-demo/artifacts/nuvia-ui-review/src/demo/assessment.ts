import {DEMOS,validateAssessment,type Assessment} from '../official/adaptive/engine';
import {AUDIENCES,type Audience} from './audiences';

// Read-only reuse of the existing D-CAS contract example, not score conversion.
// Its levels/orders are explicit fixture inputs, never inferred from score cuts.
export function demoAssessmentEnvelope(audience:Audience) {
 const stage=AUDIENCES[audience].stage;
 const population=stage==='adult'?'성인용':'청소년용';
 const name=`D-CAS ${population} 합성 예시`;
 const assessment:Assessment={
  schemaVersion:'1.1',
  assessmentId:`external-dcas-synthetic-${audience}`,
  subjectId:'student-a',
  profileVersion:'external-dcas-synthetic-1',
  educationStage:stage,
  scoreSystem:{
   instrument:'dcas',metric:'accuracy_rate',label:`${name} · 영역별 정답률`,
   interpretationVersion:'synthetic-example-not-official-norms',
  },
  axes:structuredClone(DEMOS[0].axes),
  supportOrder:[...DEMOS[0].supportOrder!],
  strengthOrder:[...DEMOS[0].strengthOrder!],
 };
 return {testKind:name,testDate:'2026-10-01',assessment:validateAssessment(assessment)};
}

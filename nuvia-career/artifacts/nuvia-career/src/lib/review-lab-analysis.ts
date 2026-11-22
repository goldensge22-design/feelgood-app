import type { CareerLabEvidence, CareerLabMaterial, CareerLabResults } from '@workspace/api-client-react';
import type { ReviewTraitId } from './review-everyday-model';

export type LabConnection = {
  id: string; version: string; mode: CareerLabResults['mode']; retrievedAt: string;
  reportVersion: string; strength: string; representative: CareerLabEvidence; company?:string; job?:string;
  confirmedAt: string; support: string; check: string; planner: string;
};
export type AnalysisContext = { material: CareerLabMaterial; version:string; mode:CareerLabResults['mode']; retrievedAt:string };
export const REPORT_INTERPRETATION = 'example-2026-01-01-v1/example-v1';
export const labReportVersion=(trait:ReviewTraitId,focus:string|null)=>`${REPORT_INTERPRETATION}/${trait}/${focus??'not-provided'}`;
const supportNotes:Record<ReviewTraitId,string> = {
  planning:'목표와 할 순서를 먼저 정리한 나의 경험',
  attention:'놓치기 쉬운 정보를 한 항목씩 확인한 나의 경험',
  simultaneous:'전체 상황과 개별 정보를 나란히 비교한 나의 경험',
  sequential:'단계를 나누고 하나씩 확인한 나의 경험',
};
export function analysisRef(analysis:AnalysisContext, evidence:CareerLabEvidence, trait:ReviewTraitId, strength:string, focus:string|null, at=new Date()):LabConnection {
  const reportVersion=labReportVersion(trait,focus);
  const support=`‘${evidence.keyword}’ 근거를 보고, ${supportNotes[trait]}이 관련되는지 살펴봐요.`;
  const check='원문이 이 직무와 연결되는지, 실제로 내가 같은 행동을 해 본 적이 있는지 확인해요.';
  const planner='플래너에서 내가 확인한 행동·비교한 기준·그 이유가 적힌 기록을 골라요. 생각 연습은 생각 연습으로 남겨요.';
  return {id:[analysis.material.id,analysis.version,analysis.retrievedAt,reportVersion,evidence.id].join(':'),version:analysis.version,
    mode:analysis.mode,retrievedAt:analysis.retrievedAt,reportVersion,strength,representative:evidence,company:analysis.material.company,job:analysis.material.job,
    confirmedAt:at.toISOString(),support,check,planner};
}

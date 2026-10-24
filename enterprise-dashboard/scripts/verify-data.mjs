import { MOCK_DASHBOARD_DATA } from "../mock-data.js";
import { validateDashboardData } from "../data-adapter.js";
import { deriveOrganizationAnalysis } from "../organization-scoring.js";

globalThis.window = {};
validateDashboardData(MOCK_DASHBOARD_DATA);

const errors = [];
if (MOCK_DASHBOARD_DATA.meta.mode !== "demo" || MOCK_DASHBOARD_DATA.meta.dataProvenance !== "synthetic") {
  errors.push("meta: demo data must be explicitly marked synthetic");
}
for (const candidate of MOCK_DASHBOARD_DATA.candidates) {
  if (candidate.topJobs.length !== 5) errors.push(`${candidate.id}: expected Top 5 jobs`);
  for (const [domain, score] of Object.entries(candidate.pass)) {
    if (!Number.isFinite(score) || score < 0 || score > 100) errors.push(`${candidate.id}.${domain}: invalid score`);
  }
  for (const key of ["fit", "readiness", "leaderPotential", "expertPotential"]) {
    if (!Number.isFinite(candidate[key]) || candidate[key] < 0 || candidate[key] > 100) errors.push(`${candidate.id}.${key}: invalid signal`);
  }
}
const eligibleEvidenceProfiles = MOCK_DASHBOARD_DATA.candidates.filter((candidate) => candidate.evidenceProfile?.planner?.linked
  && candidate.evidenceProfile?.aiCoverLetter?.linked
  && candidate.evidenceProfile?.aiCoverLetter?.candidateConfirmed
  && candidate.evidenceProfile?.sharingConsent?.active);
if (eligibleEvidenceProfiles.length !== 2) errors.push(`evidenceProfile: expected 2 eligible demo profiles, got ${eligibleEvidenceProfiles.length}`);
if (MOCK_DASHBOARD_DATA.candidates.some((candidate) => Object.hasOwn(candidate, "resume") || Object.hasOwn(candidate, "resumeTopJobs"))) {
  errors.push("candidates: legacy standalone resume analysis fields must not be present");
}
const candidateIds = new Set(MOCK_DASHBOARD_DATA.candidates.map((candidate) => candidate.id));
const evaluationIds = new Set();
for (const evaluation of MOCK_DASHBOARD_DATA.candidateEvaluations) {
  if (!candidateIds.has(evaluation.candidateId)) errors.push(`${evaluation.candidateId}: evaluation has no matching candidate`);
  if (evaluationIds.has(evaluation.candidateId)) errors.push(`${evaluation.candidateId}: duplicate candidate evaluation`);
  evaluationIds.add(evaluation.candidateId);
  if (!evaluation.evaluatorRole) errors.push(`${evaluation.candidateId}: missing evaluator role`);
  if (!["draft", "approved"].includes(evaluation.status)) errors.push(`${evaluation.candidateId}: invalid evaluation status`);
  for (const key of ["jobCompetencyEvidence", "coreValueBehavior", "workSampleScore"]) {
    if (!Number.isFinite(evaluation[key]) || evaluation[key] < 0 || evaluation[key] > 100) errors.push(`${evaluation.candidateId}.${key}: invalid score`);
  }
}
for (const profile of MOCK_DASHBOARD_DATA.profiles) {
  if (profile.sampleSize < MOCK_DASHBOARD_DATA.meta.minimumCohortSize) errors.push(`${profile.id}: cohort below privacy threshold`);
}
const employeeWeightTotal = Object.values(MOCK_DASHBOARD_DATA.employeeProfileWeights).reduce((sum, value) => sum + value, 0);
if (employeeWeightTotal !== 100) errors.push(`employeeProfileWeights: expected 100, got ${employeeWeightTotal}`);
for (const item of MOCK_DASHBOARD_DATA.employeeSuccessProfiles) {
  if (item.sampleSize < MOCK_DASHBOARD_DATA.meta.minimumCohortSize) errors.push(`${item.job}: employee cohort below privacy threshold`);
  for (const key of ["dcasScore", "workPerformanceScore", "roleEvidenceScore"]) {
    if (!Number.isFinite(item[key]) || item[key] < 0 || item[key] > 100) errors.push(`${item.job}.${key}: invalid score`);
  }
}

const organization = deriveOrganizationAnalysis(MOCK_DASHBOARD_DATA, MOCK_DASHBOARD_DATA.employeePerformanceRecords);
if (organization.jobCoverage.length !== MOCK_DASHBOARD_DATA.organizationWorkforcePlan.length) errors.push("organization: job coverage plan mismatch");
if (organization.roleReadiness.reduce((sum, item) => sum + item.count, 0) !== MOCK_DASHBOARD_DATA.employeePerformanceRecords.length) errors.push("organization: role counts do not reconcile");
if (organization.departments.some((item) => item.headcount < MOCK_DASHBOARD_DATA.meta.minimumCohortSize)) errors.push("organization: department below privacy threshold");
if (organization.internalMobility.some((item) => item.count < MOCK_DASHBOARD_DATA.meta.minimumCohortSize)) errors.push("organization: mobility path below privacy threshold");
if (organization.jobCoverage.some((item) => !Number.isFinite(item.current) || item.current < 0 || item.current > 100)) errors.push("organization: invalid coverage score");
if (MOCK_DASHBOARD_DATA.reviewStageCompletion.length === 0) errors.push("reviewStageCompletion: expected synthetic demo values");
for (const item of MOCK_DASHBOARD_DATA.reviewStageCompletion) {
  if (!Number.isFinite(item.value) || item.value < 0 || item.value > 100) errors.push(`${item.type}: invalid review completion value`);
}
const approvedByJob = new Map();
const employeeKeys = new Set();
for (const record of MOCK_DASHBOARD_DATA.employeePerformanceRecords) {
  const recordKey = `${record.employeeId}:${record.job}:${record.reviewPeriod}`;
  if (employeeKeys.has(recordKey)) errors.push(`${recordKey}: duplicate performance record`);
  employeeKeys.add(recordKey);
  if (!record.evaluatorRole) errors.push(`${recordKey}: missing evaluator role`);
  if (!["draft", "approved"].includes(record.status)) errors.push(`${recordKey}: invalid status`);
  for (const key of ["dcasScore", "workPerformanceScore", "roleEvidenceScore"]) {
    if (!Number.isFinite(record[key]) || record[key] < 0 || record[key] > 100) errors.push(`${recordKey}.${key}: invalid score`);
  }
  if (record.status === "approved") approvedByJob.set(record.job, (approvedByJob.get(record.job) || 0) + 1);
}
for (const item of MOCK_DASHBOARD_DATA.employeeSuccessProfiles) {
  if ((approvedByJob.get(item.job) || 0) < MOCK_DASHBOARD_DATA.meta.minimumCohortSize) {
    errors.push(`${item.job}: approved performance records below privacy threshold`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Enterprise data OK: ${MOCK_DASHBOARD_DATA.candidates.length} candidates, ${MOCK_DASHBOARD_DATA.candidateEvaluations.length} evaluator-entered candidate records, ${MOCK_DASHBOARD_DATA.employeePerformanceRecords.length} manager-entered performance records, ${MOCK_DASHBOARD_DATA.employeeSuccessProfiles.length} employee job profiles, Top 5 jobs, score ranges and cohort thresholds verified.`);

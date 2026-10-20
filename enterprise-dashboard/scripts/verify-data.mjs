import { MOCK_DASHBOARD_DATA } from "../mock-data.js";
import { validateDashboardData } from "../data-adapter.js";

globalThis.window = {};
validateDashboardData(MOCK_DASHBOARD_DATA);

const errors = [];
for (const candidate of MOCK_DASHBOARD_DATA.candidates) {
  if (candidate.topJobs.length !== 5) errors.push(`${candidate.id}: expected Top 5 jobs`);
  for (const [domain, score] of Object.entries(candidate.pass)) {
    if (!Number.isFinite(score) || score < 0 || score > 100) errors.push(`${candidate.id}.${domain}: invalid score`);
  }
  for (const key of ["fit", "readiness", "leaderPotential", "expertPotential"]) {
    if (!Number.isFinite(candidate[key]) || candidate[key] < 0 || candidate[key] > 100) errors.push(`${candidate.id}.${key}: invalid signal`);
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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Enterprise data OK: ${MOCK_DASHBOARD_DATA.candidates.length} candidates, ${MOCK_DASHBOARD_DATA.employeeSuccessProfiles.length} employee job profiles, Top 5 jobs, weights, score ranges and cohort thresholds verified.`);

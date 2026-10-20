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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`Enterprise data OK: ${MOCK_DASHBOARD_DATA.candidates.length} candidates, Top 5 jobs, score ranges and cohort threshold verified.`);

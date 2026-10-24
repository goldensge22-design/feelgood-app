const ROLE_KEYS = ["leader", "projectLead", "specialist", "practitioner"];

export function deriveOrganizationAnalysis(data, records) {
  const approved = (records || []).filter((item) => item.status === "approved");
  const hasCalculationInputs = approved.length > 0 && approved.every((item) => item.department && item.pass && item.roleScores);
  if (!hasCalculationInputs) {
    return {
      organizationAverage: data.organizationAverage,
      roleReadiness: data.roleReadiness,
      jobCoverage: data.jobCoverage,
      departments: data.departments,
      succession: data.succession,
      internalMobility: data.internalMobility
    };
  }

  const minimum = data.meta.minimumCohortSize;
  const weights = data.employeeProfileWeights;
  const members = approved.map((item) => ({
    ...item,
    capabilityScore: weightedScore(item, weights),
    primaryRole: ROLE_KEYS.reduce((best, role) => item.roleScores[role] > item.roleScores[best] ? role : best, ROLE_KEYS[0])
  }));

  const organizationAverage = Object.fromEntries(data.passDomains.map((domain) => [domain, average(members.map((item) => item.pass[domain]))]));
  const roleReadiness = ROLE_KEYS.map((role) => {
    const count = members.filter((item) => item.primaryRole === role).length;
    return { role, count, percent: Math.round(count / members.length * 100) };
  });

  const plans = data.organizationWorkforcePlan || data.jobCoverage.map((item) => ({ ...item, requiredHeadcount: 1 }));
  const jobCoverage = plans.map((plan) => {
    const jobMembers = members.filter((item) => item.job === plan.job);
    const effectiveHeadcount = jobMembers.reduce((sum, item) => sum + (item.capabilityScore >= 80 ? 1 : item.capabilityScore >= 70 ? 0.5 : 0), 0);
    return { job: plan.job, current: Math.min(100, Math.round(effectiveHeadcount / Math.max(1, plan.requiredHeadcount) * 100)), target: plan.target };
  });

  const departments = [...new Set(members.map((item) => item.department))].map((department) => {
    const group = members.filter((item) => item.department === department);
    if (group.length < minimum) return null;
    const jobs = [...new Set(group.map((item) => item.job))];
    const departmentCoverage = jobCoverage.filter((item) => jobs.includes(item.job));
    if (!departmentCoverage.length) return null;
    const gapItem = departmentCoverage.reduce((largest, item) => item.target - item.current > largest.target - largest.current ? item : largest);
    return {
      department,
      headcount: group.length,
      leaderReady: group.filter((item) => item.roleScores.leader >= 80 && item.capabilityScore >= 75).length,
      specialistReady: group.filter((item) => item.roleScores.specialist >= 80 && item.capabilityScore >= 75).length,
      coverage: average(departmentCoverage.map((item) => item.current)),
      gap: gapItem.job
    };
  }).filter(Boolean);

  const succession = ["leader", "projectLead", "specialist"].map((role) => {
    const readyNow = members.filter((item) => item.roleScores[role] >= 80 && item.capabilityScore >= 75).length;
    const readyLater = members.filter((item) => item.roleScores[role] >= 70 && item.roleScores[role] < 80 && item.capabilityScore >= 70).length;
    const required = data.organizationRoleTargets?.[role] || 0;
    return { role, readyNow, readyLater, gap: Math.max(0, Math.ceil(required - readyNow - readyLater * 0.5)) };
  });

  const mobilityCounts = new Map();
  members.forEach((item) => {
    if (!item.targetJob || !Number.isFinite(item.targetJobScore)) return;
    if (item.targetJobScore < 75 || item.targetJobScore - item.capabilityScore < 8 || !item.dcasTopJobs?.includes(item.targetJob)) return;
    const key = `${item.job}:${item.targetJob}`;
    mobilityCounts.set(key, (mobilityCounts.get(key) || 0) + 1);
  });
  const internalMobility = [...mobilityCounts.entries()].map(([key, count]) => {
    const [from, to] = key.split(":");
    return { from, to, count };
  }).filter((item) => item.count >= minimum);

  return { organizationAverage, roleReadiness, jobCoverage, departments, succession, internalMobility };
}

function weightedScore(item, weights) {
  const total = weights.dcas + weights.workPerformance + weights.roleEvidence;
  if (!total) return 0;
  return Math.round((item.dcasScore * weights.dcas + item.workPerformanceScore * weights.workPerformance + item.roleEvidenceScore * weights.roleEvidence) / total);
}

function average(values) {
  return Math.round(values.reduce((sum, value) => sum + Number(value), 0) / values.length);
}

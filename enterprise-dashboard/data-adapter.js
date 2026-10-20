import { MOCK_DASHBOARD_DATA } from "./mock-data.js";

/**
 * Production integration point.
 * A host application may define window.FeelGoodEnterpriseAdapter.loadDashboardData(context)
 * and return the normalized shape documented in DATA_CONTRACT.md.
 */
export async function loadDashboardData(context = {}) {
  const external = window.FeelGoodEnterpriseAdapter;
  if (external && typeof external.loadDashboardData === "function") {
    const data = await external.loadDashboardData(context);
    const normalized = {
      ...data,
      competencyModel: data.competencyModel ?? structuredClone(MOCK_DASHBOARD_DATA.competencyModel),
      employeeProfileWeights: data.employeeProfileWeights ?? structuredClone(MOCK_DASHBOARD_DATA.employeeProfileWeights),
      employeeSuccessProfiles: data.employeeSuccessProfiles ?? [],
      employeePerformanceRecords: data.employeePerformanceRecords ?? [],
      reviewStageCompletion: data.reviewStageCompletion ?? []
    };
    validateDashboardData(normalized);
    return { ...normalized, meta: { ...normalized.meta, mode: "production" } };
  }
  validateDashboardData(MOCK_DASHBOARD_DATA);
  return structuredClone(MOCK_DASHBOARD_DATA);
}

export async function saveEmployeePerformanceRecords(records, context = {}) {
  const external = window.FeelGoodEnterpriseAdapter;
  if (!external || typeof external.saveEmployeePerformanceRecords !== "function") {
    throw new Error("FeelGoodEnterpriseAdapter.saveEmployeePerformanceRecords is required in production mode");
  }
  return external.saveEmployeePerformanceRecords({ records, context });
}

export function validateDashboardData(data) {
  const errors = [];
  if (!data || typeof data !== "object") errors.push("root");
  if (!data?.meta?.organizationName) errors.push("meta.organizationName");
  if (!Array.isArray(data?.profiles)) errors.push("profiles");
  if (!Array.isArray(data?.candidates)) errors.push("candidates");
  if (!Array.isArray(data?.jobCoverage)) errors.push("jobCoverage");
  if (!Array.isArray(data?.employeeSuccessProfiles)) errors.push("employeeSuccessProfiles");
  if (!Array.isArray(data?.employeePerformanceRecords)) errors.push("employeePerformanceRecords");
  if (!Array.isArray(data?.reviewStageCompletion)) errors.push("reviewStageCompletion");
  if (!["dcas", "workPerformance", "roleEvidence"].every((key) => Number.isFinite(data?.employeeProfileWeights?.[key]))) {
    errors.push("employeeProfileWeights");
  }
  if (!Array.isArray(data?.competencyModel?.competencies)) errors.push("competencyModel.competencies");
  if (data?.candidates?.some((candidate) => !candidate.id || !candidate.pass || !Array.isArray(candidate.topJobs) || candidate.topJobs.length === 0)) {
    errors.push("candidates[].id/pass/topJobs");
  }
  if (data?.employeeSuccessProfiles?.some((item) => !item.job || !item.profile || !Number.isFinite(item.sampleSize))) {
    errors.push("employeeSuccessProfiles[].job/profile/sampleSize");
  }
  if (data?.employeePerformanceRecords?.some((item) => !item.employeeId || !item.job || !item.reviewPeriod || !["draft", "approved"].includes(item.status)
    || !["dcasScore", "workPerformanceScore", "roleEvidenceScore"].every((key) => Number.isFinite(item[key]) && item[key] >= 0 && item[key] <= 100))) {
    errors.push("employeePerformanceRecords[]");
  }
  if (data?.reviewStageCompletion?.some((item) => !item.type || !Number.isFinite(item.value) || item.value < 0 || item.value > 100)) {
    errors.push("reviewStageCompletion[]");
  }
  if (errors.length) throw new Error(`Invalid enterprise dashboard data: ${errors.join(", ")}`);
  return true;
}

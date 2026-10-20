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
    const normalized = { ...data, competencyModel: data.competencyModel ?? structuredClone(MOCK_DASHBOARD_DATA.competencyModel) };
    validateDashboardData(normalized);
    return { ...normalized, meta: { ...normalized.meta, mode: "production" } };
  }
  validateDashboardData(MOCK_DASHBOARD_DATA);
  return structuredClone(MOCK_DASHBOARD_DATA);
}

export function validateDashboardData(data) {
  const errors = [];
  if (!data || typeof data !== "object") errors.push("root");
  if (!data?.meta?.organizationName) errors.push("meta.organizationName");
  if (!Array.isArray(data?.profiles)) errors.push("profiles");
  if (!Array.isArray(data?.candidates)) errors.push("candidates");
  if (!Array.isArray(data?.jobCoverage)) errors.push("jobCoverage");
  if (!Array.isArray(data?.competencyModel?.competencies)) errors.push("competencyModel.competencies");
  if (data?.candidates?.some((candidate) => !candidate.id || !candidate.pass || !candidate.topJobs)) {
    errors.push("candidates[].id/pass/topJobs");
  }
  if (errors.length) throw new Error(`Invalid enterprise dashboard data: ${errors.join(", ")}`);
  return true;
}

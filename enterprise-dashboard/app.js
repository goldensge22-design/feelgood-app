import { initializeI18n, setLocale, getLocale, getManifest, t, number, date, applyTranslations } from "./i18n.js";
import { loadDashboardData, saveEmployeePerformanceRecords, saveCandidateEvaluations } from "./data-adapter.js";

const state = {
  data: null,
  page: "overview",
  candidateId: null,
  candidateFilter: "all",
  benchmarkJob: "productStrategy",
  competencyModel: null,
  performanceRecords: [],
  performanceNotice: null,
  candidateEvaluations: [],
  modelEvaluationNotice: null,
  resumeFiles: loadResumeMetadata()
};

const PAGE_IDS = ["overview", "model", "hiring", "benchmark", "individual", "development", "organization", "actions", "competencies"];

await initializeI18n();
state.data = await loadDashboardData(readIntegrationContext());
state.competencyModel = loadCompetencyModel(state.data.competencyModel);
state.performanceRecords = loadPerformanceRecords(state.data.employeePerformanceRecords);
state.candidateEvaluations = loadCandidateEvaluations(state.data.candidateEvaluations);
state.candidateId = state.data.candidates[0]?.id || null;
state.page = resolvePageFromHash();
buildLanguageSelect();
bindShellEvents();
renderAll();
navigate(state.page, { updateHash: false, focus: false });
document.body.classList.remove("is-loading");

function renderAll() {
  applyTranslations(document);
  document.getElementById("organizationName").textContent = state.data.meta.organizationName;
  renderDemoDisclosure();
  renderOverview();
  renderModel();
  renderHiring();
  renderBenchmark();
  renderIndividual();
  renderDevelopment();
  renderOrganization();
  renderActions();
  renderCompetencies();
}

function renderDemoDisclosure() {
  setHTML("demoDisclosure", `
    <div class="demo-disclosure-heading"><span class="demo-mark" aria-hidden="true">D</span><div><span class="pill orange">${t("demo.badge")}</span><h2>${t("demo.disclosureTitle")}</h2><p>${t("demo.disclosureText")}</p></div></div>
    <div class="demo-rule-grid">
      <div><strong>${t("demo.peopleTitle")}</strong><span>${t("demo.peopleText")}</span></div>
      <div><strong>${t("demo.scoreTitle")}</strong><span>${t("demo.scoreText")}</span></div>
      <div><strong>${t("demo.weightTitle")}</strong><span>${t("demo.weightText")}</span></div>
      <div><strong>${t("demo.productionTitle")}</strong><span>${t("demo.productionText")}</span></div>
    </div>
  `);
}

function renderOverview() {
  const data = state.data;
  setHTML("overviewMeta", `${tag(data.meta.mode === "demo" ? t("common.demoData") : t("common.liveData"), "blue")} ${tag(t("common.updated", { date: date(data.meta.updatedAt) }), "gray")}`);
  setHTML("overviewMetrics", [
    metric(t("metric.analyzed"), data.meta.analyzedCount, t("common.people"), t("metric.analyzedMeta"), "blue"),
    metric(t("metric.priority"), data.meta.priorityReviewCount, t("common.people"), t("metric.priorityMeta"), "orange"),
    metric(t("metric.leader"), data.meta.leaderReviewCount, t("common.people"), t("metric.leaderMeta"), "violet"),
    metric(t("metric.gaps"), data.meta.capabilityGapCount, t("common.items"), t("metric.gapsMeta"), "teal")
  ].join(""));

  setHTML("roleReadinessPanel", panelTitle(t("panel.roleReadiness"), t("panel.roleReadinessHelp")) + bars(
    data.roleReadiness.map((item, index) => ({ label: t(`role.${item.role}`), value: item.percent, tone: index === 0 ? "orange" : index === 2 ? "teal" : "" }))
  ));

  setHTML("decisionPanel", panelTitle(t("panel.reviewFlow"), t("panel.reviewFlowHelp")) + list([
    ["1", t("flow.matchTitle"), t("flow.matchText")],
    ["2", t("flow.verifyTitle"), t("flow.verifyText")],
    ["3", t("flow.humanTitle"), t("flow.humanText")]
  ], "decision"));

  setHTML("capabilityPanel", panelTitle(t("panel.capability"), t("panel.capabilityHelp")) + bars(
    data.passDomains.map((domain) => ({ label: t(`domain.${domain}`), value: data.organizationAverage[domain], tone: domain === "attention" ? "teal" : domain === "planning" ? "orange" : "" }))
  ));

  setHTML("insightPanel", panelTitle(t("panel.insights"), t("panel.insightsHelp")) + list([
    ["↗", t("insight.leaderTitle"), t("insight.leaderText")],
    ["◎", t("insight.specialistTitle"), t("insight.specialistText")],
    ["!", t("insight.gapTitle"), t("insight.gapText")]
  ], "insight"));

  const pipelineRows = data.hiringPipeline.map((item) => `<tr><td><strong>${t(`job.${item.job}`)}</strong></td><td>${number(item.applicants)}</td><td>${number(item.complete)}</td><td>${number(item.verify)}</td><td>${number(item.finalReview)}</td></tr>`).join("");
  setHTML("overviewPipelinePanel", panelTitle(t("overview.pipelineTitle"), t("overview.pipelineHelp")) + table(
    [t("table.jobFamily"), t("table.applicants"), t("table.resultsConnected"), t("table.additionalReview"), t("table.finalReview")], pipelineRows
  ));
  setHTML("overviewTasksPanel", panelTitle(t("overview.tasksTitle"), t("overview.tasksHelp")) + list([
    ["1", t("overview.task1Title"), t("overview.task1Text")],
    ["2", t("overview.task2Title"), t("overview.task2Text")],
    ["3", t("overview.task3Title"), t("overview.task3Text")]
  ], "check"));
}

function renderModel() {
  const data = state.data;
  setHTML("modelMeta", "");
  setHTML("profileGrid", data.profiles.map((profile) => `
    <article class="profile-card">
      <div class="profile-icon">${esc(profile.icon)}</div>
      <h3>${t(`profile.${profile.type}`)}</h3>
      <p>${t(`profile.${profile.type}Text`)}</p>
    </article>
  `).join(""));

  renderModelEvaluation();

  const rows = data.profiles.map((profile) => `
    <tr><td><strong>${t(`profile.${profile.type}`)}</strong></td><td>${t(`role.${profile.role}`)}</td><td>${profile.strengths.map((key) => t(`domain.${key}`)).join(" · ")}</td></tr>
  `).join("");
  setHTML("modelTablePanel", panelTitle(t("model.referenceTable"), t("model.referenceTableHelp")) + table(
    [t("table.profile"), t("table.role"), t("table.keyPattern")], rows
  ));
}

function renderModelEvaluation() {
  const candidate = selectedCandidate();
  const evaluation = selectedCandidateEvaluation(candidate.id);
  const passScore = Math.round(Object.values(candidate.pass).reduce((sum, value) => sum + value, 0) / Object.keys(candidate.pass).length);
  const notice = state.modelEvaluationNotice ? `<div class="performance-notice ${state.modelEvaluationNotice.tone}" role="status">${t(state.modelEvaluationNotice.key)}</div>` : "";
  setHTML("modelEvaluationPanel", panelTitle(t("modelEvaluation.title"), t("modelEvaluation.help")) + `
    <div class="model-evaluation-toolbar">
      <label><span>${t("modelEvaluation.target")}</span><select id="modelCandidateSelect">${state.data.candidates.map((item) => `<option value="${esc(item.id)}" ${item.id === candidate.id ? "selected" : ""}>${esc(item.name)} · ${jobLabel(item.appliedJob)}</option>`).join("")}</select></label>
      <span class="pill blue">${t("performance.managerBadge")}</span>
    </div>
    <div class="model-evaluation-grid">
      <div class="model-score-card locked">
        <span class="score-source">${t("modelEvaluation.reportLinked")}</span>
        <strong>${t("modelWeight.pass")}</strong>
        <b>${number(passScore)}</b>
        <small>${t("modelEvaluation.passHelp")}</small>
      </div>
      ${modelEvaluationInput("jobCompetencyEvidence", "modelWeight.job", evaluation.jobCompetencyEvidence, candidate.id)}
      ${modelEvaluationInput("coreValueBehavior", "modelWeight.values", evaluation.coreValueBehavior, candidate.id)}
      ${modelEvaluationInput("workSampleScore", "modelWeight.workSample", evaluation.workSampleScore, candidate.id)}
    </div>
    <div class="model-evaluation-actions"><p>${t("modelEvaluation.evaluatorHelp")}</p><button class="primary-button" type="button" id="applyModelEvaluation">${t("modelEvaluation.apply")}</button></div>
    ${notice}
  `);
  renderModelComparison(candidate, evaluation, passScore);
  document.getElementById("modelCandidateSelect")?.addEventListener("change", (event) => {
    state.candidateId = event.target.value;
    state.modelEvaluationNotice = null;
    renderModel();
  });
  document.getElementById("applyModelEvaluation")?.addEventListener("click", persistCandidateEvaluation);
}

function modelEvaluationInput(field, key, value, candidateId) {
  return `<label class="model-score-card"><span class="score-source">${t("modelEvaluation.evaluatorInput")}</span><strong>${t(key)}</strong><input class="score-input" type="number" min="0" max="100" step="1" inputmode="numeric" data-model-evaluation-field="${field}" value="${clamp(value)}" aria-label="${esc(t("modelEvaluation.scoreAria", { candidate: candidateId, score: t(key) }))}"><small>${t("modelEvaluation.inputHelp")}</small></label>`;
}

function renderModelComparison(candidate, evaluation, passScore) {
  const weights = Object.fromEntries(state.data.talentModelWeights.map((item) => [item.key, item.value / 100]));
  const integratedScore = Math.round(passScore * weights.pass + evaluation.jobCompetencyEvidence * weights.job + evaluation.coreValueBehavior * weights.values + evaluation.workSampleScore * weights.workSample);
  const [topJob, passOnlyScore] = candidate.topJobs[0];
  const difference = Math.abs(integratedScore - passOnlyScore);
  const lowerScore = Math.min(integratedScore, passOnlyScore);
  const higherScore = Math.max(integratedScore, passOnlyScore);
  const alignmentScore = Math.round(lowerScore * 0.75 + higherScore * 0.25);
  const guidanceKey = alignmentScore >= 85 ? "modelComparison.priorityInterview" : alignmentScore >= 70 ? "modelComparison.roleReview" : "modelComparison.moreEvidence";
  const roleRelationKey = candidate.appliedJob === topJob ? "modelComparison.sharedJob" : "modelComparison.crossJob";
  const roleRelation = candidate.appliedJob === topJob ? jobLabel(topJob) : `${jobLabel(candidate.appliedJob)} · ${jobLabel(topJob)}`;
  const summaryKey = difference <= 5 ? "modelComparison.aligned" : difference <= 12 ? "modelComparison.review" : "modelComparison.gap";
  setHTML("modelComparisonPanel", panelTitle(t("modelComparison.title"), t("modelComparison.help")) + `
    <div class="model-comparison-stack">
      <article class="comparison-card integrated"><span>${t("modelComparison.integrated")}</span><strong>${jobLabel(candidate.appliedJob)}</strong><b>${number(integratedScore)}</b><small>${t("modelComparison.integratedHelp")}</small></article>
      <article class="comparison-card pass-only"><span>${t("modelComparison.passOnly")}</span><strong>${jobLabel(topJob)}</strong><b>${number(passOnlyScore)}</b><small>${t("modelComparison.passOnlyHelp")}</small></article>
    </div>
    <div class="alignment-signal"><div><strong>${t("modelComparison.alignmentSignal")}</strong><span>${t("modelComparison.alignmentHelp")}</span></div><b>${number(alignmentScore)}</b><p><span>${t(roleRelationKey)}</span><strong>${roleRelation}</strong><em>${t(guidanceKey)}</em></p></div>
    <div class="comparison-summary"><strong>${t("modelComparison.summary")}</strong><p>${t(summaryKey)}</p></div>
  `);
}

function selectedCandidateEvaluation(candidateId) {
  let evaluation = state.candidateEvaluations.find((item) => item.candidateId === candidateId);
  if (!evaluation) {
    evaluation = { candidateId, jobCompetencyEvidence: 0, coreValueBehavior: 0, workSampleScore: 0, evaluatorRole: "hiringManager", status: "draft", updatedAt: null };
    state.candidateEvaluations.push(evaluation);
  }
  return evaluation;
}

async function persistCandidateEvaluation() {
  const evaluation = selectedCandidateEvaluation(state.candidateId);
  document.querySelectorAll("[data-model-evaluation-field]").forEach((input) => { evaluation[input.dataset.modelEvaluationField] = clamp(input.value); });
  evaluation.status = "approved";
  evaluation.updatedAt = new Date().toISOString();
  try {
    if (state.data.meta.mode === "demo") localStorage.setItem(candidateEvaluationStorageKey(), JSON.stringify(state.candidateEvaluations));
    else await saveCandidateEvaluations([evaluation], readIntegrationContext());
    state.modelEvaluationNotice = { key: "modelEvaluation.applied", tone: "success" };
  } catch (error) {
    console.error(error);
    state.modelEvaluationNotice = { key: "modelEvaluation.saveFailed", tone: "error" };
  }
  renderModel();
}

function renderHiring() {
  const statuses = ["all", "priority", "validate", "alternate", "hold"];
  setHTML("hiringToolbar", `<div class="candidate-filter-block"><div class="candidate-filter-heading"><strong>${t("hiring.filterLabel")}</strong><span>${t("hiring.filterHelp")}</span></div><div class="candidate-filter-grid" role="group" aria-label="${esc(t("hiring.filterLabel"))}">${statuses.map((status) => `<button class="filter-button filter-card ${state.candidateFilter === status ? "active" : ""}" type="button" data-candidate-filter="${status}" aria-pressed="${state.candidateFilter === status}"><strong>${t(`filter.${status}`)}</strong><span>${t(`filterHelp.${status}`)}</span></button>`).join("")}</div></div><aside class="candidate-data-guide"><strong>${t(state.data.meta.mode === "demo" ? "roster.connectDemo" : "roster.connect")}</strong><p>${t(state.data.meta.mode === "demo" ? "roster.connectDemoHelp" : "roster.help")}</p><button class="filter-button" type="button" id="rosterConnectButton">${t("common.details")}</button></aside>`);
  document.querySelectorAll("[data-candidate-filter]").forEach((button) => button.addEventListener("click", () => {
    state.candidateFilter = button.dataset.candidateFilter;
    renderHiring();
  }));

  const matchRate = state.data.meta.rosterApplicantCount ? Math.round(state.data.meta.rosterMatchedCount / state.data.meta.rosterApplicantCount * 100) : 0;
  setHTML("rosterPanel", panelTitle(t("roster.title"), t("roster.help")) + `
    <div class="roster-summary">
      <div><span>${t("roster.name")}</span><strong>${esc(state.data.meta.rosterName)}</strong></div>
      <div><span>${t("roster.source")}</span><strong>${t(`roster.source.${state.data.meta.rosterSource}`)}</strong></div>
      <div><span>${t("roster.matchKey")}</span><strong>${t("roster.matchKeyValue")}</strong></div>
      <div><span>${t("roster.matchRate")}</span><strong>${number(matchRate)}%</strong></div>
      <div><span>${t("roster.updated")}</span><strong>${date(state.data.meta.rosterUpdatedAt)}</strong></div>
    </div>
    <div class="roster-flow"><span><b>1</b>${t("roster.step1")}</span><span><b>2</b>${t("roster.step2")}</span><span><b>3</b>${t("roster.step3")}</span></div>
  `);
  document.getElementById("rosterConnectButton").addEventListener("click", () => document.getElementById("rosterPanel").scrollIntoView({ behavior: "smooth", block: "center" }));

  const candidates = state.data.candidates.filter((candidate) => state.candidateFilter === "all" || candidate.status === state.candidateFilter);
  setHTML("hiringMetrics", [
    metric(t("hiring.metricTotal"), state.data.meta.rosterApplicantCount, t("common.people"), t("hiring.metricTotalMeta"), "blue"),
    metric(t("hiring.metricMatched"), state.data.meta.rosterMatchedCount, t("common.people"), t("hiring.metricMatchedMeta"), "teal"),
    metric(t("hiring.metricUnmatched"), state.data.meta.rosterUnmatchedCount, t("common.people"), t("hiring.metricUnmatchedMeta"), "violet"),
    metric(t("hiring.metricVerify"), state.data.hiringPipeline.reduce((sum, item) => sum + item.verify, 0), t("common.people"), t("hiring.metricVerifyMeta"), "orange")
  ].join(""));
  const rows = candidates.map((candidate) => `
    <tr data-candidate-row="${esc(candidate.id)}" tabindex="0">
      <td>${personCell(candidate)}</td>
      <td>${jobLabel(candidate.appliedJob)}</td>
      <td>${fitScore(candidate.fit)}</td>
      <td>${t(`job.${candidate.topJobs[0][0]}`)}</td>
      <td>${fitScore(candidate.topJobs[0][1])}</td>
      <td>${t(`role.${candidate.recommendedPath}`)}</td>
      <td><span class="tag ${candidate.status}">${t(`status.${candidate.status}`)}</span></td>
    </tr>
  `).join("");
  setHTML("candidateTablePanel", panelTitle(t("hiring.tableTitle"), t("hiring.tableHelp")) + table(
    [t("table.candidate"), t("table.appliedJob"), t("table.appliedFit"), t("table.recommendedJob"), t("table.recommendedFit"), t("table.rolePath"), t("table.reviewStatus")], rows || `<tr><td colspan="7" class="empty-state">${t("common.noData")}</td></tr>`
  ));
  document.querySelectorAll("[data-candidate-row]").forEach((row) => {
    const open = () => { state.candidateId = row.dataset.candidateRow; renderIndividual(); renderDevelopment(); navigate("individual"); };
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") open(); });
  });
  setHTML("hiringPortfolioPanel", panelTitle(t("hiring.portfolioTitle"), t("hiring.portfolioHelp")) + bars(
    state.data.roleReadiness.map((item, index) => ({ label: t(`role.${item.role}`), value: item.percent, tone: index === 0 ? "orange" : index === 2 ? "teal" : "" }))
  ));
  setHTML("hiringGuidePanel", panelTitle(t("hiring.guideTitle"), t("hiring.guideHelp")) + list([
    ["A", t("hiring.guide1Title"), t("hiring.guide1Text")],
    ["B", t("hiring.guide2Title"), t("hiring.guide2Text")],
    ["C", t("hiring.guide3Title"), t("hiring.guide3Text")]
  ], "decision"));
}

function renderBenchmark() {
  const jobs = [...new Set(state.data.jobCoverage.map((item) => item.job))];
  setHTML("benchmarkToolbar", `<div class="toolbar-group"><label><span class="sr-only">${t("common.job")}</span><select id="benchmarkJobSelect">${jobs.map((job) => `<option value="${job}" ${job === state.benchmarkJob ? "selected" : ""}>${t(`job.${job}`)}</option>`).join("")}</select></label></div><span class="pill blue">${t("benchmark.multipleSuccess")}</span>`);
  document.getElementById("benchmarkJobSelect").addEventListener("change", (event) => {
    capturePerformanceInputs();
    state.benchmarkJob = event.target.value;
    state.performanceNotice = null;
    renderBenchmark();
  });
  const selectedCoverage = state.data.jobCoverage.find((item) => item.job === state.benchmarkJob) || state.data.jobCoverage[0];
  const profile = state.data.profiles.find((item) => item.role === "leader") || state.data.profiles[0];
  setHTML("benchmarkChartPanel", panelTitle(t("benchmark.profileTitle"), t("benchmark.profileHelp")) + bars(
    state.data.passDomains.map((domain) => ({ label: t(`domain.${domain}`), value: profile.pass[domain], tone: domain === "planning" ? "orange" : domain === "simultaneous" ? "teal" : "" }))
  ));
  setHTML("benchmarkQualityPanel", panelTitle(t("benchmark.qualityTitle"), t("benchmark.qualityHelp")) + list([
    ["n", t("benchmark.sampleTitle"), t("benchmark.sampleText", { count: number(profile.sampleSize) })],
    ["✓", t("benchmark.outcomeTitle"), t("benchmark.outcomeText")],
    ["↻", t("benchmark.versionTitle"), t("benchmark.versionText", { version: state.data.meta.modelVersion })]
  ], "check"));
  const employeeWeights = state.data.employeeProfileWeights;
  setHTML("talentFormulaPanel", panelTitle(t("benchmark.talentFormulaTitle"), t("benchmark.talentFormulaHelp")) + bars([
    { label: t("benchmark.formulaDcas"), value: employeeWeights.dcas },
    { label: t("benchmark.formulaPerformance"), value: employeeWeights.workPerformance, tone: "orange" },
    { label: t("benchmark.formulaRoleEvidence"), value: employeeWeights.roleEvidence, tone: "teal" }
  ]) + `<div class="model-footnote"><strong>${t("benchmark.talentFormulaNoteTitle")}</strong><p>${t("benchmark.talentFormulaNote")}</p></div>`);
  setHTML("resultOnlyRulePanel", panelTitle(t("benchmark.resultOnlyTitle"), t("benchmark.resultOnlyHelp")) + list([
    ["1", t("benchmark.resultOnlyStep1Title"), t("benchmark.resultOnlyStep1Text")],
    ["2", t("benchmark.resultOnlyStep2Title"), t("benchmark.resultOnlyStep2Text")]
  ], "decision") + `<div class="privacy-callout compact-callout"><span class="bullet-icon">!</span><div><strong>${t("benchmark.resultOnlyDisclaimerTitle")}</strong><p>${t("benchmark.resultOnlyDisclaimer")}</p></div></div>`);
  renderPerformanceEntryPanel(employeeWeights);
  const successRows = derivedEmployeeSuccessProfiles().map((item) => {
    const combined = weightedEmployeeProfileScore(item, employeeWeights);
    return `<tr><td><strong>${t(`job.${item.job}`)}</strong></td><td>${number(item.sampleSize)}</td><td>${fitScore(item.dcasScore)}</td><td>${fitScore(item.workPerformanceScore)}</td><td>${fitScore(item.roleEvidenceScore)}</td><td>${fitScore(combined)}</td><td>${t(`profile.${item.profile}`)}</td></tr>`;
  }).join("") || `<tr><td colspan="7" class="empty-state">${t("common.noData")}</td></tr>`;
  setHTML("performanceBenchmarkPanel", panelTitle(t("benchmark.performanceTableTitle"), t("benchmark.performanceTableHelp")) + table(
    [t("table.jobFamily"), t("table.sample"), t("table.dcasJobMatch"), t("table.performanceScore"), t("table.roleEvidenceScore"), t("table.combinedTalentScore"), t("table.profile")], successRows
  ));
  const resultOnlyRows = state.data.candidates.map((candidate) => {
    const [topJob, topScore] = candidate.topJobs[0];
    return `<tr><td>${personCell(candidate)}</td><td><strong>${t(`job.${topJob}`)}</strong></td><td>${fitScore(topScore)}</td><td><span class="pill violet">${t("benchmark.potentialCandidate")}</span></td><td>${t("benchmark.resultOnlyVerification")}</td></tr>`;
  }).join("");
  setHTML("resultOnlyCandidatesPanel", panelTitle(t("benchmark.resultOnlyTableTitle"), t("benchmark.resultOnlyTableHelp")) + table(
    [t("table.candidate"), t("table.topJob"), t("table.resultOnlySignal"), t("table.interpretation"), t("table.verification")], resultOnlyRows
  ));
  const comparisonRows = state.data.candidates.map((candidate) => {
    const profileDelta = Math.round(state.data.passDomains.reduce((sum, domain) => sum + Math.abs(candidate.pass[domain] - profile.pass[domain]), 0) / state.data.passDomains.length);
    return `<tr><td>${personCell(candidate)}</td><td>${jobLabel(candidate.appliedJob)}</td><td>${number(candidate.fit)}%</td><td>${number(profileDelta)}</td><td>${t(`role.${candidate.recommendedPath}`)}</td><td><span class="tag ${candidate.status}">${t(`status.${candidate.status}`)}</span></td></tr>`;
  }).join("");
  setHTML("benchmarkComparisonPanel", panelTitle(t("benchmark.comparisonTitle"), t("benchmark.comparisonHelp")) + table(
    [t("table.candidate"), t("table.appliedJob"), t("table.fitSignal"), t("table.profileDistance"), t("table.rolePath"), t("table.reviewStatus")], comparisonRows
  ));
  const rows = state.data.profiles.map((item) => `
    <tr><td>${t(`profile.${item.type}`)}</td><td>${t(`role.${item.role}`)}</td><td>${item.strengths.map((key) => t(`domain.${key}`)).join(" · ")}</td><td>${number(item.sampleSize)}</td><td><span class="tag ready">${t("common.validated")}</span></td></tr>
  `).join("");
  setHTML("benchmarkTablePanel", panelTitle(t("benchmark.groupTable"), t("benchmark.coverage", { current: number(selectedCoverage.current), target: number(selectedCoverage.target) })) + table(
    [t("table.profile"), t("table.role"), t("table.keyPattern"), t("table.sample"), t("table.validation")], rows
  ));
}

function renderPerformanceEntryPanel(weights) {
  const records = state.performanceRecords.filter((item) => item.job === state.benchmarkJob);
  const approvedCount = records.filter((item) => item.status === "approved").length;
  const minimum = state.data.meta.minimumCohortSize;
  const rows = records.map((item) => `<tr data-performance-record="${esc(item.employeeId)}">
    <td><strong>${esc(item.employeeId)}</strong></td>
    <td>${esc(item.reviewPeriod)}</td>
    <td><span class="readonly-score" title="${esc(t("performance.dcasReadonlyNote"))}">${number(item.dcasScore)}</span></td>
    <td><input class="score-input" type="number" min="0" max="100" step="1" inputmode="numeric" data-performance-field="workPerformanceScore" value="${number(item.workPerformanceScore)}" aria-label="${esc(t("performance.scoreAria", { employee: item.employeeId, score: t("table.performanceScore") }))}"></td>
    <td><input class="score-input" type="number" min="0" max="100" step="1" inputmode="numeric" data-performance-field="roleEvidenceScore" value="${number(item.roleEvidenceScore)}" aria-label="${esc(t("performance.scoreAria", { employee: item.employeeId, score: t("table.roleEvidenceScore") }))}"></td>
    <td><span class="tag ${item.status === "approved" ? "ready" : "hold"}">${t(`performance.status.${item.status}`)}</span></td>
  </tr>`).join("");
  const readinessKey = approvedCount >= minimum ? "performance.sampleReady" : "performance.sampleInsufficient";
  const notice = state.performanceNotice ? `<div class="performance-notice ${state.performanceNotice.tone}" role="status">${t(state.performanceNotice.key)}</div>` : "";
  setHTML("performanceEntryPanel", panelTitle(t("performance.entryTitle"), t("performance.entryHelp")) + `
    <div class="performance-entry-summary">
      <span class="pill blue">${t("performance.managerBadge")}</span>
      <span>${t("performance.period", { period: esc(records[0]?.reviewPeriod || state.data.meta.cycle) })}</span>
      <span class="${approvedCount >= minimum ? "ready-text" : "warning-text"}">${t(readinessKey, { current: number(approvedCount), minimum: number(minimum) })}</span>
    </div>
    <div class="performance-guidance"><strong>${t("performance.dcasReadonlyTitle")}</strong><p>${t("performance.dcasReadonlyNote")}</p></div>
    ${table([t("performance.employeeId"), t("performance.reviewPeriod"), t("table.dcasJobMatch"), t("table.performanceScore"), t("table.roleEvidenceScore"), t("table.status")], rows || `<tr><td colspan="6" class="empty-state">${t("common.noData")}</td></tr>`)}
    <div class="performance-actions"><p>${t("performance.analysisFormula", { dcas: number(weights.dcas), performance: number(weights.workPerformance), role: number(weights.roleEvidence) })}</p><div><button class="secondary-button" type="button" id="savePerformanceDraft">${t("performance.saveDraft")}</button><button class="primary-button" type="button" id="applyPerformanceAnalysis">${t("performance.applyAnalysis")}</button></div></div>
    ${notice}
  `);
  document.getElementById("savePerformanceDraft")?.addEventListener("click", () => persistPerformanceRecords("draft"));
  document.getElementById("applyPerformanceAnalysis")?.addEventListener("click", () => persistPerformanceRecords("approved"));
}

function capturePerformanceInputs(status = null) {
  document.querySelectorAll("[data-performance-record]").forEach((row) => {
    const record = state.performanceRecords.find((item) => item.employeeId === row.dataset.performanceRecord && item.job === state.benchmarkJob);
    if (!record) return;
    row.querySelectorAll("[data-performance-field]").forEach((input) => {
      record[input.dataset.performanceField] = clamp(input.value);
    });
    if (status) record.status = status;
    record.updatedAt = new Date().toISOString();
  });
}

async function persistPerformanceRecords(status) {
  capturePerformanceInputs(status);
  try {
    if (state.data.meta.mode === "demo") {
      localStorage.setItem(performanceStorageKey(), JSON.stringify(state.performanceRecords));
    } else {
      await saveEmployeePerformanceRecords(state.performanceRecords.filter((item) => item.job === state.benchmarkJob), readIntegrationContext());
    }
    state.performanceNotice = { key: status === "approved" ? "performance.applied" : "performance.savedDraft", tone: "success" };
  } catch (error) {
    console.error(error);
    state.performanceNotice = { key: "performance.saveFailed", tone: "error" };
  }
  renderBenchmark();
}

function derivedEmployeeSuccessProfiles() {
  const minimum = state.data.meta.minimumCohortSize;
  const fallbackByJob = new Map(state.data.employeeSuccessProfiles.map((item) => [item.job, item]));
  const jobs = [...new Set([...fallbackByJob.keys(), ...state.performanceRecords.map((item) => item.job)])];
  return jobs.map((job) => {
    const records = state.performanceRecords.filter((item) => item.job === job && item.status === "approved");
    const fallback = fallbackByJob.get(job);
    if (records.length < minimum) return fallback;
    return {
      job,
      sampleSize: records.length,
      dcasScore: average(records, "dcasScore"),
      workPerformanceScore: average(records, "workPerformanceScore"),
      roleEvidenceScore: average(records, "roleEvidenceScore"),
      profile: records[0]?.profile || fallback?.profile || "operator"
    };
  }).filter(Boolean);
}

function average(records, key) {
  return Math.round(records.reduce((sum, item) => sum + Number(item[key]), 0) / records.length);
}

function performanceStorageKey() {
  return `dcas.enterprise.performanceRecords.${state.data.meta.modelId}`;
}

function candidateEvaluationStorageKey() {
  return `dcas.enterprise.candidateEvaluations.${state.data.meta.modelId}`;
}

function loadCandidateEvaluations(seed = []) {
  if (state.data.meta.mode !== "demo") return structuredClone(seed);
  try {
    const stored = JSON.parse(localStorage.getItem(candidateEvaluationStorageKey()));
    return Array.isArray(stored) ? stored : structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}

function loadPerformanceRecords(fallback = []) {
  if (state.data.meta.mode !== "demo") return structuredClone(fallback || []);
  try {
    const saved = JSON.parse(localStorage.getItem(performanceStorageKey()));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return structuredClone(fallback || []);
}

function weightedEmployeeProfileScore(item, weights) {
  const totalWeight = weights.dcas + weights.workPerformance + weights.roleEvidence;
  if (!totalWeight) return 0;
  return Math.round((item.dcasScore * weights.dcas + item.workPerformanceScore * weights.workPerformance + item.roleEvidenceScore * weights.roleEvidence) / totalWeight);
}

function renderIndividual() {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const resume = state.resumeFiles[candidate.id] || candidate.resume || null;
  const rankedDomains = state.data.passDomains
    .map((domain) => [domain, candidate.pass[domain]])
    .sort((a, b) => b[1] - a[1]);
  setHTML("individualSelector", `<label><span class="sr-only">${t("table.candidate")}</span><select class="person-select" id="candidateSelect">${state.data.candidates.map((item) => `<option value="${esc(item.id)}" ${item.id === candidate.id ? "selected" : ""}>${esc(item.name)} · ${jobLabel(item.appliedJob)}</option>`).join("")}</select></label>`);
  document.getElementById("candidateSelect").addEventListener("change", (event) => { state.candidateId = event.target.value; renderIndividual(); renderDevelopment(); });
  setHTML("personHero", `
    <div class="avatar">${esc(initials(candidate.name))}</div>
    <div><h2>${esc(candidate.name)}</h2><p>${t("individual.appliedJobLine", { job: jobLabel(candidate.appliedJob), source: t(`individual.jobSource.${candidate.appliedJobSource || "managerInput"}`) })}</p></div>
    <div class="hero-score"><strong>${candidate.appliedJob ? `${number(candidate.fit)}%` : "—"}</strong><small>${candidate.appliedJob ? t("table.fitSignal") : t("individual.noJobFit")}</small></div>
  `);
  setHTML("individualSourcePanel", `
    <strong>${t("individual.dataSources")}</strong>
    <span class="source-chip"><b>1</b>${t("individual.sourceDcas")}</span>
    <span class="source-chip"><b>2</b>${t("individual.sourceApplication")}</span>
    <span class="source-chip"><b>3</b>${t("individual.sourceCompanyModel", { version: state.data.meta.modelVersion })}</span>
  `);
  setHTML("resultSummaryPanel", panelTitle(t("individual.resultSummaryTitle"), t("individual.resultSummaryHelp")) + `
    <div class="report-summary-grid">
      <div><span>${t("individual.resultId")}</span><strong>${esc(candidate.reportId || candidate.id)}</strong></div>
      <div><span>${t("individual.assessedAt")}</span><strong>${date(candidate.assessedAt || state.data.meta.updatedAt)}</strong></div>
    </div>
    <div class="summary-highlight">
      <span class="bullet-icon">D</span>
      <p>${t("individual.resultSummaryText", { first: t(`domain.${rankedDomains[0][0]}`), firstScore: number(rankedDomains[0][1]), second: t(`domain.${rankedDomains[1][0]}`), secondScore: number(rankedDomains[1][1]) })}</p>
    </div>
  `);
  setHTML("resumePanel", panelTitle(t("individual.resumeTitle"), t("individual.resumeHelp")) + `
    <div class="resume-upload-row">
      <div class="resume-file-status">
        <span>${t("individual.resumeStatus")}</span>
        <strong>${resume ? esc(resume.fileName) : t("individual.resumeNotConnected")}</strong>
        <small>${resume ? t("individual.resumeUpdated", { date: date(resume.updatedAt) }) : t("individual.resumePrivacy")}</small>
      </div>
      <label class="secondary-button upload-button" for="resumeUpload">${resume ? t("individual.resumeReplace") : t("individual.resumeUpload")}</label>
      <input class="sr-only" id="resumeUpload" type="file" accept=".pdf,.doc,.docx" aria-label="${t("individual.resumeUploadAria")}">
    </div>
    <div class="resume-match-block">
      <strong>${t("individual.resumeMatchTitle")}</strong>
      <p>${t("individual.resumeMatchHelp")}</p>
      ${resume ? `<div class="job-list compact">${(candidate.resumeTopJobs || candidate.topJobs.slice(0, 3)).map(([job, score], index) => `<div class="job-item"><span class="job-rank">${index + 1}</span><strong>${t(`job.${job}`)}</strong><span>${number(score)}%</span></div>`).join("")}</div>` : `<div class="empty-state compact">${t("individual.resumeMatchEmpty")}</div>`}
    </div>
  `);
  document.getElementById("resumeUpload").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.resumeFiles[candidate.id] = { fileName: file.name, updatedAt: new Date().toISOString() };
    saveResumeMetadata(state.resumeFiles);
    renderIndividual();
  });
  setHTML("passPanel", panelTitle(t("individual.passTitle"), t("individual.passHelp")) + bars(
    state.data.passDomains.map((domain) => ({ label: t(`domain.${domain}`), value: candidate.pass[domain], tone: domain === "planning" ? "orange" : domain === "attention" ? "teal" : "" }))
  ));
  setHTML("roleFitPanel", candidate.appliedJob ? panelTitle(t("individual.roleTitle"), t("individual.roleHelp")) + bars([
    { label: t("individual.readiness"), value: candidate.readiness },
    { label: t("individual.leaderPotential"), value: candidate.leaderPotential, tone: "orange" },
    { label: t("individual.expertPotential"), value: candidate.expertPotential, tone: "teal" }
  ]) : panelTitle(t("individual.roleTitle"), t("individual.roleHelp")) + `<div class="empty-state">${t("individual.jobRequired")}</div>`);
  setHTML("topJobsPanel", panelTitle(t("individual.topJobs"), t("individual.topJobsHelp")) + `<div class="source-caption">${t("individual.sourceDcas")}</div><div class="job-list">${candidate.topJobs.map(([job, score], index) => `<div class="job-item"><span class="job-rank">${index + 1}</span><strong>${t(`job.${job}`)}</strong><span>${number(score)}%</span></div>`).join("")}</div>`);
  setHTML("evidencePanel", panelTitle(t("individual.evidenceTitle"), t("individual.evidenceHelp")) + `<ul class="check-list">${candidate.evidence.map((key) => `<li class="check-item"><span class="bullet-icon">✓</span><p>${t(key)}</p></li>`).join("")}${candidate.verify.map((key) => `<li class="check-item"><span class="bullet-icon">?</span><p>${t(key)}</p></li>`).join("")}</ul>`);
  const placementRows = Object.entries(candidate.roleScores).sort((a, b) => b[1] - a[1]).map(([role, score], index) => `<tr><td><strong>${number(index + 1)}</strong></td><td>${t(`role.${role}`)}</td><td>${fitScore(score)}</td><td>${t(index === 0 ? "individual.placementPrimary" : index === 1 ? "individual.placementSecondary" : "individual.placementExplore")}</td></tr>`).join("");
  setHTML("rolePlacementPanel", panelTitle(t("individual.placementTitle"), t("individual.placementHelp")) + table(
    [t("table.rank"), t("table.rolePath"), t("table.fitSignal"), t("table.recommendation")], placementRows
  ));
  setHTML("interviewPanel", panelTitle(t("individual.interviewTitle"), t("individual.interviewHelp")) + list([
    ["1", t("interview.q1Title"), t("interview.q1")],
    ["2", t("interview.q2Title"), t("interview.q2")],
    ["3", t("interview.q3Title"), t("interview.q3")]
  ], "insight") + `<div class="privacy-callout" style="margin-top:14px"><span class="bullet-icon">!</span><div><strong>${t("individual.disclaimerTitle")}</strong><p>${t("individual.disclaimer")}</p></div></div>`);
}

function renderDevelopment() {
  const candidate = selectedCandidate();
  if (!candidate) return;
  const days = [30, 60, 90];
  setHTML("timelineGrid", candidate.actions.map((key, index) => `<article class="timeline-card"><span class="day">${t("development.day", { day: days[index] })}</span><h2>${t(`development.phase${index + 1}`)}</h2><p>${t(key)}</p></article>`).join(""));
  setHTML("developmentPriorityPanel", panelTitle(t("development.priorityTitle"), t("development.priorityHelp")) + `<ul class="check-list">${candidate.priorities.map((key) => `<li class="check-item"><span class="bullet-icon">↗</span><p>${t(key)}</p></li>`).join("")}</ul>`);
  setHTML("workStylePanel", panelTitle(t("development.workStyleTitle"), t("development.workStyleHelp")) + `<ul class="check-list">${candidate.workStyle.map((key) => `<li class="check-item"><span class="bullet-icon">◎</span><p>${t(key)}</p></li>`).join("")}</ul>`);
  setHTML("developmentGoalsPanel", panelTitle(t("development.goalsTitle"), t("development.goalsHelp")) + list([
    ["30", t("development.goal1Title"), t("development.goal1Text")],
    ["60", t("development.goal2Title"), t("development.goal2Text")],
    ["90", t("development.goal3Title"), t("development.goal3Text")]
  ], "check"));
  setHTML("developmentOwnerPanel", panelTitle(t("development.reviewTitle"), t("development.reviewHelp")) + list([
    ["M", t("development.managerTitle"), t("development.managerText")],
    ["H", t("development.hrTitle"), t("development.hrText")],
    ["S", t("development.selfTitle"), t("development.selfText")]
  ], "decision"));
}

function renderOrganization() {
  const coverage = state.data.jobCoverage;
  const aboveTarget = coverage.filter((item) => item.current >= item.target).length;
  const largestGap = Math.max(...coverage.map((item) => item.target - item.current));
  setHTML("organizationMetrics", [
    metric(t("organization.roles"), coverage.length, t("common.items"), t("organization.rolesMeta"), "blue"),
    metric(t("organization.covered"), aboveTarget, t("common.items"), t("organization.coveredMeta"), "teal"),
    metric(t("organization.largestGap"), largestGap, "%", t("organization.largestGapMeta"), "orange"),
    metric(t("organization.minCohort"), state.data.meta.minimumCohortSize, t("common.people"), t("organization.minCohortMeta"), "violet")
  ].join(""));
  setHTML("coveragePanel", panelTitle(t("organization.coverageTitle"), t("organization.coverageHelp")) + bars(coverage.map((item) => ({ label: t(`job.${item.job}`), value: item.current, tone: item.current >= item.target ? "teal" : "orange" }))));
  setHTML("balancePanel", panelTitle(t("organization.balanceTitle"), t("organization.balanceHelp")) + bars(state.data.roleReadiness.map((item) => ({ label: t(`role.${item.role}`), value: item.percent }))));
  const departmentRows = state.data.departments.map((item) => `<tr><td><strong>${t(`department.${item.department}`)}</strong></td><td>${number(item.headcount)}</td><td>${number(item.leaderReady)}</td><td>${number(item.specialistReady)}</td><td>${number(item.coverage)}%</td><td>${t(`job.${item.gap}`)}</td></tr>`).join("");
  setHTML("departmentPanel", panelTitle(t("organization.departmentTitle"), t("organization.departmentHelp")) + table(
    [t("table.department"), t("table.headcount"), t("table.leaderPool"), t("table.specialistPool"), t("table.coverage"), t("table.priorityGap")], departmentRows
  ));
  setHTML("successionPanel", panelTitle(t("organization.successionTitle"), t("organization.successionHelp")) + `<div class="succession-list">${state.data.succession.map((item) => `<div class="succession-row"><strong>${t(`role.${item.role}`)}</strong><span>${t("organization.readyNow", { count: number(item.readyNow) })}</span><span>${t("organization.readyLater", { count: number(item.readyLater) })}</span><span class="pill ${item.gap > 2 ? "orange" : "teal"}">${t("organization.gap", { count: number(item.gap) })}</span></div>`).join("")}</div>`);
  setHTML("mobilityPanel", panelTitle(t("organization.mobilityTitle"), t("organization.mobilityHelp")) + list(state.data.internalMobility.map((item) => ["↗", t(`job.${item.from}`), t("organization.mobilityPath", { to: t(`job.${item.to}`), count: number(item.count) })]), "insight"));
  setHTML("privacyCallout", `<span class="bullet-icon">!</span><div><strong>${t("organization.privacyTitle")}</strong><p>${t("organization.privacyText", { count: number(state.data.meta.minimumCohortSize) })}</p></div>`);
}

function renderActions() {
  setHTML("actionMetrics", [
    metric(t("actions.open"), state.data.actions.filter((item) => item.status === "open").length, t("common.items"), t("actions.openMeta"), "blue"),
    metric(t("actions.progress"), state.data.actions.filter((item) => item.status === "inProgress").length, t("common.items"), t("actions.progressMeta"), "orange"),
    metric(t("actions.done"), state.data.actions.filter((item) => item.status === "done").length, t("common.items"), t("actions.doneMeta"), "teal"),
    metric(t("actions.overdue"), state.data.actions.filter((item) => item.status !== "done" && new Date(item.due) < new Date(state.data.meta.updatedAt)).length, t("common.items"), t("actions.overdueMeta"), "violet")
  ].join(""));
  const rows = state.data.actions.map((action) => `
    <tr><td><strong>${esc(action.id)}</strong></td><td>${t(`actionType.${action.type}`)}</td><td>${esc(action.subject)}</td><td>${esc(action.owner)}</td><td>${date(action.due)}</td><td><span class="tag ${action.status === "done" ? "ready" : action.status === "inProgress" ? "validate" : "hold"}">${t(`actionStatus.${action.status}`)}</span></td></tr>
  `).join("");
  setHTML("actionTablePanel", panelTitle(t("actions.tableTitle"), t("actions.tableHelp")) + table(
    [t("table.id"), t("table.action"), t("table.subject"), t("table.owner"), t("table.due"), t("table.status")], rows
  ));
  setHTML("actionStagePanel", panelTitle(t("actions.stageTitle"), t("actions.stageHelp")) + bars([
    ...state.data.reviewStageCompletion.map((item, index) => ({ label: t(`actionType.${item.type}`), value: item.value, tone: index === 1 ? "orange" : index === 2 ? "teal" : "" }))
  ]));
  setHTML("actionPolicyPanel", panelTitle(t("actions.policyTitle"), t("actions.policyHelp")) + list([
    ["✓", t("actions.policy1Title"), t("actions.policy1Text")],
    ["✓", t("actions.policy2Title"), t("actions.policy2Text")],
    ["!", t("actions.policy3Title"), t("actions.policy3Text")]
  ], "check"));
}

function renderCompetencies() {
  const model = state.competencyModel;
  const totalWeight = model.competencies.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  setHTML("competencyMeta", `${tag(`${t("common.version")} ${esc(model.version)}`, "violet")} ${tag(t(`competency.status.${model.status}`), model.status === "published" ? "teal" : model.status === "review" ? "orange" : "gray")}`);
  setHTML("competencyWorkflow", `<div><h2>${t("competency.workflowTitle")}</h2><p>${t("competency.workflowText")}</p></div><span class="pill blue">${t("competency.workflowSteps")}</span>`);
  setHTML("competencyContext", panelTitle(t("competency.contextTitle"), t("competency.contextHelp")) + `
    <div class="field-stack">
      <label><span>${t("competency.department")}</span><select id="competencyDepartment">${state.data.departments.map((item) => `<option value="${item.department}" ${item.department === model.department ? "selected" : ""}>${t(`department.${item.department}`)}</option>`).join("")}</select></label>
      <label><span>${t("competency.job")}</span><select id="competencyJob">${state.data.jobCoverage.map((item) => `<option value="${item.job}" ${item.job === model.job ? "selected" : ""}>${t(`job.${item.job}`)}</option>`).join("")}</select></label>
    </div>
    <div class="context-summary"><div><strong>${number(model.competencies.length)}</strong><span>${t("competency.count")}</span></div><div><strong class="${totalWeight === 100 ? "ok" : "warn"}">${number(totalWeight)}%</strong><span>${t("competency.totalWeight")}</span></div></div>
    <div class="workflow-actions"><button class="secondary-button" type="button" id="saveCompetency">${t("competency.saveDraft")}</button><button class="primary-button" type="button" id="submitCompetency">${t("competency.submitReview")}</button><button class="secondary-button" type="button" id="publishCompetency">${t("competency.publish")}</button></div>
  `);
  setHTML("competencyEditor", panelTitle(t("competency.editorTitle"), t("competency.editorHelp")) + `
    <div class="competency-list">${model.competencies.map(competencyEditorRow).join("")}</div>
    <button class="add-button" type="button" id="addCompetency">＋ ${t("competency.add")}</button>
  `);
  renderCompetencyPreview();
  bindCompetencyEvents();
}

function competencyEditorRow(item) {
  return `<div class="competency-card" data-competency-id="${esc(item.id)}">
    <div class="competency-card-head"><input class="competency-name" data-field="name" value="${esc(item.name)}" placeholder="${t("competency.namePlaceholder")}" aria-label="${t("competency.name")}"><button class="remove-button" type="button" data-remove-competency="${esc(item.id)}" aria-label="${t("competency.remove")}">×</button></div>
    <div class="competency-fields">
      <label><span>${t("competency.scope")}</span><select data-field="scope">${["common", "job", "role"].map((key) => `<option value="${key}" ${item.scope === key ? "selected" : ""}>${t(`competency.scope.${key}`)}</option>`).join("")}</select></label>
      <label><span>${t("competency.targetLevel")}</span><select data-field="targetLevel">${[1,2,3,4].map((level) => `<option value="${level}" ${Number(item.targetLevel) === level ? "selected" : ""}>${t(`competency.level.${level}`)}</option>`).join("")}</select></label>
      <label><span>${t("competency.weight")}</span><input type="number" min="0" max="100" step="5" data-field="weight" value="${number(item.weight)}"></label>
      <label><span>${t("competency.evidence")}</span><select data-field="evidence">${["interview", "workSample", "portfolio", "performance"].map((key) => `<option value="${key}" ${item.evidence === key ? "selected" : ""}>${t(`competency.evidence.${key}`)}</option>`).join("")}</select></label>
    </div>
    <label class="behavior-field"><span>${t("competency.behavior")}</span><textarea data-field="behavior" rows="2" placeholder="${t("competency.behaviorPlaceholder")}">${esc(item.behavior)}</textarea></label>
  </div>`;
}

function renderCompetencyPreview() {
  const rows = state.competencyModel.competencies.map((item) => `<tr><td><strong>${esc(item.name || t("competency.unnamed"))}</strong></td><td>${t(`competency.scope.${item.scope}`)}</td><td>${t(`competency.level.${item.targetLevel}`)}</td><td>${number(item.weight)}%</td><td>${t(`competency.evidence.${item.evidence}`)}</td><td>${esc(item.behavior)}</td></tr>`).join("");
  setHTML("competencyPreview", panelTitle(t("competency.previewTitle"), t("competency.previewHelp")) + table(
    [t("competency.name"), t("competency.scope"), t("competency.targetLevel"), t("competency.weight"), t("competency.evidence"), t("competency.behavior")], rows
  ));
}

function bindCompetencyEvents() {
  document.getElementById("competencyDepartment").addEventListener("change", (event) => { state.competencyModel.department = event.target.value; renderCompetencies(); });
  document.getElementById("competencyJob").addEventListener("change", (event) => { state.competencyModel.job = event.target.value; renderCompetencies(); });
  document.querySelectorAll("[data-competency-id] [data-field]").forEach((control) => control.addEventListener("change", (event) => {
    const card = event.target.closest("[data-competency-id]");
    const item = state.competencyModel.competencies.find((entry) => entry.id === card.dataset.competencyId);
    if (!item) return;
    const field = event.target.dataset.field;
    item[field] = ["targetLevel", "weight"].includes(field) ? Number(event.target.value) : event.target.value;
    renderCompetencies();
  }));
  document.querySelectorAll("[data-remove-competency]").forEach((button) => button.addEventListener("click", () => {
    state.competencyModel.competencies = state.competencyModel.competencies.filter((item) => item.id !== button.dataset.removeCompetency);
    renderCompetencies();
  }));
  document.getElementById("addCompetency").addEventListener("click", () => {
    state.competencyModel.competencies.push({ id: `CMP-${Date.now()}`, name: "", scope: "job", targetLevel: 2, weight: 0, evidence: "interview", behavior: "" });
    renderCompetencies();
  });
  document.getElementById("saveCompetency").addEventListener("click", () => persistCompetencyModel("draft"));
  document.getElementById("submitCompetency").addEventListener("click", () => persistCompetencyModel("review"));
  document.getElementById("publishCompetency").addEventListener("click", () => persistCompetencyModel("published"));
}

function persistCompetencyModel(status) {
  state.competencyModel.status = status;
  state.competencyModel.updatedAt = new Date().toISOString();
  try { localStorage.setItem("dcas.enterprise.competencyModel", JSON.stringify(state.competencyModel)); } catch {}
  renderCompetencies();
}

function loadCompetencyModel(fallback) {
  try {
    const saved = JSON.parse(localStorage.getItem("dcas.enterprise.competencyModel"));
    if (saved && Array.isArray(saved.competencies)) return saved;
  } catch {}
  return structuredClone(fallback);
}

function buildLanguageSelect() {
  const select = document.getElementById("languageSelect");
  select.innerHTML = getManifest().map((locale) => `<option value="${locale.code}" ${locale.code === getLocale() ? "selected" : ""}>${esc(locale.label)}</option>`).join("");
  select.addEventListener("change", async (event) => {
    const currentPage = state.page;
    const candidateId = state.candidateId;
    capturePerformanceInputs();
    select.disabled = true;
    try {
      await setLocale(event.target.value);
      state.page = currentPage;
      state.candidateId = candidateId;
      renderAll();
      navigate(currentPage, { updateHash: false, focus: false });
    } finally {
      select.disabled = false;
      select.focus();
    }
  });
}

function bindShellEvents() {
  document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.page)));
  const menuButton = document.getElementById("menuButton");
  const sidebar = document.getElementById("sidebar");
  menuButton.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
  window.addEventListener("hashchange", () => navigate(resolvePageFromHash(), { updateHash: false }));
}

function navigate(page, options = {}) {
  const target = PAGE_IDS.includes(page) ? page : "overview";
  state.page = target;
  document.querySelectorAll("[data-page-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.pagePanel === target));
  document.querySelectorAll("[data-page]").forEach((button) => {
    const active = button.dataset.page === target;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page"); else button.removeAttribute("aria-current");
  });
  if (options.updateHash !== false) history.replaceState(history.state, "", `${location.pathname}${location.search}#${target}`);
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("menuButton").setAttribute("aria-expanded", "false");
  if (options.focus !== false) document.getElementById("main").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resolvePageFromHash() {
  const hash = location.hash.replace(/^#/, "");
  if (hash === "settings") return "competencies";
  return PAGE_IDS.includes(hash) ? hash : "overview";
}

function selectedCandidate() {
  return state.data.candidates.find((item) => item.id === state.candidateId) || state.data.candidates[0];
}

function readIntegrationContext() {
  const params = new URLSearchParams(location.search);
  return {
    reportId: params.get("reportId"),
    api: params.get("api"),
    organIdx: params.get("organIdx"),
    base: params.get("base"),
    lang: params.get("lang")
  };
}

function metric(label, value, unit, meta, tone) {
  return `<article class="metric-card ${tone}"><div class="label">${label}</div><div class="value">${number(value)}<small>${unit}</small></div><div class="meta">${meta}</div></article>`;
}

function panelTitle(title, help) {
  return `<div class="panel-title"><div><h2>${title}</h2><p>${help}</p></div></div>`;
}

function bars(items) {
  return `<div class="bar-list">${items.map((item) => `<div class="bar-row"><div class="bar-label">${item.label}</div><div class="bar-track"><div class="bar-fill ${item.tone || ""}" style="width:${clamp(item.value)}%"></div></div><div class="bar-value">${number(item.value)}%</div></div>`).join("")}</div>`;
}

function list(items, className) {
  return `<ul class="${className}-list">${items.map(([icon, title, text]) => `<li class="${className}-item"><span class="bullet-icon">${icon}</span><div><strong>${title}</strong><p>${text}</p></div></li>`).join("")}</ul>`;
}

function table(headers, rows) {
  return `<table class="data-table"><thead><tr>${headers.map((header) => `<th scope="col">${header}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table>`;
}

function personCell(candidate) {
  return `<div class="person-cell"><div class="avatar">${esc(initials(candidate.name))}</div><div><strong>${esc(candidate.name)}</strong><small>${t("individual.openDetail")}</small></div></div>`;
}

function loadResumeMetadata() {
  try { return JSON.parse(localStorage.getItem("dcas-enterprise-resume-metadata") || "{}"); }
  catch { return {}; }
}

function saveResumeMetadata(value) {
  localStorage.setItem("dcas-enterprise-resume-metadata", JSON.stringify(value));
}

function jobLabel(job) {
  return job ? t(`job.${job}`) : t("individual.noAppliedJob");
}

function fitScore(value) {
  return `<div class="fit-score"><div class="bar-track"><div class="bar-fill" style="width:${clamp(value)}%"></div></div><strong>${number(value)}%</strong></div>`;
}

function tag(text, tone) {
  return `<span class="pill ${tone}">${text}</span>`;
}

function setHTML(id, html) {
  document.getElementById(id).innerHTML = html;
}

function initials(value) {
  return String(value).replace(/[^A-Za-z0-9가-힣]/g, "").slice(-2).toUpperCase();
}

function clamp(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

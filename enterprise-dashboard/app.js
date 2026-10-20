import { initializeI18n, setLocale, getLocale, getManifest, t, number, date, applyTranslations } from "./i18n.js";
import { loadDashboardData } from "./data-adapter.js";

const state = {
  data: null,
  page: "overview",
  candidateId: null,
  candidateFilter: "all",
  benchmarkJob: "productStrategy"
};

const PAGE_IDS = ["overview", "model", "hiring", "benchmark", "individual", "development", "organization", "actions", "settings"];

await initializeI18n();
state.data = await loadDashboardData(readIntegrationContext());
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
  renderOverview();
  renderModel();
  renderHiring();
  renderBenchmark();
  renderIndividual();
  renderDevelopment();
  renderOrganization();
  renderActions();
  renderSettings();
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
}

function renderModel() {
  const data = state.data;
  setHTML("modelMeta", `${tag(`${t("common.version")} ${esc(data.meta.modelVersion)}`, "violet")} ${tag(t("common.validatedModel"), "teal")}`);
  setHTML("modelBanner", `
    <div><h2>${t("model.bannerTitle")}</h2><p>${t("model.bannerText")}</p></div>
    <span class="pill orange">${t("model.multipleProfiles")}</span>
  `);
  setHTML("profileGrid", data.profiles.map((profile) => `
    <article class="profile-card">
      <div class="profile-icon">${esc(profile.icon)}</div>
      <h3>${t(`profile.${profile.type}`)}</h3>
      <p>${t(`profile.${profile.type}Text`)}</p>
      <div class="profile-meta"><span class="pill blue">${t("common.sample", { count: number(profile.sampleSize) })}</span><span class="pill teal">${t("common.confidence", { value: number(profile.confidence) })}</span></div>
    </article>
  `).join(""));

  const rows = data.profiles.map((profile) => `
    <tr><td><strong>${t(`profile.${profile.type}`)}</strong></td><td>${t(`role.${profile.role}`)}</td><td>${profile.strengths.map((key) => t(`domain.${key}`)).join(" · ")}</td><td>${number(profile.sampleSize)}</td><td>${number(profile.confidence)}%</td></tr>
  `).join("");
  setHTML("modelTablePanel", panelTitle(t("model.referenceTable"), t("model.referenceTableHelp")) + table(
    [t("table.profile"), t("table.role"), t("table.keyPattern"), t("table.sample"), t("table.confidence")], rows
  ));
}

function renderHiring() {
  const statuses = ["all", "priority", "validate", "alternate", "hold"];
  setHTML("hiringToolbar", `<div class="toolbar-group">${statuses.map((status) => `<button class="filter-button ${state.candidateFilter === status ? "active" : ""}" type="button" data-candidate-filter="${status}">${t(`filter.${status}`)}</button>`).join("")}</div><span class="pill gray">${t("hiring.noAuto")}</span>`);
  document.querySelectorAll("[data-candidate-filter]").forEach((button) => button.addEventListener("click", () => {
    state.candidateFilter = button.dataset.candidateFilter;
    renderHiring();
  }));

  const candidates = state.data.candidates.filter((candidate) => state.candidateFilter === "all" || candidate.status === state.candidateFilter);
  const rows = candidates.map((candidate) => `
    <tr data-candidate-row="${esc(candidate.id)}" tabindex="0">
      <td>${personCell(candidate)}</td>
      <td>${t(`job.${candidate.appliedJob}`)}</td>
      <td>${fitScore(candidate.fit)}</td>
      <td>${t(`role.${candidate.recommendedPath}`)}</td>
      <td><span class="tag ${candidate.status}">${t(`status.${candidate.status}`)}</span></td>
      <td>${t(`job.${candidate.topJobs[0][0]}`)}</td>
    </tr>
  `).join("");
  setHTML("candidateTablePanel", panelTitle(t("hiring.tableTitle"), t("hiring.tableHelp")) + table(
    [t("table.candidate"), t("table.appliedJob"), t("table.fitSignal"), t("table.rolePath"), t("table.reviewStatus"), t("table.alternative")], rows || `<tr><td colspan="6" class="empty-state">${t("common.noData")}</td></tr>`
  ));
  document.querySelectorAll("[data-candidate-row]").forEach((row) => {
    const open = () => { state.candidateId = row.dataset.candidateRow; renderIndividual(); renderDevelopment(); navigate("individual"); };
    row.addEventListener("click", open);
    row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") open(); });
  });
}

function renderBenchmark() {
  const jobs = [...new Set(state.data.jobCoverage.map((item) => item.job))];
  setHTML("benchmarkToolbar", `<div class="toolbar-group"><label><span class="sr-only">${t("common.job")}</span><select id="benchmarkJobSelect">${jobs.map((job) => `<option value="${job}" ${job === state.benchmarkJob ? "selected" : ""}>${t(`job.${job}`)}</option>`).join("")}</select></label></div><span class="pill blue">${t("benchmark.multipleSuccess")}</span>`);
  document.getElementById("benchmarkJobSelect").addEventListener("change", (event) => { state.benchmarkJob = event.target.value; renderBenchmark(); });
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
  const rows = state.data.profiles.map((item) => `
    <tr><td>${t(`profile.${item.type}`)}</td><td>${t(`role.${item.role}`)}</td><td>${item.strengths.map((key) => t(`domain.${key}`)).join(" · ")}</td><td>${number(item.sampleSize)}</td><td><span class="tag ready">${t("common.validated")}</span></td></tr>
  `).join("");
  setHTML("benchmarkTablePanel", panelTitle(t("benchmark.groupTable"), t("benchmark.coverage", { current: number(selectedCoverage.current), target: number(selectedCoverage.target) })) + table(
    [t("table.profile"), t("table.role"), t("table.keyPattern"), t("table.sample"), t("table.validation")], rows
  ));
}

function renderIndividual() {
  const candidate = selectedCandidate();
  if (!candidate) return;
  setHTML("individualSelector", `<label><span class="sr-only">${t("table.candidate")}</span><select class="person-select" id="candidateSelect">${state.data.candidates.map((item) => `<option value="${esc(item.id)}" ${item.id === candidate.id ? "selected" : ""}>${esc(item.name)} · ${t(`job.${item.appliedJob}`)}</option>`).join("")}</select></label>`);
  document.getElementById("candidateSelect").addEventListener("change", (event) => { state.candidateId = event.target.value; renderIndividual(); renderDevelopment(); });
  setHTML("personHero", `
    <div class="avatar">${esc(initials(candidate.name))}</div>
    <div><h2>${esc(candidate.name)}</h2><p>${t(`job.${candidate.appliedJob}`)} · ${t(`status.${candidate.status}`)} · ${t("individual.source")}</p></div>
    <div class="hero-score"><strong>${number(candidate.fit)}%</strong><small>${t("table.fitSignal")}</small></div>
  `);
  setHTML("passPanel", panelTitle(t("individual.passTitle"), t("individual.passHelp")) + bars(
    state.data.passDomains.map((domain) => ({ label: t(`domain.${domain}`), value: candidate.pass[domain], tone: domain === "planning" ? "orange" : domain === "attention" ? "teal" : "" }))
  ));
  setHTML("roleFitPanel", panelTitle(t("individual.roleTitle"), t("individual.roleHelp")) + bars([
    { label: t("individual.readiness"), value: candidate.readiness },
    { label: t("individual.leaderPotential"), value: candidate.leaderPotential, tone: "orange" },
    { label: t("individual.expertPotential"), value: candidate.expertPotential, tone: "teal" }
  ]));
  setHTML("topJobsPanel", panelTitle(t("individual.topJobs"), t("individual.topJobsHelp")) + `<div class="job-list">${candidate.topJobs.map(([job, score], index) => `<div class="job-item"><span class="job-rank">${index + 1}</span><strong>${t(`job.${job}`)}</strong><span>${number(score)}%</span></div>`).join("")}</div>`);
  setHTML("evidencePanel", panelTitle(t("individual.evidenceTitle"), t("individual.evidenceHelp")) + `<ul class="check-list">${candidate.evidence.map((key) => `<li class="check-item"><span class="bullet-icon">✓</span><p>${t(key)}</p></li>`).join("")}${candidate.verify.map((key) => `<li class="check-item"><span class="bullet-icon">?</span><p>${t(key)}</p></li>`).join("")}</ul>`);
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
  setHTML("privacyCallout", `<span class="bullet-icon">!</span><div><strong>${t("organization.privacyTitle")}</strong><p>${t("organization.privacyText", { count: number(state.data.meta.minimumCohortSize) })}</p></div>`);
}

function renderActions() {
  const rows = state.data.actions.map((action) => `
    <tr><td><strong>${esc(action.id)}</strong></td><td>${t(`actionType.${action.type}`)}</td><td>${esc(action.subject)}</td><td>${esc(action.owner)}</td><td>${date(action.due)}</td><td><span class="tag ${action.status === "done" ? "ready" : action.status === "inProgress" ? "validate" : "hold"}">${t(`actionStatus.${action.status}`)}</span></td></tr>
  `).join("");
  setHTML("actionTablePanel", panelTitle(t("actions.tableTitle"), t("actions.tableHelp")) + table(
    [t("table.id"), t("table.action"), t("table.subject"), t("table.owner"), t("table.due"), t("table.status")], rows
  ));
}

function renderSettings() {
  const data = state.data;
  const accessRows = data.accessRoles.map((item) => `<div class="setting-row"><span>${t(`accessRole.${item.role}`)}</span><strong>${t(`access.${item.access}`)}</strong></div>`).join("");
  setHTML("settingsGrid", `
    ${settingCard(t("settings.integrationTitle"), t("settings.integrationHelp"), [
      [t("settings.resultAdapter"), data.meta.mode === "demo" ? t("common.demoData") : t("common.connected")],
      [t("settings.modelId"), data.meta.modelId],
      [t("settings.updatedAt"), date(data.meta.updatedAt)]
    ])}
    <article class="setting-card"><h2>${t("settings.accessTitle")}</h2><p>${t("settings.accessHelp")}</p>${accessRows}</article>
    ${settingCard(t("settings.governanceTitle"), t("settings.governanceHelp"), [
      [t("settings.auditLog"), t("common.enabled")],
      [t("settings.retention"), t("settings.retentionValue")],
      [t("settings.humanReview"), t("common.required")]
    ])}
    ${settingCard(t("settings.i18nTitle"), t("settings.i18nHelp"), [
      [t("settings.locales"), t("settings.localesValue")],
      [t("settings.currentLocale"), getLocale()],
      [t("settings.rtl"), t("common.supported")]
    ])}
  `);
  setHTML("settingsNotice", `<span class="bullet-icon">i</span><div><strong>${t("settings.requestTitle")}</strong><p>${t("settings.requestText")}</p></div>`);
}

function buildLanguageSelect() {
  const select = document.getElementById("languageSelect");
  select.innerHTML = getManifest().map((locale) => `<option value="${locale.code}" ${locale.code === getLocale() ? "selected" : ""}>${esc(locale.label)}</option>`).join("");
  select.addEventListener("change", async (event) => {
    const currentPage = state.page;
    const candidateId = state.candidateId;
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
  return `<div class="person-cell"><div class="avatar">${esc(initials(candidate.name))}</div><div><strong>${esc(candidate.name)}</strong><small>${t("individual.source")}</small></div></div>`;
}

function fitScore(value) {
  return `<div class="fit-score"><div class="bar-track"><div class="bar-fill" style="width:${clamp(value)}%"></div></div><strong>${number(value)}%</strong></div>`;
}

function settingCard(title, help, rows) {
  return `<article class="setting-card"><h2>${title}</h2><p>${help}</p>${rows.map(([label, value]) => `<div class="setting-row"><span>${label}</span><strong>${esc(value)}</strong></div>`).join("")}</article>`;
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

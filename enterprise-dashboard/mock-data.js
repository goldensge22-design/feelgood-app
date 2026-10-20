const EMPLOYEE_PERFORMANCE_RECORDS = [
  ["productStrategy", "strategyLeader", [80, 83, 78, 86, 82], [90, 94, 88, 92, 91], [84, 89, 82, 88, 87]],
  ["dataAnalysis", "expert", [84, 87, 82, 85, 83], [90, 92, 86, 89, 88], [88, 90, 85, 89, 88]],
  ["projectManagement", "projectLead", [79, 82, 77, 81, 80], [91, 88, 93, 89, 90], [86, 83, 88, 84, 85]],
  ["salesOperations", "operator", [75, 78, 73, 79, 76], [86, 89, 84, 88, 87], [82, 85, 80, 84, 83]],
  ["peopleOperations", "projectLead", [77, 80, 76, 79, 78], [85, 88, 84, 87, 86], [88, 91, 87, 90, 89]]
].flatMap(([job, profile, dcas, performance, role]) => dcas.map((dcasScore, index) => ({
  employeeId: `E-${job.slice(0, 3).toUpperCase()}-${String(index + 1).padStart(2, "0")}`,
  job,
  profile,
  reviewPeriod: "2026-H1",
  dcasScore,
  workPerformanceScore: performance[index],
  roleEvidenceScore: role[index],
  evaluatorRole: "departmentManager",
  status: "approved",
  updatedAt: "2026-10-20T09:00:00+09:00"
})));

export const MOCK_DASHBOARD_DATA = {
  meta: {
    mode: "demo",
    organizationName: "D-CAS Enterprise Labs",
    cycle: "2026 H2",
    modelId: "FG-TALENT-2026-02",
    modelVersion: "2.3",
    updatedAt: "2026-10-20T09:00:00+09:00",
    minimumCohortSize: 5,
    analyzedCount: 128,
    priorityReviewCount: 24,
    leaderReviewCount: 18,
    capabilityGapCount: 3
    ,rosterName: "2026 하반기 신입 공채"
    ,rosterSource: "recruitmentSystem"
    ,rosterApplicantCount: 128
    ,rosterMatchedCount: 115
    ,rosterUnmatchedCount: 13
    ,rosterUpdatedAt: "2026-10-20T08:40:00+09:00"
  },
  passDomains: ["planning", "attention", "simultaneous", "sequential"],
  organizationAverage: {
    planning: 68,
    attention: 72,
    simultaneous: 66,
    sequential: 70
  },
  roleReadiness: [
    { role: "leader", count: 18, percent: 14 },
    { role: "projectLead", count: 31, percent: 24 },
    { role: "specialist", count: 43, percent: 34 },
    { role: "practitioner", count: 36, percent: 28 }
  ],
  hiringPipeline: [
    { job: "productStrategy", applicants: 32, complete: 29, verify: 8, finalReview: 5 },
    { job: "dataAnalysis", applicants: 28, complete: 25, verify: 7, finalReview: 4 },
    { job: "projectManagement", applicants: 24, complete: 23, verify: 6, finalReview: 4 },
    { job: "salesOperations", applicants: 26, complete: 21, verify: 9, finalReview: 3 },
    { job: "peopleOperations", applicants: 18, complete: 17, verify: 5, finalReview: 2 }
  ],
  talentModelWeights: [
    { key: "pass", value: 35 },
    { key: "job", value: 25 },
    { key: "values", value: 20 },
    { key: "workSample", value: 20 }
  ],
  employeeProfileWeights: {
    dcas: 40,
    workPerformance: 45,
    roleEvidence: 15
  },
  employeePerformanceRecords: EMPLOYEE_PERFORMANCE_RECORDS,
  employeeSuccessProfiles: [
    { job: "productStrategy", sampleSize: 18, dcasScore: 82, workPerformanceScore: 91, roleEvidenceScore: 86, profile: "strategyLeader" },
    { job: "dataAnalysis", sampleSize: 24, dcasScore: 84, workPerformanceScore: 89, roleEvidenceScore: 88, profile: "expert" },
    { job: "projectManagement", sampleSize: 26, dcasScore: 80, workPerformanceScore: 90, roleEvidenceScore: 85, profile: "projectLead" },
    { job: "salesOperations", sampleSize: 21, dcasScore: 76, workPerformanceScore: 87, roleEvidenceScore: 83, profile: "operator" },
    { job: "peopleOperations", sampleSize: 17, dcasScore: 78, workPerformanceScore: 86, roleEvidenceScore: 89, profile: "projectLead" }
  ],
  profiles: [
    {
      id: "strategy-leader",
      role: "leader",
      icon: "L",
      sampleSize: 18,
      confidence: 86,
      pass: { planning: 78, attention: 70, simultaneous: 80, sequential: 64 },
      strengths: ["planning", "simultaneous"],
      type: "strategyLeader"
    },
    {
      id: "project-lead",
      role: "projectLead",
      icon: "P",
      sampleSize: 26,
      confidence: 89,
      pass: { planning: 75, attention: 76, simultaneous: 70, sequential: 72 },
      strengths: ["planning", "attention"],
      type: "projectLead"
    },
    {
      id: "expert",
      role: "specialist",
      icon: "E",
      sampleSize: 34,
      confidence: 91,
      pass: { planning: 68, attention: 82, simultaneous: 77, sequential: 74 },
      strengths: ["attention", "simultaneous"],
      type: "expert"
    },
    {
      id: "operator",
      role: "practitioner",
      icon: "O",
      sampleSize: 41,
      confidence: 93,
      pass: { planning: 65, attention: 74, simultaneous: 64, sequential: 80 },
      strengths: ["attention", "sequential"],
      type: "operator"
    }
  ],
  candidates: [
    {
      id: "C-2401",
      name: "C-2401",
      reportId: "DCR-2026-2401",
      assessedAt: "2026-10-14T10:30:00+09:00",
      resume: { fileName: "C-2401_resume.pdf", updatedAt: "2026-10-18T14:20:00+09:00" },
      appliedJob: "productStrategy",
      appliedJobSource: "recruitmentSystem",
      status: "priority",
      fit: 86,
      readiness: 79,
      leaderPotential: 84,
      expertPotential: 73,
      recommendedPath: "leader",
      roleScores: { leader: 84, projectLead: 78, specialist: 73, practitioner: 70 },
      pass: { planning: 82, attention: 73, simultaneous: 85, sequential: 66 },
      topJobs: [
        ["productStrategy", 88], ["businessPlanning", 86], ["projectManagement", 82], ["servicePlanning", 79], ["dataPlanning", 75]
      ],
      resumeTopJobs: [["productStrategy", 84], ["projectManagement", 81], ["businessPlanning", 78]],
      evidence: ["evidence.planning", "evidence.integration", "evidence.valueFit"],
      verify: ["verify.conflict", "verify.peopleLeadership"],
      workStyle: ["workStyle.autonomy", "workStyle.bigPicture"],
      priorities: ["priority.delegation", "priority.feedback", "priority.execution"],
      actions: ["development.day30a", "development.day60a", "development.day90a"]
    },
    {
      id: "C-2402",
      name: "C-2402",
      reportId: "DCR-2026-2402",
      assessedAt: "2026-10-15T11:10:00+09:00",
      appliedJob: "dataAnalysis",
      appliedJobSource: "recruitmentSystem",
      status: "validate",
      fit: 81,
      readiness: 83,
      leaderPotential: 66,
      expertPotential: 90,
      recommendedPath: "specialist",
      roleScores: { leader: 66, projectLead: 76, specialist: 90, practitioner: 82 },
      pass: { planning: 69, attention: 88, simultaneous: 80, sequential: 78 },
      topJobs: [
        ["dataAnalysis", 91], ["research", 87], ["quality", 83], ["dataPlanning", 81], ["productStrategy", 74]
      ],
      resumeTopJobs: [["dataAnalysis", 89], ["research", 85], ["quality", 79]],
      evidence: ["evidence.focus", "evidence.analysis", "evidence.consistency"],
      verify: ["verify.communication", "verify.ambiguity"],
      workStyle: ["workStyle.deepWork", "workStyle.evidence"],
      priorities: ["priority.communication", "priority.influence", "priority.speed"],
      actions: ["development.day30b", "development.day60b", "development.day90b"]
    },
    {
      id: "C-2403",
      name: "C-2403",
      reportId: "DCR-2026-2403",
      assessedAt: "2026-10-15T15:40:00+09:00",
      appliedJob: "salesOperations",
      appliedJobSource: "recruitmentSystem",
      status: "alternate",
      fit: 68,
      readiness: 72,
      leaderPotential: 70,
      expertPotential: 75,
      recommendedPath: "projectLead",
      roleScores: { leader: 70, projectLead: 82, specialist: 75, practitioner: 79 },
      pass: { planning: 74, attention: 67, simultaneous: 72, sequential: 77 },
      topJobs: [
        ["projectManagement", 82], ["operations", 80], ["salesOperations", 74], ["customerSuccess", 73], ["businessPlanning", 71]
      ],
      resumeTopJobs: [["salesOperations", 83], ["projectManagement", 79], ["customerSuccess", 76]],
      evidence: ["evidence.execution", "evidence.sequence", "evidence.coordination"],
      verify: ["verify.sales", "verify.priority"],
      workStyle: ["workStyle.structure", "workStyle.collaboration"],
      priorities: ["priority.salesContext", "priority.negotiation", "priority.flexibility"],
      actions: ["development.day30c", "development.day60c", "development.day90c"]
    },
    {
      id: "C-2404",
      name: "C-2404",
      reportId: "DCR-2026-2404",
      assessedAt: "2026-10-16T09:20:00+09:00",
      appliedJob: "peopleOperations",
      appliedJobSource: "recruitmentSystem",
      status: "hold",
      fit: 62,
      readiness: 65,
      leaderPotential: 71,
      expertPotential: 69,
      recommendedPath: "practitioner",
      roleScores: { leader: 71, projectLead: 68, specialist: 69, practitioner: 76 },
      pass: { planning: 70, attention: 61, simultaneous: 75, sequential: 63 },
      topJobs: [
        ["customerSuccess", 77], ["peopleOperations", 72], ["servicePlanning", 71], ["projectManagement", 69], ["operations", 66]
      ],
      resumeTopJobs: [["peopleOperations", 80], ["customerSuccess", 76], ["servicePlanning", 73]],
      evidence: ["evidence.empathy", "evidence.integration"],
      verify: ["verify.dataMissing", "verify.execution"],
      workStyle: ["workStyle.people", "workStyle.bigPicture"],
      priorities: ["priority.evidence", "priority.followThrough", "priority.focus"],
      actions: ["development.day30d", "development.day60d", "development.day90d"]
    }
  ],
  jobCoverage: [
    { job: "productStrategy", current: 82, target: 90 },
    { job: "dataAnalysis", current: 74, target: 85 },
    { job: "projectManagement", current: 88, target: 85 },
    { job: "salesOperations", current: 69, target: 82 },
    { job: "peopleOperations", current: 77, target: 80 }
  ],
  departments: [
    { department: "product", headcount: 31, leaderReady: 5, specialistReady: 10, coverage: 84, gap: "projectManagement" },
    { department: "data", headcount: 24, leaderReady: 3, specialistReady: 12, coverage: 88, gap: "businessPlanning" },
    { department: "sales", headcount: 39, leaderReady: 4, specialistReady: 8, coverage: 69, gap: "salesOperations" },
    { department: "operations", headcount: 34, leaderReady: 6, specialistReady: 9, coverage: 76, gap: "dataPlanning" }
  ],
  succession: [
    { role: "leader", readyNow: 5, readyLater: 13, gap: 3 },
    { role: "projectLead", readyNow: 11, readyLater: 20, gap: 2 },
    { role: "specialist", readyNow: 18, readyLater: 25, gap: 1 }
  ],
  internalMobility: [
    { from: "operations", to: "projectManagement", count: 7 },
    { from: "salesOperations", to: "customerSuccess", count: 5 },
    { from: "dataAnalysis", to: "dataPlanning", count: 4 }
  ],
  actions: [
    { id: "A-103", type: "interview", subject: "C-2401", owner: "HR-07", due: "2026-10-24", status: "inProgress" },
    { id: "A-104", type: "workSample", subject: "C-2402", owner: "HR-03", due: "2026-10-25", status: "open" },
    { id: "A-105", type: "alternateRole", subject: "C-2403", owner: "HR-07", due: "2026-10-27", status: "open" },
    { id: "A-099", type: "humanReview", subject: "C-2398", owner: "HR-02", due: "2026-10-19", status: "done" }
  ],
  accessRoles: [
    { role: "hrAdmin", access: "full" },
    { role: "recruiter", access: "assigned" },
    { role: "manager", access: "summary" },
    { role: "executive", access: "aggregate" }
  ],
  competencyModel: {
    status: "draft",
    version: "1.4",
    department: "product",
    job: "productStrategy",
    updatedAt: "2026-10-20T12:30:00+09:00",
    competencies: [
      { id: "CMP-01", name: "문제 구조화", scope: "common", targetLevel: 3, weight: 20, evidence: "workSample", behavior: "복잡한 문제를 핵심 쟁점과 실행 가능한 단위로 나누어 설명한다." },
      { id: "CMP-02", name: "고객 관점", scope: "common", targetLevel: 3, weight: 15, evidence: "interview", behavior: "고객의 맥락과 불편을 확인하고 의사결정에 반영한다." },
      { id: "CMP-03", name: "전략적 우선순위", scope: "job", targetLevel: 4, weight: 25, evidence: "workSample", behavior: "사업 목표와 자원을 고려해 우선순위와 포기 기준을 제시한다." },
      { id: "CMP-04", name: "데이터 기반 판단", scope: "job", targetLevel: 3, weight: 20, evidence: "portfolio", behavior: "정량·정성 근거를 비교하고 가정과 한계를 함께 설명한다." },
      { id: "CMP-05", name: "협업 조율", scope: "role", targetLevel: 3, weight: 20, evidence: "interview", behavior: "이해관계가 다른 구성원과 합의 기준을 만들고 실행을 조율한다." }
    ]
  }
};


export const MOCK_DASHBOARD_DATA = {
  meta: {
    mode: "demo",
    organizationName: "FeelGood Labs",
    cycle: "2026 H2",
    modelId: "FG-TALENT-2026-02",
    modelVersion: "2.3",
    updatedAt: "2026-10-20T09:00:00+09:00",
    minimumCohortSize: 5,
    analyzedCount: 128,
    priorityReviewCount: 24,
    leaderReviewCount: 18,
    capabilityGapCount: 3
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
      appliedJob: "productStrategy",
      status: "priority",
      fit: 86,
      readiness: 79,
      leaderPotential: 84,
      expertPotential: 73,
      recommendedPath: "leader",
      pass: { planning: 82, attention: 73, simultaneous: 85, sequential: 66 },
      topJobs: [
        ["productStrategy", 88], ["businessPlanning", 86], ["projectManagement", 82], ["servicePlanning", 79], ["dataPlanning", 75]
      ],
      evidence: ["evidence.planning", "evidence.integration", "evidence.valueFit"],
      verify: ["verify.conflict", "verify.peopleLeadership"],
      workStyle: ["workStyle.autonomy", "workStyle.bigPicture"],
      priorities: ["priority.delegation", "priority.feedback", "priority.execution"],
      actions: ["development.day30a", "development.day60a", "development.day90a"]
    },
    {
      id: "C-2402",
      name: "C-2402",
      appliedJob: "dataAnalysis",
      status: "validate",
      fit: 81,
      readiness: 83,
      leaderPotential: 66,
      expertPotential: 90,
      recommendedPath: "specialist",
      pass: { planning: 69, attention: 88, simultaneous: 80, sequential: 78 },
      topJobs: [
        ["dataAnalysis", 91], ["research", 87], ["quality", 83], ["dataPlanning", 81], ["productStrategy", 74]
      ],
      evidence: ["evidence.focus", "evidence.analysis", "evidence.consistency"],
      verify: ["verify.communication", "verify.ambiguity"],
      workStyle: ["workStyle.deepWork", "workStyle.evidence"],
      priorities: ["priority.communication", "priority.influence", "priority.speed"],
      actions: ["development.day30b", "development.day60b", "development.day90b"]
    },
    {
      id: "C-2403",
      name: "C-2403",
      appliedJob: "salesOperations",
      status: "alternate",
      fit: 68,
      readiness: 72,
      leaderPotential: 70,
      expertPotential: 75,
      recommendedPath: "projectLead",
      pass: { planning: 74, attention: 67, simultaneous: 72, sequential: 77 },
      topJobs: [
        ["projectManagement", 82], ["operations", 80], ["salesOperations", 74], ["customerSuccess", 73], ["businessPlanning", 71]
      ],
      evidence: ["evidence.execution", "evidence.sequence", "evidence.coordination"],
      verify: ["verify.sales", "verify.priority"],
      workStyle: ["workStyle.structure", "workStyle.collaboration"],
      priorities: ["priority.salesContext", "priority.negotiation", "priority.flexibility"],
      actions: ["development.day30c", "development.day60c", "development.day90c"]
    },
    {
      id: "C-2404",
      name: "C-2404",
      appliedJob: "peopleOperations",
      status: "hold",
      fit: 62,
      readiness: 65,
      leaderPotential: 71,
      expertPotential: 69,
      recommendedPath: "practitioner",
      pass: { planning: 70, attention: 61, simultaneous: 75, sequential: 63 },
      topJobs: [
        ["customerSuccess", 77], ["peopleOperations", 72], ["servicePlanning", 71], ["projectManagement", 69], ["operations", 66]
      ],
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
  ]
};


import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyState, mergeAsDraft, newActivity, newApplication, readReport, countChars, strengthTranslationKey } from "./career";

test("conflict recovery remaps dependencies without overwriting server records", () => {
  const server = emptyState();
  const activity = { ...newActivity(), id: "activity-one", title: "Server activity" };
  const experience = {
    id: "experience-one", title: "Server observation", action: "Observed A", result: "", learning: "",
    strengths: [], criterionIds: [], confirmed: false, source: "local_activity" as const,
    sourceId: activity.id, sourceVersion: "1",
  };
  const application = {
    ...newApplication(), id: "application-one", text: "Server writing", experienceIds: [experience.id],
  };
  server.activities = [activity];
  server.experiences = [experience];
  server.applications = [application];
  const local = structuredClone(server);
  local.activities[0].title = "My activity change";
  local.experiences[0].action = "My local observation";
  local.applications[0].text = "My unsaved writing";
  const recovered = mergeAsDraft(server, local).state;
  assert.equal(recovered.applications[0].text, "Server writing");
  const newApp = recovered.applications[1];
  assert.notEqual(newApp.id, application.id);
  const newExp = recovered.experiences.find((x) => x.id === newApp.experienceIds[0])!;
  assert.equal(newExp.action, "My local observation");
  assert.notEqual(newExp.id, experience.id);
  assert.equal(recovered.activities.find((x) => x.id === newExp.sourceId)?.title, "My activity change");
});

test("recovering an edited imported experience never creates duplicate source imports", () => {
  const server = emptyState();
  const activity = { ...newActivity(), id: "act" };
  server.activities = [activity];
  server.experiences = [{
    id: "exp", title: "", action: "Original", result: "", learning: "", strengths: [],
    criterionIds: [], confirmed: false, source: "local_activity", sourceId: "act",
  }];
  const local = structuredClone(server);
  local.experiences[0].action = "Local edit";
  const merged = mergeAsDraft(server, local).state;
  assert.equal(merged.experiences.filter((x) => x.source === "local_activity").length, 1);
  assert.equal(merged.experiences[1].source, "manual");
  assert.equal(merged.experiences[1].action, "Local edit");
});

test("report reader preserves supplied job order and never fills the list", () => {
  const view = readReport({
    isExample: true, axes: [], jobs: [{ title: "Second-ranked real item", reason: "Original reason" }],
  })!;
  assert.equal(view.jobs.length, 1);
  assert.equal(view.jobs[0].title, "Second-ranked real item");
  assert.equal(view.jobs[0].reason, "Original reason");
});

test("four processing strategies remain separate from generic skill labels", () => {
  assert.equal(strengthTranslationKey("순차"), "area.successive");
  assert.equal(strengthTranslationKey("계획"), "area.planning");
  assert.equal(countChars("A B𠮷", false), 3);
});

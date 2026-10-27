import { test } from "node:test";
import assert from "node:assert/strict";
import { PROV_RAW, PROV_LOCALE_ORDER } from "./provenance-messages";
import { adaptReportOrder } from "./report-order";
import { SYNTHETIC_SEEDS, seedInput } from "./synthetic-records";

test("every provenance key has all 15 non-empty translations", () => {
  for (const [k, v] of Object.entries(PROV_RAW)) {
    assert.equal(v.length, PROV_LOCALE_ORDER.length, k);
    v.forEach((s, i) => assert.ok(s && s.trim(), `${k}:${PROV_LOCALE_ORDER[i]}`));
  }
});

test("report adapter keeps supplied order and never fills", () => {
  const o = adaptReportOrder({ jobs: [{ title: "B", reason: "r" }, { title: "A" }], choice: "undecided" });
  assert.deepEqual(o?.jobs.map((j) => j.title), ["B", "A"]);
  assert.equal(o?.choice, "undecided");
  assert.equal(adaptReportOrder(null), null);
  assert.equal(adaptReportOrder({ jobs: [] })?.jobs.length, 0);
});

test("synthetic seeds are explicit, distinct and exclude private notes", () => {
  const daily = SYNTHETIC_SEEDS.find((s) => s.cardType === "daily_application" && s.nature === "actual");
  const sim = SYNTHETIC_SEEDS.find((s) => s.cardType === "job_scenario" && s.nature === "simulation");
  assert.ok(daily && sim);
  for (const s of SYNTHETIC_SEEDS) {
    assert.ok(!Object.values(s.input).includes(s.privateNote));
    assert.notEqual(seedInput(s, 2).result, s.input.result);
  }
});

import { localizeSeed } from "./synthetic-records";
import { SEED_TEXT } from "./synthetic-seed-i18n";
test("synthetic seeds localize for all 14 non-Korean locales and keep structure", () => {
  assert.equal(Object.keys(SEED_TEXT).length, 14);
  for (const [loc, arr] of Object.entries(SEED_TEXT)) {
    assert.equal(arr.length, 32, loc);
    arr.forEach((s, i) => assert.ok(s.trim(), `${loc}:${i}`));
    for (const s of SYNTHETIC_SEEDS) {
      const l = localizeSeed(s, loc);
      assert.equal(l.nature, s.nature); assert.equal(l.cardType, s.cardType); assert.equal(l.locale, loc);
      assert.notEqual(l.title, s.title);
      assert.ok(seedInput(l, 2).result.includes("r2"));
    }
  }
  assert.equal(localizeSeed(SYNTHETIC_SEEDS[0], "ko").title, SYNTHETIC_SEEDS[0].title);
});

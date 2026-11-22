import { test } from "node:test";
import assert from "node:assert/strict";
import { AI_CAPACITY_MESSAGES, AI_QUEUE_FULL_MESSAGES, capacityMessage } from "./ai-capacity-messages";

test("15 existing locales have all eight new operational messages without Korean fallback", () => {
  const locales = ["ko", "en", "ja", "zh-CN", "zh-TW", "mn", "th", "vi", "ar", "ru", "km", "es", "fr", "it", "az"];
  const keys = ["ai.capacityWaiting", "ai.providerBusy", "ai.usageLimit", "ai.localLimit", "ai.uncertain", "ai.inputLimit", "ai.cachePrivacy"];
  assert.deepEqual(Object.keys(AI_CAPACITY_MESSAGES).sort(), locales.sort());
  assert.deepEqual(Object.keys(AI_QUEUE_FULL_MESSAGES).sort(), locales.sort());
  for (const locale of locales) {
    assert.equal(AI_CAPACITY_MESSAGES[locale].length, keys.length);
    keys.forEach((key) => {
      const value = capacityMessage(locale, key);
      assert.ok(value?.trim());
      if (locale !== "ko") assert.notEqual(value, capacityMessage("ko", key));
    });
    assert.ok(capacityMessage(locale, "ai.queueFull"));
    assert.notEqual(capacityMessage(locale, "ai.queueFull"), capacityMessage(locale, "ai.providerBusy"));
    if (locale !== "ko") assert.notEqual(capacityMessage(locale, "ai.queueFull"), capacityMessage("ko", "ai.queueFull"));
  }
  assert.equal(capacityMessage("ko", "not-existing"), undefined);
});

test("shared coordination messages exist in all 15 locales without Korean fallback", () => {
  for (const locale of Object.keys(AI_CAPACITY_MESSAGES)) {
    for (const key of ["ai.coordinationWait", "ai.coordinationUnavailable", "ai.resultExpired", "ai.pendingStorageFailed"]) {
      assert.ok(capacityMessage(locale, key)?.trim(), `${locale} ${key}`);
      if (locale !== "ko") assert.notEqual(capacityMessage(locale, key), capacityMessage("ko", key));
    }
  }
});

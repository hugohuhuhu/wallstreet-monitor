import test from "node:test";
import assert from "node:assert/strict";
import { classifyEvent } from "../src/pipeline/classify.js";

test("classifyEvent upgrades severity and tags based on keywords", () => {
  const event = classifyEvent({
    sourceId: "sample",
    sourceName: "Sample",
    sourceType: "static-json",
    accountId: "acct-1",
    accountLabel: "Priority Desk",
    priority: "medium",
    title: "Issuer files 8-K after CFO transition",
    summary: "The company disclosed a CFO transition and filed an 8-K.",
    url: "https://example.com/8k",
    publishedAt: "2026-03-14T00:00:00Z",
    observedAt: "2026-03-14T00:01:00Z",
    raw: {},
    fingerprint: "abc",
  });

  assert.equal(event.severity, "high");
  assert.equal(event.reviewStatus, "pending");
  assert.deepEqual(event.tags.sort(), ["management-change", "sec-filing"].sort());
});

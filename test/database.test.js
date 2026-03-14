import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { openDatabase, insertEvent, listEvents } from "../src/db/database.js";

function createEvent(overrides = {}) {
  return {
    fingerprint: "dupe-key",
    sourceId: "sample-source",
    sourceName: "Sample Source",
    sourceType: "static-json",
    accountId: "sample-account",
    accountLabel: "Sample Account",
    priority: "high",
    severity: "high",
    signalScore: 75,
    reviewStatus: "pending",
    title: "Sample title",
    summary: "Sample summary",
    url: "https://example.com/sample",
    publishedAt: "2026-03-14T10:00:00Z",
    observedAt: "2026-03-14T10:01:00Z",
    tags: ["guidance"],
    raw: { sample: true },
    ...overrides,
  };
}

test("insertEvent deduplicates by fingerprint", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wsm-"));
  const dbPath = path.join(tempDir, "monitor.db");
  const db = openDatabase(dbPath);

  const first = insertEvent(db, createEvent());
  const second = insertEvent(db, createEvent());
  const events = listEvents(db, { limit: 10 });

  assert.equal(first.inserted, true);
  assert.equal(second.inserted, false);
  assert.equal(events.length, 1);

  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

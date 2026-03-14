import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function deserializeEventRow(row) {
  return {
    id: Number(row.id),
    fingerprint: row.fingerprint,
    sourceId: row.source_id,
    sourceName: row.source_name,
    sourceType: row.source_type,
    accountId: row.account_id,
    accountLabel: row.account_label,
    priority: row.priority,
    severity: row.severity,
    signalScore: Number(row.signal_score),
    reviewStatus: row.review_status,
    title: row.title,
    summary: row.summary,
    url: row.url,
    publishedAt: row.published_at,
    observedAt: row.observed_at,
    tags: JSON.parse(row.tags_json),
    raw: JSON.parse(row.raw_json),
  };
}

function severityOrderSql(columnName = "severity") {
  return `CASE ${columnName}
    WHEN 'critical' THEN 4
    WHEN 'high' THEN 3
    WHEN 'medium' THEN 2
    WHEN 'low' THEN 1
    ELSE 0
  END`;
}

export function openDatabase(databasePath) {
  ensureParentDir(databasePath);
  const db = new DatabaseSync(databasePath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL UNIQUE,
      source_id TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_type TEXT NOT NULL,
      account_id TEXT NOT NULL,
      account_label TEXT NOT NULL,
      priority TEXT NOT NULL,
      severity TEXT NOT NULL,
      signal_score INTEGER NOT NULL,
      review_status TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT,
      url TEXT,
      published_at TEXT,
      observed_at TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      raw_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      channel TEXT NOT NULL,
      message TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    );
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      summary_json TEXT
    );
  `);
  return db;
}

export function startRun(db) {
  const startedAt = new Date().toISOString();
  const result = db.prepare(`INSERT INTO runs (started_at, status) VALUES (?, ?)`)
    .run(startedAt, "running");

  return Number(result.lastInsertRowid);
}

export function finishRun(db, runId, status, summary) {
  db.prepare(`UPDATE runs SET finished_at = ?, status = ?, summary_json = ? WHERE id = ?`)
    .run(new Date().toISOString(), status, JSON.stringify(summary), runId);
}

export function insertEvent(db, event) {
  try {
    const result = db.prepare(`
      INSERT INTO events (
        fingerprint, source_id, source_name, source_type, account_id, account_label,
        priority, severity, signal_score, review_status, title, summary, url,
        published_at, observed_at, tags_json, raw_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      event.fingerprint,
      event.sourceId,
      event.sourceName,
      event.sourceType,
      event.accountId,
      event.accountLabel,
      event.priority,
      event.severity,
      event.signalScore,
      event.reviewStatus,
      event.title,
      event.summary,
      event.url,
      event.publishedAt,
      event.observedAt,
      JSON.stringify(event.tags),
      JSON.stringify(event.raw)
    );

    return { inserted: true, eventId: Number(result.lastInsertRowid) };
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) {
      const row = db.prepare(`SELECT id FROM events WHERE fingerprint = ?`).get(event.fingerprint);
      return { inserted: false, eventId: row?.id ? Number(row.id) : null };
    }
    throw error;
  }
}

export function insertAlert(db, eventId, channel, message) {
  db.prepare(`INSERT INTO alerts (event_id, channel, message, sent_at) VALUES (?, ?, ?, ?)`)
    .run(eventId, channel, message, new Date().toISOString());
}

export function listEvents(db, { limit = 20, severity } = {}) {
  if (severity) {
    return db.prepare(`
      SELECT * FROM events WHERE severity = ?
      ORDER BY COALESCE(published_at, observed_at) DESC LIMIT ?
    `).all(severity, limit).map(deserializeEventRow);
  }

  return db.prepare(`
    SELECT * FROM events ORDER BY COALESCE(published_at, observed_at) DESC LIMIT ?
  `).all(limit).map(deserializeEventRow);
}

export function listReviewQueue(db, { status = "pending", limit = 50 } = {}) {
  return db.prepare(`
    SELECT * FROM events WHERE review_status = ?
    ORDER BY ${severityOrderSql()} DESC, COALESCE(published_at, observed_at) DESC LIMIT ?
  `).all(status, limit).map(deserializeEventRow);
}

export function listAlerts(db, { limit = 20 } = {}) {
  return db.prepare(`
    SELECT alerts.id, alerts.channel, alerts.message, alerts.sent_at, events.severity, events.title, events.account_label
    FROM alerts
    JOIN events ON events.id = alerts.event_id
    ORDER BY alerts.sent_at DESC
    LIMIT ?
  `).all(limit).map((row) => ({
    id: Number(row.id),
    channel: row.channel,
    message: row.message,
    sentAt: row.sent_at,
    severity: row.severity,
    title: row.title,
    accountLabel: row.account_label,
  }));
}

export function listRuns(db, { limit = 10 } = {}) {
  return db.prepare(`
    SELECT * FROM runs ORDER BY started_at DESC LIMIT ?
  `).all(limit).map((row) => ({
    id: Number(row.id),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    status: row.status,
    summary: row.summary_json ? JSON.parse(row.summary_json) : null,
  }));
}

export function getDashboardStats(db) {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS total_events,
      SUM(CASE WHEN review_status = 'pending' THEN 1 ELSE 0 END) AS pending_reviews,
      SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) AS critical_events,
      SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) AS high_events
    FROM events
  `).get();

  const alerts = db.prepare(`SELECT COUNT(*) AS total_alerts FROM alerts`).get();
  const lastRun = db.prepare(`SELECT * FROM runs ORDER BY started_at DESC LIMIT 1`).get();
  const sources = db.prepare(`
    SELECT source_id, source_name, COUNT(*) AS event_count,
      MAX(COALESCE(published_at, observed_at)) AS last_seen
    FROM events
    GROUP BY source_id, source_name
    ORDER BY last_seen DESC
  `).all().map((row) => ({
    sourceId: row.source_id,
    sourceName: row.source_name,
    eventCount: Number(row.event_count),
    lastSeen: row.last_seen,
  }));

  return {
    totalEvents: Number(totals.total_events ?? 0),
    pendingReviews: Number(totals.pending_reviews ?? 0),
    criticalEvents: Number(totals.critical_events ?? 0),
    highEvents: Number(totals.high_events ?? 0),
    totalAlerts: Number(alerts.total_alerts ?? 0),
    lastRun: lastRun ? {
      id: Number(lastRun.id),
      startedAt: lastRun.started_at,
      finishedAt: lastRun.finished_at,
      status: lastRun.status,
      summary: lastRun.summary_json ? JSON.parse(lastRun.summary_json) : null,
    } : null,
    sources,
  };
}


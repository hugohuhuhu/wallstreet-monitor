import { listAlerts, listEvents, listReviewQueue, listRuns, getDashboardStats } from "../db/database.js";

export function getDashboardSnapshot(db, config) {
  return {
    generatedAt: new Date().toISOString(),
    enabledSources: config.sources.filter((source) => source.enabled).map((source) => ({
      id: source.id,
      name: source.name,
      type: source.type,
      accountLabel: source.accountLabel,
      priority: source.priority,
      pollMinutes: source.pollMinutes,
    })),
    stats: getDashboardStats(db),
    recentEvents: listEvents(db, { limit: 12 }),
    reviewQueue: listReviewQueue(db, { status: "pending", limit: 8 }),
    recentAlerts: listAlerts(db, { limit: 12 }),
    recentRuns: listRuns(db, { limit: 8 }),
  };
}


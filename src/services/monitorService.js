import { fetchSourceItems } from "../fetchers/index.js";
import { normalizeSourceItem } from "../pipeline/normalize.js";
import { classifyEvent, shouldAlert } from "../pipeline/classify.js";
import { emitAlert } from "../pipeline/alerts.js";
import { finishRun, insertAlert, insertEvent, startRun } from "../db/database.js";

export async function runMonitorCycle(config, db) {
  const runId = startRun(db);
  const summary = {
    sources: 0,
    fetched: 0,
    inserted: 0,
    duplicates: 0,
    alerts: 0,
    errors: [],
  };

  try {
    for (const source of config.sources.filter((entry) => entry.enabled)) {
      summary.sources += 1;

      try {
        const items = await fetchSourceItems(source);
        summary.fetched += items.length;

        for (const item of items) {
          const normalized = normalizeSourceItem(source, item);
          const classified = classifyEvent(normalized);
          const { inserted, eventId } = insertEvent(db, classified);

          if (!inserted) {
            summary.duplicates += 1;
            continue;
          }

          summary.inserted += 1;

          if (shouldAlert(classified)) {
            const message = await emitAlert(config.alertLogPath, classified);
            insertAlert(db, eventId, "console+file", message);
            summary.alerts += 1;
          }
        }
      } catch (error) {
        summary.errors.push({
          sourceId: source.id,
          message: error.message,
        });
      }
    }

    finishRun(db, runId, summary.errors.length > 0 ? "completed_with_errors" : "completed", summary);
    return summary;
  } catch (error) {
    finishRun(db, runId, "failed", {
      ...summary,
      fatal: error.message,
    });
    throw error;
  }
}

export async function watchMonitor(config, db, intervalSeconds) {
  await runMonitorCycle(config, db);

  const intervalId = setInterval(async () => {
    try {
      await runMonitorCycle(config, db);
    } catch (error) {
      console.error(`watch cycle failed: ${error.message}`);
    }
  }, intervalSeconds * 1000);

  process.on("SIGINT", () => {
    clearInterval(intervalId);
    db.close();
    process.exit(0);
  });
}

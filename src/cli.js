import { loadConfig } from "./config/loadConfig.js";
import { listEvents, openDatabase } from "./db/database.js";
import { runMonitorCycle, watchMonitor } from "./services/monitorService.js";
import { getReviewQueue } from "./services/reviewService.js";

function parseOptions(argv) {
  const options = {};

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }

    const key = value.slice(2);
    const nextValue = argv[index + 1];
    if (!nextValue || nextValue.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = nextValue;
    index += 1;
  }

  return options;
}

function printEvents(events) {
  if (events.length === 0) {
    console.log("No events found.");
    return;
  }

  for (const event of events) {
    console.log(`${event.id}. [${event.severity.toUpperCase()}] ${event.accountLabel} | ${event.title}`);
    console.log(`   published=${event.publishedAt ?? "n/a"} review=${event.reviewStatus} score=${event.signalScore}`);
    console.log(`   tags=${event.tags.join(",") || "none"}`);
    console.log(`   url=${event.url ?? "(no url)"}`);
  }
}

async function main() {
  const [command = "run", ...rest] = process.argv.slice(2);
  const options = parseOptions(rest);
  const config = await loadConfig(options.config);
  const db = openDatabase(config.databasePath);

  try {
    if (command === "run") {
      const summary = await runMonitorCycle(config, db);
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    if (command === "watch") {
      const intervalSeconds = Number(options.interval ?? 300);
      console.log(`watching ${config.sources.filter((source) => source.enabled).length} sources every ${intervalSeconds}s`);
      await watchMonitor(config, db, intervalSeconds);
      return;
    }

    if (command === "events") {
      const events = listEvents(db, {
        limit: Number(options.limit ?? 20),
        severity: options.severity,
      });
      printEvents(events);
      return;
    }

    if (command === "review") {
      const events = getReviewQueue(db, {
        status: options.status ?? "pending",
        limit: Number(options.limit ?? 20),
      });
      printEvents(events);
      return;
    }

    console.error(`Unknown command: ${command}`);
    process.exitCode = 1;
  } finally {
    if (command !== "watch") {
      db.close();
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

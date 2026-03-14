import fs from "node:fs/promises";
import path from "node:path";

function formatAlert(event) {
  return [
    `[${event.severity.toUpperCase()}] ${event.accountLabel}`,
    event.title,
    event.url || "(no url)",
    `tags=${event.tags.join(",") || "none"}`,
  ].join(" | ");
}

export async function emitAlert(alertLogPath, event) {
  const message = formatAlert(event);
  await fs.mkdir(path.dirname(alertLogPath), { recursive: true });
  await fs.appendFile(alertLogPath, `${new Date().toISOString()} ${message}\n`, "utf8");
  console.log(message);
  return message;
}

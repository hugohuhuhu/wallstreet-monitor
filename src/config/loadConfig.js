import path from "node:path";
import fs from "node:fs/promises";

const DEFAULT_CONFIG = "config/sources.sample.json";

function resolveFromCwd(targetPath) {
  return path.resolve(process.cwd(), targetPath);
}

export async function loadConfig(configPath = DEFAULT_CONFIG) {
  const absoluteConfigPath = resolveFromCwd(configPath);
  const raw = JSON.parse(await fs.readFile(absoluteConfigPath, "utf8"));

  return {
    configPath: absoluteConfigPath,
    databasePath: resolveFromCwd(raw.databasePath ?? "runtime/monitor.db"),
    alertLogPath: resolveFromCwd(raw.alertLogPath ?? "runtime/alerts.log"),
    sources: (raw.sources ?? []).map((source) => ({
      enabled: source.enabled !== false,
      pollMinutes: source.pollMinutes ?? 15,
      priority: source.priority ?? "medium",
      ...source,
      path: source.path ? resolveFromCwd(source.path) : undefined,
    })),
  };
}

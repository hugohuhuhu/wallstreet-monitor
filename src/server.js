import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfig } from "./config/loadConfig.js";
import { openDatabase } from "./db/database.js";
import { getDashboardSnapshot } from "./services/dashboardService.js";
import { runMonitorCycle } from "./services/monitorService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dashboardDir = path.resolve(__dirname, "../dashboard");

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

function contentTypeFor(filePath) {
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/html; charset=utf-8";
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload, null, 2));
}

async function serveStatic(response, requestPath) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.normalize(path.join(dashboardDir, safePath));

  if (!filePath.startsWith(dashboardDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, { "content-type": contentTypeFor(filePath) });
    response.end(body);
  } catch {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  const config = await loadConfig(options.config);
  const port = Number(process.env.PORT ?? options.port ?? 4310);
  const host = process.env.HOST ?? options.host ?? "0.0.0.0";
  const db = openDatabase(config.databasePath);
  let isRunning = false;

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    try {
      if (request.method === "GET" && url.pathname === "/api/dashboard") {
        sendJson(response, 200, getDashboardSnapshot(db, config));
        return;
      }

      if (request.method === "POST" && url.pathname === "/api/run") {
        if (isRunning) {
          sendJson(response, 409, { error: "A monitor cycle is already in progress." });
          return;
        }

        isRunning = true;
        try {
          const summary = await runMonitorCycle(config, db);
          sendJson(response, 200, {
            ok: true,
            summary,
            dashboard: getDashboardSnapshot(db, config),
          });
        } finally {
          isRunning = false;
        }
        return;
      }

      if (request.method === "GET") {
        await serveStatic(response, url.pathname);
        return;
      }

      response.writeHead(405, { "content-type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
    } catch (error) {
      sendJson(response, 500, {
        error: error.message,
      });
    }
  });

  server.listen(port, host, () => {
    console.log(`Dashboard running at http://${host}:${port}`);
  });

  process.on("SIGINT", () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  });
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});

import { parseFeedXml } from "./feedParser.js";

export async function fetchRssSource(source) {
  const response = await fetch(source.url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      "user-agent": "wallstreet-monitor-mvp/0.1",
    },
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed for ${source.id}: HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseFeedXml(xml);
}

import { parseFeedXml } from "./feedParser.js";

const REQUEST_HEADERS = {
  "user-agent": "wallstreet-monitor/0.3 (+https://github.com/hugohuhuhu/wallstreet-monitor)",
  accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
};

export async function fetchRssSource(source) {
  const response = await fetch(source.url, {
    signal: AbortSignal.timeout(20000),
    headers: REQUEST_HEADERS,
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`RSS fetch failed for ${source.id}: HTTP ${response.status}`);
  }

  const xml = await response.text();
  return parseFeedXml(xml);
}
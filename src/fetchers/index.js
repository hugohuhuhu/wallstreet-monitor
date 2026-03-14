import { fetchRssSource } from "./rssSource.js";
import { fetchStaticJsonSource } from "./staticJsonSource.js";

const FETCHERS = {
  rss: fetchRssSource,
  "static-json": fetchStaticJsonSource,
};

export async function fetchSourceItems(source) {
  const fetcher = FETCHERS[source.type];
  if (!fetcher) {
    throw new Error(`Unsupported source type: ${source.type}`);
  }

  return fetcher(source);
}

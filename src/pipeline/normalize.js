import { buildFingerprint } from "../utils/hash.js";

function normalizeWhitespace(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed.toISOString();
}

export function normalizeSourceItem(source, item) {
  const title = normalizeWhitespace(item.title || "Untitled event");
  const summary = normalizeWhitespace(item.summary || item.description || "");
  const publishedAt = normalizeDate(item.publishedAt || item.pubDate || item.updated);
  const observedAt = new Date().toISOString();
  const url = normalizeWhitespace(item.url || item.link || item.guid || "");
  const rawId = normalizeWhitespace(item.id || item.guid || "");

  return {
    fingerprint: buildFingerprint([source.id, rawId, url, title, publishedAt]),
    sourceId: source.id,
    sourceName: source.name,
    sourceType: source.type,
    accountId: source.accountId,
    accountLabel: source.accountLabel,
    priority: source.priority,
    title,
    summary,
    url: url || null,
    publishedAt,
    observedAt,
    raw: item,
  };
}

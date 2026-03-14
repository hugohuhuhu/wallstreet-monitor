const RSS_ITEM_PATTERN = /<item\b[\s\S]*?<\/item>/gi;
const ATOM_ENTRY_PATTERN = /<entry\b[\s\S]*?<\/entry>/gi;

function decodeXml(text = "") {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(pattern);
  return decodeXml(match?.[1] ?? "");
}

function extractLink(block) {
  const linkTag = block.match(/<link\b([^>]*)>/i);
  const hrefMatch = linkTag?.[1]?.match(/href=["']([^"']+)["']/i);
  if (hrefMatch) {
    return decodeXml(hrefMatch[1]);
  }

  const fullTag = extractTag(block, "link");
  if (fullTag) {
    return fullTag;
  }

  return extractTag(block, "guid");
}

function normalizeEntry(block) {
  return {
    id: extractTag(block, "guid") || extractTag(block, "id"),
    title: extractTag(block, "title"),
    summary: extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content"),
    url: extractLink(block),
    publishedAt: extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated"),
  };
}

export function parseFeedXml(xmlText) {
  const rssItems = [...xmlText.matchAll(RSS_ITEM_PATTERN)].map((match) => normalizeEntry(match[0]));
  const atomEntries = [...xmlText.matchAll(ATOM_ENTRY_PATTERN)].map((match) => normalizeEntry(match[0]));

  return [...rssItems, ...atomEntries].filter((item) => item.title || item.url);
}

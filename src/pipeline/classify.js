const SEVERITY_RANK = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const PRIORITY_BASELINE = {
  low: "low",
  medium: "medium",
  high: "high",
  critical: "critical",
};

const KEYWORD_RULES = [
  { tag: "activist", severity: "high", keywords: ["activist", "proxy", "board seat", "13d", "campaign"] },
  { tag: "sec-filing", severity: "high", keywords: ["8-k", "10-q", "10-k", "sec", "filing"] },
  { tag: "management-change", severity: "high", keywords: ["ceo", "cfo", "chair", "director", "resign", "transition"] },
  { tag: "guidance", severity: "high", keywords: ["guidance", "outlook", "preliminary results", "revenue outlook"] },
  { tag: "capital-markets", severity: "medium", keywords: ["offering", "buyback", "share repurchase", "convertible"] },
  { tag: "mna", severity: "critical", keywords: ["merger", "acquisition", "take-private", "buyout"] },
  { tag: "litigation", severity: "high", keywords: ["investigation", "lawsuit", "settlement", "subpoena"] },
  { tag: "macro", severity: "high", keywords: ["fomc", "fed", "rate", "inflation", "tariff"] },
];

function upgradeSeverity(current, candidate) {
  return SEVERITY_RANK[candidate] > SEVERITY_RANK[current] ? candidate : current;
}

export function classifyEvent(event) {
  const haystack = `${event.title} ${event.summary}`.toLowerCase();
  let severity = PRIORITY_BASELINE[event.priority] ?? "medium";
  const tags = new Set();

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      tags.add(rule.tag);
      severity = upgradeSeverity(severity, rule.severity);
    }
  }

  const signalScore = Math.min(100, 20 + tags.size * 20 + SEVERITY_RANK[severity] * 15);
  const reviewStatus = SEVERITY_RANK[severity] >= SEVERITY_RANK.high ? "pending" : "monitor";

  return {
    ...event,
    severity,
    tags: [...tags],
    signalScore,
    reviewStatus,
  };
}

export function shouldAlert(event) {
  return SEVERITY_RANK[event.severity] >= SEVERITY_RANK.high;
}

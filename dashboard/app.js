const summaryGrid = document.getElementById("summaryGrid");
const reviewQueue = document.getElementById("reviewQueue");
const alertsList = document.getElementById("alertsList");
const eventsTable = document.getElementById("eventsTable");
const runsList = document.getElementById("runsList");
const sourceList = document.getElementById("sourceList");
const generatedAt = document.getElementById("generatedAt");
const runButton = document.getElementById("runButton");
const refreshButton = document.getElementById("refreshButton");
const syncStatus = document.getElementById("syncStatus");
const emptyTemplate = document.getElementById("emptyState");

function formatDate(value) {
  if (!value) {
    return "n/a";
  }

  return new Intl.DateTimeFormat("zh-Hant", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function cloneEmptyState() {
  return emptyTemplate.content.firstElementChild.cloneNode(true);
}

function severityClass(value) {
  return `severity-chip severity-${value ?? "low"}`;
}

function priorityClass(value) {
  return `priority-chip priority-${value ?? "medium"}`;
}

function renderSummary(snapshot) {
  const cards = [
    { title: "Total Events", value: snapshot.stats.totalEvents, subtitle: "進入標準化事件池的總筆數" },
    { title: "Pending Review", value: snapshot.stats.pendingReviews, subtitle: "需要人工研判的重點事件" },
    { title: "Critical", value: snapshot.stats.criticalEvents, subtitle: "最高優先級訊號" },
    { title: "High", value: snapshot.stats.highEvents, subtitle: "高風險但未到 critical" },
    { title: "Alerts", value: snapshot.stats.totalAlerts, subtitle: "累積寫入的告警數" },
  ];

  summaryGrid.replaceChildren(...cards.map((card) => {
    const article = document.createElement("article");
    article.className = "summary-card";
    article.innerHTML = `
      <p class="panel-kicker">${card.title}</p>
      <strong>${card.value}</strong>
      <p class="card-subtitle">${card.subtitle}</p>
    `;
    return article;
  }));
}

function renderSources(snapshot) {
  if (snapshot.enabledSources.length === 0) {
    sourceList.replaceChildren(cloneEmptyState());
    return;
  }

  sourceList.replaceChildren(...snapshot.enabledSources.map((source) => {
    const card = document.createElement("article");
    card.className = "list-card";
    const stats = snapshot.stats.sources.find((entry) => entry.sourceId === source.id);
    card.innerHTML = `
      <header>
        <div>
          <p class="panel-kicker">${source.type}</p>
          <h3>${source.name}</h3>
        </div>
        <span class="${priorityClass(source.priority)}">${source.priority}</span>
      </header>
      <p class="item-meta">Account: ${source.accountLabel}</p>
      <p class="item-meta">Poll: every ${source.pollMinutes} min</p>
      <p class="item-meta">Seen events: ${stats?.eventCount ?? 0}</p>
      <p class="item-meta">Last seen: ${formatDate(stats?.lastSeen)}</p>
    `;
    return card;
  }));
}

function renderRuns(snapshot) {
  if (snapshot.recentRuns.length === 0) {
    runsList.replaceChildren(cloneEmptyState());
    return;
  }

  runsList.replaceChildren(...snapshot.recentRuns.map((run) => {
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = `
      <header>
        <div>
          <p class="panel-kicker">Run #${run.id}</p>
          <h3>${run.status}</h3>
        </div>
        <span class="badge">${formatDate(run.startedAt)}</span>
      </header>
      <p class="item-meta">Finished: ${formatDate(run.finishedAt)}</p>
      <p class="item-meta">Inserted: ${run.summary?.inserted ?? 0} | Alerts: ${run.summary?.alerts ?? 0} | Errors: ${run.summary?.errors?.length ?? 0}</p>
    `;
    return card;
  }));
}

function renderReview(snapshot) {
  if (snapshot.reviewQueue.length === 0) {
    reviewQueue.replaceChildren(cloneEmptyState());
    return;
  }

  reviewQueue.replaceChildren(...snapshot.reviewQueue.map((event) => {
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = `
      <header>
        <div>
          <p class="panel-kicker">${event.accountLabel}</p>
          <h3>${event.title}</h3>
        </div>
        <span class="${severityClass(event.severity)}">${event.severity}</span>
      </header>
      <p class="item-meta">Published: ${formatDate(event.publishedAt)}</p>
      <p class="item-meta">Score: ${event.signalScore} | Review: ${event.reviewStatus}</p>
      <div class="tags">${event.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
    `;
    return card;
  }));
}

function renderAlerts(snapshot) {
  if (snapshot.recentAlerts.length === 0) {
    alertsList.replaceChildren(cloneEmptyState());
    return;
  }

  alertsList.replaceChildren(...snapshot.recentAlerts.map((alert) => {
    const card = document.createElement("article");
    card.className = "list-card";
    card.innerHTML = `
      <header>
        <div>
          <p class="panel-kicker">${alert.accountLabel}</p>
          <h3>${alert.title}</h3>
        </div>
        <span class="${severityClass(alert.severity)}">${alert.severity}</span>
      </header>
      <p class="item-meta">Sent: ${formatDate(alert.sentAt)}</p>
      <p class="item-meta">${alert.message}</p>
    `;
    return card;
  }));
}

function renderEvents(snapshot) {
  if (snapshot.recentEvents.length === 0) {
    eventsTable.replaceChildren(cloneEmptyState());
    return;
  }

  eventsTable.replaceChildren(...snapshot.recentEvents.map((event) => {
    const article = document.createElement("article");
    article.className = "event-row";
    article.innerHTML = `
      <div class="event-grid">
        <div>
          <header>
            <div>
              <p class="panel-kicker">${event.accountLabel}</p>
              <h3>${event.title}</h3>
            </div>
          </header>
          <p class="item-meta">${event.summary || "No summary"}</p>
          <div class="tags">${event.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
        </div>
        <div class="event-side">
          <span class="${severityClass(event.severity)}">${event.severity}</span>
          <span class="${priorityClass(event.priority)}">${event.priority}</span>
          <div class="summary-strip">
            <span class="badge">score ${event.signalScore}</span>
            <span class="badge">${event.reviewStatus}</span>
          </div>
          <div class="muted">Published: ${formatDate(event.publishedAt)}</div>
          <div class="muted">Observed: ${formatDate(event.observedAt)}</div>
          ${event.url ? `<a href="${event.url}" target="_blank" rel="noreferrer">Open source</a>` : ""}
        </div>
      </div>
    `;
    return article;
  }));
}

function renderDashboard(snapshot) {
  generatedAt.textContent = `View refreshed: ${formatDate(snapshot.generatedAt)}`;
  renderSummary(snapshot);
  renderSources(snapshot);
  renderRuns(snapshot);
  renderReview(snapshot);
  renderAlerts(snapshot);
  renderEvents(snapshot);
}

async function loadDashboard() {
  syncStatus.textContent = "Loading";
  const response = await fetch("/api/dashboard");
  if (!response.ok) {
    throw new Error(`dashboard load failed: ${response.status}`);
  }

  const snapshot = await response.json();
  renderDashboard(snapshot);
  syncStatus.textContent = snapshot.stats.lastRun?.status ?? "Ready";
}

async function triggerRun() {
  runButton.disabled = true;
  syncStatus.textContent = "Syncing";
  try {
    const response = await fetch("/api/run", { method: "POST" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || `run failed: ${response.status}`);
    }
    renderDashboard(payload.dashboard);
    syncStatus.textContent = "Synced";
  } finally {
    runButton.disabled = false;
  }
}

refreshButton.addEventListener("click", () => {
  loadDashboard().catch((error) => {
    syncStatus.textContent = "Load failed";
    console.error(error);
  });
});

runButton.addEventListener("click", () => {
  triggerRun().catch((error) => {
    syncStatus.textContent = "Run failed";
    console.error(error);
  });
});

loadDashboard().catch((error) => {
  syncStatus.textContent = "Load failed";
  console.error(error);
});


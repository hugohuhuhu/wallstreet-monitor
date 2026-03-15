# Wall Street Key Account Monitor MVP

這是一個由 Codex 落地的 MVP 骨架，用來監測一組可配置的重點帳戶與公開資訊來源，將訊息做抓取、標準化、去重、分類、告警與人工審核排隊。

## 系統目標

- 監測可配置的公開來源，例如 RSS、官方公告頁、IR/SEC 類資訊源或內部整理過的靜態清單。
- 將不同來源轉成統一事件模型，便於人工研判與後續擴充。
- 以 SQLite 保存事件、告警與審核佇列，先滿足單機 MVP，再為之後升級成服務化架構留接口。

## 非目標

- 不做自動交易。
- 不直接串商業 API 金流或券商系統。
- 不做完整 NLP 或模型判讀，只先做規則式分類與優先級評分。

## 預設真實來源

預設 live config 目前會抓這些公開 feed：

- Federal Reserve Press Releases
- SEC Press Releases
- FDIC Press Releases
- CFPB Newsroom

sample fixture 仍保留在 `config/sources.sample.json`，方便 demo 或回歸測試。

## MVP 模組

- `src/fetchers/`: source adapter，現在支援 `rss` 與 `static-json`
- `src/pipeline/`: 標準化、分類、告警
- `src/db/`: SQLite schema 與資料存取
- `src/services/`: 單次執行、輪詢執行、審核查詢、dashboard snapshot
- `src/cli.js`: CLI 入口
- `src/server.js`: dashboard HTTP server
- `dashboard/`: 瀏覽器控制台 UI

## 快速開始

```bash
cd wallstreet-monitor
npm run run
npm run dashboard
```

打開 `http://127.0.0.1:4310` 就能看到畫面。

如果你想跑 sample fixture：

```bash
npm run run:sample
npm run dashboard:sample
```

## 可用命令

- `npm run run`: 用 live config 執行一次完整抓取流程
- `npm run run:sample`: 用 fixture 執行一次流程
- `npm run watch`: 輪詢 live feeds
- `npm run events`: CLI 查看已入庫事件
- `npm run review`: CLI 查看待人工審核事件
- `npm run dashboard`: 啟動 live dashboard 與 API
- `npm run dashboard:sample`: 啟動 sample dashboard 與 API
- `npm test`: 跑基本單元測試

## 重要限制

目前資料庫使用 SQLite：`runtime/monitor.db`

- 本機 demo 沒問題
- Cloud Run 可展示，但不適合長期持久化
- 正式使用建議改成 Firestore / Cloud SQL

## 第二輪 review 建議檢查

- 來源授權與使用條款
- 抓取失敗重試與退避策略
- 關鍵字誤判與漏判
- 告警頻率控制
- 審核流程是否需要 assigned owner / note / SLA
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

## MVP 模組

- `src/fetchers/`: source adapter，現在支援 `rss` 與 `static-json`
- `src/pipeline/`: 標準化、分類、告警
- `src/db/`: SQLite schema 與資料存取
- `src/services/`: 單次執行、輪詢執行、審核查詢、dashboard snapshot
- `src/cli.js`: CLI 入口
- `src/server.js`: dashboard HTTP server
- `dashboard/`: 瀏覽器控制台 UI

## 事件模型

每個事件都會統一存成以下欄位：

- `fingerprint`: 去重鍵
- `sourceId` / `sourceName` / `sourceType`
- `accountId` / `accountLabel`
- `title` / `summary` / `url`
- `publishedAt` / `observedAt`
- `priority` / `severity` / `reviewStatus`
- `tags`
- `raw`

## 快速開始

```bash
cd wallstreet-monitor
npm run run
npm run dashboard
```

打開 `http://127.0.0.1:4310` 就能看到畫面。

## 可用命令

- `npm run run`: 執行一次完整抓取流程
- `npm run watch`: 依固定秒數輪詢來源
- `npm run events`: CLI 查看已入庫事件
- `npm run review`: CLI 查看待人工審核事件
- `npm run dashboard`: 啟動 dashboard 與 API
- `npm test`: 跑基本單元測試

## 真實來源接入建議

1. 先用 `static-json` 或內部整理 RSS 驗證分類規則。
2. 再逐步接 `rss` 類來源。
3. 如果後續要接 X/Twitter、SEC EDGAR API 或商業新聞 API，可以延伸 `fetchers/` 並沿用同一個 normalize/classify/persist 流程。

## 第二輪 review 建議檢查

- 來源授權與使用條款
- 抓取失敗重試與退避策略
- 關鍵字誤判與漏判
- 告警頻率控制
- 審核流程是否需要 assigned owner / note / SLA


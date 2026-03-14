# Deploy to Google AI Studio / Cloud Run

## 先講結論

這個專案不是直接「部署到 AI Studio 畫面裡」的類型。
比較實際的做法是：

1. 用 Google AI Studio 建立或管理 Gemini API key
2. 把這個 Node.js app 部署到 Google Cloud Run
3. 之後如果要接 Gemini，再把 API key 或改用 Vertex/Cloud Secret Manager 接進去

## 目前這個專案已做好的部署條件

- `src/server.js` 已支援 `PORT`
- `src/server.js` 已預設綁定 `0.0.0.0`
- `package.json` 已有 `start` script

## 重要限制

目前資料庫使用 SQLite：`runtime/monitor.db`

這在本機 demo 沒問題，但 Cloud Run 的本機檔案系統是暫時性的，不適合拿來做正式持久化資料庫。

所以：
- 如果只是 demo，可先部署看看
- 如果要正式用，請改成 Cloud SQL / Firestore / AlloyDB 之類的持久化儲存

## 部署步驟

### 1. 切到專案

```powershell
cd C:\Users\hug0x\Documents\Playground\wallstreet-monitor
```

### 2. 登入 Google Cloud CLI

```powershell
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 3. 啟用 Cloud Run

```powershell
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### 4. 部署

```powershell
gcloud run deploy wallstreet-monitor \
  --source . \
  --region asia-southeast1 \
  --allow-unauthenticated
```

### 5. 開啟服務

部署完成後，`gcloud` 會輸出一個 HTTPS 網址，直接打開即可。

## 如果要接 Gemini API

1. 去 Google AI Studio 建立 API key
2. 在 Cloud Run 設定環境變數，例如 `GEMINI_API_KEY`
3. 在 server 或 pipeline 裡接 Gemini API 做摘要、分類或事件重寫

範例：

```powershell
gcloud run services update wallstreet-monitor \
  --region asia-southeast1 \
  --update-env-vars GEMINI_API_KEY=YOUR_KEY
```

## 正式化前建議

- 把 SQLite 換掉
- 把 `config/sources.sample.json` 改成正式來源設定
- 把敏感資訊改放 Secret Manager
- 補健康檢查與錯誤告警
- 若來源量增加，考慮拆成 API + worker

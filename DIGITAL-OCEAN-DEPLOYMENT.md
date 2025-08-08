# Digital Ocean App Platform 部署指南

## 🚀 快速部署

### 1. 環境變數設置

在 Digital Ocean App Platform 控制台中，設置以下環境變數：

**必須的密鑰變數：**
```
BITGET_API_KEY=your_api_key
BITGET_SECRET_KEY=your_secret_key  
BITGET_PASSPHRASE=your_passphrase
DISCORD_WEBHOOK_URL=your_discord_webhook_url
```

**系統變數：**
```
NODE_ENV=production
PORT=8080
TZ=Asia/Shanghai
```

### 2. 部署配置

專案已包含 `.do/app.yaml` 配置檔案，會自動：
- 使用 port 8080 (DO App Platform 要求)
- 設置健康檢查端點 `/health`
- 配置自動部署 (GitHub push)

### 3. 健康檢查端點

系統提供以下端點：

- **`/health`** - 健康檢查 (JSON格式)
- **`/status`** - 詳細狀態頁面 (HTML格式)
- **`/`** - 健康檢查 (JSON格式，同 /health)

### 4. 部署步驟

1. **推送代碼到 GitHub：**
   ```bash
   git add .
   git commit -m "修復 Digital Ocean 部署健康檢查問題"
   git push origin main
   ```

2. **在 Digital Ocean 控制台：**
   - 創建新的 App
   - 連接 GitHub repository: `Davis1233798/exchange_monitor`
   - 選擇 branch: `main`
   - 系統會自動檢測 `.do/app.yaml` 配置

3. **配置環境變數：**
   - 進入 App 設置
   - 添加上述環境變數
   - 將 API 密鑰設為 SECRET 類型

4. **部署：**
   - 點擊 "Deploy" 
   - 等待部署完成

## 🔧 故障排除

### 健康檢查失敗
如果看到 `Readiness probe failed` 錯誤：

1. **檢查端口設置：**
   ```bash
   # 確認 PORT 環境變數設為 8080
   echo $PORT
   ```

2. **檢查健康檢查端點：**
   ```bash
   # 測試健康檢查
   curl http://your-app-url/health
   ```

3. **查看日誌：**
   ```bash
   # 在 DO 控制台查看應用日誌
   # 尋找 "健康檢查伺服器已啟動" 消息
   ```

### 環境變數問題
確保所有必要的環境變數都已設置並且正確：
- API 密鑰不能為空
- Discord Webhook URL 必須有效
- 密鑰類型變數要設為 SECRET

### 監控系統狀態
訪問 `/status` 端點查看詳細的系統狀態：
- 監控服務運行狀態  
- 合約監控詳細資訊
- 系統資源使用情況
- 記憶體和運行時間

## 📊 監控特性

部署後，系統會：
- ✅ 每15分鐘發送持倉異動報告
- ✅ 監控資金費率變化  
- ✅ 提供健康檢查端點
- ✅ 自動重啟失敗的服務
- ✅ 記錄詳細日誌

## 🔗 有用的端點

- **健康檢查：** `https://your-app.ondigitalocean.app/health`
- **狀態頁面：** `https://your-app.ondigitalocean.app/status`
- **應用控制台：** Digital Ocean App Platform Dashboard

## ⚠️ 注意事項

1. **資源限制：** 使用 basic-xxs instance，適合輕量監控
2. **自動部署：** 推送到 main branch 會自動觸發部署
3. **日誌查看：** 在 DO 控制台的 Runtime Logs 頁面查看
4. **環境隔離：** 生產環境使用 SECRET 類型變數保護敏感資訊

部署完成後，系統應該能夠正常通過健康檢查，並開始監控加密貨幣交易所數據。
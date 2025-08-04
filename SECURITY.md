# 安全性重要提醒 🔒

## ⚠️ 重要安全警告

### Discord Webhook 安全
您的專案之前暴露了 Discord webhook URL，這可能導致：
- 未授權的人員可以向您的 Discord 伺服器發送訊息
- 垃圾訊息攻擊
- 服務中斷

### 已修復的安全問題
✅ 移除所有硬編碼的 Discord webhook URL  
✅ 移除所有硬編碼的 API 密鑰  
✅ 改為從環境變數讀取敏感資訊  
✅ 更新所有文檔和範例檔案  

## 🛡️ 安全最佳實踐

### 1. 環境變數管理
- **永遠不要**將 API 密鑰或 webhook URL 直接寫在程式碼中
- 使用 `.env` 檔案存儲敏感資訊
- 確保 `.env` 檔案已加入 `.gitignore`

### 2. Discord Webhook 安全
- 定期輪換 webhook URL
- 限制 webhook 的權限
- 監控 webhook 的使用情況
- 如果懷疑洩露，立即重新生成

### 3. API 密鑰安全
- 使用最小權限原則
- 定期輪換 API 密鑰
- 監控 API 使用情況
- 不要在公共場所分享螢幕時顯示密鑰

## 🔧 設定新的 Webhook

### 1. 創建新的 Discord Webhook
1. 到您的 Discord 伺服器設定
2. 選擇「整合」→「Webhooks」
3. 點擊「新增 Webhook」
4. 設定名稱和頻道
5. 複製 Webhook URL

### 2. 設定環境變數
創建 `.env` 檔案：
```env
# Bitget API 配置
API_KEY=your_bitget_api_key
API_SECRET=your_bitget_api_secret
API_PASSPHRASE=your_bitget_passphrase

# Discord Webhook URLs
DISCORD_WEBHOOK_URL=your_new_discord_webhook_url
FUNDING_RATE_WEBHOOK_URL=your_funding_rate_webhook_url
POSITION_WEBHOOK_URL=your_position_webhook_url

# 監控閾值
PRICE_CHANGE_THRESHOLD=10
POSITION_CHANGE_THRESHOLD=10
FUNDING_RATE_HIGH_THRESHOLD=0.1
FUNDING_RATE_LOW_THRESHOLD=-0.1

# 日誌配置
LOG_LEVEL=info
VERBOSE_LOGGING=false
```

### 3. 驗證設定
```bash
# 測試 Discord 連接
npm run test-discord

# 運行系統測試
npm run system-test
```

## 📋 安全檢查清單

- [ ] 已創建新的 Discord webhook
- [ ] 已刪除舊的洩露 webhook
- [ ] 已設定 `.env` 檔案
- [ ] `.env` 檔案已加入 `.gitignore`
- [ ] 已測試新的 webhook 連接
- [ ] 已更新所有團隊成員的配置

## 🚨 如果再次洩露

1. **立即停止使用洩露的憑證**
2. **重新生成新的 API 密鑰和 webhook**
3. **檢查 Git 歷史記錄**
4. **通知團隊成員**
5. **審查程式碼以防止再次發生**

## 📞 技術支持

如果您需要協助設定安全配置，請參考：
- `SETUP.md` - 完整設定指南
- `.env.example` - 環境變數範例
- Discord 官方文檔關於 Webhook 安全性

---

**記住：安全性是持續的過程，不是一次性的任務。** 🔐

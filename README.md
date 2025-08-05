# 🚀 加密貨幣交易所監控系統

一個強大的 Bitget 交易所監控系統，支援持倉量監控、資金費率監控和實時 Discord 通知。

## ✨ 核心功能

- � **合約持倉量監控** - 實時監控開倉量變化並生成排行榜
- 💰 **資金費率監控** - 跟蹤資金費率異動並發出警報
- 📊 **定時報告** - 每 15 分鐘自動生成排行榜報告
- 🔔 **Discord 通知** - 透過 Webhook 發送精美的監控結果
- 💾 **數據持久化** - SQLite 數據庫存儲歷史數據
- 🔄 **自動重連** - WebSocket 連接異常時自動重新連接
- � **完整日誌** - 詳細的日誌記錄系統

## 🛠️ 快速開始

### 1. 安裝依賴
```bash
git clone https://github.com/JackChen6203/exchange-watcher.git
cd exchange-watcher
npm install
```

### 2. 配置環境變數
```bash
cp .env.example .env
nano .env
```
### 3. 測試系統
```bash
# 運行測試
npm test

# 測試 Discord 通知
npm run test-discord
```

### 4. 啟動監控
```bash
# 本地運行
npm start

# 開發模式（自動重啟）
npm run dev
```

## ⚙️ 環境變數配置

```env
# Bitget API 配置
API_KEY=your_bitget_api_key
API_SECRET=your_bitget_api_secret
API_PASSPHRASE=your_bitget_passphrase

# Discord Webhook URLs
DISCORD_WEBHOOK_URL=your_discord_webhook_url
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

## � 部署

### 自動部署（推薦）
推送到 main 分支會自動部署到 GCP VM：
```bash
git push origin main
```

### 手動部署
1. 準備伺服器環境：
```bash
# 初始化 VM
bash deploy/vm-setup.sh
```

2. 執行部署：
```bash
# 複製檔案並部署
bash deploy/direct-deploy.sh
```

詳細部署說明請參閱 [DEPLOYMENT.md](DEPLOYMENT.md)

## 📊 監控報告

系統每 15 分鐘自動發送以下報告到 Discord：

### 持倉量變動排行榜
- 📈 **正異動 TOP 15** - 持倉量增加最多的合約
- 📉 **負異動 TOP 15** - 持倉量減少最多的合約

### 資金費率排行榜  
- 🟢 **正費率 TOP 15** - 資金費率最高的合約
- 🔴 **負費率 TOP 15** - 資金費率最低的合約

## 📋 系統架構

```
src/
├── config/config.js          # 系統配置
├── services/
│   ├── bitgetApi.js          # Bitget API 接口
│   ├── contractMonitor.js    # 合約監控（持倉量+資金費率）
│   ├── databaseManager.js    # 數據庫管理
│   └── discordService.js     # Discord 通知服務
├── utils/
│   └── logger.js             # 日誌工具
└── index.js                  # 主程序入口
```

## 🔧 管理命令

### 本地開發
```bash
npm start          # 啟動監控
npm run dev        # 開發模式
npm test           # 運行測試
npm run system-test # 系統測試
```

### 生產環境（systemd）
```bash
sudo systemctl status crypto-monitor    # 查看狀態
sudo systemctl restart crypto-monitor   # 重啟服務
sudo journalctl -u crypto-monitor -f    # 查看日誌
```

## 💾 數據存儲

### SQLite 數據庫
- `open_interest` - 持倉量歷史數據
- `funding_rate` - 資金費率歷史數據  
- `price_data` - 價格變動數據
- `ranking_snapshots` - 排行榜快照

### 數據清理
- 自動保留最近 30 天的數據
- 內存中保留最近 100 條記錄
- 定期清理過期數據

## � 故障排除

### 常見問題

**API 連接失敗**
- 檢查 API 密鑰是否正確
- 確認 API 權限設置
- 檢查網絡連接

**Discord 通知失敗**
- 驗證 Webhook URL 是否有效
- 檢查 Discord 服務器權限

**服務無法啟動**
```bash
# 檢查服務狀態
sudo systemctl status crypto-monitor

# 查看詳細日誌
sudo journalctl -u crypto-monitor -n 50

# 檢查配置文件
nano ~/.crypto-exchange-monitor/.env
```

## 📚 相關文檔

- [📖 設置指南](SETUP.md) - 詳細的安裝和配置說明
- [� 部署指南](DEPLOYMENT.md) - 生產環境部署
- [🔒 安全指南](SECURITY.md) - 安全設置最佳實踐
- [📊 Bitget 監控](README-BITGET.md) - Bitget 特定功能
- [⚙️ 合約監控](README-CONTRACT-MONITOR.md) - 合約監控詳細說明

## 🤝 貢獻

歡迎提交 Issues 和 Pull Requests！

## 📄 授權

MIT License

## ⚠️ 免責聲明

本系統僅用於監控目的，不執行任何交易操作。請確保 API 權限設置正確，避免意外風險。
- 價格趨勢方向

## 🔔 Discord 通知類型

### 📊 價格警報
當價格變動超過設定閾值時發送，包含：
- 當前價格
- 24小時變化百分比
- 成交量信息
- 趨勢圖表

### 💼 持倉警報
當持倉發生重大變化時發送，包含：
- 持倉變化量
- 當前總持倉
- 平均成本價
- 盈虧變化
- 持倉總價值

### ⚙️ 系統警報
系統狀態變化通知：
- 啟動/關閉通知
- 連接狀態警報
- 錯誤警告信息

## 📁 專案結構

```
crypto-exchange-monitor/
├── src/
│   ├── config/
│   │   └── config.js           # 系統配置
│   ├── services/
│   │   ├── discordService.js   # Discord通知服務
│   │   └── exchangeMonitor.js  # 交易所監控服務
│   ├── utils/
│   │   └── auth.js            # 認證工具
│   └── index.js               # 主程式入口
├── test/
│   └── test.js                # 測試文件
├── .env.example               # 環境變數範例
├── package.json
└── README.md
```

## 🔧 自定義配置

### 修改監控交易對
編輯 `src/config/config.js`：
```javascript
symbols: [
  'BTC-USDT',
  'ETH-USDT',
  'BNB-USDT',
  // 添加你想監控的交易對
]
```

### 調整監控閾值
在 `.env` 文件中修改：
```env
PRICE_CHANGE_THRESHOLD=3      # 降低價格警報敏感度
POSITION_CHANGE_THRESHOLD=500 # 降低持倉警報敏感度
```

## 🛡️ 安全建議

1. **保護API密鑰**
   - 不要將 `.env` 文件提交到版本控制
   - 使用只讀權限的API密鑰
   - 定期輪換API密鑰

2. **網路安全**
   - 在可信任的網路環境中運行
   - 考慮使用VPN或防火牆保護

3. **監控資源**
   - 監控系統資源使用情況
   - 設置適當的日誌級別

## 🐛 故障排除

### 常見問題

1. **WebSocket連接失敗**
   - 檢查API密鑰是否正確
   - 確認網路連接正常
   - 檢查交易所API是否可用

2. **Discord消息發送失敗**
   - 確認Webhook URL正確
   - 檢查Discord服務器狀態
   - 確認消息格式符合Discord限制

3. **認證失敗**
   - 驗證API密鑰、密碼和passphrase
   - 檢查系統時間是否準確
   - 確認API權限設置正確

### 查看日誌
系統會輸出詳細的運行日誌，包括：
- 連接狀態
- 數據接收情況  
- 錯誤信息
- 警報發送狀態

## 📞 支援

如果遇到問題或需要新功能，請：
1. 檢查上述故障排除指南
2. 查看系統日誌獲取錯誤詳情
3. 在Discord頻道中報告問題

## 📄 授權條款

本專案採用 MIT 授權條款。

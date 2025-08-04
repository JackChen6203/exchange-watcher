# 🚀 加密貨幣交易所監控系統

一個功能強大的加密貨幣交易所持倉和價格監控系統，支持實時監控並透過Discord Webhook發送警報。

## ✨ 功能特色

- 📊 **實時價格監控** - 監控指定交易對的價格變化
- 💰 **持倉變動監控** - 追蹤交易所持倉的實時變化
- 🔔 **Discord 通知** - 透過Discord Webhook發送美觀的嵌入式警報消息
- 🔄 **自動重連** - WebSocket連接異常時自動重新連接
- ⚙️ **靈活配置** - 支持自定義監控閾值和交易對
- 🛡️ **錯誤處理** - 完善的錯誤處理和日誌記錄

## 🛠️ 安裝步驟

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd crypto-exchange-monitor
   ```

2. **安裝依賴**
   ```bash
   npm install
   ```

3. **配置環境變數**
   ```bash
   cp .env.example .env
   # 編輯 .env 文件，填入你的API密鑰和配置
   ```

## ⚙️ 配置說明

### 環境變數 (.env)

```env
# 交易所 API 配置
API_KEY=your_api_key_here
API_SECRET=your_api_secret_here
API_PASSPHRASE=your_passphrase_here

# Discord Webhook URLs
DISCORD_WEBHOOK_URL=your_discord_webhook_url
FUNDING_RATE_WEBHOOK_URL=your_funding_rate_webhook_url
POSITION_WEBHOOK_URL=your_position_webhook_url

# 監控閾值
PRICE_CHANGE_THRESHOLD=5      # 價格變動百分比閾值
POSITION_CHANGE_THRESHOLD=1000 # 持倉變動金額閾值
UPDATE_INTERVAL=5000          # 更新間隔(毫秒)
```

### 監控配置

在 `src/config/config.js` 中可以修改：
- 監控的交易對列表
- 連接的交易所API端點
- 其他系統參數

## 🚦 使用方法

### 啟動監控系統
```bash
npm start
```

### 開發模式 (自動重啟)
```bash
npm run dev
```

### 發送測試消息
```bash
npm start -- --test
```

### 運行測試
```bash
# 測試Discord webhook
npm test -- --discord

# 測試配置
npm test -- --config
```

## 📋 支持的監控項目

### 💰 持倉監控
- 持倉數量變化
- 平均成本價格
- 未實現盈虧變化
- 持倉總價值

### 📈 價格監控  
- 實時價格變化
- 24小時漲跌幅
- 成交量信息
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
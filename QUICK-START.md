# 🚀 快速啟動指南

## 📋 前置需求

1. **獲取交易所API密鑰** (以OKX為例)
   - 前往 [OKX API 管理](https://www.okx.com/account/my-api)
   - 創建新的API密鑰
   - 記錄下 API Key, Secret Key, 和 Passphrase
   - ⚠️ **重要**: 只給予"讀取"權限，不要給予交易權限

2. **Node.js 環境**
   - 安裝 Node.js 16.0 或更高版本

## ⚡ 5分鐘快速設置

### 1. 安裝依賴
```bash
npm install
```

### 2. 配置環境變數
```bash
# 複製配置範例
cp .env.example .env

# 編輯 .env 文件，填入你的API資訊
```

在 `.env` 文件中填入：
```env
API_KEY=your_api_key
API_SECRET=your_api_secret  
API_PASSPHRASE=your_api_passphrase

# Discord Webhook URLs - 請設定您自己的 webhook
DISCORD_WEBHOOK_URL=your_discord_webhook_url
FUNDING_RATE_WEBHOOK_URL=your_funding_rate_webhook_url
POSITION_WEBHOOK_URL=your_position_webhook_url
```

### 3. 測試連接
```bash
# 測試Discord webhook
node test/test.js --discord

# 發送測試消息
npm start -- --test
```

### 4. 啟動監控
```bash
npm start
```

## 🎯 默認監控設置

- **監控交易對**: BTC-USDT, ETH-USDT, BNB-USDT, SOL-USDT, ADA-USDT
- **價格變動閾值**: 5%
- **持倉變動閾值**: $1000
- **更新間隔**: 5秒

## 📱 Discord 通知預覽

啟動後你將在Discord頻道看到：
1. 🚀 系統啟動通知
2. 📈 價格變動警報 (當價格波動超過5%)
3. 💰 持倉變動警報 (當持倉變化超過$1000)
4. ⚠️ 系統狀態警報

## 🔧 快速自定義

### 修改監控交易對
編輯 `src/config/config.js` 的 `symbols` 數組：
```javascript
symbols: [
  'BTC-USDT',
  'ETH-USDT',
  'DOGE-USDT',  // 添加新交易對
  // ... 其他交易對
]
```

### 調整警報敏感度
修改 `.env` 文件：
```env
PRICE_CHANGE_THRESHOLD=3      # 3%價格變動就警報
POSITION_CHANGE_THRESHOLD=500 # $500持倉變化就警報
```

## 🛑 停止監控

按 `Ctrl+C` 停止監控系統，系統會：
1. 優雅關閉WebSocket連接
2. 發送關閉通知到Discord
3. 清理資源並退出

## 📞 需要幫助？

- 查看完整文檔: `README.md`
- 運行測試: `npm test -- --discord`
- 檢查配置: `node test/test.js --config`

**現在你的交易所監控系統已經準備就緒！** 🎉
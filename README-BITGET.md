# 🚀 Bitget交易所監控系統

一個專門為Bitget交易所設計的全幣種價格監控系統，支持監控593個合約交易對的實時價格變動，並透過Discord Webhook發送警報。

## ✨ 功能特色

- 📊 **全幣種監控** - 自動監控Bitget所有593個合約交易對
- 🎯 **智能分組** - 多WebSocket連接組，每組監控50個交易對，確保穩定性
- 🔔 **Discord 通知** - 透過Discord Webhook發送美觀的價格變動警報
- 🔄 **自動重連** - WebSocket連接異常時自動重新連接
- ⚙️ **靈活配置** - 支持自定義價格變動閾值
- 🛡️ **錯誤處理** - 完善的錯誤處理和日誌記錄
- ⚡ **高性能** - 基於Bitget官方WebSocket API，低延遲實時數據

## 🎯 監控範圍

### 支持的產品類型
- **USDT保證金合約 (umcbl)** - 505個交易對
- **USD保證金合約 (dmcbl)** - 27個交易對  
- **混合保證金合約 (cmcbl)** - 61個交易對

### 主要監控交易對
- BTCUSDT_UMCBL, ETHUSDT_UMCBL, XRPUSDT_UMCBL
- BCHUSDT_UMCBL, LTCUSDT_UMCBL, ADAUSDT_UMCBL
- 以及其他580+個合約交易對

## 🛠️ 快速設置

### 1. 安裝依賴
```bash
npm install
```

### 2. 配置Bitget API
創建 `.env` 文件：
```env
# Bitget API 配置 (已配置)
API_KEY=bg_cb9290e4baa344c68c3067298212887b
API_SECRET=8f0b89aeefee5c73fc148a1eebe41b39ce194f357b02f806b8df3072718103fa
API_PASSPHRASE=a126182900

# Discord Webhook (已配置)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1401056427753214093/VkCT9tZKFDcRjjBbsaze7bcIbgDOFFAb4qGx17fXq07S9gwkLPYSTU8xW7YOT8koBa9N

# 監控配置
PRICE_CHANGE_THRESHOLD=5      # 價格變動百分比閾值
UPDATE_INTERVAL=5000          # 更新間隔(毫秒)
```

### 3. 測試系統
```bash
# 測試Bitget API連接
node test/bitgetTest.js --api

# 測試Discord通知
node test/bitgetTest.js --discord

# 運行所有測試
node test/bitgetTest.js --all
```

### 4. 啟動監控
```bash
npm start
```

## 📊 系統架構

### WebSocket連接策略
- **多連接組**: 系統自動將593個交易對分為12個連接組
- **負載均衡**: 每個連接組監控約50個交易對
- **容錯機制**: 單個連接組斷開不影響其他組的監控

### 數據流程
1. **初始化** → 獲取所有可用交易對
2. **分組連接** → 建立多個WebSocket連接
3. **實時監控** → 接收ticker價格數據
4. **閾值檢測** → 檢查價格變動是否超過設定閾值
5. **Discord推送** → 發送美觀的價格警報消息

## 🔔 Discord 通知範例

### 📈 價格上漲警報
```
📈 Bitget 價格變動提醒
交易對: BTCUSDT_UMCBL
當前價格: $113,989.80
24小時變化: +5.25%
24小時最高: $115,950.00
24小時最低: $112,669.50
24小時成交量: 105.9K
```

### 📉 價格下跌警報
```
📉 Bitget 價格變動提醒
交易對: ETHUSDT_UMCBL
當前價格: $3,527.09
24小時變化: -6.45%
24小時最高: $3,680.50
24小時最低: $3,490.25
24小時成交量: 87.2K
```

## ⚙️ 配置說明

### 價格變動閾值
```env
PRICE_CHANGE_THRESHOLD=5  # 當價格變動超過5%時發送警報
```

### WebSocket配置
- **Ping間隔**: 30秒
- **重連延遲**: 5秒
- **最大重連次數**: 10次
- **每組最大頻道**: 50個

## 🧪 測試指令

```bash
# 測試API連接和數據獲取
node test/bitgetTest.js --api

# 測試API認證
node test/bitgetTest.js --auth

# 測試Discord webhook
node test/bitgetTest.js --discord

# 測試價格警報
node test/bitgetTest.js --alert

# 運行完整測試套件
node test/bitgetTest.js --all
```

## 📈 監控數據

### 實時價格數據
- **最新價格**: 實時成交價
- **買賣價差**: 最佳買價/賣價
- **24小時統計**: 最高/最低/成交量
- **價格變動**: 24小時漲跌幅

### 技術指標
- **指數價格**: 現貨指數價格
- **資金費率**: 合約資金費率
- **持倉量**: 總持倉數量

## 🔧 故障排除

### 常見問題

1. **API連接失敗**
   - 檢查網路連接
   - 確認Bitget API服務狀態
   - 驗證API配置

2. **WebSocket連接不穩定**
   - 系統會自動重連
   - 檢查防火牆設置
   - 確認網路穩定性

3. **Discord消息發送失敗**
   - 確認webhook URL正確
   - 檢查Discord服務器狀態
   - 驗證消息格式

### 查看監控狀態
系統每30秒輸出狀態信息：
```
📊 監控狀態: 12/12 連接組活躍
🎯 監控交易對: 593/593 個
📡 數據更新: 正常
```

## 🚀 運行系統

```bash
# 啟動監控系統
npm start

# 開發模式 (自動重啟)
npm run dev

# 發送測試消息
npm start -- --test
```

## 📞 支援

- **系統測試**: `node test/bitgetTest.js --all`
- **API文檔**: [Bitget API](https://www.bitget.com/api-doc)
- **Discord通知**: 已配置到指定頻道

## 🎉 功能亮點

✅ **593個交易對全覆蓋**
✅ **多連接組高可用架構**  
✅ **實時價格變動監控**
✅ **美觀的Discord通知**
✅ **自動錯誤恢復**
✅ **完整的測試套件**

**您的Bitget交易所監控系統已經準備就緒！** 🎯
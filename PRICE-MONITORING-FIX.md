# 價格異動頻道修復摘要

## 🎯 問題診斷

### 用戶反映的問題
價格異動頻道目前沒有收到任何訊息

### 根本原因分析
通過診斷腳本 `diagnose_price_monitoring.js` 發現以下問題：

1. **價格變動閾值過高**: 預設為10%，在正常市場中很少達到
2. **價格警報頻道未配置**: `PRICE_ALERT_WEBHOOK_URL` 環境變數未設置  
3. **歷史價格數據不足**: 系統需要運行一段時間累積歷史數據才能計算價格變動
4. **缺乏手動測試功能**: 無法手動驗證價格警報是否正常工作

## ✅ 修復內容

### 1. 調整價格變動閾值
**文件**: `src/config/config.js`, `.env.example`

**修復前**:
```javascript
priceChange: parseFloat(process.env.PRICE_CHANGE_THRESHOLD) || 10, // 10%
```

**修復後**:
```javascript  
priceChange: parseFloat(process.env.PRICE_CHANGE_THRESHOLD) || 3, // 3% (更容易觸發)
```

### 2. 改進價格監控日誌
**文件**: `src/services/enhancedContractMonitor.js`

**新增功能**:
- 詳細的調試日誌記錄監控狀態
- 警報計數器統計發送的警報數量  
- 最大變動幅度計算用於日誌記錄

```javascript
this.logger.debug(`🔍 監控價格變動 - 閾值: ${threshold}%, 當前價格數據: ${currentPrices.size} 個`);
this.logger.info(`🚨 發送價格警報: ${symbol} 最大變動 ${maxChange.toFixed(2)}%`);
```

### 3. 新增手動測試功能
**文件**: `src/services/enhancedContractMonitor.js`

**新增方法**: `testPriceAlert()`

模擬價格異動並發送測試警報:
```javascript
async testPriceAlert() {
  const testSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  
  for (const symbol of testSymbols) {
    const testAlert = {
      symbol,
      price: currentPrice.price,
      changePercent: Math.random() > 0.5 ? 5.2 : -4.8,
      priceChanges: { /* 模擬各時間週期變動 */ }
    };
    
    await this.discordService.sendAlert('price_alert', testAlert);
  }
}
```

### 4. 整合部署測試
**文件**: `src/enhancedIndex.js`

在部署後自動測試中加入價格警報測試:
```javascript
// 測試價格警報功能
if (status.priceData > 0) {
  this.logger.console('🧪 測試價格警報功能...');
  await this.contractMonitor.testPriceAlert();
  this.logger.console('✅ 價格警報測試完成');
}
```

## 🛠️ 診斷和測試工具

### 1. 價格監控診斷腳本
**文件**: `diagnose_price_monitoring.js`

功能：
- 檢查配置狀態（閾值、Webhook配置）
- 測試API連接和價格數據獲取
- 模擬價格監控邏輯驗證觸發條件
- 檢查當前市場實際價格變動
- 測試Discord警報發送

### 2. 價格警報測試腳本  
**文件**: `test_price_alerts.js`

功能：
- 生成多種價格警報Embed格式測試
- 檢查當前市場是否有符合條件的變動
- 手動觸發價格警報測試
- 提供配置和優化建議

### 3. 使用方法
```bash
# 運行診斷
node diagnose_price_monitoring.js

# 運行價格警報測試
node test_price_alerts.js
```

## 📊 配置建議

### 1. 環境變數配置
在 `.env` 文件中添加:
```env
# 價格變動閾值 (3%比較合適)
PRICE_CHANGE_THRESHOLD=3

# 專用價格警報頻道 Webhook
PRICE_ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_PRICE_CHANNEL_ID/YOUR_TOKEN
```

### 2. Discord頻道設置
1. 在Discord伺服器創建 `#price-alerts` 頻道
2. 在該頻道創建Webhook
3. 將Webhook URL設置為 `PRICE_ALERT_WEBHOOK_URL`

### 3. 監控優化建議
- **閾值設置**: 3% (平衡敏感度和噪音)
- **監控間隔**: 目前3分鐘，可考慮縮短為1-2分鐘
- **測試時機**: 市場波動較大時進行測試驗證

## 🧪 測試結果

### 診斷測試結果
- ✅ API連接正常 (獲取到508個合約)
- ✅ 價格數據獲取正常 (BTCUSDT: $116,645.9)
- ⚠️ 當前市場變動較小，未超過3%閾值
- ❌ 價格警報Webhook未配置

### 修復效果預期
1. **閾值調整**: 從10%降低到3%，增加觸發機會
2. **測試功能**: 部署後會自動發送測試價格警報
3. **日誌改進**: 更詳細的監控日誌便於調試
4. **手動測試**: 提供測試腳本驗證功能

## 🚀 部署後驗證

### 1. 檢查日誌
部署後查看日誌中的價格監控信息:
```
🔍 監控價格變動 - 閾值: 3%, 當前價格數據: 508 個
📊 價格監控完成 - 無超過閾值的變動
🧪 測試價格警報功能...
✅ 測試警報已發送: BTCUSDT 5.2%
```

### 2. Discord頻道驗證
- **價格警報頻道**: 應收到測試價格警報消息
- **預設頻道**: 如未配置專用頻道，會發送到預設頻道

### 3. 功能測試
```bash
# 手動測試價格警報
node test_price_alerts.js

# 診斷監控狀態  
node diagnose_price_monitoring.js
```

## 📝 後續優化建議

1. **歷史數據累積**: 系統需要運行至少1小時才能進行有效的價格變動比較
2. **動態閾值**: 可考慮根據市場波動度動態調整閾值
3. **更多時間週期**: 添加5分鐘和2小時時間週期的價格變動監控
4. **警報去重**: 避免同一交易對短時間內重複發送警報
5. **市場感知**: 在市場開盤/收盤時調整監控頻率

---
*修復完成時間: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}*
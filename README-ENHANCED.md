# 增強型加密貨幣交易所監控系統

這是一個全面升級的 Bitget 交易所監控系統，提供多種先進功能包括多頻道 Discord 推送、價格變動監控、以及波段策略分析。

## 🆕 新功能特色

### 1. 多頻道 Discord 推送
- **資金費率專用頻道** - 專門推送資金費率排行榜
- **持倉變動專用頻道** - 專門推送持倉量變動報告
- **價格異動專用頻道** - 專門推送價格變動警報
- **波段策略專用頻道** - 專門推送 EMA 波段策略信號
- **防重複發送機制** - 智能檢測重複消息並防止發送

### 2. 增強型持倉量監控
- **多時間週期監控**: 15分鐘、30分鐘、1小時、4小時、日線
- **價格變動欄位**: 在持倉量報告中顯示對應時間段的價格變動
- **修復 1小時和4小時警報**: 解決時間週期計算問題

### 3. 價格異動監控
- **多時間週期價格分析**: 15分鐘、30分鐘、1小時、4小時
- **可配置閾值**: 自定義價格變動警報閾值
- **獨立推送頻道**: 價格異動單獨推送到專用頻道

### 4. 波段策略分析
- **EMA 均線分析**: 監測 EMA 12、EMA 30、EMA 55
- **市值篩選**: 只監控市值大於 500k 的幣種
- **趨勢識別**: 自動識別多頭和空頭排列
- **吞沒形態檢測**: 識別看漲和看跌吞沒 K 棒形態
- **EMA 回測確認**: 確認未回測 EMA 55 才發送信號

## 🚀 快速開始

### 1. 安裝依賴
```bash
npm install
```

### 2. 配置環境變數
複製並編輯環境變數文件：
```bash
cp .env.example .env
```

在 `.env` 文件中配置以下內容：

#### 必需配置
```env
# Bitget API 配置
API_KEY=your_bitget_api_key_here
API_SECRET=your_bitget_api_secret_here
API_PASSPHRASE=your_bitget_api_passphrase_here

# 主要 Discord Webhook (必需)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_MAIN_WEBHOOK_ID/YOUR_MAIN_WEBHOOK_TOKEN
```

#### 可選配置 (多頻道推送)
```env
# 資金費率專用頻道
FUNDING_RATE_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_FUNDING_RATE_WEBHOOK_ID/YOUR_FUNDING_RATE_WEBHOOK_TOKEN

# 持倉變動專用頻道
POSITION_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_POSITION_WEBHOOK_ID/YOUR_POSITION_WEBHOOK_TOKEN

# 價格異動專用頻道
PRICE_ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_PRICE_ALERT_WEBHOOK_ID/YOUR_PRICE_ALERT_WEBHOOK_TOKEN

# 波段策略專用頻道
SWING_STRATEGY_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_SWING_STRATEGY_WEBHOOK_ID/YOUR_SWING_STRATEGY_WEBHOOK_TOKEN
```

### 3. 啟動系統

#### 使用增強版本 (推薦)
```bash
# 正常運行
npm run start:enhanced

# 開發模式
npm run dev:enhanced

# 測試模式
npm run test-enhanced
```

#### 使用原始版本
```bash
npm start
```

## 📊 監控功能詳解

### 持倉量監控
- **監控頻率**: 每 5 分鐘更新數據
- **報告頻率**: 每 15 分鐘發送排行榜
- **時間週期**: 15分、30分、1小時、4小時、日線
- **排行數量**: 每個時間週期前 15 名正異動和負異動

#### 報告內容包含：
- 持倉量變化百分比
- 對應時間段價格變動百分比
- 當前持倉量數值
- 變化量數值

### 資金費率監控
- **監控頻率**: 每 5 分鐘更新數據
- **報告頻率**: 每 15 分鐘發送排行榜
- **排行數量**: 前 15 名高費率和負費率

#### 報告內容包含：
- 當前資金費率百分比
- 排序按費率高低
- 分別顯示正費率和負費率排行

### 價格異動監控
- **監控頻率**: 每 3 分鐘檢查
- **觸發條件**: 價格變動超過設定閾值 (預設 10%)
- **多時間週期**: 15分、30分、1小時、4小時

#### 警報內容包含：
- 當前價格
- 24小時變化
- 各時間週期變化百分比
- 24小時成交量

### 波段策略監控
- **監控頻率**: 每 15 分鐘分析
- **篩選條件**: 市值大於 500k 的幣種
- **K線週期**: 15 分鐘 K 線
- **EMA 參數**: EMA 12、EMA 30、EMA 55

#### 策略邏輯：
1. **趨勢判斷**: 識別多頭排列 (EMA12 > EMA30 > EMA55) 或空頭排列
2. **EMA30 回測**: K 棒接觸 EMA30 (誤差範圍 2%)
3. **吞沒形態**: 識別看漲或看跌吞沒 K 棒
4. **EMA55 確認**: 確認最近 20 根 K 棒未觸及 EMA55
5. **信號發送**: 滿足所有條件時發送波段策略信號

## 🛠️ 配置選項

### 監控閾值設定
```env
PRICE_CHANGE_THRESHOLD=10.0        # 價格變動警報閾值 (%)
POSITION_CHANGE_THRESHOLD=10.0     # 持倉變動警報閾值 (%)
FUNDING_RATE_HIGH_THRESHOLD=0.1    # 高資金費率閾值 (%)
FUNDING_RATE_LOW_THRESHOLD=-0.1    # 低資金費率閾值 (%)
UPDATE_INTERVAL=5000               # 更新間隔 (毫秒)
```

### 日誌配置
```env
LOG_LEVEL=info                     # 日誌級別 (debug, info, warn, error)
LOG_FILE=./logs/monitor.log        # 日誌文件路徑
VERBOSE_LOGGING=false              # 詳細日誌開關
```

## 📋 系統架構

### 核心組件
- **EnhancedContractMonitor**: 增強型合約監控器
- **EnhancedDiscordService**: 增強型 Discord 服務 (多頻道支持)
- **BitgetApi**: Bitget API 接口 (新增 K線和 ticker 方法)
- **DatabaseManager**: 數據庫管理器 (SQLite)
- **Logger**: 日誌管理器

### 數據流程
1. **數據收集**: 每 5 分鐘從 Bitget API 收集數據
2. **歷史備份**: 自動備份不同時間週期的歷史數據
3. **分析計算**: 計算持倉量變化、價格變動、EMA 指標
4. **信號生成**: 根據設定條件生成各種警報信號
5. **多頻道推送**: 將不同類型的信號推送到對應的 Discord 頻道

## 🧪 測試

### 運行測試
```bash
# 基本測試
npm test

# 端到端測試
npm run test:e2e

# 合約監控測試
npm run test:contract

# 完整測試套件
npm run test:all
```

### Discord 測試
```bash
# 測試原始版本
npm run test-discord

# 測試增強版本 (推薦)
npm run test-enhanced
```

## 🔧 故障排除

### 常見問題

1. **API 連接失敗**
   - 檢查 API 金鑰、密鑰和密碼是否正確
   - 確認 API 權限包含合約交易數據讀取

2. **Discord 推送失敗**
   - 驗證 Webhook URL 格式正確
   - 檢查 Discord 頻道權限

3. **數據不完整**
   - 確認網絡連接穩定
   - 檢查 Bitget API 限制是否觸發

4. **1小時/4小時警報不工作**
   - 使用增強版本 (`npm run start:enhanced`)
   - 原始版本存在時間週期計算問題

## 📈 性能優化

### 批次處理
- API 請求使用批次處理避免頻率限制
- 每批次間有適當延遲

### 內存管理
- 歷史數據自動清理
- 消息快取限制在 100 條記錄

### 重複消息防護
- 5 分鐘內相同類型消息會被過濾
- 基於內容 MD5 雜湊進行去重

## 🚀 部署

### Docker 部署
```bash
# 構建映像
docker build -t crypto-monitor .

# 運行容器
docker run -d --name crypto-monitor --env-file .env crypto-monitor
```

### PM2 部署
```bash
# 安裝 PM2
npm install -g pm2

# 啟動增強版本
pm2 start src/enhancedIndex.js --name crypto-monitor-enhanced

# 查看狀態
pm2 status

# 查看日誌
pm2 logs crypto-monitor-enhanced
```

## 📝 更新日誌

### v2.0.0 (增強版本)
- ✅ 新增多頻道 Discord 推送
- ✅ 修復重複消息發送問題
- ✅ 新增價格變動欄位到持倉量報告
- ✅ 修復 1小時和4小時警報問題
- ✅ 實現價格異動監控功能
- ✅ 開發波段策略 EMA 分析
- ✅ 實現 15 分鐘監控間隔
- ✅ 新增防重複發送機制

### v1.0.0 (原始版本)
- 基本持倉量監控
- 基本資金費率監控
- 單一 Discord 頻道推送

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License
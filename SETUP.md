# 加密貨幣交易所監控系統 - 設置指南

## 系統概述

這是一個重構後的 Bitget 交易所監控系統，根據 CLAUDE.md 的要求實現了以下功能：

### 核心功能
- ✅ **合約持倉量監控** - 實時監控開倉量變化
- ✅ **資金費率監控** - 跟蹤資金費率異動
- ✅ **15分鐘定時報告** - 自動生成排行榜報告
- ✅ **多時間周期分析** - 15分鐘、1小時、4小時、日線數據
- ✅ **數據持久化** - SQLite 數據庫存儲歷史數據
- ✅ **Discord 通知** - 實時推送監控結果
- ✅ **日誌系統** - 完整的日誌記錄功能

### 系統架構
```
src/
├── config/config.js          # 系統配置
├── services/
│   ├── bitgetApi.js          # Bitget API 接口
│   ├── bitgetMonitor.js      # 現貨價格監控
│   ├── contractMonitor.js    # 合約監控（持倉量+資金費率）
│   ├── databaseManager.js    # 數據庫管理
│   └── discordService.js     # Discord 通知服務
├── utils/
│   └── logger.js             # 日誌工具
└── index.js                  # 主程序入口
```

## 安裝設置

### 1. 安裝依賴
```bash
npm install
```

### 2. 環境配置
創建 `.env` 文件並配置以下環境變量：

```env
# Bitget API 配置
API_KEY=your_bitget_api_key
API_SECRET=your_bitget_api_secret  
API_PASSPHRASE=your_bitget_passphrase

# Discord Webhook
DISCORD_WEBHOOK_URL=your_discord_webhook_url

# 監控閾值 (可選)
PRICE_CHANGE_THRESHOLD=10
POSITION_CHANGE_THRESHOLD=10
FUNDING_RATE_HIGH_THRESHOLD=0.1
FUNDING_RATE_LOW_THRESHOLD=-0.1

# 日誌配置 (可選)
LOG_LEVEL=info
VERBOSE_LOGGING=false
```

### 3. API 權限設置
在 Bitget 交易所設置 API 時，確保具有以下權限：
- ✅ **查看** - 查看賬戶信息
- ✅ **合約交易** - 讀取合約數據
- ❌ **提現** - 不需要
- ❌ **劃轉** - 不需要

### 4. Discord Webhook 設置
1. 在 Discord 服務器創建 Webhook
2. 複製 Webhook URL 到 `.env` 文件
3. 確保機器人有發送消息權限

## 使用方法

### 測試系統
```bash
# 運行完整系統測試
npm run system-test

# 測試 Discord 通知
npm run test-discord
```

### 啟動監控
```bash
# 正式啟動監控系統
npm start

# 開發模式（自動重啟）
npm run dev
```

## 監控報告說明

系統每 15 分鐘自動發送以下報告到 Discord：

### 1. 持倉量變動排行榜
- 📈 **正異動 TOP 15** - 持倉量增加最多的合約
- 📉 **負異動 TOP 15** - 持倉量減少最多的合約
- 顯示變化百分比和絕對數值

### 2. 資金費率排行榜  
- 🟢 **正費率 TOP 15** - 資金費率最高的合約
- 🔴 **負費率 TOP 15** - 資金費率最低的合約
- 顯示費率百分比和下次更新時間

## 數據存儲

### SQLite 數據庫
系統使用 SQLite 數據庫存儲以下數據：
- `open_interest` - 持倉量歷史數據
- `funding_rate` - 資金費率歷史數據  
- `price_data` - 價格變動數據
- `ranking_snapshots` - 排行榜快照

### 數據目錄
```
data/
└── monitor.db           # SQLite 數據庫文件

logs/
└── monitor.log          # 系統日誌文件
```

### 數據清理
- 系統自動保留最近 30 天的數據
- 內存中保留最近 100 條記錄
- 定期清理過期數據

## 系統監控

### 狀態檢查
系統運行時會每 30 秒輸出狀態信息：
```
📊 監控狀態: {
  連接狀態: '✅ 已連接',
  連接組: '16/16', 
  活躍監控: '790個交易對',
  訂閱統計: '790成功/0失敗 (100.0%)'
}
```

### 日誌級別
- `debug` - 調試信息
- `info` - 一般信息  
- `warn` - 警告信息
- `error` - 錯誤信息

## 故障排除

### 常見問題

1. **API 連接失敗**
   - 檢查 API 密鑰是否正確
   - 確認 API 權限設置
   - 檢查網絡連接

2. **Discord 通知失敗**
   - 驗證 Webhook URL 是否有效
   - 檢查 Discord 服務器權限
   - 測試 Webhook 連接

3. **數據庫錯誤**
   - 確保 `data/` 目錄存在
   - 檢查磁盤空間
   - 查看數據庫文件權限

4. **WebSocket 連接問題**
   - 檢查防火牆設置
   - 確認網絡穩定性
   - 查看日誌文件詳細錯誤

### 日誌文件位置
```
logs/monitor.log
```

### 重置系統
如需重置系統：
```bash
# 刪除數據庫
rm -rf data/

# 清空日誌
rm -rf logs/

# 重新啟動
npm start
```

## 性能優化

### API 限制
- Bitget API 限制：20 req/sec/IP
- 系統自動限流和重試
- 批量處理數據請求

### 資源使用
- 內存使用：約 50-100MB
- 磁盤使用：約 10MB/天
- CPU 使用：很低（<5%）

### 擴展性
- 支持監控多個交易所（需修改代碼）
- 支持自定義監控指標
- 支持多種通知方式

## 技術支持

如遇到問題，請檢查：
1. 系統日誌 (`logs/monitor.log`)
2. 運行系統測試 (`npm run system-test`)
3. 驗證配置文件 (`.env`)
4. 查看 Discord 通知

---

**重要提示：** 此系統僅用於監控目的，不執行任何交易操作。請確保 API 權限設置正確，避免意外風險。
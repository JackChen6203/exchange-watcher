# 數據庫和 Redis 設置指南

本項目支持兩種數據存儲方式：SQLite（本地數據庫）和 Redis（內存數據庫）。您可以根據需求選擇使用。

## 🗄️ SQLite 設置（預設，推薦用於開發和小規模部署）

SQLite 是預設的存儲方式，無需額外設置。數據庫文件會自動創建在 `data/monitor.db`。

### 優點：
- 無需額外安裝或配置
- 數據持久化存儲
- 適合單機部署
- 支援SQL查詢和數據分析

### 使用方式：
```bash
# 直接運行，會自動創建SQLite數據庫
npm start
```

### 數據庫結構：
- `open_interest` - 持倉量數據
- `funding_rate` - 資金費率數據  
- `price_data` - 價格數據
- `ranking_snapshots` - 排行榜快照

## 🚀 Redis 設置（推薦用於生產環境和高性能需求）

Redis 提供更快的讀寫性能，適合高頻率的數據更新。

### 安裝 Redis

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

#### CentOS/RHEL:
```bash
sudo yum install epel-release
sudo yum install redis
sudo systemctl start redis
sudo systemctl enable redis
```

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Docker:
```bash
docker run -d --name redis-monitor -p 6379:6379 redis:latest
```

### 配置 Redis

在項目根目錄的 `.env` 文件中添加Redis配置：

```env
# Redis 配置（可選）
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
USE_REDIS=true
```

### Redis 配置選項說明：

- `REDIS_HOST`: Redis服務器地址（預設: localhost）
- `REDIS_PORT`: Redis端口（預設: 6379）
- `REDIS_PASSWORD`: Redis密碼（如有設置）
- `REDIS_DB`: 使用的數據庫編號（預設: 0）
- `USE_REDIS`: 是否啟用Redis（預設: false）

## 🔄 混合模式（同時使用SQLite和Redis）

可以同時啟用SQLite和Redis，獲得兩者的優勢：

- SQLite: 長期數據存儲和歷史數據分析
- Redis: 實時數據快取和快速查詢

在 `.env` 中設置：
```env
USE_REDIS=true
USE_SQLITE=true
```

## 📊 數據結構說明

### 持倉量數據 (Open Interest)
```json
{
  "symbol": "BTCUSDT",
  "openInterest": 50000.0,
  "openInterestUsd": 2500000000.0,
  "changePercent": 5.25,
  "timestamp": 1703123456789
}
```

### 價格數據 (Price Data)  
```json
{
  "symbol": "BTCUSDT",
  "price": 50000.0,
  "changePercent": 2.5,
  "volume24h": 1000000.0,
  "timestamp": 1703123456789
}
```

### 資金費率數據 (Funding Rate)
```json
{
  "symbol": "BTCUSDT", 
  "fundingRate": 0.0001,
  "nextFundingTime": 1703126400000,
  "timestamp": 1703123456789
}
```

## 🛠️ 管理工具

### SQLite 管理
```bash
# 查看數據庫
sqlite3 data/monitor.db

# 查詢示例
.tables
SELECT * FROM open_interest ORDER BY timestamp DESC LIMIT 10;
```

### Redis 管理
```bash
# 連接Redis
redis-cli

# 查看所有鍵
KEYS *

# 查看持倉量數據
GET oi:BTCUSDT:current

# 查看排行榜
GET ranking:position:positive:15m
```

## 🔧 性能調優

### SQLite 調優
```sql
-- 啟用WAL模式提高並發性能
PRAGMA journal_mode=WAL;

-- 增加快取大小
PRAGMA cache_size=10000;

-- 優化同步模式
PRAGMA synchronous=NORMAL;
```

### Redis 調優
```conf
# redis.conf 優化建議
maxmemory 2gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

## 🚨 故障排除

### SQLite 問題
1. **數據庫鎖定**: 確保沒有其他進程在使用數據庫
2. **磁盤空間**: 檢查可用磁盤空間
3. **權限問題**: 確保進程有寫入 `data/` 目錄的權限

### Redis 問題  
1. **連接失敗**: 檢查Redis服務是否運行
2. **內存不足**: 調整maxmemory設置
3. **認證失敗**: 檢查密碼配置

### 常用診斷命令
```bash
# 檢查Redis狀態
redis-cli ping

# 檢查Redis連接
redis-cli info replication

# 查看SQLite數據庫大小
du -h data/monitor.db

# 檢查進程狀態
ps aux | grep node
```

## 📈 監控和警報

系統會自動記錄以下指標：
- 持倉量變化（15分、1小時、4小時周期）
- 價格變動（實時和歷史）
- 資金費率變化
- 系統性能指標

數據會根據配置自動清理：
- Redis: 7天TTL
- SQLite: 保留30天數據

## 🔄 數據遷移

### 從SQLite導出到Redis
```javascript
// 可以使用內建的遷移工具
npm run migrate:sqlite-to-redis
```

### 從Redis備份到SQLite
```javascript
// 定期備份Redis數據到SQLite
npm run backup:redis-to-sqlite
```

## 💡 建議配置

### 開發環境
```env
USE_REDIS=false
USE_SQLITE=true
```

### 生產環境（單機）
```env
USE_REDIS=true
USE_SQLITE=true
REDIS_HOST=localhost
```

### 生產環境（集群）
```env
USE_REDIS=true
USE_SQLITE=false
REDIS_HOST=your-redis-cluster-host
REDIS_PASSWORD=your-redis-password
```

這樣的配置可以確保您的交易所監控系統有足夠的性能和可靠性來處理實時數據分析！
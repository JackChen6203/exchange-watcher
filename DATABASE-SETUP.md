# 數據庫設置指南

本系統支持 SQLite（本地數據庫）和 Redis（內存數據庫）兩種數據存儲方案。

## 🗄️ SQLite 設置（推薦用於生產環境）

### 特點
- ✅ 數據持久化存儲
- ✅ 無需額外服務
- ✅ 適合長期數據分析
- ✅ 自動創建表結構

### 設置步驟

1. **依賴已安裝**
   SQLite3 依賴已包含在 package.json 中：
   ```bash
   npm install  # sqlite3 已包含
   ```

2. **數據庫自動初始化**
   系統啟動時會自動創建數據庫文件和表結構：
   ```
   ./data/monitor.db  # 數據庫文件位置
   ```

3. **表結構**
   系統會自動創建以下表：
   
   - `open_interest` - 持倉量數據
   - `funding_rates` - 資金費率數據  
   - `price_data` - 價格數據
   - `swing_signals` - 波段策略信號

### 數據查詢示例

```sql
-- 查看最新持倉量數據
SELECT * FROM open_interest 
ORDER BY timestamp DESC 
LIMIT 10;

-- 查看資金費率歷史
SELECT symbol, funding_rate, timestamp 
FROM funding_rates 
WHERE symbol = 'BTCUSDT' 
ORDER BY timestamp DESC;

-- 查看波段策略信號
SELECT * FROM swing_signals 
WHERE strategy = 'bullish' 
ORDER BY timestamp DESC;
```

## 🚀 Redis 設置（推薦用於高頻交易）

### 特點
- ✅ 極快的讀寫速度
- ✅ 內存存儲，響應迅速
- ✅ 支持數據過期
- ❌ 需要額外 Redis 服務

### 設置步驟

1. **安裝 Redis**
   
   **Docker 方式（推薦）:**
   ```bash
   docker run -d -p 6379:6379 --name redis redis:alpine
   ```
   
   **本地安裝:**
   ```bash
   # macOS
   brew install redis
   brew services start redis
   
   # Ubuntu
   sudo apt install redis-server
   sudo systemctl start redis
   
   # Windows
   # 下載 Redis for Windows 或使用 WSL
   ```

2. **安裝 Node.js Redis 客戶端**
   ```bash
   npm install redis
   ```

3. **配置環境變數**
   在 `.env` 文件中添加：
   ```env
   REDIS_URL=redis://localhost:6379
   DATABASE_TYPE=redis  # 或 sqlite
   ```

4. **Redis 配置優化**
   創建 `redis.conf` 文件：
   ```conf
   # 內存優化
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   
   # 數據持久化
   save 900 1
   save 300 10
   save 60 10000
   
   # 網絡優化
   tcp-keepalive 300
   timeout 0
   ```

### 使用 Redis 的數據結構

```javascript
// 持倉量數據 (Hash)
HSET "position:BTCUSDT" timestamp 1640995200000 openInterest 1000000 price 45000

// 資金費率數據 (Sorted Set by timestamp)
ZADD "funding:BTCUSDT" 1640995200000 "0.0001"

// 價格數據 (Time Series)
HSET "price:BTCUSDT:15m" timestamp 1640995200000 price 45000 change 2.5

// 波段策略信號 (List)
LPUSH "swing:signals" '{"symbol":"BTCUSDT","strategy":"bullish","timestamp":...}'
```

## 🔄 自定義數據庫管理器

如果需要使用其他數據庫（如 PostgreSQL、MongoDB），可以擴展 `DatabaseManager` 類：

```javascript
// src/services/customDatabaseManager.js
class CustomDatabaseManager extends DatabaseManager {
  async initialize() {
    // 自定義初始化邏輯
  }
  
  async saveOpenInterest(data) {
    // 自定義保存邏輯
  }
  
  async saveFundingRate(data) {
    // 自定義保存邏輯
  }
}
```

## 📊 數據分析工具

### 1. SQLite 瀏覽器工具
- **DB Browser for SQLite**: 圖形化管理工具
- **SQLite Studio**: 跨平台數據庫管理
- **命令行工具**: `sqlite3 ./data/monitor.db`

### 2. Redis 管理工具
- **Redis Commander**: Web 界面管理
  ```bash
  npm install -g redis-commander
  redis-commander
  ```
- **RedisInsight**: 官方桌面應用
- **Redis CLI**: `redis-cli`

### 3. 數據導出腳本

創建數據導出腳本 `scripts/export-data.js`：

```javascript
const DatabaseManager = require('../src/services/databaseManager');
const fs = require('fs');

async function exportData() {
  const db = new DatabaseManager();
  await db.initialize();
  
  // 導出持倉量數據
  const openInterestData = await db.query(`
    SELECT * FROM open_interest 
    WHERE timestamp > ? 
    ORDER BY timestamp DESC
  `, [Date.now() - 24 * 60 * 60 * 1000]); // 最近24小時
  
  fs.writeFileSync('exports/open_interest.json', 
    JSON.stringify(openInterestData, null, 2));
  
  console.log('數據導出完成');
}

exportData().catch(console.error);
```

## 🔧 性能優化建議

### SQLite 優化
```sql
-- 創建索引加速查詢
CREATE INDEX idx_symbol_timestamp ON open_interest(symbol, timestamp);
CREATE INDEX idx_funding_timestamp ON funding_rates(timestamp);

-- 定期清理舊數據
DELETE FROM price_data WHERE timestamp < ?; -- 30天前的數據
```

### Redis 優化
```javascript
// 設置數據過期時間
await redis.setex('temp:data', 3600, JSON.stringify(data)); // 1小時過期

// 使用 Pipeline 批量操作
const pipeline = redis.pipeline();
pipeline.hset('position:BTCUSDT', 'price', 45000);
pipeline.hset('position:ETHUSDT', 'price', 3000);
await pipeline.exec();
```

## 🔄 數據遷移

### SQLite 到 Redis
```bash
node scripts/migrate-sqlite-to-redis.js
```

### Redis 到 SQLite
```bash  
node scripts/migrate-redis-to-sqlite.js
```

## 📋 監控建議

### 數據庫大小監控
```bash
# SQLite 文件大小
ls -lh data/monitor.db

# Redis 內存使用
redis-cli info memory
```

### 自動清理腳本
創建 `scripts/cleanup.js` 定期清理舊數據：

```javascript
// 每天運行一次，清理30天前的數據
const cleanupOldData = async () => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  await db.query('DELETE FROM price_data WHERE timestamp < ?', [thirtyDaysAgo]);
  console.log('舊數據清理完成');
};
```

## 🚨 備份與恢復

### SQLite 備份
```bash
# 複製數據庫文件
cp data/monitor.db backup/monitor_$(date +%Y%m%d).db

# 使用 SQLite 命令
sqlite3 data/monitor.db ".backup backup/monitor_$(date +%Y%m%d).db"
```

### Redis 備份
```bash
# 創建快照
redis-cli BGSAVE

# 複製 RDB 文件
cp /var/lib/redis/dump.rdb backup/dump_$(date +%Y%m%d).rdb
```

選擇適合你需求的數據庫方案，SQLite 適合大多數場景，Redis 適合高頻交易和即時分析需求。
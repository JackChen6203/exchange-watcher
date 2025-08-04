# 📦 部署指南

## 🚀 快速部署

### 1. 環境準備

**系統要求:**
- Node.js >= 18.0.0
- npm >= 8.0.0
- 磁碟空間 >= 1GB (用於日誌和數據庫)

**API 要求:**
- Bitget API 金鑰 (需要合約數據讀取權限)
- Discord Webhook URLs (至少一個主要頻道)

### 2. 安裝部署

```bash
# 克隆項目
git clone https://github.com/Davis1233798/exchange_monitor.git
cd exchange_monitor

# 安裝依賴
npm install

# 配置環境變數
cp .env.example .env
nano .env  # 編輯配置

# 測試配置
npm run test-enhanced

# 啟動增強版本
npm run start:enhanced
```

### 3. 環境變數配置

#### 必需配置
```env
# Bitget API 配置
API_KEY=your_bitget_api_key_here
API_SECRET=your_bitget_api_secret_here
API_PASSPHRASE=your_bitget_api_passphrase_here

# 主要 Discord Webhook
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

## 🐳 Docker 部署

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# 複製 package 文件
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製源代碼
COPY src/ ./src/
COPY .env .env

# 創建日誌目錄
RUN mkdir -p logs data

# 暴露端口 (如果需要健康檢查)
EXPOSE 3000

# 啟動命令
CMD ["npm", "run", "start:enhanced"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  crypto-monitor:
    build: .
    container_name: crypto-monitor-enhanced
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
      - ./data:/app/data
    environment:
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "node", "-e", "console.log('健康檢查通過')"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:alpine
    container_name: crypto-monitor-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

### 部署命令
```bash
# 構建並啟動
docker-compose up -d

# 查看日誌
docker-compose logs -f crypto-monitor

# 停止服務
docker-compose down
```

## 🔧 PM2 部署 (推薦生產環境)

### 1. 安裝 PM2
```bash
npm install -g pm2
```

### 2. PM2 配置文件 (ecosystem.config.js)
```javascript
module.exports = {
  apps: [{
    name: 'crypto-monitor-enhanced',
    script: 'src/enhancedIndex.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 3. PM2 部署命令
```bash
# 啟動應用
pm2 start ecosystem.config.js

# 查看狀態
pm2 status

# 查看日誌
pm2 logs crypto-monitor-enhanced

# 重啟應用
pm2 restart crypto-monitor-enhanced

# 停止應用
pm2 stop crypto-monitor-enhanced

# 設置開機自啟
pm2 startup
pm2 save
```

## 🔄 服務管理 (Systemd)

### 1. 創建服務文件
```bash
sudo nano /etc/systemd/system/crypto-monitor.service
```

```ini
[Unit]
Description=Crypto Exchange Monitor Enhanced
After=network.target

[Service]
Type=simple
User=crypto-user
WorkingDirectory=/home/crypto-user/exchange-watcher
ExecStart=/usr/bin/node src/enhancedIndex.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=crypto-monitor
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 2. 啟用服務
```bash
# 重新加載 systemd
sudo systemctl daemon-reload

# 啟用服務
sudo systemctl enable crypto-monitor

# 啟動服務
sudo systemctl start crypto-monitor

# 查看狀態
sudo systemctl status crypto-monitor

# 查看日誌
sudo journalctl -u crypto-monitor -f
```

## 📊 監控與維護

### 1. 日誌管理
```bash
# 查看應用日誌
tail -f logs/monitor.log

# 日誌輪替設置 (/etc/logrotate.d/crypto-monitor)
/home/crypto-user/exchange-watcher/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    copytruncate
}
```

### 2. 資料庫維護
```bash
# 檢查 SQLite 數據庫大小
ls -lh data/monitor.db

# 清理舊數據 (保留30天)
node -e "
const db = require('./src/services/databaseManager');
const dbManager = new db(require('./src/config/config'));
dbManager.initialize().then(() => {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return dbManager.query('DELETE FROM price_data WHERE timestamp < ?', [thirtyDaysAgo]);
}).then(() => console.log('清理完成'));
"
```

### 3. 健康檢查腳本
```bash
#!/bin/bash
# health-check.sh

# 檢查進程是否運行
if ! pgrep -f "enhancedIndex.js" > /dev/null; then
    echo "$(date): 應用未運行，嘗試重啟..."
    npm run start:enhanced &
    exit 1
fi

# 檢查日誌是否有最新活動
LAST_LOG=$(tail -1 logs/monitor.log | cut -d' ' -f1-2)
CURRENT_TIME=$(date -u +"%Y-%m-%dT%H:%M")
TIME_DIFF=$(( $(date -d "$CURRENT_TIME" +%s) - $(date -d "$LAST_LOG" +%s) ))

if [ $TIME_DIFF -gt 600 ]; then  # 10分鐘無日誌
    echo "$(date): 應用可能凍結，重啟中..."
    pkill -f "enhancedIndex.js"
    sleep 5
    npm run start:enhanced &
    exit 1
fi

echo "$(date): 健康檢查通過"
```

### 4. 定時任務 (Crontab)
```bash
# 編輯 crontab
crontab -e

# 添加以下任務
# 每5分鐘健康檢查
*/5 * * * * /path/to/health-check.sh >> /path/to/health.log 2>&1

# 每天凌晨清理舊數據
0 2 * * * cd /path/to/exchange-watcher && node scripts/cleanup.js

# 每週備份數據庫
0 3 * * 0 cp /path/to/data/monitor.db /path/to/backup/monitor_$(date +\%Y\%m\%d).db
```

## 🔐 安全配置

### 1. 防火牆設置
```bash
# 如果需要外部訪問健康檢查端點
sudo ufw allow 3000

# 限制 SSH 訪問
sudo ufw allow from YOUR_IP to any port 22
```

### 2. 環境變數安全
```bash
# 設置文件權限
chmod 600 .env

# 避免在進程列表中暴露敏感信息
ps aux | grep -v grep | grep node  # 確認無敏感信息
```

### 3. API 密鑰管理
- 使用最小權限原則 (只授予必要的 API 權限)
- 定期輪換 API 密鑰
- 監控 API 使用情況
- 設置 IP 白名單 (如果 Bitget 支持)

## 📈 性能優化

### 1. Node.js 優化
```bash
# 增加內存限制
export NODE_OPTIONS="--max-old-space-size=2048"

# 啟用生產模式
export NODE_ENV=production
```

### 2. 系統優化
```bash
# 增加文件描述符限制
echo "crypto-user soft nofile 65535" | sudo tee -a /etc/security/limits.conf
echo "crypto-user hard nofile 65535" | sudo tee -a /etc/security/limits.conf
```

### 3. 數據庫優化
```sql
-- SQLite 優化設置
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA cache_size = 10000;
PRAGMA temp_store = memory;
```

## 🚨 故障排除

### 常見問題

1. **API 連接失敗**
   ```bash
   # 檢查網絡連接
   curl -I https://api.bitget.com
   
   # 驗證 API 憑證
   npm run test-enhanced
   ```

2. **Discord 推送失敗**
   ```bash
   # 測試 webhook
   curl -X POST "YOUR_WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"content": "測試消息"}'
   ```

3. **內存使用過高**
   ```bash
   # 查看內存使用
   ps aux | grep node
   
   # 重啟應用
   pm2 restart crypto-monitor-enhanced
   ```

4. **數據庫鎖定**
   ```bash
   # 檢查數據庫狀態
   sqlite3 data/monitor.db ".schema"
   
   # 修復數據庫
   sqlite3 data/monitor.db "VACUUM;"
   ```

## 📞 支援聯繫

- GitHub Issues: https://github.com/Davis1233798/exchange_monitor/issues
- 電子郵件: [維護者郵箱]
- Discord: [社群連結]

## 📋 部署檢查清單

- [ ] Node.js 版本 >= 18.0.0
- [ ] 環境變數已配置
- [ ] API 金鑰有效且權限正確
- [ ] Discord Webhooks 測試通過
- [ ] 數據庫目錄已創建
- [ ] 日誌目錄已創建
- [ ] 防火牆規則已設置
- [ ] 監控腳本已配置
- [ ] 定時任務已設置
- [ ] 備份策略已實施
- [ ] 文檔已更新

部署完成後，建議運行完整測試套件驗證功能：
```bash
npm run test:all
```
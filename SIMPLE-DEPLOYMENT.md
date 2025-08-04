# 🚀 簡單直接部署指南

## 為什麼不用 Docker？

您說得對！專用 VM 不需要 Docker 的複雜性：
- ✅ **更簡單** - 直接在 VM 上運行 Node.js
- ✅ **更輕量** - 無需 Docker 開銷
- ✅ **更直接** - 直接管理程式，無容器層
- ✅ **更高效** - 資源直接使用，無虛擬化損耗

## 🔧 一次性 VM 設置

### 1. SSH 到您的 VM
```bash
ssh your_user@your_gcp_host
```

### 2. 運行初始化腳本（僅需一次）
```bash
# 下載並運行 VM 設置腳本
curl -fsSL https://raw.githubusercontent.com/Davis1233798/exchange_monitor/main/deploy/vm-setup.sh | bash

# 或手動安裝 Node.js 和 PM2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 3. 重新登錄以載入環境
```bash
exit
ssh your_user@your_gcp_host
```

## 📦 應用程式部署

### 方法 1: 使用 GitHub Actions（推薦）
1. 更新 GitHub workflow 使用直接部署：
   ```bash
   mv .github/workflows/deploy.yml .github/workflows/deploy-docker.yml.backup
   mv .github/workflows/direct-deploy.yml .github/workflows/deploy.yml
   ```

2. 推送代碼觸發部署：
   ```bash
   git add .
   git commit -m "Switch to direct deployment (no Docker)"
   git push origin main
   ```

### 方法 2: 手動部署
```bash
# 在您的本地機器上
tar --exclude='node_modules' --exclude='.git' -czf app.tar.gz .
scp app.tar.gz your_user@your_gcp_host:~/
scp deploy/direct-deploy.sh your_user@your_gcp_host:~/

# SSH 到 VM
ssh your_user@your_gcp_host

# 執行部署
chmod +x direct-deploy.sh
./direct-deploy.sh
```

### 方法 3: Git 直接部署
```bash
# 在 VM 上
cd ~/crypto-exchange-monitor
git pull origin main  # 如果是第一次：git clone https://github.com/Davis1233798/exchange_monitor.git ~/crypto-exchange-monitor
npm ci --production
pm2 restart crypto-monitor
```

## ⚙️ 配置應用程式

### 1. 編輯環境變數
```bash
nano ~/crypto-exchange-monitor/.env
```

設置您的 API 金鑰和 Discord Webhooks：
```env
# Bitget API
API_KEY=your_bitget_api_key
API_SECRET=your_bitget_api_secret
API_PASSPHRASE=your_bitget_passphrase

# Discord Webhooks
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
FUNDING_RATE_WEBHOOK_URL=https://discord.com/api/webhooks/...
POSITION_WEBHOOK_URL=https://discord.com/api/webhooks/...
PRICE_ALERT_WEBHOOK_URL=https://discord.com/api/webhooks/...
SWING_STRATEGY_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 2. 重啟服務使配置生效
```bash
pm2 restart crypto-monitor
```

## 📊 管理應用程式

### 常用命令（VM 上可用的便捷別名）
```bash
monitor-status          # 查看服務狀態
monitor-logs            # 查看即時日誌  
monitor-restart         # 重啟服務
monitor-stop            # 停止服務
monitor-start           # 啟動服務
monitor-config          # 編輯配置檔案
monitor-health          # 健康檢查
monitor-backup          # 備份數據
sysinfo                 # 系統信息
```

### PM2 原生命令
```bash
pm2 list                # 查看所有進程
pm2 logs crypto-monitor # 查看日誌
pm2 monit               # 即時監控介面
pm2 restart crypto-monitor  # 重啟
pm2 stop crypto-monitor     # 停止
pm2 start crypto-monitor    # 啟動
pm2 delete crypto-monitor   # 刪除進程
```

### 查看日誌
```bash
# 即時日誌
pm2 logs crypto-monitor -f

# 查看特定日誌檔案
tail -f ~/logs/app.log      # 應用日誌
tail -f ~/logs/error.log    # 錯誤日誌
tail -f ~/logs/output.log   # 輸出日誌
```

## 🔍 監控和維護

### 檢查系統狀態
```bash
# 快速系統信息
sysinfo

# 詳細進程信息
pm2 monit

# 檢查磁碟使用
df -h

# 檢查記憶體使用
free -h

# 檢查網絡連接
netstat -tulpn | grep node
```

### 自動化監控
系統已設置：
- **健康檢查腳本**: `~/monitor.sh`
- **自動備份腳本**: `~/backup.sh`
- **日誌輪替**: 自動清理舊日誌
- **PM2 自動重啟**: 程式崩潰時自動重啟

### 設置定時任務（可選）
```bash
crontab -e

# 添加以下行
# 每5分鐘健康檢查
*/5 * * * * ~/monitor.sh >> ~/logs/health.log 2>&1

# 每天備份
0 2 * * * ~/backup.sh >> ~/logs/backup.log 2>&1
```

## 🚨 故障排除

### 服務無法啟動
```bash
# 檢查錯誤
pm2 logs crypto-monitor

# 檢查配置
monitor-config

# 手動測試
cd ~/crypto-exchange-monitor
node src/enhancedIndex.js --test
```

### API 連接問題
```bash
# 測試 Bitget API
curl -I https://api.bitget.com

# 測試 Discord Webhook
curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content": "測試連接"}'
```

### 記憶體不足
```bash
# 檢查記憶體使用
free -h

# 重啟服務釋放記憶體
pm2 restart crypto-monitor

# 設置記憶體限制重啟
pm2 start src/enhancedIndex.js --name crypto-monitor --max-memory-restart 1G
```

## 📈 效能優化

### Node.js 優化
```bash
# 設置 Node.js 記憶體限制
export NODE_OPTIONS="--max-old-space-size=1024"

# 在 PM2 中設置
pm2 start src/enhancedIndex.js --name crypto-monitor --node-args="--max-old-space-size=1024"
```

### 系統優化
```bash
# 增加檔案描述符限制（已自動設置）
ulimit -n 65536

# 檢查系統限制
ulimit -a
```

## 🔄 更新應用程式

### 方法 1: Git 更新（推薦）
```bash
cd ~/crypto-exchange-monitor
git pull origin main
npm ci --production
pm2 restart crypto-monitor
```

### 方法 2: 完整重新部署
```bash
# 觸發 GitHub Actions
git commit --allow-empty -m "Redeploy application"
git push origin main
```

## 📋 部署檢查清單

- [ ] VM 已初始化（Node.js + PM2）
- [ ] 應用程式已部署
- [ ] 環境變數已配置（.env 檔案）
- [ ] API 金鑰已設置
- [ ] Discord Webhooks 已配置
- [ ] 測試消息發送成功
- [ ] PM2 服務運行正常
- [ ] 日誌正常輸出
- [ ] 健康檢查通過

## 🎯 簡單！

這樣的部署方式：
- **無 Docker 複雜性**
- **直接 Node.js 運行**
- **PM2 管理進程**
- **自動重啟和監控**
- **簡單的日誌管理**

完全符合專用 VM 的使用場景！
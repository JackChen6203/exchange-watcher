# 服務管理指南

## ⚠️ 重要說明
**此專案已停用PM2，改用直接Node.js運行方式**

## 🚀 啟動服務

### 本地啟動
```bash
npm start
```

### 背景運行 (使用nohup)
```bash
nohup node src/index.js > nohup.out 2>&1 &
```

### 使用啟動腳本
```bash
chmod +x scripts/start-service.sh
./scripts/start-service.sh
```

## 🛑 停止服務

### 使用停止腳本
```bash
chmod +x scripts/stop-service.sh
./scripts/stop-service.sh
```

### 手動停止
```bash
# 找到進程
ps aux | grep node | grep -v grep

# 停止特定進程
pkill -f "node.*crypto-exchange"
pkill -f "node.*src/index.js"
```

## 🔍 檢查服務狀態

### 使用檢查腳本
```bash
chmod +x scripts/remote-service-check.sh
./scripts/remote-service-check.sh
```

### 手動檢查
```bash
# 檢查進程
ps aux | grep node | grep -v grep

# 檢查日誌
tail -f nohup.out
tail -f logs/monitor.log
```

## 💻 遠端管理

### 使用PowerShell腳本 (Windows)
```powershell
.\scripts\check-remote-service.ps1
```

### SSH手動管理
```bash
# 連接遠端
ssh gcp_jkes6204_new

# 檢查服務
ps aux | grep node | grep -v grep

# 查看日誌
tail -f nohup.out

# 重啟服務
pkill -f "node.*crypto-exchange"
nohup node src/index.js > nohup.out 2>&1 &
```

## 📝 常用命令

| 操作 | 命令 |
|------|------|
| 啟動服務 | `npm start` 或 `./scripts/start-service.sh` |
| 停止服務 | `./scripts/stop-service.sh` |
| 檢查狀態 | `ps aux \| grep node \| grep -v grep` |
| 查看日誌 | `tail -f nohup.out` |
| 重啟服務 | 先停止，再啟動 |

## 🔧 故障排除

### 服務無法啟動
1. 檢查 `.env` 文件是否存在並配置正確
2. 檢查依賴是否安裝: `npm install`
3. 檢查日誌: `tail -f nohup.out`

### 服務意外停止
1. 檢查系統資源: `free -h`, `df -h`
2. 檢查錯誤日誌: `tail -f logs/monitor.log`
3. 檢查Discord webhook配置

### 沒有收到通知
1. 確認Discord webhook URL正確
2. 確認API密鑰有效
3. 檢查網路連接到Bitget API
4. 檢查閾值設置是否合理
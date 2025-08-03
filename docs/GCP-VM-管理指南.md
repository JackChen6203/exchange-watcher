# GCP VM 專案管理指南

## 查看服務狀態

### 1. 檢查服務是否運行
```bash
# 查看服務狀態
sudo systemctl status crypto-monitor

# 查看服務是否啟用（開機自啟）
sudo systemctl is-enabled crypto-monitor

# 查看服務是否正在運行
sudo systemctl is-active crypto-monitor
```

### 2. 查看服務日誌
```bash
# 查看最近的日誌
sudo journalctl -u crypto-monitor --lines=50

# 實時查看日誌
sudo journalctl -u crypto-monitor -f

# 查看今天的日誌
sudo journalctl -u crypto-monitor --since today

# 查看特定時間段的日誌
sudo journalctl -u crypto-monitor --since "2025-08-04 10:00:00"
```

### 3. 服務管理命令
```bash
# 啟動服務
sudo systemctl start crypto-monitor

# 停止服務
sudo systemctl stop crypto-monitor

# 重啟服務
sudo systemctl restart crypto-monitor

# 重新載入配置
sudo systemctl reload crypto-monitor

# 啟用開機自啟
sudo systemctl enable crypto-monitor

# 禁用開機自啟
sudo systemctl disable crypto-monitor
```

### 4. 查看專案文件和進程
```bash
# 查看專案目錄
ls -la /home/JackChen6203/crypto-exchange-monitor/

# 查看進程
ps aux | grep node
ps aux | grep crypto-monitor

# 查看端口占用（如果有網路服務）
netstat -tlnp | grep node
ss -tlnp | grep node

# 查看系統資源使用
top -p $(pgrep -f crypto-monitor)
htop -p $(pgrep -f crypto-monitor)
```

### 5. 查看應用日誌
```bash
# 查看應用生成的日誌文件
cd /home/JackChen6203/crypto-exchange-monitor
tail -f logs/monitor.log
tail -f logs/*.log

# 查看所有日誌文件
ls -la logs/
```

## 故障排除

### 如果服務沒有運行：
1. 檢查服務配置文件：`sudo cat /etc/systemd/system/crypto-monitor.service`
2. 檢查Node.js是否安裝：`node --version`
3. 檢查專案文件是否存在：`ls -la /home/JackChen6203/crypto-exchange-monitor/`
4. 檢查環境變數文件：`ls -la /home/JackChen6203/crypto-exchange-monitor/.env`

### 如果服務啟動失敗：
1. 查看詳細錯誤：`sudo journalctl -u crypto-monitor --lines=100`
2. 手動測試運行：`cd /home/JackChen6203/crypto-exchange-monitor && node src/index.js`
3. 檢查文件權限：`ls -la /home/JackChen6203/crypto-exchange-monitor/`

## 快速狀態檢查腳本
```bash
#!/bin/bash
echo "=== Crypto Monitor 狀態檢查 ==="
echo "服務狀態: $(sudo systemctl is-active crypto-monitor)"
echo "開機啟動: $(sudo systemctl is-enabled crypto-monitor)"
echo "進程ID: $(pgrep -f crypto-monitor)"
echo "最後啟動時間:"
sudo systemctl show crypto-monitor --property=ActiveEnterTimestamp
echo "最近錯誤:"
sudo journalctl -u crypto-monitor --lines=3 --no-pager
```

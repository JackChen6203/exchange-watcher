# 部署指南

## 部署架構

本專案使用 **systemd** 服務管理，不使用 PM2。

## 自動部署

### GitHub Actions
推送到 `main` 分支會自動觸發部署：
```bash
git push origin main
```

### 部署流程
1. 運行測試
2. 複製檔案到 GCP VM
3. 執行部署腳本
4. 健康檢查

## 手動部署

### 1. 準備部署包
```bash
# 在本地專案目錄
tar -czf app.tar.gz --exclude='node_modules' --exclude='.git' .
scp app.tar.gz user@your-server:~/
scp deploy/direct-deploy.sh user@your-server:~/
```

### 2. 執行部署
```bash
ssh user@your-server
tar -xzf app.tar.gz
chmod +x direct-deploy.sh
./direct-deploy.sh
```

## 服務管理

### systemd 命令
```bash
# 查看服務狀態
sudo systemctl status crypto-monitor

# 啟動服務
sudo systemctl start crypto-monitor

# 停止服務
sudo systemctl stop crypto-monitor

# 重啟服務
sudo systemctl restart crypto-monitor

# 查看日誌
sudo journalctl -u crypto-monitor -f

# 查看最近 50 行日誌
sudo journalctl -u crypto-monitor -n 50
```

### 服務檔案位置
- 服務檔案：`/etc/systemd/system/crypto-monitor.service`
- 應用目錄：`/home/$USER/crypto-exchange-monitor/`
- 日誌目錄：`/home/$USER/logs/`
- 數據目錄：`/home/$USER/data/`

## 環境變數配置

### 編輯配置檔案
```bash
nano /home/$USER/crypto-exchange-monitor/.env
```

### 重啟服務使配置生效
```bash
sudo systemctl restart crypto-monitor
```

## 故障排除

### 檢查服務狀態
```bash
sudo systemctl status crypto-monitor
```

### 查看詳細日誌
```bash
sudo journalctl -u crypto-monitor -f --since "10 minutes ago"
```

### 檢查應用程式日誌
```bash
tail -f /home/$USER/logs/app.log
tail -f /home/$USER/logs/error.log
```

### 重新部署
```bash
# 如果需要重新部署
sudo systemctl stop crypto-monitor
rm -rf /home/$USER/crypto-exchange-monitor
# 然後重新執行部署腳本
./direct-deploy.sh
```

## 備份與恢復

### 備份重要數據
```bash
# 備份配置和數據
tar -czf backup_$(date +%Y%m%d).tar.gz \
  /home/$USER/crypto-exchange-monitor/.env \
  /home/$USER/data/ \
  /home/$USER/logs/
```

### 恢復數據
```bash
# 恢復備份
tar -xzf backup_YYYYMMDD.tar.gz -C /
sudo systemctl restart crypto-monitor
```

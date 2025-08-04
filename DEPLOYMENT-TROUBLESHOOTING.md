# 🔧 部署故障排除指南

## 🚨 當前問題解決方案

### 問題：Docker 未安裝錯誤

**錯誤訊息：**
```
-bash: line 2: docker: command not found
[ERROR] Docker 未安裝，請先安裝 Docker
```

**根本原因：** GCP Ubuntu 25.04 服務器上沒有安裝 Docker

### ✅ 立即解決方案

#### 方案 1：自動化修復（推薦）
GitHub Actions 已經更新，會自動檢測並安裝 Docker：

1. **重新觸發部署**：
   ```bash
   git commit --allow-empty -m "Trigger deployment with Docker auto-install"
   git push origin main
   ```

2. **檢查部署狀態**：
   - 查看 GitHub Actions 日誌
   - 部署會自動安裝 Docker 並繼續

#### 方案 2：手動安裝 Docker
如果需要手動修復，SSH 到服務器：

```bash
# SSH 到服務器
ssh your_user@your_gcp_host

# 使用快速安裝腳本
curl -fsSL https://get.docker.com | sudo sh

# 啟動 Docker 服務
sudo systemctl start docker
sudo systemctl enable docker

# 添加用戶到 docker 組
sudo usermod -aG docker $USER

# 重新登錄使權限生效
exit
ssh your_user@your_gcp_host

# 測試 Docker
docker --version
docker run --rm hello-world
```

#### 方案 3：使用項目提供的安裝腳本
```bash
# 在服務器上運行
chmod +x install-docker.sh
./install-docker.sh
```

## 📋 完整故障排除檢查表

### 1. 環境檢查

**檢查操作系統：**
```bash
lsb_release -a
uname -a
```

**檢查 Docker 狀態：**
```bash
# 檢查是否安裝
command -v docker

# 檢查服務狀態
sudo systemctl status docker

# 檢查版本
docker --version
docker-compose --version
```

**檢查權限：**
```bash
# 檢查用戶組
groups $USER

# 測試 Docker 權限
docker ps
```

### 2. 網絡檢查

**檢查連接性：**
```bash
# 檢查 Docker Hub 連接
curl -I https://registry-1.docker.io/

# 檢查 Bitget API 連接
curl -I https://api.bitget.com

# 檢查 Discord Webhook（替換為您的 URL）
curl -X POST "YOUR_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"content": "連接測試"}'
```

### 3. 容器檢查

**檢查容器狀態：**
```bash
# 查看運行中的容器
docker ps

# 查看所有容器
docker ps -a

# 檢查特定容器
docker logs crypto-exchange-monitor --tail 50

# 檢查容器資源使用
docker stats crypto-exchange-monitor --no-stream
```

### 4. 文件和目錄檢查

**檢查目錄結構：**
```bash
# 檢查數據目錄
ls -la ~/exchange-monitor-data/

# 檢查日誌目錄
ls -la ~/exchange-monitor-logs/

# 檢查權限
stat ~/exchange-monitor-data/
stat ~/exchange-monitor-logs/
```

## 🐛 常見錯誤及解決方案

### 錯誤 1：Docker 命令權限不足
```
Got permission denied while trying to connect to the Docker daemon socket
```

**解決方案：**
```bash
# 添加用戶到 docker 組
sudo usermod -aG docker $USER

# 重新登錄或運行
newgrp docker

# 或者臨時使用 sudo
sudo docker ps
```

### 錯誤 2：容器無法啟動
```
Container exited with code 1
```

**解決方案：**
```bash
# 檢查詳細日誌
docker logs crypto-exchange-monitor

# 檢查映像是否正確
docker images | grep crypto-exchange-monitor

# 嘗試交互式運行
docker run -it crypto-exchange-monitor:latest /bin/sh
```

### 錯誤 3：端口衝突
```
Port already in use
```

**解決方案：**
```bash
# 檢查端口使用
sudo netstat -tulpn | grep :3000

# 停止衝突的服務
sudo docker stop $(docker ps -q --filter "publish=3000")

# 或使用不同端口
docker run -p 3001:3000 crypto-exchange-monitor:latest
```

### 錯誤 4：映像載入失敗
```
Error loading image
```

**解決方案：**
```bash
# 檢查映像文件
ls -la crypto-exchange-monitor.tar.gz

# 手動載入
gunzip -c crypto-exchange-monitor.tar.gz | docker load

# 檢查載入的映像
docker images
```

### 錯誤 5：API 連接失敗
```
API connection failed
```

**解決方案：**
```bash
# 檢查環境變數
docker exec crypto-exchange-monitor env | grep API

# 測試 API 連接
curl -H "Content-Type: application/json" https://api.bitget.com/api/v2/public/time

# 檢查配置文件
docker exec crypto-exchange-monitor cat /app/.env
```

## 🔄 重新部署步驟

### 完全重新部署
```bash
# 1. 停止並移除現有容器
docker stop crypto-exchange-monitor
docker rm crypto-exchange-monitor

# 2. 移除舊映像
docker rmi crypto-exchange-monitor:latest

# 3. 重新載入映像
gunzip -c crypto-exchange-monitor.tar.gz | docker load

# 4. 重新啟動
./deploy.sh
```

### 快速重啟
```bash
# 重啟容器
docker restart crypto-exchange-monitor

# 或重新創建容器
docker-compose down
docker-compose up -d
```

## 📊 監控和維護

### 設置監控腳本
```bash
#!/bin/bash
# monitor.sh - 容器健康監控

CONTAINER_NAME="crypto-exchange-monitor"

if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "$(date): 容器未運行，嘗試重啟..."
    docker start $CONTAINER_NAME
    
    # 等待 30 秒後再次檢查
    sleep 30
    if ! docker ps | grep -q $CONTAINER_NAME; then
        echo "$(date): 重啟失敗，需要人工介入"
        exit 1
    fi
fi

echo "$(date): 容器運行正常"
```

### 定期清理腳本
```bash
#!/bin/bash
# cleanup.sh - 清理腳本

# 清理未使用的映像
docker image prune -f

# 清理未使用的容器
docker container prune -f

# 清理未使用的網絡
docker network prune -f

# 清理未使用的卷
docker volume prune -f

echo "Docker 清理完成"
```

## 📞 獲取幫助

### 收集診斷信息
```bash
#!/bin/bash
# collect-info.sh - 收集診斷信息

echo "=== 系統信息 ==="
uname -a
lsb_release -a

echo "=== Docker 信息 ==="
docker --version
docker info

echo "=== 容器狀態 ==="
docker ps -a

echo "=== 容器日誌 ==="
docker logs crypto-exchange-monitor --tail 100

echo "=== 網絡狀態 ==="
netstat -tulpn | grep docker

echo "=== 磁碟使用 ==="
df -h
docker system df

echo "=== 診斷信息收集完成 ==="
```

### 聯繫支援時提供：
1. 運行 `collect-info.sh` 的輸出
2. GitHub Actions 的錯誤日誌
3. 具體的錯誤訊息
4. 嘗試過的解決步驟

## 🎯 預防措施

### 1. 定期備份
```bash
# 備份容器數據
docker exec crypto-exchange-monitor tar czf - /app/data | cat > backup_$(date +%Y%m%d).tar.gz

# 備份映像
docker save crypto-exchange-monitor:latest | gzip > image_backup_$(date +%Y%m%d).tar.gz
```

### 2. 設置監控
```bash
# 添加到 crontab
crontab -e

# 每5分鐘檢查容器狀態
*/5 * * * * /path/to/monitor.sh >> /var/log/container-monitor.log 2>&1

# 每天清理日誌
0 2 * * * /path/to/cleanup.sh >> /var/log/cleanup.log 2>&1
```

### 3. 更新策略
- 定期更新 Docker 和 Docker Compose
- 監控應用程式更新
- 測試部署腳本的變更

---

這個故障排除指南應該能解決您遇到的部署問題。如果問題仍然存在，請提供詳細的錯誤日誌以便進一步診斷。
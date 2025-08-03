# 🚀 CI/CD 部署指南

這個文檔說明如何設置和使用本專案的 CI/CD 流程，讓你的應用在每次 git 變動時自動部署到 GCP 主機。

## 📋 前置要求

### 1. GCP 主機準備
確保你的 GCP 主機已經安裝以下軟體：

```bash
# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安裝 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. SSH 金鑰設置
在本地生成 SSH 金鑰對：

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

將公鑰添加到 GCP 主機：

```bash
ssh-copy-id username@your-gcp-server-ip
```

## 🔧 GitHub 設置

### 1. 在 GitHub 儲存庫中設置以下 Secrets：

進入你的 GitHub 儲存庫 → Settings → Secrets and variables → Actions

添加以下 secrets：

| Secret 名稱 | 說明 | 範例 |
|------------|------|-----|
| `GCP_HOST` | GCP 主機 IP 地址 | `35.123.45.67` |
| `GCP_USER` | GCP 主機用戶名 | `ubuntu` |
| `GCP_SSH_PRIVATE_KEY` | SSH 私鑰內容 | 複製 `~/.ssh/id_rsa` 的完整內容 |

### 2. 設置環境變數檔案

在 GCP 主機上創建 `.env` 檔案：

```bash
cd ~
cp .env.template .env
nano .env
```

填入實際的 API 金鑰和配置值。

## 🔄 CI/CD 流程說明

### 自動觸發條件
- 推送到 `main` 分支
- 推送到 `fix-errors` 分支
- 對 `main` 分支的 Pull Request

### 流程步驟

1. **測試階段** (Test Job)
   - 安裝依賴
   - 運行測試（如果有）
   - 運行 lint 檢查（如果有）

2. **構建階段** (Build Job)
   - 構建 Docker 映像
   - 標記映像版本
   - 將映像保存為 artifact

3. **部署階段** (Deploy Job)
   - 下載構建的映像
   - 透過 SSH 連接到 GCP 主機
   - 傳輸檔案到伺服器
   - 執行部署腳本
   - 進行健康檢查

## 📦 本地部署測試

在推送到 GitHub 之前，你可以在本地測試部署流程：

```bash
# 構建 Docker 映像
docker build -t crypto-exchange-monitor:latest .

# 使用 Docker Compose 啟動
cd deploy
docker-compose up -d

# 檢查運行狀態
docker ps
docker logs crypto-exchange-monitor

# 停止服務
docker-compose down
```

## 🔍 監控和日誌

### 查看應用日誌
```bash
# 實時查看日誌
docker logs crypto-exchange-monitor -f

# 查看最近 100 行日誌
docker logs crypto-exchange-monitor --tail 100
```

### 檢查容器狀態
```bash
# 查看運行中的容器
docker ps

# 查看容器資源使用情況
docker stats crypto-exchange-monitor
```

### 進入容器進行偵錯
```bash
docker exec -it crypto-exchange-monitor /bin/sh
```

## 🛠️ 故障排除

### 常見問題

1. **SSH 連接失敗**
   - 檢查 GCP 主機防火牆設置
   - 確認 SSH 金鑰格式正確
   - 檢查 GCP_HOST 和 GCP_USER 是否正確

2. **Docker 映像構建失敗**
   - 檢查 Dockerfile 語法
   - 確認所有依賴都在 package.json 中
   - 查看 GitHub Actions 構建日誌

3. **應用啟動失敗**
   - 檢查 .env 檔案配置
   - 查看容器日誌排查錯誤
   - 確認所有必要的目錄存在

4. **健康檢查失敗**
   - 檢查應用是否正常啟動
   - 確認健康檢查 URL 可訪問
   - 增加健康檢查的超時時間

### 手動部署

如果 CI/CD 失敗，可以手動部署：

```bash
# 連接到 GCP 主機
ssh username@your-gcp-server-ip

# 拉取最新代碼
git pull origin main

# 重新構建並啟動
docker build -t crypto-exchange-monitor:latest .
./deploy.sh
```

## 📊 效能優化建議

1. **資源限制**
   - 根據實際使用情況調整 Docker Compose 中的記憶體限制
   - 監控 CPU 和記憶體使用情況

2. **日誌管理**
   - 定期清理過大的日誌檔案
   - 使用日誌輪轉防止磁碟空間不足

3. **網路優化**
   - 使用 CDN 加速靜態資源
   - 啟用 gzip 壓縮

## 🔐 安全考量

1. **秘密管理**
   - 永遠不要將 API 金鑰提交到 git
   - 定期更換 SSH 金鑰
   - 使用強密碼和雙因素驗證

2. **網路安全**
   - 限制 SSH 訪問的 IP 範圍
   - 使用防火牆保護不必要的端口
   - 定期更新系統和 Docker

## 📞 支援

如果遇到問題，請：

1. 檢查 GitHub Actions 日誌
2. 查看應用容器日誌
3. 確認所有配置正確
4. 檢查網路連接和防火牆設置

---

**祝你部署順利！** 🎉
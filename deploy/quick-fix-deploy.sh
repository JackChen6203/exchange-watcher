#!/bin/bash

# 快速修復部署腳本 - 專門解決 Docker 未安裝問題
# 用於 GCP Ubuntu 25.04 主機

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "🔧 開始快速修復部署問題"

# 1. 檢查系統信息
log_info "📋 系統信息："
uname -a
lsb_release -a 2>/dev/null || cat /etc/os-release

# 2. 安裝 Docker (使用官方安裝腳本，最快速)
log_info "🐳 安裝 Docker..."
if ! command -v docker &> /dev/null; then
    # 更新系統
    sudo apt-get update
    
    # 使用官方一鍵安裝腳本
    curl -fsSL https://get.docker.com | sudo sh
    
    # 啟動 Docker 服務
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # 添加用戶到 docker 組
    sudo usermod -aG docker $USER
    
    log_success "Docker 安裝完成"
else
    log_success "Docker 已安裝"
fi

# 3. 測試 Docker
log_info "🧪 測試 Docker..."
if sudo docker run --rm hello-world; then
    log_success "Docker 測試通過"
else
    log_error "Docker 測試失敗"
    exit 1
fi

# 4. 檢查並載入 Docker 映像
log_info "📦 處理 Docker 映像..."
if [ -f "crypto-exchange-monitor.tar.gz" ]; then
    log_info "載入 Docker 映像..."
    gunzip -c crypto-exchange-monitor.tar.gz | sudo docker load
    log_success "映像載入完成"
else
    log_warning "找不到映像文件，嘗試從 Docker Hub 拉取..."
    # 如果有公開映像，可以從這裡拉取
    # sudo docker pull crypto-exchange-monitor:latest
fi

# 5. 創建必要目錄
log_info "📁 創建數據目錄..."
mkdir -p ~/exchange-monitor-data ~/exchange-monitor-logs
chmod 755 ~/exchange-monitor-data ~/exchange-monitor-logs

# 6. 停止現有容器 (如果存在)
log_info "🛑 清理現有容器..."
sudo docker stop crypto-exchange-monitor 2>/dev/null || true
sudo docker rm crypto-exchange-monitor 2>/dev/null || true

# 7. 啟動新容器
log_info "🚀 啟動應用容器..."

# 檢查是否有 docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    # 使用 Docker Compose
    if command -v docker-compose &> /dev/null; then
        sudo docker-compose up -d
    else
        sudo docker compose up -d
    fi
else
    # 直接使用 Docker 運行
    sudo docker run -d \
        --name crypto-exchange-monitor \
        --restart unless-stopped \
        -v ~/exchange-monitor-data:/app/data \
        -v ~/exchange-monitor-logs:/app/logs \
        -e NODE_ENV=production \
        crypto-exchange-monitor:latest
fi

# 8. 健康檢查
log_info "🔍 健康檢查..."
sleep 10

if sudo docker ps | grep -q crypto-exchange-monitor; then
    log_success "✅ 容器運行正常"
    
    # 顯示日誌
    log_info "📋 應用日誌："
    sudo docker logs crypto-exchange-monitor --tail 20
    
    # 顯示狀態
    log_info "📊 容器狀態："
    sudo docker ps | grep crypto-exchange-monitor
    
else
    log_error "❌ 容器啟動失敗"
    log_info "錯誤日誌："
    sudo docker logs crypto-exchange-monitor --tail 50 2>/dev/null || echo "無法獲取日誌"
    exit 1
fi

# 9. 清理
log_info "🧹 清理臨時文件..."
rm -f crypto-exchange-monitor.tar.gz

log_success "🎉 快速修復部署完成！"
echo "========================================"
echo "容器名稱: crypto-exchange-monitor"
echo "數據目錄: ~/exchange-monitor-data"
echo "日誌目錄: ~/exchange-monitor-logs"
echo "========================================"
echo "管理命令："
echo "  查看日誌: sudo docker logs crypto-exchange-monitor -f"
echo "  重啟容器: sudo docker restart crypto-exchange-monitor"
echo "  停止容器: sudo docker stop crypto-exchange-monitor"
echo "========================================"

log_warning "⚠️ 注意：如需無 sudo 使用 Docker，請重新登錄或運行 'newgrp docker'"
#!/bin/bash

# Docker 自動安裝腳本 - Ubuntu 25.04 / 24.04 / 22.04
# 用於 GCP 主機自動安裝 Docker

set -e  # 遇到錯誤立即退出

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日誌函數
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_info "🐳 開始安裝 Docker 和 Docker Compose"

# 檢查是否已安裝 Docker
if command -v docker &> /dev/null; then
    log_success "Docker 已安裝，版本: $(docker --version)"
    
    # 檢查 Docker 服務狀態
    if systemctl is-active --quiet docker; then
        log_success "Docker 服務運行正常"
    else
        log_warning "Docker 服務未運行，嘗試啟動..."
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
else
    log_info "安裝 Docker..."
    
    # 更新包索引
    log_info "更新系統包索引"
    sudo apt-get update
    
    # 安裝必要的包
    log_info "安裝必要的依賴包"
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        apt-transport-https \
        software-properties-common
    
    # 添加 Docker 官方 GPG 密鑰
    log_info "添加 Docker GPG 密鑰"
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    # 設置 Docker 軟件源
    log_info "設置 Docker 軟件源"
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # 更新包索引
    sudo apt-get update
    
    # 安裝 Docker Engine
    log_info "安裝 Docker Engine"
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # 啟動 Docker 服務
    log_info "啟動 Docker 服務"
    sudo systemctl start docker
    sudo systemctl enable docker
    
    log_success "Docker 安裝完成"
fi

# 檢查 Docker Compose
if command -v docker-compose &> /dev/null; then
    log_success "Docker Compose 已安裝，版本: $(docker-compose --version)"
elif docker compose version &> /dev/null; then
    log_success "Docker Compose Plugin 已安裝，版本: $(docker compose version)"
else
    log_info "安裝 Docker Compose"
    
    # 獲取最新版本號
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    
    # 下載 Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    
    # 設置執行權限
    sudo chmod +x /usr/local/bin/docker-compose
    
    # 創建符號鏈接
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    log_success "Docker Compose 安裝完成，版本: $(docker-compose --version)"
fi

# 將當前用戶添加到 docker 組（避免需要 sudo）
log_info "配置用戶權限"
sudo usermod -aG docker $USER

# 測試 Docker 安裝
log_info "測試 Docker 安裝"
if sudo docker run --rm hello-world > /dev/null 2>&1; then
    log_success "✅ Docker 安裝測試通過"
else
    log_error "❌ Docker 安裝測試失敗"
    exit 1
fi

# 顯示版本信息
log_success "🎉 Docker 環境安裝完成！"
echo "========================================"
echo "Docker 版本: $(docker --version)"
if command -v docker-compose &> /dev/null; then
    echo "Docker Compose 版本: $(docker-compose --version)"
elif docker compose version &> /dev/null; then
    echo "Docker Compose Plugin 版本: $(docker compose version)"
fi
echo "========================================"

log_warning "⚠️ 注意：請重新登錄或運行 'newgrp docker' 以使用戶組變更生效"
log_info "現在可以運行 ./deploy.sh 進行部署"
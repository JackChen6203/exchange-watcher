#!/bin/bash

# 部署腳本 - 加密貨幣交易所監控系統
# 用於 GCP 主機自動部署

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

# 配置變數
APP_NAME="crypto-exchange-monitor"
CONTAINER_NAME="crypto-exchange-monitor"
NETWORK_NAME="exchange-monitor-network"
DATA_DIR="$HOME/exchange-monitor-data"
LOG_DIR="$HOME/exchange-monitor-logs"

log_info "🚀 開始部署 $APP_NAME"

# 檢查 Docker 是否安裝
if ! command -v docker &> /dev/null; then
    log_error "Docker 未安裝，請先安裝 Docker"
    exit 1
fi

# 檢查 Docker Compose 是否安裝
if ! command -v docker-compose &> /dev/null; then
    log_warning "Docker Compose 未安裝，嘗試使用 docker compose"
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

# 創建必要的目錄
log_info "📁 創建數據目錄"
mkdir -p "$DATA_DIR" "$LOG_DIR"

# 停止現有容器
log_info "🛑 停止現有服務"
if docker ps -q --filter "name=$CONTAINER_NAME" | grep -q .; then
    docker stop "$CONTAINER_NAME" || true
    log_success "已停止現有容器"
fi

# 移除現有容器
if docker ps -aq --filter "name=$CONTAINER_NAME" | grep -q .; then
    docker rm "$CONTAINER_NAME" || true
    log_success "已移除現有容器"
fi

# 清理未使用的映像（保留最新的幾個版本）
log_info "🧹 清理舊的 Docker 映像"
docker image prune -f || true

# 檢查 Docker 網路
if ! docker network ls | grep -q "$NETWORK_NAME"; then
    log_info "🌐 創建 Docker 網路"
    docker network create "$NETWORK_NAME" || true
fi

# 啟動新服務
log_info "🔄 啟動新服務"
if [ -f "docker-compose.yml" ]; then
    # 使用 Docker Compose
    $DOCKER_COMPOSE_CMD up -d
else
    # 直接使用 Docker
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network "$NETWORK_NAME" \
        --restart unless-stopped \
        -v "$DATA_DIR:/app/data" \
        -v "$LOG_DIR:/app/logs" \
        -e NODE_ENV=production \
        "$APP_NAME:latest"
fi

# 等待服務啟動
log_info "⏳ 等待服務啟動"
sleep 10

# 健康檢查
log_info "🔍 執行健康檢查"
if docker ps | grep -q "$CONTAINER_NAME"; then
    log_success "✅ 容器運行正常"
    
    # 檢查日誌是否有錯誤
    log_info "📋 檢查應用程式日誌"
    docker logs "$CONTAINER_NAME" --tail 20
    
    # 檢查容器資源使用情況
    log_info "📊 容器資源使用情況"
    docker stats "$CONTAINER_NAME" --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
    
else
    log_error "❌ 容器啟動失敗"
    docker logs "$CONTAINER_NAME" --tail 50
    exit 1
fi

# 顯示部署資訊
log_success "🎉 部署完成！"
echo "========================================"
echo "應用程式名稱: $APP_NAME"
echo "容器名稱: $CONTAINER_NAME"
echo "數據目錄: $DATA_DIR"
echo "日誌目錄: $LOG_DIR"
echo "========================================"

# 顯示管理命令
log_info "📚 常用管理命令:"
echo "查看日誌: docker logs $CONTAINER_NAME -f"
echo "重啟服務: docker restart $CONTAINER_NAME"
echo "停止服務: docker stop $CONTAINER_NAME"
echo "進入容器: docker exec -it $CONTAINER_NAME /bin/sh"

log_success "🚀 部署成功完成！"
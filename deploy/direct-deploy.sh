#!/bin/bash

# 直接部署腳本 - 不使用 Docker
# 專門為單一用途 VM 設計

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

# 配置變數
APP_NAME="crypto-exchange-monitor"
APP_DIR="/home/$USER/crypto-exchange-monitor"
SERVICE_NAME="crypto-monitor"
LOG_DIR="/home/$USER/logs"
DATA_DIR="/home/$USER/data"

log_info "🚀 開始直接部署 $APP_NAME"

# 檢查並安裝 Node.js
check_nodejs() {
    if ! command -v node &> /dev/null; then
        log_warning "Node.js 未安裝，正在安裝..."
        
        # 安裝 Node.js 18 LTS
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        
        log_success "Node.js 安裝完成: $(node --version)"
    else
        log_success "Node.js 已安裝: $(node --version)"
    fi

    # 檢查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未找到，請重新安裝 Node.js"
        exit 1
    fi
}

# 檢查並安裝 PM2
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2 未安裝，正在安裝..."
        sudo npm install -g pm2
        log_success "PM2 安裝完成"
    else
        log_success "PM2 已安裝: $(pm2 --version)"
    fi
}

# 創建必要目錄
create_directories() {
    log_info "📁 創建必要目錄"
    mkdir -p "$APP_DIR" "$LOG_DIR" "$DATA_DIR"
    log_success "目錄創建完成"
}

# 部署應用程式
deploy_app() {
    log_info "📦 部署應用程式"
    
    # 如果已存在，先備份
    if [ -d "$APP_DIR" ]; then
        log_info "備份現有版本"
        sudo mv "$APP_DIR" "${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
    fi
    
    # 創建應用目錄
    mkdir -p "$APP_DIR"
    
    # 複製所有檔案 (假設當前目錄有應用檔案)
    if [ -f "package.json" ]; then
        log_info "從當前目錄複製檔案"
        cp -r . "$APP_DIR/"
    else
        log_error "找不到 package.json，請確保在正確的目錄執行"
        exit 1
    fi
    
    cd "$APP_DIR"
    
    # 安裝依賴
    log_info "📥 安裝依賴"
    npm ci --production
    
    log_success "應用程式部署完成"
}

# 配置環境變數
setup_environment() {
    log_info "⚙️ 配置環境變數"
    
    if [ ! -f "$APP_DIR/.env" ]; then
        if [ -f "$APP_DIR/.env.example" ]; then
            cp "$APP_DIR/.env.example" "$APP_DIR/.env"
            log_warning "已複製 .env.example 到 .env，請編輯配置檔案"
        else
            log_error "找不到 .env.example 檔案"
        fi
    else
        log_success "環境變數檔案已存在"
    fi
}

# 配置 PM2
setup_pm2() {
    log_info "🔧 配置 PM2"
    
    cd "$APP_DIR"
    
    # 停止現有進程
    pm2 stop "$SERVICE_NAME" 2>/dev/null || true
    pm2 delete "$SERVICE_NAME" 2>/dev/null || true
    
    # 啟動增強版本
    pm2 start src/enhancedIndex.js --name "$SERVICE_NAME" \
        --log "$LOG_DIR/app.log" \
        --error "$LOG_DIR/error.log" \
        --out "$LOG_DIR/output.log" \
        --time \
        --max-memory-restart 1G \
        --restart-delay 10000
    
    # 保存 PM2 配置
    pm2 save
    
    # 設置開機自啟
    pm2 startup | tail -1 | sudo bash || true
    
    log_success "PM2 配置完成"
}

# 健康檢查
health_check() {
    log_info "🔍 執行健康檢查"
    
    sleep 10
    
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        log_success "✅ 應用程式運行正常"
        
        # 顯示狀態
        pm2 list
        
        # 顯示最近日誌
        log_info "📋 最近日誌:"
        pm2 logs "$SERVICE_NAME" --lines 20 --nostream
        
    else
        log_error "❌ 應用程式啟動失敗"
        pm2 logs "$SERVICE_NAME" --lines 50 --nostream
        exit 1
    fi
}

# 主要執行流程
main() {
    log_info "🎯 專用 VM 直接部署模式"
    
    check_nodejs
    check_pm2
    create_directories
    deploy_app
    setup_environment
    setup_pm2
    health_check
    
    log_success "🎉 部署完成！"
    echo "========================================"
    echo "應用程式目錄: $APP_DIR"
    echo "日誌目錄: $LOG_DIR"
    echo "數據目錄: $DATA_DIR"
    echo "服務名稱: $SERVICE_NAME"
    echo "========================================"
    echo "管理命令："
    echo "  查看狀態: pm2 list"
    echo "  查看日誌: pm2 logs $SERVICE_NAME"
    echo "  重啟服務: pm2 restart $SERVICE_NAME"
    echo "  停止服務: pm2 stop $SERVICE_NAME"
    echo "  監控介面: pm2 monit"
    echo "========================================"
    
    log_info "💡 提示："
    echo "  1. 請編輯 $APP_DIR/.env 配置檔案"
    echo "  2. 配置完成後執行: pm2 restart $SERVICE_NAME"
    echo "  3. 查看即時日誌: pm2 logs $SERVICE_NAME -f"
}

# 執行主函數
main "$@"
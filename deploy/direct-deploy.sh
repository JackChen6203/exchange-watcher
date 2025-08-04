#!/bin/bash

# 直接部署腳本 - 使用 systemd 服務管理
# 專門為單一用途 VM 設計，不使用 PM2

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
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

log_info "🚀 開始直接部署 $APP_NAME (使用 systemd)"

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

# 創建必要目錄
create_directories() {
    log_info "📁 創建必要目錄"
    mkdir -p "$APP_DIR" "$LOG_DIR" "$DATA_DIR"
    log_success "目錄創建完成"
}

# 停止現有服務
stop_service() {
    log_info "🛑 停止現有服務"
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        sudo systemctl stop "$SERVICE_NAME"
        log_success "服務已停止"
    else
        log_info "服務未運行"
    fi
}

# 部署應用程式
deploy_app() {
    log_info "📦 部署應用程式"
    
    # 如果已存在，先備份（只保留最近3個備份）
    if [ -d "$APP_DIR" ]; then
        log_info "備份現有版本"
        backup_name="${APP_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
        sudo mv "$APP_DIR" "$backup_name" 2>/dev/null || true
        
        # 清理舊備份，只保留最近3個
        log_info "清理舊備份（保留最近3個）"
        ls -dt ${APP_DIR}_backup_* 2>/dev/null | tail -n +4 | xargs -r sudo rm -rf
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
    
    # 設定目錄權限
    chown -R $USER:$USER "$APP_DIR"
    
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

# 創建 systemd 服務
create_systemd_service() {
    log_info "🔧 創建 systemd 服務"
    
    sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Crypto Exchange Monitor
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=append:$LOG_DIR/app.log
StandardError=append:$LOG_DIR/error.log

[Install]
WantedBy=multi-user.target
EOF
    
    # 重新載入 systemd
    sudo systemctl daemon-reload
    
    # 啟用服務（開機自啟）
    sudo systemctl enable "$SERVICE_NAME"
    
    log_success "systemd 服務創建完成"
}

# 啟動服務
start_service() {
    log_info "🚀 啟動服務"
    
    sudo systemctl start "$SERVICE_NAME"
    
    log_success "服務啟動完成"
}

# 健康檢查
health_check() {
    log_info "🔍 執行健康檢查"
    
    sleep 10
    
    if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
        log_success "✅ 應用程式運行正常"
        
        # 顯示狀態
        sudo systemctl status "$SERVICE_NAME" --no-pager -l
        
        # 顯示最近日誌
        log_info "📋 最近日誌:"
        sudo journalctl -u "$SERVICE_NAME" -n 20 --no-pager
        
    else
        log_error "❌ 應用程式啟動失敗"
        sudo journalctl -u "$SERVICE_NAME" -n 50 --no-pager
        exit 1
    fi
}

# 主要執行流程
main() {
    log_info "🎯 專用 VM 直接部署模式 (systemd)"
    
    check_nodejs
    create_directories
    stop_service
    deploy_app
    setup_environment
    create_systemd_service
    start_service
    health_check
    
    log_success "🎉 部署完成！"
    echo "========================================"
    echo "應用程式目錄: $APP_DIR"
    echo "日誌目錄: $LOG_DIR"
    echo "數據目錄: $DATA_DIR"
    echo "服務名稱: $SERVICE_NAME"
    echo "========================================"
    echo "管理命令："
    echo "  查看狀態: sudo systemctl status $SERVICE_NAME"
    echo "  查看日誌: sudo journalctl -u $SERVICE_NAME -f"
    echo "  重啟服務: sudo systemctl restart $SERVICE_NAME"
    echo "  停止服務: sudo systemctl stop $SERVICE_NAME"
    echo "  啟動服務: sudo systemctl start $SERVICE_NAME"
    echo "========================================"
    
    log_info "💡 提示："
    echo "  1. 請編輯 $APP_DIR/.env 配置檔案"
    echo "  2. 配置完成後執行: sudo systemctl restart $SERVICE_NAME"
    echo "  3. 查看即時日誌: sudo journalctl -u $SERVICE_NAME -f"
}

# 執行主函數
main "$@"
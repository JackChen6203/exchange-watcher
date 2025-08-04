#!/bin/bash

# VM 初始化腳本 - 專用於加密貨幣監控程式
# 僅安裝必要的組件：Node.js + PM2

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

log_info "🔧 初始化 VM 環境 - 專用於加密貨幣監控"

# 更新系統
log_info "📦 更新系統套件"
sudo apt-get update
sudo apt-get upgrade -y

# 安裝基本工具
log_info "🛠️ 安裝基本工具"
sudo apt-get install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nano \
    build-essential

# 安裝 Node.js 18 LTS
log_info "📦 安裝 Node.js 18 LTS"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 驗證 Node.js 安裝
log_success "Node.js 版本: $(node --version)"
log_success "npm 版本: $(npm --version)"

# 安裝 PM2
log_info "🔧 安裝 PM2 進程管理器"
sudo npm install -g pm2

# 驗證 PM2 安裝
log_success "PM2 版本: $(pm2 --version)"

# 創建應用目錄結構
log_info "📁 創建目錄結構"
mkdir -p ~/crypto-exchange-monitor
mkdir -p ~/logs
mkdir -p ~/data
mkdir -p ~/backups

# 設置權限
chmod 755 ~/crypto-exchange-monitor ~/logs ~/data ~/backups

# 創建基本配置檔案
log_info "⚙️ 創建基本配置"

# 創建 logrotate 配置
sudo tee /etc/logrotate.d/crypto-monitor > /dev/null << 'EOF'
/home/*/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    copytruncate
    su root root
}
EOF

# 創建監控腳本
tee ~/monitor.sh > /dev/null << 'EOF'
#!/bin/bash
# 簡單的健康監控腳本

SERVICE_NAME="crypto-monitor"

if ! pm2 describe $SERVICE_NAME > /dev/null 2>&1; then
    echo "$(date): 服務不存在"
    exit 1
fi

if pm2 list | grep -q "$SERVICE_NAME.*online"; then
    echo "$(date): 服務運行正常"
else
    echo "$(date): 服務異常，嘗試重啟"
    pm2 restart $SERVICE_NAME
    sleep 10
    
    if pm2 list | grep -q "$SERVICE_NAME.*online"; then
        echo "$(date): 重啟成功"
    else
        echo "$(date): 重啟失敗，需要人工檢查"
        exit 1
    fi
fi
EOF

chmod +x ~/monitor.sh

# 創建備份腳本
tee ~/backup.sh > /dev/null << 'EOF'
#!/bin/bash
# 簡單的備份腳本

BACKUP_DIR=~/backups
DATE=$(date +%Y%m%d_%H%M%S)

# 備份數據
if [ -d ~/data ]; then
    tar -czf "$BACKUP_DIR/data_$DATE.tar.gz" -C ~ data/
    echo "$(date): 數據備份完成 - data_$DATE.tar.gz"
fi

# 備份日誌（最近3天）
if [ -d ~/logs ]; then
    find ~/logs -name "*.log" -mtime -3 | tar -czf "$BACKUP_DIR/logs_$DATE.tar.gz" -T -
    echo "$(date): 日誌備份完成 - logs_$DATE.tar.gz"
fi

# 清理舊備份（保持7天）
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
echo "$(date): 舊備份清理完成"
EOF

chmod +x ~/backup.sh

# 設置防火牆（如果需要外部訪問）
log_info "🔒 配置基本安全"
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow from 10.0.0.0/8  # 允許內網訪問
log_success "防火牆配置完成"

# 優化系統設置
log_info "⚡ 優化系統設置"

# 增加文件描述符限制
echo "$USER soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "$USER hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 創建系統監控別名
tee -a ~/.bashrc > /dev/null << 'EOF'

# 加密貨幣監控相關別名
alias monitor-status='pm2 list'
alias monitor-logs='pm2 logs crypto-monitor'
alias monitor-restart='pm2 restart crypto-monitor'
alias monitor-stop='pm2 stop crypto-monitor'
alias monitor-start='pm2 start crypto-monitor'
alias monitor-health='~/monitor.sh'
alias monitor-backup='~/backup.sh'
alias monitor-config='nano ~/crypto-exchange-monitor/.env'

# 系統監控
alias sysinfo='echo "=== CPU ===" && top -bn1 | head -3 && echo "=== Memory ===" && free -h && echo "=== Disk ===" && df -h'
EOF

# 顯示完成信息
log_success "🎉 VM 初始化完成！"
echo "========================================"
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"  
echo "PM2: $(pm2 --version)"
echo "========================================"
echo "目錄結構："
echo "  ~/crypto-exchange-monitor/ - 應用程式目錄"
echo "  ~/logs/                   - 日誌目錄"
echo "  ~/data/                   - 數據目錄"
echo "  ~/backups/                - 備份目錄"
echo "========================================"
echo "實用腳本："
echo "  ~/monitor.sh              - 健康檢查"
echo "  ~/backup.sh               - 數據備份"
echo "========================================"
echo "常用命令（重新登錄後可用）："
echo "  monitor-status            - 查看服務狀態"
echo "  monitor-logs              - 查看日誌"
echo "  monitor-restart           - 重啟服務"
echo "  monitor-config            - 編輯配置"
echo "  sysinfo                   - 系統信息"
echo "========================================"

log_warning "⚠️ 請重新登錄以載入新的環境設置"
log_info "現在可以運行應用程式部署腳本了"
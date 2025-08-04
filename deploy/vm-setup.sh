#!/bin/bash

# VM 初始化腳本 - 專用於加密貨幣監控程式
# 安裝 Node.js 和必要組件，使用 systemd 服務管理

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
    htop \
    nano \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# 安裝 Node.js 18 LTS
log_info "📦 安裝 Node.js 18 LTS"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 驗證安裝
log_info "✅ 驗證安裝"
node_version=$(node --version)
npm_version=$(npm --version)

log_success "Node.js 版本: $node_version"
log_success "npm 版本: $npm_version"

# 創建應用目錄
log_info "📁 創建應用目錄"
mkdir -p ~/crypto-exchange-monitor
mkdir -p ~/logs
mkdir -p ~/data

# 設置防火牆（如果需要）
log_info "🔒 設置基本防火牆規則"
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh

# 設置自動安全更新
log_info "🔄 啟用自動安全更新"
sudo apt-get install -y unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' | sudo tee -a /etc/apt/apt.conf.d/50unattended-upgrades

# 優化系統設置
log_info "⚡ 優化系統設置"

# 設置 swap（如果記憶體不足）
if [ $(free -m | awk 'NR==2{printf "%.0f", $2}') -lt 2048 ]; then
    log_info "💾 創建 swap 檔案"
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# 設置時區
log_info "🕐 設置時區"
sudo timedatectl set-timezone Asia/Taipei

# 清理
log_info "🧹 清理暫存檔案"
sudo apt-get autoremove -y
sudo apt-get autoclean

log_success "🎉 VM 環境初始化完成！"

echo "========================================"
echo "系統資訊："
echo "  作業系統: $(lsb_release -d | cut -f2)"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo "  記憶體: $(free -h | awk 'NR==2{print $2}')"
echo "  磁碟空間: $(df -h / | awk 'NR==2{print $4}') 可用"
echo "========================================"
echo "下一步："
echo "  1. 複製應用程式檔案到 ~/crypto-exchange-monitor/"
echo "  2. 執行部署腳本: ./direct-deploy.sh"
echo "  3. 編輯環境變數: nano ~/crypto-exchange-monitor/.env"
echo "========================================"
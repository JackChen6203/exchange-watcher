#!/bin/bash

# 自動部署腳本
# 用於在 GCP 服務器上更新和重啟應用

set -e  # 遇到錯誤立即退出

echo "🚀 開始部署 Crypto Exchange Monitor..."

# 設定變數
APP_DIR="/home/JackChen6203/crypto-exchange-monitor"
PM2_APP_NAME="crypto-monitor"
BACKUP_DIR="/home/JackChen6203/backups"

# 創建備份目錄
mkdir -p $BACKUP_DIR

# 備份當前版本（如果存在）
if [ -d "$APP_DIR" ]; then
    echo "📦 備份當前版本..."
    BACKUP_NAME="crypto-monitor-backup-$(date +%Y%m%d-%H%M%S)"
    cp -r $APP_DIR $BACKUP_DIR/$BACKUP_NAME
    echo "✅ 備份完成: $BACKUP_DIR/$BACKUP_NAME"
fi

# 創建應用目錄
mkdir -p $APP_DIR
cd $APP_DIR

# 停止現有的 PM2 進程
echo "⏹️  停止現有服務..."
pm2 stop $PM2_APP_NAME || echo "No existing process to stop"

# 如果是從 Git 部署
if [ "$1" = "git" ]; then
    echo "📥 從 Git 拉取最新代碼..."
    
    if [ -d ".git" ]; then
        git fetch origin
        git reset --hard origin/main
    else
        git clone https://github.com/JackChen6203/crypto-exchange-monitor.git .
    fi
fi

# 安裝依賴
echo "📚 安裝依賴..."
npm install --only=production

# 確保必要目錄存在
mkdir -p data logs

# 檢查環境變數文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env 文件不存在，請確保已正確配置環境變數"
    echo "參考 .env.example 文件進行配置"
    exit 1
fi

# 運行測試（可選）
if [ "$NODE_ENV" != "production" ]; then
    echo "🧪 運行測試..."
    npm run test || echo "Tests failed, but continuing with deployment"
fi

# 啟動應用
echo "🚀 啟動應用..."
pm2 start src/index.js --name $PM2_APP_NAME --env production
pm2 save

# 顯示狀態
echo "📊 應用狀態:"
pm2 status $PM2_APP_NAME

echo "✅ 部署完成！"
echo "🔗 監控日誌: pm2 logs $PM2_APP_NAME"
echo "🔄 重啟應用: pm2 restart $PM2_APP_NAME"
echo "⏹️  停止應用: pm2 stop $PM2_APP_NAME"

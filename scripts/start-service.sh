#!/bin/bash

# ==============================================
# 啟動Exchange Monitor服務腳本
# ==============================================

APP_DIR="/opt/crypto-exchange-monitor"
APP_NAME="crypto-exchange-monitor"

echo "🚀 啟動Crypto Exchange Monitor服務..."

# 檢查目錄是否存在
if [ ! -d "$APP_DIR" ]; then
    echo "❌ 應用程式目錄不存在: $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

# 檢查必要文件
if [ ! -f "package.json" ]; then
    echo "❌ package.json 不存在"
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️ .env 文件不存在，複製範本..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ 已複製 .env.example 為 .env"
        echo "⚠️ 請編輯 .env 文件並填入正確的配置值"
    else
        echo "❌ .env.example 也不存在！"
        exit 1
    fi
fi

# 安裝依賴
echo "📦 安裝依賴..."
npm install

# 停止現有服務
echo "🛑 停止現有PM2服務..."
pm2 stop $APP_NAME 2>/dev/null || true
pm2 delete $APP_NAME 2>/dev/null || true

# 使用PM2啟動服務
echo "🚀 使用PM2啟動服務..."
pm2 start src/index.js --name "$APP_NAME" --log-date-format "YYYY-MM-DD HH:mm:ss Z"

# 保存PM2配置
pm2 save

# 設置PM2開機自動啟動
pm2 startup

echo "✅ 服務啟動完成！"
echo ""
echo "📋 服務狀態:"
pm2 list

echo ""
echo "📝 查看日誌:"
echo "pm2 logs $APP_NAME"

echo ""
echo "🔍 檢查服務健康狀況:"
echo "pm2 monit"
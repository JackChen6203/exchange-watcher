#!/bin/bash

# ==============================================
# 啟動Exchange Monitor服務腳本 (不使用PM2)
# ==============================================

# 檢查多個可能的應用程式位置
APP_LOCATIONS=(
    "/opt/crypto-exchange-monitor"
    "~/crypto-exchange-monitor"
    "./crypto-exchange-monitor"
    "."
)

APP_NAME="crypto-exchange-monitor"

echo "🚀 啟動Crypto Exchange Monitor服務..."
echo "📋 注意: 此專案已停用PM2，使用直接Node.js運行"
echo ""

# 尋找應用程式目錄
APP_DIR=""
for dir in "${APP_LOCATIONS[@]}"; do
    if [ -d "$dir" ] && [ -f "$dir/package.json" ]; then
        APP_DIR="$dir"
        echo "✅ 找到應用程式目錄: $APP_DIR"
        break
    fi
done

if [ -z "$APP_DIR" ]; then
    echo "❌ 找不到應用程式目錄"
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

# 停止現有服務 (非PM2)
echo "🛑 停止現有Node.js進程..."
pkill -f "node.*crypto-exchange" || true
pkill -f "node.*src/index.js" || true

# 等待進程停止
sleep 2

# 使用nohup啟動服務在背景運行
echo "🚀 使用nohup啟動服務..."
nohup node src/index.js > nohup.out 2>&1 &
SERVICE_PID=$!

echo "✅ 服務已啟動，PID: $SERVICE_PID"
echo "$SERVICE_PID" > crypto-exchange-monitor.pid

# 檢查服務是否正常啟動
sleep 3
if ps -p $SERVICE_PID > /dev/null; then
    echo "✅ 服務啟動成功！"
else
    echo "❌ 服務啟動失敗"
    echo "檢查nohup.out日誌:"
    tail -20 nohup.out
    exit 1
fi

echo ""
echo "📋 服務狀態:"
echo "PID: $SERVICE_PID"
ps aux | grep $SERVICE_PID | grep -v grep

echo ""
echo "📝 查看日誌:"
echo "tail -f nohup.out"
echo "tail -f logs/monitor.log"

echo ""
echo "🔍 停止服務:"
echo "kill $SERVICE_PID"
echo "或使用: pkill -f 'node.*crypto-exchange'"

echo ""
echo "🔍 檢查服務狀態:"
echo "ps aux | grep node | grep -v grep"
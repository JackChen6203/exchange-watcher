#!/bin/bash

# ==============================================
# 遠端服務檢查腳本
# ==============================================

echo "🔍 檢查遠端服務狀態..."
echo "📋 注意: 此專案已停用PM2，使用直接Node.js運行"
echo ""

# 檢查服務是否運行 (此專案不使用PM2)
echo "📋 檢查Node.js進程:"
ps aux | grep node | grep -v grep

echo ""
echo "📋 檢查crypto-exchange-monitor進程:"
ps aux | grep crypto-exchange | grep -v grep

echo ""
echo "📋 檢查nohup進程 (常用於背景運行):"
ps aux | grep nohup | grep -v grep

echo ""
echo "📋 檢查Docker容器:"
docker ps -a

echo ""
echo "📋 檢查系統資源:"
echo "Memory usage:"
free -h
echo ""
echo "Disk usage:"
df -h

echo ""
echo "📋 檢查日誌文件:"
# 檢查多個可能的日誌位置
LOG_LOCATIONS=(
    "/opt/crypto-exchange-monitor/logs/monitor.log"
    "./logs/monitor.log"
    "~/crypto-exchange-monitor/logs/monitor.log"
    "nohup.out"
)

LOG_FOUND=false
for log_file in "${LOG_LOCATIONS[@]}"; do
    if [ -f "$log_file" ]; then
        echo "✅ 找到日誌文件: $log_file"
        echo "最新日誌 (最後20行):"
        tail -20 "$log_file"
        LOG_FOUND=true
        break
    fi
done

if [ "$LOG_FOUND" = false ]; then
    echo "⚠️ 找不到日誌文件"
fi

echo ""
echo "📋 檢查環境變數文件:"
if [ -f "/opt/crypto-exchange-monitor/.env" ]; then
    echo "✅ .env 文件存在"
    # 不顯示內容，只確認存在
else
    echo "❌ .env 文件不存在"
fi

echo ""
echo "📋 檢查應用程式文件:"
# 檢查多個可能的應用程式位置
APP_LOCATIONS=(
    "/opt/crypto-exchange-monitor"
    "~/crypto-exchange-monitor"
    "./crypto-exchange-monitor"
    "."
)

APP_FOUND=false
for app_dir in "${APP_LOCATIONS[@]}"; do
    if [ -d "$app_dir" ] && [ -f "$app_dir/package.json" ]; then
        echo "✅ 應用程式目錄存在: $app_dir"
        ls -la "$app_dir/"
        APP_FOUND=true
        break
    fi
done

if [ "$APP_FOUND" = false ]; then
    echo "❌ 找不到應用程式目錄"
fi

echo ""
echo "📋 檢查網路連接:"
echo "檢查Bitget API連接:"
curl -s --connect-timeout 5 https://api.bitget.com/api/spot/v1/public/time || echo "❌ Bitget API連接失敗"

echo ""
echo "📋 檢查Discord Webhook (如果已配置):"
if [ ! -z "$DISCORD_WEBHOOK_URL" ]; then
    echo "Discord webhook已配置"
else
    echo "⚠️ Discord webhook未在環境變數中找到"
fi

echo ""
echo "🔍 檢查完成！"
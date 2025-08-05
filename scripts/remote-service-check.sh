#!/bin/bash

# ==============================================
# 遠端服務檢查腳本
# ==============================================

echo "🔍 檢查遠端服務狀態..."

# 檢查服務是否運行
echo "📋 檢查PM2進程狀態:"
pm2 list

echo ""
echo "📋 檢查Node.js進程:"
ps aux | grep node | grep -v grep

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
if [ -f "/opt/crypto-exchange-monitor/logs/monitor.log" ]; then
    echo "最新日誌 (最後20行):"
    tail -20 /opt/crypto-exchange-monitor/logs/monitor.log
else
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
if [ -d "/opt/crypto-exchange-monitor" ]; then
    echo "✅ 應用程式目錄存在"
    ls -la /opt/crypto-exchange-monitor/
else
    echo "❌ 應用程式目錄不存在"
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
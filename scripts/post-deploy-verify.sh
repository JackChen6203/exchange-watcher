#!/bin/bash

# ==============================================
# CI/CD 部署後驗證腳本
# ==============================================

echo "🔍 開始部署後驗證..."

# 等待服務完全啟動
echo "⏳ 等待服務啟動..."
sleep 10

# 檢查服務狀態
echo "📊 檢查服務狀態..."
if systemctl is-active --quiet crypto-monitor; then
    echo "✅ 服務正在運行"
else
    echo "❌ 服務未運行，嘗試啟動..."
    sudo systemctl start crypto-monitor
    sleep 5
    if systemctl is-active --quiet crypto-monitor; then
        echo "✅ 服務已成功啟動"
    else
        echo "❌ 服務啟動失敗"
        echo "錯誤日誌："
        sudo journalctl -u crypto-monitor --lines=20 --no-pager
        exit 1
    fi
fi

# 檢查是否啟用自動啟動
echo "🔄 檢查自動啟動設置..."
if systemctl is-enabled --quiet crypto-monitor; then
    echo "✅ 服務已設置為開機自啟"
else
    echo "⚠️ 設置開機自啟..."
    sudo systemctl enable crypto-monitor
    echo "✅ 已啟用開機自啟"
fi

# 檢查環境變數文件
echo "⚙️ 檢查環境配置..."
if [ -f "/home/$USER/crypto-exchange-monitor/.env" ]; then
    echo "✅ 環境變數文件存在"
    
    # 檢查關鍵配置
    if grep -q "DISCORD_WEBHOOK_URL" /home/$USER/crypto-exchange-monitor/.env; then
        if grep -q "your_webhook" /home/$USER/crypto-exchange-monitor/.env; then
            echo "⚠️ Discord Webhook 需要配置實際值"
        else
            echo "✅ Discord Webhook 已配置"
        fi
    else
        echo "❌ 缺少 Discord Webhook 配置"
    fi
    
    if grep -q "API_KEY" /home/$USER/crypto-exchange-monitor/.env; then
        if grep -q "your_api_key" /home/$USER/crypto-exchange-monitor/.env; then
            echo "⚠️ API 密鑰需要配置實際值"
        else
            echo "✅ API 密鑰已配置"
        fi
    else
        echo "❌ 缺少 API 密鑰配置"
    fi
else
    echo "❌ 環境變數文件不存在"
    echo "ℹ️ 正在從模板創建..."
    cp /home/$USER/crypto-exchange-monitor/.env.template /home/$USER/crypto-exchange-monitor/.env
    echo "⚠️ 請編輯 .env 文件並填入實際配置值"
fi

# 檢查日誌目錄
echo "📝 檢查日誌配置..."
if [ -d "/home/$USER/crypto-exchange-monitor/logs" ]; then
    echo "✅ 日誌目錄存在"
else
    echo "📁 創建日誌目錄..."
    mkdir -p /home/$USER/crypto-exchange-monitor/logs
    echo "✅ 日誌目錄已創建"
fi

# 檢查進程
echo "🔧 檢查應用進程..."
PIDS=$(pgrep -f "crypto-monitor\|src/index.js")
if [ -n "$PIDS" ]; then
    echo "✅ 找到應用進程: $PIDS"
    echo "📈 進程資源使用："
    ps -o pid,ppid,cmd,%mem,%cpu --sort=-%mem -p $PIDS
else
    echo "❌ 未找到應用進程"
fi

# 檢查最近日誌
echo "📋 檢查最近日誌..."
echo "--- 系統日誌 (最後10行) ---"
sudo journalctl -u crypto-monitor --lines=10 --no-pager 2>/dev/null || echo "無法讀取系統日誌"

if [ -f "/home/$USER/crypto-exchange-monitor/logs/monitor.log" ]; then
    echo "--- 應用日誌 (最後5行) ---"
    tail -5 /home/$USER/crypto-exchange-monitor/logs/monitor.log
fi

# 網路檢查
echo "🌐 檢查網路連接..."
if curl -s --max-time 5 https://api.bitget.com > /dev/null; then
    echo "✅ Bitget API 連接正常"
else
    echo "⚠️ Bitget API 連接可能有問題"
fi

if [ -n "$(grep DISCORD_WEBHOOK_URL /home/$USER/crypto-exchange-monitor/.env | grep -v "your_webhook")" ]; then
    WEBHOOK_URL=$(grep DISCORD_WEBHOOK_URL /home/$USER/crypto-exchange-monitor/.env | cut -d'=' -f2)
    if curl -s --max-time 5 "$WEBHOOK_URL" > /dev/null; then
        echo "✅ Discord Webhook 連接正常"
    else
        echo "⚠️ Discord Webhook 連接可能有問題"
    fi
else
    echo "ℹ️ Discord Webhook 未配置，跳過連接測試"
fi

echo ""
echo "🎯 部署驗證完成！"
echo ""
echo "📊 服務管理命令："
echo "  查看狀態: sudo systemctl status crypto-monitor"
echo "  查看日誌: sudo journalctl -u crypto-monitor -f"
echo "  重啟服務: sudo systemctl restart crypto-monitor"
echo ""
echo "⚠️ 如果服務配置不正確，請編輯 .env 文件後重啟服務"

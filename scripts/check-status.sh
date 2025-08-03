#!/bin/bash

# ==============================================
# Crypto Monitor 快速狀態檢查腳本
# ==============================================

echo "🔍 Crypto Exchange Monitor 狀態檢查"
echo "======================================"

# 檢查服務狀態
echo "📊 服務狀態:"
if systemctl is-active --quiet crypto-monitor; then
    echo "  ✅ 服務正在運行"
    echo "  📅 啟動時間: $(systemctl show crypto-monitor --property=ActiveEnterTimestamp --value)"
else
    echo "  ❌ 服務未運行"
fi

echo "  🔄 開機自啟: $(systemctl is-enabled crypto-monitor 2>/dev/null || echo '未設定')"

# 檢查進程
echo ""
echo "🔧 進程信息:"
PIDS=$(pgrep -f "crypto-monitor\|src/index.js" 2>/dev/null)
if [ -n "$PIDS" ]; then
    echo "  ✅ 找到進程 PID: $PIDS"
    echo "  📈 記憶體使用:"
    ps -o pid,ppid,cmd,%mem,%cpu --sort=-%mem -p $PIDS
else
    echo "  ❌ 未找到相關進程"
fi

# 檢查專案文件
echo ""
echo "📁 專案文件檢查:"
PROJECT_DIR="/home/$USER/crypto-exchange-monitor"
if [ -d "$PROJECT_DIR" ]; then
    echo "  ✅ 專案目錄存在: $PROJECT_DIR"
    
    # 檢查關鍵文件
    if [ -f "$PROJECT_DIR/src/index.js" ]; then
        echo "  ✅ 主程式文件存在"
    else
        echo "  ❌ 主程式文件不存在"
    fi
    
    if [ -f "$PROJECT_DIR/.env" ]; then
        echo "  ✅ 環境變數文件存在"
    else
        echo "  ⚠️  環境變數文件不存在 (需要從 .env.template 複製)"
    fi
    
    if [ -f "$PROJECT_DIR/package.json" ]; then
        echo "  ✅ package.json 存在"
    else
        echo "  ❌ package.json 不存在"
    fi
    
    if [ -d "$PROJECT_DIR/node_modules" ]; then
        echo "  ✅ 依賴已安裝"
    else
        echo "  ⚠️  依賴未安裝 (需要執行 npm install)"
    fi
else
    echo "  ❌ 專案目錄不存在: $PROJECT_DIR"
fi

# 檢查日誌
echo ""
echo "📝 最近日誌 (最後5行):"
if systemctl list-units --type=service | grep -q crypto-monitor; then
    sudo journalctl -u crypto-monitor --lines=5 --no-pager 2>/dev/null || echo "  無法讀取系統日誌"
else
    echo "  服務未註冊到 systemd"
fi

# 檢查應用日誌
if [ -f "$PROJECT_DIR/logs/monitor.log" ]; then
    echo ""
    echo "📋 應用日誌 (最後3行):"
    tail -3 "$PROJECT_DIR/logs/monitor.log" 2>/dev/null || echo "  無法讀取應用日誌"
fi

# 檢查網路端口
echo ""
echo "🌐 網路端口檢查:"
NODE_PORTS=$(ss -tlnp 2>/dev/null | grep node || echo "")
if [ -n "$NODE_PORTS" ]; then
    echo "  ✅ Node.js 程序佔用的端口:"
    echo "$NODE_PORTS"
else
    echo "  ℹ️  未發現 Node.js 程序佔用端口"
fi

# 快速操作提示
echo ""
echo "🛠️  快速操作命令:"
echo "  啟動服務: sudo systemctl start crypto-monitor"
echo "  停止服務: sudo systemctl stop crypto-monitor"
echo "  重啟服務: sudo systemctl restart crypto-monitor"
echo "  查看日誌: sudo journalctl -u crypto-monitor -f"
echo "  檢查配置: ls -la $PROJECT_DIR/.env"
echo "  手動測試: cd $PROJECT_DIR && node src/index.js"

echo ""
echo "✅ 檢查完成"

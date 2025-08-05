#!/bin/bash

# ==============================================
# 停止Exchange Monitor服務腳本 (不使用PM2)
# ==============================================

echo "🛑 停止Crypto Exchange Monitor服務..."
echo "📋 注意: 此專案已停用PM2，使用直接Node.js運行"
echo ""

# 檢查是否有PID文件
PID_FILE="crypto-exchange-monitor.pid"
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo "📋 找到PID文件，PID: $PID"
    
    if ps -p $PID > /dev/null; then
        echo "🛑 停止進程 $PID..."
        kill $PID
        sleep 2
        
        # 檢查是否成功停止
        if ps -p $PID > /dev/null; then
            echo "⚠️ 進程仍在運行，強制停止..."
            kill -9 $PID
        fi
        
        echo "✅ 服務已停止"
        rm -f "$PID_FILE"
    else
        echo "⚠️ PID文件中的進程不存在，清理PID文件"
        rm -f "$PID_FILE"
    fi
else
    echo "⚠️ 找不到PID文件，嘗試其他方法停止服務"
fi

# 使用進程名稱停止
echo "🔍 尋找並停止crypto-exchange相關進程..."
pkill -f "node.*crypto-exchange" && echo "✅ 已停止crypto-exchange進程"

echo "🔍 尋找並停止src/index.js進程..."
pkill -f "node.*src/index.js" && echo "✅ 已停止src/index.js進程"

echo "🔍 尋找並停止nohup進程..."
pkill -f "nohup.*node" && echo "✅ 已停止nohup進程"

# 等待進程完全停止
sleep 2

# 檢查是否還有相關進程
echo ""
echo "📋 檢查剩餘的Node.js進程:"
REMAINING_PROCESSES=$(ps aux | grep node | grep -v grep)
if [ -z "$REMAINING_PROCESSES" ]; then
    echo "✅ 沒有找到運行中的Node.js進程"
else
    echo "⚠️ 發現以下Node.js進程仍在運行:"
    echo "$REMAINING_PROCESSES"
fi

echo ""
echo "🛑 服務停止操作完成！"
#!/bin/bash

# Digital Ocean 部署後健康檢查腳本
echo "🔍 Digital Ocean 部署健康檢查開始..."

# 設置變數
APP_URL=${1:-"https://crypto-exchange-monitor-xxxxx.ondigitalocean.app"} # 需要替換為實際URL
MAX_RETRIES=30
RETRY_DELAY=10

echo "📱 目標URL: $APP_URL"

# 健康檢查函數
check_health() {
    local url=$1
    echo "🏥 檢查健康端點: $url/health"
    
    for i in $(seq 1 $MAX_RETRIES); do
        echo "第 $i 次嘗試 (最多 $MAX_RETRIES 次)..."
        
        if curl -f -s "$url/health" > /dev/null 2>&1; then
            echo "✅ 健康檢查通過！"
            return 0
        fi
        
        echo "⏳ 等待 $RETRY_DELAY 秒後重試..."
        sleep $RETRY_DELAY
    done
    
    echo "❌ 健康檢查失敗，已嘗試 $MAX_RETRIES 次"
    return 1
}

# 檢查狀態頁面
check_status() {
    local url=$1
    echo "📊 檢查狀態頁面: $url/status"
    
    if curl -f -s "$url/status" > /dev/null 2>&1; then
        echo "✅ 狀態頁面正常！"
        return 0
    else
        echo "⚠️ 狀態頁面無法訪問"
        return 1
    fi
}

# 獲取詳細狀態信息
get_detailed_status() {
    local url=$1
    echo "📋 獲取詳細狀態信息..."
    
    local response=$(curl -s "$url/health" | jq '.' 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "📊 系統狀態："
        echo "$response" | jq '{
            service: .service,
            status: .status,
            uptime: .uptime,
            monitoring: .monitoring,
            memory: {
                used: .memory.heapUsed,
                total: .memory.heapTotal
            }
        }'
    else
        echo "⚠️ 無法解析狀態信息"
    fi
}

# 主要檢查流程
main() {
    echo "🚀 開始 Digital Ocean App Platform 部署驗證..."
    echo "================================================="
    
    if ! command -v curl >&2; then
        echo "❌ 錯誤：需要安裝 curl"
        exit 1
    fi
    
    if ! command -v jq >&2; then
        echo "⚠️ 警告：建議安裝 jq 以獲得更好的 JSON 格式化"
    fi
    
    # 檢查健康端點
    if check_health "$APP_URL"; then
        echo "🎉 健康檢查成功！"
    else
        echo "💥 健康檢查失敗！"
        echo "📋 故障排除步驟："
        echo "1. 檢查 Digital Ocean App Platform 控制台日誌"
        echo "2. 確認環境變數已正確設置"
        echo "3. 檢查應用是否正確啟動"
        exit 1
    fi
    
    # 檢查狀態頁面
    check_status "$APP_URL"
    
    # 獲取詳細狀態
    get_detailed_status "$APP_URL"
    
    echo ""
    echo "================================================="
    echo "🎯 部署驗證完成！"
    echo "📍 應用URL: $APP_URL"
    echo "🏥 健康檢查: $APP_URL/health"
    echo "📊 狀態頁面: $APP_URL/status"
    echo "================================================="
}

# 如果直接執行腳本
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
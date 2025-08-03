#!/bin/bash

# ==============================================
# 服務健康檢查和自動恢復腳本
# 建議設置為 cron job 每5分鐘執行一次
# ==============================================

LOG_FILE="/home/$USER/crypto-exchange-monitor/logs/health-check.log"
PROJECT_DIR="/home/$USER/crypto-exchange-monitor"

# 記錄函數
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_message "開始健康檢查..."

# 檢查服務是否運行
if ! systemctl is-active --quiet crypto-monitor; then
    log_message "⚠️ 服務未運行，嘗試啟動..."
    
    # 檢查配置文件
    if [ ! -f "$PROJECT_DIR/.env" ]; then
        log_message "❌ 環境變數文件不存在，從模板複製..."
        cp "$PROJECT_DIR/.env.template" "$PROJECT_DIR/.env"
        log_message "⚠️ 請配置 .env 文件中的實際值"
    fi
    
    # 啟動服務
    sudo systemctl start crypto-monitor
    sleep 5
    
    if systemctl is-active --quiet crypto-monitor; then
        log_message "✅ 服務已成功重啟"
    else
        log_message "❌ 服務重啟失敗"
        log_message "錯誤日誌："
        sudo journalctl -u crypto-monitor --lines=10 --no-pager >> "$LOG_FILE"
        
        # 發送 Discord 警報（如果配置了）
        if [ -f "$PROJECT_DIR/.env" ] && grep -q "DISCORD_WEBHOOK_URL" "$PROJECT_DIR/.env"; then
            WEBHOOK_URL=$(grep DISCORD_WEBHOOK_URL "$PROJECT_DIR/.env" | cut -d'=' -f2)
            if [[ "$WEBHOOK_URL" != *"your_webhook"* ]] && [[ "$WEBHOOK_URL" == https* ]]; then
                curl -X POST "$WEBHOOK_URL" \
                    -H "Content-Type: application/json" \
                    -d "{\"content\": \"🚨 Crypto Monitor 服務啟動失敗！請檢查伺服器狀態。\"}" \
                    >> "$LOG_FILE" 2>&1
            fi
        fi
    fi
else
    # 檢查進程健康狀況
    PIDS=$(pgrep -f "crypto-monitor\|src/index.js")
    if [ -n "$PIDS" ]; then
        # 檢查記憶體使用量
        MEM_USAGE=$(ps -o %mem --no-headers -p $PIDS | awk '{sum+=$1} END {print sum}')
        if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
            log_message "⚠️ 記憶體使用量過高: ${MEM_USAGE}%，重啟服務..."
            sudo systemctl restart crypto-monitor
        fi
        
        # 檢查最後活動時間
        LAST_LOG_TIME=$(sudo journalctl -u crypto-monitor --lines=1 --no-pager | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}' | head -1)
        if [ -n "$LAST_LOG_TIME" ]; then
            LAST_LOG_TIMESTAMP=$(date -d "$LAST_LOG_TIME" +%s 2>/dev/null || echo 0)
            CURRENT_TIMESTAMP=$(date +%s)
            TIME_DIFF=$((CURRENT_TIMESTAMP - LAST_LOG_TIMESTAMP))
            
            # 如果超過30分鐘沒有日誌，可能服務卡住了
            if [ $TIME_DIFF -gt 1800 ]; then
                log_message "⚠️ 服務可能卡住（超過30分鐘無日誌），重啟服務..."
                sudo systemctl restart crypto-monitor
            fi
        fi
    else
        log_message "⚠️ 未找到應用進程，重啟服務..."
        sudo systemctl restart crypto-monitor
    fi
fi

# 檢查磁碟空間
DISK_USAGE=$(df "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    log_message "⚠️ 磁碟空間不足: ${DISK_USAGE}%"
    
    # 清理舊日誌
    find "$PROJECT_DIR/logs" -name "*.log" -type f -mtime +7 -exec rm {} \;
    log_message "🧹 已清理7天前的日誌文件"
fi

# 檢查日誌大小並輪替
if [ -f "$PROJECT_DIR/logs/monitor.log" ]; then
    LOG_SIZE=$(stat -c%s "$PROJECT_DIR/logs/monitor.log" 2>/dev/null || echo 0)
    # 如果日誌文件超過50MB，進行輪替
    if [ "$LOG_SIZE" -gt 52428800 ]; then
        mv "$PROJECT_DIR/logs/monitor.log" "$PROJECT_DIR/logs/monitor.log.$(date +%Y%m%d_%H%M%S)"
        log_message "🔄 日誌文件已輪替"
    fi
fi

log_message "健康檢查完成"

# 保持健康檢查日誌文件大小合理
if [ -f "$LOG_FILE" ]; then
    HEALTH_LOG_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
    if [ "$HEALTH_LOG_SIZE" -gt 10485760 ]; then  # 10MB
        tail -1000 "$LOG_FILE" > "${LOG_FILE}.tmp"
        mv "${LOG_FILE}.tmp" "$LOG_FILE"
    fi
fi

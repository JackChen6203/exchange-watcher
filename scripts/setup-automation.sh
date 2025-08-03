#!/bin/bash

# 自動設置 cron job 的腳本
# 這個腳本會被 CI/CD 自動執行

CRON_JOB="*/5 * * * * /home/JackChen6203/crypto-exchange-monitor/scripts/health-check.sh"
CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

# 檢查 cron job 是否已存在
if echo "$CURRENT_CRON" | grep -q "health-check.sh"; then
    echo "✅ Cron job 已存在"
else
    echo "🔧 添加 cron job..."
    (echo "$CURRENT_CRON"; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job 已添加"
fi

# 確保腳本可執行
chmod +x /home/JackChen6203/crypto-exchange-monitor/scripts/health-check.sh
chmod +x /home/JackChen6203/crypto-exchange-monitor/scripts/post-deploy-verify.sh
chmod +x /home/JackChen6203/crypto-exchange-monitor/scripts/check-status.sh

echo "✅ 自動化監控已設置完成"

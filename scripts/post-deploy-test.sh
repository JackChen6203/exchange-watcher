#!/bin/bash

# 部署後自動測試腳本
echo "🚀 開始部署後測試..."

# 等待服務完全啟動
echo "⏳ 等待服務啟動 (30秒)..."
sleep 30

# 檢查健康檢查端點
echo "🔍 檢查健康檢查端點..."
if curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo "✅ 健康檢查端點正常"
else
    echo "❌ 健康檢查端點失敗"
    exit 1
fi

# 執行基本測試
echo "🧪 執行基本功能測試..."
npm run test
if [ $? -eq 0 ]; then
    echo "✅ 基本測試通過"
else
    echo "❌ 基本測試失敗"
    exit 1
fi

# 執行 Discord 表格功能測試
echo "📊 執行 Discord 表格功能測試..."
npm run test-discord
if [ $? -eq 0 ]; then
    echo "✅ Discord 表格測試通過"
    echo "📱 請檢查 Discord 頻道確認收到測試訊息"
else
    echo "❌ Discord 表格測試失敗"
    exit 1
fi

# 檢查監控系統狀態
echo "📈 檢查監控系統狀態..."
if curl -f http://localhost:8080/status > /dev/null 2>&1; then
    echo "✅ 監控系統狀態正常"
else
    echo "⚠️ 監控系統狀態檢查失敗，但不影響部署"
fi

echo "🎉 部署後測試完成！"
echo "📋 測試摘要:"
echo "  - ✅ 健康檢查端點正常"
echo "  - ✅ 基本功能測試通過"
echo "  - ✅ Discord 表格功能測試通過"
echo "  - ✅ 系統已準備就緒"

echo ""
echo "📊 監控功能已啟動："
echo "  - 持倉/價格異動表格：每5分鐘發送"
echo "  - 資金費率表格：每小時50/55/59分發送"
echo "  - 健康檢查：http://your-app-url/health"
echo "  - 狀態頁面：http://your-app-url/status"
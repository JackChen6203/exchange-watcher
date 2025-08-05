# ==============================================
# 遠端服務檢查PowerShell腳本
# ==============================================

param(
    [string]$SSHHost = "gcp_jkes6204_new"
)

Write-Host "🔍 檢查遠端服務狀態..." -ForegroundColor Cyan

try {
    # 上傳檢查腳本到遠端
    Write-Host "📤 上傳檢查腳本到遠端..." -ForegroundColor Yellow
    scp ".\scripts\remote-service-check.sh" "${SSHHost}:~/"
    
    # 執行遠端檢查
    Write-Host "🔍 執行遠端服務檢查..." -ForegroundColor Yellow
    ssh $SSHHost "chmod +x ~/remote-service-check.sh && ~/remote-service-check.sh"
    
    Write-Host "`n" -ForegroundColor Green
    Write-Host "✅ 遠端檢查完成！" -ForegroundColor Green
    
    # 詢問是否要啟動服務
    Write-Host "`n" -ForegroundColor Yellow
    $startService = Read-Host "是否要啟動/重啟服務？(y/N)"
    
    if ($startService -eq "y" -or $startService -eq "Y") {
        Write-Host "🚀 啟動遠端服務..." -ForegroundColor Yellow
        
        # 上傳啟動腳本
        scp ".\scripts\start-service.sh" "${SSHHost}:~/"
        
        # 執行啟動腳本
        ssh $SSHHost "chmod +x ~/start-service.sh && ~/start-service.sh"
        
        Write-Host "✅ 服務啟動命令已執行！" -ForegroundColor Green
    }
    
} catch {
    Write-Host "❌ 連接遠端機器失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "請檢查SSH配置和網路連接" -ForegroundColor Yellow
}

Write-Host "`n常用命令:" -ForegroundColor Cyan
Write-Host "ssh $SSHHost" -ForegroundColor White
Write-Host "ssh $SSHHost 'pm2 list'" -ForegroundColor White
Write-Host "ssh $SSHHost 'pm2 logs crypto-exchange-monitor'" -ForegroundColor White
Write-Host "ssh $SSHHost 'pm2 restart crypto-exchange-monitor'" -ForegroundColor White
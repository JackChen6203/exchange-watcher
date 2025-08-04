#!/bin/bash

# 緊急修復腳本 - 直接在伺服器上執行
# 修復 Git 權限問題和清理備份檔案

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_info "🚨 緊急修復開始"

# 1. 檢查當前用戶
CURRENT_USER=$(whoami)
log_info "當前用戶: $CURRENT_USER"

# 2. 修復 Git 權限問題
fix_git_permissions() {
    log_info "🔐 修復 Git 權限問題"
    
    # 修復 exchange-watcher
    if [ -d "/home/JackChen6203/exchange-watcher" ]; then
        log_info "修復 exchange-watcher 權限"
        if [ "$CURRENT_USER" = "root" ]; then
            chown -R JackChen6203:JackChen6203 /home/JackChen6203/exchange-watcher/
        else
            sudo chown -R JackChen6203:JackChen6203 /home/JackChen6203/exchange-watcher/
        fi
        
        if [ -d "/home/JackChen6203/exchange-watcher/.git" ]; then
            cd /home/JackChen6203/exchange-watcher
            git config --global --add safe.directory /home/JackChen6203/exchange-watcher
            log_success "exchange-watcher Git 權限修復完成"
        fi
    fi
    
    # 修復 crypto-exchange-monitor
    if [ -d "/home/JackChen6203/crypto-exchange-monitor" ]; then
        log_info "修復 crypto-exchange-monitor 權限"
        if [ "$CURRENT_USER" = "root" ]; then
            chown -R JackChen6203:JackChen6203 /home/JackChen6203/crypto-exchange-monitor/
        else
            sudo chown -R JackChen6203:JackChen6203 /home/JackChen6203/crypto-exchange-monitor/
        fi
        
        if [ -d "/home/JackChen6203/crypto-exchange-monitor/.git" ]; then
            cd /home/JackChen6203/crypto-exchange-monitor
            git config --global --add safe.directory /home/JackChen6203/crypto-exchange-monitor
            log_success "crypto-exchange-monitor Git 權限修復完成"
        fi
    fi
}

# 3. 立即清理備份檔案
cleanup_backups_now() {
    log_info "🧹 立即清理備份檔案"
    
    cd /home/JackChen6203/
    
    # 找到所有備份目錄
    backup_dirs=$(ls -dt crypto-exchange-monitor_backup_* 2>/dev/null || true)
    
    if [ -z "$backup_dirs" ]; then
        log_info "沒有找到備份目錄"
        return
    fi
    
    total_backups=$(echo "$backup_dirs" | wc -l)
    log_warning "找到 $total_backups 個備份目錄"
    
    # 顯示所有備份
    echo "目前的備份："
    echo "$backup_dirs"
    
    # 保留最近 3 個備份
    KEEP_BACKUPS=3
    
    if [ $total_backups -le $KEEP_BACKUPS ]; then
        log_info "備份數量在限制內 ($total_backups <= $KEEP_BACKUPS)"
        return
    fi
    
    # 計算要刪除的備份
    to_delete_count=$((total_backups - KEEP_BACKUPS))
    to_delete=$(echo "$backup_dirs" | tail -n +$((KEEP_BACKUPS + 1)))
    
    log_warning "將刪除 $to_delete_count 個舊備份"
    
    # 顯示要保留的備份
    to_keep=$(echo "$backup_dirs" | head -n $KEEP_BACKUPS)
    log_info "保留以下備份："
    echo "$to_keep"
    
    log_warning "即將刪除以下備份："
    echo "$to_delete"
    
    # 確認刪除
    echo ""
    read -p "確認刪除上述備份？(y/N): " confirm
    if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
        echo "$to_delete" | while read backup_dir; do
            if [ -d "$backup_dir" ]; then
                log_info "刪除: $backup_dir"
                rm -rf "$backup_dir"
                log_success "已刪除: $backup_dir"
            fi
        done
        
        log_success "備份清理完成！"
    else
        log_info "取消刪除操作"
    fi
}

# 4. 顯示磁碟使用情況
show_disk_usage() {
    log_info "💾 磁碟使用情況"
    
    echo "========================================"
    echo "目錄大小分析："
    du -sh /home/JackChen6203/crypto-exchange-monitor* 2>/dev/null || true
    echo "========================================"
    
    echo "總磁碟使用："
    df -h /home
    echo "========================================"
}

# 5. 測試 Git 功能
test_git_commands() {
    log_info "🧪 測試 Git 功能"
    
    if [ -d "/home/JackChen6203/exchange-watcher/.git" ]; then
        cd /home/JackChen6203/exchange-watcher
        log_info "測試 exchange-watcher Git 功能"
        
        if git status > /dev/null 2>&1; then
            log_success "✅ Git 在 exchange-watcher 中正常工作"
            echo "最近提交："
            git log --oneline -3
        else
            log_error "❌ Git 在 exchange-watcher 中仍有問題"
        fi
    fi
    
    if [ -d "/home/JackChen6203/crypto-exchange-monitor/.git" ]; then
        cd /home/JackChen6203/crypto-exchange-monitor
        log_info "測試 crypto-exchange-monitor Git 功能"
        
        if git status > /dev/null 2>&1; then
            log_success "✅ Git 在 crypto-exchange-monitor 中正常工作"
        else
            log_error "❌ Git 在 crypto-exchange-monitor 中仍有問題"
        fi
    fi
}

# 6. 檢查服務狀態
check_service_status() {
    log_info "🔍 服務狀態檢查"
    
    if systemctl is-active --quiet crypto-monitor 2>/dev/null; then
        log_success "✅ crypto-monitor 服務運行中"
        systemctl status crypto-monitor --no-pager -l
    else
        log_warning "⚠️ crypto-monitor 服務未運行或不存在"
    fi
}

# 主函數
main() {
    log_info "🎯 緊急修復腳本開始執行"
    
    show_disk_usage
    fix_git_permissions
    cleanup_backups_now
    show_disk_usage
    test_git_commands
    check_service_status
    
    log_success "🎉 緊急修復完成！"
    
    echo "========================================"
    echo "💡 下一步建議："
    echo "1. 現在可以正常使用 git 命令"
    echo "2. 檢查 CI/CD 為什麼沒有觸發"
    echo "3. 考慮手動更新 exchange-watcher 代碼"
    echo "========================================"
}

# 執行主函數
main "$@"

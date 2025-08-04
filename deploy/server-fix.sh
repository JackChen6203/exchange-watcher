#!/bin/bash

# 伺服器修復腳本
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

log_info "🔧 開始修復伺服器問題"

# 1. 修復 Git 權限問題
fix_git_permissions() {
    log_info "🔐 修復 Git 權限問題"
    
    # 檢查並修復 exchange-watcher 目錄
    if [ -d "/home/$USER/exchange-watcher" ]; then
        log_info "修復 /home/$USER/exchange-watcher 權限"
        sudo chown -R $USER:$USER /home/$USER/exchange-watcher/
        
        if [ -d "/home/$USER/exchange-watcher/.git" ]; then
            cd /home/$USER/exchange-watcher
            git config --global --add safe.directory /home/$USER/exchange-watcher
            log_success "Git 權限問題已修復"
        fi
    fi
    
    # 檢查並修復 crypto-exchange-monitor 目錄
    if [ -d "/home/$USER/crypto-exchange-monitor" ]; then
        log_info "修復 /home/$USER/crypto-exchange-monitor 權限"
        sudo chown -R $USER:$USER /home/$USER/crypto-exchange-monitor/
        
        if [ -d "/home/$USER/crypto-exchange-monitor/.git" ]; then
            cd /home/$USER/crypto-exchange-monitor
            git config --global --add safe.directory /home/$USER/crypto-exchange-monitor
            log_success "crypto-exchange-monitor Git 權限問題已修復"
        fi
    fi
}

# 2. 清理備份檔案
cleanup_backups() {
    log_info "🧹 清理備份檔案"
    
    # 找到所有備份目錄
    backup_dirs=$(ls -dt /home/$USER/crypto-exchange-monitor_backup_* 2>/dev/null || true)
    
    if [ -z "$backup_dirs" ]; then
        log_info "沒有找到備份目錄"
        return
    fi
    
    total_backups=$(echo "$backup_dirs" | wc -l)
    log_info "找到 $total_backups 個備份目錄"
    
    # 保留最近 3 個備份
    KEEP_BACKUPS=3
    
    if [ $total_backups -le $KEEP_BACKUPS ]; then
        log_info "備份數量在限制內 ($total_backups <= $KEEP_BACKUPS)，無需清理"
        return
    fi
    
    # 刪除舊備份
    to_delete_count=$((total_backups - KEEP_BACKUPS))
    to_delete=$(echo "$backup_dirs" | tail -n +$((KEEP_BACKUPS + 1)))
    
    log_warning "將刪除 $to_delete_count 個舊備份"
    
    echo "$to_delete" | while read backup_dir; do
        if [ -d "$backup_dir" ]; then
            log_info "刪除: $backup_dir"
            rm -rf "$backup_dir"
            log_success "已刪除: $backup_dir"
        fi
    done
    
    # 顯示剩餘備份
    remaining_backups=$(ls -dt /home/$USER/crypto-exchange-monitor_backup_* 2>/dev/null || true)
    if [ -n "$remaining_backups" ]; then
        log_success "剩餘 $(echo "$remaining_backups" | wc -l) 個備份"
    else
        log_info "沒有剩餘備份"
    fi
}

# 3. 顯示系統狀態
show_system_status() {
    log_info "📊 系統狀態"
    
    echo "========================================"
    echo "目錄列表："
    ls -la /home/$USER/ | grep -E "(crypto|exchange|data|logs)"
    echo "========================================"
    
    echo "磁碟使用情況："
    df -h /home
    echo "========================================"
    
    echo "服務狀態："
    if systemctl is-active --quiet crypto-monitor; then
        echo "✅ crypto-monitor 服務運行中"
    else
        echo "❌ crypto-monitor 服務未運行"
    fi
    echo "========================================"
}

# 4. 測試 Git 功能
test_git() {
    log_info "🧪 測試 Git 功能"
    
    if [ -d "/home/$USER/exchange-watcher/.git" ]; then
        cd /home/$USER/exchange-watcher
        if git status > /dev/null 2>&1; then
            log_success "✅ Git 在 exchange-watcher 中工作正常"
            echo "最近提交："
            git log --oneline -5
        else
            log_error "❌ Git 在 exchange-watcher 中仍有問題"
        fi
    fi
}

# 主函數
main() {
    log_info "🎯 伺服器修復腳本"
    
    fix_git_permissions
    cleanup_backups
    show_system_status
    test_git
    
    log_success "🎉 修復完成！"
    
    echo "========================================"
    echo "💡 建議："
    echo "1. 現在可以正常使用 git 命令"
    echo "2. 備份已清理，磁碟空間已釋放"
    echo "3. 定期運行此腳本維護系統"
    echo "========================================"
}

# 執行主函數
main "$@"

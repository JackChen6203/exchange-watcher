#!/bin/bash

# 清理備份腳本
# 清理伺服器上的舊備份檔案，釋放磁碟空間

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

# 配置變數
APP_DIR="/home/$USER/crypto-exchange-monitor"
KEEP_BACKUPS=3  # 保留最近幾個備份

log_info "🧹 開始清理備份檔案"

# 檢查備份目錄
backup_dirs=$(ls -dt ${APP_DIR}_backup_* 2>/dev/null || true)

if [ -z "$backup_dirs" ]; then
    log_info "沒有找到備份目錄"
    exit 0
fi

total_backups=$(echo "$backup_dirs" | wc -l)
log_info "找到 $total_backups 個備份目錄"

# 顯示所有備份
echo "現有備份："
echo "$backup_dirs" | nl

if [ $total_backups -le $KEEP_BACKUPS ]; then
    log_info "備份數量在限制內 ($total_backups <= $KEEP_BACKUPS)，無需清理"
    exit 0
fi

# 計算要刪除的備份
to_delete_count=$((total_backups - KEEP_BACKUPS))
to_delete=$(echo "$backup_dirs" | tail -n +$((KEEP_BACKUPS + 1)))

log_warning "將刪除 $to_delete_count 個舊備份"
echo "要刪除的備份："
echo "$to_delete"

# 確認刪除
read -p "確認刪除這些備份嗎？(y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "取消操作"
    exit 0
fi

# 執行刪除
echo "$to_delete" | while read backup_dir; do
    if [ -d "$backup_dir" ]; then
        log_info "刪除: $backup_dir"
        rm -rf "$backup_dir"
        log_success "已刪除: $backup_dir"
    fi
done

# 顯示剩餘備份
remaining_backups=$(ls -dt ${APP_DIR}_backup_* 2>/dev/null || true)
if [ -n "$remaining_backups" ]; then
    log_success "剩餘備份："
    echo "$remaining_backups" | nl
else
    log_info "沒有剩餘備份"
fi

# 顯示磁碟使用情況
log_info "磁碟使用情況："
df -h /home

log_success "🎉 清理完成！"

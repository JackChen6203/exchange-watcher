#!/bin/bash

# ⚠️ 此腳本已廢棄 - 專案已改用 GitHub Actions + systemd 進行自動部署
# 保留此文件僅供參考，請使用 GitHub Actions workflow 進行部署
# 
# 新的部署方式：
# 1. 推送代碼到 main 分支
# 2. GitHub Actions 會自動執行部署
# 3. 使用 systemd 管理服務 (crypto-monitor.service)

echo "⚠️ 此腳本已廢棄"
echo "請使用 GitHub Actions 進行自動部署"
echo "或手動使用 systemd 管理服務："
echo "  sudo systemctl start crypto-monitor"
echo "  sudo systemctl status crypto-monitor"
echo "  sudo systemctl restart crypto-monitor"

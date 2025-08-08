# Digital Ocean 部署問題排查指南

## 🚨 主要問題分析

### 問題1: 使用了錯誤的啟動腳本
**原因**: `.do/app.yaml` 原本設置為 `npm start` (指向 `src/index.js`)，但修復後的功能在 `src/enhancedIndex.js`

**解決方案**: ✅ 已修復
```yaml
# 修改前
run_command: npm start

# 修改後  
run_command: npm run start:enhanced
```

### 問題2: 缺少部署後自動測試
**原因**: Digital Ocean App Platform 部署後不會自動執行本地測試腳本

**解決方案**: ✅ 已修復
- 添加了自動實際數據測試功能
- 設置環境變數 `RUN_REAL_DATA_TEST=true` 觸發測試

### 問題3: 沒有部署驗證流程
**原因**: 缺少驗證部署是否成功的標準化流程

**解決方案**: ✅ 已新增
- 創建 `scripts/deployment-health-check.sh` 腳本
- 提供完整的健康檢查和狀態驗證

## 🔧 修復內容摘要

### 1. 配置文件修復
- ✅ 修改 `.do/app.yaml` 使用正確的啟動命令
- ✅ 添加 `RUN_REAL_DATA_TEST` 環境變數

### 2. 代碼修復  
- ✅ `src/enhancedIndex.js` 添加自動實際數據測試
- ✅ 部署後30秒自動執行數據收集測試
- ✅ 自動發送測試結果到Discord

### 3. 監控改進
- ✅ 添加部署成功通知
- ✅ 添加數據測試失敗警報
- ✅ 詳細的狀態日誌記錄

## 📋 部署後檢查清單

### 立即檢查 (部署後0-5分鐘)
- [ ] 應用是否成功啟動
- [ ] 健康檢查端點是否響應 (`/health`)
- [ ] 是否收到Discord啟動通知

### 短期檢查 (部署後5-30分鐘)  
- [ ] 是否收到實際數據測試通知
- [ ] 監控系統是否開始收集數據
- [ ] API連接是否正常

### 長期檢查 (部署後30分鐘-1小時)
- [ ] 是否收到第一次定期報告 (15分鐘週期)
- [ ] 持倉異動數據是否正確
- [ ] 資金費率數據是否正確

## 🛠️ 故障排除步驟

### Step 1: 檢查應用狀態
```bash
# 使用健康檢查腳本
bash scripts/deployment-health-check.sh https://your-app.ondigitalocean.app

# 或手動檢查
curl https://your-app.ondigitalocean.app/health
```

### Step 2: 檢查環境變數
在Digital Ocean控制台確認以下變數已設置：
- ✅ `BITGET_API_KEY` (SECRET)
- ✅ `BITGET_SECRET_KEY` (SECRET) 
- ✅ `BITGET_PASSPHRASE` (SECRET)
- ✅ `DISCORD_WEBHOOK_URL` (SECRET)
- ✅ `NODE_ENV=production`
- ✅ `RUN_REAL_DATA_TEST=true`

### Step 3: 檢查日誌
在Digital Ocean App Platform控制台查看：
1. **Build Logs**: 確認構建成功
2. **Runtime Logs**: 查看應用啟動和運行日誌

關鍵日誌信息：
```
✅ 增強型監控系統啟動成功
🌐 健康檢查伺服器已啟動，端口: 8080
🚀 部署後自動執行實際數據測試...
📊 測試合約數據收集...
✅ 實際數據報告已發送到Discord
```

### Step 4: Discord通知檢查
預期收到的Discord消息：
1. **啟動通知**: "監控系統啟動" 
2. **測試通知**: "Digital Ocean 部署成功並完成實際數據測試"
3. **數據報告**: 實際的持倉異動和資金費率報告

### Step 5: API測試
```bash
# 測試基本API連接
curl https://your-app.ondigitalocean.app/status
```

## ⚠️ 常見問題

### 問題: 應用啟動失敗
**可能原因**:
- API密鑰配置錯誤
- Discord Webhook URL無效
- 依賴包安裝失敗

**解決方案**:
1. 檢查所有SECRET類型環境變數
2. 確認API密鑰有效且有足夠權限
3. 測試Discord Webhook URL

### 問題: 健康檢查失敗
**可能原因**:
- 端口配置錯誤
- 健康檢查服務未啟動
- 初始化時間過長

**解決方案**:
1. 確認 `PORT=8080`
2. 檢查健康檢查服務器啟動日誌
3. 增加健康檢查初始延遲

### 問題: 沒有收到實際數據
**可能原因**:
- API配置問題
- 網絡連接問題
- Bitget API限制

**解決方案**:
1. 檢查Bitget API密鑰權限
2. 確認網絡出站連接正常
3. 檢查API調用頻率限制

## 🚀 重新部署步驟

如果需要重新部署：

1. **推送修復**:
```bash
git add .
git commit -m "修復 Digital Ocean 部署實際數據測試問題"
git push origin main
```

2. **等待自動部署** (在Digital Ocean控制台查看進度)

3. **執行健康檢查**:
```bash
bash scripts/deployment-health-check.sh https://your-app.ondigitalocean.app
```

4. **監控Discord通知**

## 📞 支持

如果問題仍然存在：
1. 檢查Digital Ocean App Platform日誌
2. 使用健康檢查腳本診斷
3. 確認所有環境變數正確設置
4. 檢查Bitget API狀態和權限

---
*問題排查指南更新時間: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}*
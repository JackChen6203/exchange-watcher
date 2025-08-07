#!/usr/bin/env node

/**
 * 實際數據測試腳本
 * 用於測試交易所 API 連接和數據抓取功能
 * 使用方法: node test_realdata.js
 */

const CryptoExchangeMonitor = require('./src/index');

async function testRealData() {
  console.log('🚀 開始實際數據測試...\n');
  
  try {
    const monitor = new CryptoExchangeMonitor();
    
    // 執行實際數據測試
    console.log('📧 執行測試並發送到 Discord 頻道...');
    await monitor.sendTestMessage();
    
    console.log('\n✅ 實際數據測試完成！');
    console.log('📱 請檢查您的 Discord 頻道是否收到測試消息');
    console.log('🔍 消息應包含實際的持倉量和資金費率數據');
    
  } catch (error) {
    console.error('\n❌ 測試失敗:', error.message);
    console.error('💡 請檢查:');
    console.error('   - 環境變數是否正確設置 (API密鑰、Discord Webhook)');
    console.error('   - 網絡連接是否正常');
    console.error('   - Bitget API 是否可訪問');
    
    process.exit(1);
  }
}

// 執行測試
testRealData();
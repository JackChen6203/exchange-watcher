const config = require('../src/config/config');
const BitgetMonitor = require('../src/services/bitgetMonitor');
const DiscordService = require('../src/services/discordService');

async function testBitgetConnection() {
  console.log('🧪 測試Bitget WebSocket連接和錯誤處理...');
  
  try {
    const discordService = new DiscordService(config);
    const bitgetMonitor = new BitgetMonitor(config, discordService);
    
    // 初始化監控系統
    console.log('⚙️ 初始化監控系統...');
    await bitgetMonitor.initialize();
    
    // 嘗試連接
    console.log('🔌 建立WebSocket連接...');
    await bitgetMonitor.connect();
    
    // 等待一段時間觀察連接狀態
    console.log('⏰ 等待30秒觀察連接狀態和訂閱結果...');
    
    let checkCount = 0;
    const maxChecks = 6; // 30秒，每5秒檢查一次
    
    const statusInterval = setInterval(() => {
      checkCount++;
      const status = bitgetMonitor.getStatus();
      const stats = status.subscriptionStats;
      
      console.log(`\n📊 狀態檢查 ${checkCount}/${maxChecks}:`);
      console.log(`🔗 連接狀態: ${status.isConnected ? '✅ 已連接' : '❌ 斷開'}`);
      console.log(`📡 連接組: ${status.connectedGroups}`);
      console.log(`🎯 活躍監控: ${status.monitoredSymbols}個交易對`);
      console.log(`📈 訂閱成功: ${stats.totalSubscribed}個`);
      console.log(`❌ 訂閱失敗: ${stats.totalFailed}個`);
      console.log(`✅ 成功率: ${stats.successRate}%`);
      
      if (checkCount >= maxChecks) {
        clearInterval(statusInterval);
        console.log('\n🏁 測試完成，斷開連接...');
        bitgetMonitor.disconnect();
        
        // 總結測試結果
        console.log('\n📋 測試總結:');
        if (stats.totalSubscribed > 0) {
          console.log(`✅ 成功監控 ${stats.totalSubscribed} 個交易對`);
        }
        if (stats.totalFailed > 0) {
          console.log(`⚠️ ${stats.totalFailed} 個交易對訂閱失敗（已自動處理）`);
        }
        console.log(`🎯 最終成功率: ${stats.successRate}%`);
        
        process.exit(0);
      }
    }, 5000);
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error);
    process.exit(1);
  }
}

// 優雅關閉處理
process.on('SIGINT', () => {
  console.log('\n👋 收到中斷信號，正在關閉測試...');
  process.exit(0);
});

if (require.main === module) {
  testBitgetConnection().catch(error => {
    console.error('❌ 測試啟動失敗:', error);
    process.exit(1);
  });
}
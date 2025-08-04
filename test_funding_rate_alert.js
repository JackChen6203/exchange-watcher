const config = require('./src/config/config');
const BitgetContractMonitor = require('./src/services/bitgetContractMonitor');
const DiscordService = require('./src/services/discordService');

async function testFundingRateAlert() {
  console.log('🧪 測試資金費率提醒功能...');
  
  try {
    const discordService = new DiscordService(config);
    const monitor = new BitgetContractMonitor(config, discordService);
    
    // 初始化監控器（載入數據）
    await monitor.loadContractSymbols();
    
    // 收集少量測試數據
    console.log('📊 收集測試數據...');
    const testSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
    
    for (const symbol of testSymbols) {
      try {
        const fundingRate = await monitor.bitgetApi.getFundingRate(symbol, 'umcbl');
        monitor.fundingRates.set(symbol, fundingRate);
        console.log(`✅ ${symbol}: ${(fundingRate.fundingRate * 100).toFixed(4)}%`);
      } catch (error) {
        console.log(`❌ ${symbol}: ${error.message}`);
      }
    }
    
    // 手動觸發資金費率提醒
    console.log('🔔 手動發送資金費率提醒...');
    await monitor.sendFundingRateAlert(50);
    
    console.log('✅ 測試完成！');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
  }
  
  process.exit(0);
}

testFundingRateAlert();
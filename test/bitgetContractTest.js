const BitgetApi = require('../src/services/bitgetApi');
const BitgetContractMonitor = require('../src/services/bitgetContractMonitor');
const config = require('../src/config/config');

async function testBitgetContractAPI() {
  console.log('🧪 測試Bitget合約API...');
  
  const api = new BitgetApi(config);
  
  try {
    // 測試基本連接
    console.log('\n1. 測試API連接...');
    const connection = await api.testConnection();
    console.log('連接結果:', connection ? '✅ 成功' : '❌ 失敗');
    
    // 測試獲取合約交易對
    console.log('\n2. 測試獲取合約交易對...');
    const contracts = await api.getSymbolsByProductType('umcbl');
    console.log(`獲取到 ${contracts.length} 個合約交易對`);
    
    if (contracts.length > 0) {
      console.log('前5個合約:', contracts.slice(0, 5).map(c => c.symbol));
    }
    
    // 測試批量獲取開倉量
    console.log('\n3. 測試批量獲取開倉量...');
    const openInterestData = await api.getAllOpenInterest('umcbl');
    console.log(`獲取到 ${openInterestData.length} 個開倉量數據`);
    
    if (openInterestData.length > 0) {
      console.log('前3個開倉量數據:');
      openInterestData.slice(0, 3).forEach(data => {
        console.log(`  ${data.symbol}: ${data.openInterestUsd} USD`);
      });
    }
    
    // 測試獲取資金費率
    console.log('\n4. 測試獲取資金費率...');
    const testSymbol = 'BTCUSDT';
    try {
      const fundingRate = await api.getFundingRate(testSymbol, 'umcbl');
      console.log(`${testSymbol} 資金費率: ${(fundingRate.fundingRate * 100).toFixed(4)}%`);
    } catch (error) {
      console.log(`獲取 ${testSymbol} 資金費率失敗:`, error.message);
    }
    
    console.log('\n✅ Bitget合約API測試完成');
    
  } catch (error) {
    console.error('❌ API測試失敗:', error.message);
  }
}

async function testContractMonitor() {
  console.log('\n🧪 測試合約監控系統...');
  
  // 創建一個模擬的Discord服務
  const mockDiscordService = {
    sendEmbed: async (embed) => {
      console.log('📨 模擬發送Discord消息:', embed.title);
      return Promise.resolve();
    },
    sendStartupMessage: async () => {
      console.log('📨 模擬發送啟動消息');
      return Promise.resolve();
    }
  };
  
  const monitor = new BitgetContractMonitor(config, mockDiscordService);
  
  try {
    console.log('\n1. 初始化監控系統...');
    await monitor.initialize();
    
    console.log('\n2. 檢查系統狀態...');
    const status = monitor.getStatus();
    console.log('系統狀態:', status);
    
    console.log('\n3. 模擬生成報告...');
    // 等待一些數據收集
    setTimeout(async () => {
      try {
        await monitor.generateAndSendReport();
        console.log('✅ 報告生成測試完成');
      } catch (error) {
        console.log('⚠️ 報告生成測試失敗:', error.message);
      }
      
      // 停止監控
      monitor.stop();
      console.log('\n✅ 合約監控系統測試完成');
    }, 10000); // 等待10秒
    
  } catch (error) {
    console.error('❌ 監控系統測試失敗:', error.message);
    monitor.stop();
  }
}

async function main() {
  console.log('🚀 開始Bitget合約系統測試\n');
  
  // 檢查環境變量
  if (!config.api.key || !config.api.secret || !config.api.passphrase) {
    console.error('❌ 缺少必要的API憑證，請檢查環境變量');
    console.log('需要設置: API_KEY, API_SECRET, API_PASSPHRASE');
    return;
  }
  
  // 執行測試
  await testBitgetContractAPI();
  await testContractMonitor();
}

// 執行測試
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 測試執行失敗:', error);
    process.exit(1);
  });
}

module.exports = { testBitgetContractAPI, testContractMonitor };
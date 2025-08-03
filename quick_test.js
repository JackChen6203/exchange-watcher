const BitgetApi = require('./src/services/bitgetApi');
const config = require('./src/config/config');

async function quickTest() {
  console.log('🧪 快速測試API修復...');
  
  const api = new BitgetApi(config);
  
  try {
    // 測試開倉量API
    console.log('\n1. 測試BTCUSDT開倉量...');
    const openInterest = await api.getOpenInterest('BTCUSDT', 'umcbl');
    console.log('開倉量數據:', openInterest);
    
    // 測試資金費率API
    console.log('\n2. 測試BTCUSDT資金費率...');
    const fundingRate = await api.getFundingRate('BTCUSDT', 'umcbl');
    console.log('資金費率數據:', fundingRate);
    console.log('資金費率百分比:', (fundingRate.fundingRate * 100).toFixed(4) + '%');
    
    console.log('\n✅ API修復測試完成');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error.message);
  }
}

quickTest();
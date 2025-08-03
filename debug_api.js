const axios = require('axios');

async function debugBitgetAPI() {
  const baseUrl = 'https://api.bitget.com';
  
  try {
    console.log('🔍 調試Bitget開倉量API響應格式...\n');
    
    // 測試單個合約的開倉量
    const symbol = 'BTCUSDT';
    const productType = 'usdt-futures';
    const requestPath = `/api/v2/mix/market/open-interest?symbol=${symbol}&productType=${productType}`;
    
    console.log('請求URL:', `${baseUrl}${requestPath}`);
    
    const response = await axios.get(`${baseUrl}${requestPath}`, {
      timeout: 10000
    });
    
    console.log('響應狀態:', response.status);
    console.log('響應代碼:', response.data.code);
    console.log('響應消息:', response.data.msg);
    console.log('完整響應數據:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ 調試失敗:', error.response?.data || error.message);
  }
  
  try {
    console.log('\n🔍 調試Bitget資金費率API響應格式...\n');
    
    // 測試單個合約的資金費率
    const symbol = 'BTCUSDT';
    const productType = 'usdt-futures';
    const requestPath = `/api/v2/mix/market/current-fund-rate?symbol=${symbol}&productType=${productType}`;
    
    console.log('請求URL:', `${baseUrl}${requestPath}`);
    
    const response = await axios.get(`${baseUrl}${requestPath}`, {
      timeout: 10000
    });
    
    console.log('響應狀態:', response.status);
    console.log('響應代碼:', response.data.code);
    console.log('響應消息:', response.data.msg);
    console.log('完整響應數據:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ 調試失敗:', error.response?.data || error.message);
  }
}

debugBitgetAPI();
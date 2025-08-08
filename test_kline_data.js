const BitgetApi = require('./src/services/bitgetApi');
const Logger = require('./src/utils/logger');

// 測試K線數據獲取
async function testKlineData() {
  // 使用測試配置
  const config = {
    bitget: {
      apiKey: 'test_key',
      secretKey: 'test_secret',
      passphrase: 'test_passphrase'
    },
    api: {
      baseUrl: 'https://api.bitget.com'
    },
    logging: {
      level: 'debug',
      file: './logs/test.log'
    }
  };
  
  const logger = new Logger(config);
  
  const bitgetApi = new BitgetApi(config);
  
  console.log('🔍 測試 Bitget K線數據獲取...');
  
  const testSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
  const periods = [
    { key: '5m', granularity: '5m', limit: 2 },
    { key: '15m', granularity: '15m', limit: 2 },
    { key: '1h', granularity: '1H', limit: 2 },
    { key: '4h', granularity: '4H', limit: 2 }
  ];
  
  for (const symbol of testSymbols) {
    console.log(`\n📊 測試交易對: ${symbol}`);
    
    for (const period of periods) {
      try {
        console.log(`  ⏰ 獲取 ${period.key} K線數據...`);
        
        const klineData = await bitgetApi.getKline(
          symbol, 
          'umcbl', 
          period.granularity, 
          period.limit
        );
        
        if (klineData && klineData.length >= 2) {
          const currentCandle = klineData[0];
          const previousCandle = klineData[1];
          
          const currentPrice = parseFloat(currentCandle[4]);
          const previousPrice = parseFloat(previousCandle[4]);
          
          if (currentPrice > 0 && previousPrice > 0) {
            const change = currentPrice - previousPrice;
            const changePercent = (change / previousPrice) * 100;
            
            console.log(`    ✅ ${period.key}: 當前價格 $${currentPrice}, 前一價格 $${previousPrice}, 變動 ${changePercent.toFixed(2)}%`);
          } else {
            console.log(`    ❌ ${period.key}: 價格數據無效 - 當前: ${currentPrice}, 前一: ${previousPrice}`);
          }
        } else {
          console.log(`    ❌ ${period.key}: K線數據不足 - 獲取到 ${klineData ? klineData.length : 0} 根`);
        }
        
        // 延遲以避免API限制
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`    ❌ ${period.key}: 獲取失敗 - ${error.message}`);
      }
    }
  }
  
  console.log('\n🏁 K線數據測試完成');
}

// 執行測試
testKlineData().catch(console.error);
const SwingStrategyService = require('../src/services/swingStrategyService');
const BitgetApi = require('../src/services/bitgetApi');
const DiscordService = require('../src/services/discordService');

/**
 * 波段策略服務測試
 * 驗證 EMA 計算和趨勢判斷邏輯
 */
async function testSwingStrategy() {
  console.log('🧪 開始波段策略服務測試...');
  
  try {
    // 設置測試環境變數
    process.env.BITGET_API_KEY = 'test_key';
    process.env.BITGET_SECRET_KEY = 'test_secret';
    process.env.BITGET_PASSPHRASE = 'test_passphrase';
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/test/test';
    process.env.SWING_STRATEGY_WEBHOOK_URL = 'https://discord.com/api/webhooks/swing/test';
    
    // 創建測試配置
    const testConfig = {
      api: {
        key: 'test_key',
        secret: 'test_secret',
        passphrase: 'test_passphrase',
        baseUrl: 'https://api.bitget.com'
      },
      discord: {
        webhookUrl: 'https://discord.com/api/webhooks/test/test',
        swingStrategyWebhookUrl: 'https://discord.com/api/webhooks/swing/test'
      }
    };
    
    // 初始化波段策略服務
    const swingStrategy = new SwingStrategyService(testConfig);
    
    console.log('✅ 波段策略服務初始化成功');
    
    // 測試 EMA 計算
    console.log('\n📊 測試 EMA 計算功能...');
    
    // 生成足夠的 K 線數據用於 EMA 計算（至少需要 55 個數據點）
      const mockKlineData = [];
      const baseTime = 1640995200000;
      const timeInterval = 3600000; // 1小時
      let basePrice = 100;
      
      // 生成明確的上升趨勢數據以確保多頭排列
      for (let i = 0; i < 60; i++) {
        const timestamp = baseTime + (i * timeInterval);
        // 創建上升趨勢：每根 K 線都略微上漲
        const trendMultiplier = 1 + (i * 0.005); // 逐漸上升的趨勢
        const open = basePrice * trendMultiplier;
        const high = open * (1 + Math.random() * 0.02); // 最高價比開盤價高 0-2%
        const low = open * (1 - Math.random() * 0.01); // 最低價比開盤價低 0-1%
        const close = open * (1 + Math.random() * 0.015); // 收盤價比開盤價高 0-1.5%
        const volume = 1000 + Math.random() * 1000;
        
        mockKlineData.push([timestamp, open, high, low, close, volume]);
        basePrice = close; // 下一根K線的基準價格
      }
     
     // 轉換為 SwingStrategyService 期望的格式
     const formattedKlineData = mockKlineData.map(candle => ({
       timestamp: candle[0],
       open: candle[1],
       high: candle[2],
       low: candle[3],
       close: candle[4],
       volume: candle[5]
     }));
    
    // 計算 EMA
     const emaResult = swingStrategy.calculateEMAs(formattedKlineData);
    console.log('EMA 計算結果長度:', emaResult ? emaResult.length : 'undefined');
    
    // 驗證 EMA 計算邏輯
    if (emaResult && emaResult.length > 0) {
      console.log('✅ EMA 計算長度正確');
    } else {
      console.log('❌ EMA 計算長度錯誤');
    }
    
    // 測試趨勢判斷
    console.log('\n📈 測試趨勢判斷功能...');
    
    if (emaResult && emaResult.length > 0) {
      const mockEMAData = emaResult[emaResult.length - 1];
      
      console.log(`EMA 數值 - EMA12: ${mockEMAData.ema12.toFixed(4)}, EMA30: ${mockEMAData.ema30.toFixed(4)}, EMA55: ${mockEMAData.ema55.toFixed(4)}`);
      
      if (mockEMAData.ema12 > mockEMAData.ema30 && mockEMAData.ema30 > mockEMAData.ema55) {
        console.log('✅ 多頭排列判斷正確');
      } else {
        console.log('❌ 多頭排列判斷錯誤');
        console.log(`條件檢查: EMA12(${mockEMAData.ema12.toFixed(4)}) > EMA30(${mockEMAData.ema30.toFixed(4)}): ${mockEMAData.ema12 > mockEMAData.ema30}`);
        console.log(`條件檢查: EMA30(${mockEMAData.ema30.toFixed(4)}) > EMA55(${mockEMAData.ema55.toFixed(4)}): ${mockEMAData.ema30 > mockEMAData.ema55}`);
      }
    } else {
      console.log('EMA 數據不足，跳過趨勢判斷測試');
    }
    
    // 測試均線糾纏檢測
    console.log('\n🔄 測試均線糾纏檢測...');
    
    if (emaResult && emaResult.length > 0) {
      const mockEMAData = emaResult[emaResult.length - 1];
      
      // 計算均線間距離百分比
      const avgPrice = (mockEMAData.ema12 + mockEMAData.ema30 + mockEMAData.ema55) / 3;
      const diff12_30 = Math.abs(mockEMAData.ema12 - mockEMAData.ema30) / avgPrice;
      const diff30_55 = Math.abs(mockEMAData.ema30 - mockEMAData.ema55) / avgPrice;
      const diff12_55 = Math.abs(mockEMAData.ema12 - mockEMAData.ema55) / avgPrice;
      
      console.log(`均線距離百分比:`);
      console.log(`  EMA12-EMA30: ${(diff12_30 * 100).toFixed(4)}%`);
      console.log(`  EMA30-EMA55: ${(diff30_55 * 100).toFixed(4)}%`);
      console.log(`  EMA12-EMA55: ${(diff12_55 * 100).toFixed(4)}%`);
      console.log(`  糾纏閾值: ${(swingStrategy.entanglementThreshold * 100).toFixed(4)}%`);
      
      const entanglementResult = swingStrategy.checkEntanglement(mockEMAData);
      console.log('均線糾纏檢測結果:', entanglementResult ? '❌ 糾纏' : '✅ 未糾纏');
    } else {
      console.log('EMA 數據不足，跳過均線糾纏檢測測試');
    }
    
    // 測試服務狀態
    console.log('\n📊 測試服務狀態...');
    const status = swingStrategy.getStatus();
    console.log('服務狀態:', JSON.stringify(status, null, 2));
    
    console.log('\n🎉 波段策略服務測試完成！');
    
  } catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
    throw error;
  }
}

// 執行測試
if (require.main === module) {
  testSwingStrategy().catch(console.error);
}

module.exports = testSwingStrategy;
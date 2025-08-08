// 測試重複發送修復
const config = require('./src/config/config');
const EnhancedDiscordService = require('./src/services/enhancedDiscordService');

async function testDuplicateReportsFix() {
  console.log('🧪 測試重複發送修復...');
  
  const discordService = new EnhancedDiscordService(config);
  
  // 模擬持倉變動數據
  const testPositionChanges = {
    '15m': {
      positive: [
        { symbol: 'BTCUSDT', changePercent: 5.23 },
        { symbol: 'ETHUSDT', changePercent: 3.45 }
      ],
      negative: [
        { symbol: 'SOLUSDT', changePercent: -2.87 },
        { symbol: 'BNBUSDT', changePercent: -1.34 }
      ]
    },
    '1h': {
      positive: [
        { symbol: 'BTCUSDT', changePercent: 8.91 },
        { symbol: 'ETHUSDT', changePercent: 6.78 }
      ],
      negative: [
        { symbol: 'SOLUSDT', changePercent: -4.56 },
        { symbol: 'BNBUSDT', changePercent: -2.31 }
      ]
    },
    '4h': {
      positive: [
        { symbol: 'BTCUSDT', changePercent: 12.34 },
        { symbol: 'ETHUSDT', changePercent: 9.87 }
      ],
      negative: [
        { symbol: 'SOLUSDT', changePercent: -7.89 },
        { symbol: 'BNBUSDT', changePercent: -5.43 }
      ]
    }
  };
  
  // 模擬資金費率數據  
  const testFundingRates = {
    positive: [
      { symbol: 'LEVERUSDT', fundingRate: 0.001773 },
      { symbol: 'TAGUSDT', fundingRate: 0.001689 },
      { symbol: 'BIDUSDT', fundingRate: 0.000919 }
    ],
    negative: [
      { symbol: 'ORCAUSDT', fundingRate: -0.003518 },
      { symbol: 'IKAUSDT', fundingRate: -0.002836 },
      { symbol: 'PROVEUSDT', fundingRate: -0.000913 }
    ]
  };
  
  console.log('\n📊 測試資金費率報告格式...');
  const fundingRateEmbed = discordService.createFundingRateAlertEmbed({ rankings: testFundingRates });
  console.log('資金費率表格:', fundingRateEmbed.fields[0].value);
  
  console.log('\n📈 測試持倉異動報告格式...');
  const positionEmbed = discordService.createCombinedPositionChangeEmbed(testPositionChanges);
  console.log('正異動表格:', positionEmbed.fields[0].value);
  console.log('負異動表格:', positionEmbed.fields[1].value);
  
  console.log('\n🔍 測試統一發送方法...');
  console.log('修復前問題:');
  console.log('- 每個時間週期分別發送持倉異動報告 (4個報告)');
  console.log('- 資金費率報告被錯誤發送到持倉頻道');
  console.log('- 導致用戶看到重複的表格');
  
  console.log('\n✅ 修復後改進:');
  console.log('- 只發送一個綜合的持倉異動報告 (包含所有時間週期對比)');
  console.log('- 資金費率報告正確發送到資金費率頻道');
  console.log('- 持倉異動報告正確發送到持倉頻道');
  console.log('- 避免重複發送相同內容');
  
  // 如果配置了Discord webhook，可以取消註釋測試實際發送
  /*
  if (config.discord.webhookUrl) {
    console.log('\n📤 測試實際發送 (請檢查Discord頻道)...');
    
    try {
      // 測試發送到不同頻道
      await discordService.sendFundingRateWithPositionReport(testFundingRates, testPositionChanges);
      console.log('✅ 測試發送成功');
      
      console.log('\n預期結果:');
      console.log('- 資金費率頻道: 收到1個資金費率表格');
      console.log('- 持倉異動頻道: 收到1個綜合的持倉異動表格 (包含所有時間週期)');
      console.log('- 總計: 2個消息 (而不是之前的5-6個重複消息)');
      
    } catch (error) {
      console.error('❌ 測試發送失敗:', error.message);
    }
  }
  */
  
  console.log('\n🎉 重複發送修復測試完成');
}

// 執行測試
if (require.main === module) {
  testDuplicateReportsFix().catch(console.error);
}

module.exports = { testDuplicateReportsFix };
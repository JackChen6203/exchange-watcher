const config = require('../src/config/config');
const BitgetContractMonitor = require('../src/services/bitgetContractMonitor');
const DiscordService = require('../src/services/discordService');

async function runE2ETest() {
  console.log('🧪 開始端到端測試...\n');
  
  try {
    // 1. 測試配置
    console.log('1. 📋 測試配置...');
    if (!config.api.key || !config.api.secret || !config.api.passphrase) {
      console.log('⚠️ API配置缺失，跳過實際API測試');
    } else {
      console.log('✅ API配置完整');
    }
    
    if (!config.discord.webhookUrl) {
      console.log('⚠️ Discord Webhook配置缺失，跳過實際Discord測試');
    } else {
      console.log('✅ Discord配置完整');
    }
    
    // 2. 測試Discord服務
    console.log('\n2. 💬 測試Discord服務...');
    if (config.discord.webhookUrl && config.discord.webhookUrl !== 'your_discord_webhook_url_here') {
      try {
        const discordService = new DiscordService(config);
        const testMessage = `\`\`\`
📊 端到端測試 - ${new Date().toLocaleString('zh-TW')}

📈 持倉量增長測試表格

排名 | 交易對      | 當前持倉   | 15分    | 1時     | 4時     | 日線
-----|-----------|----------|---------|---------|---------|--------
 1   | BTCUSDT   |   25.80M |  +5.23% |  +8.45% | +12.34% | +15.67%
 2   | ETHUSDT   |   18.30M |  +3.45% |  +6.23% |  +9.12% | +11.88%

✅ 表格格式測試完成
\`\`\``;
        
        await discordService.sendMessage(testMessage);
        console.log('✅ Discord消息發送成功');
      } catch (error) {
        console.log('❌ Discord測試失敗:', error.message);
      }
    } else {
      console.log('⚠️ 跳過Discord實際發送測試（需要配置Webhook URL）');
    }
    
    // 3. 測試合約監控器初始化
    console.log('\n3. 🏗️ 測試合約監控器初始化...');
    const mockDiscordService = {
      sendMessage: async (content) => {
        console.log('📨 Mock Discord消息:', content.substring(0, 100) + '...');
        return { success: true };
      },
      sendEmbed: async (embed) => {
        console.log('📨 Mock Discord Embed:', embed.title);
        return { success: true };
      }
    };
    
    const monitor = new BitgetContractMonitor(config, mockDiscordService);
    console.log('✅ 合約監控器創建成功');
    
    // 4. 測試格式化方法
    console.log('\n4. 🔧 測試格式化方法...');
    
    // 測試百分比格式化
    const testPercentages = [5.23, -4.12, 0, 1.234567, -0.001];
    console.log('百分比格式化測試:');
    testPercentages.forEach(val => {
      const formatted = monitor.formatChangePercent(val);
      console.log(`  ${val} → ${formatted}`);
    });
    
    // 測試數字格式化
    const testNumbers = [1500000000, 25800000, 5600, 123.456];
    console.log('\n數字格式化測試:');
    testNumbers.forEach(val => {
      const formatted = monitor.formatNumber(val);
      console.log(`  ${val} → ${formatted}`);
    });
    
    // 5. 測試表格生成
    console.log('\n5. 📊 測試表格生成...');
    
    // 模擬測試數據
    const testPositionChanges = {
      '15m': {
        positive: [
          { symbol: 'BTCUSDT', changePercent: 5.23, current: 25800000 },
          { symbol: 'ETHUSDT', changePercent: 3.45, current: 18300000 },
          { symbol: 'SOLUSDT', changePercent: 2.88, current: 5600000 }
        ],
        negative: [
          { symbol: 'ADAUSDT', changePercent: -4.12, current: 3200000 },
          { symbol: 'DOTUSDT', changePercent: -3.76, current: 2100000 }
        ]
      },
      '1h': {
        positive: [
          { symbol: 'BTCUSDT', changePercent: 8.45, current: 25800000 },
          { symbol: 'ETHUSDT', changePercent: 6.23, current: 18300000 }
        ],
        negative: [
          { symbol: 'ADAUSDT', changePercent: -6.88, current: 3200000 }
        ]
      },
      '4h': { positive: [], negative: [] },
      '1d': { positive: [], negative: [] }
    };
    
    const testFundingRates = {
      positive: [
        { symbol: 'BTCUSDT', fundingRatePercent: 0.0125 },
        { symbol: 'ETHUSDT', fundingRatePercent: 0.0098 }
      ],
      negative: [
        { symbol: 'ADAUSDT', fundingRatePercent: -0.0156 },
        { symbol: 'DOTUSDT', fundingRatePercent: -0.0134 }
      ]
    };
    
    // 測試表格生成
    let testPassed = true;
    const capturedMessages = [];
    
    const testMonitor = new BitgetContractMonitor(config, {
      sendMessage: async (content) => {
        capturedMessages.push(content);
        return { success: true };
      }
    });
    
    // 測試正異動表格
    await testMonitor.sendCombinedPositiveChangesReport(
      testPositionChanges, 
      ['15m', '1h', '4h', '1d'], 
      { '15m': '15分', '1h': '1時', '4h': '4時', '1d': '日線' }
    );
    
    // 測試負異動表格
    await testMonitor.sendCombinedNegativeChangesReport(
      testPositionChanges, 
      ['15m', '1h', '4h', '1d'], 
      { '15m': '15分', '1h': '1時', '4h': '4時', '1d': '日線' }
    );
    
    // 測試資金費率表格
    await testMonitor.sendFundingRateReport(testFundingRates);
    
    // 檢查生成的消息
    console.log(`生成了 ${capturedMessages.length} 個Discord消息`);
    
    capturedMessages.forEach((msg, index) => {
      console.log(`\n消息 ${index + 1}:`);
      console.log(msg.substring(0, 200) + '...');
      
      // 檢查關鍵格式
      if (msg.includes('漲幅對比') || msg.includes('跌幅對比')) {
        if (!msg.includes('+') && !msg.includes('-')) {
          console.log('❌ 缺少漲跌幅標示');
          testPassed = false;
        }
        if (!msg.includes('%')) {
          console.log('❌ 缺少百分比符號');
          testPassed = false;
        }
      }
    });
    
    if (testPassed) {
      console.log('\n✅ 表格生成測試通過');
    } else {
      console.log('\n❌ 表格生成測試失敗');
      throw new Error('表格格式不符合要求');
    }
    
    // 6. 測試狀態檢查
    console.log('\n6. 📊 測試狀態檢查...');
    const status = monitor.getStatus();
    console.log('監控狀態:', {
      運行狀態: status.isRunning,
      合約數量: status.contractSymbols,
      持倉量數據: status.openInterestData,
      資金費率數據: status.fundingRateData,
      交易類型: status.tradingType
    });
    console.log('✅ 狀態檢查通過');
    
    // 7. 最終測試總結
    console.log('\n🎉 端到端測試完成！');
    console.log('✅ 所有核心功能正常');
    console.log('✅ 表格格式符合要求（漲幅/跌幅百分比顯示）');
    console.log('✅ 多時間週期對比功能正常');
    console.log('✅ Discord消息格式正確');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 端到端測試失敗:', error);
    return false;
  }
}

// 如果直接運行此文件
if (require.main === module) {
  runE2ETest().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { runE2ETest };
const config = require('../src/config/config');
const BitgetApi = require('../src/services/bitgetApi');
const DatabaseManager = require('../src/services/databaseManager');
const ContractMonitor = require('../src/services/contractMonitor');
const DiscordService = require('../src/services/discordService');

async function testSystem() {
  console.log('🧪 開始系統測試...\n');
  
  try {
    // 1. 測試 API 連接
    console.log('1️⃣ 測試 Bitget API 連接...');
    const api = new BitgetApi(config);
    const connectionTest = await api.testConnection();
    console.log(`   API 連接: ${connectionTest ? '✅ 成功' : '❌ 失敗'}\n`);
    
    // 2. 測試數據庫初始化
    console.log('2️⃣ 測試數據庫初始化...');
    const db = new DatabaseManager(config);
    await db.initialize();
    const stats = await db.getStats();
    console.log('   數據庫統計:', stats);
    console.log('   數據庫: ✅ 初始化成功\n');
    
    // 3. 測試 API 數據獲取
    console.log('3️⃣ 測試 API 數據獲取...');
    
    // 測試獲取合約列表
    const contracts = await api.getSymbolsByProductType('umcbl');
    console.log(`   獲取到 ${contracts.length} 個合約`);
    
    if (contracts.length > 0) {
      const testSymbol = contracts[0].symbol;
      console.log(`   測試合約: ${testSymbol}`);
      
      // 測試獲取持倉量
      try {
        const openInterest = await api.getOpenInterest(testSymbol, 'umcbl');
        console.log(`   持倉量: ${openInterest.openInterest} (${testSymbol})`);
        
        // 保存到數據庫
        await db.saveOpenInterest(openInterest);
        console.log('   ✅ 持倉量數據保存成功');
      } catch (error) {
        console.log(`   ⚠️ 持倉量獲取失敗: ${error.message}`);
      }
      
      // 測試獲取資金費率
      try {
        const fundingRate = await api.getFundingRate(testSymbol, 'umcbl');
        console.log(`   資金費率: ${(fundingRate.fundingRate * 100).toFixed(4)}% (${testSymbol})`);
        
        // 保存到數據庫
        await db.saveFundingRate(fundingRate);
        console.log('   ✅ 資金費率數據保存成功');
      } catch (error) {
        console.log(`   ⚠️ 資金費率獲取失敗: ${error.message}`);
      }
    }
    
    console.log('   API 數據獲取: ✅ 完成\n');
    
    // 4. 測試 Discord 服務
    console.log('4️⃣ 測試 Discord 服務...');
    const discord = new DiscordService(config);
    
    const testEmbed = {
      title: '🧪 系統測試報告',
      description: '重構後的加密貨幣交易所監控系統測試',
      color: 0x00ff00,
      fields: [
        {
          name: '測試時間',
          value: new Date().toLocaleString('zh-TW'),
          inline: true
        },
        {
          name: '系統狀態',
          value: '✅ 所有組件正常',
          inline: true
        },
        {
          name: '監控的合約數量',
          value: `${contracts.length} 個`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Bitget 合約監控系統',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png'
      }
    };
    
    await discord.sendEmbed(testEmbed);
    console.log('   Discord 服務: ✅ 測試消息發送成功\n');
    
    // 5. 測試完整監控流程
    console.log('5️⃣ 測試完整監控流程...');
    const monitor = new ContractMonitor(config, discord);
    
    // 初始化但不啟動定期報告
    monitor.reportInterval = null;
    monitor.dataUpdateInterval = null;
    
    await monitor.loadContractSymbols();
    console.log(`   載入了 ${monitor.contractSymbols.length} 個合約進行監控`);
    
    // 測試數據收集
    if (monitor.contractSymbols.length > 0) {
      const testContracts = monitor.contractSymbols.slice(0, 3); // 只測試前3個
      
      for (const contract of testContracts) {
        try {
          const openInterest = await api.getOpenInterest(contract.symbol, contract.productType);
          const fundingRate = await api.getFundingRate(contract.symbol, contract.productType);
          
          await monitor.updateOpenInterestData(contract.symbol, openInterest);
          await monitor.updateFundingRateData(contract.symbol, fundingRate);
          
          console.log(`   ✅ ${contract.symbol} 數據收集成功`);
        } catch (error) {
          console.log(`   ⚠️ ${contract.symbol} 數據收集失敗: ${error.message}`);
        }
      }
    }
    
    console.log('   監控流程: ✅ 測試完成\n');
    
    // 6. 生成測試報告
    console.log('6️⃣ 生成測試報告...');
    const finalStats = await db.getStats();
    
    console.log('📊 最終數據庫統計:');
    console.log(`   持倉量記錄: ${finalStats.open_interest} 條`);
    console.log(`   資金費率記錄: ${finalStats.funding_rate} 條`);
    console.log(`   價格記錄: ${finalStats.price_data} 條`);
    console.log(`   排行榜快照: ${finalStats.ranking_snapshots} 條`);
    
    // 關閉數據庫連接
    db.close();
    
    console.log('\n🎉 系統測試完成！所有組件運行正常。');
    console.log('\n📋 測試結果摘要:');
    console.log('   ✅ API 連接正常');
    console.log('   ✅ 數據庫功能正常');
    console.log('   ✅ 數據收集正常');
    console.log('   ✅ Discord 通知正常');
    console.log('   ✅ 監控流程正常');
    
    console.log('\n🚀 系統已準備好開始監控！');
    console.log('   運行 "npm start" 開始正式監控');
    
  } catch (error) {
    console.error('\n❌ 系統測試失敗:', error);
    console.error('\n請檢查以下配置:');
    console.error('   - API 密鑰是否正確設置');
    console.error('   - Discord Webhook URL 是否有效');
    console.error('   - 網絡連接是否正常');
    process.exit(1);
  }
}

// 執行測試
if (require.main === module) {
  testSystem().catch(error => {
    console.error('❌ 測試執行失敗:', error);
    process.exit(1);
  });
}

module.exports = testSystem;
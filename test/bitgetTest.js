const config = require('../src/config/config');
const BitgetApi = require('../src/services/bitgetApi');
const DiscordService = require('../src/services/discordService');

async function testBitgetApi() {
  console.log('🧪 測試Bitget API...');
  
  try {
    const bitgetApi = new BitgetApi(config);
    
    // 測試基本連接
    console.log('🔌 測試API連接...');
    const connectionTest = await bitgetApi.testConnection();
    
    if (!connectionTest) {
      throw new Error('API連接測試失敗');
    }
    
    // 測試獲取交易對（不需要認證）
    console.log('📊 測試獲取交易對...');
    try {
      const symbols = await bitgetApi.getAllContractSymbols();
      console.log(`✅ 成功獲取 ${symbols.length} 個交易對`);
      
      // 顯示前10個交易對
      console.log('🔝 前10個交易對:');
      symbols.slice(0, 10).forEach((symbol, index) => {
        console.log(`${index + 1}. ${symbol.symbol} (${symbol.productType})`);
      });
    } catch (error) {
      console.warn('⚠️ 獲取交易對失敗，可能需要API認證:', error.message);
    }
    
    // 測試獲取ticker數據（不需要認證） - 先檢查原始格式
    console.log('📈 測試獲取ticker數據...');
    try {
      // 先直接調用API查看原始格式
      const axios = require('axios');
      const rawResponse = await axios.get(`${config.api.baseUrl}/api/mix/v1/market/tickers?productType=umcbl`, {
        timeout: 15000
      });
      
      if (rawResponse.data.code === '00000' && rawResponse.data.data && rawResponse.data.data.length > 0) {
        console.log('🔍 原始API響應格式:', JSON.stringify(rawResponse.data.data[0], null, 2));
      }
      
      const tickers = await bitgetApi.getAllTickers('umcbl');
      console.log(`✅ 成功獲取 ${tickers.length} 個ticker數據`);
      
      // 顯示前5個ticker
      console.log('📊 前5個ticker數據:');
      tickers.slice(0, 5).forEach((ticker, index) => {
        console.log(`${index + 1}. ${ticker.symbol}: $${ticker.lastPrice} (${ticker.changePercent24h > 0 ? '+' : ''}${ticker.changePercent24h.toFixed(2)}%)`);
      });
      
    } catch (error) {
      console.warn('⚠️ 獲取ticker失敗:', error.message);
    }
    
    console.log('✅ Bitget API基本測試完成！');
    
  } catch (error) {
    console.error('❌ Bitget API測試失敗:', error);
  }
}

async function testBitgetApiAuth() {
  console.log('🔐 測試Bitget API認證...');
  
  if (!config.api.key || !config.api.secret || !config.api.passphrase) {
    console.warn('⚠️ 缺少API認證信息，跳過認證測試');
    console.log('💡 請在.env文件中設置API_KEY, API_SECRET, API_PASSPHRASE');
    return;
  }
  
  try {
    const bitgetApi = new BitgetApi(config);
    
    // 測試認證
    const authTest = await bitgetApi.testAuth();
    
    if (authTest) {
      console.log('✅ API認證測試成功');
    } else {
      console.error('❌ API認證測試失敗');
    }
    
  } catch (error) {
    console.error('❌ API認證測試失敗:', error);
  }
}

async function testDiscordNotification() {
  console.log('📢 測試Discord通知...');
  
  try {
    const discordService = new DiscordService(config);
    
    // 發送Bitget測試通知
    const testEmbed = {
      title: '🧪 Bitget監控系統測試',
      description: '這是Bitget交易所監控系統的測試通知',
      color: 0x0099ff,
      fields: [
        {
          name: '交易所',
          value: 'Bitget',
          inline: true
        },
        {
          name: '監控類型',
          value: '全幣種價格監控',
          inline: true
        },
        {
          name: '測試時間',
          value: new Date().toLocaleString('zh-TW'),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Bitget監控系統測試',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png'
      }
    };

    await discordService.sendEmbed(testEmbed);
    console.log('✅ Discord測試通知發送成功');
    
  } catch (error) {
    console.error('❌ Discord測試通知失敗:', error);
  }
}

async function testPriceAlert() {
  console.log('🚨 測試價格警報...');
  
  try {
    const discordService = new DiscordService(config);
    
    // 模擬價格警報
    await discordService.sendAlert('price_alert', {
      symbol: 'BTCUSDT_UMCBL',
      price: 45678.90,
      changePercent: 7.5,
      volume24h: 125000000
    });
    
    console.log('✅ 價格警報測試成功');
    
  } catch (error) {
    console.error('❌ 價格警報測試失敗:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  console.log('🚀 Bitget交易所監控系統測試');
  console.log('=====================================');
  
  if (args.includes('--api')) {
    await testBitgetApi();
  } else if (args.includes('--auth')) {
    await testBitgetApiAuth();
  } else if (args.includes('--discord')) {
    await testDiscordNotification();
  } else if (args.includes('--alert')) {
    await testPriceAlert();
  } else if (args.includes('--all')) {
    await testBitgetApi();
    console.log('');
    await testBitgetApiAuth();
    console.log('');
    await testDiscordNotification();
    console.log('');
    await testPriceAlert();
  } else {
    console.log('🧪 可用的測試選項:');
    console.log('  --api     測試Bitget API基本功能');
    console.log('  --auth    測試API認證');
    console.log('  --discord 測試Discord通知');
    console.log('  --alert   測試價格警報');
    console.log('  --all     運行所有測試');
    console.log('');
    console.log('📖 使用範例:');
    console.log('  node test/bitgetTest.js --api');
    console.log('  node test/bitgetTest.js --all');
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 測試過程中發生錯誤:', error);
    process.exit(1);
  });
}
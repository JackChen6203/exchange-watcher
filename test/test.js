const config = require('../src/config/config');
const DiscordService = require('../src/services/discordService');

async function testDiscordWebhook() {
  console.log('🧪 開始測試Discord Webhook...');
  
  try {
    const discordService = new DiscordService(config);
    
    // 測試基本消息
    console.log('📧 測試基本消息...');
    await discordService.sendMessage('🧪 這是一條測試消息');
    
    // 測試價格警報
    console.log('📈 測試價格警報...');
    await discordService.sendAlert('price_alert', {
      symbol: 'BTC-USDT',
      price: 45000.5678,
      changePercent: 5.25,
      volume24h: 1250000000
    });
    
    // 測試持倉警報
    console.log('💰 測試持倉警報...');
    await discordService.sendAlert('position_alert', {
      symbol: 'ETH-USDT',
      sizeChange: 0.5,
      currentSize: 2.5,
      avgPrice: 3200.45,
      pnlChange: 150.25,
      currentPnl: 320.75
    });
    
    // 測試系統警報
    console.log('⚠️ 測試系統警報...');
    await discordService.sendAlert('system_alert', {
      message: '這是一個測試系統警報',
      level: 'info',
      details: '測試詳細信息'
    });
    
    console.log('✅ 所有測試完成！');
    
  } catch (error) {
    console.error('❌ 測試失敗:', error);
    process.exit(1);
  }
}

async function testConfig() {
  console.log('🔧 測試配置...');
  
  console.log('API配置:', {
    hasKey: !!config.api.key,
    hasSecret: !!config.api.secret,
    hasPassphrase: !!config.api.passphrase,
    baseUrl: config.api.baseUrl,
    wsUrl: config.api.wsUrl
  });
  
  console.log('Discord配置:', {
    webhookUrl: config.discord.webhookUrl ? '已設置' : '未設置'
  });
  
  console.log('監控閾值:', config.thresholds);
  console.log('監控交易對:', config.symbols);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--config')) {
    await testConfig();
  } else if (args.includes('--discord')) {
    await testDiscordWebhook();
  } else {
    console.log('可用的測試選項:');
    console.log('  --config   測試配置');
    console.log('  --discord  測試Discord webhook');
    console.log('');
    console.log('範例:');
    console.log('  npm test -- --discord');
    console.log('  node test/test.js --config');
  }
}

if (require.main === module) {
  main().catch(console.error);
}
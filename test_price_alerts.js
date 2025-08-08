// 測試價格警報功能
const config = require('./src/config/config');
const BitgetApi = require('./src/services/bitgetApi');
const EnhancedDiscordService = require('./src/services/enhancedDiscordService');
const Logger = require('./src/utils/logger');

async function testPriceAlerts() {
    console.log('🧪 測試價格警報功能...\n');
    
    const logger = new Logger(config);
    const bitgetApi = new BitgetApi(config);
    const discordService = new EnhancedDiscordService(config);
    
    console.log('📋 配置檢查:');
    console.log('價格變動閾值:', config.thresholds.priceChange + '%');
    console.log('價格警報Webhook:', config.discord.priceAlertWebhookUrl ? '✅ 已配置' : '❌ 未配置 (將使用預設頻道)');
    
    // 1. 測試價格警報 Embed 生成
    console.log('\n📊 1. 測試價格警報 Embed 生成');
    const testAlerts = [
        {
            symbol: 'BTCUSDT',
            price: 50000,
            changePercent: 8.5,
            volume24h: 2500000000,
            priceChanges: {
                '15m': 1.2,
                '30m': 3.8,
                '1h': 5.4,
                '4h': 8.5
            }
        },
        {
            symbol: 'ETHUSDT', 
            price: 3200,
            changePercent: -6.2,
            volume24h: 1800000000,
            priceChanges: {
                '15m': -0.8,
                '30m': -2.1,
                '1h': -4.3,
                '4h': -6.2
            }
        },
        {
            symbol: 'SOLUSDT',
            price: 180,
            changePercent: 12.8,
            volume24h: 890000000,
            priceChanges: {
                '15m': 2.1,
                '30m': 5.7,
                '1h': 9.2,
                '4h': 12.8
            }
        }
    ];
    
    testAlerts.forEach(alert => {
        const embed = discordService.createPriceAlertEmbed(alert);
        console.log(`\n${alert.symbol}:`);
        console.log('標題:', embed.title);
        console.log('變動:', (alert.changePercent > 0 ? '+' : '') + alert.changePercent + '%');
        console.log('價格變動:', Object.entries(alert.priceChanges)
            .map(([period, change]) => `${period}: ${change > 0 ? '+' : ''}${change}%`)
            .join(', '));
    });
    
    // 2. 檢查當前市場是否有觸發警報的變動
    console.log('\n📈 2. 檢查當前市場價格變動');
    try {
        const contracts = await bitgetApi.getAllContracts('umcbl');
        const majorPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT', 'LTCUSDT'];
        
        const significantChanges = [];
        const threshold = config.thresholds.priceChange;
        
        for (const symbol of majorPairs) {
            const contract = contracts.find(c => c.symbol === symbol);
            if (contract) {
                try {
                    const ticker = await bitgetApi.getTicker(symbol, 'umcbl');
                    if (ticker && ticker.chgUtc) {
                        const change24h = parseFloat(ticker.chgUtc);
                        const price = parseFloat(ticker.lastPr);
                        
                        console.log(`${symbol.padEnd(10)}: $${price.toFixed(2).padStart(10)} | ${(change24h > 0 ? '+' : '')}${change24h.toFixed(2)}%`);
                        
                        if (Math.abs(change24h) > threshold) {
                            console.log(`  🚨 超過閾值 ${threshold}%!`);
                            significantChanges.push({
                                symbol,
                                price,
                                changePercent: change24h,
                                volume24h: parseFloat(ticker.baseVolume) || 0
                            });
                        }
                    }
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (error) {
                    console.log(`${symbol.padEnd(10)}: ❌ 獲取失敗`);
                }
            }
        }
        
        if (significantChanges.length > 0) {
            console.log(`\n✅ 發現 ${significantChanges.length} 個符合警報條件的變動`);
            significantChanges.forEach(change => {
                console.log(`  ${change.symbol}: ${change.changePercent > 0 ? '+' : ''}${change.changePercent.toFixed(2)}%`);
            });
        } else {
            console.log(`\n⚠️  當前沒有超過 ${threshold}% 的價格變動`);
        }
        
    } catch (error) {
        console.error('❌ 檢查市場價格失敗:', error.message);
    }
    
    // 3. 手動觸發價格警報測試
    console.log('\n📧 3. 手動觸發價格警報測試');
    
    if (config.discord.webhookUrl) {
        console.log('發送測試價格警報...');
        
        try {
            const testAlert = {
                symbol: 'BTCUSDT',
                price: 50000,
                changePercent: 5.2,
                volume24h: 2500000000,
                priceChanges: {
                    '15m': 1.1,
                    '30m': 2.8,  
                    '1h': 4.1,
                    '4h': 5.2
                }
            };
            
            console.log('測試數據:', testAlert.symbol, `${testAlert.changePercent}%`);
            console.log('目標頻道:', config.discord.priceAlertWebhookUrl ? 'price_alert' : 'default');
            
            // 取消註釋以發送實際測試
            /*
            await discordService.sendAlert('price_alert', testAlert);
            console.log('✅ 價格警報測試發送成功');
            console.log('請檢查Discord頻道是否收到測試警報');
            */
            
            console.log('💡 如需實際測試發送，請取消腳本中的註釋');
            
        } catch (error) {
            console.error('❌ 價格警報測試失敗:', error.message);
        }
    } else {
        console.log('⚠️  Discord Webhook 未配置，跳過發送測試');
    }
    
    // 4. 給出診斷建議
    console.log('\n🎯 4. 診斷建議');
    
    if (!config.discord.priceAlertWebhookUrl) {
        console.log('🔧 建議設置專用價格警報頻道:');
        console.log('   1. 在Discord創建 #price-alerts 頻道');
        console.log('   2. 創建該頻道的 Webhook');
        console.log('   3. 設置環境變數 PRICE_ALERT_WEBHOOK_URL');
    }
    
    console.log('\n💡 監控優化建議:');
    console.log('- 當前閾值:', config.thresholds.priceChange + '% (較容易觸發)');
    console.log('- 監控間隔: 3分鐘 (可考慮縮短為1-2分鐘)');
    console.log('- 建議在市場波動較大時測試');
    console.log('- 系統需要運行一段時間累積歷史價格數據');
    
    console.log('\n🎉 價格警報測試完成');
}

// 執行測試
if (require.main === module) {
    testPriceAlerts().catch(console.error);
}

module.exports = { testPriceAlerts };
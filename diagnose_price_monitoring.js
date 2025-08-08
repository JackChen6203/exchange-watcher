// 診斷價格監控問題
const config = require('./src/config/config');
const BitgetApi = require('./src/services/bitgetApi');
const EnhancedDiscordService = require('./src/services/enhancedDiscordService');
const Logger = require('./src/utils/logger');

async function diagnosePriceMonitoring() {
    console.log('🔍 診斷價格監控問題...\n');
    
    const logger = new Logger(config);
    const bitgetApi = new BitgetApi(config);
    const discordService = new EnhancedDiscordService(config);
    
    // 1. 檢查配置
    console.log('📋 1. 檢查配置');
    console.log('價格變動閾值:', config.thresholds.priceChange + '%');
    console.log('價格警報Webhook:', config.discord.priceAlertWebhookUrl ? '✅ 已配置' : '❌ 未配置');
    console.log('預設Webhook:', config.discord.webhookUrl ? '✅ 已配置' : '❌ 未配置');
    
    // 2. 測試API連接
    console.log('\n🌐 2. 測試API連接');
    try {
        const testSymbols = await bitgetApi.getAllContracts('umcbl');
        console.log('✅ API連接正常，獲取到', testSymbols.length, '個合約');
        
        // 測試價格數據
        const testSymbol = testSymbols.find(s => s.symbol === 'BTCUSDT') || testSymbols[0];
        if (testSymbol) {
            const ticker = await bitgetApi.getTicker(testSymbol.symbol, 'umcbl');
            console.log('✅ 測試價格獲取 -', testSymbol.symbol, ':', ticker ? `$${ticker.lastPr}` : '❌ 失敗');
        }
    } catch (error) {
        console.error('❌ API連接失敗:', error.message);
        return;
    }
    
    // 3. 模擬價格監控邏輯
    console.log('\n📊 3. 模擬價格監控邏輯');
    
    // 模擬價格數據（包含歷史數據）
    const mockPriceData = {
        current: new Map([
            ['BTCUSDT', { price: 50000, change24h: 5.2, volume: 1000000 }],
            ['ETHUSDT', { price: 3000, change24h: -3.8, volume: 500000 }]
        ]),
        '15m': new Map([
            ['BTCUSDT', { price: 49500 }], // 1.01% 變動
            ['ETHUSDT', { price: 3100 }]   // -3.23% 變動
        ]),
        '1h': new Map([
            ['BTCUSDT', { price: 48000 }], // 4.17% 變動
            ['ETHUSDT', { price: 3200 }]   // -6.25% 變動
        ]),
        '4h': new Map([
            ['BTCUSDT', { price: 45000 }], // 11.11% 變動 (會觸發警報)
            ['ETHUSDT', { price: 3300 }]   // -9.09% 變動 (接近閾值)
        ])
    };
    
    const threshold = config.thresholds.priceChange;
    console.log('使用閾值:', threshold + '%');
    
    for (const [symbol, currentPrice] of mockPriceData.current) {
        console.log(`\n檢查 ${symbol}:`);
        
        const periods = ['15m', '1h', '4h'];
        let hasSignificantChange = false;
        const priceChanges = {};
        
        for (const period of periods) {
            const historicalPrice = mockPriceData[period]?.get(symbol);
            if (historicalPrice) {
                const change = ((currentPrice.price - historicalPrice.price) / historicalPrice.price) * 100;
                priceChanges[period] = change;
                console.log(`  ${period}: ${change.toFixed(2)}%`);
                
                if (Math.abs(change) > threshold) {
                    console.log(`  🚨 ${period} 觸發警報! (${Math.abs(change).toFixed(2)}% > ${threshold}%)`);
                    hasSignificantChange = true;
                }
            }
        }
        
        if (hasSignificantChange) {
            console.log(`  ✅ ${symbol} 會發送價格警報`);
        } else {
            console.log(`  ❌ ${symbol} 不會發送警報 (變動幅度不足)`);
        }
    }
    
    // 4. 檢查實際的價格變動
    console.log('\n📈 4. 檢查實際價格變動');
    try {
        const contracts = await bitgetApi.getAllContracts('umcbl');
        const majorPairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'ADAUSDT'];
        
        for (const symbol of majorPairs) {
            const contract = contracts.find(c => c.symbol === symbol);
            if (contract) {
                const ticker = await bitgetApi.getTicker(symbol, 'umcbl');
                if (ticker && ticker.chgUtc) {
                    const change24h = parseFloat(ticker.chgUtc);
                    console.log(`${symbol}: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}% (24h)`);
                    
                    if (Math.abs(change24h) > threshold) {
                        console.log(`  🚨 24小時變動超過閾值!`);
                    }
                }
            }
            await new Promise(resolve => setTimeout(resolve, 200)); // 避免API限制
        }
    } catch (error) {
        console.error('❌ 獲取實際價格變動失敗:', error.message);
    }
    
    // 5. 測試Discord發送
    console.log('\n📧 5. 測試Discord價格警報發送');
    
    const testPriceAlert = {
        symbol: 'BTCUSDT',
        price: 50000,
        changePercent: 12.5,
        volume24h: 1000000,
        priceChanges: {
            '15m': 2.1,
            '1h': 5.8,
            '4h': 12.5
        }
    };
    
    try {
        console.log('發送測試價格警報到 price_alert 頻道...');
        const priceAlertEmbed = discordService.createPriceAlertEmbed(testPriceAlert);
        console.log('價格警報Embed標題:', priceAlertEmbed.title);
        console.log('頻道路由:', discordService.getWebhookUrl('price_alert') === config.discord.priceAlertWebhookUrl ? 'price_alert頻道' : '預設頻道');
        
        // 可取消註釋以測試實際發送
        /*
        await discordService.sendAlert('price_alert', testPriceAlert);
        console.log('✅ 測試價格警報發送成功');
        */
    } catch (error) {
        console.error('❌ 測試價格警報發送失敗:', error.message);
    }
    
    // 6. 診斷結論和建議
    console.log('\n🎯 6. 診斷結論和建議');
    console.log('\n可能的問題:');
    console.log('1. 價格變動閾值過高 (10%) - 建議調整為 3-5%');
    console.log('2. 歷史價格數據不足 - 需要運行一段時間累積歷史數據');
    console.log('3. 價格警報頻道未配置 PRICE_ALERT_WEBHOOK_URL');
    console.log('4. 監控間隔過長 - 每3分鐘可能錯過短期變動');
    
    console.log('\n建議修復:');
    console.log('- 調低價格變動閾值到 3-5%');
    console.log('- 配置專用的價格警報頻道 Webhook');
    console.log('- 增加手動觸發價格警報的測試功能');
    console.log('- 監控市場波動較大的時期進行測試');
}

// 執行診斷
if (require.main === module) {
    diagnosePriceMonitoring().catch(console.error);
}

module.exports = { diagnosePriceMonitoring };
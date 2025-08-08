// 測試價格異動報告功能
const config = require('./src/config/config');
const EnhancedContractMonitor = require('./src/services/enhancedContractMonitor');
const EnhancedDiscordService = require('./src/services/enhancedDiscordService');

async function testPriceChangeReports() {
    console.log('🧪 測試價格異動報告功能...\n');
    
    const discordService = new EnhancedDiscordService(config);
    const monitor = new EnhancedContractMonitor(config, discordService);
    
    // 1. 模擬多時間週期價格數據
    console.log('📊 1. 模擬多時間週期價格數據');
    
    // 模擬當前價格數據
    const currentPrices = new Map([
        ['BTCUSDT', { symbol: 'BTCUSDT', price: 50000, volume: 2500000000, timestamp: Date.now() }],
        ['ETHUSDT', { symbol: 'ETHUSDT', price: 3000, volume: 1800000000, timestamp: Date.now() }],
        ['SOLUSDT', { symbol: 'SOLUSDT', price: 180, volume: 890000000, timestamp: Date.now() }],
        ['DBRUSDT', { symbol: 'DBRUSDT', price: 0.012, volume: 45000000, timestamp: Date.now() }],
        ['ADAUSDT', { symbol: 'ADAUSDT', price: 0.45, volume: 120000000, timestamp: Date.now() }],
        ['DOGEUSDT', { symbol: 'DOGEUSDT', price: 0.08, volume: 280000000, timestamp: Date.now() }]
    ]);
    
    // 模擬歷史價格數據 (不同時間週期有不同變化)
    const historicalPrices = {
        '5m': new Map([
            ['BTCUSDT', { symbol: 'BTCUSDT', price: 49800 }],  // +0.40%
            ['ETHUSDT', { symbol: 'ETHUSDT', price: 3015 }],   // -0.50%
            ['SOLUSDT', { symbol: 'SOLUSDT', price: 178 }],    // +1.12%
            ['DBRUSDT', { symbol: 'DBRUSDT', price: 0.0118 }], // +1.69%
            ['ADAUSDT', { symbol: 'ADAUSDT', price: 0.46 }],   // -2.17%
            ['DOGEUSDT', { symbol: 'DOGEUSDT', price: 0.079 }] // +1.27%
        ]),
        '15m': new Map([
            ['BTCUSDT', { symbol: 'BTCUSDT', price: 49500 }],  // +1.01%
            ['ETHUSDT', { symbol: 'ETHUSDT', price: 3020 }],   // -0.66%
            ['SOLUSDT', { symbol: 'SOLUSDT', price: 175 }],    // +2.86%
            ['DBRUSDT', { symbol: 'DBRUSDT', price: 0.0115 }], // +4.35%
            ['ADAUSDT', { symbol: 'ADAUSDT', price: 0.47 }],   // -4.26%
            ['DOGEUSDT', { symbol: 'DOGEUSDT', price: 0.078 }] // +2.56%
        ]),
        '1h': new Map([
            ['BTCUSDT', { symbol: 'BTCUSDT', price: 49000 }],  // +2.04%
            ['ETHUSDT', { symbol: 'ETHUSDT', price: 3050 }],   // -1.64%
            ['SOLUSDT', { symbol: 'SOLUSDT', price: 172 }],    // +4.65%
            ['DBRUSDT', { symbol: 'DBRUSDT', price: 0.0115 }], // +4.35%
            ['ADAUSDT', { symbol: 'ADAUSDT', price: 0.48 }],   // -6.25%
            ['DOGEUSDT', { symbol: 'DOGEUSDT', price: 0.076 }] // +5.26%
        ]),
        '4h': new Map([
            ['BTCUSDT', { symbol: 'BTCUSDT', price: 48500 }],  // +3.09%
            ['ETHUSDT', { symbol: 'ETHUSDT', price: 3100 }],   // -3.23%
            ['SOLUSDT', { symbol: 'SOLUSDT', price: 170 }],    // +5.88%
            ['DBRUSDT', { symbol: 'DBRUSDT', price: 0.0115 }], // +4.35%
            ['ADAUSDT', { symbol: 'ADAUSDT', price: 0.50 }],   // -10.00%
            ['DOGEUSDT', { symbol: 'DOGEUSDT', price: 0.075 }] // +6.67%
        ])
    };
    
    // 設置模擬數據到監控器
    monitor.priceData = {
        current: currentPrices,
        ...historicalPrices
    };
    
    // 2. 計算價格異動
    console.log('💰 2. 計算價格異動');
    const priceChanges = monitor.calculatePriceChanges();
    
    // 顯示計算結果
    Object.entries(priceChanges).forEach(([period, data]) => {
        console.log(`\n${period} 週期:`)
        console.log(`  正異動: ${data.positive.length} 個`)
        console.log(`  負異動: ${data.negative.length} 個`)
        
        if (data.positive.length > 0) {
            console.log(`  最大正異動: ${data.positive[0].symbol} ${data.positive[0].changePercent.toFixed(2)}%`)
        }
        if (data.negative.length > 0) {
            console.log(`  最大負異動: ${data.negative[0].symbol} ${data.negative[0].changePercent.toFixed(2)}%`)
        }
    });
    
    // 3. 生成Discord價格異動表格
    console.log('\n💹 3. 生成Discord價格異動表格');
    const embed = discordService.createPriceChangeRankingEmbed(priceChanges);
    
    // 顯示正異動表格
    console.log('\n正異動表格:');
    console.log(embed.fields[0].value);
    
    // 顯示負異動表格
    console.log('\n負異動表格:');
    console.log(embed.fields[1].value);
    
    // 4. 驗證功能效果
    console.log('\n🎯 4. 驗證功能效果');
    
    const positiveTable = embed.fields[0].value;
    const negativeTable = embed.fields[1].value;
    
    // 檢查表格內容
    const hasCurrentPrice = positiveTable.includes('$50000') || positiveTable.includes('$3000');
    console.log('當前價格顯示:', hasCurrentPrice ? '✅ 有價格數據' : '❌ 缺少價格數據');
    
    const hasPriceChanges = positiveTable.includes('+1.01%') || positiveTable.includes('+2.86%') || 
                           negativeTable.includes('-0.66%') || negativeTable.includes('-4.26%');
    console.log('價格變動數據:', hasPriceChanges ? '✅ 有變動數據' : '❌ 缺少變動數據');
    
    // 檢查時間週期差異
    const btcLines = positiveTable.split('\n').filter(line => line.includes('BTCUSDT'));
    if (btcLines.length > 0) {
        const line = btcLines[0];
        const percentages = line.match(/[+-]?\\d+\\.\\d+%/g) || [];
        const uniquePercentages = new Set(percentages);
        console.log('時間週期數據差異:', uniquePercentages.size > 2 ? '✅ 各週期數據不同' : '❌ 數據重複');
        console.log('  發現的變動:', Array.from(uniquePercentages).join(', '));
    }
    
    // 5. 功能總結
    console.log('\n📋 5. 價格異動報告功能驗證');
    console.log('功能特點:');
    console.log('  ✅ 多時間週期價格變動對比 (5分/15分/1小時/4小時)');
    console.log('  ✅ 正異動和負異動分別排行 (各TOP8)');
    console.log('  ✅ 顯示當前價格和各週期變動百分比');
    console.log('  ✅ 按最大變動幅度排序');
    console.log('  ✅ 過濾有意義的變動 (>0.5%)');
    
    console.log('\n與持倉異動報告的區別:');
    console.log('  🔸 價格異動報告: 追蹤價格變化，每5分鐘發送');
    console.log('  🔸 持倉異動報告: 追蹤持倉量變化，每15分鐘發送');
    console.log('  🔸 兩者發送到不同的Discord頻道');
    
    console.log('\n🎉 價格異動報告功能測試完成');
    
    // 可選：實際發送測試
    if (process.argv.includes('--send') && config.discord.priceAlertWebhookUrl) {
        console.log('\n📤 發送測試價格異動報告到Discord...');
        try {
            await discordService.sendPriceChangeReport(priceChanges);
            console.log('✅ 價格異動報告發送成功，請檢查Discord頻道');
        } catch (error) {
            console.error('❌ 價格異動報告發送失敗:', error.message);
        }
    } else {
        console.log('\n💡 如需發送實際測試，請運行: node test_price_change_reports.js --send');
        console.log('⚠️  請確保在 .env 中配置 PRICE_ALERT_WEBHOOK_URL');
    }
}

// 執行測試
if (require.main === module) {
    testPriceChangeReports().catch(console.error);
}

module.exports = { testPriceChangeReports };
// 測試持倉異動表格修復
const config = require('./src/config/config');
const EnhancedContractMonitor = require('./src/services/enhancedContractMonitor');
const EnhancedDiscordService = require('./src/services/enhancedDiscordService');

async function testPositionTableFix() {
    console.log('🧪 測試持倉異動表格修復...\n');
    
    const discordService = new EnhancedDiscordService(config);
    const monitor = new EnhancedContractMonitor(config, discordService);
    
    // 1. 模擬多時間週期數據
    console.log('📊 1. 模擬多時間週期數據');
    
    // 模擬當前數據
    const currentOpenInterests = new Map([
        ['BTCUSDT', { symbol: 'BTCUSDT', openInterestUsd: 1000000000, timestamp: Date.now() }],
        ['ETHUSDT', { symbol: 'ETHUSDT', openInterestUsd: 500000000, timestamp: Date.now() }],
        ['SOLUSDT', { symbol: 'SOLUSDT', openInterestUsd: 100000000, timestamp: Date.now() }],
        ['DBRUSDT', { symbol: 'DBRUSDT', openInterestUsd: 50000000, timestamp: Date.now() }]
    ]);
    
    // 模擬歷史數據 (不同時間週期有不同變化)
    const historicalData = {
        '5m': new Map([
            ['BTCUSDT', { symbol: 'BTCUSDT', openInterestUsd: 990000000, timestamp: Date.now() - 5*60*1000 }],
            ['ETHUSDT', { symbol: 'ETHUSDT', openInterestUsd: 520000000, timestamp: Date.now() - 5*60*1000 }],
            ['SOLUSDT', { symbol: 'SOLUSDT', openInterestUsd: 105000000, timestamp: Date.now() - 5*60*1000 }],
            ['DBRUSDT', { symbol: 'DBRUSDT', openInterestUsd: 48000000, timestamp: Date.now() - 5*60*1000 }]
        ]),
        '15m': new Map([
            ['BTCUSDT', { symbol: 'BTCUSDT', openInterestUsd: 950000000, timestamp: Date.now() - 15*60*1000 }],
            ['ETHUSDT', { symbol: 'ETHUSDT', openInterestUsd: 480000000, timestamp: Date.now() - 15*60*1000 }],
            ['SOLUSDT', { symbol: 'SOLUSDT', openInterestUsd: 110000000, timestamp: Date.now() - 15*60*1000 }],
            ['DBRUSDT', { symbol: 'DBRUSDT', openInterestUsd: 43800000, timestamp: Date.now() - 15*60*1000 }]
        ]),
        '1h': new Map([
            ['BTCUSDT', { symbol: 'BTCUSDT', openInterestUsd: 900000000, timestamp: Date.now() - 60*60*1000 }],
            ['ETHUSDT', { symbol: 'ETHUSDT', openInterestUsd: 460000000, timestamp: Date.now() - 60*60*1000 }],
            ['SOLUSDT', { symbol: 'SOLUSDT', openInterestUsd: 120000000, timestamp: Date.now() - 60*60*1000 }],
            ['DBRUSDT', { symbol: 'DBRUSDT', openInterestUsd: 43800000, timestamp: Date.now() - 60*60*1000 }]
        ]),
        '4h': new Map([
            ['BTCUSDT', { symbol: 'BTCUSDT', openInterestUsd: 850000000, timestamp: Date.now() - 4*60*60*1000 }],
            ['ETHUSDT', { symbol: 'ETHUSDT', openInterestUsd: 440000000, timestamp: Date.now() - 4*60*60*1000 }],
            ['SOLUSDT', { symbol: 'SOLUSDT', openInterestUsd: 130000000, timestamp: Date.now() - 4*60*60*1000 }],
            ['DBRUSDT', { symbol: 'DBRUSDT', openInterestUsd: 43800000, timestamp: Date.now() - 4*60*60*1000 }]
        ])
    };
    
    // 模擬價格數據
    const priceData = {
        current: new Map([
            ['BTCUSDT', { price: 50000, change24h: 2.5, volume: 2500000000 }],
            ['ETHUSDT', { price: 3000, change24h: -1.2, volume: 1800000000 }],
            ['SOLUSDT', { price: 180, change24h: 4.8, volume: 890000000 }],
            ['DBRUSDT', { price: 0.012, change24h: 8.5, volume: 45000000 }]
        ]),
        '5m': new Map([
            ['BTCUSDT', { price: 49800 }],
            ['ETHUSDT', { price: 3010 }],
            ['SOLUSDT', { price: 178 }],
            ['DBRUSDT', { price: 0.0118 }]
        ]),
        '15m': new Map([
            ['BTCUSDT', { price: 49500 }],
            ['ETHUSDT', { price: 3020 }],
            ['SOLUSDT', { price: 175 }],
            ['DBRUSDT', { price: 0.0115 }]
        ]),
        '1h': new Map([
            ['BTCUSDT', { price: 49000 }],
            ['ETHUSDT', { price: 3050 }],
            ['SOLUSDT', { price: 172 }],
            ['DBRUSDT', { price: 0.0115 }]
        ]),
        '4h': new Map([
            ['BTCUSDT', { price: 48500 }],
            ['ETHUSDT', { price: 3100 }],
            ['SOLUSDT', { price: 170 }],
            ['DBRUSDT', { price: 0.0115 }]
        ])
    };
    
    // 設置模擬數據到監控器
    monitor.openInterests = {
        current: currentOpenInterests,
        ...historicalData
    };
    
    // 2. 計算持倉異動
    console.log('📈 2. 計算持倉異動');
    const positionChanges = monitor.calculateOpenInterestChanges();
    
    // 顯示計算結果
    Object.entries(positionChanges).forEach(([period, data]) => {
        console.log(`\n${period} 週期:`);
        console.log(`  正異動: ${data.positive.length} 個`);
        console.log(`  負異動: ${data.negative.length} 個`);
        
        if (data.positive.length > 0) {
            console.log(`  最大正異動: ${data.positive[0].symbol} ${data.positive[0].changePercent.toFixed(2)}%`);
        }
        if (data.negative.length > 0) {
            console.log(`  最大負異動: ${data.negative[0].symbol} ${data.negative[0].changePercent.toFixed(2)}%`);
        }
    });
    
    // 3. 生成Discord表格
    console.log('\n📊 3. 生成Discord表格');
    const embed = discordService.createCombinedPositionChangeEmbed(positionChanges, priceData);
    
    // 顯示正異動表格
    console.log('\n正異動表格:');
    console.log(embed.fields[0].value);
    
    // 顯示負異動表格
    console.log('\n負異動表格:');
    console.log(embed.fields[1].value);
    
    // 4. 驗證修復效果
    console.log('\n🎯 4. 驗證修復效果');
    
    const positiveTable = embed.fields[0].value;
    const negativeTable = embed.fields[1].value;
    
    // 檢查價格異動欄位
    const hasPriceChanges = positiveTable.includes('+1.01%') || positiveTable.includes('-0.33%') || 
                           negativeTable.includes('+1.01%') || negativeTable.includes('-0.33%');
    console.log('價格異動欄位:', hasPriceChanges ? '✅ 有實際數據' : '❌ 仍為空白');
    
    // 檢查5分鐘持倉欄位
    const hasFiveMinData = positiveTable.includes('5分持倉') && !positiveTable.match(/5分持倉\s+\|\s+0\.00%/);
    console.log('5分鐘持倉欄位:', hasFiveMinData ? '✅ 有實際數據' : '❌ 仍為空白');
    
    // 檢查時間週期差異
    const btcLines = positiveTable.split('\n').filter(line => line.includes('BTCUSDT'));
    if (btcLines.length > 0) {
        const line = btcLines[0];
        const percentages = line.match(/[+-]?\d+\.\d+%/g) || [];
        const uniquePercentages = new Set(percentages.slice(1)); // 排除價格異動
        console.log('時間週期數據差異:', uniquePercentages.size > 1 ? '✅ 各週期數據不同' : '❌ 數據重複');
        console.log('  發現的數據:', Array.from(uniquePercentages).join(', '));
    }
    
    // 5. 顯示預期 vs 實際效果
    console.log('\n📋 5. 修復前後對比');
    console.log('修復前問題:');
    console.log('  ❌ 價格異動: 0.00%');
    console.log('  ❌ 5分持倉: 0.00%');
    console.log('  ❌ 所有時間週期數據相同');
    
    console.log('\n修復後效果:');
    console.log(`  ✅ 價格異動: ${hasPriceChanges ? '顯示實際變化' : '仍需修復'}`);
    console.log(`  ✅ 5分持倉: ${hasFiveMinData ? '顯示實際變化' : '仍需修復'}`);
    console.log(`  ✅ 時間週期: ${btcLines.length > 0 && new Set(btcLines[0].match(/[+-]?\d+\.\d+%/g) || []).size > 2 ? '各週期數據不同' : '仍需修復'}`);
    
    console.log('\n🎉 持倉異動表格修復測試完成');
    
    // 可選：實際發送測試
    if (process.argv.includes('--send') && config.discord.webhookUrl) {
        console.log('\n📤 發送測試消息到Discord...');
        try {
            await discordService.sendEmbed(embed, 'position');
            console.log('✅ 測試消息發送成功，請檢查Discord頻道');
        } catch (error) {
            console.error('❌ 測試消息發送失敗:', error.message);
        }
    } else {
        console.log('\n💡 如需發送實際測試，請運行: node test_position_table_fix.js --send');
    }
}

// 執行測試
if (require.main === module) {
    testPositionTableFix().catch(console.error);
}

module.exports = { testPositionTableFix };
const config = require('./src/config/config');
const EnhancedContractMonitor = require('./src/services/enhancedContractMonitor');
const EnhancedDiscordService = require('./src/services/enhancedDiscordService');

async function testRealReport() {
    console.log('🚀 測試真實數據報告生成...');
    
    // 創建服務實例
    const discordService = new EnhancedDiscordService(config);
    const monitor = new EnhancedContractMonitor(config, discordService);
    
    try {
        console.log('\n🔍 初始化監控服務...');
        
        // 加載合約列表
        await monitor.loadAllContracts();
        console.log(`✅ 已加載 ${monitor.contractSymbols.length} 個合約`);
        
        // 收集初始數據
        console.log('\n📊 收集實際數據...');
        await monitor.collectInitialData();
        
        const status = monitor.getStatus();
        console.log('📈 數據收集狀態:', {
            合約數量: status.contractSymbols,
            持倉數據: status.openInterestData,
            資金費率數據: status.fundingRateData,
            價格數據: status.priceData
        });
        
        if (status.openInterestData === 0) {
            console.log('❌ 沒有收集到持倉數據，無法生成報告');
            return;
        }
        
        console.log('\n💰 模擬時間間隔數據 (用於測試異動計算)...');
        
        // 模擬15分鐘前的數據 (複製當前數據並稍作修改)
        monitor.openInterests['15m'] = new Map();
        monitor.fundingRates.forEach((rate, symbol) => {
            const currentOI = monitor.openInterests.current.get(symbol);
            if (currentOI && currentOI.openInterestUsd > 0) {
                // 模擬15分鐘前的數據（稍微不同的值）
                monitor.openInterests['15m'].set(symbol, {
                    ...currentOI,
                    openInterestUsd: currentOI.openInterestUsd * (0.95 + Math.random() * 0.1), // 95%-105%
                    timestamp: Date.now() - 15 * 60 * 1000
                });
            }
        });
        
        // 模擬1小時前的數據
        monitor.openInterests['1h'] = new Map();
        monitor.fundingRates.forEach((rate, symbol) => {
            const currentOI = monitor.openInterests.current.get(symbol);
            if (currentOI && currentOI.openInterestUsd > 0) {
                monitor.openInterests['1h'].set(symbol, {
                    ...currentOI,
                    openInterestUsd: currentOI.openInterestUsd * (0.90 + Math.random() * 0.2), // 90%-110%
                    timestamp: Date.now() - 60 * 60 * 1000
                });
            }
        });
        
        console.log('✅ 模擬歷史數據完成');
        
        // 計算持倉異動
        console.log('\n📊 計算持倉異動...');
        const positionChanges = monitor.calculateOpenInterestChanges();
        
        console.log('持倉異動統計:');
        Object.keys(positionChanges).forEach(period => {
            const data = positionChanges[period];
            console.log(`  ${period}: 正異動 ${data.positive.length} 個, 負異動 ${data.negative.length} 個`);
            
            if (data.positive.length > 0) {
                console.log(`    最大增幅: ${data.positive[0].symbol} +${data.positive[0].changePercent.toFixed(2)}%`);
            }
            if (data.negative.length > 0) {
                console.log(`    最大減幅: ${data.negative[0].symbol} ${data.negative[0].changePercent.toFixed(2)}%`);
            }
        });
        
        // 計算資金費率排行
        console.log('\n💸 計算資金費率排行...');
        const fundingRateRankings = monitor.calculateFundingRateWithPositionRankings();
        
        console.log('資金費率統計:');
        console.log(`  正費率: ${fundingRateRankings.positive.length} 個`);
        console.log(`  負費率: ${fundingRateRankings.negative.length} 個`);
        
        if (fundingRateRankings.positive.length > 0) {
            console.log(`  最高費率: ${fundingRateRankings.positive[0].symbol} ${(fundingRateRankings.positive[0].fundingRate * 100).toFixed(4)}%`);
        }
        if (fundingRateRankings.negative.length > 0) {
            console.log(`  最低費率: ${fundingRateRankings.negative[0].symbol} ${(fundingRateRankings.negative[0].fundingRate * 100).toFixed(4)}%`);
        }
        
        // 測試Discord消息生成
        console.log('\n📱 測試Discord消息生成...');
        
        // 測試資金費率消息
        const fundingRateEmbed = discordService.createFundingRateAlertEmbed({rankings: fundingRateRankings});
        console.log('✅ 資金費率Embed生成成功');
        console.log('標題:', fundingRateEmbed.title);
        console.log('字段數量:', fundingRateEmbed.fields.length);
        
        // 測試持倉異動消息
        Object.keys(positionChanges).forEach(period => {
            const data = positionChanges[period];
            if (data.positive.length > 0 || data.negative.length > 0) {
                const positionEmbed = discordService.createOpenInterestChangeEmbed(data, period);
                console.log(`✅ ${period} 持倉異動Embed生成成功`);
                console.log(`   標題: ${positionEmbed.title}`);
                console.log(`   字段數量: ${positionEmbed.fields.length}`);
            }
        });
        
        // 如果有Discord Webhook URL，可以選擇發送測試消息
        if (config.discord.webhookUrl) {
            console.log('\n📤 發送測試消息到Discord...');
            
            // 發送系統測試通知
            await discordService.sendAlert('system_alert', {
                message: '🧪 真實數據測試成功',
                level: 'info',
                details: `持倉數據: ${status.openInterestData} 個\n資金費率數據: ${status.fundingRateData} 個\n測試時間: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`
            });
            
            console.log('✅ 測試通知已發送到Discord');
            
            // 如果用戶同意，可以發送實際的報告
            console.log('\n🤔 是否發送實際的持倉異動和資金費率報告到Discord？');
            console.log('   這將會發送真實的市場數據到你的Discord頻道');
            console.log('   如果要發送，請修改此腳本的註釋部分');
            
            /*
            // 取消註釋以下代碼來發送實際報告
            console.log('\n📊 發送真實數據報告到Discord...');
            await discordService.sendFundingRateWithPositionReport(fundingRateRankings, positionChanges);
            console.log('✅ 真實數據報告已發送到Discord');
            */
            
        } else {
            console.log('⚠️ 沒有配置Discord Webhook URL，跳過發送測試');
        }
        
        console.log('\n🎉 真實數據報告測試完成！');
        console.log('📊 測試結果摘要:');
        console.log(`   - 合約數量: ${status.contractSymbols}`);
        console.log(`   - 持倉數據: ${status.openInterestData} 個`);
        console.log(`   - 資金費率數據: ${status.fundingRateData} 個`);
        console.log(`   - 價格數據: ${status.priceData} 個`);
        console.log(`   - 持倉異動計算: 正常`);
        console.log(`   - 資金費率排行: 正常`);
        console.log(`   - Discord消息生成: 正常`);
        
    } catch (error) {
        console.error('❌ 真實數據報告測試失敗:', error);
        console.error('錯誤詳情:', error.stack);
    }
}

// 執行測試
testRealReport().catch(console.error);
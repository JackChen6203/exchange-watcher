const config = require('./src/config/config');
const BitgetApi = require('./src/services/bitgetApi');
const EnhancedDiscordService = require('./src/services/enhancedDiscordService');

async function quickRealTest() {
    console.log('🚀 快速真實數據測試...');
    
    const api = new BitgetApi(config);
    const discordService = new EnhancedDiscordService(config);
    
    try {
        // 獲取前20個合約
        console.log('📊 獲取合約列表...');
        const allContracts = await api.getAllContracts('umcbl');
        const testContracts = allContracts.slice(0, 20);
        console.log(`✅ 將測試前 ${testContracts.length} 個合約`);
        
        // 收集真實數據
        console.log('\n💰 收集真實持倉量數據...');
        const openInterests = new Map();
        const fundingRates = new Map();
        
        for (const contract of testContracts) {
            try {
                console.log(`📈 處理 ${contract.symbol}...`);
                
                // 獲取持倉量
                const oi = await api.getOpenInterest(contract.symbol, 'umcbl');
                if (oi.openInterestUsd > 0) {
                    openInterests.set(contract.symbol, oi);
                }
                
                // 獲取資金費率
                const fr = await api.getFundingRate(contract.symbol, 'umcbl');
                fundingRates.set(contract.symbol, fr);
                
                // 避免頻率限制
                await new Promise(resolve => setTimeout(resolve, 300));
                
            } catch (error) {
                console.log(`⚠️ ${contract.symbol} 失敗:`, error.message);
            }
        }
        
        console.log(`✅ 成功收集數據: 持倉 ${openInterests.size} 個, 資金費率 ${fundingRates.size} 個`);
        
        // 模擬歷史數據用於計算異動
        console.log('\n🕰️ 生成模擬歷史數據...');
        const historicalOI = new Map();
        openInterests.forEach((current, symbol) => {
            // 模擬15分鐘前的數據 (90%-110%的變動)
            historicalOI.set(symbol, {
                ...current,
                openInterestUsd: current.openInterestUsd * (0.9 + Math.random() * 0.2),
                timestamp: Date.now() - 15 * 60 * 1000
            });
        });
        
        // 計算持倉異動
        console.log('\n📊 計算持倉異動...');
        const positionChanges = [];
        openInterests.forEach((current, symbol) => {
            const historical = historicalOI.get(symbol);
            if (historical && historical.openInterestUsd > 0) {
                const change = current.openInterestUsd - historical.openInterestUsd;
                const changePercent = (change / historical.openInterestUsd) * 100;
                
                if (Math.abs(changePercent) > 1) { // 只顯示>1%的變動
                    positionChanges.push({
                        symbol,
                        currentOpenInterest: current.openInterestUsd,
                        previousOpenInterest: historical.openInterestUsd,
                        change,
                        changePercent,
                        timestamp: Date.now()
                    });
                }
            }
        });
        
        // 排序
        const positiveChanges = positionChanges
            .filter(c => c.change > 0)
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 15);
            
        const negativeChanges = positionChanges
            .filter(c => c.change < 0)
            .sort((a, b) => a.changePercent - b.changePercent)
            .slice(0, 15);
        
        console.log(`持倉異動: 正異動 ${positiveChanges.length} 個, 負異動 ${negativeChanges.length} 個`);
        
        // 計算資金費率排行
        console.log('\n💸 計算資金費率排行...');
        const fundingRateArray = Array.from(fundingRates.values())
            .filter(rate => rate.fundingRate != null)
            .map(rate => {
                const openInterest = openInterests.get(rate.symbol);
                return {
                    symbol: rate.symbol,
                    fundingRate: rate.fundingRate,
                    fundingRatePercent: rate.fundingRate * 100,
                    openInterestUsd: openInterest ? openInterest.openInterestUsd : 0,
                    nextFundingTime: rate.nextFundingTime
                };
            });
        
        const positiveFunding = fundingRateArray
            .filter(rate => rate.fundingRate > 0)
            .sort((a, b) => b.fundingRate - a.fundingRate)
            .slice(0, 15);
        
        const negativeFunding = fundingRateArray
            .filter(rate => rate.fundingRate < 0)
            .sort((a, b) => a.fundingRate - b.fundingRate)
            .slice(0, 15);
        
        console.log(`資金費率: 正費率 ${positiveFunding.length} 個, 負費率 ${negativeFunding.length} 個`);
        
        // 顯示實際數據
        console.log('\n📋 真實數據預覽:');
        
        if (positiveFunding.length > 0) {
            console.log('🔥 最高資金費率:');
            positiveFunding.slice(0, 5).forEach((item, index) => {
                const oiText = item.openInterestUsd > 0 ? ` (OI: $${(item.openInterestUsd / 1000000).toFixed(1)}M)` : '';
                console.log(`   ${index + 1}. ${item.symbol}: ${(item.fundingRate * 100).toFixed(4)}%${oiText}`);
            });
        }
        
        if (negativeFunding.length > 0) {
            console.log('❄️ 最低資金費率:');
            negativeFunding.slice(0, 5).forEach((item, index) => {
                const oiText = item.openInterestUsd > 0 ? ` (OI: $${(item.openInterestUsd / 1000000).toFixed(1)}M)` : '';
                console.log(`   ${index + 1}. ${item.symbol}: ${(item.fundingRate * 100).toFixed(4)}%${oiText}`);
            });
        }
        
        if (positiveChanges.length > 0) {
            console.log('📈 模擬持倉增加:');
            positiveChanges.slice(0, 5).forEach((item, index) => {
                console.log(`   ${index + 1}. ${item.symbol}: +${item.changePercent.toFixed(2)}% ($${(item.change / 1000000).toFixed(1)}M)`);
            });
        }
        
        // 生成Discord消息
        console.log('\n📱 生成Discord消息...');
        
        const fundingRateRankings = {
            positive: positiveFunding,
            negative: negativeFunding
        };
        
        const positionChangeData = {
            '15m': {
                positive: positiveChanges,
                negative: negativeChanges
            }
        };
        
        // 創建消息embed
        const fundingEmbed = discordService.createFundingRateAlertEmbed({rankings: fundingRateRankings});
        const positionEmbed = discordService.createOpenInterestChangeEmbed(positionChangeData['15m'], '15m');
        
        console.log('✅ Discord消息生成成功');
        console.log(`資金費率消息字段: ${fundingEmbed.fields.length}`);
        console.log(`持倉異動消息字段: ${positionEmbed.fields.length}`);
        
        // 如果有Discord配置，發送測試消息
        if (config.discord.webhookUrl) {
            console.log('\n📤 發送真實數據到Discord...');
            
            // 發送資金費率報告
            await discordService.sendAlert('funding_rate_alert', {rankings: fundingRateRankings});
            console.log('✅ 資金費率報告已發送');
            
            // 等待一下避免頻率限制
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // 發送持倉異動報告
            const embed = discordService.createOpenInterestChangeEmbed(positionChangeData['15m'], '15m');
            await discordService.sendEmbed(embed, 'funding_rate');
            console.log('✅ 持倉異動報告已發送');
            
            // 發送測試完成通知
            await new Promise(resolve => setTimeout(resolve, 2000));
            await discordService.sendAlert('system_alert', {
                message: '🎉 真實數據測試成功完成',
                level: 'info',
                details: `測試了 ${testContracts.length} 個合約\n持倉數據: ${openInterests.size} 個\n資金費率數據: ${fundingRates.size} 個\n持倉異動: 正${positiveChanges.length}個 負${negativeChanges.length}個\n測試時間: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`
            });
            console.log('✅ 測試完成通知已發送');
            
        } else {
            console.log('⚠️ 沒有Discord Webhook配置，無法發送消息');
        }
        
        console.log('\n🎉 快速真實數據測試完成！');
        console.log('📊 數據統計:');
        console.log(`   - 測試合約: ${testContracts.length} 個`);
        console.log(`   - 持倉數據: ${openInterests.size} 個`);
        console.log(`   - 資金費率: ${fundingRates.size} 個`);
        console.log(`   - 持倉異動: 正${positiveChanges.length}個 負${negativeChanges.length}個`);
        console.log(`   - 資金費率: 正${positiveFunding.length}個 負${negativeFunding.length}個`);
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
    }
}

// 執行測試
quickRealTest().catch(console.error);
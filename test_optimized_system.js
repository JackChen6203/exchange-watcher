#!/usr/bin/env node

/**
 * 測試優化後的監控系統性能
 */

const config = require('./src/config/config');
const DiscordService = require('./src/services/discordService');
const BitgetContractMonitor = require('./src/services/bitgetContractMonitor');
const Logger = require('./src/utils/logger');

async function testOptimizedSystem() {
    console.log('🚀 測試優化後的監控系統性能...');
    
    const logger = new Logger(config);
    const discordService = new DiscordService(config);
    const contractMonitor = new BitgetContractMonitor(config, discordService);
    
    const startTime = Date.now();
    
    try {
        // 初始化監控器（現在應該更快）
        console.log('🔧 初始化合約監控器...');
        await contractMonitor.initialize();
        
        const initTime = Date.now() - startTime;
        console.log(`⏱️ 初始化耗時: ${(initTime / 1000).toFixed(2)} 秒`);
        
        // 等待較短時間讓數據收集完成
        console.log('⏳ 等待數據收集完成 (60秒)...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        
        const dataCollectionTime = Date.now() - startTime;
        console.log(`⏱️ 數據收集耗時: ${(dataCollectionTime / 1000).toFixed(2)} 秒`);
        
        // 檢查收集到的數據量
        console.log('📊 檢查收集到的數據量...');
        console.log(`📈 持倉量數據: ${contractMonitor.openInterests.current.size} 個合約`);
        console.log(`💰 價格數據: ${contractMonitor.priceData.current.size} 個合約`);
        console.log(`💸 資金費率數據: ${contractMonitor.fundingRates.size} 個合約`);
        
        // 顯示前5個合約數據樣本
        console.log('\\n📋 數據樣本 (前5個合約):');
        let count = 0;
        for (const [symbol, currentOI] of contractMonitor.openInterests.current) {
            if (count >= 5) break;
            
            const currentPrice = contractMonitor.priceData.current.get(symbol);
            const fundingRate = contractMonitor.fundingRates.get(symbol);
            
            console.log(`\\n🔸 ${symbol}:`);
            console.log(`   持倉量: ${currentOI ? '$' + (currentOI.openInterestUsd / 1000000).toFixed(2) + 'M' : 'N/A'}`);
            console.log(`   價格: ${currentPrice ? '$' + currentPrice.lastPrice : 'N/A'}`);
            console.log(`   資金費率: ${fundingRate ? (fundingRate.fundingRate * 100).toFixed(4) + '%' : 'N/A'}`);
            
            count++;
        }
        
        // 嘗試生成一次報告
        console.log('\\n📊 嘗試生成測試報告...');
        await contractMonitor.generateAndSendPositionPriceReport();
        
        const totalTime = Date.now() - startTime;
        console.log(`\\n⏱️ 總耗時: ${(totalTime / 1000).toFixed(2)} 秒`);
        
        // 發送性能報告到Discord
        const performanceEmbed = {
            title: '🚀 優化後系統性能測試',
            description: '系統優化結果和性能指標',
            color: 0x00ff00,
            fields: [
                {
                    name: '⏱️ 性能指標',
                    value: `初始化: ${(initTime / 1000).toFixed(2)}s\\n數據收集: ${(dataCollectionTime / 1000).toFixed(2)}s\\n總時間: ${(totalTime / 1000).toFixed(2)}s`,
                    inline: true
                },
                {
                    name: '📊 數據量',
                    value: `持倉量: ${contractMonitor.openInterests.current.size}\\n價格: ${contractMonitor.priceData.current.size}\\n資金費率: ${contractMonitor.fundingRates.size}`,
                    inline: true
                },
                {
                    name: '🔧 優化項目',
                    value: '✅ 減少API延遲 (1500ms→500ms)\\n✅ 增加批處理大小 (5→10)\\n✅ 限制初始處理合約 (150個)\\n✅ 使用批量價格API',
                    inline: false
                },
                {
                    name: '📈 預期改進',
                    value: '數據收集速度提升約60%\\n報告生成延遲降低\\n系統響應性改善',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Bitget 合約監控 - 系統優化測試'
            }
        };
        
        await discordService.sendEmbed(performanceEmbed, 'funding_rate');
        
        // 停止監控器
        contractMonitor.stop();
        
        console.log('✅ 優化測試完成！');
        return true;
        
    } catch (error) {
        console.error('❌ 優化測試失敗:', error);
        
        const errorEmbed = {
            title: '❌ 系統優化測試失敗',
            description: '測試過程中發生錯誤',
            color: 0xff0000,
            fields: [
                {
                    name: '錯誤訊息',
                    value: error.message || '未知錯誤',
                    inline: false
                },
                {
                    name: '測試時間',
                    value: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
                    inline: true
                },
                {
                    name: '耗時',
                    value: `${((Date.now() - startTime) / 1000).toFixed(2)} 秒`,
                    inline: true
                }
            ]
        };
        
        await discordService.sendEmbed(errorEmbed, 'funding_rate');
        
        if (contractMonitor.stop) {
            contractMonitor.stop();
        }
        
        return false;
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    testOptimizedSystem()
        .then(success => {
            console.log(success ? '✅ 優化測試成功' : '❌ 優化測試失敗');
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 測試腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = testOptimizedSystem;
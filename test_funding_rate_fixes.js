#!/usr/bin/env node

/**
 * 測試修復後的資金費率功能
 */

const config = require('./src/config/config');
const DiscordService = require('./src/services/discordService');
const BitgetContractMonitor = require('./src/services/bitgetContractMonitor');
const Logger = require('./src/utils/logger');

async function testFundingRateFixes() {
    console.log('🧪 測試修復後的資金費率功能...');
    
    const logger = new Logger(config);
    const discordService = new DiscordService(config);
    const contractMonitor = new BitgetContractMonitor(config, discordService);
    
    try {
        // 初始化監控器
        console.log('🔧 初始化合約監控器...');
        await contractMonitor.initialize();
        
        // 等待數據收集完成
        console.log('⏳ 等待數據收集完成...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 手動觸發資金費率報告測試
        console.log('💰 手動觸發資金費率報告測試...');
        await contractMonitor.generateAndSendFundingRateReport();
        
        console.log('✅ 資金費率報告測試完成！');
        
        // 檢查資金費率數據狀態
        console.log(`\\n📊 資金費率數據狀態: ${contractMonitor.fundingRates.size} 個合約`);
        
        // 顯示前5個資金費率數據
        console.log('\\n📋 前5個資金費率數據:');
        let count = 0;
        for (const [symbol, fundingRate] of contractMonitor.fundingRates) {
            if (count >= 5) break;
            
            console.log(`${symbol}: ${(fundingRate.fundingRate * 100).toFixed(4)}%`);
            count++;
        }
        
        // 發送修復確認報告到Discord
        const fixConfirmationEmbed = {
            title: '🔧 資金費率功能修復完成',
            description: '已修復重複發送、時間設定和格式對齊問題',
            color: 0x00ff00,
            fields: [
                {
                    name: '✅ 修復項目',
                    value: `🕐 發送時間: 50分,55分,59分 → 49分,54分\\n🔄 重複發送: 已添加防重複機制\\n📝 格式對齊: 已修復表格對齊問題`,
                    inline: false
                },
                {
                    name: '📊 資金費率數據',
                    value: `合約數量: ${contractMonitor.fundingRates.size}\\n報告格式: TOP 8 正負費率並列\\n頻道路由: FUNDING_RATE_WEBHOOK_URL`,
                    inline: false
                },
                {
                    name: '⏰ 發送時機',
                    value: '每小時的49分和54分\\n(在資金費率結算前5-10分鐘)',
                    inline: true
                },
                {
                    name: '🎯 表格改進',
                    value: '固定寬度對齊\\n正負費率並列顯示\\n清晰的分隔線',
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Bitget 資金費率 - 功能修復'
            }
        };
        
        await discordService.sendEmbed(fixConfirmationEmbed, 'funding_rate');
        
        // 停止監控器
        contractMonitor.stop();
        
        console.log('🎉 資金費率修復測試完成！');
        return true;
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
        
        const errorEmbed = {
            title: '❌ 資金費率修復測試失敗',
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
    testFundingRateFixes()
        .then(success => {
            console.log(success ? '✅ 測試成功完成' : '❌ 測試失敗');
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 測試腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = testFundingRateFixes;
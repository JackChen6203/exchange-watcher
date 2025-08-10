#!/usr/bin/env node

/**
 * 即時測試BitgetContractMonitor的數據報告功能
 */

const config = require('./src/config/config');
const DiscordService = require('./src/services/discordService');
const BitgetContractMonitor = require('./src/services/bitgetContractMonitor');
const Logger = require('./src/utils/logger');

async function testInstantReports() {
    console.log('🧪 測試即時數據報告功能...');
    
    const logger = new Logger(config);
    const discordService = new DiscordService(config);
    const contractMonitor = new BitgetContractMonitor(config, discordService);
    
    try {
        // 初始化監控器
        console.log('🔧 初始化合約監控器...');
        await contractMonitor.initialize();
        
        // 等待一段時間讓數據收集完成
        console.log('⏳ 等待數據收集完成...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 手動觸發一次報告生成
        console.log('📊 手動觸發持倉/價格異動報告...');
        await contractMonitor.generateAndSendPositionPriceReport();
        
        // 等待報告發送完成
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 手動觸發資金費率報告
        console.log('💰 手動觸發資金費率報告...');
        await contractMonitor.generateAndSendFundingRateReport();
        
        console.log('✅ 測試完成！請檢查Discord頻道是否收到報告');
        
        // 停止監控器
        contractMonitor.stop();
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
        
        // 發送錯誤報告到Discord
        const errorEmbed = {
            title: '❌ 即時報告測試失敗',
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
    testInstantReports()
        .then(success => {
            console.log(success !== false ? '✅ 測試成功完成' : '❌ 測試失敗');
            process.exit(success !== false ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 測試腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = testInstantReports;
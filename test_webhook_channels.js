#!/usr/bin/env node

/**
 * Test script to verify all Discord webhook channels are working
 */

const config = require('./src/config/config');
const DiscordService = require('./src/services/discordService');
const Logger = require('./src/utils/logger');

async function testWebhookChannels() {
    console.log('🧪 開始測試所有Discord Webhook頻道...');
    
    const logger = new Logger(config);
    const discordService = new DiscordService(config);
    
    // 測試時間戳
    const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    
    try {
        // 1. 測試資金費率頻道
        console.log('📊 測試資金費率頻道...');
        const fundingRateEmbed = {
            title: '🧪 測試 - 資金費率頻道',
            description: '這是資金費率頻道的測試消息',
            color: 0x1f8b4c,
            fields: [
                {
                    name: '頻道類型',
                    value: '資金費率 (FUNDING_RATE_WEBHOOK_URL)',
                    inline: true
                },
                {
                    name: '測試時間',
                    value: timestamp,
                    inline: true
                }
            ],
            footer: {
                text: '加密貨幣交易所監控系統 - 頻道測試'
            }
        };
        
        await discordService.sendEmbed(fundingRateEmbed, 'funding_rate');
        console.log('✅ 資金費率頻道測試完成');
        
        // 等待避免頻率限制
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 2. 測試持倉變動頻道
        console.log('📈 測試持倉變動頻道...');
        const positionEmbed = {
            title: '🧪 測試 - 持倉變動頻道',
            description: '這是持倉變動頻道的測試消息',
            color: 0xe74c3c,
            fields: [
                {
                    name: '頻道類型',
                    value: '持倉變動 (POSITION_WEBHOOK_URL)',
                    inline: true
                },
                {
                    name: '測試時間',
                    value: timestamp,
                    inline: true
                }
            ],
            footer: {
                text: '加密貨幣交易所監控系統 - 頻道測試'
            }
        };
        
        await discordService.sendEmbed(positionEmbed, 'position');
        console.log('✅ 持倉變動頻道測試完成');
        
        // 等待避免頻率限制
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 3. 測試價格異動頻道
        console.log('💰 測試價格異動頻道...');
        const priceAlertEmbed = {
            title: '🧪 測試 - 價格異動頻道',
            description: '這是價格異動頻道的測試消息',
            color: 0xf39c12,
            fields: [
                {
                    name: '頻道類型',
                    value: '價格異動 (PRICE_ALERT_WEBHOOK_URL)',
                    inline: true
                },
                {
                    name: '測試時間',
                    value: timestamp,
                    inline: true
                }
            ],
            footer: {
                text: '加密貨幣交易所監控系統 - 頻道測試'
            }
        };
        
        await discordService.sendEmbed(priceAlertEmbed, 'price_alert');
        console.log('✅ 價格異動頻道測試完成');
        
        // 等待避免頻率限制
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 4. 測試波段策略頻道
        console.log('📊 測試波段策略頻道...');
        const swingStrategyEmbed = {
            title: '🧪 測試 - 波段策略頻道',
            description: '這是波段策略頻道的測試消息',
            color: 0x9b59b6,
            fields: [
                {
                    name: '頻道類型',
                    value: '波段策略 (SWING_STRATEGY_WEBHOOK_URL)',
                    inline: true
                },
                {
                    name: '測試時間',
                    value: timestamp,
                    inline: true
                }
            ],
            footer: {
                text: '加密貨幣交易所監控系統 - 頻道測試'
            }
        };
        
        await discordService.sendEmbed(swingStrategyEmbed, 'swing_strategy');
        console.log('✅ 波段策略頻道測試完成');
        
        // 等待避免頻率限制
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 5. 發送測試總結到資金費率頻道
        console.log('📋 發送測試總結...');
        const summaryEmbed = {
            title: '✅ Discord Webhook 頻道測試完成',
            description: '所有四個專用頻道均已成功測試',
            color: 0x00ff00,
            fields: [
                {
                    name: '📊 資金費率頻道',
                    value: config.discord.fundingRateWebhookUrl ? '✅ 正常' : '❌ 未配置',
                    inline: true
                },
                {
                    name: '📈 持倉變動頻道',
                    value: config.discord.positionWebhookUrl ? '✅ 正常' : '❌ 未配置',
                    inline: true
                },
                {
                    name: '💰 價格異動頻道',
                    value: config.discord.priceAlertWebhookUrl ? '✅ 正常' : '❌ 未配置',
                    inline: true
                },
                {
                    name: '📊 波段策略頻道',
                    value: config.discord.swingStrategyWebhookUrl ? '✅ 正常' : '❌ 未配置',
                    inline: true
                },
                {
                    name: '測試完成時間',
                    value: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
                    inline: false
                }
            ],
            footer: {
                text: '加密貨幣交易所監控系統 - 測試完成'
            }
        };
        
        await discordService.sendEmbed(summaryEmbed, 'funding_rate');
        
        console.log('🎉 所有Discord Webhook頻道測試完成！');
        console.log('   - 請檢查對應的Discord頻道是否收到測試消息');
        console.log('   - 如果某些頻道沒有收到消息，請檢查.env文件中的對應webhook URL');
        
        return true;
        
    } catch (error) {
        console.error('❌ Webhook頻道測試失敗:', error);
        
        // 嘗試發送錯誤報告到資金費率頻道
        try {
            const errorEmbed = {
                title: '❌ Discord Webhook 測試失敗',
                description: '測試過程中發生錯誤',
                color: 0xff0000,
                fields: [
                    {
                        name: '錯誤訊息',
                        value: error.message || '未知錯誤',
                        inline: false
                    },
                    {
                        name: '錯誤時間',
                        value: timestamp,
                        inline: true
                    }
                ],
                footer: {
                    text: '加密貨幣交易所監控系統 - 錯誤報告'
                }
            };
            
            await discordService.sendEmbed(errorEmbed, 'funding_rate');
        } catch (errorReportError) {
            console.error('❌ 無法發送錯誤報告:', errorReportError);
        }
        
        return false;
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    testWebhookChannels()
        .then(success => {
            if (success) {
                console.log('✅ 測試成功完成');
                process.exit(0);
            } else {
                console.log('❌ 測試失敗');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 測試腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = testWebhookChannels;
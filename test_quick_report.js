#!/usr/bin/env node

/**
 * 快速測試監控報告功能
 */

const config = require('./src/config/config');
const DiscordService = require('./src/services/discordService');

async function testQuickReport() {
    console.log('🧪 快速測試監控報告功能...');
    
    const discordService = new DiscordService(config);
    const timestamp = new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
    
    try {
        // 測試持倉異動報告 - 模擬數據
        console.log('📈 測試持倉異動報告...');
        const positionEmbed = {
            title: '📊 持倉量變動排行榜 (5分鐘)',
            description: `統計時間: ${timestamp}`,
            color: 0x1f8b4c,
            fields: [
                {
                    name: '📈 持倉量正異動 TOP 8',
                    value: '1. **BTCUSDT** - 持倉量: 123.45M (+5.67%)\n2. **ETHUSDT** - 持倉量: 89.12M (+4.23%)\n3. **BNBUSDT** - 持倉量: 45.67M (+3.89%)',
                    inline: false
                },
                {
                    name: '📉 持倉量負異動 TOP 8',
                    value: '1. **ADAUSDT** - 持倉量: 67.89M (-3.45%)\n2. **DOTUSDT** - 持倉量: 34.56M (-2.78%)\n3. **SOLUSDT** - 持倉量: 78.90M (-2.34%)',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Bitget 合約監控 - 測試模式'
            }
        };
        
        await discordService.sendEmbed(positionEmbed, 'position');
        console.log('✅ 持倉異動報告發送完成');
        
        // 等待避免頻率限制
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 測試價格異動報告
        console.log('💰 測試價格異動報告...');
        const priceEmbed = {
            title: '💰 價格異動排行榜 (5分鐘)',
            description: `統計時間: ${timestamp}`,
            color: 0xf39c12,
            fields: [
                {
                    name: '📈 價格正異動 TOP 8',
                    value: '1. **BTCUSDT** - 價格: $67,234 (+2.45%)\n2. **ETHUSDT** - 價格: $3,456 (+1.87%)\n3. **BNBUSDT** - 價格: $589 (+1.56%)',
                    inline: false
                },
                {
                    name: '📉 價格負異動 TOP 8',
                    value: '1. **ADAUSDT** - 價格: $0.456 (-2.34%)\n2. **DOTUSDT** - 價格: $7.89 (-1.98%)\n3. **SOLUSDT** - 價格: $123.45 (-1.67%)',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Bitget 合約監控 - 測試模式'
            }
        };
        
        await discordService.sendEmbed(priceEmbed, 'price_alert');
        console.log('✅ 價格異動報告發送完成');
        
        // 等待避免頻率限制
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 測試資金費率報告
        console.log('💸 測試資金費率報告...');
        const fundingEmbed = {
            title: '💰 資金費率排行榜 (5分鐘)',
            description: `統計時間: ${timestamp}`,
            color: 0xe74c3c,
            fields: [
                {
                    name: '🟢 正資金費率 TOP 8',
                    value: '1. **BTCUSDT** - 費率: 0.0523% | 下次: 16:00\n2. **ETHUSDT** - 費率: 0.0445% | 下次: 16:00\n3. **BNBUSDT** - 費率: 0.0398% | 下次: 16:00',
                    inline: false
                },
                {
                    name: '🔴 負資金費率 TOP 8',
                    value: '1. **ADAUSDT** - 費率: -0.0345% | 下次: 16:00\n2. **DOTUSDT** - 費率: -0.0278% | 下次: 16:00\n3. **SOLUSDT** - 費率: -0.0234% | 下次: 16:00',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Bitget 合約監控 - 測試模式'
            }
        };
        
        await discordService.sendEmbed(fundingEmbed, 'funding_rate');
        console.log('✅ 資金費率報告發送完成');
        
        // 發送測試摘要
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const summaryEmbed = {
            title: '✅ 監控系統報告測試完成',
            description: '所有報告類型已成功發送到對應頻道',
            color: 0x00ff00,
            fields: [
                {
                    name: '📊 報告間隔',
                    value: '每5分鐘自動發送',
                    inline: true
                },
                {
                    name: '🎯 排行數量',
                    value: '正負異動各TOP 8',
                    inline: true
                },
                {
                    name: '📱 頻道分配',
                    value: '✅ 持倉異動 → 持倉頻道\n✅ 價格異動 → 價格頻道\n✅ 資金費率 → 資金頻道',
                    inline: false
                },
                {
                    name: '⏰ 下次自動報告',
                    value: '系統將在5分鐘後自動發送實際數據報告',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Bitget 合約監控 - 系統已就緒'
            }
        };
        
        await discordService.sendEmbed(summaryEmbed, 'funding_rate');
        
        console.log('🎉 所有測試報告已發送！');
        console.log('📢 系統現在配置為每5分鐘自動發送實際數據報告');
        console.log('📋 報告類型包括:');
        console.log('   - 持倉異動排行 (正負各TOP 8)');
        console.log('   - 價格異動排行 (正負各TOP 8)');
        console.log('   - 資金費率排行 (正負各TOP 8)');
        console.log('📍 每個報告類型都發送到對應的專用Discord頻道');
        
        return true;
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
        
        const errorEmbed = {
            title: '❌ 監控報告測試失敗',
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
                    value: timestamp,
                    inline: true
                }
            ]
        };
        
        await discordService.sendEmbed(errorEmbed, 'funding_rate');
        return false;
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    testQuickReport()
        .then(success => {
            console.log(success ? '✅ 測試成功完成' : '❌ 測試失敗');
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 測試腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = testQuickReport;
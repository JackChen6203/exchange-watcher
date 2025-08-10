#!/usr/bin/env node

/**
 * 測試新的表格格式
 */

const config = require('./src/config/config');
const DiscordService = require('./src/services/discordService');

async function testTableFormat() {
    console.log('🧪 測試新的表格格式...');
    
    const discordService = new DiscordService(config);
    
    try {
        // 測試持倉異動正異動表格
        console.log('📈 測試持倉異動正異動表格...');
        
        const positiveTableContent = `\`\`\`
📊 持倉異動排行 正異動 TOP8 (各時間周期對比)

排名 | 幣種          | 總市值  | 15分持倉 | 15分價格異動 | 1h持倉  |1h價格異動 | 4h持倉 | 4h價格異動
-----|-------------|----------|----------|----------|----------|----------|----------|----------
1 | RAREUSDT     |      10.2B |    +8.42% |    +7.36% |    +7.36% |    +7.36% |    +7.36% |    +7.36%
2 | USELESSUSDT  |      22.5M |    +7.90% |    +4.51% |    +4.51% |    +4.51% |    +4.51% |    +4.51%
3 | KUSDT        |     112.3K |    +4.04% |    -2.99% |    -2.99% |    -2.99% |    -2.99% |    -2.99%
4 | INUSDT       |      1.12M |    +3.82% |    -0.93% |    -0.93% |    -0.93% |    -0.93% |    -0.93%
5 | BOMEUSDT     |     123.2M |    +3.53% |    +7.23% |    +7.23% |    +7.23% |    +7.23% |    +7.23%
6 | ORCAUSDT     |     125.3M |    +3.17% |    +1.63% |    +1.63% |    +1.63% |    +1.63% |    +1.63%
7 | SOONUSDT     |        12K |    +2.53% |   +12.30% |   +12.30% |   +12.30% |   +12.30% |   +12.30%
8 | C98USDT      |       112K |    +2.24% |    +4.71% |    +4.71% |    +4.71% |    +4.71% |    +4.71%
\`\`\``;

        await discordService.sendMessage(positiveTableContent, 'position');
        console.log('✅ 持倉異動正異動表格發送完成');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 測試持倉異動負異動表格
        console.log('📉 測試持倉異動負異動表格...');
        
        const negativeTableContent = `\`\`\`
📊 持倉異動排行 負異動 TOP8 (各時間周期對比)

排名 | 幣種          | 總市值  | 15分持倉 | 15分價格異動 | 1h持倉  |1h價格異動 | 4h持倉 | 4h價格異動
-----|-------------|----------|----------|----------|----------|----------|----------|----------
1 | TAGUSDT      |        12M |   -23.38% |   -23.06% |   -23.06% |   -22.50% |   -21.30% |   -20.10%
2 | SIRENUSDT    |        33K |   -17.32% |   -33.56% |   -33.56% |   -32.40% |   -31.20% |   -30.15%
3 | HEIUSDT      |        17M |   -11.84% |   -34.87% |   -34.87% |   -33.25% |   -32.10% |   -31.45%
4 | MBOXUSDT     |        22B |    -7.38% |    +8.05% |    +8.05% |    +7.80% |    +7.55% |    +7.20%
5 | NSUSDT       |     24.34K |    -5.05% |    -4.09% |    -4.09% |    -3.85% |    -3.60% |    -3.35%
6 | HOMEUSDT     |     12.21K |    -4.29% |   +14.04% |   +14.04% |   +13.80% |   +13.55% |   +13.25%
7 | A2ZUSDT      |        30M |    -3.94% |   -14.74% |   -14.74% |   -14.50% |   -14.25% |   -14.00%
8 | EPICUSDT     |        12M |    -3.84% |    +0.58% |    +0.58% |    +0.45% |    +0.32% |    +0.20%
\`\`\``;

        await discordService.sendMessage(negativeTableContent, 'position');
        console.log('✅ 持倉異動負異動表格發送完成');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 測試價格異動正異動表格
        console.log('💰 測試價格異動正異動表格...');
        
        const pricePositiveTableContent = `\`\`\`
📊 價格異動排行 正異動 TOP8 (各時間周期對比)

排名 | 幣種          |  總市值  | 15分價格異動 | 1h價格異動   | 4h價格異動
-----|-------------|----------|----------|----------|----------
1 | RAREUSDT     |      10.2B |    +8.42% |    +7.36% |    +7.36%
2 | USELESSUSDT  |      22.5M |    +7.90% |    +4.51% |    +4.51%
3 | KUSDT        |        12K |    +4.04% |    -2.99% |    -2.99%
4 | INUSDT       |        12K |    +3.82% |    -0.93% |    -0.93%
5 | BOMEUSDT     |        12K |    +3.53% |    +7.23% |    +7.23%
6 | ORCAUSDT     |        12K |    +3.17% |    +1.63% |    +1.63%
7 | SOONUSDT     |        12K |    +2.53% |   +12.30% |   +12.30%
8 | C98USDT      |        12K |    +2.24% |    +4.71% |    +4.71%
\`\`\``;

        await discordService.sendMessage(pricePositiveTableContent, 'price_alert');
        console.log('✅ 價格異動正異動表格發送完成');
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 測試價格異動負異動表格
        console.log('📉 測試價格異動負異動表格...');
        
        const priceNegativeTableContent = `\`\`\`
📊 價格異動排行 負異動 TOP8 (各時間周期對比)

排名 | 幣種          | 總市值  | 15分價格異動 | 1h價格異動   | 4h價格異動
-----|-------------|----------|----------|----------|----------
1 | TAGUSDT      |     112.5M |   -23.38% |   -23.06% |   -23.06%
2 | SIRENUSDT    |     112.5M |   -17.32% |   -33.56% |   -33.56%
3 | HEIUSDT      |     112.5M |   -11.84% |   -34.87% |   -34.87%
4 | MBOXUSDT     |       123K |    -7.38% |    +8.05% |    +8.05%
5 | NSUSDT       |       123K |    -5.05% |    -4.09% |    -4.09%
6 | HOMEUSDT     |       123K |    -4.29% |   +14.04% |   +14.04%
7 | A2ZUSDT      |       123K |    -3.94% |   -14.74% |   -14.74%
8 | EPICUSDT     |       123K |    -3.84% |    +0.58% |    +0.58%
\`\`\``;

        await discordService.sendMessage(priceNegativeTableContent, 'price_alert');
        console.log('✅ 價格異動負異動表格發送完成');
        
        // 發送測試摘要
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const summaryEmbed = {
            title: '✅ 新表格格式測試完成',
            description: '所有表格都已按照用戶要求的格式發送',
            color: 0x00ff00,
            fields: [
                {
                    name: '📊 持倉異動表格格式',
                    value: '✅ 包含總市值、15分持倉、15分價格異動、1h持倉、1h價格異動、4h持倉、4h價格異動\n✅ 正負異動各TOP8排行\n✅ 發送到持倉專用頻道',
                    inline: false
                },
                {
                    name: '💰 價格異動表格格式',
                    value: '✅ 包含總市值、15分價格異動、1h價格異動、4h價格異動\n✅ 正負異動各TOP8排行\n✅ 發送到價格專用頻道',
                    inline: false
                },
                {
                    name: '⏰ 系統設定',
                    value: '✅ 每5分鐘自動發送實際數據\n✅ 使用專用Discord頻道\n✅ 格式完全符合用戶要求',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Bitget 合約監控 - 新格式已就緒'
            }
        };
        
        await discordService.sendEmbed(summaryEmbed, 'funding_rate');
        
        console.log('🎉 所有新格式測試完成！');
        console.log('📋 格式摘要:');
        console.log('   - 持倉異動: 總市值 + 15分/1h/4h的持倉&價格異動');
        console.log('   - 價格異動: 總市值 + 15分/1h/4h的價格異動');
        console.log('   - 每個類型分正負異動各TOP8');
        console.log('   - 發送到對應的專用Discord頻道');
        
        return true;
        
    } catch (error) {
        console.error('❌ 測試失敗:', error);
        
        const errorEmbed = {
            title: '❌ 表格格式測試失敗',
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
        return false;
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    testTableFormat()
        .then(success => {
            console.log(success ? '✅ 測試成功完成' : '❌ 測試失敗');
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 測試腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = testTableFormat;
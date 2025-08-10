#!/usr/bin/env node

/**
 * 診斷價格異動欄位問題
 */

const config = require('./src/config/config');
const DiscordService = require('./src/services/discordService');
const BitgetContractMonitor = require('./src/services/bitgetContractMonitor');
const Logger = require('./src/utils/logger');

async function diagnosePriceChanges() {
    console.log('🔍 診斷價格異動欄位問題...');
    
    const logger = new Logger(config);
    const discordService = new DiscordService(config);
    const contractMonitor = new BitgetContractMonitor(config, discordService);
    
    try {
        // 初始化監控器
        console.log('🔧 初始化合約監控器...');
        await contractMonitor.initialize();
        
        // 等待系統建立歷史數據
        console.log('⏳ 等待歷史數據建立...');
        await new Promise(resolve => setTimeout(resolve, 30000));
        
        // 手動觸發一次數據更新來建立歷史數據
        console.log('🔄 手動觸發數據更新建立歷史基線...');
        await contractMonitor.updateContractData();
        
        // 等待更多時間讓歷史數據穩定
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // 再次更新以創建有意義的歷史比較
        console.log('🔄 再次更新數據以建立歷史比較...');
        await contractMonitor.updateContractData();
        
        // 檢查歷史數據狀態
        console.log('\\n📊 檢查歷史數據狀態...');
        console.log(`當前持倉數據: ${contractMonitor.openInterests.current.size} 個`);
        console.log(`15分鐘持倉數據: ${contractMonitor.openInterests['15m'].size} 個`);
        console.log(`1小時持倉數據: ${contractMonitor.openInterests['1h'].size} 個`);
        console.log(`4小時持倉數據: ${contractMonitor.openInterests['4h'].size} 個`);
        
        console.log(`當前價格數據: ${contractMonitor.priceData.current.size} 個`);
        console.log(`15分鐘價格數據: ${contractMonitor.priceData['15m'].size} 個`);
        console.log(`1小時價格數據: ${contractMonitor.priceData['1h'].size} 個`);
        console.log(`4小時價格數據: ${contractMonitor.priceData['4h'].size} 個`);
        
        // 手動執行綜合分析
        console.log('\\n🔍 執行綜合分析...');
        const analysisData = contractMonitor.calculateCombinedAnalysis();
        console.log(`綜合分析結果: ${analysisData.size} 個合約有數據`);
        
        // 檢查前幾個合約的詳細數據
        console.log('\\n📋 前5個合約的詳細分析數據:');
        let count = 0;
        for (const [symbol, data] of analysisData) {
            if (count >= 5) break;
            
            console.log(`\\n🔸 ${symbol}:`);
            console.log(`   當前價格: $${data.currentPrice || 'N/A'}`);
            console.log(`   當前持倉: $${data.currentPosition ? (data.currentPosition / 1000000).toFixed(2) + 'M' : 'N/A'}`);
            
            // 檢查持倉變動
            if (data.positionChanges['15m']) {
                console.log(`   15分持倉變動: ${data.positionChanges['15m'].percent.toFixed(2)}%`);
            } else {
                console.log(`   15分持倉變動: 無數據`);
            }
            
            // 檢查價格變動
            if (data.priceChanges['15m']) {
                console.log(`   15分價格變動: ${data.priceChanges['15m'].percent.toFixed(2)}%`);
            } else {
                console.log(`   15分價格變動: 無數據 ❌`);
            }
            
            if (data.priceChanges['1h']) {
                console.log(`   1小時價格變動: ${data.priceChanges['1h'].percent.toFixed(2)}%`);
            } else {
                console.log(`   1小時價格變動: 無數據 ❌`);
            }
            
            count++;
        }
        
        // 手動生成持倉異動表格測試
        console.log('\\n📊 嘗試生成持倉異動測試表格...');
        await contractMonitor.sendPositionChangeTable(analysisData);
        
        // 發送診斷結果到Discord
        const diagnosticEmbed = {
            title: '🔍 價格異動診斷結果',
            description: '檢查持倉異動報告中的價格異動欄位',
            color: 0x0099ff,
            fields: [
                {
                    name: '📊 數據狀態',
                    value: `綜合分析: ${analysisData.size} 個合約\\n當前價格: ${contractMonitor.priceData.current.size} 個\\n歷史價格: 15m=${contractMonitor.priceData['15m'].size}, 1h=${contractMonitor.priceData['1h'].size}`,
                    inline: false
                },
                {
                    name: '🔧 修復內容',
                    value: `✅ 修復shouldBackup建立基線數據\\n✅ 增加價格變動計算調試\\n✅ 確保歷史數據正確備份`,
                    inline: false
                },
                {
                    name: '📈 測試結果',
                    value: analysisData.size > 0 ? '✅ 數據分析正常運行' : '❌ 需要更多時間建立歷史數據',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Bitget 價格異動診斷'
            }
        };
        
        await discordService.sendEmbed(diagnosticEmbed, 'funding_rate');
        
        // 停止監控器
        contractMonitor.stop();
        
        return analysisData.size > 0;
        
    } catch (error) {
        console.error('❌ 診斷失敗:', error);
        
        const errorEmbed = {
            title: '❌ 價格異動診斷失敗',
            description: '診斷過程中發生錯誤',
            color: 0xff0000,
            fields: [
                {
                    name: '錯誤訊息',
                    value: error.message || '未知錯誤',
                    inline: false
                },
                {
                    name: '診斷時間',
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
    diagnosePriceChanges()
        .then(success => {
            console.log(success ? '✅ 診斷成功' : '⚠️ 需要更多時間建立歷史數據');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 診斷腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = diagnosePriceChanges;
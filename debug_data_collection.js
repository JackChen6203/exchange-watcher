#!/usr/bin/env node

/**
 * 診斷數據收集和表格生成功能
 */

const config = require('./src/config/config');
const DiscordService = require('./src/services/discordService');
const BitgetContractMonitor = require('./src/services/bitgetContractMonitor');
const Logger = require('./src/utils/logger');

async function debugDataCollection() {
    console.log('🔍 診斷數據收集和表格生成功能...');
    
    const logger = new Logger(config);
    const discordService = new DiscordService(config);
    const contractMonitor = new BitgetContractMonitor(config, discordService);
    
    try {
        // 初始化監控器
        console.log('🔧 初始化合約監控器...');
        await contractMonitor.initialize();
        
        // 等待初始數據收集完成
        console.log('⏳ 等待初始數據收集完成...');
        await new Promise(resolve => setTimeout(resolve, 30000)); // 等待30秒讓數據收集完成
        
        // 檢查當前數據狀態
        console.log('📊 檢查當前數據狀態...');
        console.log(`📈 持倉量數據: ${contractMonitor.openInterests.current.size} 個合約`);
        console.log(`💰 價格數據: ${contractMonitor.priceData.current.size} 個合約`);
        console.log(`💸 資金費率數據: ${contractMonitor.fundingRates.size} 個合約`);
        
        // 檢查歷史數據
        console.log('\n🔍 檢查歷史數據狀態...');
        console.log(`📊 15分鐘持倉數據: ${contractMonitor.openInterests['15m'].size} 個合約`);
        console.log(`📊 1小時持倉數據: ${contractMonitor.openInterests['1h'].size} 個合約`);
        console.log(`📊 4小時持倉數據: ${contractMonitor.openInterests['4h'].size} 個合約`);
        
        // 顯示前5個合約的詳細數據
        console.log('\n📋 前5個合約的詳細數據:');
        let count = 0;
        for (const [symbol, currentOI] of contractMonitor.openInterests.current) {
            if (count >= 5) break;
            
            const currentPrice = contractMonitor.priceData.current.get(symbol);
            const fundingRate = contractMonitor.fundingRates.get(symbol);
            
            console.log(`\n🔸 ${symbol}:`);
            console.log(`   持倉量: ${currentOI ? '$' + (currentOI.openInterestUsd / 1000000).toFixed(2) + 'M' : 'N/A'}`);
            console.log(`   價格: ${currentPrice ? '$' + currentPrice.lastPrice : 'N/A'}`);
            console.log(`   資金費率: ${fundingRate ? (fundingRate.fundingRate * 100).toFixed(4) + '%' : 'N/A'}`);
            
            count++;
        }
        
        // 嘗試生成綜合數據分析
        console.log('\n🔄 嘗試生成綜合數據分析...');
        const analysisData = contractMonitor.calculateCombinedAnalysis();
        console.log(`📊 分析數據: ${analysisData.size} 個合約有數據`);
        
        if (analysisData.size === 0) {
            console.log('⚠️ 沒有足夠的數據生成分析報告，可能需要更多時間收集歷史數據');
            
            // 手動觸發第二次數據收集
            console.log('🔄 手動觸發第二次數據收集...');
            await contractMonitor.updateContractData();
            
            // 等待並再次檢查
            await new Promise(resolve => setTimeout(resolve, 10000));
            const analysisData2 = contractMonitor.calculateCombinedAnalysis();
            console.log(`📊 第二次分析數據: ${analysisData2.size} 個合約有數據`);
        }
        
        // 顯示分析數據樣本
        if (analysisData.size > 0) {
            console.log('\n📋 分析數據樣本 (前3個合約):');
            let count = 0;
            for (const [symbol, data] of analysisData) {
                if (count >= 3) break;
                
                console.log(`\n🔸 ${symbol}:`);
                console.log(`   當前價格: $${data.currentPrice || 'N/A'}`);
                console.log(`   當前持倉量: $${data.currentPosition ? (data.currentPosition / 1000000).toFixed(2) + 'M' : 'N/A'}`);
                console.log(`   15分持倉變化: ${data.positionChanges['15m'] ? data.positionChanges['15m'].percent.toFixed(2) + '%' : 'N/A'}`);
                console.log(`   15分價格變化: ${data.priceChanges['15m'] ? data.priceChanges['15m'].percent.toFixed(2) + '%' : 'N/A'}`);
                
                count++;
            }
            
            // 嘗試生成實際表格
            console.log('\n📊 嘗試生成實際表格...');
            await contractMonitor.generateAndSendPositionPriceReport();
            console.log('✅ 表格已發送到Discord（如果有足夠數據）');
        }
        
        // 發送診斷報告到Discord
        const diagnosticEmbed = {
            title: '🔍 數據收集診斷報告',
            description: '系統數據收集狀態檢查',
            color: analysisData.size > 0 ? 0x00ff00 : 0xffa500,
            fields: [
                {
                    name: '📊 數據收集狀態',
                    value: `持倉量: ${contractMonitor.openInterests.current.size} 個合約\n價格: ${contractMonitor.priceData.current.size} 個合約\n資金費率: ${contractMonitor.fundingRates.size} 個合約`,
                    inline: false
                },
                {
                    name: '🕐 歷史數據狀態',
                    value: `15分鐘: ${contractMonitor.openInterests['15m'].size} 個\n1小時: ${contractMonitor.openInterests['1h'].size} 個\n4小時: ${contractMonitor.openInterests['4h'].size} 個`,
                    inline: false
                },
                {
                    name: '🔄 分析狀態',
                    value: analysisData.size > 0 ? 
                        `✅ 可生成報告 (${analysisData.size} 個合約)` : 
                        '⚠️ 需要更多時間收集歷史數據',
                    inline: false
                },
                {
                    name: '📅 建議',
                    value: analysisData.size > 0 ? 
                        '系統正常，每5分鐘將發送實際數據報告' :
                        '請等待15-20分鐘讓系統收集足夠的歷史數據',
                    inline: false
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Bitget 合約監控 - 數據診斷'
            }
        };
        
        await discordService.sendEmbed(diagnosticEmbed, 'funding_rate');
        
        // 停止監控器
        contractMonitor.stop();
        
        return analysisData.size > 0;
        
    } catch (error) {
        console.error('❌ 診斷失敗:', error);
        
        const errorEmbed = {
            title: '❌ 數據收集診斷失敗',
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
    debugDataCollection()
        .then(success => {
            console.log(success ? '✅ 診斷成功 - 系統有足夠數據' : '⚠️ 診斷完成 - 需要更多時間收集數據');
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 診斷腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = debugDataCollection;
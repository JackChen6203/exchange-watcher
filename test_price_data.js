#!/usr/bin/env node

/**
 * 測試價格數據收集功能
 */

const config = require('./src/config/config');
const BitgetApi = require('./src/services/bitgetApi');

async function testPriceData() {
    console.log('🧪 測試價格數據收集功能...');
    
    const bitgetApi = new BitgetApi(config);
    
    try {
        // 測試批量獲取所有ticker
        console.log('📊 測試批量獲取所有ticker...');
        const allTickers = await bitgetApi.getAllTickers('umcbl');
        
        console.log(`✅ 成功獲取 ${allTickers.length} 個ticker數據`);
        
        // 顯示前5個ticker數據
        console.log('\n📋 前5個ticker數據:');
        allTickers.slice(0, 5).forEach((ticker, index) => {
            console.log(`${index + 1}. ${ticker.symbol}: $${ticker.lastPrice} (${ticker.changePercent24h > 0 ? '+' : ''}${ticker.changePercent24h.toFixed(2)}%)`);
        });
        
        // 測試單個ticker獲取
        console.log('\n💰 測試單個ticker獲取...');
        const singleTicker = await bitgetApi.getSymbolTicker('BTCUSDT', 'umcbl');
        console.log(`BTCUSDT: $${singleTicker.lastPrice} (${singleTicker.changePercent24h > 0 ? '+' : ''}${singleTicker.changePercent24h.toFixed(2)}%)`);
        
        return { success: true, tickerCount: allTickers.length };
        
    } catch (error) {
        console.error('❌ 價格數據測試失敗:', error);
        return { success: false, error: error.message };
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    testPriceData()
        .then(result => {
            if (result.success) {
                console.log(`✅ 價格數據測試成功 - 獲取了 ${result.tickerCount} 個ticker`);
                process.exit(0);
            } else {
                console.log(`❌ 價格數據測試失敗 - ${result.error}`);
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 測試腳本執行失敗:', error);
            process.exit(1);
        });
}

module.exports = testPriceData;
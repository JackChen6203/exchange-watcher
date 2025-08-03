const DatabaseManager = require('../src/services/databaseManager');
const config = require('../src/config/config');

async function checkProgress() {
  console.log('📊 檢查監控進度...\n');
  
  const db = new DatabaseManager(config);
  await db.initialize();
  
  try {
    // 獲取數據庫統計
    const stats = await db.getStats();
    
    console.log('📈 數據庫統計:');
    console.log(`   持倉量記錄: ${stats.open_interest} 條`);
    console.log(`   資金費率記錄: ${stats.funding_rate} 條`);
    console.log(`   價格記錄: ${stats.price_data} 條`);
    console.log(`   排行榜快照: ${stats.ranking_snapshots} 條\n`);
    
    // 獲取最新的持倉量數據
    const latestOI = await db.allQuery(`
      SELECT symbol, open_interest, change_percent, timestamp 
      FROM open_interest 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    
    console.log('📊 最新持倉量數據 (前10個):');
    latestOI.forEach((record, index) => {
      const time = new Date(record.timestamp).toLocaleTimeString('zh-TW');
      const changeSymbol = record.change_percent > 0 ? '+' : '';
      console.log(`   ${index + 1}. ${record.symbol}: ${record.open_interest.toFixed(2)} (${changeSymbol}${record.change_percent.toFixed(2)}%) [${time}]`);
    });
    
    console.log('\n📊 最新資金費率數據 (前10個):');
    const latestFR = await db.allQuery(`
      SELECT symbol, funding_rate, timestamp 
      FROM funding_rate 
      ORDER BY timestamp DESC 
      LIMIT 10
    `);
    
    latestFR.forEach((record, index) => {
      const time = new Date(record.timestamp).toLocaleTimeString('zh-TW');
      const ratePercent = (record.funding_rate * 100).toFixed(4);
      console.log(`   ${index + 1}. ${record.symbol}: ${ratePercent}% [${time}]`);
    });
    
    // 檢查不同合約的覆蓋範圍
    const uniqueSymbols = await db.getQuery(`
      SELECT COUNT(DISTINCT symbol) as count FROM open_interest
    `);
    
    console.log(`\n🎯 監控覆蓋範圍:`);
    console.log(`   不同合約數量: ${uniqueSymbols.count} 個`);
    
    // 檢查最近1小時的數據更新
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentUpdates = await db.getQuery(`
      SELECT COUNT(*) as count FROM open_interest WHERE timestamp > ?
    `, [oneHourAgo]);
    
    console.log(`   最近1小時更新: ${recentUpdates.count} 條記錄`);
    
    if (uniqueSymbols.count >= 400) {
      console.log('\n✅ 監控範圍良好！正在監控大量合約。');
    } else if (uniqueSymbols.count >= 100) {
      console.log('\n⚠️ 監控範圍適中，可以考慮擴大覆蓋。');
    } else {
      console.log('\n❌ 監控範圍較小，建議檢查配置。');
    }
    
  } catch (error) {
    console.error('❌ 檢查進度失敗:', error);
  } finally {
    db.close();
  }
}

// 執行檢查
if (require.main === module) {
  checkProgress().catch(error => {
    console.error('❌ 執行失敗:', error);
    process.exit(1);
  });
}

module.exports = checkProgress;
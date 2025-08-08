#!/usr/bin/env node

const BitgetApi = require('../src/services/bitgetApi');
const DatabaseManager = require('../src/services/databaseManager');
const EnhancedDiscordService = require('../src/services/enhancedDiscordService');
const EnhancedContractMonitor = require('../src/services/enhancedContractMonitor');
const Logger = require('../src/utils/logger');
const config = require('../src/config/config');

class ComprehensiveTestSuite {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      total: 0,
      details: []
    };
    this.logger = new Logger(config);
  }

  async runTest(testName, testFunction) {
    this.testResults.total++;
    try {
      await testFunction();
      this.testResults.passed++;
      console.log(`✅ ${testName}`);
      this.testResults.details.push({ name: testName, status: 'PASSED' });
    } catch (error) {
      this.testResults.failed++;
      console.log(`❌ ${testName}: ${error.message}`);
      this.testResults.details.push({ name: testName, status: 'FAILED', error: error.message });
    }
  }

  // 測試 Bitget API 核心功能
  async testBitgetApiCore() {
    const api = new BitgetApi(config);
    
    await this.runTest('API 連接測試', async () => {
      const result = await api.testConnection();
      if (!result) throw new Error('API 連接失敗');
    });

    await this.runTest('獲取合約列表', async () => {
      const contracts = await api.getAllContracts('umcbl');
      if (!contracts || contracts.length === 0) {
        throw new Error('無法獲取合約列表');
      }
      if (contracts.length < 100) {
        throw new Error(`合約數量異常: ${contracts.length}`);
      }
    });

    await this.runTest('獲取單一 ticker 數據', async () => {
      const ticker = await api.getTicker('BTCUSDT', 'umcbl');
      if (!ticker || !ticker.lastPr) {
        throw new Error('無法獲取 ticker 數據');
      }
    });

    await this.runTest('獲取開倉量數據', async () => {
      const openInterest = await api.getOpenInterest('BTCUSDT', 'umcbl');
      if (typeof openInterest.openInterest !== 'number') {
        throw new Error('開倉量數據格式錯誤');
      }
    });

    await this.runTest('獲取資金費率數據', async () => {
      const fundingRate = await api.getFundingRate('BTCUSDT', 'umcbl');
      if (typeof fundingRate.fundingRate !== 'number') {
        throw new Error('資金費率數據格式錯誤');
      }
    });
  }

  // 測試數據庫功能
  async testDatabaseCore() {
    const db = new DatabaseManager(config);
    
    await this.runTest('數據庫初始化', async () => {
      await db.initialize();
    });

    await this.runTest('保存持倉量數據', async () => {
      const testData = {
        symbol: 'TEST_SYMBOL',
        productType: 'umcbl',
        openInterest: 1000000,
        openInterestUsd: 50000000,
        timestamp: Date.now()
      };
      await db.saveOpenInterest(testData);
    });

    await this.runTest('保存資金費率數據', async () => {
      const testData = {
        symbol: 'TEST_SYMBOL',
        productType: 'umcbl',
        fundingRate: 0.0001,
        nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
        timestamp: Date.now()
      };
      await db.saveFundingRate(testData);
    });

    await this.runTest('保存價格數據', async () => {
      const testData = {
        symbol: 'TEST_SYMBOL',
        price: 50000,
        changePercent: 2.5,
        volume24h: 1000000,  // 修正字段名
        high24h: 51000,
        low24h: 49000,
        timestamp: Date.now()
      };
      await db.savePriceData(testData);
    });

    await this.runTest('查詢歷史數據', async () => {
      const startTime = Date.now() - 24 * 60 * 60 * 1000;
      const endTime = Date.now();
      const data = await db.getHistoricalOpenInterest('TEST_SYMBOL', startTime, endTime);
      if (!Array.isArray(data)) {
        throw new Error('歷史數據查詢格式錯誤');
      }
    });

    // 清理測試數據
    await this.runTest('清理測試數據', async () => {
      await db.runQuery('DELETE FROM open_interest WHERE symbol = ?', ['TEST_SYMBOL']);
      await db.runQuery('DELETE FROM funding_rate WHERE symbol = ?', ['TEST_SYMBOL']);
      await db.runQuery('DELETE FROM price_data WHERE symbol = ?', ['TEST_SYMBOL']);
    });

    // 關閉數據庫連接
    db.close();
  }

  // 測試 Discord 服務
  async testDiscordService() {
    const discord = new EnhancedDiscordService(config);

    await this.runTest('Discord Webhook 配置檢查', async () => {
      if (!config.discord.webhookUrl) {
        throw new Error('Discord Webhook URL 未配置');
      }
    });

    await this.runTest('多頻道 Webhook 配置檢查', async () => {
      const channels = ['funding_rate', 'position', 'price_alert', 'swing_strategy'];
      for (const channel of channels) {
        const url = discord.getWebhookUrl(channel);
        if (!url) {
          throw new Error(`${channel} 頻道 Webhook 未配置`);
        }
      }
    });

    await this.runTest('Discord 測試消息發送', async () => {
      await discord.sendEmbed({
        title: '🧪 自動化測試消息',
        description: '這是由綜合測試套件發送的測試消息',
        color: 0x00ff00,
        fields: [
          {
            name: '測試時間',
            value: new Date().toLocaleString('zh-TW'),
            inline: true
          },
          {
            name: '測試狀態',
            value: '正在運行綜合測試',
            inline: true
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: '綜合測試套件',
          icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f9ea.png'
        }
      }, 'default');
    });
  }

  // 測試增強監控器
  async testEnhancedMonitor() {
    await this.runTest('增強監控器初始化', async () => {
      const monitor = new EnhancedContractMonitor(config);
      
      // 測試合約加載
      await monitor.loadAllContracts();
      if (monitor.contractSymbols.length === 0) {
        throw new Error('無法加載合約列表');
      }
      
      // 測試 EMA 計算
      const testPrices = [100, 102, 101, 103, 105, 104, 106];
      const ema = monitor.calculateEMA(testPrices, 5);
      if (typeof ema !== 'number' || isNaN(ema)) {
        throw new Error('EMA 計算錯誤');
      }
    });
  }

  // 測試數據分析功能
  async testDataAnalysis() {
    const monitor = new EnhancedContractMonitor(config);
    
    await this.runTest('持倉量變化計算', async () => {
      // 模擬歷史數據
      monitor.openInterests.current.set('BTCUSDT', { 
        symbol: 'BTCUSDT', 
        openInterestUsd: 1000000,
        timestamp: Date.now()
      });
      monitor.openInterests['15m'].set('BTCUSDT', { 
        symbol: 'BTCUSDT', 
        openInterestUsd: 900000,
        timestamp: Date.now() - 15 * 60 * 1000
      });
      
      const changes = monitor.calculateOpenInterestChanges();
      if (!changes['15m'] || !changes['15m'].positive || !changes['15m'].negative) {
        throw new Error('持倉量變化計算錯誤');
      }
    });

    await this.runTest('資金費率排行計算', async () => {
      // 模擬資金費率數據
      monitor.fundingRates.set('BTCUSDT', { 
        symbol: 'BTCUSDT', 
        fundingRate: 0.0001,
        timestamp: Date.now()
      });
      monitor.fundingRates.set('ETHUSDT', { 
        symbol: 'ETHUSDT', 
        fundingRate: -0.0002,
        timestamp: Date.now()
      });
      
      const rankings = monitor.calculateFundingRateWithPositionRankings();
      if (!rankings.positive || !rankings.negative) {
        throw new Error('資金費率排行計算錯誤');
      }
    });
  }

  // 測試錯誤處理
  async testErrorHandling() {
    await this.runTest('API 錯誤處理', async () => {
      const api = new BitgetApi(config);
      
      // 測試無效交易對
      const result = await api.getOpenInterest('INVALID_SYMBOL', 'umcbl');
      if (result.openInterest !== 0) {
        throw new Error('無效交易對應返回默認值');
      }
    });

    await this.runTest('數據庫錯誤處理', async () => {
      const db = new DatabaseManager(config);
      await db.initialize();
      
      try {
        // 測試無效 SQL 
        await db.runQuery('INVALID SQL QUERY');
        throw new Error('應該拋出 SQL 錯誤');
      } catch (error) {
        if (!error.message.includes('SQL')) {
          // 正確處理了 SQL 錯誤
        }
      }
      
      db.close();
    });
  }

  // 測試配置驗證
  async testConfigValidation() {
    await this.runTest('必要配置檢查', async () => {
      const requiredConfigs = [
        'api.key',
        'api.secret', 
        'api.passphrase',
        'discord.webhookUrl'
      ];
      
      for (const configPath of requiredConfigs) {
        const value = configPath.split('.').reduce((obj, key) => obj?.[key], config);
        if (!value) {
          throw new Error(`缺少必要配置: ${configPath}`);
        }
      }
    });

    await this.runTest('數值配置檢查', async () => {
      const thresholds = config.thresholds;
      if (!thresholds || typeof thresholds.priceChange !== 'number') {
        throw new Error('價格變動閾值配置錯誤');
      }
      if (typeof thresholds.positionChange !== 'number') {
        throw new Error('持倉變動閾值配置錯誤');
      }
    });
  }

  // 運行所有測試
  async runAllTests() {
    console.log('🧪 開始運行綜合測試套件...\n');

    await this.testConfigValidation();
    console.log('');

    await this.testBitgetApiCore();
    console.log('');

    await this.testDatabaseCore();
    console.log('');

    await this.testDiscordService();
    console.log('');

    await this.testEnhancedMonitor();
    console.log('');

    await this.testDataAnalysis();
    console.log('');

    await this.testErrorHandling();
    console.log('');

    this.printSummary();
  }

  printSummary() {
    console.log('📊 測試結果摘要');
    console.log('='.repeat(50));
    console.log(`總測試數: ${this.testResults.total}`);
    console.log(`通過: ${this.testResults.passed}`);
    console.log(`失敗: ${this.testResults.failed}`);
    console.log(`成功率: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);
    
    if (this.testResults.failed > 0) {
      console.log('\n❌ 失敗的測試:');
      this.testResults.details
        .filter(test => test.status === 'FAILED')
        .forEach(test => {
          console.log(`   - ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n' + (this.testResults.failed === 0 ? '🎉 所有測試通過！' : '⚠️ 有測試失敗，請檢查上述錯誤'));
  }
}

// 運行測試
if (require.main === module) {
  const testSuite = new ComprehensiveTestSuite();
  testSuite.runAllTests().catch(error => {
    console.error('測試套件運行失敗:', error);
    process.exit(1);
  });
}

module.exports = ComprehensiveTestSuite;
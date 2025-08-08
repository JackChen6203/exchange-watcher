const WebSocket = require('ws');
const BitgetApi = require('./bitgetApi');
const Logger = require('../utils/logger');
const DatabaseManager = require('./databaseManager');

class BitgetContractMonitor {
  constructor(config, discordService) {
    this.config = config;
    this.discordService = discordService;
    this.bitgetApi = new BitgetApi(config);
    this.logger = new Logger(config);
    this.db = new DatabaseManager(config);
    
    // 持倉量數據存儲 (支持多個時間週期)
    this.openInterests = {
      current: new Map(),   // 當前數據
      '5m': new Map(),      // 5分鐘前
      '15m': new Map(),     // 15分鐘前
      '1h': new Map(),      // 1小時前  
      '4h': new Map(),      // 4小時前
      '1d': new Map()       // 1天前
    };
    
    // 價格數據存儲 (支持多個時間週期)
    this.priceData = {
      current: new Map(),   // 當前價格數據
      '5m': new Map(),      // 5分鐘前
      '15m': new Map(),     // 15分鐘前
      '1h': new Map(),      // 1小時前
      '4h': new Map(),      // 4小時前
      '1d': new Map()       // 1天前
    };
    
    // 資金費率數據存儲
    this.fundingRates = new Map();
    
    // 合約交易對列表
    this.contractSymbols = [];
    
    // 定期監控間隔
    this.monitoringInterval = null;
    this.reportingInterval = null;
    this.fundingRateAlertInterval = null;
    
    // 數據歷史記錄
    this.dataHistory = {
      openInterest: [],
      fundingRate: []
    };
  }

  async initialize() {
    try {
      this.logger.console('🚀 初始化Bitget合約監控系統...');
      
      // 初始化數據庫
      await this.db.initialize();
      
      // 測試API連接
      const connectionTest = await this.bitgetApi.testConnection();
      if (!connectionTest) {
        throw new Error('API連接測試失敗');
      }

      // 載入合約交易對
      await this.loadContractSymbols();
      
      // 初始化數據收集
      await this.collectInitialData();
      
      // 啟動定期監控
      this.startPeriodicMonitoring();
      
      // 啟動15分鐘報告
      this.startPeriodicReporting();
      
      // 啟動資金費率提醒
      this.startFundingRateAlerts();
      
      this.logger.console('✅ Bitget合約監控系統初始化完成');
      
    } catch (error) {
      this.logger.error('❌ 初始化失敗:', error);
      throw error;
    }
  }

  async loadContractSymbols() {
    try {
      this.logger.info('📊 載入合約交易對...');
      
      // 獲取USDT永續合約
      const symbols = await this.bitgetApi.getSymbolsByProductType('umcbl');
      this.contractSymbols = symbols.filter(s => s.status === 'normal');
      
      this.logger.info(`📈 成功載入 ${this.contractSymbols.length} 個合約交易對`);
      
    } catch (error) {
      this.logger.error('❌ 載入合約交易對失敗:', error);
      // 使用主要合約作為備用
      this.contractSymbols = [
        { symbol: 'BTCUSDT', productType: 'umcbl' },
        { symbol: 'ETHUSDT', productType: 'umcbl' },
        { symbol: 'BNBUSDT', productType: 'umcbl' }
      ];
      this.logger.warn('⚠️ 使用備用合約交易對列表');
    }
  }

  async collectInitialData() {
    try {
      this.logger.info('📊 收集初始數據...');
      
      // 批量獲取所有合約的開倉量
      const openInterestData = await this.bitgetApi.getAllOpenInterest('umcbl');
      
      // 存儲當前開倉量數據
      openInterestData.forEach(async (data) => {
        this.openInterests.current.set(data.symbol, data);
        // 保存到數據庫
        try {
          await this.db.saveOpenInterest(data);
        } catch (error) {
          this.logger.debug(`⚠️ 保存 ${data.symbol} 持倉量數據失敗:`, error.message);
        }
      });
      
      // 獲取資金費率 (分批處理避免API限制)
      const batchSize = 10;
      for (let i = 0; i < this.contractSymbols.length; i += batchSize) {
        const batch = this.contractSymbols.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (contract) => {
          try {
            const fundingRate = await this.bitgetApi.getFundingRate(contract.symbol, 'umcbl');
            this.fundingRates.set(contract.symbol, fundingRate);
            // 保存到數據庫
            await this.db.saveFundingRate(fundingRate);
          } catch (error) {
            this.logger.warn(`⚠️ 獲取 ${contract.symbol} 資金費率失敗:`, error.message);
          }
        }));
        
        // 批次間延遲
        if (i + batchSize < this.contractSymbols.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      this.logger.info(`✅ 收集到 ${this.openInterests.current.size} 個開倉量數據和 ${this.fundingRates.size} 個資金費率數據`);
      
    } catch (error) {
      this.logger.error('❌ 收集初始數據失敗:', error);
    }
  }

  startPeriodicMonitoring() {
    // 每5分鐘更新一次數據
    this.monitoringInterval = setInterval(async () => {
      await this.updateContractData();
    }, 5 * 60 * 1000); // 5分鐘
    
    this.logger.info('🔄 啟動定期監控 (每5分鐘更新合約數據)');
  }

  startPeriodicReporting() {
    // 每5分鐘發送持倉異動和價格異動報告
    this.positionPriceReportInterval = setInterval(async () => {
      await this.generateAndSendPositionPriceReport();
    }, 5 * 60 * 1000); // 5分鐘
    
    // 每小時50分、55分、59分發送資金費率報告
    this.fundingRateReportInterval = setInterval(async () => {
      const now = new Date();
      const minutes = now.getMinutes();
      
      if (minutes === 50 || minutes === 55 || minutes === 59) {
        await this.generateAndSendFundingRateReport();
      }
    }, 60 * 1000); // 每分鐘檢查一次
    
    this.logger.info('📊 啟動定期報告:');
    this.logger.info('   - 持倉/價格異動: 每5分鐘');
    this.logger.info('   - 資金費率: 每小時50、55、59分');
  }

  async updateContractData() {
    try {
      this.logger.debug('🔍 更新合約數據中...');
      
      // 備份歷史數據
      this.backupHistoricalData();
      
      // 獲取最新持倉量數據
      const openInterestData = await this.bitgetApi.getAllOpenInterest('umcbl');
      
      // 更新當前持倉量數據
      openInterestData.forEach(data => {
        this.openInterests.current.set(data.symbol, data);
      });
      
      // 獲取價格數據 (分批處理避免API限制)
      await this.updatePriceData();
      
      // 更新資金費率數據 (分批處理)
      const activeSylmbols = Array.from(this.openInterests.current.keys()).slice(0, 50); // 只更新前50個活躍合約
      const batchSize = 10;
      
      for (let i = 0; i < activeSylmbols.length; i += batchSize) {
        const batch = activeSylmbols.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (symbol) => {
          try {
            const fundingRate = await this.bitgetApi.getFundingRate(symbol, 'umcbl');
            this.fundingRates.set(symbol, fundingRate);
          } catch (error) {
            this.logger.debug(`⚠️ 更新 ${symbol} 資金費率失敗:`, error.message);
          }
        }));
        
        // 批次間延遲
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      this.logger.debug('✅ 合約數據更新完成');
      
    } catch (error) {
      this.logger.error('❌ 更新合約數據失敗:', error);
    }
  }

  async updatePriceData() {
    try {
      const symbols = Array.from(this.openInterests.current.keys());
      const batchSize = 10; // 每批處理10個合約
      
      for (let i = 0; i < Math.min(symbols.length, 50); i += batchSize) { // 只處理前50個活躍合約
        const batch = symbols.slice(i, i + batchSize);
        
        const pricePromises = batch.map(async (symbol) => {
          try {
            const ticker = await this.bitgetApi.getSymbolTicker(symbol);
            this.priceData.current.set(symbol, {
              symbol: ticker.symbol,
              lastPrice: ticker.lastPrice,
              change24h: ticker.change24h,
              changePercent24h: ticker.changePercent24h,
              timestamp: ticker.timestamp
            });
          } catch (error) {
            this.logger.debug(`⚠️ 無法獲取${symbol}價格:`, error.message);
          }
        });
        
        await Promise.all(pricePromises);
        // 避免API限制，每批之間暫停
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      this.logger.debug(`💰 更新價格數據完成: ${this.priceData.current.size}個合約`);
      
    } catch (error) {
      this.logger.error('❌ 更新價格數據失敗:', error);
    }
  }

  backupHistoricalData() {
    const now = Date.now();
    const currentOIData = this.openInterests.current;
    const currentPriceData = this.priceData.current;
    
    // 檢查是否需要備份到各個時間點
    if (this.shouldBackup('5m', now)) {
      this.openInterests['5m'] = new Map(currentOIData);
      this.priceData['5m'] = new Map(currentPriceData);
    }
    if (this.shouldBackup('15m', now)) {
      this.openInterests['15m'] = new Map(currentOIData);
      this.priceData['15m'] = new Map(currentPriceData);
    }
    if (this.shouldBackup('1h', now)) {
      this.openInterests['1h'] = new Map(currentOIData);
      this.priceData['1h'] = new Map(currentPriceData);
    }
    if (this.shouldBackup('4h', now)) {
      this.openInterests['4h'] = new Map(currentOIData);
      this.priceData['4h'] = new Map(currentPriceData);
    }
    if (this.shouldBackup('1d', now)) {
      this.openInterests['1d'] = new Map(currentOIData);
      this.priceData['1d'] = new Map(currentPriceData);
    }
  }

  shouldBackup(period, now) {
    // 簡化的備份邏輯，實際應該基於精確的時間間隔
    const intervals = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    
    if (!this.lastBackupTime) {
      this.lastBackupTime = {};
    }
    
    const lastBackup = this.lastBackupTime[period] || 0;
    if (now - lastBackup >= intervals[period]) {
      this.lastBackupTime[period] = now;
      return true;
    }
    return false;
  }

  async generateAndSendPositionPriceReport() {
    try {
      this.logger.info('📊 生成持倉異動和價格變動排行報告...');
      
      // 生成綜合數據分析
      const analysisData = this.calculateCombinedAnalysis();
      
      if (analysisData.size === 0) {
        this.logger.info('⚠️ 暫無足夠數據生成報告');
        return;
      }
      
      // 發送持倉異動排行表格 (正異動和負異動各8個)
      await this.sendPositionChangeTable(analysisData);
      
      // 間隔發送
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 發送價格異動排行表格 (正異動和負異動各8個)
      await this.sendPriceChangeTable(analysisData);
      
      this.logger.info('✅ 持倉/價格異動報告發送完成');
      
    } catch (error) {
      this.logger.error('❌ 生成持倉/價格異動報告失敗:', error);
    }
  }

  async generateAndSendFundingRateReport() {
    try {
      this.logger.info('💰 生成資金費率排行報告...');
      
      // 生成資金費率排行
      const fundingRateRankings = this.calculateFundingRateRankings();
      
      if (fundingRateRankings.positive.length === 0 && fundingRateRankings.negative.length === 0) {
        this.logger.info('⚠️ 暫無資金費率數據');
        return;
      }
      
      // 發送資金費率報告
      await this.sendFundingRateReport(fundingRateRankings);
      
      this.logger.info('✅ 資金費率報告發送完成');
      
    } catch (error) {
      this.logger.error('❌ 生成資金費率報告失敗:', error);
    }
  }

  calculateCombinedAnalysis() {
    const periods = ['5m', '15m', '1h', '4h'];
    const analysis = new Map();
    
    // 獲取所有有數據的交易對
    const allSymbols = new Set([
      ...this.openInterests.current.keys(),
      ...this.priceData.current.keys()
    ]);
    
    allSymbols.forEach(symbol => {
      const symbolData = {
        symbol,
        positionChanges: {},
        priceChanges: {},
        currentPrice: 0,
        currentPosition: 0
      };
      
      // 獲取當前價格和持倉量
      const currentPrice = this.priceData.current.get(symbol);
      const currentPosition = this.openInterests.current.get(symbol);
      
      if (currentPrice) symbolData.currentPrice = currentPrice.lastPrice;
      if (currentPosition) symbolData.currentPosition = currentPosition.openInterestUsd;
      
      // 計算各時間周期的變化
      periods.forEach(period => {
        // 持倉量變化
        const historicalPosition = this.openInterests[period]?.get(symbol);
        if (historicalPosition && currentPosition) {
          const posChange = currentPosition.openInterestUsd - historicalPosition.openInterestUsd;
          const posChangePercent = (posChange / historicalPosition.openInterestUsd) * 100;
          symbolData.positionChanges[period] = {
            absolute: posChange,
            percent: posChangePercent
          };
        }
        
        // 價格變化  
        const historicalPrice = this.priceData[period]?.get(symbol);
        if (historicalPrice && currentPrice) {
          const priceChange = currentPrice.lastPrice - historicalPrice.lastPrice;
          const priceChangePercent = (priceChange / historicalPrice.lastPrice) * 100;
          symbolData.priceChanges[period] = {
            absolute: priceChange,
            percent: priceChangePercent
          };
        }
      });
      
      // 只保存有變化數據的交易對
      if (Object.keys(symbolData.positionChanges).length > 0 || 
          Object.keys(symbolData.priceChanges).length > 0) {
        analysis.set(symbol, symbolData);
      }
    });
    
    return analysis;
  }

  calculatePositionChanges() {
    const periods = ['15m', '1h', '4h', '1d'];
    const results = {};
    
    periods.forEach(period => {
      const currentData = this.openInterests.current;
      const historicalData = this.openInterests[period];
      const changes = [];
      
      if (historicalData && historicalData.size > 0) {
        currentData.forEach((current, symbol) => {
          const historical = historicalData.get(symbol);
          if (historical) {
            const change = current.openInterestUsd - historical.openInterestUsd;
            const changePercent = (change / historical.openInterestUsd) * 100;
            
            changes.push({
              symbol,
              current: current.openInterestUsd,
              previous: historical.openInterestUsd,
              change,
              changePercent
            });
          }
        });
      }
      
      // 排序：正異動和負異動分別排序
      const positiveChanges = changes
        .filter(c => c.change > 0)
        .sort((a, b) => b.changePercent - a.changePercent)
        .slice(0, 15);
        
      const negativeChanges = changes
        .filter(c => c.change < 0)
        .sort((a, b) => a.changePercent - b.changePercent)
        .slice(0, 15);
      
      results[period] = {
        positive: positiveChanges,
        negative: negativeChanges
      };
    });
    
    return results;
  }

  calculateFundingRateRankings() {
    const fundingRates = Array.from(this.fundingRates.values())
      .filter(rate => rate.fundingRate != null)
      .map(rate => ({
        symbol: rate.symbol,
        fundingRate: rate.fundingRate,
        fundingRatePercent: rate.fundingRate * 100
      }));
    
    // 正資金費率排行（最高15個）
    const positiveFunding = fundingRates
      .filter(rate => rate.fundingRate > 0)
      .sort((a, b) => b.fundingRate - a.fundingRate)
      .slice(0, 15);
    
    // 負資金費率排行（最低15個）
    const negativeFunding = fundingRates
      .filter(rate => rate.fundingRate < 0)
      .sort((a, b) => a.fundingRate - b.fundingRate)
      .slice(0, 15);
    
    return {
      positive: positiveFunding,
      negative: negativeFunding
    };
  }

  async sendPositionChangeReport(positionChanges) {
    const periods = ['15m', '1h', '4h', '1d'];
    const periodNames = {
      '15m': '15分',
      '1h': '1時', 
      '4h': '4時',
      '1d': '日線'
    };
    
    // 收集所有期間的正異動數據，合併成一個表格
    await this.sendCombinedPositiveChangesReport(positionChanges, periods, periodNames);
    
    // 間隔發送
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 收集所有期間的負異動數據，合併成一個表格
    await this.sendCombinedNegativeChangesReport(positionChanges, periods, periodNames);
  }

  async sendCombinedPositiveChangesReport(positionChanges, periods, periodNames) {
    // 收集所有交易對的多時間週期數據
    const combinedData = new Map();
    
    periods.forEach(period => {
      const data = positionChanges[period];
      if (data && data.positive.length > 0) {
        data.positive.slice(0, 10).forEach(item => { // 每個時間週期取前10名
          if (!combinedData.has(item.symbol)) {
            combinedData.set(item.symbol, {
              symbol: item.symbol,
              current: item.current,
              changes: {}
            });
          }
          combinedData.get(item.symbol).changes[period] = item.changePercent;
        });
      }
    });

    if (combinedData.size === 0) return;

    // 按15分鐘變化排序
    const sortedData = Array.from(combinedData.values())
      .sort((a, b) => (b.changes['15m'] || 0) - (a.changes['15m'] || 0))
      .slice(0, 15);

    // 生成表格
    const tableRows = sortedData.map((item, index) => {
      const symbol = item.symbol.padEnd(10);
      const current = this.formatNumber(item.current).padStart(8);
      const change15m = this.formatChangePercent(item.changes['15m'] || 0).padStart(7);
      const change1h = this.formatChangePercent(item.changes['1h'] || 0).padStart(7);
      const change4h = this.formatChangePercent(item.changes['4h'] || 0).padStart(7);
      const change1d = this.formatChangePercent(item.changes['1d'] || 0).padStart(7);
      
      return `${(index + 1).toString().padStart(2)} | ${symbol} | ${current} | ${change15m} | ${change1h} | ${change4h} | ${change1d}`;
    }).join('\n');

    const tableContent = `\`\`\`
📈 持倉量增長排行 TOP15 (多時間週期漲幅對比)

排名 | 交易對      | 當前持倉   | 15分    | 1時     | 4時     | 日線
-----|-----------|----------|---------|---------|---------|--------
${tableRows}
\`\`\``;

    await this.discordService.sendMessage(tableContent);
  }

  async sendCombinedNegativeChangesReport(positionChanges, periods, periodNames) {
    // 收集所有交易對的多時間週期數據
    const combinedData = new Map();
    
    periods.forEach(period => {
      const data = positionChanges[period];
      if (data && data.negative.length > 0) {
        data.negative.slice(0, 10).forEach(item => { // 每個時間週期取前10名
          if (!combinedData.has(item.symbol)) {
            combinedData.set(item.symbol, {
              symbol: item.symbol,
              current: item.current,
              changes: {}
            });
          }
          combinedData.get(item.symbol).changes[period] = item.changePercent;
        });
      }
    });

    if (combinedData.size === 0) return;

    // 按15分鐘變化排序（負值，所以是從小到大）
    const sortedData = Array.from(combinedData.values())
      .sort((a, b) => (a.changes['15m'] || 0) - (b.changes['15m'] || 0))
      .slice(0, 15);

    // 生成表格
    const tableRows = sortedData.map((item, index) => {
      const symbol = item.symbol.padEnd(10);
      const current = this.formatNumber(item.current).padStart(8);
      const change15m = this.formatChangePercent(item.changes['15m'] || 0).padStart(7);
      const change1h = this.formatChangePercent(item.changes['1h'] || 0).padStart(7);
      const change4h = this.formatChangePercent(item.changes['4h'] || 0).padStart(7);
      const change1d = this.formatChangePercent(item.changes['1d'] || 0).padStart(7);
      
      return `${(index + 1).toString().padStart(2)} | ${symbol} | ${current} | ${change15m} | ${change1h} | ${change4h} | ${change1d}`;
    }).join('\n');

    const tableContent = `\`\`\`
📉 持倉量減少排行 TOP15 (多時間週期跌幅對比)

排名 | 交易對      | 當前持倉   | 15分    | 1時     | 4時     | 日線
-----|-----------|----------|---------|---------|---------|--------
${tableRows}
\`\`\``;

    await this.discordService.sendMessage(tableContent);
  }

  async sendFundingRateReport(fundingRateRankings) {
    // 合併正負資金費率在一個表格中
    const positiveRates = fundingRateRankings.positive.slice(0, 15);
    const negativeRates = fundingRateRankings.negative.slice(0, 15);
    
    if (positiveRates.length === 0 && negativeRates.length === 0) return;

    // 生成正資金費率部分
    const positiveRows = positiveRates.map((item, index) => 
      `${(index + 1).toString().padStart(2)} | ${item.symbol.padEnd(10)} | ${item.fundingRatePercent.toFixed(4).padStart(7)}%`
    );

    // 生成負資金費率部分
    const negativeRows = negativeRates.map((item, index) => 
      `${(index + 1).toString().padStart(2)} | ${item.symbol.padEnd(10)} | ${item.fundingRatePercent.toFixed(4).padStart(7)}%`
    );

    // 創建並列表格 - 分別顯示正負費率
    const maxRows = Math.max(positiveRows.length, negativeRows.length);
    const combinedRows = [];
    
    for (let i = 0; i < maxRows; i++) {
      const positiveRow = positiveRows[i] || '   |            |        ';
      const negativeRow = negativeRows[i] || '   |            |        ';
      combinedRows.push(`${positiveRow} || ${negativeRow}`);
    }

    const tableContent = `\`\`\`
💰💸 資金費率排行 TOP15

正費率(多頭付費)                    || 負費率(空頭付費)
排名| 交易對     | 費率     || 排名| 交易對     | 費率
----|-----------|----------||-----|-----------|----------
${combinedRows.join('\n')}
\`\`\``;

    await this.discordService.sendMessage(tableContent);
  }

  formatNumber(num) {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  }

  formatChangePercent(changePercent) {
    if (changePercent === 0) {
      return '0.00%';
    }
    const sign = changePercent > 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  }

  startFundingRateAlerts() {
    // 每分鐘檢查是否需要發送資金費率提醒
    this.fundingRateAlertInterval = setInterval(() => {
      const now = new Date();
      const minute = now.getMinutes();
      
      // 在每小時的50分和55分發送提醒
      if (minute === 50 || minute === 55) {
        this.sendFundingRateAlert(minute);
      }
    }, 60 * 1000); // 每分鐘檢查一次
    
    this.logger.info('⏰ 啟動資金費率提醒系統 (每小時50分和55分)');
  }

  async sendFundingRateAlert(minute) {
    try {
      const now = new Date();
      const timeStr = now.toLocaleString('zh-TW');
      
      const alertTitle = minute === 50 ? 
        '⚠️ 資金費率提醒 - 10分鐘後結算' : 
        '🔔 資金費率提醒 - 5分鐘後結算';
      
      // 生成資金費率排行榜
      const fundingRateRankings = this.calculateFundingRateRankings();
      
      const alertEmbed = {
        title: alertTitle,
        description: `提醒時間: ${timeStr}\n下次資金費率結算即將開始`,
        color: minute === 50 ? 0xff9900 : 0xff0000, // 50分橙色，55分紅色
        fields: [
          {
            name: '🟢 最高正資金費率 TOP 10',
            value: this.formatFundingRateRanking(fundingRateRankings.positive.slice(0, 10)),
            inline: false
          },
          {
            name: '🔴 最低負資金費率 TOP 10',
            value: this.formatFundingRateRanking(fundingRateRankings.negative.slice(0, 10)),
            inline: false
          }
        ],
        timestamp: now.toISOString(),
        footer: {
          text: 'Bitget 資金費率提醒',
          icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/23f0.png'
        }
      };

      // 發送到資金費率專用webhook
      await this.sendToFundingRateWebhook(alertEmbed);
      
      this.logger.info(`⏰ 資金費率提醒已發送 (${minute}分)`);
      
    } catch (error) {
      this.logger.error('❌ 發送資金費率提醒失敗:', error);
    }
  }

  formatFundingRateRanking(rankings) {
    if (rankings.length === 0) {
      return '暫無數據';
    }
    
    return rankings.map((item, index) => {
      const ratePercent = (item.fundingRate * 100).toFixed(4);
      return `${index + 1}. **${item.symbol}** - ${ratePercent}%`;
    }).join('\n');
  }

  async sendToFundingRateWebhook(embed) {
    try {
      const axios = require('axios');
      const webhookUrl = this.config.discord.fundingRateWebhookUrl;
      
      if (!webhookUrl) {
        this.logger.warn('⚠️ 資金費率Webhook URL未設置');
        return;
      }
      
      await axios.post(webhookUrl, {
        embeds: [embed]
      });
      
      this.logger.info('📤 資金費率提醒已發送到專用webhook');
    } catch (error) {
      this.logger.error('❌ 發送資金費率提醒到webhook失敗:', error.message);
    }
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.positionPriceReportInterval) {
      clearInterval(this.positionPriceReportInterval);
      this.positionPriceReportInterval = null;
    }
    
    if (this.fundingRateReportInterval) {
      clearInterval(this.fundingRateReportInterval);
      this.fundingRateReportInterval = null;
    }
    
    if (this.fundingRateAlertInterval) {
      clearInterval(this.fundingRateAlertInterval);
      this.fundingRateAlertInterval = null;
    }
    
    // 關閉數據庫連接
    if (this.db) {
      this.db.close();
    }
    
    this.logger.info('⏹️ 合約監控系統已停止');
  }

  async sendPositionChangeTable(analysisData) {
    try {
      // 獲取所有有持倉變化的數據，按15分鐘持倉變化排序
      const dataArray = Array.from(analysisData.values())
        .filter(item => item.positionChanges['15m'])
        .sort((a, b) => Math.abs(b.positionChanges['15m'].percent) - Math.abs(a.positionChanges['15m'].percent));
      
      if (dataArray.length === 0) {
        this.logger.info('⚠️ 無持倉變化數據');
        return;
      }
      
      // 分離正負異動
      const positiveChanges = dataArray
        .filter(item => item.positionChanges['15m'].percent > 0)
        .slice(0, 8);
      
      const negativeChanges = dataArray
        .filter(item => item.positionChanges['15m'].percent < 0)
        .slice(0, 8);
      
      // 發送正異動表格
      if (positiveChanges.length > 0) {
        await this.sendPositionTable('正異動', positiveChanges);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // 發送負異動表格
      if (negativeChanges.length > 0) {
        await this.sendPositionTable('負異動', negativeChanges);
      }
      
    } catch (error) {
      this.logger.error('❌ 發送持倉異動表格失敗:', error);
    }
  }

  async sendPriceChangeTable(analysisData) {
    try {
      // 獲取所有有價格變化的數據，按15分鐘價格變化排序
      const dataArray = Array.from(analysisData.values())
        .filter(item => item.priceChanges['15m'])
        .sort((a, b) => Math.abs(b.priceChanges['15m'].percent) - Math.abs(a.priceChanges['15m'].percent));
      
      if (dataArray.length === 0) {
        this.logger.info('⚠️ 無價格變化數據');
        return;
      }
      
      // 分離正負異動
      const positiveChanges = dataArray
        .filter(item => item.priceChanges['15m'].percent > 0)
        .slice(0, 8);
      
      const negativeChanges = dataArray
        .filter(item => item.priceChanges['15m'].percent < 0)
        .slice(0, 8);
      
      // 發送正異動表格
      if (positiveChanges.length > 0) {
        await this.sendPriceTable('正異動', positiveChanges);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // 發送負異動表格
      if (negativeChanges.length > 0) {
        await this.sendPriceTable('負異動', negativeChanges);
      }
      
    } catch (error) {
      this.logger.error('❌ 發送價格異動表格失敗:', error);
    }
  }

  async sendPositionTable(type, data) {
    // 持倉異動表格標頭：幣種 | 價格異動 | 總市值 | 15分持倉 | 1h持倉 | 4h持倉
    const tableRows = data.map((item, index) => {
      const symbol = item.symbol.padEnd(12);
      const priceChange = this.formatPercent(item.priceChanges['15m']?.percent || 0).padStart(8);
      const marketCap = '   0.00%'.padStart(8); // 總市值暫時顯示為0.00%
      const pos15m = this.formatPercent(item.positionChanges['15m']?.percent || 0).padStart(9);
      const pos1h = this.formatPercent(item.positionChanges['1h']?.percent || 0).padStart(9);
      const pos4h = this.formatPercent(item.positionChanges['4h']?.percent || 0).padStart(9);
      
      return `  ${(index + 1).toString().padStart(1)} | ${symbol} | ${priceChange} | ${marketCap} | ${pos15m} | ${pos1h} | ${pos4h}`;
    }).join('\n');

    // 獲取北京時間
    const beijingTime = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const tableContent = `\`\`\`
📊 持倉異動排行 ${type} TOP8 (各時間周期對比)

排名 | 幣種          | 價格異動  | 總市值  | 15分持倉 | 1h持倉   | 4h持倉
-----|-------------|----------|----------|----------|----------|----------
${tableRows}
\`\`\`
[${beijingTime.includes('上午') ? '上午' : '下午'}${beijingTime.replace(/上午|下午/, '')}]`;

    await this.discordService.sendMessage(tableContent);
  }

  async sendPriceTable(type, data) {
    // 價格異動表格標頭：幣種 | 持倉異動 | 總市值 | 15分價格 | 1h價格 | 4h價格
    const tableRows = data.map((item, index) => {
      const symbol = item.symbol.padEnd(12);
      const posChange = this.formatPercent(item.positionChanges['15m']?.percent || 0).padStart(8);
      const marketCap = '   0.00%'.padStart(8); // 總市值暫時顯示為0.00%
      const price15m = this.formatPercent(item.priceChanges['15m']?.percent || 0).padStart(9);
      const price1h = this.formatPercent(item.priceChanges['1h']?.percent || 0).padStart(9);
      const price4h = this.formatPercent(item.priceChanges['4h']?.percent || 0).padStart(9);
      
      return `  ${(index + 1).toString().padStart(1)} | ${symbol} | ${posChange} | ${marketCap} | ${price15m} | ${price1h} | ${price4h}`;
    }).join('\n');

    // 獲取北京時間
    const beijingTime = new Date().toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const tableContent = `\`\`\`
💰 價格異動排行 ${type} TOP8 (各時間周期對比)

排名 | 幣種          | 持倉異動  | 總市值  | 15分價格 | 1h價格   | 4h價格
-----|-------------|----------|----------|----------|----------|----------
${tableRows}
\`\`\`
[${beijingTime.includes('上午') ? '上午' : '下午'}${beijingTime.replace(/上午|下午/, '')}]`;

    await this.discordService.sendMessage(tableContent);
  }

  formatPercent(value) {
    if (!value || isNaN(value)) return '0.00%';
    return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
  }

  getStatus() {
    return {
      isRunning: this.monitoringInterval !== null,
      contractSymbols: this.contractSymbols.length,
      openInterestData: this.openInterests.current.size,
      fundingRateData: this.fundingRates.size,
      tradingType: '合約交易'
    };
  }
}

module.exports = BitgetContractMonitor;
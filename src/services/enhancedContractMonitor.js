const WebSocket = require('ws');
const BitgetApi = require('./bitgetApi');
const Logger = require('../utils/logger');
const DatabaseManager = require('./databaseManager');
const EnhancedDiscordService = require('./enhancedDiscordService');

class EnhancedContractMonitor {
  constructor(config, discordService) {
    this.config = config;
    this.discordService = new EnhancedDiscordService(config);
    this.bitgetApi = new BitgetApi(config);
    this.logger = new Logger(config);
    this.db = new DatabaseManager(config);
    
    // 持倉量數據存儲 (支持多個時間週期)
    this.openInterests = {
      current: new Map(),   // 當前數據
      '15m': new Map(),     // 15分鐘前
      '30m': new Map(),     // 30分鐘前
      '1h': new Map(),      // 1小時前  
      '4h': new Map(),      // 4小時前
      '1d': new Map()       // 1天前
    };
    
    // 價格數據存儲 (支持多個時間週期)
    this.priceData = {
      current: new Map(),   // 當前價格數據
      '15m': new Map(),     // 15分鐘前
      '30m': new Map(),     // 30分鐘前
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
    this.priceMonitoringInterval = null;
    
    // 數據歷史記錄
    this.dataHistory = {
      openInterest: [],
      fundingRate: [],
      priceData: []
    };
    
    // 波段策略監控
    this.swingStrategyMonitor = null;
    this.emaData = new Map(); // 存儲EMA數據
  }

  async initialize() {
    try {
      this.logger.console('🚀 初始化增強型Bitget合約監控系統...');
      
      // 初始化數據庫
      await this.db.initialize();
      
      // 測試API連接
      const connectionTest = await this.bitgetApi.testConnection();
      if (!connectionTest) {
        throw new Error('API連接測試失敗');
      }
      
      // 載入所有合約
      await this.loadAllContracts();
      
      // 收集初始數據
      await this.collectInitialData();
      
      // 啟動定期監控
      this.startPeriodicMonitoring();
      this.startPeriodicReporting();
      this.startPriceMonitoring();
      this.startSwingStrategyMonitoring();
      
      this.logger.console('✅ 增強型監控系統初始化完成');
      
    } catch (error) {
      this.logger.error('❌ 初始化失敗:', error);
      throw error;
    }
  }

  async loadAllContracts() {
    try {
      this.logger.info('📡 加載所有合約交易對...');
      
      const contracts = await this.bitgetApi.getAllContracts('umcbl');
      this.contractSymbols = contracts.filter(contract => 
        contract.status === 'normal' && contract.quoteCoin === 'USDT'
      );
      
      this.logger.info(`✅ 成功加載 ${this.contractSymbols.length} 個合約`);
      
    } catch (error) {
      this.logger.error('❌ 加載合約失敗:', error);
      throw error;
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
        try {
          await this.db.saveOpenInterest(data);
        } catch (error) {
          this.logger.debug(`⚠️ 保存 ${data.symbol} 持倉量數據失敗:`, error.message);
        }
      });
      
      // 獲取價格數據
      await this.collectPriceData();
      
      // 獲取資金費率 (分批處理避免API限制)
      await this.collectFundingRates();
      
      this.logger.info(`✅ 收集到 ${this.openInterests.current.size} 個開倉量數據，${this.priceData.current.size} 個價格數據和 ${this.fundingRates.size} 個資金費率數據`);
      
    } catch (error) {
      this.logger.error('❌ 收集初始數據失敗:', error);
    }
  }

  async collectPriceData() {
    try {
      const batchSize = 10;
      for (let i = 0; i < this.contractSymbols.length; i += batchSize) {
        const batch = this.contractSymbols.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (contract) => {
          try {
            const ticker = await this.bitgetApi.getTicker(contract.symbol, 'umcbl');
            if (ticker) {
              const priceInfo = {
                symbol: contract.symbol,
                price: parseFloat(ticker.lastPr),
                change24h: parseFloat(ticker.chgUtc),
                volume: parseFloat(ticker.baseVolume),
                high24h: parseFloat(ticker.high24h),
                low24h: parseFloat(ticker.low24h),
                timestamp: Date.now()
              };
              
              this.priceData.current.set(contract.symbol, priceInfo);
              await this.db.savePriceData(priceInfo);
            }
          } catch (error) {
            this.logger.debug(`⚠️ 獲取 ${contract.symbol} 價格數據失敗:`, error.message);
          }
        }));
        
        // 批次間延遲
        if (i + batchSize < this.contractSymbols.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      this.logger.error('❌ 收集價格數據失敗:', error);
    }
  }

  async collectFundingRates() {
    try {
      const batchSize = 10;
      for (let i = 0; i < this.contractSymbols.length; i += batchSize) {
        const batch = this.contractSymbols.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (contract) => {
          try {
            const fundingRate = await this.bitgetApi.getFundingRate(contract.symbol, 'umcbl');
            this.fundingRates.set(contract.symbol, fundingRate);
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
    } catch (error) {
      this.logger.error('❌ 收集資金費率失敗:', error);
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
    // 每15分鐘發送一次報告
    this.reportingInterval = setInterval(async () => {
      await this.generateAndSendReport();
    }, 15 * 60 * 1000); // 15分鐘
    
    this.logger.info('📊 啟動定期報告 (每15分鐘發送持倉異動和資金費率排行)');
  }

  startPriceMonitoring() {
    // 每3分鐘監控價格變動
    this.priceMonitoringInterval = setInterval(async () => {
      await this.monitorPriceChanges();
    }, 3 * 60 * 1000); // 3分鐘
    
    this.logger.info('💰 啟動價格監控 (每3分鐘檢查價格變動)');
  }

  startSwingStrategyMonitoring() {
    // 每15分鐘進行波段策略分析
    this.swingStrategyMonitor = setInterval(async () => {
      await this.performSwingStrategyAnalysis();
    }, 15 * 60 * 1000); // 15分鐘
    
    this.logger.info('📈 啟動波段策略監控 (每15分鐘分析EMA信號)');
  }

  async updateContractData() {
    try {
      this.logger.debug('🔍 更新合約數據中...');
      
      // 備份歷史數據
      this.backupHistoricalData();
      
      // 獲取最新開倉量數據
      const openInterestData = await this.bitgetApi.getAllOpenInterest('umcbl');
      
      // 更新當前開倉量數據
      openInterestData.forEach(data => {
        this.openInterests.current.set(data.symbol, data);
      });
      
      // 更新價格數據
      await this.collectPriceData();
      
      // 更新資金費率數據 (分批處理)
      const activeSylmbols = Array.from(this.openInterests.current.keys()).slice(0, 50);
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

  backupHistoricalData() {
    const now = Date.now();
    const currentData = this.openInterests.current;
    const currentPriceData = this.priceData.current;
    
    // 備份持倉量數據到不同時間週期
    if (now % (15 * 60 * 1000) < 60000) { // 15分鐘標記
      this.openInterests['15m'] = new Map(currentData);
      this.priceData['15m'] = new Map(currentPriceData);
    }
    
    if (now % (30 * 60 * 1000) < 60000) { // 30分鐘標記
      this.openInterests['30m'] = new Map(currentData);
      this.priceData['30m'] = new Map(currentPriceData);
    }
    
    if (now % (60 * 60 * 1000) < 60000) { // 1小時標記
      this.openInterests['1h'] = new Map(currentData);
      this.priceData['1h'] = new Map(currentPriceData);
    }
    
    if (now % (4 * 60 * 60 * 1000) < 60000) { // 4小時標記
      this.openInterests['4h'] = new Map(currentData);
      this.priceData['4h'] = new Map(currentPriceData);
    }
    
    if (now % (24 * 60 * 60 * 1000) < 60000) { // 24小時標記
      this.openInterests['1d'] = new Map(currentData);
      this.priceData['1d'] = new Map(currentPriceData);
    }
  }

  async generateAndSendReport() {
    try {
      this.logger.info('📊 生成持倉異動和資金費率排行報告...');
      
      // 生成持倉異動排行 (正確使用Open Interest數據)
      const positionChanges = this.calculateOpenInterestChanges();
      
      // 生成資金費率排行 (包含持倉異動數據)
      const fundingRateRankings = this.calculateFundingRateWithPositionRankings();
      
      // 發送Discord報告 - 將持倉異動整合到資金費率報告中
      await this.discordService.sendFundingRateWithPositionReport(fundingRateRankings, positionChanges);
      
      this.logger.info('✅ 報告發送完成');
      
    } catch (error) {
      this.logger.error('❌ 生成報告失敗:', error);
    }
  }

  calculateOpenInterestChanges() {
    const periods = ['15m', '1h', '4h', '1d'];
    const results = {};
    
    periods.forEach(period => {
      const currentData = this.openInterests.current;
      const historicalData = this.openInterests[period];
      const changes = [];
      
      if (historicalData && historicalData.size > 0) {
        currentData.forEach((current, symbol) => {
          const historical = historicalData.get(symbol);
          
          if (historical && historical.openInterestUsd > 0) {
            const change = current.openInterestUsd - historical.openInterestUsd;
            const changePercent = (change / historical.openInterestUsd) * 100;
            
            // 只記錄有意義的持倉量變動 (大於1%或金額超過$10,000)
            if (Math.abs(changePercent) > 1 || Math.abs(change) > 10000) {
              changes.push({
                symbol,
                currentOpenInterest: current.openInterestUsd,
                previousOpenInterest: historical.openInterestUsd,
                change,
                changePercent,
                timestamp: Date.now()
              });
            }
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

  calculateFundingRateWithPositionRankings() {
    const fundingRates = Array.from(this.fundingRates.values())
      .filter(rate => rate.fundingRate != null)
      .map(rate => {
        // 添加持倉量信息到資金費率數據中
        const openInterest = this.openInterests.current.get(rate.symbol);
        return {
          symbol: rate.symbol,
          fundingRate: rate.fundingRate,
          fundingRatePercent: rate.fundingRate * 100,
          openInterestUsd: openInterest ? openInterest.openInterestUsd : 0,
          nextFundingTime: rate.nextFundingTime
        };
      });
    
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

  async monitorPriceChanges() {
    try {
      const currentPrices = this.priceData.current;
      const threshold = this.config.thresholds.priceChange;
      let alertCount = 0;
      
      this.logger.debug(`🔍 監控價格變動 - 閾值: ${threshold}%, 當前價格數據: ${currentPrices.size} 個`);
      
      for (const [symbol, currentPrice] of currentPrices) {
        // 檢查各個時間週期的價格變動
        const periods = ['15m', '30m', '1h', '4h'];
        const priceChanges = {};
        let hasSignificantChange = false;
        let maxChange = 0;
        
        for (const period of periods) {
          const historicalPrice = this.priceData[period]?.get(symbol);
          if (historicalPrice) {
            const change = ((currentPrice.price - historicalPrice.price) / historicalPrice.price) * 100;
            priceChanges[period] = change;
            maxChange = Math.max(maxChange, Math.abs(change));
            
            if (Math.abs(change) > threshold) {
              hasSignificantChange = true;
              this.logger.debug(`📈 ${symbol} ${period} 變動 ${change.toFixed(2)}% 超過閾值`);
            }
          }
        }
        
        // 如果有顯著價格變動，發送警報
        if (hasSignificantChange) {
          this.logger.info(`🚨 發送價格警報: ${symbol} 最大變動 ${maxChange.toFixed(2)}%`);
          
          await this.discordService.sendAlert('price_alert', {
            symbol,
            price: currentPrice.price,
            changePercent: currentPrice.change24h,
            volume24h: currentPrice.volume,
            priceChanges
          });
          
          alertCount++;
        }
      }
      
      if (alertCount > 0) {
        this.logger.info(`✅ 價格監控完成 - 發送了 ${alertCount} 個警報`);
      } else {
        this.logger.debug(`📊 價格監控完成 - 無超過閾值的變動`);
      }
      
    } catch (error) {
      this.logger.error('❌ 監控價格變動失敗:', error);
    }
  }

  // 手動觸發價格警報測試 (用於測試功能)
  async testPriceAlert() {
    try {
      this.logger.info('🧪 手動觸發價格警報測試...');
      
      const testSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
      
      for (const symbol of testSymbols) {
        const currentPrice = this.priceData.current.get(symbol);
        if (currentPrice) {
          // 模擬顯著價格變動
          const testAlert = {
            symbol,
            price: currentPrice.price,
            changePercent: Math.random() > 0.5 ? 5.2 : -4.8, // 隨機正負變動
            volume24h: currentPrice.volume || 1000000,
            priceChanges: {
              '15m': (Math.random() - 0.5) * 2,
              '30m': (Math.random() - 0.5) * 4,
              '1h': (Math.random() - 0.5) * 6,
              '4h': (Math.random() - 0.5) * 8
            }
          };
          
          await this.discordService.sendAlert('price_alert', testAlert);
          this.logger.info(`✅ 測試警報已發送: ${symbol} ${testAlert.changePercent}%`);
          
          // 避免頻率限制
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } catch (error) {
      this.logger.error('❌ 測試價格警報失敗:', error);
    }
  }

  async performSwingStrategyAnalysis() {
    try {
      this.logger.debug('📈 執行波段策略分析...');
      
      // 過濾市值大於500k的幣種
      const eligibleSymbols = Array.from(this.openInterests.current.entries())
        .filter(([symbol, data]) => data.openInterestUsd > 500000)
        .map(([symbol]) => symbol);
      
      for (const symbol of eligibleSymbols.slice(0, 50)) { // 限制前50個避免API限制
        try {
          await this.analyzeEMAStrategy(symbol);
          
          // 避免API限制
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          this.logger.debug(`⚠️ 分析 ${symbol} EMA策略失敗:`, error.message);
        }
      }
      
    } catch (error) {
      this.logger.error('❌ 波段策略分析失敗:', error);
    }
  }

  async analyzeEMAStrategy(symbol) {
    try {
      // 獲取K線數據 (15分鐘週期)
      const klineData = await this.bitgetApi.getKline(symbol, 'umcbl', '15m', 100);
      
      if (!klineData || klineData.length < 55) {
        return; // 數據不足
      }
      
      // 計算EMA
      const ema12 = this.calculateEMA(klineData.map(k => parseFloat(k[4])), 12); // 收盤價
      const ema30 = this.calculateEMA(klineData.map(k => parseFloat(k[4])), 30);
      const ema55 = this.calculateEMA(klineData.map(k => parseFloat(k[4])), 55);
      
      if (ema12.length < 3 || ema30.length < 3 || ema55.length < 3) {
        return;
      }
      
      // 檢查趨勢狀態
      const currentEma12 = ema12[ema12.length - 1];
      const currentEma30 = ema30[ema30.length - 1];
      const currentEma55 = ema55[ema55.length - 1];
      
      const prevEma12 = ema12[ema12.length - 2];
      const prevEma30 = ema30[ema30.length - 2];
      
      // 判斷多空頭排列
      const isBullish = currentEma12 > currentEma30 && currentEma30 > currentEma55;
      const isBearish = currentEma12 < currentEma30 && currentEma30 < currentEma55;
      
      if (!isBullish && !isBearish) {
        return; // 均線糾纏，不處理
      }
      
      // 檢查K棒是否回測EMA30
      const currentCandle = klineData[klineData.length - 1];
      const prevCandle = klineData[klineData.length - 2];
      
      const currentClose = parseFloat(currentCandle[4]);
      const currentOpen = parseFloat(currentCandle[1]);
      const prevClose = parseFloat(prevCandle[4]);
      const prevOpen = parseFloat(prevCandle[1]);
      
      // 檢查吞沒形態和EMA30回測
      let signalDetected = false;
      let strategy = null;
      
      if (isBullish) {
        // 多頭排列：看漲吞沒 + EMA30回測
        const touchingEma30 = Math.abs(currentClose - currentEma30) / currentEma30 < 0.02; // 2%範圍內
        const bullishEngulfing = currentClose > prevOpen && currentOpen < prevClose && currentClose > currentOpen;
        
        if (touchingEma30 && bullishEngulfing) {
          signalDetected = true;
          strategy = 'bullish';
        }
      } else if (isBearish) {
        // 空頭排列：看跌吞沒 + EMA30回測
        const touchingEma30 = Math.abs(currentClose - currentEma30) / currentEma30 < 0.02;
        const bearishEngulfing = currentClose < prevOpen && currentOpen > prevClose && currentClose < currentOpen;
        
        if (touchingEma30 && bearishEngulfing) {
          signalDetected = true;
          strategy = 'bearish';
        }
      }
      
      // 檢查是否未回測EMA55
      const hasNotTestedEma55 = this.checkEma55NotTested(klineData, ema55, 20); // 檢查過去20根K棒
      
      if (signalDetected && hasNotTestedEma55) {
        // 發送波段策略信號
        await this.discordService.sendAlert('swing_strategy_alert', {
          symbol,
          strategy,
          price: currentClose,
          ema30: currentEma30,
          ema55: currentEma55,
          candleType: strategy === 'bullish' ? '看漲吞沒' : '看跌吞沒',
          timestamp: Date.now()
        });
        
        this.logger.info(`📈 波段策略信號: ${symbol} ${strategy === 'bullish' ? '看漲' : '看跌'}吞沒`);
      }
      
    } catch (error) {
      this.logger.debug(`⚠️ 分析 ${symbol} EMA策略失敗:`, error.message);
    }
  }

  calculateEMA(prices, period) {
    if (prices.length < period) return [];
    
    const multiplier = 2 / (period + 1);
    const ema = [];
    
    // 第一個EMA值使用SMA
    let sma = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    ema.push(sma);
    
    // 計算後續EMA值
    for (let i = period; i < prices.length; i++) {
      const currentEma = (prices[i] * multiplier) + (ema[ema.length - 1] * (1 - multiplier));
      ema.push(currentEma);
    }
    
    return ema;
  }

  checkEma55NotTested(klineData, ema55, lookbackPeriod) {
    const startIndex = Math.max(klineData.length - lookbackPeriod, 0);
    
    for (let i = startIndex; i < klineData.length; i++) {
      const candle = klineData[i];
      const high = parseFloat(candle[2]);
      const low = parseFloat(candle[3]);
      const ema55Value = ema55[i - (klineData.length - ema55.length)];
      
      if (ema55Value && low <= ema55Value && high >= ema55Value) {
        return false; // 有觸及EMA55
      }
    }
    
    return true; // 未觸及EMA55
  }

  getStatus() {
    return {
      isRunning: this.monitoringInterval !== null,
      contractSymbols: this.contractSymbols.length,
      openInterestData: this.openInterests.current.size,
      fundingRateData: this.fundingRates.size,
      priceData: this.priceData.current.size
    };
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
    
    if (this.priceMonitoringInterval) {
      clearInterval(this.priceMonitoringInterval);
      this.priceMonitoringInterval = null;
    }
    
    if (this.swingStrategyMonitor) {
      clearInterval(this.swingStrategyMonitor);
      this.swingStrategyMonitor = null;
    }
    
    this.logger.info('📴 增強型合約監控已停止');
  }
}

module.exports = EnhancedContractMonitor;
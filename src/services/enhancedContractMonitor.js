const ContractMonitor = require('./contractMonitor');
const BitgetApi = require('./bitgetApi');
const Logger = require('../utils/logger');
const DatabaseManager = require('./databaseManager');

/**
 * 增強型合約監控器
 * 擴展基礎合約監控功能，添加多時間週期分析和高級警報
 */
class EnhancedContractMonitor extends ContractMonitor {
  constructor(config, discordService) {
    super(config, discordService);
    
    // 多時間週期數據存儲
    this.openInterests = {
      current: new Map(),
      '15m': new Map(),
      '30m': new Map(),
      '1h': new Map(),
      '4h': new Map(),
      '1d': new Map()
    };
    
    this.priceData = {
      current: new Map(),
      '15m': new Map(),
      '30m': new Map(),
      '1h': new Map(),
      '4h': new Map(),
      '1d': new Map()
    };
    
    // EMA 計算緩存
    this.emaCache = new Map();
    
    // 警報閾值
    this.alertThresholds = {
      openInterestChange: 10, // 持倉量變化 10%
      priceChange: 5,         // 價格變化 5%
      volumeSpike: 200        // 成交量激增 200%
    };
    
    // 消息去重
    this.sentMessages = new Set();
    this.messageExpiry = 30 * 60 * 1000; // 30分鐘
  }

  /**
   * 初始化增強型監控
   */
  async initialize() {
    try {
      await super.initialize();
      
      this.logger.console('🚀 初始化增強型合約監控...');
      
      // 初始化多時間週期數據收集
      await this.initializeMultiTimeframeData();
      
      // 啟動高級分析
      this.startAdvancedAnalysis();
      
      this.logger.console('✅ 增強型合約監控初始化完成');
      
    } catch (error) {
      this.logger.error('❌ 增強型合約監控初始化失敗:', error);
      throw error;
    }
  }

  /**
   * 初始化多時間週期數據收集
   */
  async initializeMultiTimeframeData() {
    try {
      this.logger.info('📊 初始化多時間週期數據收集...');
      
      const timeframes = ['15m', '30m', '1h', '4h', '1d'];
      
      for (const timeframe of timeframes) {
        await this.collectTimeframeData(timeframe);
      }
      
      this.logger.info('✅ 多時間週期數據初始化完成');
      
    } catch (error) {
      this.logger.error('❌ 多時間週期數據初始化失敗:', error);
    }
  }

  /**
   * 收集指定時間週期的數據
   */
  async collectTimeframeData(timeframe) {
    try {
      for (const contract of this.contractSymbols.slice(0, 20)) { // 限制前20個合約
        try {
          // 獲取K線數據
          const klineData = await this.bitgetApi.getKline(
            contract.symbol,
            timeframe,
            100 // 獲取100根K線
          );
          
          if (klineData && klineData.length > 0) {
            const latestKline = klineData[0];
            this.priceData[timeframe].set(contract.symbol, {
              symbol: contract.symbol,
              price: parseFloat(latestKline[4]), // 收盤價
              volume: parseFloat(latestKline[5]), // 成交量
              timestamp: parseInt(latestKline[0])
            });
          }
          
          // 獲取持倉量數據
          const openInterest = await this.bitgetApi.getOpenInterest(
            contract.symbol,
            contract.productType
          );
          
          if (openInterest) {
            this.openInterests[timeframe].set(contract.symbol, {
              symbol: contract.symbol,
              openInterestUsd: parseFloat(openInterest.openInterestUsd || 0),
              timestamp: Date.now()
            });
          }
          
          // API 限制延遲
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          this.logger.warn(`⚠️ 收集 ${contract.symbol} ${timeframe} 數據失敗:`, error.message);
        }
      }
      
    } catch (error) {
      this.logger.error(`❌ 收集 ${timeframe} 數據失敗:`, error);
    }
  }

  /**
   * 啟動高級分析
   */
  startAdvancedAnalysis() {
    // 每5分鐘進行一次高級分析
    setInterval(async () => {
      await this.performAdvancedAnalysis();
    }, 5 * 60 * 1000);
  }

  /**
   * 執行高級分析
   */
  async performAdvancedAnalysis() {
    try {
      this.logger.debug('🔍 執行高級分析...');
      
      // 計算持倉量變化
      const openInterestChanges = await this.calculateOpenInterestChanges();
      
      // 檢測異常活動
      const anomalies = await this.detectAnomalies();
      
      // 檢查是否有變化需要發送警報
      const hasChanges = Object.values(openInterestChanges).some(timeframe => 
        timeframe.positive.length > 0 || timeframe.negative.length > 0
      );
      
      // 發送警報
      if (hasChanges || anomalies.length > 0) {
        await this.sendAdvancedAlerts({
          openInterestChanges,
          anomalies
        });
      }
      
    } catch (error) {
      this.logger.error('❌ 高級分析失敗:', error);
    }
  }

  /**
   * 計算持倉量變化
   */
  async calculateOpenInterestChanges() {
    const changes = {
      '15m': {
        positive: [],
        negative: []
      },
      '30m': {
        positive: [],
        negative: []
      },
      '1h': {
        positive: [],
        negative: []
      }
    };
    
    try {
      const timeframes = ['15m', '30m', '1h'];
      
      for (const timeframe of timeframes) {
        for (const [symbol, currentData] of this.openInterests.current) {
          const previousData = this.openInterests[timeframe].get(symbol);
          
          if (previousData && currentData.openInterestUsd > 0) {
            const changePercent = ((currentData.openInterestUsd - previousData.openInterestUsd) / previousData.openInterestUsd) * 100;
            
            if (Math.abs(changePercent) >= this.alertThresholds.openInterestChange) {
              // 獲取當前價格
              const priceData = await this.getCurrentPrice(symbol);
              
              const changeData = {
                symbol,
                changePercent: parseFloat(changePercent.toFixed(2)),
                currentOpenInterest: currentData.openInterestUsd,
                previousOpenInterest: previousData.openInterestUsd,
                currentPrice: priceData?.price || 0,
                timestamp: Date.now()
              };
              
              if (changePercent > 0) {
                changes[timeframe].positive.push(changeData);
              } else {
                changes[timeframe].negative.push(changeData);
              }
            }
          }
        }
      }
      
    } catch (error) {
      this.logger.error('❌ 計算持倉量變化失敗:', error);
    }
    
    return changes;
  }

  /**
   * 檢測異常活動
   */
  async detectAnomalies() {
    const anomalies = [];
    
    try {
      // 檢測價格異常波動
      for (const [symbol, currentPrice] of this.priceData.current) {
        const previousPrice = this.priceData['15m'].get(symbol);
        
        if (previousPrice && previousPrice.price > 0) {
          const priceChangePercent = ((currentPrice.price - previousPrice.price) / previousPrice.price) * 100;
          
          if (Math.abs(priceChangePercent) >= this.alertThresholds.priceChange) {
            anomalies.push({
              type: 'price_spike',
              symbol,
              changePercent: priceChangePercent.toFixed(2),
              currentPrice: currentPrice.price,
              previousPrice: previousPrice.price,
              timestamp: Date.now()
            });
          }
        }
      }
      
    } catch (error) {
      this.logger.error('❌ 檢測異常活動失敗:', error);
    }
    
    return anomalies;
  }

  /**
   * 獲取當前價格
   */
  async getCurrentPrice(symbol) {
    try {
      const ticker = await this.bitgetApi.getTicker(symbol);
      return {
        price: parseFloat(ticker.last || 0),
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.warn(`⚠️ 獲取 ${symbol} 價格失敗:`, error.message);
      return null;
    }
  }

  /**
   * 發送高級警報
   */
  async sendAdvancedAlerts(data) {
    try {
      const { openInterestChanges, anomalies } = data;
      
      // 創建警報消息
      const embed = {
        title: '🚨 高級市場警報',
        color: 0xff6b35,
        timestamp: new Date().toISOString(),
        fields: []
      };
      
      // 添加持倉量變化警報
      if (openInterestChanges.length > 0) {
        const oiField = {
          name: '📊 持倉量異常變化',
          value: openInterestChanges.map(change => 
            `**${change.symbol}**: ${change.changePercent > 0 ? '+' : ''}${change.changePercent}%\n` +
            `價格: $${change.currentPrice}\n` +
            `持倉量: $${(change.currentOI / 1000000).toFixed(2)}M`
          ).join('\n\n'),
          inline: false
        };
        embed.fields.push(oiField);
      }
      
      // 添加異常活動警報
      if (anomalies.length > 0) {
        const anomalyField = {
          name: '⚡ 異常市場活動',
          value: anomalies.map(anomaly => 
            `**${anomaly.symbol}**: ${anomaly.type === 'price_spike' ? '價格激增' : '異常活動'}\n` +
            `變化: ${anomaly.changePercent > 0 ? '+' : ''}${anomaly.changePercent}%\n` +
            `當前價格: $${anomaly.currentPrice}`
          ).join('\n\n'),
          inline: false
        };
        embed.fields.push(anomalyField);
      }
      
      // 檢查消息去重
      const messageHash = this.generateMessageHash(embed);
      if (!this.sentMessages.has(messageHash)) {
        await this.discordService.sendAlert(embed, 'enhanced');
        this.sentMessages.add(messageHash);
        
        // 設置消息過期
        setTimeout(() => {
          this.sentMessages.delete(messageHash);
        }, this.messageExpiry);
      }
      
    } catch (error) {
      this.logger.error('❌ 發送高級警報失敗:', error);
    }
  }

  /**
   * 生成消息雜湊用於去重
   */
  generateMessageHash(embed) {
    const crypto = require('crypto');
    const content = JSON.stringify({
      title: embed.title,
      fields: embed.fields?.map(f => ({ name: f.name, value: f.value }))
    });
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 計算 EMA
   */
  calculateEMA(prices, period) {
    if (!prices || prices.length < period) return null;
    
    const result = [];
    const multiplier = 2 / (period + 1);
    
    // 計算第一個 EMA 值（使用 SMA）
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    let ema = sum / period;
    result.push(ema);
    
    // 計算後續 EMA 值
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
      result.push(ema);
    }
    
    return result;
  }

  /**
   * 檢查是否未觸及 EMA55
   */
  checkEma55NotTested(klineData, ema55Values, lookbackPeriods = 5) {
    try {
      if (!klineData || !ema55Values || klineData.length === 0 || ema55Values.length === 0) {
        return false;
      }
      
      // 檢查最近幾根K線是否觸及EMA55
      const checkPeriods = Math.min(lookbackPeriods, klineData.length, ema55Values.length);
      
      for (let i = 0; i < checkPeriods; i++) {
        const kline = klineData[i];
        const ema55 = ema55Values[i];
        
        if (!kline || ema55 === undefined) continue;
        
        const high = parseFloat(kline[2]); // 最高價
        const low = parseFloat(kline[3]);  // 最低價
        
        // 檢查K線是否觸及EMA55（最低價 <= EMA55 <= 最高價）
        if (low <= ema55 && ema55 <= high) {
          return false; // 已觸及EMA55
        }
      }
      
      return true; // 未觸及EMA55
      
    } catch (error) {
      this.logger.warn('檢查EMA55觸及狀態失敗:', error.message);
      return false;
    }
  }

  /**
   * 備份歷史數據
   */
  backupHistoricalData() {
    try {
      const now = Date.now();
      const timeframes = ['15m', '30m', '1h', '4h', '1d'];
      const intervals = {
        '15m': 15 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000
      };
      
      for (const timeframe of timeframes) {
        const interval = intervals[timeframe];
        
        // 檢查是否到了備份時間點
        if (now % interval < 60000) { // 1分鐘容差
          // 備份持倉量數據
          for (const [symbol, data] of this.openInterests.current) {
            this.openInterests[timeframe].set(symbol, {
              ...data,
              timestamp: now
            });
          }
          
          // 備份價格數據
          for (const [symbol, data] of this.priceData.current) {
            this.priceData[timeframe].set(symbol, {
              ...data,
              timestamp: now
            });
          }
        }
      }
      
    } catch (error) {
      this.logger.error('備份歷史數據失敗:', error);
    }
  }

  /**
   * 停止監控
   */
  async stop() {
    try {
      if (super.stop) {
        await super.stop();
      }
      
      // 清理增強功能的定時器
      if (this.advancedAnalysisInterval) {
        clearInterval(this.advancedAnalysisInterval);
      }
      
      this.logger.console('✅ 增強型合約監控已停止');
      
    } catch (error) {
      this.logger.error('❌ 停止增強型合約監控失敗:', error);
    }
  }
}

module.exports = EnhancedContractMonitor;
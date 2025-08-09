const express = require('express');
const router = express.Router();

// 監控各個頻道的數據狀態
class MonitoringRoutes {
  constructor(contractMonitor, discordService) {
    this.contractMonitor = contractMonitor;
    this.discordService = discordService;
    this.setupRoutes();
  }

  setupRoutes() {
    // 價格異動監控API
    router.get('/price-alerts', (req, res) => {
      try {
        const priceData = this.contractMonitor.priceData;
        const currentPrices = priceData.current;
        const threshold = this.contractMonitor.config.thresholds.priceChange;
        
        const alerts = [];
        const periods = ['15m', '30m', '1h', '4h'];
        
        for (const [symbol, currentPrice] of currentPrices) {
          const priceChanges = {};
          let hasSignificantChange = false;
          let maxChange = 0;
          
          for (const period of periods) {
            const historicalPrice = priceData[period]?.get(symbol);
            if (historicalPrice) {
              const change = ((currentPrice.price - historicalPrice.price) / historicalPrice.price) * 100;
              priceChanges[period] = change;
              maxChange = Math.max(maxChange, Math.abs(change));
              
              if (Math.abs(change) > threshold) {
                hasSignificantChange = true;
              }
            }
          }
          
          if (hasSignificantChange) {
            alerts.push({
              symbol,
              price: currentPrice.price,
              changePercent: currentPrice.change24h,
              volume24h: currentPrice.volume,
              priceChanges,
              maxChange,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        res.json({
          status: 'success',
          channel: 'price_alert',
          threshold: threshold,
          totalSymbols: currentPrices.size,
          alertCount: alerts.length,
          alerts: alerts.slice(0, 10), // 只返回前10個
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          channel: 'price_alert',
          error: error.message
        });
      }
    });

    // 持倉異動監控API
    router.get('/position-changes', (req, res) => {
      try {
        const openInterests = this.contractMonitor.openInterests;
        const currentData = openInterests.current;
        const periods = [
          { key: '15m', name: '15分鐘' },
          { key: '30m', name: '30分鐘' },
          { key: '1h', name: '1小時' },
          { key: '4h', name: '4小時' }
        ];
        
        const changes = [];
        
        for (const period of periods) {
          const historicalData = openInterests[period.key];
          if (historicalData && historicalData.size > 0) {
            for (const [symbol, current] of currentData) {
              const historical = historicalData.get(symbol);
              if (current && historical && historical.openInterestUsd > 0) {
                const change = current.openInterestUsd - historical.openInterestUsd;
                const changePercent = (change / historical.openInterestUsd) * 100;
                
                // 只記錄有意義的持倉量變動 (大於1%或金額超過$10,000)
                if (Math.abs(changePercent) > 1 || Math.abs(change) > 10000) {
                  changes.push({
                    symbol,
                    period: period.key,
                    periodName: period.name,
                    currentOpenInterest: current.openInterestUsd,
                    historicalOpenInterest: historical.openInterestUsd,
                    change,
                    changePercent,
                    timestamp: new Date().toISOString()
                  });
                }
              }
            }
          }
        }
        
        res.json({
          status: 'success',
          channel: 'position',
          totalSymbols: currentData.size,
          changeCount: changes.length,
          changes: changes.slice(0, 20), // 只返回前20個
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          channel: 'position',
          error: error.message
        });
      }
    });

    // 資金費率監控API
    router.get('/funding-rates', (req, res) => {
      try {
        const fundingRates = this.contractMonitor.fundingRates;
        const rankings = this.contractMonitor.calculateFundingRateWithPositionRankings();
        
        res.json({
          status: 'success',
          channel: 'funding_rate',
          totalSymbols: fundingRates.size,
          topPositive: rankings.topPositive.slice(0, 10),
          topNegative: rankings.topNegative.slice(0, 10),
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          channel: 'funding_rate',
          error: error.message
        });
      }
    });

    // 波段策略監控API
    router.get('/swing-strategy', async (req, res) => {
      try {
        const openInterests = this.contractMonitor.openInterests;
        const eligibleSymbols = Array.from(openInterests.current.entries())
          .filter(([symbol, data]) => data.openInterestUsd > 500000)
          .map(([symbol]) => symbol)
          .slice(0, 10); // 只檢查前10個避免超時
        
        const signals = [];
        
        for (const symbol of eligibleSymbols) {
          try {
            // 獲取K線數據
            const klineData = await this.contractMonitor.bitgetApi.getKline(symbol, 'umcbl', '15m', 100);
            
            if (klineData && klineData.length >= 55) {
              // 計算EMA
              const ema12 = this.contractMonitor.calculateEMA(klineData.map(k => parseFloat(k[4])), 12);
              const ema30 = this.contractMonitor.calculateEMA(klineData.map(k => parseFloat(k[4])), 30);
              const ema55 = this.contractMonitor.calculateEMA(klineData.map(k => parseFloat(k[4])), 55);
              
              if (ema12.length >= 3 && ema30.length >= 3 && ema55.length >= 3) {
                const currentEma12 = ema12[ema12.length - 1];
                const currentEma30 = ema30[ema30.length - 1];
                const currentEma55 = ema55[ema55.length - 1];
                
                const currentCandle = klineData[klineData.length - 1];
                const currentClose = parseFloat(currentCandle[4]);
                
                // 判斷多空頭排列
                const isBullish = currentEma12 > currentEma30 && currentEma30 > currentEma55;
                const isBearish = currentEma12 < currentEma30 && currentEma30 < currentEma55;
                
                signals.push({
                  symbol,
                  price: currentClose,
                  ema12: currentEma12,
                  ema30: currentEma30,
                  ema55: currentEma55,
                  trend: isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral',
                  timestamp: new Date().toISOString()
                });
              }
            }
            
            // 避免API限制
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.warn(`分析 ${symbol} 失敗:`, error.message);
          }
        }
        
        res.json({
          status: 'success',
          channel: 'swing_strategy',
          analyzedSymbols: eligibleSymbols.length,
          signalCount: signals.length,
          signals,
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          channel: 'swing_strategy',
          error: error.message
        });
      }
    });

    // 綜合監控狀態API
    router.get('/status', (req, res) => {
      try {
        const status = this.contractMonitor.getStatus();
        const priceDataSize = this.contractMonitor.priceData.current.size;
        const openInterestSize = this.contractMonitor.openInterests.current.size;
        const fundingRateSize = this.contractMonitor.fundingRates.size;
        
        res.json({
          status: 'success',
          monitoring: {
            isRunning: status.isRunning,
            startTime: status.startTime,
            priceData: {
              symbols: priceDataSize,
              hasData: priceDataSize > 0
            },
            openInterest: {
              symbols: openInterestSize,
              hasData: openInterestSize > 0
            },
            fundingRate: {
              symbols: fundingRateSize,
              hasData: fundingRateSize > 0
            }
          },
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });
  }

  getRouter() {
    return router;
  }
}

module.exports = MonitoringRoutes;
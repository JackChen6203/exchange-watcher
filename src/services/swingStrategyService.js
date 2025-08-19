const BitgetApi = require('./bitgetApi');
const DiscordService = require('./discordService');

/**
 * 波段策略服務 - 重寫版本
 * 新策略邏輯：
 * 1. 三條均線不糾纏後20根K棒以上
 * 2. 回踩EMA30後有陽包陰(多頭排列)或陰包陽(空頭排列)
 * 3. 等收線確認
 * 4. 返回下一根K棒開盤價，設定新的止損止盈
 */
class SwingStrategyService {
  constructor(config) {
    this.bitgetApi = new BitgetApi(config);
    this.discordService = new DiscordService(config);
    
    // EMA 週期設定
    this.emaPeriods = {
      fast: 12,    // EMA12
      medium: 30,  // EMA30
      slow: 55     // EMA55
    };
    
    // 策略狀態追蹤
    this.strategyStates = new Map(); // symbol -> { trend, noEntanglementCount, lastTouchEMA30, waitingForClose }
    
    // 均線糾纏閾值（百分比）
    this.entanglementThreshold = 0.3; // 0.3%
    
    // 不糾纏最小K棒數量
    this.minNoEntanglementBars = 20;
    
    // 監控時間週期
    this.timeframes = ['15m', '30m', '1h'];
    
    // 監控狀態
    this.isRunning = false;
    this.monitoringPairs = [];
    
    // 冷卻機制（30分鐘）
    this.cooldownPeriod = 30 * 60 * 1000;
    this.lastNotifications = new Map();
  }

  /**
   * 啟動波段策略監控
   */
  async start() {
    try {
      console.log('🚀 啟動波段策略監控服務...');
      
      // 獲取大市值交易對
      await this.loadMonitoredSymbols();
      
      // 開始監控循環
      this.startMonitoringLoop();
      
      console.log(`✅ 波段策略監控已啟動，監控 ${this.monitoredSymbols.length} 個交易對`);
    } catch (error) {
      console.error('❌ 波段策略監控啟動失敗:', error);
      throw error;
    }
  }

  /**
   * 載入要監控的大市值交易對
   */
  async loadMonitoredSymbols() {
    try {
      // 獲取所有 USDT 永續合約
      const allSymbols = await this.bitgetApi.getAllContractSymbols();
      const usdtSymbols = allSymbols
        .map(item => typeof item === 'string' ? item : item.symbol)
        .filter(symbol => 
          symbol && 
          symbol.endsWith('USDT') && 
          !symbol.includes('1000') && // 排除 1000SHIB 等
          !symbol.includes('_') // 排除特殊符號
        );
      
      // 獲取 24h 成交量數據來篩選大市值幣種
      const tickers = await this.bitgetApi.getAllTickers('umcbl');
      const volumeData = new Map();
      
      tickers.forEach(ticker => {
        if (ticker.symbol && ticker.baseVolume) {
          volumeData.set(ticker.symbol, parseFloat(ticker.baseVolume));
        }
      });
      
      // 按成交量排序，取前 50 個大市值幣種
      const sortedSymbols = usdtSymbols
        .map(symbol => ({
          symbol,
          volume: volumeData.get(symbol) || 0
        }))
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 50)
        .map(item => item.symbol);
      
      this.monitoredSymbols = sortedSymbols;
      console.log(`📊 載入 ${this.monitoredSymbols.length} 個大市值交易對:`, this.monitoredSymbols.slice(0, 10));
      
    } catch (error) {
      console.error('❌ 載入監控交易對失敗:', error);
      // 使用預設的主流幣種
      this.monitoredSymbols = [
        'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT',
        'XRPUSDT', 'DOTUSDT', 'DOGEUSDT', 'AVAXUSDT', 'LINKUSDT'
      ];
    }
  }

  /**
   * 開始監控循環
   */
  startMonitoringLoop() {
    // 每 5 分鐘檢查一次
    setInterval(async () => {
      await this.checkAllSymbols();
    }, 5 * 60 * 1000);
    
    // 立即執行一次
    this.checkAllSymbols();
  }

  /**
   * 檢查所有交易對的波段策略信號
   */
  async checkAllSymbols() {
    console.log('🔍 開始檢查波段策略信號...');
    
    for (const symbol of this.monitoredSymbols) {
      for (const timeframe of this.timeframes) {
        try {
          await this.checkSwingSignal(symbol, timeframe);
          // 避免 API 頻率限制
          await this.sleep(100);
        } catch (error) {
          console.error(`❌ 檢查 ${symbol} ${timeframe} 信號失敗:`, error.message);
        }
      }
    }
  }

  /**
   * 檢查單個交易對的波段策略信號
   */
  async checkSwingSignal(symbol, timeframe) {
    try {
      // 獲取 K線數據（需要足夠的數據來計算 EMA 55）
      const klineData = await this.bitgetApi.getKline(symbol, 'umcbl', timeframe, 200);
      
      if (!klineData || klineData.length < 55) {
        return; // 數據不足
      }
      
      // 轉換 Bitget K 線數據格式
      // Bitget 返回格式: [timestamp, open, high, low, close, volume, ...]
      const formattedData = klineData.map(candle => ({
        timestamp: parseInt(candle[0]),
        open: parseFloat(candle[1]),
        high: parseFloat(candle[2]),
        low: parseFloat(candle[3]),
        close: parseFloat(candle[4]),
        volume: parseFloat(candle[5])
      })).reverse(); // 反轉數組，確保時間順序正確
      
      // 使用新的策略邏輯
      const closes = formattedData.map(candle => candle.close);
      const ema12 = this.calculateEMA(closes, this.emaPeriods.fast);
      const ema30 = this.calculateEMA(closes, this.emaPeriods.medium);
      const ema55 = this.calculateEMA(closes, this.emaPeriods.slow);
      
      if (ema12.length < 55 || ema30.length < 55 || ema55.length < 55) {
        return; // EMA 數據不足
      }
      
      await this.checkNewStrategySignal(symbol, timeframe, formattedData, ema12, ema30, ema55);
      
    } catch (error) {
      console.error(`❌ 檢查 ${symbol} ${timeframe} 波段信號失敗:`, error);
    }
  }



  /**
   * 檢查新策略信號
   * 1. 檢查20根K棒不糾纏
   * 2. 檢查回踩EMA30
   * 3. 檢查陽包陰/陰包陽形態
   * 4. 等收線確認
   */
  async checkNewStrategySignal(symbol, timeframe, klines, ema12, ema30, ema55) {
    const stateKey = `${symbol}_${timeframe}`;
    let state = this.strategyStates.get(stateKey) || {
      trend: 'unknown',
      noEntanglementCount: 0,
      lastTouchEMA30: null,
      waitingForClose: false
    };

    // 分析當前趨勢狀態
    const currentTrend = this.analyzeTrendState(ema12, ema30, ema55, klines.length - 1);
    
    // 檢查均線糾纏狀態
    const isEntangled = this.checkEntanglement(
      currentTrend.ema12, 
      currentTrend.ema30, 
      currentTrend.ema55
    );

    // 更新不糾纏計數
    if (!isEntangled && currentTrend.trend !== 'unknown') {
      if (state.trend === currentTrend.trend) {
        state.noEntanglementCount++;
      } else {
        state.trend = currentTrend.trend;
        state.noEntanglementCount = 1;
      }
    } else {
      state.noEntanglementCount = 0;
      state.trend = 'unknown';
    }

    // 只有在不糾纏20根K棒以上才進入監控狀態
    if (state.noEntanglementCount >= this.minNoEntanglementBars) {
      // 檢查回踩EMA30
      const touchEMA30 = this.checkTouchEMA30(klines, ema30, state.trend);
      
      if (touchEMA30.touched && !state.lastTouchEMA30) {
        state.lastTouchEMA30 = touchEMA30.index;
      }

      // 如果有回踩EMA30，檢查反轉形態
      if (state.lastTouchEMA30 !== null) {
        const reversalPattern = this.checkReversalPattern(
          klines, 
          state.lastTouchEMA30, 
          state.trend
        );

        if (reversalPattern.found && !state.waitingForClose) {
          // 等待當前K線收線
          const currentKline = klines[klines.length - 1];
          const isKlineClosed = this.isKlineClosed(currentKline, timeframe);
          
          if (isKlineClosed) {
            // 檢查冷卻期
            const cooldownKey = `${symbol}_${timeframe}`;
            const lastNotification = this.lastNotifications.get(cooldownKey);
            
            if (!lastNotification || (Date.now() - lastNotification) > this.cooldownPeriod) {
              // 發送信號通知
              await this.sendNewStrategyNotification(
                symbol, 
                timeframe, 
                state.trend, 
                klines,
                reversalPattern
              );
              
              this.lastNotifications.set(cooldownKey, Date.now());
            }
            
            // 重置狀態
            state.lastTouchEMA30 = null;
            state.waitingForClose = false;
          } else {
            state.waitingForClose = true;
          }
        }
      }
    }

    // 更新狀態
    this.strategyStates.set(stateKey, state);
  }

  /**
   * 計算指數移動平均線 (EMA)
   */
  calculateEMA(prices, period) {
    if (prices.length < period) return [];
    
    const multiplier = 2 / (period + 1);
    const ema = new Array(prices.length);
    
    // 第一個值使用 SMA（簡單移動平均）
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema[period - 1] = sum / period;
    
    // 計算後續的 EMA 值
    for (let i = period; i < prices.length; i++) {
      ema[i] = (prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier));
    }
    
    return ema;
  }

  /**
   * 分析趨勢狀態
   */
  analyzeTrendState(ema12, ema30, ema55, index) {
    if (!ema12 || !ema30 || !ema55 || 
        index >= ema12.length || index >= ema30.length || index >= ema55.length) {
      return { trend: 'unknown', ema12: 0, ema30: 0, ema55: 0 };
    }

    const latest12 = ema12[index];
    const latest30 = ema30[index];
    const latest55 = ema55[index];

    // 判斷多空頭排列
    let trend = 'unknown';
    if (latest12 > latest30 && latest30 > latest55) {
      trend = 'bullish'; // 多頭排列：EMA12 > EMA30 > EMA55
    } else if (latest12 < latest30 && latest30 < latest55) {
      trend = 'bearish'; // 空頭排列：EMA12 < EMA30 < EMA55
    }

    return {
      trend,
      ema12: latest12,
      ema30: latest30,
      ema55: latest55
    };
  }

  /**
   * 檢查均線是否糾纏
   */
  checkEntanglement(ema12, ema30, ema55) {
    // 計算均線之間的最大差距百分比
    const maxEma = Math.max(ema12, ema30, ema55);
    const minEma = Math.min(ema12, ema30, ema55);
    const diffPercentage = ((maxEma - minEma) / minEma) * 100;

    return diffPercentage <= this.entanglementThreshold;
  }

  /**
   * 檢查回踩EMA30
   */
  checkTouchEMA30(klines, ema30, trend) {
    // 檢查最近5根K線是否觸碰EMA30
    const startIndex = Math.max(0, klines.length - 5);
    
    for (let i = startIndex; i < klines.length && i < ema30.length; i++) {
      const kline = klines[i];
      const emaValue = ema30[i];
      
      if (!emaValue) continue;
      
      const high = parseFloat(kline.high);
      const low = parseFloat(kline.low);
      
      // 根據趨勢檢查回踩
      if (trend === 'bullish') {
        // 多頭排列：價格從上方回踩EMA30
        if (low <= emaValue && high >= emaValue) {
          return { touched: true, index: i };
        }
      } else if (trend === 'bearish') {
        // 空頭排列：價格從下方反彈EMA30
        if (low <= emaValue && high >= emaValue) {
          return { touched: true, index: i };
        }
      }
    }
    
    return { touched: false, index: -1 };
  }

  /**
   * 檢查反轉形態（陽包陰/陰包陽）
   */
  checkReversalPattern(klines, touchIndex, trend) {
    if (touchIndex < 0 || touchIndex >= klines.length - 1) {
      return { found: false };
    }

    const currentKline = klines[klines.length - 1];
    const previousKline = klines[klines.length - 2];
    
    const currentOpen = parseFloat(currentKline.open);
    const currentClose = parseFloat(currentKline.close);
    const currentHigh = parseFloat(currentKline.high);
    const currentLow = parseFloat(currentKline.low);
    
    const prevOpen = parseFloat(previousKline.open);
    const prevClose = parseFloat(previousKline.close);
    const prevHigh = parseFloat(previousKline.high);
    const prevLow = parseFloat(previousKline.low);

    if (trend === 'bullish') {
      // 多頭排列：尋找陽包陰形態
      const isPrevBearish = prevClose < prevOpen; // 前一根是陰線
      const isCurrentBullish = currentClose > currentOpen; // 當前是陽線
      const isEngulfing = currentOpen <= prevClose && currentClose >= prevOpen; // 包含關係
      
      return {
        found: isPrevBearish && isCurrentBullish && isEngulfing,
        type: 'bullish_engulfing'
      };
    } else if (trend === 'bearish') {
      // 空頭排列：尋找陰包陽形態
      const isPrevBullish = prevClose > prevOpen; // 前一根是陽線
      const isCurrentBearish = currentClose < currentOpen; // 當前是陰線
      const isEngulfing = currentOpen >= prevClose && currentClose <= prevOpen; // 包含關係
      
      return {
        found: isPrevBullish && isCurrentBearish && isEngulfing,
        type: 'bearish_engulfing'
      };
    }

    return { found: false };
  }

  /**
   * 檢查K線是否已收線
   */
  isKlineClosed(kline, timeframe) {
    const timestamp = parseInt(kline.timestamp);
    const now = Date.now();
    
    // 根據時間週期計算K線週期長度（毫秒）
    const timeframeMs = this.getTimeframeMs(timeframe);
    
    // 計算當前K線應該結束的時間
    const klineEndTime = timestamp + timeframeMs;
    
    // 如果當前時間超過K線結束時間，則認為已收線
    return now >= klineEndTime;
  }

  /**
   * 獲取時間週期對應的毫秒數
   */
  getTimeframeMs(timeframe) {
    const timeframeMap = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '1H': 60 * 60 * 1000, // 支援大寫格式
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };
    
    return timeframeMap[timeframe] || 60 * 1000; // 預設1分鐘
  }

  /**
   * 發送新策略通知
   */
  async sendNewStrategyNotification(symbol, timeframe, trend, klines, reversalPattern) {
    try {
      // 獲取下一根K棒的開盤價（當前K線的收盤價）
      const currentKline = klines[klines.length - 1];
      const nextOpenPrice = parseFloat(currentKline.close);
      
      // 計算止損和止盈
      let stopLoss, takeProfit;
      
      if (trend === 'bullish') {
        // 多頭排列：開盤價-1.5%為止損，開盤價+2.25%為止盈
        stopLoss = nextOpenPrice * 0.985;    // -1.5%
        takeProfit = nextOpenPrice * 1.0225; // +2.25%
      } else if (trend === 'bearish') {
        // 空頭排列：開盤價+1.5%為止損，開盤價-2.25%為止盈
        stopLoss = nextOpenPrice * 1.015;    // +1.5%
        takeProfit = nextOpenPrice * 0.9775; // -2.25%
      }
      
      const notification = this.formatNewStrategyNotification(
        symbol,
        timeframe,
        trend,
        nextOpenPrice,
        stopLoss,
        takeProfit,
        reversalPattern
      );
      
      await this.discordService.sendEmbed(notification, 'swing_strategy');
      
      console.log(`📈 發送新波段策略通知: ${symbol} ${timeframe} ${trend} ${reversalPattern.type}`);
    } catch (error) {
      console.error('❌ 發送新波段策略通知失敗:', error.message);
    }
  }

  /**
   * 格式化新策略通知
   */
  formatNewStrategyNotification(symbol, timeframe, trend, nextOpenPrice, stopLoss, takeProfit, reversalPattern) {
    const direction = trend === 'bullish' ? '多頭' : '空頭';
    const emoji = trend === 'bullish' ? '🟢' : '🔴';
    const patternName = reversalPattern.type === 'bullish_engulfing' ? '陽包陰' : '陰包陽';
    
    return {
      title: `${emoji} 新波段策略信號`,
      description: `檢測到 ${direction} 波段策略信號 - ${patternName}形態`,
      fields: [
        {
          name: '交易對',
          value: symbol,
          inline: true
        },
        {
          name: '時間週期',
          value: timeframe,
          inline: true
        },
        {
          name: '策略方向',
          value: direction,
          inline: true
        },
        {
          name: '反轉形態',
          value: patternName,
          inline: true
        },
        {
          name: '下一根開盤價',
          value: `$${nextOpenPrice.toFixed(4)}`,
          inline: true
        },
        {
          name: '止損價位',
          value: `$${stopLoss.toFixed(4)}`,
          inline: true
        },
        {
          name: '止盈價位',
          value: `$${takeProfit.toFixed(4)}`,
          inline: true
        },
        {
          name: '風險回報比',
          value: '1:1.5',
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      color: trend === 'bullish' ? 0x00ff00 : 0xff0000
    };
  }

  /**
   * 輔助方法：延遲執行
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 停止波段策略監控
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 新波段策略監控已停止');
  }

  /**
   * 獲取監控狀態
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      monitoringPairs: this.monitoringPairs.length,
      strategyStates: this.strategyStates.size,
      lastNotifications: this.lastNotifications.size,
      minNoEntanglementBars: this.minNoEntanglementBars,
      entanglementThreshold: this.entanglementThreshold
    };
  }

  /**
   * 重置策略狀態（用於測試或重新開始）
   */
  resetStates() {
    this.strategyStates.clear();
    this.lastNotifications.clear();
    console.log('🔄 策略狀態已重置');
  }

  /**
   * 獲取特定交易對的策略狀態
   */
  getStrategyState(symbol, timeframe) {
    const stateKey = `${symbol}_${timeframe}`;
    return this.strategyStates.get(stateKey) || null;
  }

  /**
   * 設置監控參數
   */
  setParameters(params) {
    if (params.minNoEntanglementBars) {
      this.minNoEntanglementBars = params.minNoEntanglementBars;
    }
    if (params.entanglementThreshold) {
      this.entanglementThreshold = params.entanglementThreshold;
    }
    if (params.cooldownPeriod) {
      this.cooldownPeriod = params.cooldownPeriod;
    }
    console.log('⚙️ 策略參數已更新:', params);
  }
}

module.exports = SwingStrategyService;
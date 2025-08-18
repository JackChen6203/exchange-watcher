const BitgetApi = require('./bitgetApi');
const DiscordService = require('./discordService');

/**
 * 波段策略服務
 * 監控大市值加密貨幣的 EMA 指標，檢測多空頭排列和觸碰信號
 */
class SwingStrategyService {
  constructor(config) {
    this.config = config;
    this.bitgetApi = new BitgetApi(config);
    this.discordService = new DiscordService(config);
    
    // 監控的時間週期
    this.timeframes = ['15m', '30m', '1h'];
    
    // EMA 週期設定
    this.emaPeriods = {
      fast: 12,    // EMA 12
      medium: 30,  // EMA 30
      slow: 55     // EMA 55
    };
    
    // 趨勢狀態追蹤
    this.trendStates = new Map(); // symbol -> { timeframe -> trendState }
    
    // 均線糾纏閾值（百分比）
    this.entanglementThreshold = 0.005; // 0.5% 以內視為糾纏
    
    // 監控的大市值幣種（將動態獲取）
    this.monitoredSymbols = [];
    
    // 最後通知時間記錄（避免重複通知）
    this.lastNotificationTime = new Map();
    
    // 通知冷卻時間（分鐘）
    this.notificationCooldown = 30;
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
      const usdtSymbols = allSymbols.filter(symbol => 
        symbol.endsWith('USDT') && 
        !symbol.includes('1000') && // 排除 1000SHIB 等
        !symbol.includes('_') // 排除特殊符號
      );
      
      // 獲取 24h 成交量數據來篩選大市值幣種
      const tickers = await this.bitgetApi.getAllTickers();
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
      
      // 計算 EMA 指標
      const emaData = this.calculateEMAs(formattedData);
      
      if (emaData.length < 2) {
        return; // 數據不足
      }
      
      // 獲取當前和前一根 K線的 EMA 數據
      const currentEMA = emaData[emaData.length - 1];
      const previousEMA = emaData[emaData.length - 2];
      
      // 檢查趨勢狀態
      const trendState = this.analyzeTrendState(symbol, timeframe, currentEMA, previousEMA);
      
      // 檢查觸碰信號
      if (trendState.isValidTrend) {
        await this.checkTouchSignal(symbol, timeframe, formattedData[formattedData.length - 1], currentEMA, trendState);
      }
      
    } catch (error) {
      console.error(`❌ 檢查 ${symbol} ${timeframe} 波段信號失敗:`, error);
    }
  }

  /**
   * 計算 EMA 指標
   */
  calculateEMAs(klineData) {
    const closes = klineData.map(candle => candle.close);
    
    const ema12 = this.calculateEMA(closes, this.emaPeriods.fast);
    const ema30 = this.calculateEMA(closes, this.emaPeriods.medium);
    const ema55 = this.calculateEMA(closes, this.emaPeriods.slow);
    
    // 組合 EMA 數據
    const emaData = [];
    for (let i = 0; i < closes.length; i++) {
      if (ema12[i] && ema30[i] && ema55[i]) {
        emaData.push({
          timestamp: klineData[i].timestamp,
          close: closes[i],
          ema12: ema12[i],
          ema30: ema30[i],
          ema55: ema55[i],
          high: klineData[i].high,
          low: klineData[i].low,
          open: klineData[i].open
        });
      }
    }
    
    return emaData;
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
  analyzeTrendState(symbol, timeframe, currentEMA, previousEMA) {
    const key = `${symbol}_${timeframe}`;
    
    // 檢查多頭排列：EMA12 > EMA30 > EMA55
    const isBullish = currentEMA.ema12 > currentEMA.ema30 && currentEMA.ema30 > currentEMA.ema55;
    
    // 檢查空頭排列：EMA12 < EMA30 < EMA55
    const isBearish = currentEMA.ema12 < currentEMA.ema30 && currentEMA.ema30 < currentEMA.ema55;
    
    // 檢查均線糾纏
    const isEntangled = this.checkEntanglement(currentEMA);
    
    // 獲取之前的趨勢狀態
    const previousState = this.trendStates.get(key) || {
      trend: 'neutral',
      isValidTrend: false,
      hasNotTouchedEMA55: false,
      startTime: null
    };
    
    let newState = { ...previousState };
    
    if (isEntangled) {
      // 均線糾纏，重置狀態
      newState = {
        trend: 'neutral',
        isValidTrend: false,
        hasNotTouchedEMA55: false,
        startTime: null
      };
    } else if (isBullish && previousState.trend !== 'bullish') {
      // 新的多頭排列開始
      newState = {
        trend: 'bullish',
        isValidTrend: true,
        hasNotTouchedEMA55: true,
        startTime: currentEMA.timestamp
      };
    } else if (isBearish && previousState.trend !== 'bearish') {
      // 新的空頭排列開始
      newState = {
        trend: 'bearish',
        isValidTrend: true,
        hasNotTouchedEMA55: true,
        startTime: currentEMA.timestamp
      };
    } else if (previousState.isValidTrend) {
      // 繼續之前的趨勢，檢查是否觸碰 EMA55
      if (this.hasTouchedEMA55(currentEMA)) {
        newState.hasNotTouchedEMA55 = false;
      }
    }
    
    // 檢查趨勢的持續性（至少需要連續幾根 K 線保持排列）
    if (newState.isValidTrend && previousEMA) {
      let trendConfirmed = false;
      if (newState.trend === 'bullish') {
        trendConfirmed = previousEMA.ema12 > previousEMA.ema30 && previousEMA.ema30 > previousEMA.ema55;
      } else if (newState.trend === 'bearish') {
        trendConfirmed = previousEMA.ema12 < previousEMA.ema30 && previousEMA.ema30 < previousEMA.ema55;
      }
      
      if (!trendConfirmed) {
        newState.isValidTrend = false;
      }
    }
    
    // 更新趨勢狀態
    this.trendStates.set(key, newState);
    
    return newState;
  }

  /**
   * 檢查均線是否糾纏
   */
  checkEntanglement(emaData) {
    const { ema12, ema30, ema55 } = emaData;
    
    // 計算均線間的距離百分比
    const avgPrice = (ema12 + ema30 + ema55) / 3;
    const diff12_30 = Math.abs(ema12 - ema30) / avgPrice;
    const diff30_55 = Math.abs(ema30 - ema55) / avgPrice;
    const diff12_55 = Math.abs(ema12 - ema55) / avgPrice;
    
    // 如果任意兩條均線距離小於閾值，視為糾纏
    const isEntangled = diff12_30 < this.entanglementThreshold || 
                       diff30_55 < this.entanglementThreshold || 
                       diff12_55 < this.entanglementThreshold;
    
    return isEntangled;
  }

  /**
   * 檢查是否觸碰 EMA55
   */
  hasTouchedEMA55(emaData) {
    const { high, low, ema55 } = emaData;
    
    // 檢查 K線的高低點是否觸碰 EMA55（允許小幅穿越）
    const touchThreshold = ema55 * 0.001; // 0.1% 的容錯範圍
    return low <= (ema55 + touchThreshold) && high >= (ema55 - touchThreshold);
  }

  /**
   * 檢查是否觸碰 EMA30
   */
  hasTouchedEMA30(emaData) {
    const { high, low, ema30 } = emaData;
    
    // 檢查 K線的高低點是否觸碰 EMA30（允許小幅穿越）
    const touchThreshold = ema30 * 0.001; // 0.1% 的容錯範圍
    return low <= (ema30 + touchThreshold) && high >= (ema30 - touchThreshold);
  }

  /**
   * 檢查觸碰信號
   */
  async checkTouchSignal(symbol, timeframe, currentKline, currentEMA, trendState) {
    // 只在有效趨勢且未觸碰 EMA55 的情況下檢查
    if (!trendState.isValidTrend || !trendState.hasNotTouchedEMA55) {
      return;
    }
    
    // 檢查是否觸碰 EMA30
    if (this.hasTouchedEMA30(currentEMA)) {
      // 檢查通知冷卻時間
      const notificationKey = `${symbol}_${timeframe}_${trendState.trend}`;
      const lastNotification = this.lastNotificationTime.get(notificationKey);
      const now = Date.now();
      
      if (!lastNotification || (now - lastNotification) > (this.notificationCooldown * 60 * 1000)) {
        // 發送波段策略通知
        await this.sendSwingNotification(symbol, timeframe, currentKline, currentEMA, trendState);
        this.lastNotificationTime.set(notificationKey, now);
      }
    }
  }

  /**
   * 發送波段策略通知
   */
  async sendSwingNotification(symbol, timeframe, kline, emaData, trendState) {
    try {
      const openPrice = parseFloat(kline[1]); // 開盤價
      const direction = trendState.trend === 'bullish' ? '多' : '空';
      
      // 計算實盤價（開盤價 ± 1%）
      let entryPrice;
      if (trendState.trend === 'bullish') {
        entryPrice = openPrice * 0.99; // 多頭：開盤價 -1%
      } else {
        entryPrice = openPrice * 1.01; // 空頭：開盤價 +1%
      }
      
      // 計算 TP1（實盤價 + 1.5%）
      const tp1Price = entryPrice * 1.015;
      
      // 格式化通知消息
      const embed = this.formatSwingNotification({
        symbol,
        timeframe,
        direction,
        openPrice,
        entryPrice,
        tp1Price,
        emaData
      });
      
      // 發送到 Discord
      await this.discordService.sendEmbed(embed, 'swing_strategy');
      
      console.log(`📢 波段策略通知已發送: ${symbol} ${timeframe} ${direction}頭`);
      
      // 記錄通知時間，避免重複通知
      const key = `${symbol}_${timeframe}_${trendState.trend}`;
      this.lastNotificationTime.set(key, Date.now());
      
    } catch (error) {
      console.error('❌ 發送波段策略通知失敗:', error);
    }
  }

  /**
   * 格式化波段策略通知
   */
  formatSwingNotification(data) {
    const { symbol, timeframe, direction, openPrice, entryPrice, tp1Price, emaData } = data;
    
    const trendEmoji = direction === '多' ? '🟢' : '🔴';
    const color = direction === '多' ? 0x00ff00 : 0xff0000; // 綠色或紅色
    
    // 計算收益率
    const profitPercent = ((tp1Price - entryPrice) / entryPrice * 100).toFixed(2);
    
    return {
      title: `${trendEmoji} 波段策略信號`,
      color: color,
      fields: [
        {
          name: '🪙 交易對',
          value: `**${symbol}**`,
          inline: true
        },
        {
          name: '📈 策略方向',
          value: `**波段策略(${direction})**`,
          inline: true
        },
        {
          name: '⏰ 時間週期',
          value: `**${timeframe}**`,
          inline: true
        },
        {
          name: '💰 開盤價',
          value: `$${openPrice.toFixed(4)}`,
          inline: true
        },
        {
          name: '🎯 實盤價',
          value: `$${entryPrice.toFixed(4)} (${direction === '多' ? '-1%' : '+1%'})`,
          inline: true
        },
        {
          name: '🚀 TP1',
          value: `$${tp1Price.toFixed(4)} (+${profitPercent}%)`,
          inline: true
        },
        {
          name: '📊 EMA狀態',
          value: `EMA12: $${emaData.ema12.toFixed(4)}\nEMA30: $${emaData.ema30.toFixed(4)}\nEMA55: $${emaData.ema55.toFixed(4)}`,
          inline: false
        },
        {
          name: '⚡ 信號條件',
          value: '**觸碰EMA30，未觸碰EMA55**',
          inline: false
        }
      ],
      footer: {
        text: `EMA 波段策略 • ${new Date().toLocaleString('zh-TW')}`
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 延遲函數
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 停止監控
   */
  stop() {
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('🛑 波段策略監控已停止');
  }

  /**
   * 獲取服務狀態
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      monitoredSymbols: this.monitoredSymbols.length,
      periods: this.periods,
      lastCheckTime: this.lastCheckTime || null,
      trendStates: Object.keys(this.trendStates).length,
      notificationCooldowns: this.lastNotificationTime.size
    };
  }
}

module.exports = SwingStrategyService;
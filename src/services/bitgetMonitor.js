const WebSocket = require('ws');
const crypto = require('crypto');
const BitgetApi = require('./bitgetApi');
const Logger = require('../utils/logger');
const DatabaseManager = require('./databaseManager');

class BitgetMonitor {
  constructor(config, discordService) {
    this.config = config;
    this.discordService = discordService;
    this.bitgetApi = new BitgetApi(config);
    this.logger = new Logger(config);
    this.db = new DatabaseManager(config);
    this.ws = null;
    this.positions = new Map();
    this.prices = new Map();
    this.openInterests = new Map(); // 持倉量數據
    this.fundingRates = new Map(); // 資金費率數據
    this.allSymbols = [];
    this.contractSymbols = []; // 合約交易對
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = this.config.websocket.maxReconnectAttempts;
    this.pingInterval = null;
    this.monitoringInterval = null; // 定期監控間隔
    this.connectionGroups = []; // 多個連接組，每組監控不同的交易對
    this.lastPriceSave = 0; // 最後一次價格保存時間
  }

  async initialize() {
    try {
      this.logger.console('🚀 初始化Bitget監控系統...');
      
      // 初始化數據庫
      await this.db.initialize();
      
      // 測試API連接
      const connectionTest = await this.bitgetApi.testConnection();
      if (!connectionTest) {
        throw new Error('API連接測試失敗');
      }

      // 獲取所有交易對
      await this.loadAllSymbols();
      
      // 獲取合約交易對
      await this.loadContractSymbols();
      
      // 創建WebSocket連接組
      await this.createConnectionGroups();
      
      // 啟動定期監控
      this.startPeriodicMonitoring();
      
      this.logger.console('✅ Bitget監控系統初始化完成');
      
    } catch (error) {
      this.logger.error('❌ 初始化失敗:', error);
      throw error;
    }
  }

  async loadAllSymbols() {
    try {
      this.logger.info('📊 載入所有現貨交易對...');
      this.allSymbols = [];
      
      // 使用現貨API獲取所有交易對
      const symbols = await this.bitgetApi.getAllSpotSymbols();
      this.allSymbols = symbols;
      
      this.logger.info(`📈 成功載入 ${this.allSymbols.length} 個現貨交易對`);
      
      // 更新配置中的symbols
      this.config.symbols = this.allSymbols.map(s => s.symbol);
      
    } catch (error) {
      this.logger.error('❌ 載入現貨交易對失敗:', error);
      // 如果載入失敗，使用一些主要現貨交易對作為備用
      this.allSymbols = [
        { symbol: 'BTCUSDT', productType: 'sp' },
        { symbol: 'ETHUSDT', productType: 'sp' },
        { symbol: 'BNBUSDT', productType: 'sp' }
      ];
      this.config.symbols = this.allSymbols.map(s => s.symbol);
      this.logger.warn('⚠️ 使用備用現貨交易對列表');
    }
  }

  // 現貨交易不需要合約符號加載方法
  async loadContractSymbols() {
    // 現貨交易不使用合約，跳過此方法
    this.contractSymbols = [];
  }

  async createConnectionGroups() {
    const symbolsPerConnection = this.config.thresholds.maxChannelsPerConnection;
    const totalSymbols = this.allSymbols.length;
    const numConnections = Math.ceil(totalSymbols / symbolsPerConnection);
    
    console.log(`🔗 創建 ${numConnections} 個WebSocket連接組，每組監控 ${symbolsPerConnection} 個交易對`);
    
    for (let i = 0; i < numConnections; i++) {
      const startIdx = i * symbolsPerConnection;
      const endIdx = Math.min(startIdx + symbolsPerConnection, totalSymbols);
      const groupSymbols = this.allSymbols.slice(startIdx, endIdx);
      
      this.connectionGroups.push({
        id: i,
        symbols: groupSymbols,
        ws: null,
        isConnected: false,
        reconnectAttempts: 0
      });
    }
  }

  async connect() {
    try {
      console.log('🔌 開始連接到Bitget WebSocket...');
      
      // 依次連接所有組
      for (const group of this.connectionGroups) {
        await this.connectGroup(group);
        // 間隔一秒再連接下一組，避免過快連接
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      this.isConnected = true;
      console.log('✅ 所有WebSocket連接組已建立');
      
      // 啟動ping機制
      this.startPingInterval();
      
    } catch (error) {
      console.error('❌ 連接失敗:', error);
      this.reconnect();
    }
  }

  async connectGroup(group) {
    try {
      console.log(`🔗 連接組 ${group.id}，監控 ${group.symbols.length} 個交易對...`);
      
      group.ws = new WebSocket(this.config.api.wsUrl);
      
      group.ws.on('open', () => {
        console.log(`✅ 組 ${group.id} WebSocket連接成功`);
        group.isConnected = true;
        group.reconnectAttempts = 0;
        this.subscribeGroupData(group);
      });

      group.ws.on('message', (data) => {
        this.handleMessage(data, group).catch(error => {
          console.error(`❌ 組 ${group.id} 處理消息時發生錯誤:`, error);
        });
      });

      group.ws.on('close', () => {
        console.log(`⚠️ 組 ${group.id} WebSocket連接關閉`);
        group.isConnected = false;
        this.reconnectGroup(group);
      });

      group.ws.on('error', (error) => {
        console.error(`❌ 組 ${group.id} WebSocket錯誤:`, error);
        group.isConnected = false;
      });

    } catch (error) {
      console.error(`❌ 組 ${group.id} 連接失敗:`, error);
      this.reconnectGroup(group);
    }
  }

  subscribeGroupData(group) {
    // Bitget 現貨WebSocket訂閱格式
    const subscriptions = [];
    
    // 訂閱ticker數據，跳過可能無效的交易對
    group.symbols.forEach(symbolData => {
      // 過濾掉可能已下線或測試的交易對
      if (this.isValidSymbol(symbolData.symbol)) {
        // 現貨使用ticker頻道
        subscriptions.push({
          instType: 'sp', // 現貨類型
          channel: 'ticker',
          instId: symbolData.symbol
        });
      } else {
        console.log(`⚠️ 跳過可能無效的交易對: ${symbolData.symbol}`);
      }
    });

    // 分批發送訂閱請求，避免單次請求過大
    const batchSize = 5; // 減少批次大小以提高穩定性
    let successCount = 0;
    
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      const subscribeMessage = {
        op: 'subscribe',
        args: batch
      };
      
      try {
        group.ws.send(JSON.stringify(subscribeMessage));
        successCount += batch.length;
        
        // 添加延遲避免過快發送
        setTimeout(() => {}, 100);
      } catch (error) {
        console.error(`❌ 組 ${group.id} 發送訂閱失敗:`, error);
      }
    }
    
    console.log(`📡 組 ${group.id} 嘗試訂閱 ${successCount} 個現貨ticker頻道`);
    
    // 記錄這個組的訂閱狀態
    group.subscribedSymbols = subscriptions.map(s => s.instId);
    group.failedSymbols = [];
  }

  // 驗證交易對是否有效
  isValidSymbol(symbol) {
    // 跳過測試交易對或明顯無效的交易對
    const invalidPatterns = [
      /^TST/, // 測試交易對
      /^TEST/, // 測試交易對
      /DEMO/, // 演示交易對
      /NULL/, // 空值交易對
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(symbol));
  }

  // 移除無效的交易對
  removeInvalidSymbol(symbol) {
    console.log(`🗑️ 從監控列表中移除無效交易對: ${symbol}`);
    
    // 從所有組中移除這個交易對
    this.connectionGroups.forEach(group => {
      if (group.symbols) {
        group.symbols = group.symbols.filter(s => s.symbol !== symbol);
      }
      if (group.subscribedSymbols) {
        group.subscribedSymbols = group.subscribedSymbols.filter(s => s !== symbol);
      }
    });
    
    // 從全局交易對列表中移除
    this.allSymbols = this.allSymbols.filter(s => s.symbol !== symbol);
    this.config.symbols = this.config.symbols.filter(s => s !== symbol);
  }

  // 獲取訂閱統計信息
  getSubscriptionStats() {
    let totalSubscribed = 0;
    let totalFailed = 0;
    
    this.connectionGroups.forEach(group => {
      if (group.subscribedSymbols) {
        totalSubscribed += group.subscribedSymbols.length;
      }
      if (group.failedSymbols) {
        totalFailed += group.failedSymbols.length;
      }
    });
    
    return {
      totalSymbols: this.allSymbols.length,
      totalSubscribed,
      totalFailed,
      successRate: totalSubscribed > 0 ? ((totalSubscribed / (totalSubscribed + totalFailed)) * 100).toFixed(1) : 0
    };
  }

  async handleMessage(data, group) {
    try {
      // 處理pong響應（Bitget 返回字符串 'pong'）
      if (data.toString() === 'pong') {
        return;
      }
      
      const message = JSON.parse(data);
      
      // 處理JSON格式的pong響應
      if (message.pong) {
        return;
      }
      
      // 處理訂閱響應
      if (message.event) {
        if (message.event === 'subscribe') {
          console.log(`✅ 組 ${group.id} 訂閱成功:`, message.arg?.instId || 'unknown');
        } else if (message.event === 'error') {
          const failedSymbol = message.arg?.instId;
          console.warn(`⚠️ 組 ${group.id} 訂閱失敗: ${failedSymbol} - ${message.msg}`);
          
          // 記錄失敗的交易對
          if (failedSymbol && group.failedSymbols) {
            group.failedSymbols.push(failedSymbol);
          }
          
          // 如果是不存在的交易對，從後續監控中移除
          if (message.code === 30001) { // 交易對不存在
            this.removeInvalidSymbol(failedSymbol);
          }
        }
        return;
      }

      // 處理ticker數據
      if (message.arg && message.data) {
        const { channel, instId } = message.arg;
        
        if (channel === 'ticker') {
          await this.handleTickerUpdate(message.data, instId);
        }
      }
    } catch (error) {
      console.error(`❌ 組 ${group.id} 處理消息失敗:`, error);
    }
  }

  async handleTickerUpdate(data, symbol) {
    for (const ticker of data) {
      // Bitget 現貨ticker數據格式
      const currentPrice = parseFloat(ticker.close);
      const changePercent = parseFloat(ticker.change) || 0;
      const volume24h = parseFloat(ticker.baseVol) || 0;
      
      const priceData = {
        symbol: symbol,
        price: currentPrice,
        changePercent: changePercent,
        volume24h: volume24h,
        high24h: parseFloat(ticker.high24h) || 0,
        low24h: parseFloat(ticker.low24h) || 0,
        openPrice: parseFloat(ticker.open) || 0,
        quoteVolume: parseFloat(ticker.quoteVol) || 0,
        bidPrice: parseFloat(ticker.bidPr) || 0,
        askPrice: parseFloat(ticker.askPr) || 0,
        timestamp: parseInt(ticker.ts) || Date.now()
      };

      const previousPrice = this.prices.get(symbol);
      
      // 檢查價格變動 (>10%)
      if (previousPrice && Math.abs(changePercent) > this.config.thresholds.priceChange) {
        await this.notifyPriceChange(priceData, previousPrice);
      }

      // 更新存儲的數據
      this.prices.set(symbol, priceData);
      
      // 保存到數據庫（每分鐘只保存一次，避免數據過多）
      const now = Date.now();
      const lastSave = this.lastPriceSave || 0;
      if (now - lastSave > 60000) { // 1分鐘
        try {
          await this.db.savePriceData(priceData);
          this.lastPriceSave = now;
        } catch (error) {
          this.logger.warn(`⚠️ 保存 ${symbol} 價格數據失敗:`, error.message);
        }
      }
    }
  }

  async notifyPriceChange(current, previous) {
    const direction = current.changePercent > 0 ? '📈' : '📉';
    const color = current.changePercent > 0 ? 0x00ff00 : 0xff0000;
    
    this.logger.info(`💰 價格異動提醒: ${current.symbol} ${current.changePercent > 0 ? '+' : ''}${current.changePercent.toFixed(2)}%`);
    
    const embed = {
      title: `${direction} Bitget 現貨價格變動提醒 (>${this.config.thresholds.priceChange}%)`,
      color: color,
      fields: [
        {
          name: '交易對',
          value: current.symbol,
          inline: true
        },
        {
          name: '當前價格',
          value: `$${current.price.toFixed(6)}`,
          inline: true
        },
        {
          name: '24小時變化',
          value: `${current.changePercent > 0 ? '+' : ''}${current.changePercent.toFixed(2)}%`,
          inline: true
        },
        {
          name: '開盤價格',
          value: `$${current.openPrice.toFixed(6)}`,
          inline: true
        },
        {
          name: '24小時成交量',
          value: this.formatNumber(current.volume24h),
          inline: true
        },
        {
          name: '24小時最高/最低',
          value: `$${current.high24h.toFixed(6)} / $${current.low24h.toFixed(6)}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Bitget 現貨監控',
        icon_url: this.config.discord.icons.chart
      }
    };

    await this.discordService.sendEmbed(embed);
  }

  // 現貨交易不需要持倉量和資金費率監控

  startPingInterval() {
    this.pingInterval = setInterval(() => {
      this.connectionGroups.forEach(group => {
        if (group.ws && group.isConnected) {
          try {
            // Bitget WebSocket 使用字符串 'ping' 而不是 JSON
            group.ws.ping();
          } catch (error) {
            console.error(`❌ 組 ${group.id} 發送ping失敗:`, error);
          }
        }
      });
    }, this.config.websocket.pingInterval);
  }

  stopPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  reconnectGroup(group) {
    if (group.reconnectAttempts < this.maxReconnectAttempts) {
      group.reconnectAttempts++;
      console.log(`🔄 嘗試重新連接組 ${group.id} (${group.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectGroup(group);
      }, this.config.websocket.reconnectDelay * group.reconnectAttempts);
    } else {
      console.error(`❌ 組 ${group.id} 達到最大重連次數，停止重連`);
    }
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 嘗試重新連接所有組 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, this.config.websocket.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ 達到最大重連次數，停止重連');
    }
  }

  disconnect() {
    console.log('🔌 斷開所有WebSocket連接...');
    
    this.stopPingInterval();
    this.stopPeriodicMonitoring();
    
    this.connectionGroups.forEach(group => {
      if (group.ws) {
        group.ws.close();
        group.isConnected = false;
      }
    });
    
    // 關閉數據庫連接
    if (this.db) {
      this.db.close();
    }
    
    this.isConnected = false;
    console.log('✅ 所有連接已斷開');
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

  // 啟動定期監控
  startPeriodicMonitoring() {
    // 每5分鐘更新一次現貨價格數據
    this.monitoringInterval = setInterval(async () => {
      await this.updateSpotData();
    }, 5 * 60 * 1000); // 5分鐘
    
    this.logger.info('🔄 啟動定期監控 (每5分鐘更新現貨數據)');
  }

  // 停止定期監控
  stopPeriodicMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('⏹️ 停止定期監控');
    }
  }

  // 更新現貨數據
  async updateSpotData() {
    try {
      this.logger.debug('🔍 更新現貨數據中...');
      
      // 獲取主要交易對的數據
      const majorSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'];
      
      for (const symbol of majorSymbols) {
        try {
          // 現貨交易只需要監控價格變動，持倉量和資金費率不適用
          // 可以在此處添加其他現貨相關的監控邏輯
          
          // 添加延遲避免API限制
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          this.logger.warn(`⚠️ 更新 ${symbol} 現貨數據失敗:`, error.message);
        }
      }
      
    } catch (error) {
      this.logger.error('❌ 更新現貨數據失敗:', error);
    }
  }

  // 獲取監控狀態
  getStatus() {
    const connectedGroups = this.connectionGroups.filter(g => g.isConnected).length;
    const totalGroups = this.connectionGroups.length;
    const monitoredSymbols = this.prices.size;
    const subscriptionStats = this.getSubscriptionStats();
    
    return {
      isConnected: this.isConnected,
      connectedGroups: `${connectedGroups}/${totalGroups}`,
      monitoredSymbols: monitoredSymbols,
      totalSymbols: this.allSymbols.length,
      subscriptionStats: subscriptionStats,
      tradingType: '現貨交易'
    };
  }
}

module.exports = BitgetMonitor;
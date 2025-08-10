const BitgetApi = require('./bitgetApi');
const Logger = require('../utils/logger');
const DatabaseManager = require('./databaseManager');

class ContractMonitor {
  constructor(config, discordService) {
    this.config = config;
    this.discordService = discordService;
    this.bitgetApi = new BitgetApi(config);
    this.logger = new Logger(config);
    this.db = new DatabaseManager(config);
    
    // 數據存儲
    this.openInterestData = new Map(); // 持倉量數據 symbol -> { current, history }
    this.fundingRateData = new Map();  // 資金費率數據 symbol -> { current, history }
    this.marketCapData = new Map();    // 市值數據 symbol -> { current, history }
    this.contractSymbols = [];         // 合約交易對列表
    
    // 定時器
    this.reportInterval = null;        // 15分鐘報告定時器
    this.dataUpdateInterval = null;    // 數據更新定時器
    this.fundingRateAlertInterval = null; // 資金費率提醒定時器
    
    // Discord Webhooks 現在由 DiscordService 統一處理
    
    // 報告間隔配置
    this.reportIntervals = {
      '5m': 5 * 60 * 1000,        // 5分鐘 - 主要報告間隔
      '15m': 15 * 60 * 1000,      // 15分鐘
      '1h': 60 * 60 * 1000,       // 1小時
      '4h': 4 * 60 * 60 * 1000,   // 4小時
      '1d': 24 * 60 * 60 * 1000   // 1天
    };
  }

  async initialize() {
    try {
      this.logger.console('🚀 初始化合約監控系統...');
      
      // 初始化数据库
      await this.db.initialize();
      
      // 載入合約交易對
      await this.loadContractSymbols();
      
      // 初始化數據收集
      await this.initializeDataCollection();
      
      // 啟動定時報告
      this.startPeriodicReports();
      
      // 啟動資金費率提醒
      this.startFundingRateAlerts();
      
      this.logger.console('✅ 合約監控系統初始化完成');
      
    } catch (error) {
      this.logger.error('❌ 合約監控初始化失敗:', error);
      throw error;
    }
  }

  async loadContractSymbols() {
    try {
      this.logger.info('📊 載入合約交易對...');
      
      // 載入USDT永續合約
      const usdtContracts = await this.bitgetApi.getSymbolsByProductType('umcbl');
      this.contractSymbols = usdtContracts.filter(contract => 
        contract.status === 'normal' && 
        (contract.symbol.includes('USDT') || contract.symbol.includes('USDC'))
      );
      
      this.logger.info(`✅ 成功載入 ${this.contractSymbols.length} 個合約交易對`);
      
    } catch (error) {
      this.logger.error('❌ 載入合約交易對失敗:', error);
      // 使用備用主要合約
      this.contractSymbols = [
        { symbol: 'BTCUSDT', productType: 'umcbl' },
        { symbol: 'ETHUSDT', productType: 'umcbl' },
        { symbol: 'BNBUSDT', productType: 'umcbl' }
      ];
    }
  }

  async initializeDataCollection() {
    try {
      this.logger.info('🔍 初始化數據收集...');
      
      // 初始收集一次數據
      await this.collectAllData();
      
      // 啟動定期數據更新（每2分鐘）
      this.dataUpdateInterval = setInterval(async () => {
        await this.collectAllData();
      }, 2 * 60 * 1000);
      
      this.logger.info('✅ 數據收集初始化完成');
      
    } catch (error) {
      this.logger.error('❌ 數據收集初始化失敗:', error);
    }
  }

  async collectAllData() {
    try {
      this.logger.debug('📊 開始收集合約數據...');
      
      // 並行收集持倉量和資金費率數據（分批處理避免API限制）
      const batchSize = 10; // 減少批次大小，避免API限制
      const totalContracts = this.contractSymbols.length;
      const totalBatches = Math.ceil(totalContracts / batchSize);
      
      this.logger.info(`📊 開始收集 ${totalContracts} 個合約的數據，分 ${totalBatches} 批處理...`);
      
      let successCount = 0;
      let errorCount = 0;
      
      for (let i = 0; i < totalContracts; i += batchSize) {
        const batch = this.contractSymbols.slice(i, i + batchSize);
        const batchNum = Math.floor(i/batchSize) + 1;
        
        this.logger.info(`🔄 處理第 ${batchNum}/${totalBatches} 批，共 ${batch.length} 個合約`);
        
        const promises = batch.map(async (contract) => {
          try {
            // 收集持倉量數據
            const openInterest = await this.bitgetApi.getOpenInterest(contract.symbol, contract.productType);
            await this.updateOpenInterestData(contract.symbol, openInterest);
            
            // 收集資金費率數據
            const fundingRate = await this.bitgetApi.getFundingRate(contract.symbol, contract.productType);
            await this.updateFundingRateData(contract.symbol, fundingRate);
            
            // 收集市值數據
            const marketData = await this.bitgetApi.getMarketData(contract.symbol, contract.productType);
            await this.updateMarketCapData(contract.symbol, marketData);
            
            successCount++;
            
            // 添加延遲避免API限制
            await new Promise(resolve => setTimeout(resolve, 150));
            
          } catch (error) {
            errorCount++;
            this.logger.warn(`⚠️ 收集 ${contract.symbol} 數據失敗:`, error.message);
          }
        });
        
        await Promise.all(promises);
        
        // 顯示進度
        const progress = ((i + batch.length) / totalContracts * 100).toFixed(1);
        this.logger.info(`📈 進度: ${progress}% (成功: ${successCount}, 失敗: ${errorCount})`);
        
        // 批次間延遲，避免API限制
        if (i + batchSize < totalContracts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒延遲
        }
      }
      
      this.logger.info(`✅ 完成所有數據收集，監控 ${this.openInterestData.size} 個合約 (成功: ${successCount}, 失敗: ${errorCount})`);
      
    } catch (error) {
      this.logger.error('❌ 收集合約數據失敗:', error);
    }
  }

  async updateOpenInterestData(symbol, newData) {
    if (!this.openInterestData.has(symbol)) {
      this.openInterestData.set(symbol, {
        current: newData,
        history: []
      });
    }
    
    const data = this.openInterestData.get(symbol);
    const previous = data.current;
    
    // 計算變化
    if (previous) {
      newData.change = newData.openInterest - previous.openInterest;
      newData.changePercent = previous.openInterest > 0 ? 
        ((newData.openInterest - previous.openInterest) / previous.openInterest) * 100 : 0;
    } else {
      newData.change = 0;
      newData.changePercent = 0;
    }
    
    // 更新當前數據
    data.current = newData;
    
    // 保存歷史數據（最多保存100條）
    data.history.push({
      ...newData,
      timestamp: Date.now()
    });
    
    if (data.history.length > 100) {
      data.history.shift();
    }
    
    // 保存到数据库
    try {
      await this.db.saveOpenInterest(newData);
    } catch (error) {
      this.logger.warn(`⚠️ 保存 ${symbol} 持倉量数据失败:`, error.message);
    }
  }

  async updateFundingRateData(symbol, newData) {
    if (!this.fundingRateData.has(symbol)) {
      this.fundingRateData.set(symbol, {
        current: newData,
        history: []
      });
    }
    
    const data = this.fundingRateData.get(symbol);
    const previous = data.current;
    
    // 計算變化
    if (previous) {
      newData.change = newData.fundingRate - previous.fundingRate;
    } else {
      newData.change = 0;
    }
    
    // 更新當前數據
    data.current = newData;
    
    // 保存歷史數據（最多保存100條）
    data.history.push({
      ...newData,
      timestamp: Date.now()
    });
    
    if (data.history.length > 100) {
      data.history.shift();
    }
    
    // 保存到数据库
    try {
      await this.db.saveFundingRate(newData);
    } catch (error) {
      this.logger.warn(`⚠️ 保存 ${symbol} 資金費率数据失败:`, error.message);
    }
  }

  async updateMarketCapData(symbol, newData) {
    if (!this.marketCapData.has(symbol)) {
      this.marketCapData.set(symbol, {
        current: newData,
        history: []
      });
    }
    
    const data = this.marketCapData.get(symbol);
    const previous = data.current;
    
    // 計算變化
    if (previous) {
      newData.marketCapChange = newData.marketCap - previous.marketCap;
      newData.marketCapChangePercent = previous.marketCap > 0 ? 
        ((newData.marketCap - previous.marketCap) / previous.marketCap) * 100 : 0;
    } else {
      newData.marketCapChange = 0;
      newData.marketCapChangePercent = 0;
    }
    
    // 更新當前數據
    data.current = newData;
    
    // 保存歷史數據（最多保存100條）
    data.history.push({
      ...newData,
      timestamp: Date.now()
    });
    
    if (data.history.length > 100) {
      data.history.shift();
    }
  }

  startPeriodicReports() {
    // 改為每5分鐘發送報告（符合用戶要求）
    this.reportInterval = setInterval(async () => {
      await this.generateAndSendReport();
    }, this.reportIntervals['5m']);
    
    this.logger.info('🔄 啟動定期報告系統 (每5分鐘)');
  }

  startFundingRateAlerts() {
    // 每分鐘檢查是否需要發送資金費率提醒
    this.fundingRateAlertInterval = setInterval(() => {
      const now = new Date();
      const minute = now.getMinutes();
      
      // 在每小時的50分和55分發送提醒
      if (minute === 50 || minute === 55) {
        this.sendFundingRateAlert();
      }
    }, 60 * 1000); // 每分鐘檢查一次
    
    this.logger.info('⏰ 啟動資金費率提醒系統 (每小時50分和55分)');
  }

  async generateAndSendReport() {
    try {
      this.logger.info('📊 生成定期報告...');
      
      // 生成持倉量變動排行榜
      const openInterestRankings = this.generateOpenInterestRankings();
      
      // 生成資金費率排行榜  
      const fundingRateRankings = this.generateFundingRateRankings();
      
      // 發送Discord報告
      await this.sendRankingReport(openInterestRankings, fundingRateRankings);
      
    } catch (error) {
      this.logger.error('❌ 生成報告失敗:', error);
    }
  }

  generateOpenInterestRankings() {
    const rankings = {
      positive: [], // 正異動
      negative: []  // 負異動
    };
    
    for (const [symbol, data] of this.openInterestData) {
      if (data.current && data.current.changePercent !== undefined) {
        // 獲取對應的市值數據
        const marketData = this.marketCapData.get(symbol);
        
        const item = {
          symbol,
          openInterest: data.current.openInterest,
          change: data.current.change,
          changePercent: data.current.changePercent,
          marketCap: marketData?.current?.marketCap || 0,
          timestamp: data.current.timestamp
        };
        
        if (data.current.changePercent > 0) {
          rankings.positive.push(item);
        } else if (data.current.changePercent < 0) {
          rankings.negative.push(item);
        }
      }
    }
    
    // 排序並取前8名（符合用戶要求）
    rankings.positive.sort((a, b) => b.changePercent - a.changePercent).splice(8);
    rankings.negative.sort((a, b) => a.changePercent - b.changePercent).splice(8);
    
    return rankings;
  }

  generateFundingRateRankings() {
    const rankings = {
      positive: [], // 正費率
      negative: []  // 負費率
    };
    
    for (const [symbol, data] of this.fundingRateData) {
      if (data.current && data.current.fundingRate !== undefined) {
        // 獲取對應的市值數據
        const marketData = this.marketCapData.get(symbol);
        
        const item = {
          symbol,
          fundingRate: data.current.fundingRate,
          change: data.current.change,
          nextFundingTime: data.current.nextFundingTime,
          marketCap: marketData?.current?.marketCap || 0,
          timestamp: data.current.timestamp
        };
        
        if (data.current.fundingRate > 0) {
          rankings.positive.push(item);
        } else if (data.current.fundingRate < 0) {
          rankings.negative.push(item);
        }
      }
    }
    
    // 排序並取前8名（符合用戶要求）
    rankings.positive.sort((a, b) => b.fundingRate - a.fundingRate).splice(8);
    rankings.negative.sort((a, b) => a.fundingRate - b.fundingRate).splice(8);
    
    return rankings;
  }

  async sendRankingReport(openInterestRankings, fundingRateRankings) {
    const now = new Date();
    const timeStr = now.toLocaleString('zh-TW');
    
    // 持倉量變動報告 - 發送到專用webhook
    const oiEmbed = {
      title: '📊 持倉量變動排行榜 (5分鐘)',
      description: `統計時間: ${timeStr}`,
      color: 0x1f8b4c,
      fields: [
        {
          name: '📈 持倉量正異動 TOP 8',
          value: this.formatOpenInterestRanking(openInterestRankings.positive),
          inline: false
        },
        {
          name: '📉 持倉量負異動 TOP 8', 
          value: this.formatOpenInterestRanking(openInterestRankings.negative),
          inline: false
        }
      ],
      timestamp: now.toISOString(),
      footer: {
        text: 'Bitget 合約監控',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png'
      }
    };

    // 資金費率報告 - 發送到一般頻道
    const frEmbed = {
      title: '💰 資金費率排行榜 (5分鐘)',
      description: `統計時間: ${timeStr}`,
      color: 0xe74c3c,
      fields: [
        {
          name: '🟢 正資金費率 TOP 8',
          value: this.formatFundingRateRanking(fundingRateRankings.positive),
          inline: false
        },
        {
          name: '🔴 負資金費率 TOP 8',
          value: this.formatFundingRateRanking(fundingRateRankings.negative), 
          inline: false
        }
      ],
      timestamp: now.toISOString(),
      footer: {
        text: 'Bitget 合約監控',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4b0.png'
      }
    };

    // 發送持倉量報告到持倉專用頻道
    await this.discordService.sendEmbed(oiEmbed, 'position');
    // 發送資金費率報告到資金費率專用頻道
    await this.discordService.sendEmbed(frEmbed, 'funding_rate');
    
    // 保存排行榜快照到数据库
    try {
      await this.db.saveRankingSnapshot('open_interest_positive', '15m', openInterestRankings.positive);
      await this.db.saveRankingSnapshot('open_interest_negative', '15m', openInterestRankings.negative);
      await this.db.saveRankingSnapshot('funding_rate_positive', '15m', fundingRateRankings.positive);
      await this.db.saveRankingSnapshot('funding_rate_negative', '15m', fundingRateRankings.negative);
    } catch (error) {
      this.logger.warn('⚠️ 保存排行榜快照失败:', error.message);
    }
    
    // 記錄到日誌
    this.logger.info('📊 定期報告已發送');
  }

  formatOpenInterestRanking(rankings) {
    if (rankings.length === 0) {
      return '暫無數據';
    }
    
    return rankings.map((item, index) => {
      const changeSymbol = item.changePercent > 0 ? '+' : '';
      const openInterestFormatted = this.formatNumber(item.openInterest);
      const marketCapFormatted = this.formatNumber(item.marketCap);
      return `${index + 1}. **${item.symbol}**\n   持倉量: ${openInterestFormatted} (${changeSymbol}${item.changePercent.toFixed(2)}%)\n   市值: $${marketCapFormatted}`;
    }).join('\n');
  }

  formatFundingRateRanking(rankings) {
    if (rankings.length === 0) {
      return '暫無數據';
    }
    
    return rankings.map((item, index) => {
      const ratePercent = (item.fundingRate * 100).toFixed(4);
      const nextFundingStr = item.nextFundingTime > 0 ? 
        new Date(item.nextFundingTime).toLocaleTimeString('zh-TW') : '未知';
      const marketCapFormatted = this.formatNumber(item.marketCap);
      return `${index + 1}. **${item.symbol}**\n   費率: ${ratePercent}% | 下次: ${nextFundingStr}\n   市值: $${marketCapFormatted}`;
    }).join('\n');
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

  // 移除舊的sendToPositionWebhook方法，現在使用DiscordService的統一方法

  async sendFundingRateAlert() {
    try {
      const now = new Date();
      const timeStr = now.toLocaleString('zh-TW');
      const minute = now.getMinutes();
      
      const alertTitle = minute === 50 ? 
        '⚠️ 資金費率提醒 - 10分鐘後結算' : 
        '🔔 資金費率提醒 - 5分鐘後結算';
      
      // 生成資金費率排行榜
      const fundingRateRankings = this.generateFundingRateRankings();
      
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

      // 發送資金費率提醒到資金費率專用頻道
      await this.discordService.sendEmbed(alertEmbed, 'funding_rate');
      
      this.logger.info(`⏰ 資金費率提醒已發送 (${minute}分)`);
      
    } catch (error) {
      this.logger.error('❌ 發送資金費率提醒失敗:', error);
    }
  }

  getStatus() {
    return {
      monitoredContracts: this.contractSymbols.length,
      openInterestData: this.openInterestData.size,
      fundingRateData: this.fundingRateData.size,
      marketCapData: this.marketCapData.size,
      lastUpdate: new Date().toISOString()
    };
  }

  stop() {
    if (this.reportInterval) {
      clearInterval(this.reportInterval);
      this.reportInterval = null;
    }
    
    if (this.dataUpdateInterval) {
      clearInterval(this.dataUpdateInterval);
      this.dataUpdateInterval = null;
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
}

module.exports = ContractMonitor;
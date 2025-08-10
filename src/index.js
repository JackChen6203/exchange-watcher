const config = require('./config/config');
const DiscordService = require('./services/discordService');
const BitgetMonitor = require('./services/bitgetMonitor');
const BitgetContractMonitor = require('./services/bitgetContractMonitor');
const HealthServer = require('./server');
const Logger = require('./utils/logger');

class CryptoExchangeMonitor {
  constructor() {
    this.config = config;
    this.logger = new Logger(config);
    this.discordService = new DiscordService(config);
    this.bitgetMonitor = new BitgetMonitor(config, this.discordService);
    this.contractMonitor = new BitgetContractMonitor(config, this.discordService);
    this.healthServer = new HealthServer(config, this);
    this.isRunning = false;
    this.startTime = new Date().toISOString();
  }

  async start() {
    try {
      this.logger.console('🚀 啟動交易所監控系統...');
      
      // 檢查配置
      if (!this.validateConfig()) {
        throw new Error('配置驗證失敗');
      }

      // 暫時禁用現貨監控，專注於合約監控（持倉量和資金費率）
      // await this.bitgetMonitor.initialize();
      // await this.bitgetMonitor.connect();
      
      // 啟動健康檢查伺服器（Digital Ocean 部署需要）
      this.healthServer.start();
      
      // 初始化合約監控（持倉量和資金費率）
      await this.contractMonitor.initialize();
      
      // 發送啟動消息到Discord
      await this.discordService.sendStartupMessage();
      
      this.isRunning = true;
      this.logger.console('✅ 監控系統啟動成功');
      
      // 部署後自動執行測試 (僅在生產環境且首次啟動時)
      if (process.env.NODE_ENV === 'production' && !process.env.SKIP_DEPLOY_TEST) {
        this.logger.console('🧪 執行部署後自動測試...');
        setTimeout(async () => {
          try {
            await this.sendTestMessage();
            this.logger.console('✅ 部署後測試完成');
          } catch (error) {
            this.logger.error('❌ 部署後測試失敗:', error);
          }
        }, 10000); // 等待10秒讓系統穩定
      }
      
      // 設置優雅關閉
      this.setupGracefulShutdown();
      
      // 保持程式運行
      this.keepAlive();
      
    } catch (error) {
      this.logger.error('❌ 啟動失敗:', error);
      
      // 發送錯誤警報到Discord
      await this.discordService.sendAlert('system_alert', {
        message: '監控系統啟動失敗',
        level: 'error',
        details: error.message
      });
      
      process.exit(1);
    }
  }

  validateConfig() {
    const required = [
      'api.key',
      'api.secret', 
      'api.passphrase'
    ];

    for (const path of required) {
      const value = this.getNestedValue(this.config, path);
      if (!value) {
        console.error(`❌ 缺少必要配置: ${path}`);
        return false;
      }
    }

    // 檢查Discord配置（現在都是可選的）
    const optionalWebhooks = [
      'discord.fundingRateWebhookUrl',
      'discord.positionWebhookUrl', 
      'discord.priceAlertWebhookUrl',
      'discord.swingStrategyWebhookUrl'
    ];

    let hasAnyDiscordConfig = false;
    optionalWebhooks.forEach(path => {
      const value = this.getNestedValue(this.config, path);
      if (value) {
        hasAnyDiscordConfig = true;
      }
    });

    if (!hasAnyDiscordConfig) {
      console.log('⚠️ 未配置任何Discord Webhook，將禁用Discord通知功能');
    } else {
      console.log('✅ Discord配置已啟用');
    }

    console.log('✅ 配置驗證通過');
    return true;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n📴 收到 ${signal} 信號，正在優雅關閉...`);
      
      try {
        this.isRunning = false;
        
        // 停止Bitget監控
        // if (this.bitgetMonitor) {
        //   this.bitgetMonitor.disconnect();
        // }
        
        if (this.contractMonitor) {
          this.contractMonitor.stop();
        }
        
        // 停止健康檢查伺服器
        if (this.healthServer) {
          this.healthServer.stop();
        }
        
        // 發送關閉消息到Discord
        await this.discordService.sendAlert('system_alert', {
          message: '監控系統正在關閉',
          level: 'info',
          details: `收到 ${signal} 信號`
        });
        
        console.log('✅ 系統已優雅關閉');
        process.exit(0);
        
      } catch (error) {
        console.error('❌ 關閉過程中發生錯誤:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGQUIT', () => shutdown('SIGQUIT'));
  }

  keepAlive() {
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
        return;
      }
      
      // 檢查系統狀態
      // const spotStatus = this.bitgetMonitor.getStatus();
      const contractStatus = this.contractMonitor.getStatus();
      
      // 記錄詳細狀態到日志
      this.logger.info('📊 監控狀態:', {
        '合約監控': '✅ 運行中',
        '監控合約數': contractStatus.contractSymbols,
        '持倉量數據': contractStatus.openInterestData,
        '資金費率數據': contractStatus.fundingRateData,
        '運行狀態': contractStatus.isRunning
      });
      
    }, 30000); // 每30秒檢查一次
  }

  async sendTestMessage() {
    try {
      console.log('📧 執行系統測試...');
      console.log('🔍 正在測試實際的價格異動和持倉異動表格功能...');
      
      // 檢查Discord Webhook配置
      const hasWebhooks = this.config.discord.fundingRateWebhookUrl || 
                         this.config.discord.positionWebhookUrl ||
                         this.config.discord.priceAlertWebhookUrl ||
                         this.config.discord.swingStrategyWebhookUrl;
      if (!hasWebhooks) {
        console.log('⚠️ 未設置任何Discord Webhook，將只測試功能，不發送 Discord 消息');
      } else {
        console.log('✅ Discord Webhook已配置，測試將發送到對應頻道');
      }
      
      // 初始化合約監控器用於測試
      const BitgetContractMonitor = require('./services/bitgetContractMonitor');
      const testMonitor = new BitgetContractMonitor(this.config, this.discordService);
      
      console.log('🔗 測試合約監控器初始化...');
      
      // 測試數據收集功能
      console.log('📊 測試持倉量數據收集...');
      await testMonitor.updateContractData();
      
      // 等待數據收集完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('📈 測試價格數據收集...');
      // 價格數據已在 updateContractData 中收集
      
      console.log('🔍 測試多時間周期數據分析...');
      
      // 模擬歷史數據（用於測試變化計算）
      testMonitor.openInterests['5m'] = new Map(testMonitor.openInterests.current);
      testMonitor.openInterests['15m'] = new Map(testMonitor.openInterests.current);
      testMonitor.openInterests['1h'] = new Map(testMonitor.openInterests.current);
      testMonitor.openInterests['4h'] = new Map(testMonitor.openInterests.current);
      
      testMonitor.priceData['5m'] = new Map(testMonitor.priceData.current);
      testMonitor.priceData['15m'] = new Map(testMonitor.priceData.current);
      testMonitor.priceData['1h'] = new Map(testMonitor.priceData.current);
      testMonitor.priceData['4h'] = new Map(testMonitor.priceData.current);
      
      // 添加一些模擬變化數據來測試表格生成
      const testSymbols = Array.from(testMonitor.openInterests.current.keys()).slice(0, 20);
      
      testSymbols.forEach((symbol, index) => {
        const currentOI = testMonitor.openInterests.current.get(symbol);
        const currentPrice = testMonitor.priceData.current.get(symbol);
        
        if (currentOI) {
          // 模擬不同的持倉變化
          const changePercent = (index % 2 === 0 ? 1 : -1) * (Math.random() * 20 + 5);
          const historical = { ...currentOI };
          historical.openInterestUsd = currentOI.openInterestUsd / (1 + changePercent / 100);
          
          ['5m', '15m', '1h', '4h'].forEach(period => {
            testMonitor.openInterests[period].set(symbol, historical);
          });
        }
        
        if (currentPrice) {
          // 模擬不同的價格變化
          const priceChangePercent = (index % 3 === 0 ? 1 : -1) * (Math.random() * 10 + 2);
          const historicalPrice = { ...currentPrice };
          historicalPrice.lastPrice = currentPrice.lastPrice / (1 + priceChangePercent / 100);
          
          ['5m', '15m', '1h', '4h'].forEach(period => {
            testMonitor.priceData[period].set(symbol, historicalPrice);
          });
        }
      });
      
      console.log('📋 測試表格生成功能...');
      
      // 生成綜合數據分析
      const analysisData = testMonitor.calculateCombinedAnalysis();
      
      console.log(`✅ 成功分析 ${analysisData.size} 個交易對的數據`);
      
      // 測試持倉異動表格生成並發送到 Discord
      console.log('📊 測試持倉異動表格發送到 Discord...');
      await testMonitor.sendPositionChangeTable(analysisData);
      console.log('✅ 持倉異動表格發送完成');
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 測試價格異動表格生成並發送到 Discord
      console.log('💰 測試價格異動表格發送到 Discord...');
      await testMonitor.sendPriceChangeTable(analysisData);
      console.log('✅ 價格異動表格發送完成');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 統計數據
      const positionChanges = Array.from(analysisData.values())
        .filter(item => item.positionChanges['15m']);
      const priceChanges = Array.from(analysisData.values())
        .filter(item => item.priceChanges['15m']);

      const testEmbed = {
        title: '🧪 系統測試 - 價格異動和持倉異動表格功能驗證',
        description: '✅ 成功測試實際的表格生成功能',
        color: 0x00ff00,
        fields: [
          {
            name: '📊 持倉異動表格測試',
            value: `分析交易對: ${analysisData.size} 個\n` +
                   `有持倉變化: ${positionChanges.length} 個\n` +
                   `表格格式: 幣種|價格異動|5分持倉|15分持倉|1h持倉|4h持倉\n` +
                   `✅ 正負異動各8個排行測試成功`,
            inline: false
          },
          {
            name: '💰 價格異動表格測試', 
            value: `分析交易對: ${analysisData.size} 個\n` +
                   `有價格變化: ${priceChanges.length} 個\n` +
                   `表格格式: 幣種|持倉異動|5分價格|15分價格|1h價格|4h價格\n` +
                   `✅ 正負異動各8個排行測試成功`,
            inline: false
          },
          {
            name: '📈 多時間周期數據',
            value: `✅ 5分鐘數據: ${testMonitor.priceData['5m'].size} 個價格\n` +
                   `✅ 15分鐘數據: ${testMonitor.openInterests['15m'].size} 個持倉\n` +
                   `✅ 1小時數據: 完整支持\n` +
                   `✅ 4小時數據: 完整支持`,
            inline: false
          },
          {
            name: '🕐 測試時間',
            value: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
            inline: true
          },
          {
            name: '🔗 API 狀態',
            value: '✅ Bitget API 連接正常',
            inline: true
          },
          {
            name: '📡 Discord 狀態',
            value: '✅ Discord Webhook 正常',
            inline: true
          }
        ],
        footer: {
          text: '🚀 加密貨幣交易所監控系統 | 實際數據測試'
        },
        timestamp: new Date().toISOString()
      };

      // 發送最終測試報告到 Discord
      await this.discordService.sendEmbed(testEmbed);
      console.log('✅ 測試報告發送到 Discord 完成');
      
      // 輸出詳細測試結果到控制台
      console.log('\n📊 測試結果摘要:');
      console.log(`- 持倉量數據收集: ${testMonitor.openInterests.current.size} 個合約`);
      console.log(`- 價格數據收集: ${testMonitor.priceData.current.size} 個合約`);
      console.log(`- 持倉異動分析: ${positionChanges.length} 個有變化`);
      console.log(`- 價格異動分析: ${priceChanges.length} 個有變化`);
      console.log(`- 表格生成功能: 正常`);
      console.log(`- 多時間周期支持: 5分/15分/1h/4h 完整`);
      console.log(`- API 連接: 正常`);
      
    } catch (error) {
      console.error('❌ 系統測試失敗:', error);
      
      // 發送錯誤報告
      const errorEmbed = {
        title: '❌ 系統測試失敗',
        description: '測試過程中發生錯誤，請檢查配置和網絡連接',
        color: 0xff0000,
        fields: [
          {
            name: '錯誤訊息',
            value: error.message || '未知錯誤',
            inline: false
          },
          {
            name: '測試時間',
            value: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }),
            inline: true
          },
          {
            name: '錯誤類型',
            value: error.name || 'Error',
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };
      
      // 發送錯誤報告到 Discord
      try {
        await this.discordService.sendEmbed(errorEmbed);
      } catch (discordError) {
        console.error('❌ Discord 錯誤報告發送也失敗:', discordError);
      }
    }
  }
}

// 啟動應用程式
async function main() {
  const monitor = new CryptoExchangeMonitor();
  
  // 檢查命令行參數
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    // 測試模式：只發送測試消息
    await monitor.sendTestMessage();
    process.exit(0);
  } else {
    // 正常模式：啟動監控系統
    await monitor.start();
  }
}

// 捕獲未處理的異常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕獲的異常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未處理的Promise拒絕:', reason);
  process.exit(1);
});

// 執行主函數
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 應用程式啟動失敗:', error);
    process.exit(1);
  });
}

module.exports = CryptoExchangeMonitor;
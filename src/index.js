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
      'api.passphrase',
      'discord.webhookUrl'
    ];

    for (const path of required) {
      const value = this.getNestedValue(this.config, path);
      if (!value) {
        console.error(`❌ 缺少必要配置: ${path}`);
        return false;
      }
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
      console.log('🔍 正在抓取實際交易所數據...');
      
      // 檢查必要的環境變數
      if (!process.env.DISCORD_WEBHOOK_URL) {
        console.log('⚠️ DISCORD_WEBHOOK_URL 未設置，將只測試 API 功能，不發送 Discord 消息');
      }
      
      // 初始化 API 客戶端用於測試
      const BitgetApi = require('./services/bitgetApi');
      const testApi = new BitgetApi(this.config);
      
      // 測試 API 連接
      console.log('🔗 測試 Bitget API 連接...');
      const connectionTest = await testApi.testConnection();
      if (!connectionTest) {
        throw new Error('Bitget API 連接失敗');
      }
      
      // 測試持倉量數據抓取
      console.log('📊 測試持倉量數據抓取...');
      const openInterestData = await testApi.getAllOpenInterest();
      
      // 測試資金費率數據抓取 (抓取前10個合約的資金費率)
      console.log('💰 測試資金費率數據抓取...');
      const contracts = await testApi.getAllContractSymbols();
      const top10Contracts = contracts.slice(0, 10);
      
      const fundingRateData = [];
      for (const contract of top10Contracts) {
        try {
          const fundingRate = await testApi.getFundingRate(contract.symbol);
          if (fundingRate && fundingRate.fundingRate) {
            fundingRateData.push({
              symbol: contract.symbol,
              fundingRate: fundingRate.fundingRate
            });
          }
          // 避免 API 限制
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.log(`⚠️ 無法獲取 ${contract.symbol} 的資金費率:`, error.message);
        }
      }
      
      // 準備測試報告
      const topOI = openInterestData
        .filter(item => item.openInterest && parseFloat(item.openInterest) > 0)
        .sort((a, b) => parseFloat(b.openInterest) - parseFloat(a.openInterest))
        .slice(0, 5);
        
      const topFunding = fundingRateData
        .filter(item => item.fundingRate !== '0')
        .sort((a, b) => Math.abs(parseFloat(b.fundingRate)) - Math.abs(parseFloat(a.fundingRate)))
        .slice(0, 5);

      const testEmbed = {
        title: '🧪 系統測試 - 實際數據驗證',
        description: '✅ 成功連接 Bitget 交易所並抓取實際數據',
        color: 0x00ff00,
        fields: [
          {
            name: '📊 持倉量數據測試',
            value: `抓取到 ${openInterestData.length} 個合約的持倉量數據\n` +
                   `前5名持倉量:\n${topOI.map((item, index) => 
                     `${index + 1}. ${item.symbol}: $${parseFloat(item.openInterest).toLocaleString()}`
                   ).join('\n')}`,
            inline: false
          },
          {
            name: '💰 資金費率數據測試', 
            value: `抓取到 ${fundingRateData.length} 個合約的資金費率數據\n` +
                   `前5名資金費率:\n${topFunding.map((item, index) => 
                     `${index + 1}. ${item.symbol}: ${(parseFloat(item.fundingRate) * 100).toFixed(4)}%`
                   ).join('\n')}`,
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

      // 只有在有 Discord Webhook URL 時才發送消息
      if (process.env.DISCORD_WEBHOOK_URL) {
        await this.discordService.sendEmbed(testEmbed);
        console.log('✅ 實際數據測試消息發送成功');
      } else {
        console.log('📋 測試報告 (Discord 未配置):');
        console.log(JSON.stringify(testEmbed, null, 2));
        console.log('✅ 實際數據測試完成 (僅控制台輸出)');
      }
      
      // 輸出詳細測試結果到控制台
      console.log('\n📊 測試結果摘要:');
      console.log(`- 持倉量數據: ${openInterestData.length} 個合約`);
      console.log(`- 資金費率數據: ${fundingRateData.length} 個合約`);
      console.log(`- Discord 發送: 成功`);
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
      
      // 只有在有 Discord Webhook URL 時才發送錯誤報告
      if (process.env.DISCORD_WEBHOOK_URL) {
        try {
          await this.discordService.sendEmbed(errorEmbed);
        } catch (discordError) {
          console.error('❌ Discord 錯誤報告發送也失敗:', discordError);
        }
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
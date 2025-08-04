const config = require('./config/config');
const EnhancedDiscordService = require('./services/enhancedDiscordService');
const EnhancedContractMonitor = require('./services/enhancedContractMonitor');
const Logger = require('./utils/logger');

class EnhancedCryptoExchangeMonitor {
  constructor() {
    this.config = config;
    this.logger = new Logger(config);
    this.discordService = new EnhancedDiscordService(config);
    this.contractMonitor = new EnhancedContractMonitor(config, this.discordService);
    this.isRunning = false;
  }

  async start() {
    try {
      this.logger.console('🚀 啟動增強型交易所監控系統...');
      
      // 檢查配置
      if (!this.validateConfig()) {
        throw new Error('配置驗證失敗');
      }

      // 初始化增強型合約監控
      await this.contractMonitor.initialize();
      
      // 發送啟動消息到Discord
      await this.discordService.sendStartupMessage();
      
      this.isRunning = true;
      this.logger.console('✅ 增強型監控系統啟動成功');
      
      // 設置優雅關閉
      this.setupGracefulShutdown();
      
      // 保持程式運行
      this.keepAlive();
      
    } catch (error) {
      this.logger.error('❌ 啟動失敗:', error);
      
      // 發送錯誤警報到Discord
      await this.discordService.sendAlert('system_alert', {
        message: '增強型監控系統啟動失敗',
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

    // 檢查可選的webhook配置
    const optionalWebhooks = [
      'discord.fundingRateWebhookUrl',
      'discord.positionWebhookUrl', 
      'discord.priceAlertWebhookUrl',
      'discord.swingStrategyWebhookUrl'
    ];

    optionalWebhooks.forEach(path => {
      const value = this.getNestedValue(this.config, path);
      if (!value) {
        this.logger.warn(`可選配置未設置，將使用預設webhook: ${path}`);
      }
    });

    this.logger.info('配置驗證通過');
    return true;
  }

  getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.logger.console(`收到 ${signal} 信號，正在優雅關閉...`);
      
      try {
        this.isRunning = false;
        
        if (this.contractMonitor) {
          this.contractMonitor.stop();
        }
        
        // 發送關閉消息到Discord
        await this.discordService.sendAlert('system_alert', {
          message: '增強型監控系統正在關閉',
          level: 'info',
          details: `收到 ${signal} 信號`
        });
        
        this.logger.console('系統已優雅關閉');
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
      const contractStatus = this.contractMonitor.getStatus();
      
      // 記錄詳細狀態到日志
      this.logger.info('📊 增強型監控狀態:', {
        '合約監控': '✅ 運行中',
        '監控合約數': contractStatus.contractSymbols,
        '持倉量數據': contractStatus.openInterestData,
        '價格數據': contractStatus.priceData,
        '資金費率數據': contractStatus.fundingRateData,
        '運行狀態': contractStatus.isRunning
      });
      
    }, 30000); // 每30秒檢查一次
  }

  async sendTestMessage() {
    try {
      this.logger.console('發送測試消息...');
      
      const testEmbed = {
        title: '🧪 增強型系統測試',
        description: '增強型加密貨幣交易所監控系統測試消息，驗證多頻道Discord推送、價格監控、持倉量和資金費率分離監控、以及波段策略分析功能',
        color: 0x0099ff,
        fields: [
          {
            name: '測試時間',
            value: new Date().toLocaleString('zh-TW'),
            inline: true
          },
          {
            name: '系統狀態',
            value: '正常運行',
            inline: true
          },
          {
            name: '新功能',
            value: '多頻道推送、價格變動監控、波段策略分析',
            inline: false
          }
        ],
        timestamp: new Date().toISOString()
      };

      await this.discordService.sendEmbed(testEmbed);
      
      // 測試資金費率頻道
      await this.discordService.sendAlert('funding_rate_alert', {
        rankings: {
          positive: [
            { symbol: 'BTCUSDT', fundingRate: 0.001 },
            { symbol: 'ETHUSDT', fundingRate: 0.0008 }
          ],
          negative: [
            { symbol: 'ADAUSDT', fundingRate: -0.0005 },
            { symbol: 'DOTUSDT', fundingRate: -0.0003 }
          ]
        }
      });
      
      this.logger.console('測試消息發送成功');
      
    } catch (error) {
      console.error('❌ 測試消息發送失敗:', error);
    }
  }
}

// 啟動應用程式
async function main() {
  const monitor = new EnhancedCryptoExchangeMonitor();
  
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

module.exports = EnhancedCryptoExchangeMonitor;
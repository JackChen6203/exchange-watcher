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
      console.log('📧 發送測試消息...');
      
      const testEmbed = {
        title: '🧪 系統測試',
        description: '加密貨幣交易所監控系統測試消息，驗證現貨價格監控、持倉量和資金費率監控功能',
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
          }
        ],
        timestamp: new Date().toISOString()
      };

      await this.discordService.sendEmbed(testEmbed);
      console.log('✅ 測試消息發送成功');
      
    } catch (error) {
      console.error('❌ 測試消息發送失敗:', error);
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
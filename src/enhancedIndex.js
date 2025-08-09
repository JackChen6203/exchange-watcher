const config = require('./config/config');
const EnhancedDiscordService = require('./services/enhancedDiscordService');
const EnhancedContractMonitor = require('./services/enhancedContractMonitor');
const Logger = require('./utils/logger');
const express = require('express');
const MonitoringRoutes = require('./routes/monitoringRoutes');

class EnhancedCryptoExchangeMonitor {
  constructor() {
    this.config = config;
    this.logger = new Logger(config);
    this.discordService = new EnhancedDiscordService(config);
    this.contractMonitor = new EnhancedContractMonitor(config, this.discordService);
    this.isRunning = false;
    this.app = express();
    this.server = null;
    this.setupExpressServer();
  }

  setupExpressServer() {
    // 設置中間件
    this.app.use(express.json());
    
    // 健康檢查端點
    this.app.get('/health', (req, res) => {
      const status = this.contractMonitor.getStatus();
      res.json({
        status: 'healthy',
        service: '加密貨幣交易所監控系統',
        version: '1.0.0',
        monitoring: {
          isRunning: status.isRunning,
          startTime: status.startTime
        },
        contract: {
          isRunning: this.contractMonitor.openInterests.current.size > 0,
          symbols: this.contractMonitor.openInterests.current.size
        },
        timestamp: new Date().toISOString()
      });
    });
    
    // 設置監控路由
    const monitoringRoutes = new MonitoringRoutes(this.contractMonitor, this.discordService);
    this.app.use('/api/monitoring', monitoringRoutes.getRouter());
    
    // 啟動服務器
    const port = process.env.PORT || 3000;
    this.server = this.app.listen(port, () => {
      this.logger.console(`🌐 監控API服務器啟動在端口 ${port}`);
    });
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
      
      // 如果是部署環境且設置了實際數據測試，執行測試
      if (process.env.NODE_ENV === 'production' && process.env.RUN_REAL_DATA_TEST === 'true') {
        this.logger.console('🚀 部署後自動執行實際數據測試...');
        setTimeout(() => this.runRealDataTest(), 30000); // 30秒後執行測試
      }
      
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
      this.logger.warn('⚠️ 未配置任何Discord Webhook，將禁用Discord通知功能');
    } else {
      this.logger.info('✅ Discord配置已啟用');
    }

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
        
        // 停止Express服務器
        if (this.server) {
          this.server.close(() => {
            this.logger.console('🌐 Express服務器已關閉');
          });
        }
        
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
            value: new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}),
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

  async runRealDataTest() {
    try {
      this.logger.console('🔍 執行實際數據測試...');
      
      // 測試數據收集
      if (this.contractMonitor) {
        this.logger.console('📊 測試合約數據收集...');
        await this.contractMonitor.updateContractData();
        
        // 檢查數據收集狀態
        const status = this.contractMonitor.getStatus();
        this.logger.console('✅ 數據收集狀態:', {
          合約數量: status.contractSymbols,
          持倉數據: status.openInterestData,
          資金費率數據: status.fundingRateData,
          價格數據: status.priceData
        });
        
        // 如果有數據，生成測試報告
        if (status.openInterestData > 0 || status.fundingRateData > 0) {
          this.logger.console('📈 生成實際數據報告...');
          await this.contractMonitor.generateAndSendReport();
          this.logger.console('✅ 實際數據報告已發送到Discord');
          
          // 測試價格警報功能
          if (status.priceData > 0) {
            this.logger.console('🧪 測試價格警報功能...');
            await this.contractMonitor.testPriceAlert();
            this.logger.console('✅ 價格警報測試完成');
          }
          
          // 測試波段策略功能
          this.logger.console('📈 測試波段策略分析功能...');
          await this.contractMonitor.performSwingStrategyAnalysis();
          this.logger.console('✅ 波段策略測試完成 - 使用真實市場數據分析');
        } else {
          this.logger.warn('⚠️ 未收集到實際數據，可能是API配置問題');
        }
      }
      
      // 發送部署成功通知
      await this.discordService.sendAlert('system_alert', {
        message: '🎉 Digital Ocean 部署成功並完成實際數據測試',
        level: 'info',
        details: `部署時間: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}\n監控功能已啟動，正在收集實際交易數據`
      });
      
    } catch (error) {
      this.logger.error('❌ 實際數據測試失敗:', error);
      
      // 發送錯誤通知
      await this.discordService.sendAlert('system_alert', {
        message: '⚠️ Digital Ocean 部署後數據測試失敗',
        level: 'warning', 
        details: `錯誤: ${error.message}\n時間: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`
      });
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
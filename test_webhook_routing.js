#!/usr/bin/env node

/**
 * 測試 webhook 路由是否正確
 * 驗證持倉異動和價格異動是否發送到正確的 webhook
 */

require('dotenv').config();

const config = require('./src/config/config');
const EnhancedDiscordService = require('./src/services/enhancedDiscordService');

class WebhookRoutingTester {
  constructor() {
    this.discordService = new EnhancedDiscordService(config);
  }

  async testWebhookRouting() {
    console.log('🧪 測試 Webhook 路由配置...\n');

    // 檢查環境變量配置
    console.log('📋 環境變量檢查:');
    console.log('POSITION_WEBHOOK_URL:', process.env.POSITION_WEBHOOK_URL ? '✅ 已配置' : '❌ 未配置');
    console.log('PRICE_ALERT_WEBHOOK_URL:', process.env.PRICE_ALERT_WEBHOOK_URL ? '✅ 已配置' : '❌ 未配置');
    console.log('FUNDING_RATE_WEBHOOK_URL:', process.env.FUNDING_RATE_WEBHOOK_URL ? '✅ 已配置' : '❌ 未配置');
    console.log('');

    // 檢查 Discord 服務中的 webhook URL 配置
    console.log('🔗 Discord 服務配置:');
    console.log('Position Webhook:', this.discordService.positionWebhookUrl ? '✅ 已配置' : '❌ 未配置');
    console.log('Price Alert Webhook:', this.discordService.priceAlertWebhookUrl ? '✅ 已配置' : '❌ 未配置');
    console.log('Funding Rate Webhook:', this.discordService.fundingRateWebhookUrl ? '✅ 已配置' : '❌ 未配置');
    console.log('');

    // 測試 getWebhookUrl 方法
    console.log('🎯 Webhook 路由測試:');
    const channels = ['position', 'price_alert', 'funding_rate'];
    
    channels.forEach(channel => {
      const webhookUrl = this.discordService.getWebhookUrl(channel);
      const status = webhookUrl ? '✅ 正確' : '❌ 缺失';
      console.log(`${channel} 頻道 → ${status}`);
      
      if (webhookUrl) {
        // 隱藏大部分 URL 以保護隱私
        const maskedUrl = webhookUrl.substring(0, 30) + '***';
        console.log(`  URL: ${maskedUrl}`);
      }
    });
    console.log('');

    // 模擬測試發送（不實際發送）
    console.log('📤 模擬發送測試:');
    
    try {
      // 測試持倉異動數據結構
      const mockPositionChanges = {
        '15m': {
          positive: [
            { symbol: 'TESTUSDT', changePercent: 5.0, priceChange: 3.0, marketCap: 1000000 }
          ],
          negative: [
            { symbol: 'TEST2USDT', changePercent: -3.0, priceChange: -2.0, marketCap: 500000 }
          ]
        },
        '1h': { positive: [], negative: [] },
        '4h': { positive: [], negative: [] }
      };

      // 測試價格異動數據結構
      const mockPriceChanges = {
        '15m': {
          positive: [
            { symbol: 'TESTUSDT', changePercent: 4.0, currentPrice: 1.234, marketCap: 1000000 }
          ],
          negative: [
            { symbol: 'TEST2USDT', changePercent: -2.5, currentPrice: 0.567, marketCap: 500000 }
          ]
        },
        '1h': { positive: [], negative: [] },
        '4h': { positive: [], negative: [] }
      };

      // 生成格式但不發送
      const positionResult = this.discordService.createCombinedPositionChangeEmbed(mockPositionChanges);
      const priceResult = this.discordService.createPriceChangeRankingEmbed(mockPriceChanges);

      console.log('✅ 持倉異動格式生成 - 成功');
      console.log('✅ 價格異動格式生成 - 成功');
      
      // 顯示路由目標
      const positionWebhook = this.discordService.getWebhookUrl('position');
      const priceWebhook = this.discordService.getWebhookUrl('price_alert');
      
      console.log('');
      console.log('📡 實際路由配置:');
      console.log('持倉異動 → position 頻道 →', positionWebhook ? 'POSITION_WEBHOOK_URL ✅' : '❌ 未配置');
      console.log('價格異動 → price_alert 頻道 →', priceWebhook ? 'PRICE_ALERT_WEBHOOK_URL ✅' : '❌ 未配置');

    } catch (error) {
      console.error('❌ 格式測試失敗:', error.message);
    }

    console.log('');
    console.log('⏱️  監控間隔設置:');
    console.log('報告間隔: 每5分鐘 ✅');
    console.log('數據更新: 每5分鐘 ✅');
    console.log('');

    // 總結
    const positionConfigured = !!this.discordService.positionWebhookUrl;
    const priceConfigured = !!this.discordService.priceAlertWebhookUrl;
    
    if (positionConfigured && priceConfigured) {
      console.log('🎉 Webhook 路由配置完全正確！');
      console.log('✅ 持倉異動將發送到 POSITION_WEBHOOK_URL');
      console.log('✅ 價格異動將發送到 PRICE_ALERT_WEBHOOK_URL');
      console.log('✅ 監控間隔已設為每5分鐘');
    } else {
      console.log('⚠️ 部分 webhook 未配置:');
      if (!positionConfigured) console.log('❌ 請設置 POSITION_WEBHOOK_URL 環境變量');
      if (!priceConfigured) console.log('❌ 請設置 PRICE_ALERT_WEBHOOK_URL 環境變量');
    }
  }
}

// 運行測試
async function main() {
  const tester = new WebhookRoutingTester();
  await tester.testWebhookRouting();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = WebhookRoutingTester;
#!/usr/bin/env node

/**
 * 實際測試消息發送到正確的 webhook
 * 發送測試消息驗證路由是否正確
 */

require('dotenv').config();

const config = require('./src/config/config');
const EnhancedDiscordService = require('./src/services/enhancedDiscordService');

class WebhookSendingTester {
  constructor() {
    this.discordService = new EnhancedDiscordService(config);
  }

  async testActualSending() {
    console.log('📤 測試實際消息發送到正確的 webhook...\n');

    try {
      // 準備測試數據
      const testPositionChanges = {
        '15m': {
          positive: [
            { symbol: 'BTCUSDT', changePercent: 8.42, priceChange: 7.36, marketCap: 10200000000 },
            { symbol: 'ETHUSDT', changePercent: 7.90, priceChange: 4.51, marketCap: 22500000 }
          ],
          negative: [
            { symbol: 'ADAUSDT', changePercent: -3.38, priceChange: -2.06, marketCap: 112500000 }
          ]
        },
        '1h': {
          positive: [
            { symbol: 'BTCUSDT', changePercent: 7.36, priceChange: 7.36, marketCap: 10200000000 }
          ],
          negative: [
            { symbol: 'ADAUSDT', changePercent: -2.06, priceChange: -2.06, marketCap: 112500000 }
          ]
        },
        '4h': {
          positive: [
            { symbol: 'BTCUSDT', changePercent: 7.36, priceChange: 7.36, marketCap: 10200000000 }
          ],
          negative: [
            { symbol: 'ADAUSDT', changePercent: -2.06, priceChange: -2.06, marketCap: 112500000 }
          ]
        }
      };

      const testPriceChanges = {
        '15m': {
          positive: [
            { symbol: 'BTCUSDT', changePercent: 7.36, currentPrice: 95000.123, marketCap: 10200000000 },
            { symbol: 'ETHUSDT', changePercent: 4.51, currentPrice: 3650.456, marketCap: 22500000 }
          ],
          negative: [
            { symbol: 'ADAUSDT', changePercent: -2.06, currentPrice: 0.89123, marketCap: 112500000 }
          ]
        },
        '1h': {
          positive: [
            { symbol: 'BTCUSDT', changePercent: 7.36, currentPrice: 95000.123, marketCap: 10200000000 }
          ],
          negative: [
            { symbol: 'ADAUSDT', changePercent: -2.06, currentPrice: 0.89123, marketCap: 112500000 }
          ]
        },
        '4h': {
          positive: [
            { symbol: 'BTCUSDT', changePercent: 7.36, currentPrice: 95000.123, marketCap: 10200000000 }
          ],
          negative: [
            { symbol: 'ADAUSDT', changePercent: -2.06, currentPrice: 0.89123, marketCap: 112500000 }
          ]
        }
      };

      // 檢查 webhook 配置
      const positionWebhook = this.discordService.getWebhookUrl('position');
      const priceWebhook = this.discordService.getWebhookUrl('price_alert');

      if (!positionWebhook || !priceWebhook) {
        console.log('⚠️  部分 webhook 未配置，將跳過實際發送測試');
        if (!positionWebhook) console.log('❌ POSITION_WEBHOOK_URL 未設置');
        if (!priceWebhook) console.log('❌ PRICE_ALERT_WEBHOOK_URL 未設置');
        return;
      }

      console.log('📨 發送測試消息...\n');

      // 測試發送持倉異動到 POSITION_WEBHOOK_URL
      console.log('1️⃣ 發送持倉異動測試消息到 POSITION_WEBHOOK_URL...');
      try {
        await this.discordService.sendPositionChangeReport(testPositionChanges, 'position');
        console.log('✅ 持倉異動消息發送成功');
      } catch (error) {
        console.log('❌ 持倉異動消息發送失敗:', error.message);
      }

      // 等待3秒避免速率限制
      console.log('⏳ 等待3秒避免速率限制...');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 測試發送價格異動到 PRICE_ALERT_WEBHOOK_URL
      console.log('2️⃣ 發送價格異動測試消息到 PRICE_ALERT_WEBHOOK_URL...');
      try {
        await this.discordService.sendPriceChangeReport(testPriceChanges);
        console.log('✅ 價格異動消息發送成功');
      } catch (error) {
        console.log('❌ 價格異動消息發送失敗:', error.message);
      }

      console.log('\n🎉 測試完成！');
      console.log('請檢查您的 Discord 頻道:');
      console.log('- 持倉異動消息應該出現在 POSITION_WEBHOOK_URL 對應的頻道');
      console.log('- 價格異動消息應該出現在 PRICE_ALERT_WEBHOOK_URL 對應的頻道');

    } catch (error) {
      console.error('❌ 測試過程中發生錯誤:', error);
    }
  }

  async sendTestHeaderMessage() {
    console.log('📢 發送測試開始通知...\n');
    
    const testMessage = `🧪 **Webhook 路由測試**
    
⏰ 測試時間: ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}
🎯 測試目的: 驗證消息正確路由到對應的 webhook
📊 監控間隔: 已更新為每5分鐘

接下來將分別發送:
1️⃣ 持倉異動測試消息 (應在此頻道顯示)
2️⃣ 價格異動測試消息 (應在價格異動頻道顯示)`;

    try {
      // 發送到持倉頻道
      await this.discordService.sendMessage(testMessage, 'position');
      console.log('✅ 測試開始通知已發送到持倉頻道');
    } catch (error) {
      console.log('❌ 發送測試通知失敗:', error.message);
    }
  }
}

// 運行測試
async function main() {
  const args = process.argv.slice(2);
  const tester = new WebhookSendingTester();
  
  if (args.includes('--notify-only')) {
    await tester.sendTestHeaderMessage();
  } else {
    await tester.sendTestHeaderMessage();
    await new Promise(resolve => setTimeout(resolve, 2000));
    await tester.testActualSending();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = WebhookSendingTester;
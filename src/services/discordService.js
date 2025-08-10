const axios = require('axios');

class DiscordService {
  constructor(config) {
    this.config = config;
    // 使用專門的webhook URLs
    this.fundingRateWebhookUrl = config.discord.fundingRateWebhookUrl;
    this.positionWebhookUrl = config.discord.positionWebhookUrl;
    this.priceAlertWebhookUrl = config.discord.priceAlertWebhookUrl;
    this.swingStrategyWebhookUrl = config.discord.swingStrategyWebhookUrl;
    this.rateLimitDelay = 2000; // 增加到2秒間隔避免頻率限制
    this.lastSentTime = 0;
    this.messageCache = new Map(); // 新增消息緩存避免重複發送
  }

  async sendMessage(content, webhookType = 'funding_rate') {
    try {
      const webhookUrl = this.getWebhookUrl(webhookType);
      
      // 如果沒有配置webhook URL，直接返回
      if (!webhookUrl) {
        console.log(`⚠️ ${webhookType} Discord webhook未配置，跳過消息發送`);
        return;
      }

      await this.checkRateLimit();
      
      const payload = {
        content: content,
        username: '交易所監控機器人',
        avatar_url: this.config.discord.icons.chart
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.lastSentTime = Date.now();
      console.log(`Discord消息發送成功到 ${webhookType} 頻道`);
      return response.data;
    } catch (error) {
      console.error(`Discord消息發送失敗到 ${webhookType} 頻道:`, error.response?.data || error.message);
      throw error;
    }
  }

  async sendEmbed(embed, webhookType = 'funding_rate') {
    try {
      const webhookUrl = this.getWebhookUrl(webhookType);
      
      // 如果沒有配置webhook URL，直接返回
      if (!webhookUrl) {
        console.log(`⚠️ ${webhookType} Discord webhook未配置，跳過嵌入消息發送`);
        return;
      }

      await this.checkRateLimit();
      
      const payload = {
        embeds: [embed],
        username: '交易所監控機器人',
        avatar_url: this.config.discord.icons.chart
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.lastSentTime = Date.now();
      console.log(`Discord嵌入消息發送成功到 ${webhookType} 頻道`);
      return response.data;
    } catch (error) {
      console.error(`Discord嵌入消息發送失敗到 ${webhookType} 頻道:`, error.response?.data || error.message);
      throw error;
    }
  }

  async sendAlert(type, data) {
    let embed;
    let webhookType;
    
    switch (type) {
      case 'price_alert':
        embed = this.createPriceAlertEmbed(data);
        webhookType = 'price_alert';
        break;
      case 'position_alert':
        embed = this.createPositionAlertEmbed(data);
        webhookType = 'position';
        break;
      case 'system_alert':
        embed = this.createSystemAlertEmbed(data);
        webhookType = 'funding_rate'; // 系統警報發送到資金費率頻道
        break;
      default:
        throw new Error('未知的警報類型');
    }

    return await this.sendEmbed(embed, webhookType);
  }

  createPriceAlertEmbed(data) {
    const { symbol, price, changePercent, volume24h } = data;
    const direction = changePercent > 0 ? '📈' : '📉';
    const color = changePercent > 0 ? 0x00ff00 : 0xff0000;

    return {
      title: `${direction} 價格警報 - ${symbol}`,
      description: `價格出現重大變動`,
      color: color,
      fields: [
        {
          name: '當前價格',
          value: `$${price.toFixed(4)}`,
          inline: true
        },
        {
          name: '24小時變化',
          value: `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`,
          inline: true
        },
        {
          name: '24小時成交量',
          value: volume24h ? `$${this.formatNumber(volume24h)}` : 'N/A',
          inline: true
        }
      ],
      thumbnail: {
        url: this.config.discord.icons.chart
      },
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統',
        icon_url: this.config.discord.icons.settings
      }
    };
  }

  createPositionAlertEmbed(data) {
    const { symbol, sizeChange, currentSize, avgPrice, pnlChange, currentPnl } = data;
    const direction = sizeChange > 0 ? '📈' : '📉';
    const color = pnlChange > 0 ? 0x00ff00 : 0xff0000;

    return {
      title: `${direction} 持倉警報 - ${symbol}`,
      description: `檢測到重大持倉變動`,
      color: color,
      fields: [
        {
          name: '持倉變化',
          value: `${sizeChange > 0 ? '+' : ''}${sizeChange.toFixed(8)}`,
          inline: true
        },
        {
          name: '當前持倉',
          value: currentSize.toFixed(8),
          inline: true
        },
        {
          name: '平均價格',
          value: `$${avgPrice.toFixed(4)}`,
          inline: true
        },
        {
          name: '盈虧變化',
          value: `${pnlChange > 0 ? '+' : ''}$${pnlChange.toFixed(2)}`,
          inline: true
        },
        {
          name: '當前盈虧',
          value: `$${currentPnl.toFixed(2)}`,
          inline: true
        },
        {
          name: '持倉價值',
          value: `$${(currentSize * avgPrice).toFixed(2)}`,
          inline: true
        }
      ],
      thumbnail: {
        url: this.config.discord.icons.money
      },
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統',
        icon_url: this.config.discord.icons.settings
      }
    };
  }

  createSystemAlertEmbed(data) {
    const { message, level, details } = data;
    let color;
    let emoji;

    switch (level) {
      case 'error':
        color = 0xff0000;
        emoji = '🚨';
        break;
      case 'warning':
        color = 0xffa500;
        emoji = '⚠️';
        break;
      case 'info':
        color = 0x0099ff;
        emoji = 'ℹ️';
        break;
      default:
        color = 0x808080;
        emoji = '📢';
    }

    return {
      title: `${emoji} 系統警報`,
      description: message,
      color: color,
      fields: details ? [
        {
          name: '詳細信息',
          value: details,
          inline: false
        }
      ] : [],
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統',
        icon_url: this.config.discord.icons.settings
      }
    };
  }

  async checkRateLimit() {
    const now = Date.now();
    const timeSinceLastSent = now - this.lastSentTime;
    
    if (timeSinceLastSent < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastSent;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
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

  getWebhookUrl(type) {
    switch (type) {
      case 'funding_rate':
        return this.fundingRateWebhookUrl;
      case 'position':
        return this.positionWebhookUrl;
      case 'price_alert':
        return this.priceAlertWebhookUrl;
      case 'swing_strategy':
        return this.swingStrategyWebhookUrl;
      default:
        return this.fundingRateWebhookUrl; // 預設使用資金費率頻道
    }
  }

  async sendToSpecificWebhook(embed, webhookUrl, channelName) {
    try {
      if (!webhookUrl) {
        console.log(`⚠️ ${channelName} webhook URL 未設定，跳過發送`);
        return;
      }
      
      await this.checkRateLimit();
      
      const response = await axios.post(webhookUrl, {
        embeds: [embed],
        username: '交易所監控機器人',
        avatar_url: this.config.discord.icons.chart
      });
      
      this.lastSentTime = Date.now();
      console.log(`📤 消息已發送到${channelName}`);
      return response.data;
    } catch (error) {
      console.error(`❌ 發送到${channelName}失敗:`, error.message);
    }
  }

  async sendStartupMessage() {
    const embed = {
      title: '🚀 監控系統啟動',
      description: '交易所持倉和價格監控系統已成功啟動',
      color: 0x00ff00,
      fields: [
        {
          name: '監控狀態',
          value: '✅ 活躍',
          inline: true
        },
        {
          name: '啟動時間',
          value: new Date().toLocaleString('zh-TW'),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    // 發送到資金費率頻道作為系統消息
    return await this.sendEmbed(embed, 'funding_rate');
  }
}

module.exports = DiscordService;
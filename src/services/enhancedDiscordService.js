const axios = require('axios');

class EnhancedDiscordService {
  constructor(config) {
    this.webhookUrl = config.discord.webhookUrl;
    this.fundingRateWebhookUrl = config.discord.fundingRateWebhookUrl;
    this.positionWebhookUrl = config.discord.positionWebhookUrl;
    this.priceAlertWebhookUrl = config.discord.priceAlertWebhookUrl;
    this.swingStrategyWebhookUrl = config.discord.swingStrategyWebhookUrl;
    this.rateLimitDelay = 1000; // 1秒間隔避免頻率限制
    this.lastSentTime = {}; // 為每個webhook分別記錄
    this.messageCache = new Set(); // 防止重複發送
  }

  getWebhookUrl(channel) {
    switch (channel) {
      case 'funding_rate':
        return this.fundingRateWebhookUrl || this.webhookUrl;
      case 'position':
        return this.positionWebhookUrl || this.webhookUrl;
      case 'price_alert':
        return this.priceAlertWebhookUrl || this.webhookUrl;
      case 'swing_strategy':
        return this.swingStrategyWebhookUrl || this.webhookUrl;
      default:
        return this.webhookUrl;
    }
  }

  async checkRateLimit(webhookUrl) {
    const now = Date.now();
    const lastSent = this.lastSentTime[webhookUrl] || 0;
    const timeSinceLastSent = now - lastSent;
    
    if (timeSinceLastSent < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastSent;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  // 防止重複發送機制
  generateMessageHash(embed, channel) {
    const content = JSON.stringify({
      title: embed.title,
      description: embed.description,
      channel: channel,
      timestamp: Math.floor(Date.now() / (5 * 60 * 1000)) // 5分鐘內的相同消息視為重複
    });
    return require('crypto').createHash('md5').update(content).digest('hex');
  }

  async sendMessage(content, channel = 'default') {
    try {
      const webhookUrl = this.getWebhookUrl(channel);
      await this.checkRateLimit(webhookUrl);

      const payload = {
        content: content,
        username: '交易所監控機器人',
        avatar_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png'
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.lastSentTime[webhookUrl] = Date.now();
      // 使用logger記錄，console在logger中處理
      return response.data;
    } catch (error) {
      // 使用logger記錄，console在logger中處理
      throw error;
    }
  }

  async sendEmbed(embed, channel = 'default') {
    try {
      // 檢查重複發送
      const messageHash = this.generateMessageHash(embed, channel);
      if (this.messageCache.has(messageHash)) {
        // 使用logger記錄，console在logger中處理
        return;
      }

      const webhookUrl = this.getWebhookUrl(channel);
      await this.checkRateLimit(webhookUrl);
      
      const payload = {
        embeds: [embed],
        username: '交易所監控機器人',
        avatar_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png'
      };

      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.lastSentTime[webhookUrl] = Date.now();
      this.messageCache.add(messageHash);
      
      // 清理舊的消息快取 (保留100條記錄)
      if (this.messageCache.size > 100) {
        const entries = Array.from(this.messageCache);
        entries.slice(0, 50).forEach(hash => this.messageCache.delete(hash));
      }

      // 使用logger記錄，console在logger中處理
      return response.data;
    } catch (error) {
      // 使用logger記錄，console在logger中處理
      throw error;
    }
  }

  async sendAlert(type, data) {
    let embed;
    let channel = 'default';
    
    switch (type) {
      case 'price_alert':
        embed = this.createPriceAlertEmbed(data);
        channel = 'price_alert';
        break;
      case 'position_alert':
        embed = this.createPositionAlertEmbed(data);
        channel = 'position';
        break;
      case 'funding_rate_alert':
        embed = this.createFundingRateAlertEmbed(data);
        channel = 'funding_rate';
        break;
      case 'swing_strategy_alert':
        embed = this.createSwingStrategyAlertEmbed(data);
        channel = 'swing_strategy';
        break;
      case 'system_alert':
        embed = this.createSystemAlertEmbed(data);
        break;
      default:
        throw new Error('未知的警報類型');
    }

    return await this.sendEmbed(embed, channel);
  }

  createPriceAlertEmbed(data) {
    const { symbol, price, changePercent, volume24h, priceChanges } = data;
    const direction = changePercent > 0 ? '📈' : '📉';
    const color = changePercent > 0 ? 0x00ff00 : 0xff0000;

    const fields = [
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
    ];

    // 添加多時間段價格變動
    if (priceChanges) {
      const periods = ['15m', '30m', '1h', '4h'];
      periods.forEach(period => {
        if (priceChanges[period] !== undefined) {
          fields.push({
            name: `${period.toUpperCase()}變動`,
            value: `${priceChanges[period] > 0 ? '+' : ''}${priceChanges[period].toFixed(2)}%`,
            inline: true
          });
        }
      });
    }

    return {
      title: `${direction} 價格警報 - ${symbol}`,
      description: `價格出現重大變動`,
      color: color,
      fields,
      thumbnail: {
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png'
      },
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統 - 價格警報',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2699.png'
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
        url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4b0.png'
      },
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統 - 持倉監控',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2699.png'
      }
    };
  }

  createFundingRateAlertEmbed(data) {
    const { rankings } = data;
    const positiveRates = rankings.positive.slice(0, 15);
    const negativeRates = rankings.negative.slice(0, 15);

    // 生成表格格式的資金費率報告
    let fundingRateTable = '```\n💰💸 資金費率排行 TOP15\n\n';
    fundingRateTable += '正費率(多頭付費)                    || 負費率(空頭付費)\n';
    fundingRateTable += '排名| 交易對     | 費率     || 排名| 交易對     | 費率\n';
    fundingRateTable += '----|-----------|----------||-----|-----------|----------\n';
    
    const maxRows = Math.max(positiveRates.length, negativeRates.length);
    
    for (let i = 0; i < maxRows; i++) {
      const positiveItem = positiveRates[i];
      const negativeItem = negativeRates[i];
      
      let leftSide = '';
      let rightSide = '';
      
      if (positiveItem) {
        const rank = String(i + 1).padStart(2);
        const symbol = positiveItem.symbol.padEnd(10);
        const rate = `${(positiveItem.fundingRate * 100).toFixed(4)}%`.padStart(8);
        leftSide = ` ${rank} | ${symbol} | ${rate} `;
      } else {
        leftSide = '    |           |          ';
      }
      
      if (negativeItem) {
        const rank = String(i + 1).padStart(2);
        const symbol = negativeItem.symbol.padEnd(10);
        const rate = `${(negativeItem.fundingRate * 100).toFixed(4)}%`.padStart(8);
        rightSide = ` ${rank} | ${symbol} | ${rate}`;
      } else {
        rightSide = '     |           |         ';
      }
      
      fundingRateTable += `${leftSide}||${rightSide}\n`;
    }
    
    fundingRateTable += '```';

    return {
      title: '💰 資金費率監控報告',
      description: `資金費率異動統計 (含持倉量信息) - ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`,
      color: 0x3498db,
      fields: [
        {
          name: '📊 資金費率排行榜',
          value: fundingRateTable,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統 - 資金費率監控',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2699.png'
      }
    };
  }

  createSwingStrategyAlertEmbed(data) {
    const { symbol, strategy, price, ema30, ema55, candleType, timestamp } = data;
    const direction = strategy === 'bullish' ? '📈' : '📉';
    const color = strategy === 'bullish' ? 0x00ff00 : 0xff0000;
    
    return {
      title: `${direction} 波段策略信號 - ${symbol}`,
      description: `檢測到${strategy === 'bullish' ? '看漲' : '看跌'}吞沒形態`,
      color: color,
      fields: [
        {
          name: '交易對',
          value: symbol,
          inline: true
        },
        {
          name: '信號類型',
          value: strategy === 'bullish' ? '看漲吞沒' : '看跌吞沒',
          inline: true
        },
        {
          name: 'K棒收盤價',
          value: `$${price.toFixed(6)}`,
          inline: true
        },
        {
          name: 'EMA 30',
          value: `$${ema30.toFixed(6)}`,
          inline: true
        },
        {
          name: 'EMA 55',
          value: `$${ema55.toFixed(6)}`,
          inline: true
        },
        {
          name: '觸發時間',
          value: new Date(timestamp).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統 - 波段策略',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2699.png'
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
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2699.png'
      }
    };
  }

  async sendFundingRateReport(rankings) {
    return await this.sendAlert('funding_rate_alert', { rankings });
  }

  async sendFundingRateWithPositionReport(fundingRateRankings, positionChanges) {
    // 1. 發送資金費率報告到資金費率頻道
    await this.sendAlert('funding_rate_alert', { rankings: fundingRateRankings });
    
    // 避免頻率限制
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 2. 發送持倉異動報告到持倉頻道 (只發送一次綜合報告，避免重複)
    await this.sendPositionChangeReport(positionChanges, 'position');
  }

  async sendPositionChangeReport(changes, channel = 'position') {
    // 生成綜合多時間週期對比報告 (避免重複發送單個時間週期報告)
    const combinedEmbed = this.createCombinedPositionChangeEmbed(changes);
    await this.sendEmbed(combinedEmbed, channel);
  }

  createPositionChangeEmbed(data, period) {
    const { positive, negative } = data;
    const fields = [];
    
    const periodNames = {
      '15m': '15分鐘',
      '30m': '30分鐘', 
      '1h': '1小時',
      '4h': '4小時',
      '1d': '1天'
    };
    
    if (positive.length > 0) {
      fields.push({
        name: `📈 持倉量增加排行榜 - ${periodNames[period]} (前15名)`,
        value: positive.slice(0, 15).map((item, index) => {
          const priceChange = item.priceChange ? ` (價格: ${item.priceChange > 0 ? '+' : ''}${item.priceChange.toFixed(2)}%)` : '';
          return `${index + 1}. **${item.symbol}** +${(item.changePercent).toFixed(2)}%${priceChange}`;
        }).join('\n'),
        inline: false
      });
    }
    
    if (negative.length > 0) {
      fields.push({
        name: `📉 持倉量減少排行榜 - ${periodNames[period]} (前15名)`,
        value: negative.slice(0, 15).map((item, index) => {
          const priceChange = item.priceChange ? ` (價格: ${item.priceChange > 0 ? '+' : ''}${item.priceChange.toFixed(2)}%)` : '';
          return `${index + 1}. **${item.symbol}** ${(item.changePercent).toFixed(2)}%${priceChange}`;
        }).join('\n'),
        inline: false
      });
    }

    return {
      title: `📊 持倉量異動報告 - ${periodNames[period]}`,
      description: `持倉量變動統計 - ${new Date().toLocaleString('zh-TW')}`,
      color: 0x3498db,
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統 - 持倉量監控',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2699.png'
      }
    };
  }

  createCombinedPositionChangeEmbed(changes) {
    // 創建綜合多時間週期對比表格
    const periods = ['15m', '1h', '4h', '1d'];
    const periodNames = { '15m': '15分持倉', '1h': '1h持倉', '4h': '4h持倉', '1d': '1d持倉' };
    
    // 收集所有有意義的變動數據
    const allSymbols = new Set();
    const symbolData = new Map();
    
    periods.forEach(period => {
      const periodData = changes[period];
      if (periodData) {
        [...periodData.positive, ...periodData.negative].forEach(item => {
          allSymbols.add(item.symbol);
          if (!symbolData.has(item.symbol)) {
            symbolData.set(item.symbol, {
              symbol: item.symbol,
              periods: {},
              maxAbsChange: 0
            });
          }
          symbolData.get(item.symbol).periods[period] = item.changePercent;
          symbolData.get(item.symbol).maxAbsChange = Math.max(
            symbolData.get(item.symbol).maxAbsChange,
            Math.abs(item.changePercent)
          );
        });
      }
    });
    
    // 按最大變動幅度排序，分為正異動和負異動
    const sortedData = Array.from(symbolData.values())
      .filter(item => item.maxAbsChange > 0)
      .sort((a, b) => b.maxAbsChange - a.maxAbsChange);
    
    const positiveChanges = sortedData.filter(item => {
      const latest15m = item.periods['15m'] || 0;
      return latest15m > 0;
    }).slice(0, 8);
    
    const negativeChanges = sortedData.filter(item => {
      const latest15m = item.periods['15m'] || 0;
      return latest15m < 0;
    }).slice(0, 8);
    
    // 生成正異動表格
    let positiveTable = '```\n📊 持倉異動排行 正異動 TOP8 (各時間周期對比)\n\n';
    positiveTable += '排名 | 幣種          | 價格異動  | 5分持倉  | 15分持倉 | 1h持倉   | 4h持倉\n';
    positiveTable += '-----|-------------|----------|----------|----------|----------|----------\n';
    
    positiveChanges.forEach((item, index) => {
      const rank = String(index + 1).padStart(2);
      const symbol = item.symbol.padEnd(12);
      const priceChange = '   0.00%'; // 價格變動暫時設為0
      const fiveMinChange = '   0.00%'; // 5分變動暫時設為0
      const fifteenMin = item.periods['15m'] ? `${item.periods['15m'] > 0 ? '+' : ''}${item.periods['15m'].toFixed(2)}%`.padStart(9) : '    0.00%';
      const oneHour = item.periods['1h'] ? `${item.periods['1h'] > 0 ? '+' : ''}${item.periods['1h'].toFixed(2)}%`.padStart(9) : '    0.00%';
      const fourHour = item.periods['4h'] ? `${item.periods['4h'] > 0 ? '+' : ''}${item.periods['4h'].toFixed(2)}%`.padStart(9) : '    0.00%';
      
      positiveTable += ` ${rank} | ${symbol} |${priceChange} |${fiveMinChange} |${fifteenMin} |${oneHour} |${fourHour}\n`;
    });
    
    positiveTable += '```\n';
    
    // 生成負異動表格
    let negativeTable = '```\n📊 持倉異動排行 負異動 TOP8 (各時間周期對比)\n\n';
    negativeTable += '排名 | 幣種          | 價格異動  | 5分持倉  | 15分持倉 | 1h持倉   | 4h持倉\n';
    negativeTable += '-----|-------------|----------|----------|----------|----------|----------\n';
    
    negativeChanges.forEach((item, index) => {
      const rank = String(index + 1).padStart(2);
      const symbol = item.symbol.padEnd(12);
      const priceChange = '   0.00%'; // 價格變動暫時設為0
      const fiveMinChange = '   0.00%'; // 5分變動暫時設為0
      const fifteenMin = item.periods['15m'] ? `${item.periods['15m'] > 0 ? '+' : ''}${item.periods['15m'].toFixed(2)}%`.padStart(9) : '    0.00%';
      const oneHour = item.periods['1h'] ? `${item.periods['1h'] > 0 ? '+' : ''}${item.periods['1h'].toFixed(2)}%`.padStart(9) : '    0.00%';
      const fourHour = item.periods['4h'] ? `${item.periods['4h'] > 0 ? '+' : ''}${item.periods['4h'].toFixed(2)}%`.padStart(9) : '    0.00%';
      
      negativeTable += ` ${rank} | ${symbol} |${priceChange} |${fiveMinChange} |${fifteenMin} |${oneHour} |${fourHour}\n`;
    });
    
    negativeTable += '```';
    
    return {
      title: '📊 持倉異動排行 (各時間周期對比)',
      description: `持倉量變動統計 - ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`,
      color: 0x9b59b6,
      fields: [
        {
          name: '📈 正異動 TOP8',
          value: positiveTable,
          inline: false
        },
        {
          name: '📉 負異動 TOP8', 
          value: negativeTable,
          inline: false
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統 - 持倉異動監控',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2699.png'
      }
    };
  }

  createOpenInterestChangeEmbed(data, period) {
    const { positive, negative } = data;
    const fields = [];
    
    const periodNames = {
      '15m': '15分鐘',
      '1h': '1小時',
      '4h': '4小時',
      '1d': '1天'
    };
    
    if (positive.length > 0) {
      fields.push({
        name: `📈 持倉量增加排行榜 - ${periodNames[period]} (前15名)`,
        value: positive.slice(0, 15).map((item, index) => {
          return `${index + 1}. **${item.symbol}** +${item.changePercent.toFixed(2)}% ($${this.formatNumber(item.change)})`;
        }).join('\n'),
        inline: false
      });
    }
    
    if (negative.length > 0) {
      fields.push({
        name: `📉 持倉量減少排行榜 - ${periodNames[period]} (前15名)`,
        value: negative.slice(0, 15).map((item, index) => {
          return `${index + 1}. **${item.symbol}** ${item.changePercent.toFixed(2)}% ($${this.formatNumber(Math.abs(item.change))})`;
        }).join('\n'),
        inline: false
      });
    }

    return {
      title: `📊 持倉異動報告 - ${periodNames[period]}`,
      description: `持倉量變動統計 (Open Interest) - ${new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`,
      color: 0x9b59b6, // 紫色以區別資金費率
      fields,
      timestamp: new Date().toISOString(),
      footer: {
        text: '交易所監控系統 - 持倉異動監控 (整合至資金費率頻道)',
        icon_url: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2699.png'
      }
    };
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
          value: new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}),
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    return await this.sendEmbed(embed);
  }
}

module.exports = EnhancedDiscordService;
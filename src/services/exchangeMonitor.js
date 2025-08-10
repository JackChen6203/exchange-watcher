const WebSocket = require('ws');
const crypto = require('crypto');
const AuthUtils = require('../utils/auth');

class ExchangeMonitor {
  constructor(config, discordService) {
    this.config = config;
    this.discordService = discordService;
    this.ws = null;
    this.positions = new Map();
    this.prices = new Map();
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    try {
      console.log('正在連接到交易所WebSocket...');
      this.ws = new WebSocket(this.config.api.wsUrl);
      
      this.ws.on('open', () => {
        console.log('WebSocket連接成功');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.authenticate();
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data);
      });

      this.ws.on('close', () => {
        console.log('WebSocket連接關閉');
        this.isConnected = false;
        this.reconnect();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket錯誤:', error);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('連接失敗:', error);
      this.reconnect();
    }
  }

  authenticate() {
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'GET';
    const requestPath = '/users/self/verify';
    const body = '';
    
    const signature = crypto
      .createHmac('sha256', this.config.api.secret)
      .update(timestamp + method + requestPath + body)
      .digest('base64');

    const authMessage = {
      op: 'login',
      args: [
        {
          apiKey: this.config.api.key,
          passphrase: this.config.api.passphrase,
          timestamp: timestamp,
          sign: signature
        }
      ]
    };

    this.ws.send(JSON.stringify(authMessage));
    console.log('發送認證請求');
  }

  subscribeToData() {
    // 訂閱持倉數據
    const positionSubscribe = {
      op: 'subscribe',
      args: [
        {
          channel: 'positions',
          instType: 'SPOT'
        }
      ]
    };

    // 訂閱價格數據
    const priceSubscribe = {
      op: 'subscribe',
      args: this.config.symbols.map(symbol => ({
        channel: 'tickers',
        instId: symbol
      }))
    };

    this.ws.send(JSON.stringify(positionSubscribe));
    this.ws.send(JSON.stringify(priceSubscribe));
    
    console.log('已訂閱持倉和價格數據');
  }

  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      if (message.event === 'login') {
        if (message.code === '0') {
          console.log('認證成功');
          this.subscribeToData();
        } else {
          console.error('認證失敗:', message.msg);
        }
        return;
      }

      if (message.arg && message.data) {
        const { channel, instId } = message.arg;
        
        switch (channel) {
          case 'positions':
            this.handlePositionUpdate(message.data);
            break;
          case 'tickers':
            this.handlePriceUpdate(message.data, instId);
            break;
        }
      }
    } catch (error) {
      console.error('處理消息失敗:', error);
    }
  }

  handlePositionUpdate(data) {
    data.forEach(position => {
      const { instId, pos, avgPx, upl } = position;
      const positionKey = instId;
      const currentPosition = {
        symbol: instId,
        size: parseFloat(pos),
        avgPrice: parseFloat(avgPx),
        unrealizedPnl: parseFloat(upl),
        timestamp: Date.now()
      };

      const previousPosition = this.positions.get(positionKey);
      
      if (previousPosition) {
        const sizeChange = Math.abs(currentPosition.size - previousPosition.size);
        const pnlChange = currentPosition.unrealizedPnl - previousPosition.unrealizedPnl;
        
        if (sizeChange > this.config.thresholds.positionChange || 
            Math.abs(pnlChange) > this.config.thresholds.positionChange) {
          this.notifyPositionChange(currentPosition, previousPosition);
        }
      }

      this.positions.set(positionKey, currentPosition);
    });
  }

  handlePriceUpdate(data, instId) {
    data.forEach(ticker => {
      const { last, open24h } = ticker;
      const currentPrice = parseFloat(last);
      const openPrice = parseFloat(open24h);
      const changePercent = ((currentPrice - openPrice) / openPrice) * 100;

      const priceData = {
        symbol: instId,
        price: currentPrice,
        changePercent: changePercent,
        timestamp: Date.now()
      };

      const previousPrice = this.prices.get(instId);
      
      if (previousPrice) {
        const priceChangePercent = Math.abs(changePercent - previousPrice.changePercent);
        
        if (priceChangePercent > this.config.thresholds.priceChange) {
          this.notifyPriceChange(priceData, previousPrice);
        }
      }

      this.prices.set(instId, priceData);
    });
  }

  async notifyPositionChange(current, previous) {
    const sizeChange = current.size - previous.size;
    const pnlChange = current.unrealizedPnl - previous.unrealizedPnl;
    
    const embed = {
      title: '🔔 持倉變動提醒',
      color: sizeChange > 0 ? 0x00ff00 : 0xff0000,
      fields: [
        {
          name: '交易對',
          value: current.symbol,
          inline: true
        },
        {
          name: '持倉變化',
          value: `${sizeChange > 0 ? '+' : ''}${sizeChange.toFixed(8)}`,
          inline: true
        },
        {
          name: '當前持倉',
          value: current.size.toFixed(8),
          inline: true
        },
        {
          name: '平均價格',
          value: `$${current.avgPrice.toFixed(4)}`,
          inline: true
        },
        {
          name: '未實現盈虧變化',
          value: `${pnlChange > 0 ? '+' : ''}$${pnlChange.toFixed(2)}`,
          inline: true
        },
        {
          name: '當前未實現盈虧',
          value: `$${current.unrealizedPnl.toFixed(2)}`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    await this.discordService.sendEmbed(embed, 'position');
  }

  async notifyPriceChange(current, previous) {
    const direction = current.changePercent > previous.changePercent ? '📈' : '📉';
    const color = current.changePercent > 0 ? 0x00ff00 : 0xff0000;
    
    const embed = {
      title: `${direction} 價格變動提醒`,
      color: color,
      fields: [
        {
          name: '交易對',
          value: current.symbol,
          inline: true
        },
        {
          name: '當前價格',
          value: `$${current.price.toFixed(4)}`,
          inline: true
        },
        {
          name: '24小時變化',
          value: `${current.changePercent > 0 ? '+' : ''}${current.changePercent.toFixed(2)}%`,
          inline: true
        }
      ],
      timestamp: new Date().toISOString()
    };

    await this.discordService.sendEmbed(embed, 'position');
  }

  reconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`嘗試重新連接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect();
      }, 5000 * this.reconnectAttempts);
    } else {
      console.error('達到最大重連次數，停止重連');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.isConnected = false;
  }
}

module.exports = ExchangeMonitor;
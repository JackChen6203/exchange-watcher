require('dotenv').config();

const config = {
  // Bitget API 配置 - 使用合約API
  api: {
    key: process.env.API_KEY,
    secret: process.env.API_SECRET,
    passphrase: process.env.API_PASSPHRASE,
    baseUrl: process.env.BITGET_BASE_URL || 'https://api.bitget.com',
    // 現貨WebSocket（用於價格監控）
    wsUrl: process.env.BITGET_WS_URL || 'wss://ws.bitget.com/spot/v1/stream',
    // 合約WebSocket（用於持倉量和資金費率監控）
    contractWsUrl: process.env.BITGET_CONTRACT_WS_URL || 'wss://ws.bitget.com/mix/v1/stream',
    // 合約REST API
    contractRestUrl: process.env.BITGET_CONTRACT_REST_URL || 'https://api.bitget.com/api/v2/mix/market/contracts'
  },
  
  // Discord Webhook
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    positionWebhookUrl: process.env.DISCORD_POSITION_WEBHOOK_URL || process.env.POSITION_WEBHOOK_URL,
    fundingRateWebhookUrl: process.env.FUNDING_RATE_WEBHOOK_URL,
    priceAlertWebhookUrl: process.env.PRICE_ALERT_WEBHOOK_URL,
    swingStrategyWebhookUrl: process.env.SWING_STRATEGY_WEBHOOK_URL,
    // Discord 圖示配置
    icons: {
      chart: process.env.DISCORD_CHART_ICON_URL || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4c8.png',
      money: process.env.DISCORD_MONEY_ICON_URL || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/1f4b0.png',
      clock: process.env.DISCORD_CLOCK_ICON_URL || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/23f0.png',
      settings: process.env.DISCORD_SETTINGS_ICON_URL || 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/2699.png'
    }
  },
  
  // 監控閾值
  thresholds: {
    priceChange: parseFloat(process.env.PRICE_CHANGE_THRESHOLD) || 10, // 價格變動百分比(改為10%)
    positionChange: parseFloat(process.env.POSITION_CHANGE_THRESHOLD) || 10, // 持倉變動百分比(改為10%)
    fundingRateHigh: parseFloat(process.env.FUNDING_RATE_HIGH_THRESHOLD) || 0.1, // 資金費率異常高閾值(0.1%)
    fundingRateLow: parseFloat(process.env.FUNDING_RATE_LOW_THRESHOLD) || -0.1, // 資金費率異常低閾值(-0.1%)
    updateInterval: parseInt(process.env.UPDATE_INTERVAL) || 5000, // 更新間隔(ms)
    maxChannelsPerConnection: 50, // Bitget建議每個連接訂閱少於50個頻道
    verboseLogging: process.env.VERBOSE_LOGGING === 'true' || false, // 是否啟用詳細日誌
    reportInterval: 15 * 60 * 1000, // 15分鐘報告間隔
    monitorInterval: 5 * 60 * 1000 // 5分鐘監控間隔
  },
  
  // Bitget 產品類型 - 專注合約（根據CLAUDE.md要求）
  productTypes: ['umcbl'], // USDT永續合約
  contractTypes: ['umcbl'], // USDT永續合約
  
  // 日誌配置
  logging: {
    level: process.env.LOG_LEVEL || 'info', // 日誌級別: debug, info, warn, error
    file: process.env.LOG_FILE || './logs/monitor.log',
    maxSize: '10MB',
    maxFiles: 5
  },
  
  // 要監控的所有合約 - 將通過API動態獲取
  symbols: [], // 將動態填充所有可用合約
  
  // WebSocket 配置
  websocket: {
    pingInterval: 30000, // 30秒發送一次ping
    reconnectDelay: 5000, // 重連延遲
    maxReconnectAttempts: 10 // 最大重連次數
  }
};

module.exports = config;
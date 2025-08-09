require('dotenv').config();

const config = {
  // Bitget API 配置 - 使用合約API
  api: {
    key: process.env.BITGET_API_KEY || process.env.API_KEY,
    secret: process.env.BITGET_SECRET_KEY || process.env.API_SECRET,
    passphrase: process.env.BITGET_PASSPHRASE || process.env.API_PASSPHRASE,
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
    // 移除未使用的通用 webhook
    webhookUrl: null,
    positionWebhookUrl: process.env.POSITION_WEBHOOK_URL,
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

  // Redis 設定 (可選)
  redis: {
    enabled: process.env.USE_REDIS === 'true' || false,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0
  },

  // 數據庫設定
  database: {
    useRedis: process.env.USE_REDIS === 'true' || false,
    useSqlite: process.env.USE_SQLITE !== 'false' // 預設啟用SQLite
  },
  
  // 監控設定
  monitoring: {
    intervals: {
      dataUpdate: 5 * 60 * 1000,     // 5分鐘更新數據
      positionReport: 15 * 60 * 1000, // 15分鐘發送持倉報告
      fundingReport: 60 * 60 * 1000   // 1小時發送資金費率報告
    },
    thresholds: {
      positionChange: 1,              // 持倉變動1%以上才報告（降低門檻）
      priceChange: 1,                 // 價格變動1%以上才報告（降低門檻）
      fundingRate: 0.001              // 資金費率0.001%以上才報告（降低門檻）
    },
    periods: ['15m', '1h', '4h'],      // 監控時間周期
    maxSymbols: 100                    // 最多監控交易對數量
  },

  // 監控閾值（保留向下兼容）
  thresholds: {
    priceChange: parseFloat(process.env.PRICE_CHANGE_THRESHOLD) || 1, // 價格變動百分比(降為1%)
    positionChange: parseFloat(process.env.POSITION_CHANGE_THRESHOLD) || 1, // 持倉變動百分比(降為1%)
    fundingRateHigh: parseFloat(process.env.FUNDING_RATE_HIGH_THRESHOLD) || 0.05, // 資金費率異常高閾值(0.05%)
    fundingRateLow: parseFloat(process.env.FUNDING_RATE_LOW_THRESHOLD) || -0.05, // 資金費率異常低閾值(-0.05%)
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
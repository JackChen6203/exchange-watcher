const Redis = require('redis');
const Logger = require('../utils/logger');

class RedisManager {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config);
    this.client = null;
    this.isConnected = false;
    
    // Redis配置
    this.redisConfig = {
      host: config.redis?.host || 'localhost',
      port: config.redis?.port || 6379,
      password: config.redis?.password || null,
      db: config.redis?.db || 0,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      maxRetriesPerRequest: 3
    };
  }

  async initialize() {
    try {
      // 創建Redis客戶端
      this.client = Redis.createClient({
        socket: {
          host: this.redisConfig.host,
          port: this.redisConfig.port,
        },
        password: this.redisConfig.password,
        database: this.redisConfig.db
      });

      // 錯誤處理
      this.client.on('error', (err) => {
        this.logger.error('Redis連接錯誤:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.info('Redis連接成功');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.logger.info('Redis準備就緒');
      });

      this.client.on('end', () => {
        this.logger.info('Redis連接結束');
        this.isConnected = false;
      });

      // 連接到Redis
      await this.client.connect();
      
      this.logger.info('✅ Redis初始化完成');
      return true;
    } catch (error) {
      this.logger.error('❌ Redis初始化失敗:', error);
      this.isConnected = false;
      return false;
    }
  }

  // 保存持倉量數據
  async saveOpenInterest(symbol, data, period = 'current') {
    if (!this.isConnected) return false;
    
    try {
      const key = `oi:${symbol}:${period}`;
      const value = JSON.stringify({
        ...data,
        timestamp: Date.now()
      });
      
      // 設置過期時間（7天）
      await this.client.setEx(key, 7 * 24 * 60 * 60, value);
      return true;
    } catch (error) {
      this.logger.error(`保存持倉量數據失敗 ${symbol}:`, error);
      return false;
    }
  }

  // 獲取持倉量數據
  async getOpenInterest(symbol, period = 'current') {
    if (!this.isConnected) return null;
    
    try {
      const key = `oi:${symbol}:${period}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`獲取持倉量數據失敗 ${symbol}:`, error);
      return null;
    }
  }

  // 保存價格數據
  async savePriceData(symbol, data, period = 'current') {
    if (!this.isConnected) return false;
    
    try {
      const key = `price:${symbol}:${period}`;
      const value = JSON.stringify({
        ...data,
        timestamp: Date.now()
      });
      
      // 設置過期時間（7天）
      await this.client.setEx(key, 7 * 24 * 60 * 60, value);
      return true;
    } catch (error) {
      this.logger.error(`保存價格數據失敗 ${symbol}:`, error);
      return false;
    }
  }

  // 獲取價格數據
  async getPriceData(symbol, period = 'current') {
    if (!this.isConnected) return null;
    
    try {
      const key = `price:${symbol}:${period}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`獲取價格數據失敗 ${symbol}:`, error);
      return null;
    }
  }

  // 保存資金費率數據
  async saveFundingRate(symbol, data) {
    if (!this.isConnected) return false;
    
    try {
      const key = `funding:${symbol}`;
      const value = JSON.stringify({
        ...data,
        timestamp: Date.now()
      });
      
      // 設置過期時間（24小時）
      await this.client.setEx(key, 24 * 60 * 60, value);
      return true;
    } catch (error) {
      this.logger.error(`保存資金費率數據失敗 ${symbol}:`, error);
      return false;
    }
  }

  // 獲取資金費率數據
  async getFundingRate(symbol) {
    if (!this.isConnected) return null;
    
    try {
      const key = `funding:${symbol}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`獲取資金費率數據失敗 ${symbol}:`, error);
      return null;
    }
  }

  // 保存排行榜數據
  async saveRanking(type, period, data) {
    if (!this.isConnected) return false;
    
    try {
      const key = `ranking:${type}:${period}`;
      const value = JSON.stringify({
        data,
        timestamp: Date.now()
      });
      
      // 設置過期時間（1小時）
      await this.client.setEx(key, 60 * 60, value);
      
      // 同時保存到歷史記錄
      const historyKey = `ranking:${type}:${period}:history`;
      await this.client.lPush(historyKey, value);
      
      // 只保留最近100條記錄
      await this.client.lTrim(historyKey, 0, 99);
      
      return true;
    } catch (error) {
      this.logger.error(`保存排行榜數據失敗 ${type}:${period}:`, error);
      return false;
    }
  }

  // 獲取排行榜數據
  async getRanking(type, period) {
    if (!this.isConnected) return null;
    
    try {
      const key = `ranking:${type}:${period}`;
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      this.logger.error(`獲取排行榜數據失敗 ${type}:${period}:`, error);
      return null;
    }
  }

  // 批量保存數據
  async batchSave(operations) {
    if (!this.isConnected || !Array.isArray(operations)) return false;
    
    try {
      const pipeline = this.client.multi();
      
      operations.forEach(op => {
        const { key, value, expire = 3600 } = op;
        pipeline.setEx(key, expire, JSON.stringify(value));
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      this.logger.error('批量保存數據失敗:', error);
      return false;
    }
  }

  // 獲取所有符合模式的鍵
  async getKeys(pattern) {
    if (!this.isConnected) return [];
    
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      this.logger.error(`獲取鍵失敗 ${pattern}:`, error);
      return [];
    }
  }

  // 刪除鍵
  async delete(key) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      this.logger.error(`刪除鍵失敗 ${key}:`, error);
      return false;
    }
  }

  // 設置過期時間
  async expire(key, seconds) {
    if (!this.isConnected) return false;
    
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      this.logger.error(`設置過期時間失敗 ${key}:`, error);
      return false;
    }
  }

  // 檢查鍵是否存在
  async exists(key) {
    if (!this.isConnected) return false;
    
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.logger.error(`檢查鍵存在失敗 ${key}:`, error);
      return false;
    }
  }

  // 獲取Redis狀態
  async getStats() {
    if (!this.isConnected) return null;
    
    try {
      const info = await this.client.info();
      return {
        connected: this.isConnected,
        info: info
      };
    } catch (error) {
      this.logger.error('獲取Redis狀態失敗:', error);
      return null;
    }
  }

  // 清理過期數據
  async cleanup() {
    if (!this.isConnected) return false;
    
    try {
      // 獲取所有以monitoring開頭的鍵
      const patterns = ['oi:*', 'price:*', 'funding:*', 'ranking:*'];
      
      for (const pattern of patterns) {
        const keys = await this.client.keys(pattern);
        this.logger.info(`找到 ${keys.length} 個 ${pattern} 鍵`);
      }
      
      return true;
    } catch (error) {
      this.logger.error('清理數據失敗:', error);
      return false;
    }
  }

  // 關閉連接
  async close() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        this.logger.info('Redis連接已關閉');
      } catch (error) {
        this.logger.error('關閉Redis連接失敗:', error);
      }
    }
  }

  // 健康檢查
  async healthCheck() {
    if (!this.client) return false;
    
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.error('Redis健康檢查失敗:', error);
      return false;
    }
  }
}

module.exports = RedisManager;
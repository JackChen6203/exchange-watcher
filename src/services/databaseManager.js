const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger');

class DatabaseManager {
  constructor(config) {
    this.config = config;
    this.logger = new Logger(config);
    this.dbPath = path.join(process.cwd(), 'data', 'monitor.db');
    this.db = null;
    
    // 確保數據目錄存在
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          this.logger.error('數據庫連接失敗:', err.message);
          reject(err);
        } else {
          this.logger.info('數據庫連接成功');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const queries = [
      // 持倉量數據表
      `CREATE TABLE IF NOT EXISTS open_interest (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        product_type TEXT NOT NULL,
        open_interest REAL NOT NULL,
        open_interest_usd REAL NOT NULL,
        change_amount REAL DEFAULT 0,
        change_percent REAL DEFAULT 0,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 資金費率數據表
      `CREATE TABLE IF NOT EXISTS funding_rate (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        product_type TEXT NOT NULL,
        funding_rate REAL NOT NULL,
        next_funding_time INTEGER NOT NULL,
        change_amount REAL DEFAULT 0,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 價格數據表
      `CREATE TABLE IF NOT EXISTS price_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        price REAL NOT NULL,
        change_percent REAL NOT NULL,
        volume_24h REAL NOT NULL,
        high_24h REAL NOT NULL,
        low_24h REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 排行榜快照表
      `CREATE TABLE IF NOT EXISTS ranking_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL, -- 'open_interest_positive', 'open_interest_negative', 'funding_rate_positive', 'funding_rate_negative'
        period TEXT NOT NULL, -- '15m', '1h', '4h', '1d'
        data TEXT NOT NULL, -- JSON格式的排行榜數據
        timestamp INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_open_interest_symbol_time ON open_interest(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_funding_rate_symbol_time ON funding_rate(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_price_data_symbol_time ON price_data(symbol, timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_ranking_type_period_time ON ranking_snapshots(type, period, timestamp)'
    ];

    try {
      // 創建表
      for (const query of queries) {
        await this.runQuery(query);
      }
      
      // 創建索引
      for (const indexQuery of indexQueries) {
        await this.runQuery(indexQuery);
      }
      
      this.logger.info('數據庫表結構初始化完成');
    } catch (error) {
      console.error('❌ 創建數據庫表失敗:', error);
      throw error;
    }
  }

  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // 保存持倉量數據
  async saveOpenInterest(data) {
    const sql = `INSERT INTO open_interest 
      (symbol, product_type, open_interest, open_interest_usd, change_amount, change_percent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      data.symbol,
      data.productType || 'umcbl',
      data.openInterest,
      data.openInterestUsd || data.openInterest,
      data.change || 0,
      data.changePercent || 0,
      data.timestamp || Date.now()
    ];

    return await this.runQuery(sql, params);
  }

  // 保存資金費率數據
  async saveFundingRate(data) {
    const sql = `INSERT INTO funding_rate 
      (symbol, product_type, funding_rate, next_funding_time, change_amount, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)`;
    
    const params = [
      data.symbol,
      data.productType || 'umcbl',
      data.fundingRate,
      data.nextFundingTime,
      data.change || 0,
      data.timestamp || Date.now()
    ];

    return await this.runQuery(sql, params);
  }

  // 保存價格數據
  async savePriceData(data) {
    const sql = `INSERT INTO price_data 
      (symbol, price, change_percent, volume_24h, high_24h, low_24h, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    const params = [
      data.symbol,
      data.price,
      data.changePercent,
      data.volume24h,
      data.high24h,
      data.low24h,
      data.timestamp || Date.now()
    ];

    return await this.runQuery(sql, params);
  }

  // 保存排行榜快照
  async saveRankingSnapshot(type, period, data) {
    const sql = `INSERT INTO ranking_snapshots (type, period, data, timestamp)
      VALUES (?, ?, ?, ?)`;
    
    const params = [
      type,
      period,
      JSON.stringify(data),
      Date.now()
    ];

    return await this.runQuery(sql, params);
  }

  // 獲取歷史持倉量數據
  async getOpenInterestHistory(symbol, hours = 24) {
    const sql = `SELECT * FROM open_interest 
      WHERE symbol = ? AND timestamp > ? 
      ORDER BY timestamp DESC`;
    
    const startTime = Date.now() - (hours * 60 * 60 * 1000);
    return await this.allQuery(sql, [symbol, startTime]);
  }

  // 獲取歷史持倉量數據（別名方法，用於測試兼容性）
  async getHistoricalOpenInterest(symbol, startTime, endTime) {
    const sql = `SELECT * FROM open_interest 
      WHERE symbol = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC`;
    
    return await this.allQuery(sql, [symbol, startTime, endTime]);
  }

  // 獲取歷史資金費率數據
  async getFundingRateHistory(symbol, hours = 24) {
    const sql = `SELECT * FROM funding_rate 
      WHERE symbol = ? AND timestamp > ? 
      ORDER BY timestamp DESC`;
    
    const startTime = Date.now() - (hours * 60 * 60 * 1000);
    return await this.allQuery(sql, [symbol, startTime]);
  }

  // 獲取價格歷史數據
  async getPriceHistory(symbol, hours = 24) {
    const sql = `SELECT * FROM price_data 
      WHERE symbol = ? AND timestamp > ? 
      ORDER BY timestamp DESC`;
    
    const startTime = Date.now() - (hours * 60 * 60 * 1000);
    return await this.allQuery(sql, [symbol, startTime]);
  }

  // 獲取持倉量變動統計
  async getOpenInterestStats(period = '15m') {
    const intervals = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };

    const startTime = Date.now() - intervals[period];
    
    const sql = `SELECT 
      symbol,
      product_type,
      open_interest,
      change_percent,
      timestamp
      FROM open_interest 
      WHERE timestamp > ? 
      ORDER BY ABS(change_percent) DESC
      LIMIT 30`;

    return await this.allQuery(sql, [startTime]);
  }

  // 獲取資金費率統計
  async getFundingRateStats(period = '15m') {
    const intervals = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000
    };

    const startTime = Date.now() - intervals[period];
    
    const sql = `SELECT 
      symbol,
      product_type,
      funding_rate,
      next_funding_time,
      timestamp
      FROM funding_rate 
      WHERE timestamp > ? 
      ORDER BY ABS(funding_rate) DESC
      LIMIT 30`;

    return await this.allQuery(sql, [startTime]);
  }

  // 清理舊數據（保留最近30天）
  async cleanOldData() {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    const tables = ['open_interest', 'funding_rate', 'price_data', 'ranking_snapshots'];
    
    for (const table of tables) {
      const sql = `DELETE FROM ${table} WHERE timestamp < ?`;
      const result = await this.runQuery(sql, [thirtyDaysAgo]);
      this.logger.info(`清理 ${table} 表，刪除 ${result.changes} 條舊記錄`);
    }
  }

  // 關閉數據庫連接
  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          this.logger.error('關閉數據庫失敗:', err.message);
        } else {
          this.logger.info('數據庫連接已關閉');
        }
      });
    }
  }

  // 獲取數據庫統計信息
  async getStats() {
    const stats = {};
    
    const tables = ['open_interest', 'funding_rate', 'price_data', 'ranking_snapshots'];
    
    for (const table of tables) {
      const countSql = `SELECT COUNT(*) as count FROM ${table}`;
      const result = await this.getQuery(countSql);
      stats[table] = result.count;
    }
    
    return stats;
  }
}

module.exports = DatabaseManager;
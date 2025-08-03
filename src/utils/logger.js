const fs = require('fs');
const path = require('path');

class Logger {
  constructor(config) {
    this.config = config;
    this.logLevels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    this.currentLevel = this.logLevels[config.logging.level] || 1;
    
    // 確保日誌目錄存在
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.config.logging.file);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  formatMessage(level, message, ...args) {
    const timestamp = new Date().toISOString();
    const argsStr = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${argsStr}`;
  }

  writeToFile(message) {
    try {
      fs.appendFileSync(this.config.logging.file, message + '\n');
    } catch (error) {
      console.error('日誌寫入失敗:', error.message);
    }
  }

  log(level, message, ...args) {
    if (this.logLevels[level] < this.currentLevel) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, ...args);
    
    // 總是寫入日誌文件
    this.writeToFile(formattedMessage);
    
    // 根據配置決定是否顯示在控制台
    if (level === 'error' || level === 'warn') {
      // 錯誤和警告總是顯示在控制台
      console.log(formattedMessage);
    } else if (this.config.thresholds.verboseLogging) {
      // 只有在詳細模式下才顯示info和debug
      console.log(formattedMessage);
    } else if (level === 'info' && this.isImportantInfo(message)) {
      // 重要的info信息總是顯示
      console.log(formattedMessage);
    }
  }

  isImportantInfo(message) {
    const importantKeywords = [
      '初始化',
      '啟動',
      '連接成功',
      '連接失敗',
      '監控系統',
      '價格變動',
      '持倉異動',
      '資金費率異常',
      '系統關閉'
    ];
    return importantKeywords.some(keyword => message.includes(keyword));
  }

  debug(message, ...args) {
    this.log('debug', message, ...args);
  }

  info(message, ...args) {
    this.log('info', message, ...args);
  }

  warn(message, ...args) {
    this.log('warn', message, ...args);
  }

  error(message, ...args) {
    this.log('error', message, ...args);
  }

  // 特殊方法：總是顯示在控制台的重要消息
  console(message, ...args) {
    const formattedMessage = this.formatMessage('info', message, ...args);
    console.log(formattedMessage);
    this.writeToFile(formattedMessage);
  }
}

module.exports = Logger;
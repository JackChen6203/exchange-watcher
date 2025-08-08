const http = require('http');
const Logger = require('./utils/logger');

class HealthServer {
  constructor(config, monitor) {
    this.config = config;
    this.monitor = monitor;
    this.logger = new Logger(config);
    this.server = null;
    this.port = process.env.PORT || 8080;
  }

  start() {
    this.server = http.createServer((req, res) => {
      // 健康檢查端點
      if (req.url === '/health' || req.url === '/') {
        try {
          const status = this.getHealthStatus();
          
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          });
          
          res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: '加密貨幣交易所監控系統',
            version: '1.0.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            ...status
          }, null, 2));
          
        } catch (error) {
          this.logger.error('健康檢查錯誤:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
          }));
        }
      } 
      // 狀態頁面
      else if (req.url === '/status') {
        try {
          const detailedStatus = this.getDetailedStatus();
          
          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8'
          });
          
          res.end(this.generateStatusPage(detailedStatus));
          
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Status check failed: ' + error.message);
        }
      } 
      else {
        // 404 for other endpoints
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      this.logger.console(`🌐 健康檢查伺服器已啟動，端口: ${this.port}`);
      this.logger.console(`📊 健康檢查端點: http://localhost:${this.port}/health`);
      this.logger.console(`📈 狀態頁面: http://localhost:${this.port}/status`);
    });

    this.server.on('error', (error) => {
      this.logger.error('健康檢查伺服器錯誤:', error);
    });
  }

  getHealthStatus() {
    if (!this.monitor) {
      return { monitoring: 'not_initialized' };
    }

    try {
      const contractStatus = this.monitor.contractMonitor?.getStatus();
      
      return {
        monitoring: {
          isRunning: this.monitor.isRunning || false,
          contract: contractStatus || { isRunning: false },
          startTime: this.monitor.startTime || new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        monitoring: 'error',
        error: error.message
      };
    }
  }

  getDetailedStatus() {
    const basicStatus = this.getHealthStatus();
    const contractStatus = this.monitor?.contractMonitor?.getStatus();
    
    return {
      ...basicStatus,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        pid: process.pid,
        cwd: process.cwd()
      },
      monitoring: {
        ...basicStatus.monitoring,
        details: contractStatus
      }
    };
  }

  generateStatusPage(status) {
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>加密貨幣交易所監控系統 - 狀態頁面</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-ok { color: #28a745; }
        .status-error { color: #dc3545; }
        .status-warning { color: #ffc107; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .section { margin: 20px 0; }
        .section h3 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 加密貨幣交易所監控系統</h1>
            <p class="status-ok">系統運行中</p>
        </div>
        
        <div class="section">
            <h3>📊 監控狀態</h3>
            <pre>${JSON.stringify(status.monitoring, null, 2)}</pre>
        </div>
        
        <div class="section">
            <h3>💻 系統資訊</h3>
            <pre>${JSON.stringify(status.system, null, 2)}</pre>
        </div>
        
        <div class="section">
            <h3>🕐 最後更新</h3>
            <p>${status.timestamp || new Date().toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}</p>
        </div>
        
        <div class="section">
            <h3>🔗 API 端點</h3>
            <ul>
                <li><a href="/health">健康檢查 (/health)</a></li>
                <li><a href="/status">詳細狀態 (/status)</a></li>
            </ul>
        </div>
    </div>
    
    <script>
        // 每30秒自動刷新
        setTimeout(() => location.reload(), 30000);
    </script>
</body>
</html>`;
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        this.logger.console('🌐 健康檢查伺服器已停止');
      });
    }
  }
}

module.exports = HealthServer;
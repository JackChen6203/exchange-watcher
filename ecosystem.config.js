// ⚠️ 此文件已廢棄 - 專案已改用 systemd 進行部署
// 保留此文件僅供參考，請使用 crypto-monitor.service 進行部署

module.exports = {
  apps: [{
    name: 'crypto-monitor',
    script: 'src/index.js',
    cwd: '/home/JackChen6203/crypto-exchange-monitor',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    env_staging: {
      NODE_ENV: 'staging',
      LOG_LEVEL: 'debug'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    kill_timeout: 5000,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};

0s
Run echo "Checking for proper .env usage..."
  echo "Checking for proper .env usage..."
  
  # 檢查是否所有敏感配置都使用 process.env
  FILES_WITH_CONFIG=$(find src -name "*.js" -exec grep -l "apiKey\|apiSecret\|webhookUrl\|token" {} \;)
  
  for file in $FILES_WITH_CONFIG; do
    echo "Checking $file..."
    # 檢查是否有硬編碼的敏感值（排除合理的配置傳遞）
    PROBLEMATIC_LINES=$(grep -E "(apiKey|apiSecret|webhookUrl|token).*=" "$file" | \
      grep -v "process.env" | \
      grep -v "config\." | \
      grep -v "//.*=" | \
      grep -v "/\*.*=" || true)
    
    if [ ! -z "$PROBLEMATIC_LINES" ]; then
      echo "⚠️  Found potential hardcoded config in $file"
      echo "$PROBLEMATIC_LINES"
      exit 1
    fi
  done
  
  echo "✅ All sensitive configs use environment variables or proper config objects!"
  shell: /usr/bin/bash -e {0}
Checking for proper .env usage...
Checking src/index.js...
Checking src/config/config.js...
Checking src/enhancedIndex.js...
Checking src/services/enhancedDiscordService.js...
⚠️  Found potential hardcoded config in src/services/enhancedDiscordService.js
      const webhookUrl = this.getWebhookUrl(channel);
      this.lastSentTime[webhookUrl] = Date.now();
      const webhookUrl = this.getWebhookUrl(channel);
      this.lastSentTime[webhookUrl] = Date.now();
Error: Process completed with exit code 1.

Run npm run test:all
  npm run test:all
  shell: /usr/bin/bash -e {0}
  env:
    NODE_ENV: test

> crypto-exchange-monitor@1.0.0 test:all
> npm run test && npm run test:enhanced && npm run test:e2e && npm run test:contract && npm run test:comprehensive


> crypto-exchange-monitor@1.0.0 test
> node test/basic.test.js

🧪 運行基本測試...

📁 專案檔案檢查:
✅ 應該有 package.json 檔案
✅ 應該有主要入口檔案
✅ 應該有直接部署腳本
✅ 應該有 VM 設置腳本

⚙️ 配置檔案檢查:
✅ 應該有環境變數範本
✅ 應該有增強版入口檔案
✅ 應該有 GitHub Actions 工作流程

📂 目錄結構檢查:
✅ 應該有 src 目錄
✅ 應該有 deploy 目錄

🔧 應用程式模組檢查:
✅ 應該能夠讀取主要入口檔案
✅ package.json 應該有必要的腳本

📊 測試結果: 11 通過, 0 失敗
🎉 所有測試通過！

> crypto-exchange-monitor@1.0.0 test:enhanced
> node test/enhancedTest.js

/home/runner/work/exchange-watcher/exchange-watcher/src/config/config.js:21
<<<<<<< HEAD
^^

SyntaxError: Unexpected token '<<'
    at wrapSafe (node:internal/modules/cjs/loader:1472:18)
    at Module._compile (node:internal/modules/cjs/loader:1501:20)
    at Module._extensions..js (node:internal/modules/cjs/loader:1613:10)
    at Module.load (node:internal/modules/cjs/loader:1275:32)
    at Module._load (node:internal/modules/cjs/loader:1096:12)
    at Module.require (node:internal/modules/cjs/loader:1298:19)
    at require (node:internal/modules/helpers:182:18)
    at Object.<anonymous> (/home/runner/work/exchange-watcher/exchange-watcher/test/enhancedTest.js:5:16)
    at Module._compile (node:internal/modules/cjs/loader:1529:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1613:10)

Node.js v20.19.4
Error: Process completed with exit code 1.

Run npm run test:e2e
  npm run test:e2e
  shell: /usr/bin/bash -e {0}
  env:
    NODE_ENV: test

> crypto-exchange-monitor@1.0.0 test:e2e
> node test/e2eTest.js

/home/runner/work/exchange-watcher/exchange-watcher/src/config/config.js:21
<<<<<<< HEAD
^^

SyntaxError: Unexpected token '<<'
    at wrapSafe (node:internal/modules/cjs/loader:1472:18)
    at Module._compile (node:internal/modules/cjs/loader:1501:20)
    at Module._extensions..js (node:internal/modules/cjs/loader:1613:10)
    at Module.load (node:internal/modules/cjs/loader:1275:32)
    at Module._load (node:internal/modules/cjs/loader:1096:12)
    at Module.require (node:internal/modules/cjs/loader:1298:19)
    at require (node:internal/modules/helpers:182:18)
    at Object.<anonymous> (/home/runner/work/exchange-watcher/exchange-watcher/test/e2eTest.js:1:16)
    at Module._compile (node:internal/modules/cjs/loader:1529:14)
    at Module._extensions..js (node:internal/modules/cjs/loader:1613:10)

Node.js v20.19.4
Error: Process completed with exit code 1.
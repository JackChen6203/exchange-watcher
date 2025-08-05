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
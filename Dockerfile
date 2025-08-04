# 使用官方 Node.js 18 LTS 作為基礎映像
FROM node:18-alpine

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製應用程式源碼
COPY . .

# 創建必要的目錄
RUN mkdir -p logs data

# 設置正確的權限
RUN chown -R node:node /app
USER node

# 暴露應用程式端口（如果有的話）
EXPOSE 3000

# 健康檢查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# 啟動增強版應用程式
CMD ["npm", "run", "start:enhanced"]
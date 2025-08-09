const express = require('express');

// 監控各個頻道的數據狀態
class MonitoringRoutes {
  constructor(contractMonitor, discordService) {
    this.contractMonitor = contractMonitor;
    this.discordService = discordService;
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // 價格異動監控API
    this.router.get('/price-alerts', (req, res) => {
      try {
        const priceData = this.contractMonitor.priceData;
        const currentPrices = priceData.current;
        const threshold = this.contractMonitor.config.thresholds.priceChange;
        
        const alerts = [];
        const periods = ['15m', '30m', '1h', '4h'];
        
        for (const [symbol, currentPrice] of currentPrices) {
          const priceChanges = {};
          let hasSignificantChange = false;
          let maxChange = 0;
          
          for (const period of periods) {
            const historicalPrice = priceData[period]?.get(symbol);
            if (historicalPrice) {
              const change = ((currentPrice.price - historicalPrice.price) / historicalPrice.price) * 100;
              priceChanges[period] = change;
              maxChange = Math.max(maxChange, Math.abs(change));
              
              if (Math.abs(change) > threshold) {
                hasSignificantChange = true;
              }
            }
          }
          
          if (hasSignificantChange) {
            alerts.push({
              symbol,
              price: currentPrice.price,
              changePercent: currentPrice.change24h,
              volume24h: currentPrice.volume,
              priceChanges,
              maxChange,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        res.json({
          status: 'success',
          channel: 'price_alert',
          threshold: threshold,
          totalSymbols: currentPrices.size,
          alertCount: alerts.length,
          alerts: alerts.slice(0, 10), // 只返回前10個
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          channel: 'price_alert',
          error: error.message
        });
      }
    });

    // 持倉異動監控API - 返回表格格式
    this.router.get('/position-changes', async (req, res) => {
      try {
        // 使用 enhancedContractMonitor 的方法獲取持倉異動數據
        const positionChanges = await this.contractMonitor.calculateOpenInterestChanges();
        console.log('📊 calculateOpenInterestChanges 返回數據:', JSON.stringify(positionChanges, null, 2));
        
        // 整合不同時間周期的數據
        const symbolData = new Map();
        
        // 處理每個時間周期的數據
        const periods = ['15m', '1h', '4h'];
        for (const period of periods) {
          if (positionChanges[period]) {
            // 處理正異動
            if (positionChanges[period].positive) {
              for (const item of positionChanges[period].positive) {
                if (!symbolData.has(item.symbol)) {
                  symbolData.set(item.symbol, {
                    symbol: item.symbol,
                    priceChange: item.priceChange || 0,
                    marketCap: 0, // 總市值暫時設為0
                    positions: {}
                  });
                }
                symbolData.get(item.symbol).positions[period] = item.changePercent;
              }
            }
            
            // 處理負異動
            if (positionChanges[period].negative) {
              for (const item of positionChanges[period].negative) {
                if (!symbolData.has(item.symbol)) {
                  symbolData.set(item.symbol, {
                    symbol: item.symbol,
                    priceChange: item.priceChange || 0,
                    marketCap: 0, // 總市值暫時設為0
                    positions: {}
                  });
                }
                symbolData.get(item.symbol).positions[period] = item.changePercent;
              }
            }
          }
        }
        
        // 轉換為數組並按15分鐘持倉變化排序
        const allChanges = Array.from(symbolData.values())
          .filter(item => item.positions['15m'] !== undefined)
          .map(item => {
            // 嘗試獲取當前價格數據
            const priceData = this.contractMonitor.priceData.current.get(item.symbol);
            const currentPrice = priceData ? (priceData.price || priceData.close) : 0;
            
            // 計算市值（使用持倉量 * 價格）
            const openInterestData = this.contractMonitor.openInterests.current.get(item.symbol);
            const marketCapValue = openInterestData && currentPrice ? 
              (openInterestData.openInterestUsd / 1000000) : 0; // 轉換為百萬單位
            
            return {
              symbol: item.symbol,
              priceChange: priceData ? (priceData.change24h || 0) : 0,
              marketCap: marketCapValue,
              pos15m: item.positions['15m'] || 0,
              pos1h: item.positions['1h'] || 0,
              pos4h: item.positions['4h'] || 0
            };
          });
        
        // 分離正異動和負異動
        const positiveChanges = allChanges
          .filter(item => item.pos15m > 0)
          .sort((a, b) => b.pos15m - a.pos15m)
          .slice(0, 8);
          
        const negativeChanges = allChanges
          .filter(item => item.pos15m < 0)
          .sort((a, b) => a.pos15m - b.pos15m)
          .slice(0, 8);
        
        // 格式化表格
        const formatTable = (data, type) => {
          const rows = data.map((item, index) => {
            const rank = (index + 1).toString().padStart(2);
            const symbol = item.symbol.padEnd(12);
            const priceChange = this.formatPercent(item.priceChange).padStart(8);
            const marketCap = this.formatPercent(item.marketCap).padStart(8);
            const pos15m = this.formatPercent(item.pos15m).padStart(9);
            const pos1h = this.formatPercent(item.pos1h).padStart(9);
            const pos4h = this.formatPercent(item.pos4h).padStart(9);
            
            return `  ${rank} | ${symbol} | ${priceChange} | ${marketCap} | ${pos15m} | ${pos1h} | ${pos4h}`;
          }).join('\n');
          
          return `📊 持倉異動排行 ${type} TOP8 (各時間周期對比)\n\n排名 | 幣種          | 價格異動  | 總市值  | 15分持倉 | 1h持倉   | 4h持倉\n-----|-------------|----------|----------|----------|----------|----------\n${rows}`;
        };
        
        const positiveTable = formatTable(positiveChanges, '正異動');
        const negativeTable = formatTable(negativeChanges, '負異動');
        
        res.json({
          status: 'success',
          channel: 'position',
          totalSymbols: symbolData.size,
          changeCount: allChanges.length,
          tables: {
            positive: positiveTable,
            negative: negativeTable
          },
          data: {
            positive: positiveChanges,
            negative: negativeChanges
          },
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          channel: 'position',
          error: error.message
        });
      }
    });

    // 資金費率監控API
    this.router.get('/funding-rates', (req, res) => {
      try {
        const fundingRates = this.contractMonitor.fundingRates;
        const rankings = this.contractMonitor.calculateFundingRateWithPositionRankings();
        
        res.json({
          status: 'success',
          channel: 'funding_rate',
          totalSymbols: fundingRates.size,
          topPositive: rankings.topPositive.slice(0, 10),
          topNegative: rankings.topNegative.slice(0, 10),
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          channel: 'funding_rate',
          error: error.message
        });
      }
    });

    // 波段策略監控API
    this.router.get('/swing-strategy', async (req, res) => {
      try {
        const openInterests = this.contractMonitor.openInterests;
        const eligibleSymbols = Array.from(openInterests.current.entries())
          .filter(([symbol, data]) => data.openInterestUsd > 500000)
          .map(([symbol]) => symbol)
          .slice(0, 10); // 只檢查前10個避免超時
        
        const signals = [];
        
        for (const symbol of eligibleSymbols) {
          try {
            // 獲取K線數據
            const klineData = await this.contractMonitor.bitgetApi.getKline(symbol, 'umcbl', '15m', 100);
            
            if (klineData && klineData.length >= 55) {
              // 計算EMA
              const ema12 = this.contractMonitor.calculateEMA(klineData.map(k => parseFloat(k[4])), 12);
              const ema30 = this.contractMonitor.calculateEMA(klineData.map(k => parseFloat(k[4])), 30);
              const ema55 = this.contractMonitor.calculateEMA(klineData.map(k => parseFloat(k[4])), 55);
              
              if (ema12.length >= 3 && ema30.length >= 3 && ema55.length >= 3) {
                const currentEma12 = ema12[ema12.length - 1];
                const currentEma30 = ema30[ema30.length - 1];
                const currentEma55 = ema55[ema55.length - 1];
                
                const currentCandle = klineData[klineData.length - 1];
                const currentClose = parseFloat(currentCandle[4]);
                
                // 判斷多空頭排列
                const isBullish = currentEma12 > currentEma30 && currentEma30 > currentEma55;
                const isBearish = currentEma12 < currentEma30 && currentEma30 < currentEma55;
                
                signals.push({
                  symbol,
                  price: currentClose,
                  ema12: currentEma12,
                  ema30: currentEma30,
                  ema55: currentEma55,
                  trend: isBullish ? 'bullish' : isBearish ? 'bearish' : 'neutral',
                  timestamp: new Date().toISOString()
                });
              }
            }
            
            // 避免API限制
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.warn(`分析 ${symbol} 失敗:`, error.message);
          }
        }
        
        res.json({
          status: 'success',
          channel: 'swing_strategy',
          analyzedSymbols: eligibleSymbols.length,
          signalCount: signals.length,
          signals,
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          channel: 'swing_strategy',
          error: error.message
        });
      }
    });

    // 綜合監控狀態API
    this.router.get('/status', (req, res) => {
      try {
        const status = this.contractMonitor.getStatus();
        const priceDataSize = this.contractMonitor.priceData.current.size;
        const openInterestSize = this.contractMonitor.openInterests.current.size;
        const fundingRateSize = this.contractMonitor.fundingRates.size;
        
        res.json({
          status: 'success',
          monitoring: {
            isRunning: status.isRunning,
            startTime: status.startTime,
            priceData: {
              symbols: priceDataSize,
              hasData: priceDataSize > 0
            },
            openInterest: {
              symbols: openInterestSize,
              hasData: openInterestSize > 0
            },
            fundingRate: {
              symbols: fundingRateSize,
              hasData: fundingRateSize > 0
            }
          },
          lastUpdate: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // 測試價格異動警報API
    this.router.post('/test/price-alert', async (req, res) => {
      try {
        const { symbol, changePercent } = req.body;
        
        // 使用真實數據或測試數據
        const testSymbol = symbol || 'BTCUSDT';
        const testChange = changePercent || (Math.random() > 0.5 ? 5.2 : -4.8);
        
        // 模擬價格數據（因為價格數據收集可能還未完成）
        const mockPriceData = {
          price: 95000.50,
          change24h: 5.25,
          volume: 1234567890
        };
        
        // 嘗試從內存獲取真實數據，如果沒有則使用模擬數據
        let currentPrice = this.contractMonitor.priceData.current.get(testSymbol);
        if (!currentPrice) {
          console.warn(`找不到 ${testSymbol} 的價格數據，使用模擬數據`);
          currentPrice = mockPriceData;
        }
        
        const testAlert = {
          symbol: testSymbol,
          price: currentPrice.price,
          changePercent: testChange,
          volume24h: currentPrice.volume || 1000000,
          priceChanges: {
            '15m': (Math.random() - 0.5) * 2,
            '30m': (Math.random() - 0.5) * 4,
            '1h': (Math.random() - 0.5) * 6,
            '4h': (Math.random() - 0.5) * 8
          },
          timestamp: new Date().toISOString()
        };
        
        // 發送到Discord
        await this.discordService.sendAlert('price_alert', testAlert);
        
        res.json({
          status: 'success',
          message: '價格異動測試警報已發送',
          data: testAlert
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // 測試持倉異動警報API
    this.router.post('/test/position-alert', async (req, res) => {
      try {
        console.log('=== 測試持倉警報 API 被調用 ===');
        const { symbol, changePercent } = req.body;
        
        const testSymbol = symbol || 'BTCUSDT';
        const testChange = changePercent || (Math.random() > 0.5 ? 15.5 : -12.3);
        
        console.log('請求參數:', { symbol, changePercent, testSymbol, testChange });
        
        // 檢查是否有真實持倉數據可用
        const hasRealData = this.contractMonitor.openInterests.current.size > 0;
        console.log(`系統狀態: ${hasRealData ? '已載入真實數據' : '尚未載入真實數據'}`);
        console.log(`可用合約數量: ${this.contractMonitor.openInterests.current.size}`);
        
        // 如果沒有真實數據，直接返回錯誤
        if (!hasRealData) {
          return res.status(503).json({
            success: false,
            error: '系統尚未載入真實數據，請稍後再試',
            message: 'Real data not available yet, please try again later'
          });
        }
        
        // 嘗試獲取指定合約的真實數據
        let currentPosition = this.contractMonitor.openInterests.current.get(testSymbol);
        let actualSymbol = testSymbol;
        
        // 如果指定合約沒有數據，使用第一個可用的合約
        if (!currentPosition && this.contractMonitor.openInterests.current.size > 0) {
          actualSymbol = this.contractMonitor.openInterests.current.keys().next().value;
          currentPosition = this.contractMonitor.openInterests.current.get(actualSymbol);
          console.log(`指定合約 ${testSymbol} 無數據，使用替代合約 ${actualSymbol}`);
        }
        
        // 如果仍然沒有數據，返回錯誤
        if (!currentPosition) {
          return res.status(404).json({
            success: false,
            error: `找不到合約 ${testSymbol} 的持倉數據`,
            message: `Position data not found for symbol ${testSymbol}`,
            availableSymbols: Array.from(this.contractMonitor.openInterests.current.keys()).slice(0, 10)
          });
        }
        
        // 驗證必要的數據欄位
        if (!currentPosition.openInterestUsd || typeof currentPosition.openInterestUsd !== 'number') {
          return res.status(422).json({
            success: false,
            error: '持倉數據不完整或無效',
            message: 'Invalid or incomplete position data',
            data: currentPosition
          });
        }
        
        // 使用真實數據計算
        const baseSize = currentPosition.openInterestUsd;
        const sizeChange = baseSize * (testChange / 100);
        const avgPrice = currentPosition.markPrice || null;
        
        // 如果沒有價格數據，嘗試從價格數據中獲取
        let finalPrice = avgPrice;
        console.log(`📊 初始價格數據: avgPrice=${avgPrice}, actualSymbol=${actualSymbol}`);
        
        if (!finalPrice && this.contractMonitor.priceData && this.contractMonitor.priceData.current) {
          console.log(`📊 嘗試從價格數據 Map 獲取 ${actualSymbol} 的價格`);
          console.log(`📊 價格數據 Map 大小: ${this.contractMonitor.priceData.current.size}`);
          
          const priceData = this.contractMonitor.priceData.current.get(actualSymbol);
          console.log(`📊 獲取到的價格數據:`, priceData);
          
          if (priceData) {
            finalPrice = priceData?.close || priceData?.price;
            console.log(`📊 提取的最終價格: ${finalPrice}`);
          } else {
            console.log(`📊 未找到 ${actualSymbol} 的價格數據，檢查可用的鍵:`);
            const availableKeys = Array.from(this.contractMonitor.priceData.current.keys()).slice(0, 10);
            console.log(`📊 可用的價格數據鍵 (前10個):`, availableKeys);
          }
        }
        
        if (!finalPrice) {
          return res.status(422).json({
            success: false,
            error: '無法獲取價格數據',
            message: 'Price data not available',
            symbol: actualSymbol,
            debug: {
              avgPrice,
              priceDataSize: this.contractMonitor.priceData?.current?.size || 0,
              availableKeys: this.contractMonitor.priceData?.current ? Array.from(this.contractMonitor.priceData.current.keys()).slice(0, 5) : []
            }
          });
        }
        
        console.log('真實數據測試:', {
          symbol: actualSymbol,
          originalSymbol: testSymbol,
          baseSize,
          testChange,
          sizeChange,
          avgPrice: finalPrice,
          rawData: {
            openInterestUsd: currentPosition.openInterestUsd,
            openInterest: currentPosition.openInterest,
            markPrice: currentPosition.markPrice
          }
        });
        
        const testAlert = {
          symbol: actualSymbol,
          sizeChange: sizeChange,
          currentSize: baseSize,
          avgPrice: finalPrice,
          pnlChange: sizeChange * 0.1, // 基於真實數據計算的盈虧變化
          currentPnl: baseSize * 0.05, // 基於真實數據計算的當前盈虧
          changePercent: testChange,
          changeAmount: sizeChange,
          period: '15m',
          timestamp: new Date().toISOString()
        };
        
        // 發送到Discord
        await this.discordService.sendAlert('position_alert', testAlert);
        
        res.json({
          status: 'success',
          message: '持倉異動測試警報已發送',
          data: testAlert
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // 測試波段策略警報API
    this.router.post('/test/swing-strategy', async (req, res) => {
      try {
        const { symbol, trend } = req.body;
        
        const testSymbol = symbol || 'ETHUSDT';
        const testTrend = trend || (Math.random() > 0.5 ? 'bullish' : 'bearish');
        
        // 模擬價格數據
        const mockPriceData = {
          price: 3500.75
        };
        
        // 嘗試從內存獲取真實數據，如果沒有則使用模擬數據
        let currentPrice = this.contractMonitor.priceData.current.get(testSymbol);
        if (!currentPrice) {
          console.warn(`找不到 ${testSymbol} 的價格數據，使用模擬數據`);
          currentPrice = mockPriceData;
        }
        
        const testAlert = {
          symbol: testSymbol,
          price: currentPrice.price,
          trend: testTrend,
          ema12: currentPrice.price * 1.001,
          ema30: currentPrice.price * 0.999,
          ema55: currentPrice.price * 0.998,
          signal: testTrend === 'bullish' ? '多頭排列' : '空頭排列',
          timestamp: new Date().toISOString()
        };
        
        // 發送到Discord
        await this.discordService.sendAlert('swing_strategy_alert', testAlert);
        
        res.json({
          status: 'success',
          message: '波段策略測試警報已發送',
          data: testAlert
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // 測試表格格式報告API
    this.router.post('/test/table-report', async (req, res) => {
      try {
        const { type } = req.body;
        const reportType = type || 'position';
        
        if (reportType === 'position') {
          // 測試持倉變動表格
          const testData = [];
          const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'];
          
          for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            // 嘗試從內存獲取真實數據，如果沒有則使用模擬數據
            let current = this.contractMonitor.openInterests.current.get(symbol);
            if (!current) {
              console.warn(`找不到 ${symbol} 的持倉數據，使用模擬數據`);
              current = {
                openInterestUsd: Math.random() * 1000000000 + 100000000
              };
            }
            
            testData.push({
              symbol,
              currentOpenInterest: current.openInterestUsd,
              change15m: (Math.random() - 0.5) * 20,
              change1h: (Math.random() - 0.5) * 30,
              change4h: (Math.random() - 0.5) * 50,
              change1d: (Math.random() - 0.5) * 80
            });
          }
          
          // 生成表格格式
          const tableRows = testData.map((item, index) => {
            const rank = (index + 1).toString().padStart(2);
            const symbol = item.symbol.padEnd(12);
            const current = this.formatNumber(item.currentOpenInterest);
            const change15m = this.formatChangePercent(item.change15m);
            const change1h = this.formatChangePercent(item.change1h);
            const change4h = this.formatChangePercent(item.change4h);
            const change1d = this.formatChangePercent(item.change1d);
            
            return `${rank} | ${symbol} | ${current} | ${change15m} | ${change1h} | ${change4h} | ${change1d}`;
          }).join('\n');
          
          const tableContent = `\`\`\`
📈 持倉量變動排行 TOP5 (測試數據)

排名 | 交易對      | 當前持倉   | 15分    | 1時     | 4時     | 日線
-----|-----------|----------|---------|---------|---------|--------
${tableRows}
\`\`\``;
          
          await this.discordService.sendMessage(tableContent, 'position');
          
          res.json({
            status: 'success',
            message: '持倉變動表格測試報告已發送',
            tableContent
          });
          
        } else if (reportType === 'price') {
          // 測試價格變動表格
          const testData = [];
          const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'ADAUSDT', 'DOTUSDT'];
          
          for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            // 嘗試從內存獲取真實數據，如果沒有則使用模擬數據
            let current = this.contractMonitor.priceData.current.get(symbol);
            if (!current) {
              console.warn(`找不到 ${symbol} 的價格數據，使用模擬數據`);
              current = {
                price: Math.random() * 100000 + 1000
              };
            }
            
            testData.push({
              symbol,
              price: current.price,
              change15m: (Math.random() - 0.5) * 10,
              change1h: (Math.random() - 0.5) * 15,
              change4h: (Math.random() - 0.5) * 25,
              change1d: (Math.random() - 0.5) * 40
            });
          }
          
          const tableRows = testData.map((item, index) => {
            const rank = (index + 1).toString().padStart(2);
            const symbol = item.symbol.padEnd(12);
            const price = `$${item.price.toFixed(4)}`;
            const change15m = this.formatChangePercent(item.change15m);
            const change1h = this.formatChangePercent(item.change1h);
            const change4h = this.formatChangePercent(item.change4h);
            const change1d = this.formatChangePercent(item.change1d);
            
            return `${rank} | ${symbol} | ${price} | ${change15m} | ${change1h} | ${change4h} | ${change1d}`;
          }).join('\n');
          
          const tableContent = `\`\`\`
📊 價格變動排行 TOP5 (測試數據)

排名 | 交易對      | 當前價格   | 15分    | 1時     | 4時     | 日線
-----|-----------|----------|---------|---------|---------|--------
${tableRows}
\`\`\``;
          
          await this.discordService.sendMessage(tableContent, 'price_alert');
          
          res.json({
            status: 'success',
            message: '價格變動表格測試報告已發送',
            tableContent
          });
        }
        
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // 測試Webhook連接API
    this.router.post('/test/webhook', async (req, res) => {
      try {
        const { channel } = req.body;
        const testChannel = channel || 'price_alert';
        
        const webhookUrl = this.discordService.getWebhookUrl(testChannel);
        if (!webhookUrl) {
          return res.status(400).json({
            status: 'error',
            message: `頻道 ${testChannel} 的 Webhook URL 未配置`
          });
        }
        
        const testMessage = {
          title: '🧪 Webhook 連接測試',
          description: `這是一個測試訊息，用於驗證 ${testChannel} 頻道的 Discord Webhook 連接。`,
          color: 0x00ff00,
          timestamp: new Date().toISOString(),
          fields: [
            {
              name: '測試時間',
              value: new Date().toLocaleString('zh-TW'),
              inline: true
            },
            {
              name: '頻道',
              value: testChannel,
              inline: true
            },
            {
              name: '狀態',
              value: '✅ 連接正常',
              inline: true
            }
          ]
        };
        
        await this.discordService.sendEmbed(testMessage, testChannel);
        
        res.json({
          status: 'success',
          message: `Webhook 測試訊息已發送到 ${testChannel} 頻道`,
          webhookUrl: webhookUrl.substring(0, 50) + '...' // 只顯示部分URL保護隱私
        });
        
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // 測試Bitget API連接
    this.router.get('/test/bitget-connection', async (req, res) => {
      try {
        const connectionTest = await this.contractMonitor.bitgetApi.testConnection();
        
        if (connectionTest) {
          // 測試獲取真實數據
          const testSymbol = 'BTCUSDT';
          const ticker = await this.contractMonitor.bitgetApi.getTicker(testSymbol, 'umcbl');
          const openInterest = await this.contractMonitor.bitgetApi.getOpenInterest(testSymbol, 'umcbl');
          const fundingRate = await this.contractMonitor.bitgetApi.getFundingRate(testSymbol, 'umcbl');
          
          res.json({
            status: 'success',
            message: 'Bitget API 連接正常',
            testData: {
              symbol: testSymbol,
              ticker: {
                price: ticker?.lastPr,
                change24h: ticker?.chgUtc,
                volume: ticker?.baseVolume
              },
              openInterest: {
                amount: openInterest?.amount,
                amountUsd: openInterest?.amountUsd
              },
              fundingRate: {
                rate: fundingRate?.fundingRate,
                nextSettleTime: fundingRate?.nextSettleTime
              }
            },
            timestamp: new Date().toISOString()
          });
        } else {
          res.status(500).json({
            status: 'error',
            message: 'Bitget API 連接失敗'
          });
        }
        
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });
  }

  // 格式化數字顯示
  formatNumber(num) {
    // 檢查參數有效性
    if (num === undefined || num === null || isNaN(num)) {
      return '0.00';
    }
    
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  }

  // 格式化變動百分比
  formatChangePercent(changePercent) {
    // 檢查參數有效性
    if (changePercent === undefined || changePercent === null || isNaN(changePercent)) {
      return '0.00%';
    }
    
    const sign = changePercent >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  }

  formatPercent(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      return '   0.00%';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  getRouter() {
    return this.router;
  }
}

module.exports = MonitoringRoutes;
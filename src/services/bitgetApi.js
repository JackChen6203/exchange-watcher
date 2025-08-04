const axios = require('axios');
const crypto = require('crypto');

class BitgetApi {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.api.baseUrl;
  }

  // 創建Bitget API簽名
  createSignature(timestamp, method, requestPath, body) {
    // Bitget簽名格式: timestamp + method.toUpperCase() + requestPath + body
    const prehash = timestamp + method.toUpperCase() + requestPath + body;
    return crypto
      .createHmac('sha256', this.config.api.secret)
      .update(prehash)
      .digest('base64');
  }

  // 獲取API請求頭
  getHeaders(method, requestPath, body = '') {
    const timestamp = Date.now().toString(); // 轉為字符串
    const signature = this.createSignature(timestamp, method, requestPath, body);
    
    return {
      'ACCESS-KEY': this.config.api.key,
      'ACCESS-SIGN': signature,
      'ACCESS-TIMESTAMP': timestamp,
      'ACCESS-PASSPHRASE': this.config.api.passphrase,
      'Content-Type': 'application/json'
    };
  }

  // 獲取所有現貨交易對
  async getAllSpotSymbols() {
    try {
      // 使用logger記錄，console在logger中處理
      
      // 使用現貨API端點
      const requestPath = '/api/spot/v1/public/products';
      
      try {
        // 使用logger記錄，console在logger中處理
        const response = await axios.get(`${this.baseUrl}${requestPath}`, {
          timeout: 15000
        });

        if (response.data.code === '00000' && response.data.data) {
          const allSymbols = response.data.data
            .filter(product => product.status === 'online') // 只取在線交易對
            .map(product => ({
              symbol: product.symbolName, // 使用symbolName用於WebSocket訂閱
              fullSymbol: product.symbol, // 完整的交易對名稱
              baseCoin: product.baseCoin,
              quoteCoin: product.quoteCoin,
              productType: 'sp', // 現貨類型
              minTradeAmount: product.minTradeAmount,
              priceScale: product.priceScale,
              quantityScale: product.quantityScale,
              status: product.status
            }));

          // 使用logger記錄，console在logger中處理
          return allSymbols;
        } else {
          throw new Error(`API錯誤: ${response.data.msg || 'Unknown error'}`);
        }
      } catch (error) {
        if (error.response) {
          throw new Error(`API請求失敗: ${error.response.status} - ${error.response.data?.msg || error.message}`);
        }
        throw error;
      }
      
    } catch (error) {
      // 使用logger記錄，console在logger中處理
      throw error;
    }
  }

  // 獲取所有合約交易對（保留原方法作為備用）
  async getAllContractSymbols() {
    try {
      // 使用logger記錄，console在logger中處理
      const allSymbols = [];
      
      // 遍歷所有產品類型
      for (const productType of this.config.productTypes) {
        try {
          const symbols = await this.getSymbolsByProductType(productType);
          allSymbols.push(...symbols);
          // 使用logger記錄，console在logger中處理
        } catch (error) {
          // 使用logger記錄，console在logger中處理
        }
      }

      // 使用logger記錄，console在logger中處理
      return allSymbols;
      
    } catch (error) {
      // 使用logger記錄，console在logger中處理
      throw error;
    }
  }

  // 根據產品類型獲取交易對 - 使用V2 API（修復產品類型映射）
  async getSymbolsByProductType(productType) {
    try {
      // 產品類型映射
      const productTypeMap = {
        'umcbl': 'usdt-futures', // USDT永續合約
        'dmcbl': 'coin-futures', // 幣本位永續合約
        'cmcbl': 'usdc-futures'  // USDC永續合約
      };
      
      const mappedProductType = productTypeMap[productType] || productType;
      
      // 使用logger記錄，console在logger中處理
      
      // 使用V2 API
      const v2RequestPath = `/api/v2/mix/market/contracts?productType=${mappedProductType}`;
      
      const v2Response = await axios.get(`${this.baseUrl}${v2RequestPath}`, {
        timeout: 10000
      });

      if (v2Response.data.code === '00000' && v2Response.data.data) {
        // 使用logger記錄，console在logger中處理
        return v2Response.data.data.map(contract => ({
          symbol: contract.symbol,
          baseCoin: contract.baseCoin,
          quoteCoin: contract.quoteCoin,
          productType: productType,
          contractSize: contract.size,
          priceScale: contract.priceScale,
          quantityScale: contract.volumeScale,
          status: contract.symbolStatus
        })).filter(symbol => symbol.status === 'normal');
      }
    } catch (v2Error) {
      // 使用logger記錄，console在logger中處理
    }
    
    try {
      // 使用logger記錄，console在logger中處理
      
      const v1RequestPath = `/api/mix/v1/market/contracts?productType=${productType}`;
      
      const response = await axios.get(`${this.baseUrl}${v1RequestPath}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data) {
        // 使用logger記錄，console在logger中處理
        return response.data.data.map(contract => ({
          symbol: contract.symbol,
          baseCoin: contract.baseCoin,
          quoteCoin: contract.quoteCoin,
          productType: productType,
          contractSize: contract.size,
          priceScale: contract.priceScale,
          quantityScale: contract.volumeScale,
          status: contract.symbolStatus
        })).filter(symbol => symbol.status === 'normal');
      } else {
        throw new Error(`API錯誤: ${response.data.msg || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`API請求失敗: ${error.response.status} - ${error.response.data?.msg || error.message}`);
      }
      throw error;
    }
  }

  // 獲取所有交易對的ticker數據 - 使用公開API
  async getAllTickers(productType = 'umcbl') {
    const requestPath = `/api/mix/v1/market/tickers?productType=${productType}`;
    
    try {
      // 使用logger記錄，console在logger中處理
      // 使用公開API，不需要認證
      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        timeout: 15000
      });

      if (response.data.code === '00000' && response.data.data) {
        return response.data.data.map(ticker => ({
          symbol: ticker.symbol,
          lastPrice: parseFloat(ticker.last),
          change24h: parseFloat(ticker.chgUtc),
          changePercent24h: parseFloat(ticker.priceChangePercent),
          high24h: parseFloat(ticker.high24h),
          low24h: parseFloat(ticker.low24h),
          volume24h: parseFloat(ticker.baseVolume),
          quoteVolume24h: parseFloat(ticker.quoteVolume),
          openPrice: parseFloat(ticker.openUtc),
          bidPrice: parseFloat(ticker.bestBid),
          askPrice: parseFloat(ticker.bestAsk),
          timestamp: parseInt(ticker.timestamp)
        }));
      } else {
        throw new Error(`API錯誤: ${response.data.msg || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`獲取ticker失敗: ${error.response.status} - ${error.response.data?.msg || error.message}`);
      }
      throw error;
    }
  }

  // 獲取特定交易對的ticker
  async getSymbolTicker(symbol, productType = 'umcbl') {
    const requestPath = `/api/mix/v1/market/ticker?symbol=${symbol}&productType=${productType}`;
    const headers = this.getHeaders('GET', requestPath);
    
    try {
      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        headers,
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data) {
        const ticker = response.data.data;
        return {
          symbol: ticker.symbol,
          lastPrice: parseFloat(ticker.lastPr),
          change24h: parseFloat(ticker.chgUtc),
          changePercent24h: parseFloat(ticker.chgUTC),
          high24h: parseFloat(ticker.high24h),
          low24h: parseFloat(ticker.low24h),
          volume24h: parseFloat(ticker.baseVolume),
          quoteVolume24h: parseFloat(ticker.quoteVolume),
          timestamp: parseInt(ticker.ts)
        };
      } else {
        throw new Error(`API錯誤: ${response.data.msg || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`獲取${symbol}ticker失敗: ${error.response.status} - ${error.response.data?.msg || error.message}`);
      }
      throw error;
    }
  }

  // 測試API連接
  async testConnection() {
    try {
      // 使用logger記錄，console在logger中處理
      
      // 測試獲取服務器時間（公開API，不需要簽名）
      const timeResponse = await axios.get(`${this.baseUrl}/api/spot/v1/public/time`, {
        timeout: 5000
      });
      
      if (timeResponse.data.code === '00000') {
        // 使用logger記錄，console在logger中處理
        // 使用logger記錄，console在logger中處理
        return true;
      } else {
        throw new Error('API響應異常');
      }
    } catch (error) {
      // 使用logger記錄，console在logger中處理
      return false;
    }
  }

  // 獲取合約開倉量(Open Interest) - 使用V2 API (修復版)
  async getOpenInterest(symbol, productType = 'umcbl') {
    try {
      // 產品類型映射 - 根據官方文檔修正
      const productTypeMap = {
        'umcbl': 'usdt-futures',
        'dmcbl': 'coin-futures',
        'cmcbl': 'usdc-futures'
      };
      
      const mappedProductType = productTypeMap[productType] || 'usdt-futures';
      
      // 根據官方文檔修正API路徑格式
      const requestPath = `/api/v2/mix/market/open-interest`;
      const params = new URLSearchParams({
        symbol: symbol,
        productType: mappedProductType
      });
      
      const response = await axios.get(`${this.baseUrl}${requestPath}?${params}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data) {
        const data = response.data.data;
        
        // 根據官方API文檔，直接處理返回的數據結構
        return {
          symbol: symbol,
          openInterest: parseFloat(data.size) || 0,
          openInterestUsd: parseFloat(data.amount) || 0, // amount字段為美元價值
          timestamp: parseInt(data.ts) || Date.now()
        };
      } else {
        // 如果API返回錯誤，記錄詳細信息
        console.warn(`⚠️ ${symbol} 開倉量API返回: ${response.data.msg || 'No data'}`);
        return {
          symbol: symbol,
          openInterest: 0,
          openInterestUsd: 0,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      if (error.response) {
        console.warn(`⚠️ 獲取${symbol}開倉量失敗: ${error.response.status} - ${error.response.data?.msg || error.message}`);
        // 不再拋出錯誤，而是返回默認值以保持程序運行
        return {
          symbol: symbol,
          openInterest: 0,
          openInterestUsd: 0,
          timestamp: Date.now()
        };
      }
      throw error;
    }
  }

  // 獲取資金費率 - 使用V2 API (修復版)
  async getFundingRate(symbol, productType = 'umcbl') {
    try {
      // 產品類型映射
      const productTypeMap = {
        'umcbl': 'usdt-futures',
        'dmcbl': 'coin-futures', 
        'cmcbl': 'usdc-futures'
      };
      
      const mappedProductType = productTypeMap[productType] || 'usdt-futures';
      
      // 根據官方文檔修正API路徑格式
      const requestPath = `/api/v2/mix/market/current-fund-rate`;
      const params = new URLSearchParams({
        symbol: symbol,
        productType: mappedProductType
      });
      
      const response = await axios.get(`${this.baseUrl}${requestPath}?${params}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data) {
        const data = response.data.data;
        
        // V2 API返回的數據格式處理
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          return {
            symbol: symbol,
            fundingRate: parseFloat(item.fundingRate) || 0,
            nextFundingTime: parseInt(item.nextUpdate) || 0,
            timestamp: Date.now()
          };
        } else if (data && typeof data === 'object') {
          // 處理單一對象格式
          return {
            symbol: symbol,
            fundingRate: parseFloat(data.fundingRate) || 0,
            nextFundingTime: parseInt(data.nextUpdate) || 0,
            timestamp: Date.now()
          };
        }
        
        // 如果沒有數據，記錄警告並返回默認值
        console.warn(`⚠️ ${symbol} 資金費率API無數據`);
        return {
          symbol: symbol,
          fundingRate: 0,
          nextFundingTime: 0,
          timestamp: Date.now()
        };
      } else {
        console.warn(`⚠️ ${symbol} 資金費率API返回: ${response.data.msg || 'No data'}`);
        return {
          symbol: symbol,
          fundingRate: 0,
          nextFundingTime: 0,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      if (error.response) {
        console.warn(`⚠️ 獲取${symbol}資金費率失敗: ${error.response.status} - ${error.response.data?.msg || error.message}`);
        // 不再拋出錯誤，而是返回默認值以保持程序運行
        return {
          symbol: symbol,
          fundingRate: 0,
          nextFundingTime: 0,
          timestamp: Date.now()
        };
      }
      throw error;
    }
  }

  // 批量獲取所有合約的開倉量 - 通過逐個獲取實現
  async getAllOpenInterest(productType = 'umcbl') {
    try {
      // 先獲取所有合約
      const contracts = await this.getSymbolsByProductType(productType);
      const openInterestData = [];
      
      // 使用logger記錄，console在logger中處理
      
      // 分批處理，每批10個合約
      const batchSize = 10;
      for (let i = 0; i < contracts.length; i += batchSize) {
        const batch = contracts.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (contract) => {
          try {
            const data = await this.getOpenInterest(contract.symbol, productType);
            return data;
          } catch (error) {
            // 使用logger記錄，console在logger中處理
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        openInterestData.push(...batchResults.filter(result => result !== null));
        
        // 批次間延遲，避免API限制
        if (i + batchSize < contracts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // 使用logger記錄，console在logger中處理
      }
      
      // 使用logger記錄，console在logger中處理
      return openInterestData;
      
    } catch (error) {
      throw new Error(`批量獲取開倉量失敗: ${error.message}`);
    }
  }

  // 獲取交易對的市場數據（包含市值信息）
  async getMarketData(symbol, productType = 'umcbl') {
    try {
      // 使用ticker API獲取價格和交易量信息
      const requestPath = `/api/v2/mix/market/ticker?symbol=${symbol}&productType=${productType === 'umcbl' ? 'usdt-futures' : productType}`;
      
      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data && response.data.data.length > 0) {
        const ticker = response.data.data[0];
        
        // 計算市值（使用24小時交易量作為流動性指標）
        const price = parseFloat(ticker.lastPr) || 0;
        const volume24h = parseFloat(ticker.baseVolume) || 0;
        const quoteVolume24h = parseFloat(ticker.quoteVolume) || 0;
        
        return {
          symbol: symbol,
          price: price,
          volume24h: volume24h,
          quoteVolume24h: quoteVolume24h,
          marketCap: quoteVolume24h, // 使用24h交易額作為市值指標
          change24h: parseFloat(ticker.chgUtc) || 0,
          changePercent24h: parseFloat(ticker.priceChangePercent) || 0,
          timestamp: parseInt(ticker.ts) || Date.now()
        };
      } else {
        // 如果沒有數據，返回默認值
        return {
          symbol: symbol,
          price: 0,
          volume24h: 0,
          quoteVolume24h: 0,
          marketCap: 0,
          change24h: 0,
          changePercent24h: 0,
          timestamp: Date.now()
        };
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`獲取${symbol}市場數據失敗: ${error.response.status} - ${error.response.data?.msg || error.message}`);
      }
      throw error;
    }
  }

  // 測試認證 - 使用更簡單的端點
  async testAuth() {
    try {
      // 使用logger記錄，console在logger中處理
      
      // 測試獲取API信息（較少權限要求）
      const requestPath = '/api/spot/v1/account/getInfo';
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        headers,
        timeout: 10000
      });

      if (response.data.code === '00000') {
        // 使用logger記錄，console在logger中處理
        // 使用logger記錄，console在logger中處理
        return true;
      } else {
        throw new Error(`認證失敗: ${response.data.msg}`);
      }
    } catch (error) {
      // 使用logger記錄，console在logger中處理
      
      // 如果失敗，嘗試其他端點
      try {
        // 使用logger記錄，console在logger中處理
        const altRequestPath = '/api/spot/v1/account/assets';
        const altHeaders = this.getHeaders('GET', altRequestPath);
        
        const altResponse = await axios.get(`${this.baseUrl}${altRequestPath}`, {
          headers: altHeaders,
          timeout: 10000
        });

        if (altResponse.data.code === '00000') {
          // 使用logger記錄，console在logger中處理
          return true;
        }
      } catch (altError) {
        // 使用logger記錄，console在logger中處理
      }
      
      return false;
    }
  }
  // 獲取K線數據
  async getKline(symbol, productType = 'umcbl', granularity = '15m', limit = 100) {
    try {
      const requestPath = `/api/v2/mix/market/candles`;
      const params = new URLSearchParams({
        symbol: symbol,
        productType: productType,
        granularity: granularity,
        limit: limit.toString()
      });
      
      const response = await axios.get(`${this.baseUrl}${requestPath}?${params}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(`獲取K線數據失敗: ${response.data.msg}`);
      }
    } catch (error) {
      // 使用logger記錄，console在logger中處理
      throw error;
    }
  }

  // 獲取單個交易對的ticker數據
  async getTicker(symbol, productType = 'umcbl') {
    try {
      // 產品類型映射
      const productTypeMap = {
        'umcbl': 'usdt-futures',
        'dmcbl': 'coin-futures',
        'cmcbl': 'usdc-futures'
      };
      
      const mappedProductType = productTypeMap[productType] || 'usdt-futures';
      
      const requestPath = `/api/v2/mix/market/ticker`;
      const params = new URLSearchParams({
        symbol: symbol,
        productType: mappedProductType
      });
      
      const response = await axios.get(`${this.baseUrl}${requestPath}?${params}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data && response.data.data.length > 0) {
        return response.data.data[0];
      } else {
        return null;
      }
    } catch (error) {
      // 使用logger記錄，console在logger中處理
      return null;
    }
  }

  // 獲取所有合約
  async getAllContracts(productType = 'umcbl') {
    try {
      // 產品類型映射
      const productTypeMap = {
        'umcbl': 'usdt-futures',
        'dmcbl': 'coin-futures',
        'cmcbl': 'usdc-futures'
      };
      
      const mappedProductType = productTypeMap[productType] || 'usdt-futures';
      
      const requestPath = `/api/v2/mix/market/contracts`;
      const params = new URLSearchParams({
        productType: mappedProductType
      });
      
      const response = await axios.get(`${this.baseUrl}${requestPath}?${params}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(`獲取合約列表失敗: ${response.data.msg}`);
      }
    } catch (error) {
      // 使用logger記錄，console在logger中處理
      throw error;
    }
  }
}

module.exports = BitgetApi;
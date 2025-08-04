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
      console.log('📊 獲取Bitget所有現貨交易對...');
      
      // 使用現貨API端點
      const requestPath = '/api/spot/v1/public/products';
      
      try {
        console.log('📡 使用公開API獲取現貨交易對...');
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

          console.log(`🎯 總共獲取到 ${allSymbols.length} 個現貨交易對`);
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
      console.error('❌ 獲取現貨交易對失敗:', error);
      throw error;
    }
  }

  // 獲取所有合約交易對（保留原方法作為備用）
  async getAllContractSymbols() {
    try {
      console.log('📊 獲取Bitget所有合約交易對...');
      const allSymbols = [];
      
      // 遍歷所有產品類型
      for (const productType of this.config.productTypes) {
        try {
          const symbols = await this.getSymbolsByProductType(productType);
          allSymbols.push(...symbols);
          console.log(`✅ 獲取到 ${productType} 類型的 ${symbols.length} 個交易對`);
        } catch (error) {
          console.warn(`⚠️ 獲取 ${productType} 交易對失敗:`, error.message);
        }
      }

      console.log(`🎯 總共獲取到 ${allSymbols.length} 個交易對`);
      return allSymbols;
      
    } catch (error) {
      console.error('❌ 獲取交易對失敗:', error);
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
      
      console.log(`📡 嘗試V2 API獲取 ${productType} (${mappedProductType}) 交易對...`);
      
      // 使用V2 API
      const v2RequestPath = `/api/v2/mix/market/contracts?productType=${mappedProductType}`;
      
      const v2Response = await axios.get(`${this.baseUrl}${v2RequestPath}`, {
        timeout: 10000
      });

      if (v2Response.data.code === '00000' && v2Response.data.data) {
        console.log(`✅ V2 API成功獲取 ${v2Response.data.data.length} 個合約`);
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
      console.log(`⚠️ V2 API失敗: ${v2Error.response?.data?.msg || v2Error.message}`);
    }
    
    try {
      console.log(`📡 嘗試V1 API獲取 ${productType} 交易對...`);
      
      const v1RequestPath = `/api/mix/v1/market/contracts?productType=${productType}`;
      
      const response = await axios.get(`${this.baseUrl}${v1RequestPath}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data) {
        console.log(`✅ V1 API成功獲取 ${response.data.data.length} 個合約`);
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
      console.log(`📊 獲取 ${productType} ticker數據...`);
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
      console.log('🔧 測試Bitget API連接...');
      
      // 測試獲取服務器時間（公開API，不需要簽名）
      const timeResponse = await axios.get(`${this.baseUrl}/api/spot/v1/public/time`, {
        timeout: 5000
      });
      
      if (timeResponse.data.code === '00000') {
        console.log('✅ Bitget API連接成功');
        console.log('🕐 服務器時間:', new Date(parseInt(timeResponse.data.data)));
        return true;
      } else {
        throw new Error('API響應異常');
      }
    } catch (error) {
      console.error('❌ Bitget API連接失敗:', error.message);
      return false;
    }
  }

  // 獲取合約開倉量(Open Interest) - 使用V2 API
  async getOpenInterest(symbol, productType = 'umcbl') {
    try {
      // 產品類型映射
      const productTypeMap = {
        'umcbl': 'usdt-futures',
        'dmcbl': 'coin-futures',
        'cmcbl': 'usdc-futures'
      };
      
      const mappedProductType = productTypeMap[productType] || productType;
      
      // 使用V2 API
      let requestPath = `/api/v2/mix/market/open-interest?symbol=${symbol}&productType=${mappedProductType}`;
      
      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data) {
        const data = response.data.data;
        
        // V2 API返回的数据格式
        if (data.openInterestList && data.openInterestList.length > 0) {
          const item = data.openInterestList[0];
          return {
            symbol: symbol,
            openInterest: parseFloat(item.size) || 0,
            openInterestUsd: parseFloat(item.size) || 0, // 对于USDT合约，名义值等于美元值
            timestamp: parseInt(data.ts) || Date.now()
          };
        }
        
        // 如果没有openInterestList，返回空数据
        return {
          symbol: symbol,
          openInterest: 0,
          openInterestUsd: 0,
          timestamp: Date.now()
        };
      } else {
        throw new Error(`API錯誤: ${response.data.msg || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`獲取${symbol}開倉量失敗: ${error.response.status} - ${error.response.data?.msg || error.message}`);
      }
      throw error;
    }
  }

  // 獲取資金費率 - 使用V2 API
  async getFundingRate(symbol, productType = 'umcbl') {
    try {
      // 產品類型映射
      const productTypeMap = {
        'umcbl': 'usdt-futures',
        'dmcbl': 'coin-futures', 
        'cmcbl': 'usdc-futures'
      };
      
      const mappedProductType = productTypeMap[productType] || productType;
      
      // 使用V2 API
      let requestPath = `/api/v2/mix/market/current-fund-rate?symbol=${symbol}&productType=${mappedProductType}`;
      
      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        timeout: 10000
      });

      if (response.data.code === '00000' && response.data.data) {
        const data = response.data.data;
        
        // V2 API返回的数据格式（数组格式）
        if (Array.isArray(data) && data.length > 0) {
          const item = data[0];
          return {
            symbol: symbol,
            fundingRate: parseFloat(item.fundingRate) || 0,
            nextFundingTime: parseInt(item.nextUpdate) || 0,
            timestamp: Date.now()
          };
        }
        
        // 如果没有数据，返回空数据
        return {
          symbol: symbol,
          fundingRate: 0,
          nextFundingTime: 0,
          timestamp: Date.now()
        };
      } else {
        throw new Error(`API錯誤: ${response.data.msg || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.response) {
        throw new Error(`獲取${symbol}資金費率失敗: ${error.response.status} - ${error.response.data?.msg || error.message}`);
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
      
      console.log(`📊 批量獲取 ${contracts.length} 個合約的開倉量數據...`);
      
      // 分批處理，每批10個合約
      const batchSize = 10;
      for (let i = 0; i < contracts.length; i += batchSize) {
        const batch = contracts.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (contract) => {
          try {
            const data = await this.getOpenInterest(contract.symbol, productType);
            return data;
          } catch (error) {
            console.warn(`⚠️ 獲取 ${contract.symbol} 開倉量失敗:`, error.message);
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        openInterestData.push(...batchResults.filter(result => result !== null));
        
        // 批次間延遲，避免API限制
        if (i + batchSize < contracts.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log(`📈 已獲取 ${openInterestData.length} 個開倉量數據`);
      }
      
      console.log(`✅ 成功獲取 ${openInterestData.length} 個開倉量數據`);
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
      console.log('🔐 測試API認證...');
      
      // 測試獲取API信息（較少權限要求）
      const requestPath = '/api/spot/v1/account/getInfo';
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await axios.get(`${this.baseUrl}${requestPath}`, {
        headers,
        timeout: 10000
      });

      if (response.data.code === '00000') {
        console.log('✅ API認證成功');
        console.log('📊 用戶ID:', response.data.data?.userId || 'N/A');
        return true;
      } else {
        throw new Error(`認證失敗: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('❌ API認證失敗:', error.response?.data?.msg || error.message);
      
      // 如果失敗，嘗試其他端點
      try {
        console.log('🔄 嘗試替代認證端點...');
        const altRequestPath = '/api/spot/v1/account/assets';
        const altHeaders = this.getHeaders('GET', altRequestPath);
        
        const altResponse = await axios.get(`${this.baseUrl}${altRequestPath}`, {
          headers: altHeaders,
          timeout: 10000
        });

        if (altResponse.data.code === '00000') {
          console.log('✅ 替代端點認證成功');
          return true;
        }
      } catch (altError) {
        console.log('⚠️ 替代端點也失敗');
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
      console.error(`❌ 獲取${symbol} K線數據失敗:`, error.response?.data?.msg || error.message);
      throw error;
    }
  }

  // 獲取單個交易對的ticker數據
  async getTicker(symbol, productType = 'umcbl') {
    try {
      const requestPath = `/api/v2/mix/market/ticker`;
      const params = new URLSearchParams({
        symbol: symbol,
        productType: productType
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
      console.error(`❌ 獲取${symbol} ticker數據失敗:`, error.response?.data?.msg || error.message);
      return null;
    }
  }

  // 獲取所有合約
  async getAllContracts(productType = 'umcbl') {
    try {
      const requestPath = `/api/v2/mix/market/contracts`;
      const params = new URLSearchParams({
        productType: productType
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
      console.error(`❌ 獲取合約列表失敗:`, error.response?.data?.msg || error.message);
      throw error;
    }
  }
}

module.exports = BitgetApi;
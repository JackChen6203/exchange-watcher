const axios = require('axios');

async function testBitgetOpenInterest() {
    console.log('🔍 直接測試Bitget Open Interest API...');
    
    // 測試不同的API端點
    const testCases = [
        {
            name: 'V2 Open Interest API (無認證)',
            url: 'https://api.bitget.com/api/v2/mix/market/open-interest',
            params: { symbol: 'BTCUSDT', productType: 'usdt-futures' }
        },
        {
            name: 'V1 Open Interest API (無認證)',  
            url: 'https://api.bitget.com/api/mix/v1/market/open-interest',
            params: { symbol: 'BTCUSDT', productType: 'umcbl' }
        },
        {
            name: 'V2 Open Interest - All Contracts',
            url: 'https://api.bitget.com/api/v2/mix/market/open-interest',
            params: { productType: 'usdt-futures' }
        }
    ];
    
    for (const test of testCases) {
        console.log(`\n📊 測試: ${test.name}`);
        console.log(`URL: ${test.url}`);
        console.log(`參數:`, test.params);
        
        try {
            const params = new URLSearchParams(test.params);
            const response = await axios.get(`${test.url}?${params}`, {
                timeout: 10000
            });
            
            console.log(`✅ 狀態碼: ${response.status}`);
            console.log(`✅ 響應碼: ${response.data.code}`);
            console.log(`✅ 消息: ${response.data.msg || 'OK'}`);
            
            if (response.data.data) {
                if (Array.isArray(response.data.data)) {
                    console.log(`✅ 數據數量: ${response.data.data.length}`);
                    if (response.data.data.length > 0) {
                        console.log('📋 範例數據:', response.data.data.slice(0, 2));
                    }
                } else {
                    console.log('✅ 單一數據:', response.data.data);
                }
            } else {
                console.log('⚠️ 沒有數據字段');
            }
            
        } catch (error) {
            console.log(`❌ 錯誤: ${error.message}`);
            if (error.response) {
                console.log(`❌ 狀態碼: ${error.response.status}`);
                console.log(`❌ 響應:`, error.response.data);
            }
        }
    }
    
    // 測試獲取所有合約然後獲取Open Interest
    console.log('\n🔍 測試獲取所有合約列表...');
    try {
        const contractsResponse = await axios.get('https://api.bitget.com/api/v2/mix/market/contracts?productType=usdt-futures');
        const contracts = contractsResponse.data.data || [];
        console.log(`✅ 獲取到 ${contracts.length} 個合約`);
        
        if (contracts.length > 0) {
            console.log('📋 前5個合約:', contracts.slice(0, 5).map(c => c.symbol));
            
            // 測試前3個合約的Open Interest
            console.log('\n💰 測試前3個合約的Open Interest...');
            for (let i = 0; i < Math.min(3, contracts.length); i++) {
                const symbol = contracts[i].symbol;
                console.log(`\n📈 測試 ${symbol}...`);
                
                try {
                    const oiResponse = await axios.get(`https://api.bitget.com/api/v2/mix/market/open-interest?symbol=${symbol}&productType=usdt-futures`);
                    console.log('✅ Open Interest響應:', oiResponse.data);
                } catch (oiError) {
                    console.log('❌ Open Interest錯誤:', oiError.response?.data || oiError.message);
                }
                
                // 避免頻率限制
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
    } catch (error) {
        console.log('❌ 獲取合約列表失敗:', error.response?.data || error.message);
    }
}

// 執行測試
testBitgetOpenInterest().catch(console.error);
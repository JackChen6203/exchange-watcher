const config = require('./src/config/config');
const BitgetApi = require('./src/services/bitgetApi');

async function debugRealApi() {
    console.log('🔍 調試真實Bitget API調用...');
    
    // 檢查配置
    console.log('📋 檢查API配置...');
    console.log('Base URL:', config.api.baseUrl);
    console.log('API Key存在:', !!config.api.key);
    console.log('Secret存在:', !!config.api.secret);
    console.log('Passphrase存在:', !!config.api.passphrase);
    
    const api = new BitgetApi(config);
    
    try {
        // 1. 測試基本連接
        console.log('\n🔗 測試API連接...');
        const connectionTest = await api.testConnection();
        console.log('連接測試結果:', connectionTest);
        
        // 2. 測試獲取合約列表
        console.log('\n📊 測試獲取合約列表...');
        const contracts = await api.getAllContracts('umcbl');
        console.log('合約數量:', contracts.length);
        console.log('前5個合約:', contracts.slice(0, 5).map(c => c.symbol));
        
        if (contracts.length === 0) {
            console.log('❌ 沒有獲取到合約，檢查API權限');
            return;
        }
        
        // 3. 測試獲取單個Open Interest
        console.log('\n💰 測試獲取單個持倉量...');
        const symbol = contracts[0].symbol;
        console.log('測試交易對:', symbol);
        
        const openInterest = await api.getOpenInterest(symbol, 'umcbl');
        console.log('持倉量數據:', openInterest);
        
        // 4. 測試獲取資金費率
        console.log('\n💸 測試獲取資金費率...');
        const fundingRate = await api.getFundingRate(symbol, 'umcbl');
        console.log('資金費率數據:', fundingRate);
        
        // 5. 測試批量獲取
        console.log('\n📈 測試批量獲取持倉量 (前10個)...');
        const testContracts = contracts.slice(0, 10);
        const batchResults = [];
        
        for (const contract of testContracts) {
            try {
                const oi = await api.getOpenInterest(contract.symbol, 'umcbl');
                if (oi.openInterestUsd > 0) {
                    batchResults.push(oi);
                }
            } catch (error) {
                console.log(`⚠️ ${contract.symbol} 失敗:`, error.message);
            }
            
            // 避免頻率限制
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('成功獲取的持倉量數據:', batchResults.length);
        if (batchResults.length > 0) {
            console.log('範例數據:', batchResults.slice(0, 3));
            
            // 6. 測試數據處理
            console.log('\n🧮 測試數據處理和排序...');
            const sortedByOI = batchResults
                .sort((a, b) => b.openInterestUsd - a.openInterestUsd)
                .slice(0, 5);
            
            console.log('持倉量最高的5個交易對:');
            sortedByOI.forEach((item, index) => {
                console.log(`${index + 1}. ${item.symbol}: $${(item.openInterestUsd / 1000000).toFixed(2)}M`);
            });
        }
        
    } catch (error) {
        console.error('❌ API測試失敗:', error);
        console.error('錯誤詳情:', error.response?.data || error.message);
    }
}

// 執行調試
debugRealApi().catch(console.error);
const WebSocket = require('ws');

async function testBitgetWebSocket() {
  console.log('🧪 測試Bitget WebSocket基本連接...');
  
  // 嘗試現貨WebSocket端點
  const ws = new WebSocket('wss://ws.bitget.com/spot/v1/stream');
  
  ws.on('open', () => {
    console.log('✅ WebSocket連接成功');
    
    // 測試訂閱幾個主要交易對 - 使用正確的格式
    const subscribeMessage = {
      op: 'subscribe',
      args: [
        {
          instType: 'sp',
          channel: 'ticker',
          instId: 'BTCUSDT'
        },
        {
          instType: 'sp', 
          channel: 'ticker',
          instId: 'ETHUSDT'
        }
      ]
    };
    
    console.log('📡 發送訂閱請求:', JSON.stringify(subscribeMessage, null, 2));
    ws.send(JSON.stringify(subscribeMessage));
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📩 收到消息:', JSON.stringify(message, null, 2));
    } catch (error) {
      console.error('❌ 解析消息失敗:', error);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket錯誤:', error);
  });
  
  ws.on('close', () => {
    console.log('📴 WebSocket連接關閉');
  });
  
  // 10秒後關閉測試
  setTimeout(() => {
    console.log('🏁 測試完成，關閉連接');
    ws.close();
    process.exit(0);
  }, 10000);
}

testBitgetWebSocket().catch(console.error);
1.請修復錯誤
文件請參考 https://www.bitget.com/api-doc/contract/market/Get-Open-Interest ,錯誤請參考  C:\Users\solidityDeveloper\crypto-exchange-monitor\err.md
2.每15分鐘發一次訊息 排行目前的 持倉異動(應有15分版,1小時,4小時,日線)包含正異動與負異動,資金費率(正,負) 都排出前15名
3.目前commandline中印出的訊息 印在log中即可
4.你可以用本地數據庫儲存 或是redis儲存數據 以利分析判斷 請告訴我該如何設置
5.請補完測試,並且在完成後請推上 git ,git位置 https://github.com/Davis1233798/exchange_monitor.git ,並完成完整devops步驟
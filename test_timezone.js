// 測試時區設置
console.log('🕐 時區設置測試');

// 設置環境變數
process.env.TZ = 'Asia/Shanghai';

console.log('\n📍 系統時區信息:');
console.log('系統時區 (process.env.TZ):', process.env.TZ);
console.log('系統時區 (Intl):', Intl.DateTimeFormat().resolvedOptions().timeZone);

console.log('\n🕐 時間顯示測試:');
const now = new Date();

console.log('ISO時間:', now.toISOString());
console.log('本地時間 (默認):', now.toLocaleString());
console.log('中國時間 (zh-CN):', now.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}));
console.log('台灣時間 (zh-TW):', now.toLocaleString('zh-TW', {timeZone: 'Asia/Taipei'}));

console.log('\n📊 Discord消息格式測試:');
const testEmbed = {
    title: '🧪 時區測試',
    description: `測試消息 - ${now.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`,
    fields: [
        {
            name: '北京時間',
            value: now.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}),
            inline: true
        },
        {
            name: '系統時間',
            value: now.toLocaleString(),
            inline: true
        },
        {
            name: 'UTC時間',
            value: now.toUTCString(),
            inline: true
        }
    ]
};

console.log('Discord Embed預覽:');
console.log('標題:', testEmbed.title);
console.log('描述:', testEmbed.description);
testEmbed.fields.forEach(field => {
    console.log(`${field.name}: ${field.value}`);
});

console.log('\n⏰ 時間格式選項測試:');
const timeOptions = [
    { 
        locale: 'zh-CN', 
        options: { 
            timeZone: 'Asia/Shanghai',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }
    },
    {
        locale: 'zh-CN',
        options: {
            timeZone: 'Asia/Shanghai',
            dateStyle: 'short',
            timeStyle: 'medium'
        }
    }
];

timeOptions.forEach((option, index) => {
    console.log(`格式 ${index + 1}:`, now.toLocaleString(option.locale, option.options));
});

console.log('\n✅ 時區測試完成');
console.log('🎯 建議使用格式:', now.toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'}));
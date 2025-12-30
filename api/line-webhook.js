// LINE API - Webhook & Push Messages Serverless Function

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

// 問候語陣列
const greetings = [
    '💝 感謝您對長輩的關心與愛護！',
    '🌸 願長輩身體健康、平安喜樂！',
    '💖 家人的關愛是最好的良藥！',
    '🍀 祝福長輩每天都有好心情！',
    '🌷 您的關心讓長輩倍感溫暖！'
];

// 日期格式化函數
function formatDateDisplay(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${month}/${day}`;
    } catch (e) {
        return dateStr;
    }
}

// 產生血壓圖表 URL
function generateBPChartUrl(records, elderName) {
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14);
    const labels = sortedRecords.map(r => {
        const date = new Date(r.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const systolicData = sortedRecords.map(r => parseInt(r.systolic) || null);
    const diastolicData = sortedRecords.map(r => parseInt(r.diastolic) || null);

    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: '收縮壓', data: systolicData, borderColor: '#e74c3c', fill: false, tension: 0.3 },
                { label: '舒張壓', data: diastolicData, borderColor: '#3498db', fill: false, tension: 0.3 }
            ]
        },
        options: {
            plugins: { title: { display: true, text: `${elderName} - 血壓趨勢圖` } },
            scales: { y: { min: 40, max: 180 } }
        }
    };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=400&bkg=white`;
}

// 產生體溫圖表 URL  
function generateTempChartUrl(records, elderName) {
    const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14);
    const labels = sortedRecords.map(r => {
        const date = new Date(r.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const tempData = sortedRecords.map(r => parseFloat(r.temperature) || null);

    const chartConfig = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{ label: '體溫', data: tempData, borderColor: '#f39c12', fill: true, tension: 0.3 }]
        },
        options: {
            plugins: { title: { display: true, text: `${elderName} - 體溫趨勢圖` } },
            scales: { y: { min: 35, max: 40 } }
        }
    };
    return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=600&h=300&bkg=white`;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method === 'GET') return res.status(200).json({ status: 'LINE API is ready' });
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const { action, userId, elderName, records, healthData, events } = req.body;

        // ========== 發送帶圖表的健康報告 ==========
        if (action === 'send-health-report-with-chart') {
            if (!userId || !elderName || !records?.length) {
                return res.status(400).json({ error: '缺少必要資料' });
            }

            const greeting = greetings[Math.floor(Math.random() * greetings.length)];
            const validBPRecords = records.filter(r => r.systolic && r.diastolic);
            const validTempRecords = records.filter(r => r.temperature);

            const avgSystolic = validBPRecords.length ? Math.round(validBPRecords.reduce((s, r) => s + parseInt(r.systolic), 0) / validBPRecords.length) : 0;
            const avgDiastolic = validBPRecords.length ? Math.round(validBPRecords.reduce((s, r) => s + parseInt(r.diastolic), 0) / validBPRecords.length) : 0;
            const avgTemp = validTempRecords.length ? (validTempRecords.reduce((s, r) => s + parseFloat(r.temperature), 0) / validTempRecords.length).toFixed(1) : 0;
            const latestRecord = records[0];

            let message = `${greeting}\n\n📊 ${elderName} 健康報告\n━━━━━━━━━━━━━\n`;
            message += `📅 期間：${records[records.length - 1]?.date || ''} ~ ${records[0]?.date || ''}\n`;
            message += `📋 共 ${records.length} 筆紀錄\n\n📈 平均數據\n`;
            if (avgSystolic && avgDiastolic) message += `   血壓：${avgSystolic}/${avgDiastolic} mmHg\n`;
            if (avgTemp) message += `   體溫：${avgTemp}°C\n`;
            message += `\n📍 最新 (${latestRecord.date})\n`;
            if (latestRecord.systolic) message += `   血壓：${latestRecord.systolic}/${latestRecord.diastolic} mmHg\n`;
            if (latestRecord.temperature) message += `   體溫：${latestRecord.temperature}°C\n`;
            message += `\n━━━━━━━━━━━━━\n🏠 失智據點關心您`;

            const messages = [];
            if (validBPRecords.length) {
                messages.push({ type: 'image', originalContentUrl: generateBPChartUrl(records, elderName), previewImageUrl: generateBPChartUrl(records, elderName) });
            }
            if (validTempRecords.length) {
                messages.push({ type: 'image', originalContentUrl: generateTempChartUrl(records, elderName), previewImageUrl: generateTempChartUrl(records, elderName) });
            }
            messages.push({ type: 'text', text: message });

            const response = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
                body: JSON.stringify({ to: userId, messages: messages.slice(0, 5) })
            });

            if (!response.ok) {
                const error = await response.json();
                return res.status(500).json({ error: '發送 LINE 訊息失敗', details: error });
            }
            return res.json({ success: true, message: `已成功發送 ${records.length} 筆紀錄與圖表給家屬` });
        }

        // ========== 發送純文字健康報告 ==========
        if (action === 'send-health-report-batch') {
            if (!userId || !records?.length) return res.status(400).json({ error: '缺少必要資料' });

            const greeting = greetings[Math.floor(Math.random() * greetings.length)];
            let message = `${greeting}\n\n📊 健康紀錄報告\n━━━━━━━━━━━━━\n`;
            message += `👤 長者：${elderName}\n📅 期間：${records[records.length - 1]?.date || ''} ~ ${records[0]?.date || ''}\n━━━━━━━━━━━━━\n\n`;

            records.slice(0, 7).forEach(r => {
                message += `📅 ${r.date} ${r.time || ''}\n`;
                if (r.systolic) message += `   血壓：${r.systolic}/${r.diastolic}\n`;
                if (r.temperature) message += `   體溫：${r.temperature}°C\n`;
                message += `\n`;
            });
            if (records.length > 7) message += `...及其他 ${records.length - 7} 筆紀錄\n\n`;
            message += `━━━━━━━━━━━━━\n🏠 失智據點關心您`;

            const response = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
                body: JSON.stringify({ to: userId, messages: [{ type: 'text', text: message }] })
            });

            if (!response.ok) {
                const error = await response.json();
                return res.status(500).json({ error: '發送 LINE 訊息失敗', details: error });
            }
            return res.json({ success: true, message: `已成功發送 ${records.length} 筆紀錄給家屬` });
        }

        // ========== 發送 Flex Message 卡片 ==========
        if (action === 'send-flex-message') {
            if (!userId || !elderName || !records?.length) {
                return res.status(400).json({ error: '缺少必要資料' });
            }

            const validBPRecords = records.filter(r => r.systolic && r.diastolic);
            const validTempRecords = records.filter(r => r.temperature);

            // 找出最高和最低血壓紀錄
            let maxBPRecord = null;
            let minBPRecord = null;
            if (validBPRecords.length > 0) {
                maxBPRecord = validBPRecords.reduce((max, r) =>
                    parseInt(r.systolic) > parseInt(max.systolic) ? r : max, validBPRecords[0]);
                minBPRecord = validBPRecords.reduce((min, r) =>
                    parseInt(r.systolic) < parseInt(min.systolic) ? r : min, validBPRecords[0]);
            }

            // 計算異常次數
            const highBPCount = validBPRecords.filter(r => parseInt(r.systolic) >= 140 || parseInt(r.diastolic) >= 90).length;
            const lowBPCount = validBPRecords.filter(r => parseInt(r.systolic) < 90 || parseInt(r.diastolic) < 60).length;
            const feverCount = validTempRecords.filter(r => parseFloat(r.temperature) >= 37.5).length;
            const normalBPCount = validBPRecords.length - highBPCount - lowBPCount;

            const latestRecord = records[0];
            const startDate = formatDateDisplay(records[records.length - 1]?.date);
            const endDate = formatDateDisplay(records[0]?.date);
            const dateRange = `${startDate} ~ ${endDate}`;

            // 血壓狀態判斷
            const getBPStatus = (sys, dia) => {
                if (sys >= 140 || dia >= 90) return { text: '偏高', color: '#E74C3C' };
                if (sys < 90 || dia < 60) return { text: '偏低', color: '#3498DB' };
                return { text: '正常', color: '#27AE60' };
            };

            const maxBPStatus = maxBPRecord ? getBPStatus(parseInt(maxBPRecord.systolic), parseInt(maxBPRecord.diastolic)) : { text: '-', color: '#666666' };
            const minBPStatus = minBPRecord ? getBPStatus(parseInt(minBPRecord.systolic), parseInt(minBPRecord.diastolic)) : { text: '-', color: '#666666' };
            const latestBPStatus = getBPStatus(parseInt(latestRecord.systolic), parseInt(latestRecord.diastolic));

            // 趨勢分析
            const getTrend = () => {
                if (validBPRecords.length < 3) return '資料不足';
                const recent = validBPRecords.slice(0, 3);
                const older = validBPRecords.slice(-3);
                const recentAvg = recent.reduce((s, r) => s + parseInt(r.systolic), 0) / recent.length;
                const olderAvg = older.reduce((s, r) => s + parseInt(r.systolic), 0) / older.length;
                if (recentAvg < olderAvg - 5) return '📉 下降趨勢';
                if (recentAvg > olderAvg + 5) return '📈 上升趨勢';
                return '➡️ 穩定';
            };

            // Flex Message 結構
            const flexMessage = {
                type: 'flex',
                altText: `${elderName} 健康報告`,
                contents: {
                    type: 'bubble',
                    size: 'mega',
                    header: {
                        type: 'box',
                        layout: 'vertical',
                        backgroundColor: '#27AE60',
                        paddingAll: '20px',
                        contents: [
                            {
                                type: 'text',
                                text: '🏥 失智據點健康報告',
                                color: '#FFFFFF',
                                size: 'lg',
                                weight: 'bold'
                            },
                            {
                                type: 'text',
                                text: elderName,
                                color: '#FFFFFF',
                                size: 'xxl',
                                weight: 'bold',
                                margin: 'md'
                            },
                            {
                                type: 'text',
                                text: dateRange,
                                color: '#E8F8F5',
                                size: 'sm',
                                margin: 'sm'
                            }
                        ]
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        paddingAll: '20px',
                        spacing: 'lg',
                        contents: [
                            // 血壓極值區塊
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '📊 血壓統計', weight: 'bold', size: 'md', color: '#1A5276' },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        margin: 'lg',
                                        contents: [
                                            {
                                                type: 'box',
                                                layout: 'vertical',
                                                flex: 1,
                                                contents: [
                                                    { type: 'text', text: '🔴 最高紀錄', size: 'sm', color: '#666666' },
                                                    { type: 'text', text: maxBPRecord ? `${maxBPRecord.systolic}/${maxBPRecord.diastolic}` : '-', size: 'xl', weight: 'bold', color: maxBPStatus.color },
                                                    { type: 'text', text: maxBPRecord ? formatDateDisplay(maxBPRecord.date) : '', size: 'xs', color: '#999999' }
                                                ]
                                            },
                                            {
                                                type: 'box',
                                                layout: 'vertical',
                                                flex: 1,
                                                contents: [
                                                    { type: 'text', text: '🔵 最低紀錄', size: 'sm', color: '#666666' },
                                                    { type: 'text', text: minBPRecord ? `${minBPRecord.systolic}/${minBPRecord.diastolic}` : '-', size: 'xl', weight: 'bold', color: minBPStatus.color },
                                                    { type: 'text', text: minBPRecord ? formatDateDisplay(minBPRecord.date) : '', size: 'xs', color: '#999999' }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            { type: 'separator', color: '#E5E5E5' },
                            // 異常統計
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '⚠️ 本週異常次數', weight: 'bold', size: 'md', color: '#1A5276' },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        margin: 'md',
                                        contents: [
                                            { type: 'text', text: `🔴 高血壓 ${highBPCount} 次`, size: 'sm', flex: 1, color: highBPCount > 0 ? '#E74C3C' : '#999999' },
                                            { type: 'text', text: `🔵 低血壓 ${lowBPCount} 次`, size: 'sm', flex: 1, color: lowBPCount > 0 ? '#3498DB' : '#999999' }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        margin: 'sm',
                                        contents: [
                                            { type: 'text', text: `🟠 發燒 ${feverCount} 次`, size: 'sm', flex: 1, color: feverCount > 0 ? '#F39C12' : '#999999' },
                                            { type: 'text', text: `🟢 正常 ${normalBPCount} 次`, size: 'sm', flex: 1, color: '#27AE60' }
                                        ]
                                    }
                                ]
                            },
                            { type: 'separator', color: '#E5E5E5' },
                            // 最新紀錄
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '📍 最新紀錄', weight: 'bold', size: 'md', color: '#1A5276' },
                                    { type: 'text', text: `${formatDateDisplay(latestRecord.date)} ${latestRecord.time || ''}`, size: 'xs', color: '#999999', margin: 'sm' },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        margin: 'md',
                                        contents: [
                                            { type: 'text', text: '血壓', size: 'sm', color: '#666666', flex: 1 },
                                            { type: 'text', text: latestRecord.systolic ? `${latestRecord.systolic}/${latestRecord.diastolic} mmHg` : '-', size: 'sm', weight: 'bold', color: latestBPStatus.color, flex: 2 }
                                        ]
                                    },
                                    {
                                        type: 'box',
                                        layout: 'horizontal',
                                        margin: 'sm',
                                        contents: [
                                            { type: 'text', text: '體溫', size: 'sm', color: '#666666', flex: 1 },
                                            { type: 'text', text: latestRecord.temperature ? `${latestRecord.temperature}°C` : '-', size: 'sm', weight: 'bold', flex: 2 }
                                        ]
                                    }
                                ]
                            },
                            { type: 'separator', color: '#E5E5E5' },
                            // 趨勢分析
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '📈 血壓趨勢', size: 'sm', color: '#666666', flex: 1 },
                                    { type: 'text', text: getTrend(), size: 'sm', weight: 'bold', flex: 1, align: 'end' }
                                ]
                            }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        backgroundColor: '#F8F9FA',
                        paddingAll: '15px',
                        contents: [
                            { type: 'text', text: '🏠 失智據點關心您', size: 'sm', color: '#27AE60', align: 'center', weight: 'bold' },
                            { type: 'text', text: `共 ${records.length} 筆紀錄`, size: 'xs', color: '#999999', align: 'center', margin: 'sm' }
                        ]
                    }
                }
            };

            // 發送訊息
            const messages = [flexMessage];

            // 加入圖表
            if (validBPRecords.length > 0) {
                messages.push({ type: 'image', originalContentUrl: generateBPChartUrl(records, elderName), previewImageUrl: generateBPChartUrl(records, elderName) });
            }

            const response = await fetch('https://api.line.me/v2/bot/message/push', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
                body: JSON.stringify({ to: userId, messages: messages.slice(0, 5) })
            });

            if (!response.ok) {
                const error = await response.json();
                return res.status(500).json({ error: '發送 LINE 訊息失敗', details: error });
            }
            return res.json({ success: true, message: `已成功發送專業健康報告卡片給家屬` });
        }

        // ========== 排程批次發送報告 ==========
        if (action === 'scheduled-report') {
            // 驗證 cron secret（可選）
            const secret = req.query?.secret || req.body?.secret;
            const cronSecret = process.env.CRON_SECRET;

            // 如果設定了 CRON_SECRET，就需要驗證
            if (cronSecret && secret !== cronSecret) {
                return res.status(401).json({ error: '未授權的請求' });
            }

            const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';
            const results = { processed: 0, sent: 0, errors: [] };

            try {
                // 取得所有長者
                const eldersResponse = await fetch(`${GOOGLE_SCRIPT_URL}?action=getElders`);
                const eldersList = await eldersResponse.json();

                const today = new Date();
                const dayOfMonth = today.getDate();

                for (const elder of eldersList) {
                    if (!elder.familyLineId) continue;
                    results.processed++;

                    try {
                        // 取得該長者的健康紀錄
                        const healthResponse = await fetch(`${GOOGLE_SCRIPT_URL}?action=getHealthByElder&elder=${encodeURIComponent(elder.name)}`);
                        const healthRecords = await healthResponse.json();

                        if (!healthRecords || healthRecords.length === 0) continue;

                        // 篩選最近 14 天
                        const cutoff = new Date();
                        cutoff.setDate(cutoff.getDate() - 14);
                        const recentRecords = healthRecords.filter(r => new Date(r.date) >= cutoff);

                        if (recentRecords.length === 0) continue;

                        // 分析風險
                        const validBP = recentRecords.filter(r => r.systolic && r.diastolic);
                        const highBPCount = validBP.filter(r =>
                            parseInt(r.systolic) >= 140 || parseInt(r.diastolic) >= 90
                        ).length;
                        const isHighRisk = highBPCount >= 2;

                        // 判斷是否發送
                        let shouldSend = false;
                        if (dayOfMonth === 1) shouldSend = true; // 月初發送
                        if (isHighRisk && (dayOfMonth === 1 || dayOfMonth === 15)) shouldSend = true; // 高風險雙週

                        // 可透過參數強制發送（測試用）
                        if (req.body?.forceSend || req.query?.forceSend) shouldSend = true;

                        if (shouldSend) {
                            // 找最高最低血壓
                            let maxBP = validBP[0], minBP = validBP[0];
                            validBP.forEach(r => {
                                if (parseInt(r.systolic) > parseInt(maxBP.systolic)) maxBP = r;
                                if (parseInt(r.systolic) < parseInt(minBP.systolic)) minBP = r;
                            });

                            const normalCount = validBP.length - highBPCount;
                            const greeting = greetings[Math.floor(Math.random() * greetings.length)];

                            let message = `${greeting}\n\n`;
                            message += `📅 自動健康報告\n`;
                            message += `━━━━━━━━━━━━━\n`;
                            message += `👤 ${elder.name}\n`;
                            message += `📋 最近 ${recentRecords.length} 筆紀錄\n\n`;

                            if (maxBP && minBP) {
                                message += `📊 血壓統計\n`;
                                message += `🔴 最高：${maxBP.systolic}/${maxBP.diastolic} (${formatDateDisplay(maxBP.date)})\n`;
                                message += `🔵 最低：${minBP.systolic}/${minBP.diastolic} (${formatDateDisplay(minBP.date)})\n\n`;
                            }

                            message += `⚠️ 異常：高血壓 ${highBPCount} 次 | 正常 ${normalCount} 次\n\n`;
                            message += `━━━━━━━━━━━━━\n`;
                            message += `🏠 失智據點關心您`;

                            const sendResponse = await fetch('https://api.line.me/v2/bot/message/push', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
                                },
                                body: JSON.stringify({
                                    to: elder.familyLineId,
                                    messages: [{ type: 'text', text: message }]
                                })
                            });

                            if (sendResponse.ok) results.sent++;
                        }
                    } catch (err) {
                        results.errors.push(`${elder.name}: ${err.message}`);
                    }
                }

                return res.json({
                    success: true,
                    timestamp: new Date().toISOString(),
                    results
                });

            } catch (error) {
                return res.status(500).json({ error: error.message });
            }
        }

        // ========== 圖表預覽 ==========
        if (action === 'charts-preview') {
            if (!elderName || !records?.length) return res.status(400).json({ error: '缺少必要資料' });
            return res.json({
                success: true,
                charts: {
                    bloodPressure: generateBPChartUrl(records, elderName),
                    temperature: generateTempChartUrl(records, elderName)
                }
            });
        }

        // ========== LINE Webhook 事件處理 ==========
        if (events && Array.isArray(events)) {
            for (const event of events) {
                if (event.type === 'message' && event.message.type === 'text') {
                    const userId = event.source.userId;
                    const userMessage = event.message.text.trim().toLowerCase();
                    const replyToken = event.replyToken;

                    const idKeywords = ['我的id', '我的 id', 'id', 'myid', 'userid', 'user id', '查詢id'];
                    const isIdQuery = idKeywords.some(k => userMessage.includes(k));

                    if (isIdQuery && userId) {
                        await fetch('https://api.line.me/v2/bot/message/reply', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
                            body: JSON.stringify({
                                replyToken,
                                messages: [{ type: 'text', text: `👋 您好！\n\n您的 LINE User ID 是：\n\n📋 ${userId}\n\n請將此 ID 提供給據點工作人員。\n\n🏠 失智據點關心您` }]
                            })
                        });
                    } else if (['你好', '嗨', 'hi', 'hello'].includes(userMessage)) {
                        await fetch('https://api.line.me/v2/bot/message/reply', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
                            body: JSON.stringify({
                                replyToken,
                                messages: [{ type: 'text', text: `👋 您好！歡迎使用「據點健康通知」！\n\n輸入「我的ID」可取得您的 LINE ID。\n\n🏠 失智據點關心您` }]
                            })
                        });
                    }
                }

                if (event.type === 'follow') {
                    const userId = event.source.userId;
                    await fetch('https://api.line.me/v2/bot/message/reply', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
                        body: JSON.stringify({
                            replyToken: event.replyToken,
                            messages: [{ type: 'text', text: `🎉 感謝您加入「據點健康通知」！\n\n🔑 您的 LINE User ID 是：\n${userId}\n\n請將此 ID 提供給據點工作人員。\n\n🏠 失智據點關心您` }]
                        })
                    });
                }
            }
            return res.status(200).json({ success: true });
        }

        return res.status(200).json({ success: true, message: 'No action taken' });
    } catch (error) {
        console.error('LINE API 錯誤:', error);
        return res.status(200).json({ success: false, error: error.message });
    }
}


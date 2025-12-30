// LINE Messaging API 服務
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

/**
 * 發送 LINE 訊息給指定用戶
 * @param {string} userId - LINE User ID
 * @param {string} message - 要發送的訊息
 */
async function sendLineMessage(userId, message) {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
            to: userId,
            messages: [
                {
                    type: 'text',
                    text: message
                }
            ]
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`LINE API Error: ${JSON.stringify(error)}`);
    }

    return { success: true };
}

/**
 * 發送健康報告給家屬
 * @param {string} userId - 家屬 LINE User ID
 * @param {object} healthData - 健康資料
 */
async function sendHealthReport(userId, healthData) {
    const { elderName, date, time, systolic, diastolic, temperature, bpStatus, tempStatus, notes } = healthData;

    let message = `📋 健康紀錄通知\n`;
    message += `━━━━━━━━━━━━━\n`;
    message += `👤 長者：${elderName}\n`;
    message += `📅 日期：${date} ${time}\n`;
    message += `━━━━━━━━━━━━━\n`;

    if (systolic && diastolic) {
        const bpIcon = getBPIcon(bpStatus);
        message += `💓 血壓：${systolic}/${diastolic} mmHg ${bpIcon}\n`;
    }

    if (temperature) {
        const tempIcon = getTempIcon(tempStatus);
        message += `🌡️ 體溫：${temperature}°C ${tempIcon}\n`;
    }

    if (notes) {
        message += `📝 備註：${notes}\n`;
    }

    message += `━━━━━━━━━━━━━\n`;
    message += `來自：失智據點活動紀錄系統`;

    return sendLineMessage(userId, message);
}

function getBPIcon(status) {
    switch (status) {
        case '正常': return '🟢';
        case '偏高': return '🟡';
        case '高血壓': return '🔴';
        case '偏低': return '🔵';
        default: return '';
    }
}

function getTempIcon(status) {
    switch (status) {
        case '正常': return '🟢';
        case '微燒': return '🟡';
        case '發燒': return '🔴';
        case '偏低': return '🔵';
        default: return '';
    }
}

module.exports = { sendLineMessage, sendHealthReport };

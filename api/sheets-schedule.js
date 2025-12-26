// 從 Google Sheets 讀取每週課表 API
// Google Sheets ID: 1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc

const SHEET_ID = '1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc';

const getSheetCSV = (sheetName) => {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
};

const parseCSV = (csv) => {
    const lines = csv.split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = [];
        let current = '';
        let inQuotes = false;

        for (const char of lines[i]) {
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        data.push(row);
    }

    return data;
};

// 將扁平資料轉換為週課表結構
const transformToSchedule = (data, quarter) => {
    const schedule = {
        monday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
        tuesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
        wednesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
        thursday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
        friday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } }
    };

    // 週幾對應
    const dayMap = {
        '週一': 'monday', 'monday': 'monday', 'mon': 'monday',
        '週二': 'tuesday', 'tuesday': 'tuesday', 'tue': 'tuesday',
        '週三': 'wednesday', 'wednesday': 'wednesday', 'wed': 'wednesday',
        '週四': 'thursday', 'thursday': 'thursday', 'thu': 'thursday',
        '週五': 'friday', 'friday': 'friday', 'fri': 'friday'
    };

    // 時段對應
    const periodMap = {
        '上午': 'am', 'am': 'am', '早上': 'am', 'morning': 'am',
        '下午': 'pm', 'pm': 'pm', 'afternoon': 'pm'
    };

    data.forEach(row => {
        // 檢查是否為指定季度
        const rowQuarter = row['季度'] || row['quarter'] || '';
        if (quarter && rowQuarter && rowQuarter !== quarter) return;

        const dayKey = row['週幾'] || row['day'] || '';
        const periodKey = row['時段'] || row['period'] || '';

        const day = dayMap[dayKey.toLowerCase()];
        const period = periodMap[periodKey.toLowerCase()];

        if (day && period && schedule[day]) {
            schedule[day][period] = {
                topic: row['主題'] || row['topic'] || '',
                activityName: row['活動名稱'] || row['activityName'] || row['activity'] || '',
                materials: row['材料'] || row['materials'] || ''
            };
        }
    });

    return schedule;
};

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const quarter = req.query.quarter || '';

    try {
        const response = await fetch(getSheetCSV('每週課表'));

        if (!response.ok) {
            throw new Error('無法讀取 Google Sheets');
        }

        const csv = await response.text();
        const data = parseCSV(csv);
        const schedule = transformToSchedule(data, quarter);

        res.status(200).json({
            success: true,
            quarter: quarter,
            schedule: schedule,
            rawData: data // 也回傳原始資料供除錯
        });

    } catch (error) {
        console.error('讀取 Google Sheets 失敗:', error);

        // 如果找不到工作表，回傳空課表
        const emptySchedule = {
            monday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
            tuesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
            wednesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
            thursday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
            friday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } }
        };

        res.status(200).json({
            success: false,
            message: '尚未建立「每週課表」工作表，或工作表為空',
            quarter: quarter,
            schedule: emptySchedule,
            error: error.message
        });
    }
};

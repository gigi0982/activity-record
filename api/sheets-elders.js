// 從 Google Sheets 讀取長者名單 API
// Google Sheets ID: 1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc

const SHEET_ID = '1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc';

// 使用 Google Sheets 公開 CSV 格式
const getSheetCSV = (sheetName) => {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
};

// 解析 CSV
const parseCSV = (csv) => {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        // 簡易 CSV 解析（處理引號內的逗號）
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

module.exports = async (req, res) => {
    // 設定 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 從 Google Sheets 讀取「長者名單」工作表
        const response = await fetch(getSheetCSV('長者名單'));

        if (!response.ok) {
            throw new Error('無法讀取 Google Sheets');
        }

        const csv = await response.text();
        const data = parseCSV(csv);

        // 轉換為系統需要的格式
        const elders = data.map((row, index) => ({
            id: `E${index + 1}`,
            name: row['姓名'] || '',
            level: row['分級'] || 'A',
            levelDesc: row['分級說明'] || '',
            scoreRange: row['建議評分'] || '',
            identityType: row['身份類別'] || 'normal',
            identityDesc: row['身份說明'] || '',
            fare: row['車資'] ? parseInt(row['車資']) : 18,
            familyLineId: row['家屬LINE'] || row['家屬LINE ID'] || '',
            notes: row['備註'] || ''
        })).filter(e => e.name); // 過濾掉沒有姓名的空行

        res.status(200).json(elders);

    } catch (error) {
        console.error('讀取 Google Sheets 失敗:', error);
        res.status(500).json({
            error: '讀取資料失敗',
            message: error.message
        });
    }
};

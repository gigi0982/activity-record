// 從 Google Sheets 讀取活動主題 API
// Google Sheets ID: 1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc

const SHEET_ID = '1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc';

const getSheetCSV = (sheetName) => {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
};

const parseCSV = (csv) => {
    const lines = csv.split('\n');
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

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const response = await fetch(getSheetCSV('活動主題'));

        if (!response.ok) {
            throw new Error('無法讀取 Google Sheets');
        }

        const csv = await response.text();
        const data = parseCSV(csv);

        // 轉換為系統需要的格式
        // 假設欄位為: 主題名稱, 對應目的（逗號分隔）
        const topics = data.map((row, index) => {
            const purposeStr = row['對應目的'] || row['相關目的'] || '';
            const relatedPurposes = purposeStr.split(/[,、，]/).map(p => p.trim()).filter(p => p);

            return {
                id: `T${index + 1}`,
                name: row['主題名稱'] || row['活動主題'] || row['名稱'] || '',
                relatedPurposes: relatedPurposes
            };
        }).filter(t => t.name);

        res.status(200).json(topics);

    } catch (error) {
        console.error('讀取 Google Sheets 失敗:', error);
        res.status(500).json({
            error: '讀取資料失敗',
            message: error.message
        });
    }
};

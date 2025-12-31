// 從 Google Sheets 讀取活動目的 API
// Google Sheets ID: 1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc

const SHEET_ID = '1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc';

// 預設活動目的清單
const DEFAULT_PURPOSES = [
    { id: 'P1', name: '提升專注力', description: '' },
    { id: 'P2', name: '增進記憶力', description: '' },
    { id: 'P3', name: '促進社交互動', description: '' },
    { id: 'P4', name: '維持認知功能', description: '' },
    { id: 'P5', name: '情緒穩定', description: '' },
    { id: 'P6', name: '增進手眼協調', description: '' },
    { id: 'P7', name: '提升自我表達', description: '' },
    { id: 'P8', name: '增加生活參與', description: '' }
];

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
        const response = await fetch(getSheetCSV('活動目的'));

        if (!response.ok) {
            // 如果找不到工作表，回傳預設清單
            console.log('找不到「活動目的」工作表，使用預設清單');
            return res.status(200).json(DEFAULT_PURPOSES);
        }

        const csv = await response.text();

        // 檢查是否為有效的 CSV（不是錯誤頁面）
        if (csv.includes('<!DOCTYPE') || csv.includes('<html')) {
            console.log('Google Sheets 回傳 HTML 錯誤頁面，使用預設清單');
            return res.status(200).json(DEFAULT_PURPOSES);
        }

        const data = parseCSV(csv);

        // 轉換為系統需要的格式
        const purposes = data.map((row, index) => ({
            id: `P${index + 1}`,
            name: row['目的名稱'] || row['活動目的'] || row['名稱'] || '',
            description: row['說明'] || row['描述'] || ''
        })).filter(p => p.name);

        // 如果解析後沒有資料，回傳預設清單
        if (purposes.length === 0) {
            console.log('Google Sheets 無資料，使用預設清單');
            return res.status(200).json(DEFAULT_PURPOSES);
        }

        res.status(200).json(purposes);

    } catch (error) {
        console.error('讀取 Google Sheets 失敗:', error);
        // 發生錯誤時回傳預設清單，不要回傳錯誤
        res.status(200).json(DEFAULT_PURPOSES);
    }
};

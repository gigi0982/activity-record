// Vercel Serverless API 函數

// 測試模式資料
const testActivities = [
    {
        id: 'test-1',
        date: '2024-12-01',
        purpose: '提升認知功能',
        topic: '懷舊歌曲欣賞',
        participants: [
            { name: '王阿姨', focus: 4, interaction: 5, attention: 3, notes: '很投入活動' },
            { name: '李伯伯', focus: 3, interaction: 4, attention: 4, notes: '' },
            { name: '陳奶奶', focus: 5, interaction: 3, attention: 2, notes: '注意力較不集中' }
        ],
        special: '王阿姨特別投入',
        discussion: '大家都很喜歡這個活動',
        createdAt: new Date().toISOString()
    },
    {
        id: 'test-2',
        date: '2024-12-02',
        purpose: '促進社交互動',
        topic: '手工藝製作',
        participants: [
            { name: '張先生', focus: 3, interaction: 4, attention: 4, notes: '作品完成度高' },
            { name: '劉太太', focus: 4, interaction: 5, attention: 3, notes: '很有創意' },
            { name: '吳阿公', focus: 2, interaction: 3, attention: 3, notes: '需要較多協助' }
        ],
        special: '',
        discussion: '作品完成度很高',
        createdAt: new Date().toISOString()
    }
];

export default function handler(req, res) {
    // 設定 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url, method } = req;

    // 路由處理
    if (url === '/api/activities' || url === '/api/activities/') {
        return res.status(200).json(testActivities);
    }

    if (url === '/api/health' || url === '/api/health/') {
        return res.status(200).json({ status: 'OK', message: '活動紀錄系統 API 運行中' });
    }

    if ((url === '/api/activity' || url === '/api/activity/') && method === 'POST') {
        const activityData = req.body;

        if (!activityData.date || !activityData.purpose || !activityData.topic) {
            return res.status(400).json({ error: '缺少必要欄位' });
        }

        return res.status(200).json({
            success: true,
            message: '活動紀錄新增成功（測試模式）',
            participantCount: activityData.participants?.length || 0
        });
    }

    if (url === '/api/stats' || url === '/api/stats/') {
        const testStats = [
            {
                month: '2024-12',
                count: 2,
                participantCount: 6,
                avgFocus: '3.83',
                avgInteraction: '4.33',
                avgAttention: '3.17'
            }
        ];
        return res.status(200).json(testStats);
    }

    // 預設回應
    return res.status(200).json({
        status: 'OK',
        message: '活動紀錄系統 API',
        path: url
    });
}

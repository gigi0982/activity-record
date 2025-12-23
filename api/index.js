const express = require('express');
const cors = require('cors');

const app = express();

// 中介軟體
app.use(cors());
app.use(express.json());

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
        createdAt: new Date()
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
        createdAt: new Date()
    }
];

// API 路由
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: '活動紀錄系統 API 運行中' });
});

app.get('/api/activities', (req, res) => {
    res.json(testActivities);
});

app.post('/api/activity', (req, res) => {
    const activityData = req.body;

    // 簡單驗證
    if (!activityData.date || !activityData.purpose || !activityData.topic) {
        return res.status(400).json({ error: '缺少必要欄位' });
    }

    res.json({
        success: true,
        message: '活動紀錄新增成功（測試模式）',
        participantCount: activityData.participants?.length || 0
    });
});

app.get('/api/stats', (req, res) => {
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
    res.json(testStats);
});

// 預設路由處理
app.all('*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = app;

// Vercel Serverless API - 活動列表
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    return res.status(200).json(testActivities);
}

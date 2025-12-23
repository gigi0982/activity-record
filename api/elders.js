// Vercel Serverless API - 長者名單
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 測試模式長者名單
    const elders = [
        { id: '1', name: '王阿姨', age: 78, notes: '喜歡唱歌' },
        { id: '2', name: '李伯伯', age: 82, notes: '需要輔助行走' },
        { id: '3', name: '陳奶奶', age: 75, notes: '聽力稍差' },
        { id: '4', name: '張先生', age: 80, notes: '喜歡手工藝' },
        { id: '5', name: '劉太太', age: 76, notes: '很有創意' },
        { id: '6', name: '吳阿公', age: 85, notes: '需要較多協助' }
    ];

    return res.status(200).json(elders);
}

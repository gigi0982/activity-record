// Vercel Serverless API - 統計資料
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

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

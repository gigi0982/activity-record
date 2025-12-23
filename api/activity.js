// Vercel Serverless API - 新增活動
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: '方法不允許' });
    }

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

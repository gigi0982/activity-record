// Vercel Serverless API - 季度報表
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 範例季度報表資料
    const quarterlyReports = [
        {
            id: 'q4-2024',
            quarter: 'Q4',
            year: 2024,
            period: '2024年10月 - 12月',
            summary: {
                totalActivities: 24,
                totalParticipants: 156,
                avgAttendance: 6.5,
                avgFocus: 3.8,
                avgInteraction: 4.2,
                avgAttention: 3.5
            },
            monthlyBreakdown: [
                { month: '10月', activities: 8, participants: 52 },
                { month: '11月', activities: 8, participants: 54 },
                { month: '12月', activities: 8, participants: 50 }
            ],
            topActivities: [
                { topic: '懷舊歌曲欣賞', count: 6, avgScore: 4.5 },
                { topic: '手工藝製作', count: 5, avgScore: 4.2 },
                { topic: '園藝活動', count: 4, avgScore: 4.0 }
            ],
            highlights: [
                '長者參與度較上季提升 15%',
                '新增手工藝課程獲得好評',
                '王阿姨連續出席率最高'
            ],
            concerns: [
                '部分長者專注力有下降趨勢',
                '需加強個別化活動設計'
            ],
            recommendations: [
                '增加小組活動頻率',
                '引入更多感官刺激活動',
                '加強家屬參與'
            ]
        },
        {
            id: 'q3-2024',
            quarter: 'Q3',
            year: 2024,
            period: '2024年7月 - 9月',
            summary: {
                totalActivities: 22,
                totalParticipants: 142,
                avgAttendance: 6.5,
                avgFocus: 3.6,
                avgInteraction: 4.0,
                avgAttention: 3.4
            },
            monthlyBreakdown: [
                { month: '7月', activities: 7, participants: 45 },
                { month: '8月', activities: 8, participants: 50 },
                { month: '9月', activities: 7, participants: 47 }
            ],
            topActivities: [
                { topic: '懷舊歌曲欣賞', count: 5, avgScore: 4.3 },
                { topic: '認知訓練遊戲', count: 5, avgScore: 4.0 },
                { topic: '團體運動', count: 4, avgScore: 3.8 }
            ],
            highlights: [
                '夏季活動主題獲得好評',
                '新成員適應良好'
            ],
            concerns: [
                '天氣炎熱影響出席率'
            ],
            recommendations: [
                '增加室內活動選項',
                '準備更多清涼飲品'
            ]
        }
    ];

    return res.status(200).json(quarterlyReports);
}

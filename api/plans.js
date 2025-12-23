// Vercel Serverless API - 活動規劃
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const planData = req.body;
        return res.status(200).json({
            success: true,
            message: '活動規劃新增成功（測試模式）',
            id: 'plan-' + Date.now()
        });
    }

    if (req.method === 'PUT') {
        const planData = req.body;
        return res.status(200).json({
            success: true,
            message: '活動規劃更新成功（測試模式）'
        });
    }

    // 範例活動規劃資料
    const plans = [
        {
            id: 'plan-1',
            title: '2025年第一季活動規劃',
            period: '2025年1月 - 3月',
            status: '規劃中',
            createdBy: '李社工',
            goals: [
                '提升長者認知功能維持率',
                '增加社交互動機會',
                '促進身心健康',
                '加強家屬參與'
            ],
            monthlyPlans: [
                {
                    month: '1月',
                    theme: '新春迎新',
                    activities: [
                        {
                            name: '農曆新年裝飾製作',
                            type: '手工藝',
                            frequency: '每週一',
                            targetParticipants: 8,
                            materials: ['紅色色紙', '金色絲帶', '剪刀', '膠水'],
                            notes: '準備適合長者的大型材料'
                        },
                        {
                            name: '懷舊歌曲欣賞 - 新年歌曲',
                            type: '音樂活動',
                            frequency: '每週三',
                            targetParticipants: 10,
                            materials: ['音響設備', '歌詞本'],
                            notes: '選擇長者熟悉的傳統新年歌曲'
                        },
                        {
                            name: '新春團圓茶會',
                            type: '社交活動',
                            frequency: '單次 - 1/28',
                            targetParticipants: 15,
                            materials: ['茶點', '紅包袋', '春聯'],
                            notes: '邀請家屬參與'
                        }
                    ]
                },
                {
                    month: '2月',
                    theme: '元宵佳節',
                    activities: [
                        {
                            name: '元宵燈籠製作',
                            type: '手工藝',
                            frequency: '單次 - 2/12',
                            targetParticipants: 8,
                            materials: ['燈籠材料包', 'LED燈'],
                            notes: '使用安全LED燈'
                        },
                        {
                            name: '猜燈謎活動',
                            type: '認知訓練',
                            frequency: '單次 - 2/14',
                            targetParticipants: 12,
                            materials: ['燈謎題目', '小獎品'],
                            notes: '準備適合長者難度的題目'
                        },
                        {
                            name: '團體健康操',
                            type: '運動活動',
                            frequency: '每週二、四',
                            targetParticipants: 10,
                            materials: ['音響', '運動軟墊'],
                            notes: '強度適中，注意長者體力'
                        }
                    ]
                },
                {
                    month: '3月',
                    theme: '春暖花開',
                    activities: [
                        {
                            name: '春季園藝活動',
                            type: '園藝治療',
                            frequency: '每週五',
                            targetParticipants: 6,
                            materials: ['花盆', '種子', '培養土', '園藝工具'],
                            notes: '選擇易種植的植物'
                        },
                        {
                            name: '插花藝術',
                            type: '藝術活動',
                            frequency: '每週三',
                            targetParticipants: 8,
                            materials: ['鮮花', '花器', '海綿'],
                            notes: '使用無毒無刺的花材'
                        },
                        {
                            name: '戶外踏青',
                            type: '戶外活動',
                            frequency: '單次 - 3/21',
                            targetParticipants: 10,
                            materials: ['輪椅', '野餐墊', '茶點'],
                            notes: '需要足夠人力協助'
                        }
                    ]
                }
            ],
            resources: {
                budget: 15000,
                breakdown: [
                    { item: '手工藝材料', amount: 5000 },
                    { item: '活動茶點', amount: 4000 },
                    { item: '園藝用品', amount: 3000 },
                    { item: '雜支', amount: 3000 }
                ]
            },
            evaluation: {
                methods: [
                    '活動參與率統計',
                    '長者滿意度問卷',
                    '認知評估追蹤',
                    '家屬回饋收集'
                ],
                indicators: [
                    { name: '平均參與率', target: '80%以上' },
                    { name: '滿意度評分', target: '4分以上（5分滿分）' },
                    { name: '認知功能維持', target: '90%維持或進步' }
                ]
            },
            createdAt: '2024-12-15T10:00:00Z',
            updatedAt: '2024-12-20T14:30:00Z'
        },
        {
            id: 'plan-2',
            title: '2024年12月活動規劃',
            period: '2024年12月',
            status: '執行中',
            createdBy: '李社工',
            goals: [
                '營造溫馨節慶氛圍',
                '增進長者與家屬互動',
                '年終回顧與感恩'
            ],
            monthlyPlans: [
                {
                    month: '12月',
                    theme: '冬季感恩',
                    activities: [
                        {
                            name: '聖誕裝飾製作',
                            type: '手工藝',
                            frequency: '12/9, 12/16',
                            targetParticipants: 8,
                            materials: ['聖誕裝飾材料'],
                            notes: ''
                        },
                        {
                            name: '聖誕派對',
                            type: '社交活動',
                            frequency: '12/25',
                            targetParticipants: 15,
                            materials: ['派對佈置', '茶點', '禮物'],
                            notes: '邀請家屬參加'
                        },
                        {
                            name: '年終感恩茶會',
                            type: '社交活動',
                            frequency: '12/30',
                            targetParticipants: 12,
                            materials: ['茶點', '感謝卡'],
                            notes: '頒發出席獎'
                        }
                    ]
                }
            ],
            resources: {
                budget: 5000,
                breakdown: [
                    { item: '聖誕派對', amount: 2500 },
                    { item: '手工藝材料', amount: 1500 },
                    { item: '感恩茶會', amount: 1000 }
                ]
            },
            createdAt: '2024-11-25T10:00:00Z',
            updatedAt: '2024-12-01T09:00:00Z'
        }
    ];

    return res.status(200).json(plans);
}

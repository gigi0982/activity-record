// Vercel Serverless API - 會議記錄
export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'POST') {
        const meetingData = req.body;
        return res.status(200).json({
            success: true,
            message: '會議記錄新增成功（測試模式）',
            id: 'meeting-' + Date.now()
        });
    }

    // 範例會議記錄資料
    const meetings = [
        {
            id: 'meeting-1',
            date: '2024-12-20',
            title: '第四季度工作檢討會議',
            type: '季度檢討',
            attendees: ['張主任', '李社工', '王護理師', '陳志工'],
            agenda: [
                '第四季度活動執行回顧',
                '長者狀況討論',
                '下季度規劃預覽',
                '資源需求討論'
            ],
            minutes: `
## 會議重點

### 一、活動執行回顧
- 本季共執行24場活動，較上季增加2場
- 長者平均出席率維持在85%
- 懷舊歌曲活動最受歡迎

### 二、長者狀況討論
1. **王阿姨**：認知功能穩定，社交參與積極
2. **李伯伯**：需加強行動輔助，建議增加物理治療
3. **陳奶奶**：聽力問題需追蹤，已安排助聽器評估

### 三、下季規劃
- 農曆新年系列活動
- 春季園藝計畫
- 家屬聯誼活動

### 四、資源需求
- 申請手工藝材料費用
- 更新音響設備
      `,
            decisions: [
                '通過下季度活動計畫',
                '核准設備更新預算',
                '安排李伯伯物理治療評估'
            ],
            followUp: [
                { task: '準備新年活動材料', assignee: '王護理師', dueDate: '2025-01-15' },
                { task: '聯繫音響廠商', assignee: '李社工', dueDate: '2024-12-27' },
                { task: '安排李伯伯評估', assignee: '張主任', dueDate: '2024-12-25' }
            ],
            createdAt: '2024-12-20T14:00:00Z'
        },
        {
            id: 'meeting-2',
            date: '2024-12-06',
            title: '個案討論會議',
            type: '個案討論',
            attendees: ['張主任', '李社工', '王護理師'],
            agenda: [
                '新進長者適應狀況',
                '特殊個案討論',
                '照護計畫調整'
            ],
            minutes: `
## 會議重點

### 一、新進長者適應狀況
- 劉太太入住兩週，適應良好
- 建議增加社交活動參與

### 二、特殊個案討論
- 吳阿公近期情緒較不穩定
- 建議進行心理諮商評估

### 三、照護計畫調整
- 更新個別化照護計畫
- 加強與家屬溝通
      `,
            decisions: [
                '安排吳阿公心理諮商',
                '更新劉太太照護計畫'
            ],
            followUp: [
                { task: '聯繫心理師', assignee: '李社工', dueDate: '2024-12-13' }
            ],
            createdAt: '2024-12-06T10:00:00Z'
        },
        {
            id: 'meeting-3',
            date: '2024-11-22',
            title: '活動規劃會議',
            type: '活動規劃',
            attendees: ['李社工', '王護理師', '陳志工', '林志工'],
            agenda: [
                '12月活動主題討論',
                '聖誕節活動籌備',
                '志工排班確認'
            ],
            minutes: `
## 會議重點

### 一、12月活動主題
- 冬季懷舊系列
- 聖誕手工藝
- 年終感恩活動

### 二、聖誕節活動籌備
- 12/25 舉辦聖誕派對
- 準備交換禮物活動
- 邀請家屬參與

### 三、志工排班
- 確認12月志工輪值表
- 聖誕節需額外志工支援
      `,
            decisions: [
                '通過12月活動計畫',
                '聖誕派對預算2000元'
            ],
            followUp: [
                { task: '採購聖誕裝飾', assignee: '陳志工', dueDate: '2024-12-20' },
                { task: '發送家屬邀請函', assignee: '李社工', dueDate: '2024-12-15' }
            ],
            createdAt: '2024-11-22T14:30:00Z'
        }
    ];

    return res.status(200).json(meetings);
}

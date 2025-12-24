// 匯出工具函數 - 支援 PDF 和 Excel 匯出

// 匯出為 Excel (CSV 格式，可用 Excel 開啟)
export const exportToExcel = (activities, filename = '活動紀錄') => {
    if (!activities || activities.length === 0) {
        alert('沒有活動資料可匯出');
        return;
    }

    // 建立 CSV 標題
    const headers = [
        '日期', '活動目的', '活動主題', '參與人數',
        '平均專注力', '平均互動性', '平均注意力', '特殊狀況', '後續討論'
    ];

    // 建立 CSV 內容
    const rows = activities.map(activity => {
        const participantCount = activity.participants?.length || 0;
        const avgFocus = participantCount > 0
            ? (activity.participants.reduce((sum, p) => sum + (p.focus || 0), 0) / participantCount).toFixed(1)
            : 0;
        const avgInteraction = participantCount > 0
            ? (activity.participants.reduce((sum, p) => sum + (p.interaction || 0), 0) / participantCount).toFixed(1)
            : 0;
        const avgAttention = participantCount > 0
            ? (activity.participants.reduce((sum, p) => sum + (p.attention || 0), 0) / participantCount).toFixed(1)
            : 0;

        return [
            activity.date,
            activity.purpose,
            activity.topic,
            participantCount,
            avgFocus,
            avgInteraction,
            avgAttention,
            (activity.special || '').replace(/,/g, '；'), // 替換逗號避免 CSV 問題
            (activity.discussion || '').replace(/,/g, '；')
        ];
    });

    // 組合 CSV
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // 加入 BOM 讓 Excel 正確顯示中文
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

    // 下載檔案
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// 匯出單筆活動詳細 Excel
export const exportActivityDetailToExcel = (activity) => {
    if (!activity) {
        alert('沒有活動資料');
        return;
    }

    // 建立詳細表格
    const headers = ['姓名', '能力分級', '專注力', '互動性', '注意力', '備註'];
    const rows = (activity.participants || []).map(p => [
        p.name,
        p.level || '-',
        p.focus,
        p.interaction,
        p.attention,
        (p.notes || '').replace(/,/g, '；')
    ]);

    // 活動基本資訊
    const info = [
        `日期,${activity.date}`,
        `活動目的,${activity.purpose}`,
        `活動主題,${activity.topic}`,
        `特殊狀況,${(activity.special || '-').replace(/,/g, '；')}`,
        `後續討論,${(activity.discussion || '-').replace(/,/g, '；')}`,
        '',
        '參與者詳細資料',
        headers.join(','),
        ...rows.map(row => row.join(','))
    ];

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + info.join('\n')], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `活動紀錄_${activity.date}_${activity.topic}.csv`;
    link.click();
};

// 匯出為 PDF (使用瀏覽器列印功能)
export const exportToPDF = (activity) => {
    if (!activity) {
        alert('沒有活動資料');
        return;
    }

    // 建立列印用的 HTML
    const participantRows = (activity.participants || []).map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.level || '-'}</td>
      <td>${p.focus}</td>
      <td>${p.interaction}</td>
      <td>${p.attention}</td>
      <td>${p.notes || '-'}</td>
    </tr>
  `).join('');

    const avgFocus = activity.participants?.length > 0
        ? (activity.participants.reduce((sum, p) => sum + (p.focus || 0), 0) / activity.participants.length).toFixed(1)
        : 0;
    const avgInteraction = activity.participants?.length > 0
        ? (activity.participants.reduce((sum, p) => sum + (p.interaction || 0), 0) / activity.participants.length).toFixed(1)
        : 0;
    const avgAttention = activity.participants?.length > 0
        ? (activity.participants.reduce((sum, p) => sum + (p.attention || 0), 0) / activity.participants.length).toFixed(1)
        : 0;

    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>活動紀錄 - ${activity.date}</title>
      <style>
        body { font-family: 'Microsoft JhengHei', Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #333; border-bottom: 2px solid #2196F3; padding-bottom: 10px; }
        h2 { color: #2196F3; margin-top: 20px; }
        .info-table { width: 100%; margin-bottom: 20px; }
        .info-table td { padding: 8px; border-bottom: 1px solid #eee; }
        .info-table td:first-child { font-weight: bold; width: 120px; background: #f5f5f5; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data th, table.data td { border: 1px solid #ddd; padding: 10px; text-align: center; }
        table.data th { background: #2196F3; color: white; }
        table.data tr:nth-child(even) { background: #f9f9f9; }
        .summary { background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px; }
        .summary-grid { display: flex; justify-content: space-around; text-align: center; }
        .summary-item { }
        .summary-value { font-size: 24px; font-weight: bold; color: #2196F3; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>失智據點活動紀錄表</h1>
      
      <table class="info-table">
        <tr><td>活動日期</td><td>${activity.date}</td></tr>
        <tr><td>活動目的</td><td>${activity.purpose}</td></tr>
        <tr><td>活動主題</td><td>${activity.topic}</td></tr>
        <tr><td>參與人數</td><td>${activity.participants?.length || 0} 人</td></tr>
      </table>

      <h2>參與者表現評估</h2>
      <table class="data">
        <thead>
          <tr>
            <th>姓名</th>
            <th>能力分級</th>
            <th>專注力</th>
            <th>互動性</th>
            <th>注意力</th>
            <th>備註</th>
          </tr>
        </thead>
        <tbody>
          ${participantRows}
        </tbody>
      </table>

      <div class="summary">
        <h3 style="margin-top: 0;">平均分數</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">${avgFocus}</div>
            <div>專注力</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${avgInteraction}</div>
            <div>互動性</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${avgAttention}</div>
            <div>注意力</div>
          </div>
        </div>
      </div>

      ${activity.special ? `<h2>特殊狀況</h2><p>${activity.special}</p>` : ''}
      ${activity.discussion ? `<h2>後續討論</h2><p>${activity.discussion}</p>` : ''}

      <div class="footer">
        列印時間：${new Date().toLocaleString('zh-TW')}
      </div>
    </body>
    </html>
  `;

    // 開啟新視窗列印
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    // 延遲執行列印，確保內容載入完成
    setTimeout(() => {
        printWindow.print();
    }, 500);
};

// 匯出所有活動為 PDF
export const exportAllToPDF = (activities) => {
    if (!activities || activities.length === 0) {
        alert('沒有活動資料可匯出');
        return;
    }

    const activityRows = activities.map(activity => {
        const participantCount = activity.participants?.length || 0;
        const avgFocus = participantCount > 0
            ? (activity.participants.reduce((sum, p) => sum + (p.focus || 0), 0) / participantCount).toFixed(1)
            : 0;
        const avgInteraction = participantCount > 0
            ? (activity.participants.reduce((sum, p) => sum + (p.interaction || 0), 0) / participantCount).toFixed(1)
            : 0;
        const avgAttention = participantCount > 0
            ? (activity.participants.reduce((sum, p) => sum + (p.attention || 0), 0) / participantCount).toFixed(1)
            : 0;

        return `
      <tr>
        <td>${activity.date}</td>
        <td>${activity.purpose}</td>
        <td>${activity.topic}</td>
        <td>${participantCount}</td>
        <td>${avgFocus}</td>
        <td>${avgInteraction}</td>
        <td>${avgAttention}</td>
      </tr>
    `;
    }).join('');

    const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>活動紀錄總表</title>
      <style>
        body { font-family: 'Microsoft JhengHei', Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #333; border-bottom: 2px solid #2196F3; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: center; }
        th { background: #2196F3; color: white; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <h1>失智據點活動紀錄總表</h1>
      <p style="text-align: center; color: #666;">共 ${activities.length} 筆活動紀錄</p>
      
      <table>
        <thead>
          <tr>
            <th>日期</th>
            <th>活動目的</th>
            <th>活動主題</th>
            <th>參與人數</th>
            <th>專注力</th>
            <th>互動性</th>
            <th>注意力</th>
          </tr>
        </thead>
        <tbody>
          ${activityRows}
        </tbody>
      </table>

      <div class="footer">
        列印時間：${new Date().toLocaleString('zh-TW')}
      </div>
    </body>
    </html>
  `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
    }, 500);
};

export default {
    exportToExcel,
    exportActivityDetailToExcel,
    exportToPDF,
    exportAllToPDF
};

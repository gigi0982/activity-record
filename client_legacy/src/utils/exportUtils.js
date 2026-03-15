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
      <td>${p.focus}</td>
      <td>${p.interaction}</td>
      <td>${p.attention}</td>
      <td>${p.participation || 3}</td>
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
  const avgParticipation = activity.participants?.length > 0
    ? (activity.participants.reduce((sum, p) => sum + (p.participation || 3), 0) / activity.participants.length).toFixed(1)
    : 0;

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>活動紀錄 - ${activity.date}</title>
      <style>
        body { font-family: 'Microsoft JhengHei', 'Noto Sans TC', Arial, sans-serif; padding: 20px; }
        .header { text-align: center; margin-bottom: 20px; }
        .org-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
        .site-name { font-size: 16px; margin-bottom: 15px; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .info-table td { padding: 8px; border: 1px solid #333; }
        .info-table td:first-child { font-weight: bold; width: 100px; background: #f5f5f5; }
        table.data { width: 100%; border-collapse: collapse; margin-top: 10px; }
        table.data th, table.data td { border: 1px solid #333; padding: 8px; text-align: center; }
        table.data th { background: #e0e0e0; }
        .section-title { font-weight: bold; margin: 15px 0 8px 0; padding: 5px; background: #f0f0f0; border-left: 4px solid #333; }
        .summary-row { display: flex; justify-content: space-between; margin-top: 15px; padding: 10px; background: #f9f9f9; }
        .summary-item { text-align: center; }
        .summary-label { font-size: 12px; color: #666; }
        .summary-value { font-size: 18px; font-weight: bold; }
        .notes-section { margin-top: 15px; padding: 10px; border: 1px solid #ddd; min-height: 60px; }
        .footer { text-align: right; margin-top: 20px; font-size: 11px; color: #999; }
        @media print {
          body { padding: 0; margin: 0; }
          @page { size: A4; margin: 15mm; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="org-name">社團法人宜蘭縣長期照護及社會福祉推廣協會</div>
        <div class="site-name">三星樂智據點</div>
      </div>
      
      <table class="info-table">
        <tr>
          <td>活動日期</td>
          <td>${activity.date}</td>
          <td>時間</td>
          <td>${activity.time || '上午 09:00-12:00'}</td>
        </tr>
        <tr>
          <td>活動主題</td>
          <td>${activity.topic}</td>
          <td>參與人數</td>
          <td>${activity.participants?.length || 0} 人</td>
        </tr>
        <tr>
          <td>活動目的</td>
          <td colspan="3">${activity.purpose}</td>
        </tr>
        ${activity.activityName ? `<tr><td>活動名稱</td><td colspan="3">${activity.activityName}</td></tr>` : ''}
      </table>

      <div class="section-title">長者表現評估</div>
      <table class="data">
        <thead>
          <tr>
            <th>姓名</th>
            <th>專注力</th>
            <th>互動性</th>
            <th>注意力</th>
            <th>參與程度</th>
            <th>備註</th>
          </tr>
        </thead>
        <tbody>
          ${participantRows}
        </tbody>
      </table>

      <div class="summary-row">
        <div class="summary-item">
          <div class="summary-label">平均專注力</div>
          <div class="summary-value">${avgFocus}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">平均互動性</div>
          <div class="summary-value">${avgInteraction}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">平均注意力</div>
          <div class="summary-value">${avgAttention}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">平均參與程度</div>
          <div class="summary-value">${avgParticipation}</div>
        </div>
      </div>

      ${activity.special ? `
        <div class="section-title">特殊狀況/個案描述</div>
        <div class="notes-section">${activity.special}</div>
      ` : ''}
      
      ${activity.discussion ? `
        <div class="section-title">帶領者的感想/後續討論</div>
        <div class="notes-section">${activity.discussion}</div>
      ` : ''}

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

// 匯出所有活動為 PDF - 每個活動獨立一頁 A4
export const exportAllToPDF = (activities) => {
  if (!activities || activities.length === 0) {
    alert('沒有活動資料可匯出');
    return;
  }

  // 為每個活動產生獨立的頁面
  const activityPages = activities.map((activity, index) => {
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

    // 參與者表格
    const participantRows = (activity.participants || []).map(p => `
            <tr>
                <td style="text-align: left; padding: 6px 10px;">${p.name}</td>
                <td style="text-align: center; padding: 6px;">${p.level || '-'}</td>
                <td style="text-align: center; padding: 6px;">${p.focus}</td>
                <td style="text-align: center; padding: 6px;">${p.interaction}</td>
                <td style="text-align: center; padding: 6px;">${p.attention}</td>
                <td style="text-align: left; padding: 6px 10px; font-size: 11px;">${p.notes || '-'}</td>
            </tr>
        `).join('');

    return `
            <div class="page ${index > 0 ? 'page-break' : ''}">
                <!-- 頁面標題 -->
                <div class="header">
                    <h1>失智據點活動紀錄表</h1>
                    <div class="page-number">第 ${index + 1} 頁，共 ${activities.length} 頁</div>
                </div>

                <!-- 活動基本資訊 -->
                <table class="info-table">
                    <tr>
                        <td class="label">活動日期</td>
                        <td class="value">${activity.date}</td>
                        <td class="label">參與人數</td>
                        <td class="value">${participantCount} 人</td>
                    </tr>
                    <tr>
                        <td class="label">活動目的</td>
                        <td colspan="3" class="value">${activity.purpose}</td>
                    </tr>
                    <tr>
                        <td class="label">活動主題</td>
                        <td colspan="3" class="value">${activity.topic}</td>
                    </tr>
                </table>

                <!-- 參與者表現 -->
                <div class="section-title">參與者表現評估</div>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 15%;">姓名</th>
                            <th style="width: 12%;">能力分級</th>
                            <th style="width: 12%;">專注力</th>
                            <th style="width: 12%;">互動性</th>
                            <th style="width: 12%;">注意力</th>
                            <th style="width: 37%;">觀察備註</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${participantRows}
                    </tbody>
                </table>

                <!-- 平均分數摘要 -->
                <div class="summary-box">
                    <div class="summary-title">平均分數</div>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <div class="summary-value">${avgFocus}</div>
                            <div class="summary-label">專注力</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${avgInteraction}</div>
                            <div class="summary-label">互動性</div>
                        </div>
                        <div class="summary-item">
                            <div class="summary-value">${avgAttention}</div>
                            <div class="summary-label">注意力</div>
                        </div>
                    </div>
                </div>

                <!-- 特殊狀況與後續討論 -->
                ${activity.special || activity.discussion ? `
                <div class="notes-section">
                    ${activity.special ? `
                    <div class="notes-box">
                        <div class="notes-title">特殊狀況</div>
                        <div class="notes-content">${activity.special}</div>
                    </div>
                    ` : ''}
                    ${activity.discussion ? `
                    <div class="notes-box">
                        <div class="notes-title">後續討論</div>
                        <div class="notes-content">${activity.discussion}</div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- 頁尾 -->
                <div class="footer">
                    <div>簽名欄：紀錄者 ______________ 主管 ______________</div>
                </div>
            </div>
        `;
  }).join('');

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>活動紀錄報表</title>
        <style>
            @page {
                size: A4;
                margin: 15mm;
            }
            
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Microsoft JhengHei', 'Noto Sans TC', Arial, sans-serif;
                font-size: 12px;
                line-height: 1.4;
                color: #333;
                margin: 0;
                padding: 0;
            }
            
            .page {
                width: 100%;
                min-height: 100%;
                padding: 10px;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            .header {
                text-align: center;
                margin-bottom: 15px;
                padding-bottom: 10px;
                border-bottom: 2px solid #2196F3;
            }
            
            .header h1 {
                margin: 0 0 5px 0;
                font-size: 20px;
                color: #1976D2;
            }
            
            .page-number {
                font-size: 11px;
                color: #666;
            }
            
            .info-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }
            
            .info-table td {
                border: 1px solid #ddd;
                padding: 8px 12px;
            }
            
            .info-table .label {
                background: #f5f5f5;
                font-weight: bold;
                width: 15%;
            }
            
            .info-table .value {
                width: 35%;
            }
            
            .section-title {
                background: #2196F3;
                color: white;
                padding: 8px 12px;
                font-weight: bold;
                font-size: 13px;
                margin-bottom: 0;
            }
            
            .data-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
            }
            
            .data-table th {
                background: #e3f2fd;
                border: 1px solid #ddd;
                padding: 8px;
                font-size: 11px;
                text-align: center;
            }
            
            .data-table td {
                border: 1px solid #ddd;
                font-size: 11px;
            }
            
            .data-table tr:nth-child(even) {
                background: #fafafa;
            }
            
            .summary-box {
                background: #e8f5e9;
                border: 1px solid #c8e6c9;
                border-radius: 5px;
                padding: 12px;
                margin-bottom: 15px;
            }
            
            .summary-title {
                text-align: center;
                font-weight: bold;
                margin-bottom: 10px;
                color: #2e7d32;
            }
            
            .summary-grid {
                display: flex;
                justify-content: space-around;
                text-align: center;
            }
            
            .summary-item {
                flex: 1;
            }
            
            .summary-value {
                font-size: 24px;
                font-weight: bold;
                color: #1976D2;
            }
            
            .summary-label {
                font-size: 11px;
                color: #666;
            }
            
            .notes-section {
                margin-bottom: 15px;
            }
            
            .notes-box {
                border: 1px solid #ddd;
                margin-bottom: 10px;
            }
            
            .notes-title {
                background: #fff3e0;
                padding: 6px 12px;
                font-weight: bold;
                border-bottom: 1px solid #ddd;
                font-size: 11px;
            }
            
            .notes-content {
                padding: 10px 12px;
                min-height: 40px;
                font-size: 11px;
            }
            
            .footer {
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px solid #ddd;
                font-size: 11px;
                color: #666;
            }
            
            @media print {
                body { 
                    padding: 0; 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .page {
                    padding: 0;
                }
            }
        </style>
    </head>
    <body>
        ${activityPages}
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

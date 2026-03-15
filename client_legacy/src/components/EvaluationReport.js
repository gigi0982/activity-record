import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config/api';

function EvaluationReport() {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState('q4-2024');
    const [error, setError] = useState('');

    const periods = [
        { value: 'q4-2024', label: '2024年第四季 (10-12月)' },
        { value: 'q3-2024', label: '2024年第三季 (7-9月)' },
        { value: 'year-2024', label: '2024年度報告' }
    ];

    const generateReport = async () => {
        setLoading(true);
        setError('');
        try {
            // 同時獲取所有需要的資料
            const [activitiesRes, statsRes, meetingsRes, plansRes, quarterlyRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/activities`),
                fetch(`${API_BASE_URL}/api/stats`),
                fetch(`${API_BASE_URL}/api/meetings`),
                fetch(`${API_BASE_URL}/api/plans`),
                fetch(`${API_BASE_URL}/api/quarterly-reports`)
            ]);

            const activities = await activitiesRes.json();
            const stats = await statsRes.json();
            const meetings = await meetingsRes.json();
            const plans = await plansRes.json();
            const quarterlyReports = await quarterlyRes.json();

            // 找到對應期間的報表
            const selectedReport = quarterlyReports.find(r => r.id === selectedPeriod) || quarterlyReports[0];

            setReportData({
                period: selectedPeriod,
                quarterly: selectedReport,
                activities,
                stats,
                meetings,
                plans,
                generatedAt: new Date().toLocaleString('zh-TW')
            });
        } catch (err) {
            setError('載入報告資料失敗，請稍後再試');
            console.error('報告產生錯誤:', err);
        }
        setLoading(false);
    };

    const handlePrint = () => {
        window.print();
    };

    const styles = {
        container: {
            maxWidth: '1000px',
            margin: '0 auto',
            padding: '20px'
        },
        header: {
            textAlign: 'center',
            marginBottom: '30px',
            paddingBottom: '20px',
            borderBottom: '2px solid #333'
        },
        title: {
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '10px'
        },
        subtitle: {
            fontSize: '18px',
            color: '#666'
        },
        controlPanel: {
            display: 'flex',
            gap: '15px',
            marginBottom: '30px',
            alignItems: 'center',
            flexWrap: 'wrap'
        },
        select: {
            padding: '10px 15px',
            fontSize: '16px',
            borderRadius: '5px',
            border: '1px solid #ddd',
            minWidth: '200px'
        },
        button: {
            padding: '10px 20px',
            fontSize: '16px',
            borderRadius: '5px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
        },
        primaryButton: {
            backgroundColor: '#2196F3',
            color: 'white'
        },
        secondaryButton: {
            backgroundColor: '#4CAF50',
            color: 'white'
        },
        section: {
            marginBottom: '30px',
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        },
        sectionTitle: {
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '2px solid #2196F3',
            color: '#333'
        },
        summaryGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '15px'
        },
        summaryCard: {
            backgroundColor: '#f5f5f5',
            padding: '15px',
            borderRadius: '8px',
            textAlign: 'center'
        },
        summaryValue: {
            fontSize: '28px',
            fontWeight: 'bold',
            color: '#2196F3'
        },
        summaryLabel: {
            fontSize: '14px',
            color: '#666',
            marginTop: '5px'
        },
        table: {
            width: '100%',
            borderCollapse: 'collapse',
            marginTop: '15px'
        },
        th: {
            backgroundColor: '#2196F3',
            color: 'white',
            padding: '12px',
            textAlign: 'left',
            fontSize: '14px'
        },
        td: {
            padding: '12px',
            borderBottom: '1px solid #ddd',
            fontSize: '14px'
        },
        highlight: {
            backgroundColor: '#e3f2fd',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '10px'
        },
        list: {
            paddingLeft: '20px',
            lineHeight: '1.8'
        },
        printOnly: {
            display: 'none'
        },
        noPrint: {}
    };

    // 列印時的樣式
    const printStyles = `
    @media print {
      body { background: white !important; }
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      .section { page-break-inside: avoid; }
    }
  `;

    return (
        <div style={styles.container}>
            <style>{printStyles}</style>

            {/* 控制面板 - 列印時隱藏 */}
            <div style={styles.controlPanel} className="no-print">
                <select
                    style={styles.select}
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                    {periods.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
                <button
                    style={{ ...styles.button, ...styles.primaryButton }}
                    onClick={generateReport}
                    disabled={loading}
                >
                    {loading ? '產生中...' : '📊 產生報告'}
                </button>
                {reportData && (
                    <>
                        <button
                            style={{ ...styles.button, ...styles.secondaryButton }}
                            onClick={handlePrint}
                        >
                            🖨️ 列印報告
                        </button>
                    </>
                )}
            </div>

            {error && (
                <div style={{ backgroundColor: '#ffebee', color: '#c62828', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
                    {error}
                </div>
            )}

            {!reportData && !loading && (
                <div style={{ textAlign: 'center', padding: '50px', color: '#666' }}>
                    <p style={{ fontSize: '18px' }}>請選擇報告期間，然後點擊「產生報告」</p>
                </div>
            )}

            {reportData && (
                <>
                    {/* 報告封面 */}
                    <div style={styles.header}>
                        <div style={styles.title}>失智據點活動紀錄系統</div>
                        <div style={styles.title}>評鑑佐證報告</div>
                        <div style={styles.subtitle}>{reportData.quarterly?.period || '2024年第四季'}</div>
                        <div style={{ marginTop: '15px', fontSize: '14px', color: '#999' }}>
                            產生時間：{reportData.generatedAt}
                        </div>
                    </div>

                    {/* 摘要統計 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>📈 季度摘要統計</div>
                        <div style={styles.summaryGrid}>
                            <div style={styles.summaryCard}>
                                <div style={styles.summaryValue}>{reportData.quarterly?.summary?.totalActivities || 0}</div>
                                <div style={styles.summaryLabel}>活動場次</div>
                            </div>
                            <div style={styles.summaryCard}>
                                <div style={styles.summaryValue}>{reportData.quarterly?.summary?.totalParticipants || 0}</div>
                                <div style={styles.summaryLabel}>參與人次</div>
                            </div>
                            <div style={styles.summaryCard}>
                                <div style={styles.summaryValue}>{reportData.quarterly?.summary?.avgAttendance || 0}</div>
                                <div style={styles.summaryLabel}>平均出席</div>
                            </div>
                            <div style={styles.summaryCard}>
                                <div style={{ ...styles.summaryValue, color: '#4CAF50' }}>{reportData.quarterly?.summary?.avgFocus || 0}</div>
                                <div style={styles.summaryLabel}>專注力</div>
                            </div>
                            <div style={styles.summaryCard}>
                                <div style={{ ...styles.summaryValue, color: '#FF9800' }}>{reportData.quarterly?.summary?.avgInteraction || 0}</div>
                                <div style={styles.summaryLabel}>互動性</div>
                            </div>
                            <div style={styles.summaryCard}>
                                <div style={{ ...styles.summaryValue, color: '#9C27B0' }}>{reportData.quarterly?.summary?.avgAttention || 0}</div>
                                <div style={styles.summaryLabel}>注意力</div>
                            </div>
                        </div>
                    </div>

                    {/* 月度統計 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>📅 月度活動統計</div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>月份</th>
                                    <th style={styles.th}>活動場次</th>
                                    <th style={styles.th}>參與人次</th>
                                    <th style={styles.th}>平均每場</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.quarterly?.monthlyBreakdown?.map((month, idx) => (
                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                        <td style={styles.td}>{month.month}</td>
                                        <td style={styles.td}>{month.activities} 場</td>
                                        <td style={styles.td}>{month.participants} 人次</td>
                                        <td style={styles.td}>{(month.participants / month.activities).toFixed(1)} 人</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 熱門活動 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>🏆 熱門活動排行</div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>排名</th>
                                    <th style={styles.th}>活動主題</th>
                                    <th style={styles.th}>執行次數</th>
                                    <th style={styles.th}>平均評分</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.quarterly?.topActivities?.map((activity, idx) => (
                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                        <td style={styles.td}>🥇🥈🥉{['', '', ''][idx] || ''} {idx + 1}</td>
                                        <td style={styles.td}>{activity.topic}</td>
                                        <td style={styles.td}>{activity.count} 次</td>
                                        <td style={styles.td}>{activity.avgScore} / 5.0</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 重點成果 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>✅ 重點成果</div>
                        <ul style={styles.list}>
                            {reportData.quarterly?.highlights?.map((highlight, idx) => (
                                <li key={idx}>{highlight}</li>
                            ))}
                        </ul>
                    </div>

                    {/* 關注事項 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>⚠️ 關注事項</div>
                        <ul style={styles.list}>
                            {reportData.quarterly?.concerns?.map((concern, idx) => (
                                <li key={idx}>{concern}</li>
                            ))}
                        </ul>
                    </div>

                    {/* 改善建議 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>💡 改善建議</div>
                        <ul style={styles.list}>
                            {reportData.quarterly?.recommendations?.map((rec, idx) => (
                                <li key={idx}>{rec}</li>
                            ))}
                        </ul>
                    </div>

                    {/* 活動執行記錄 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>📝 活動執行記錄</div>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>日期</th>
                                    <th style={styles.th}>活動目的</th>
                                    <th style={styles.th}>活動主題</th>
                                    <th style={styles.th}>參與人數</th>
                                    <th style={styles.th}>備註</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.activities?.map((activity, idx) => (
                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                        <td style={styles.td}>{activity.date}</td>
                                        <td style={styles.td}>{activity.purpose}</td>
                                        <td style={styles.td}>{activity.topic}</td>
                                        <td style={styles.td}>{activity.participants?.length || 0} 人</td>
                                        <td style={styles.td}>{activity.special || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* 會議記錄摘要 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>📋 會議記錄摘要</div>
                        {reportData.meetings?.slice(0, 3).map((meeting, idx) => (
                            <div key={idx} style={{ ...styles.highlight, marginBottom: '15px' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                    {meeting.date} - {meeting.title}
                                </div>
                                <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                                    類型：{meeting.type} | 出席：{meeting.attendees?.join('、')}
                                </div>
                                <div style={{ fontSize: '14px' }}>
                                    <strong>決議事項：</strong>
                                    <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                                        {meeting.decisions?.map((decision, i) => (
                                            <li key={i}>{decision}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 頁尾 */}
                    <div style={{ textAlign: 'center', marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #ddd', color: '#999' }}>
                        <p>此報告由「失智據點活動紀錄系統」自動產生</p>
                        <p>產生時間：{reportData.generatedAt}</p>
                    </div>
                </>
            )}
        </div>
    );
}

export default EvaluationReport;

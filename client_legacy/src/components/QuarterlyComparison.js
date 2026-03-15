import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config/api';

function QuarterlyComparison() {
    const [quarterlyData, setQuarterlyData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchQuarterlyData();
    }, []);

    const fetchQuarterlyData = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/quarterly-reports`);
            const data = await response.json();
            setQuarterlyData(data);
        } catch (err) {
            setError('載入季度資料失敗');
            console.error('載入錯誤:', err);
        }
        setLoading(false);
    };

    const calculateChange = (current, previous) => {
        if (!previous) return null;
        const change = ((current - previous) / previous * 100).toFixed(1);
        return parseFloat(change);
    };

    const renderChangeIndicator = (change) => {
        if (change === null) return <span style={{ color: '#999' }}>-</span>;
        if (change > 0) return <span style={{ color: '#4CAF50' }}>↑ +{change}%</span>;
        if (change < 0) return <span style={{ color: '#f44336' }}>↓ {change}%</span>;
        return <span style={{ color: '#999' }}>→ 0%</span>;
    };

    const styles = {
        container: {
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '20px'
        },
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            textAlign: 'center'
        },
        comparisonGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
        },
        quarterCard: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '2px solid #e0e0e0'
        },
        currentQuarter: {
            borderColor: '#2196F3',
            backgroundColor: '#e3f2fd'
        },
        quarterTitle: {
            fontSize: '20px',
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '15px',
            padding: '10px',
            backgroundColor: '#2196F3',
            color: 'white',
            borderRadius: '8px'
        },
        statRow: {
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px 0',
            borderBottom: '1px solid #eee'
        },
        statLabel: {
            color: '#666',
            fontSize: '14px'
        },
        statValue: {
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#333'
        },
        trendSection: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginTop: '20px'
        },
        sectionTitle: {
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '2px solid #2196F3'
        },
        trendTable: {
            width: '100%',
            borderCollapse: 'collapse'
        },
        th: {
            backgroundColor: '#f5f5f5',
            padding: '12px',
            textAlign: 'left',
            fontWeight: 'bold',
            borderBottom: '2px solid #ddd'
        },
        td: {
            padding: '12px',
            borderBottom: '1px solid #eee'
        },
        highlightRow: {
            backgroundColor: '#e8f5e9'
        },
        summaryBox: {
            backgroundColor: '#fff3e0',
            padding: '20px',
            borderRadius: '12px',
            marginTop: '20px'
        },
        summaryTitle: {
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            color: '#e65100'
        },
        summaryList: {
            paddingLeft: '20px',
            lineHeight: '1.8'
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>載入中...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error}</div>;
    }

    const currentQuarter = quarterlyData[0];
    const previousQuarter = quarterlyData[1];

    // 計算變化
    const changes = currentQuarter && previousQuarter ? {
        activities: calculateChange(currentQuarter.summary?.totalActivities, previousQuarter.summary?.totalActivities),
        participants: calculateChange(currentQuarter.summary?.totalParticipants, previousQuarter.summary?.totalParticipants),
        focus: calculateChange(currentQuarter.summary?.avgFocus, previousQuarter.summary?.avgFocus),
        interaction: calculateChange(currentQuarter.summary?.avgInteraction, previousQuarter.summary?.avgInteraction),
        attention: calculateChange(currentQuarter.summary?.avgAttention, previousQuarter.summary?.avgAttention)
    } : {};

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>📈 季度比較分析</h1>

            {/* 季度卡片比較 */}
            <div style={styles.comparisonGrid}>
                {quarterlyData.slice(0, 2).map((quarter, idx) => (
                    <div
                        key={quarter.id}
                        style={{
                            ...styles.quarterCard,
                            ...(idx === 0 ? styles.currentQuarter : {})
                        }}
                    >
                        <div style={{
                            ...styles.quarterTitle,
                            backgroundColor: idx === 0 ? '#2196F3' : '#757575'
                        }}>
                            {quarter.period}
                            {idx === 0 && <span style={{ marginLeft: '10px', fontSize: '12px' }}>(當前)</span>}
                        </div>

                        <div style={styles.statRow}>
                            <span style={styles.statLabel}>活動場次</span>
                            <span style={styles.statValue}>
                                {quarter.summary?.totalActivities} 場
                                {idx === 0 && previousQuarter && (
                                    <span style={{ marginLeft: '10px', fontSize: '14px' }}>
                                        {renderChangeIndicator(changes.activities)}
                                    </span>
                                )}
                            </span>
                        </div>

                        <div style={styles.statRow}>
                            <span style={styles.statLabel}>參與人次</span>
                            <span style={styles.statValue}>
                                {quarter.summary?.totalParticipants} 人次
                                {idx === 0 && previousQuarter && (
                                    <span style={{ marginLeft: '10px', fontSize: '14px' }}>
                                        {renderChangeIndicator(changes.participants)}
                                    </span>
                                )}
                            </span>
                        </div>

                        <div style={styles.statRow}>
                            <span style={styles.statLabel}>平均出席</span>
                            <span style={styles.statValue}>{quarter.summary?.avgAttendance} 人/場</span>
                        </div>

                        <div style={styles.statRow}>
                            <span style={styles.statLabel}>專注力評分</span>
                            <span style={{ ...styles.statValue, color: '#4CAF50' }}>
                                {quarter.summary?.avgFocus}
                                {idx === 0 && previousQuarter && (
                                    <span style={{ marginLeft: '10px', fontSize: '14px' }}>
                                        {renderChangeIndicator(changes.focus)}
                                    </span>
                                )}
                            </span>
                        </div>

                        <div style={styles.statRow}>
                            <span style={styles.statLabel}>互動性評分</span>
                            <span style={{ ...styles.statValue, color: '#FF9800' }}>
                                {quarter.summary?.avgInteraction}
                                {idx === 0 && previousQuarter && (
                                    <span style={{ marginLeft: '10px', fontSize: '14px' }}>
                                        {renderChangeIndicator(changes.interaction)}
                                    </span>
                                )}
                            </span>
                        </div>

                        <div style={styles.statRow}>
                            <span style={styles.statLabel}>注意力評分</span>
                            <span style={{ ...styles.statValue, color: '#9C27B0' }}>
                                {quarter.summary?.avgAttention}
                                {idx === 0 && previousQuarter && (
                                    <span style={{ marginLeft: '10px', fontSize: '14px' }}>
                                        {renderChangeIndicator(changes.attention)}
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* 趨勢分析表格 */}
            <div style={styles.trendSection}>
                <div style={styles.sectionTitle}>📊 各指標趨勢分析</div>
                <table style={styles.trendTable}>
                    <thead>
                        <tr>
                            <th style={styles.th}>指標</th>
                            {quarterlyData.slice(0, 4).reverse().map(q => (
                                <th key={q.id} style={styles.th}>{q.quarter} {q.year}</th>
                            ))}
                            <th style={styles.th}>趨勢</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={styles.td}>活動場次</td>
                            {quarterlyData.slice(0, 4).reverse().map(q => (
                                <td key={q.id} style={styles.td}>{q.summary?.totalActivities}</td>
                            ))}
                            <td style={styles.td}>{renderChangeIndicator(changes.activities)}</td>
                        </tr>
                        <tr style={styles.highlightRow}>
                            <td style={styles.td}>參與人次</td>
                            {quarterlyData.slice(0, 4).reverse().map(q => (
                                <td key={q.id} style={styles.td}>{q.summary?.totalParticipants}</td>
                            ))}
                            <td style={styles.td}>{renderChangeIndicator(changes.participants)}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>專注力</td>
                            {quarterlyData.slice(0, 4).reverse().map(q => (
                                <td key={q.id} style={styles.td}>{q.summary?.avgFocus}</td>
                            ))}
                            <td style={styles.td}>{renderChangeIndicator(changes.focus)}</td>
                        </tr>
                        <tr style={styles.highlightRow}>
                            <td style={styles.td}>互動性</td>
                            {quarterlyData.slice(0, 4).reverse().map(q => (
                                <td key={q.id} style={styles.td}>{q.summary?.avgInteraction}</td>
                            ))}
                            <td style={styles.td}>{renderChangeIndicator(changes.interaction)}</td>
                        </tr>
                        <tr>
                            <td style={styles.td}>注意力</td>
                            {quarterlyData.slice(0, 4).reverse().map(q => (
                                <td key={q.id} style={styles.td}>{q.summary?.avgAttention}</td>
                            ))}
                            <td style={styles.td}>{renderChangeIndicator(changes.attention)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 改善建議摘要 */}
            {currentQuarter && (
                <div style={styles.summaryBox}>
                    <div style={styles.summaryTitle}>💡 本季改善重點</div>
                    <ul style={styles.summaryList}>
                        {currentQuarter.recommendations?.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default QuarterlyComparison;

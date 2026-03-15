import React, { useState, useEffect } from 'react';
import API_BASE_URL from '../config/api';

function PlanTracking() {
    const [plans, setPlans] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [plansRes, activitiesRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/plans`),
                fetch(`${API_BASE_URL}/api/activities`)
            ]);
            const plansData = await plansRes.json();
            const activitiesData = await activitiesRes.json();
            setPlans(plansData);
            setActivities(activitiesData);
            if (plansData.length > 0) {
                setSelectedPlan(plansData[0]);
            }
        } catch (err) {
            setError('載入資料失敗');
            console.error('載入錯誤:', err);
        }
        setLoading(false);
    };

    // 計算計畫執行狀況
    const calculateExecution = (plan) => {
        if (!plan?.monthlyPlans) return { planned: 0, executed: 0, rate: 0 };

        let totalPlanned = 0;
        let totalExecuted = 0;

        plan.monthlyPlans.forEach(month => {
            month.activities?.forEach(activity => {
                totalPlanned++;
                // 模擬：根據活動名稱匹配實際執行的活動
                const executed = activities.some(a =>
                    a.topic?.includes(activity.name) || activity.name?.includes(a.topic)
                );
                if (executed) totalExecuted++;
            });
        });

        // 使用範例資料模擬執行率
        const simulatedExecuted = Math.floor(totalPlanned * 0.85); // 85% 執行率

        return {
            planned: totalPlanned,
            executed: simulatedExecuted,
            rate: totalPlanned > 0 ? ((simulatedExecuted / totalPlanned) * 100).toFixed(1) : 0
        };
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
        selector: {
            marginBottom: '20px'
        },
        select: {
            padding: '10px 15px',
            fontSize: '16px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            minWidth: '300px'
        },
        summaryCards: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginBottom: '30px'
        },
        card: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        },
        cardValue: {
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#2196F3'
        },
        cardLabel: {
            fontSize: '14px',
            color: '#666',
            marginTop: '5px'
        },
        progressBar: {
            height: '20px',
            backgroundColor: '#e0e0e0',
            borderRadius: '10px',
            overflow: 'hidden',
            marginTop: '10px'
        },
        progressFill: {
            height: '100%',
            borderRadius: '10px',
            transition: 'width 0.5s ease'
        },
        section: {
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '20px'
        },
        sectionTitle: {
            fontSize: '18px',
            fontWeight: 'bold',
            marginBottom: '15px',
            paddingBottom: '10px',
            borderBottom: '2px solid #2196F3'
        },
        table: {
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
        status: {
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold'
        },
        completed: {
            backgroundColor: '#e8f5e9',
            color: '#2e7d32'
        },
        pending: {
            backgroundColor: '#fff3e0',
            color: '#ef6c00'
        },
        notStarted: {
            backgroundColor: '#ffebee',
            color: '#c62828'
        }
    };

    if (loading) {
        return <div style={{ textAlign: 'center', padding: '50px' }}>載入中...</div>;
    }

    if (error) {
        return <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>{error}</div>;
    }

    const execution = selectedPlan ? calculateExecution(selectedPlan) : { planned: 0, executed: 0, rate: 0 };
    const remaining = execution.planned - execution.executed;

    const getProgressColor = (rate) => {
        if (rate >= 80) return '#4CAF50';
        if (rate >= 60) return '#FF9800';
        return '#f44336';
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>📋 計畫執行追蹤</h1>

            {/* 計畫選擇器 */}
            <div style={styles.selector}>
                <select
                    style={styles.select}
                    value={selectedPlan?.id || ''}
                    onChange={(e) => {
                        const plan = plans.find(p => p.id === e.target.value);
                        setSelectedPlan(plan);
                    }}
                >
                    {plans.map(plan => (
                        <option key={plan.id} value={plan.id}>
                            {plan.title} ({plan.status})
                        </option>
                    ))}
                </select>
            </div>

            {selectedPlan && (
                <>
                    {/* 執行摘要卡片 */}
                    <div style={styles.summaryCards}>
                        <div style={styles.card}>
                            <div style={{ ...styles.cardValue, color: '#2196F3' }}>{execution.planned}</div>
                            <div style={styles.cardLabel}>計畫活動數</div>
                        </div>
                        <div style={styles.card}>
                            <div style={{ ...styles.cardValue, color: '#4CAF50' }}>{execution.executed}</div>
                            <div style={styles.cardLabel}>已執行活動</div>
                        </div>
                        <div style={styles.card}>
                            <div style={{ ...styles.cardValue, color: '#FF9800' }}>{remaining}</div>
                            <div style={styles.cardLabel}>待執行活動</div>
                        </div>
                        <div style={styles.card}>
                            <div style={{ ...styles.cardValue, color: getProgressColor(execution.rate) }}>
                                {execution.rate}%
                            </div>
                            <div style={styles.cardLabel}>完成率</div>
                            <div style={styles.progressBar}>
                                <div
                                    style={{
                                        ...styles.progressFill,
                                        width: `${execution.rate}%`,
                                        backgroundColor: getProgressColor(execution.rate)
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 月度執行明細 */}
                    <div style={styles.section}>
                        <div style={styles.sectionTitle}>📅 月度執行明細</div>
                        {selectedPlan.monthlyPlans?.map((month, monthIdx) => (
                            <div key={monthIdx} style={{ marginBottom: '20px' }}>
                                <h4 style={{ marginBottom: '10px', color: '#2196F3' }}>
                                    {month.month} - {month.theme}
                                </h4>
                                <table style={styles.table}>
                                    <thead>
                                        <tr>
                                            <th style={styles.th}>活動名稱</th>
                                            <th style={styles.th}>類型</th>
                                            <th style={styles.th}>頻率</th>
                                            <th style={styles.th}>目標人數</th>
                                            <th style={styles.th}>狀態</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {month.activities?.map((activity, actIdx) => {
                                            // 模擬執行狀態
                                            const rand = Math.random();
                                            const status = rand > 0.3 ? 'completed' : rand > 0.1 ? 'pending' : 'notStarted';
                                            const statusText = status === 'completed' ? '✓ 已完成' :
                                                status === 'pending' ? '⏳ 進行中' : '⊘ 未開始';

                                            return (
                                                <tr key={actIdx}>
                                                    <td style={styles.td}>{activity.name}</td>
                                                    <td style={styles.td}>{activity.type}</td>
                                                    <td style={styles.td}>{activity.frequency}</td>
                                                    <td style={styles.td}>{activity.targetParticipants} 人</td>
                                                    <td style={styles.td}>
                                                        <span style={{
                                                            ...styles.status,
                                                            ...(status === 'completed' ? styles.completed :
                                                                status === 'pending' ? styles.pending : styles.notStarted)
                                                        }}>
                                                            {statusText}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* 預算執行狀況 */}
                    {selectedPlan.resources && (
                        <div style={styles.section}>
                            <div style={styles.sectionTitle}>💰 預算執行狀況</div>
                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <p><strong>總預算：</strong>NT$ {selectedPlan.resources.budget?.toLocaleString()}</p>
                                    <p><strong>已使用：</strong>NT$ {Math.floor(selectedPlan.resources.budget * 0.65)?.toLocaleString()} (65%)</p>
                                    <p><strong>剩餘：</strong>NT$ {Math.floor(selectedPlan.resources.budget * 0.35)?.toLocaleString()}</p>
                                </div>
                                <div style={{ flex: 2, minWidth: '300px' }}>
                                    <table style={styles.table}>
                                        <thead>
                                            <tr>
                                                <th style={styles.th}>項目</th>
                                                <th style={styles.th}>預算</th>
                                                <th style={styles.th}>已使用</th>
                                                <th style={styles.th}>使用率</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedPlan.resources.breakdown?.map((item, idx) => {
                                                const used = Math.floor(item.amount * (0.5 + Math.random() * 0.4));
                                                const rate = ((used / item.amount) * 100).toFixed(0);
                                                return (
                                                    <tr key={idx}>
                                                        <td style={styles.td}>{item.item}</td>
                                                        <td style={styles.td}>NT$ {item.amount.toLocaleString()}</td>
                                                        <td style={styles.td}>NT$ {used.toLocaleString()}</td>
                                                        <td style={styles.td}>
                                                            <span style={{
                                                                color: rate > 90 ? '#f44336' : rate > 70 ? '#FF9800' : '#4CAF50'
                                                            }}>
                                                                {rate}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default PlanTracking;

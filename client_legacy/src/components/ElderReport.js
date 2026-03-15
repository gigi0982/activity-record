import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    BarChart, Bar
} from 'recharts';
import { getActivities } from '../utils/storage';

function ElderReport() {
    const { elderName } = useParams();
    const [elderData, setElderData] = useState(null);
    const [activities, setActivities] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [radarData, setRadarData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadElderData();
    }, [elderName]);

    const loadElderData = () => {
        setIsLoading(true);
        const allActivities = getActivities();

        // 篩選該長者參與的活動
        const elderActivities = allActivities
            .filter(activity =>
                activity.participants?.some(p => p.name === elderName)
            )
            .map(activity => {
                const participant = activity.participants.find(p => p.name === elderName);
                return {
                    ...activity,
                    elderPerformance: participant
                };
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        setActivities(elderActivities);

        // 計算趨勢資料
        const trend = elderActivities.map(activity => ({
            date: activity.date,
            topic: activity.topic,
            專注力: activity.elderPerformance?.focus || 0,
            互動性: activity.elderPerformance?.interaction || 0,
            注意力: activity.elderPerformance?.attention || 0
        }));
        setTrendData(trend);

        // 計算雷達圖資料（平均值）
        if (elderActivities.length > 0) {
            const totalFocus = elderActivities.reduce((sum, a) => sum + (a.elderPerformance?.focus || 0), 0);
            const totalInteraction = elderActivities.reduce((sum, a) => sum + (a.elderPerformance?.interaction || 0), 0);
            const totalAttention = elderActivities.reduce((sum, a) => sum + (a.elderPerformance?.attention || 0), 0);
            const count = elderActivities.length;

            setRadarData([
                { subject: '專注力', value: (totalFocus / count).toFixed(1), fullMark: 5 },
                { subject: '互動性', value: (totalInteraction / count).toFixed(1), fullMark: 5 },
                { subject: '注意力', value: (totalAttention / count).toFixed(1), fullMark: 5 },
                { subject: '參與率', value: Math.min(count / 10 * 5, 5).toFixed(1), fullMark: 5 },
                { subject: '穩定度', value: calculateStability(elderActivities).toFixed(1), fullMark: 5 }
            ]);

            // 設定長者基本資料
            const latestParticipant = elderActivities[elderActivities.length - 1]?.elderPerformance;
            setElderData({
                name: elderName,
                level: latestParticipant?.level || '-',
                levelDesc: latestParticipant?.levelDesc || '',
                participationCount: count,
                avgFocus: (totalFocus / count).toFixed(1),
                avgInteraction: (totalInteraction / count).toFixed(1),
                avgAttention: (totalAttention / count).toFixed(1),
                avgOverall: ((totalFocus + totalInteraction + totalAttention) / (count * 3)).toFixed(1)
            });
        }

        setIsLoading(false);
    };

    // 計算穩定度（分數變異越小越穩定）
    const calculateStability = (activities) => {
        if (activities.length < 2) return 5;
        const scores = activities.map(a =>
            ((a.elderPerformance?.focus || 0) + (a.elderPerformance?.interaction || 0) + (a.elderPerformance?.attention || 0)) / 3
        );
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
        // 變異數越小，穩定度越高（最高5分）
        return Math.max(5 - variance, 1);
    };

    // 取得分級顏色
    const getLevelColor = (level) => {
        switch (level) {
            case 'A': return '#4CAF50';
            case 'B': return '#FF9800';
            case 'C': return '#f44336';
            default: return '#999';
        }
    };

    // 列印報表
    const handlePrint = () => {
        window.print();
    };

    if (isLoading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">載入中...</span>
                </div>
                <p className="mt-2">載入長者資料中...</p>
            </div>
        );
    }

    if (!elderData) {
        return (
            <div className="alert alert-warning">
                <h4>找不到資料</h4>
                <p>找不到 {elderName} 的活動紀錄</p>
                <Link to="/" className="btn btn-primary">返回首頁</Link>
            </div>
        );
    }

    return (
        <div className="elder-report">
            {/* 頁面標題 */}
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <div>
                    <h2>
                        <i className="fas fa-user-circle me-2"></i>
                        {elderData.name} 個人報告
                        {elderData.level && (
                            <span
                                className="badge ms-2"
                                style={{ backgroundColor: getLevelColor(elderData.level), fontSize: '14px' }}
                            >
                                {elderData.level} - {elderData.levelDesc}
                            </span>
                        )}
                    </h2>
                </div>
                <div className="d-flex gap-2 no-print">
                    <button className="btn btn-outline-primary" onClick={handlePrint}>
                        🖨️ 列印報告
                    </button>
                    <Link to="/" className="btn btn-secondary">
                        ← 返回
                    </Link>
                </div>
            </div>

            {/* 統計卡片 */}
            <div className="row mb-4">
                <div className="col-md-3 col-6 mb-3">
                    <div className="card bg-primary text-white h-100">
                        <div className="card-body text-center">
                            <h3 className="mb-0">{elderData.participationCount}</h3>
                            <small>參與活動次數</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                    <div className="card bg-success text-white h-100">
                        <div className="card-body text-center">
                            <h3 className="mb-0">{elderData.avgOverall}</h3>
                            <small>平均總評分</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                    <div className="card bg-info text-white h-100">
                        <div className="card-body text-center">
                            <h3 className="mb-0">{elderData.avgFocus}</h3>
                            <small>平均專注力</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                    <div className="card bg-warning text-dark h-100">
                        <div className="card-body text-center">
                            <h3 className="mb-0">{elderData.avgInteraction}</h3>
                            <small>平均互動性</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* 圖表區域 */}
            <div className="row mb-4">
                {/* 趨勢折線圖 */}
                <div className="col-lg-8 mb-4">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-chart-line me-2"></i>
                                表現趨勢圖
                            </h5>
                        </div>
                        <div className="card-body">
                            {trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={trendData}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="date"
                                            tick={{ fontSize: 11 }}
                                            angle={-45}
                                            textAnchor="end"
                                            height={60}
                                        />
                                        <YAxis domain={[0, 5]} />
                                        <Tooltip
                                            formatter={(value, name) => [value, name]}
                                            labelFormatter={(label) => `日期: ${label}`}
                                        />
                                        <Legend />
                                        <Line type="monotone" dataKey="專注力" stroke="#2196F3" strokeWidth={2} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="互動性" stroke="#4CAF50" strokeWidth={2} dot={{ r: 4 }} />
                                        <Line type="monotone" dataKey="注意力" stroke="#FF9800" strokeWidth={2} dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-muted py-5">
                                    尚無足夠資料繪製趨勢圖
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 雷達圖 */}
                <div className="col-lg-4 mb-4">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-spider me-2"></i>
                                能力雷達圖
                            </h5>
                        </div>
                        <div className="card-body">
                            {radarData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <RadarChart data={radarData}>
                                        <PolarGrid />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 5]} />
                                        <Radar
                                            name="能力值"
                                            dataKey="value"
                                            stroke="#2196F3"
                                            fill="#2196F3"
                                            fillOpacity={0.5}
                                        />
                                        <Tooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-center text-muted py-5">
                                    尚無足夠資料
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 活動參與紀錄表格 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="mb-0">
                        <i className="fas fa-list me-2"></i>
                        活動參與紀錄
                    </h5>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead className="table-light">
                                <tr>
                                    <th>日期</th>
                                    <th>活動主題</th>
                                    <th className="text-center">專注力</th>
                                    <th className="text-center">互動性</th>
                                    <th className="text-center">注意力</th>
                                    <th>備註</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.slice().reverse().map((activity, index) => (
                                    <tr key={index}>
                                        <td>{activity.date}</td>
                                        <td>{activity.topic}</td>
                                        <td className="text-center">
                                            <span className={`badge ${activity.elderPerformance?.focus >= 4 ? 'bg-success' : activity.elderPerformance?.focus >= 3 ? 'bg-warning' : 'bg-danger'}`}>
                                                {activity.elderPerformance?.focus}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge ${activity.elderPerformance?.interaction >= 4 ? 'bg-success' : activity.elderPerformance?.interaction >= 3 ? 'bg-warning' : 'bg-danger'}`}>
                                                {activity.elderPerformance?.interaction}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge ${activity.elderPerformance?.attention >= 4 ? 'bg-success' : activity.elderPerformance?.attention >= 3 ? 'bg-warning' : 'bg-danger'}`}>
                                                {activity.elderPerformance?.attention}
                                            </span>
                                        </td>
                                        <td>
                                            <small className="text-muted">
                                                {activity.elderPerformance?.notes || '-'}
                                            </small>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {activities.length === 0 && (
                        <div className="text-center text-muted py-3">
                            尚無活動紀錄
                        </div>
                    )}
                </div>
            </div>

            {/* 列印時隱藏的樣式 */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    .card { break-inside: avoid; }
                }
            `}</style>
        </div>
    );
}

export default ElderReport;

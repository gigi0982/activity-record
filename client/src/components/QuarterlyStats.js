import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function QuarterlyStats() {
    const [stats, setStats] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedElder, setSelectedElder] = useState(null);
    const [elderTrend, setElderTrend] = useState(null);

    // 取得季度統計
    useEffect(() => {
        const fetchStats = async () => {
            setIsLoading(true);
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/api/stats/quarterly?year=${selectedYear}&quarter=${selectedQuarter}`
                );
                setStats(response.data);
            } catch (err) {
                console.error('取得統計資料失敗:', err);
                setError('無法載入統計資料');
            } finally {
                setIsLoading(false);
            }
        };
        fetchStats();
    }, [selectedYear, selectedQuarter]);

    // 取得長者個人趨勢
    const fetchElderTrend = async (elderName) => {
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/stats/elder/${encodeURIComponent(elderName)}`
            );
            setElderTrend(response.data);
            setSelectedElder(elderName);
        } catch (err) {
            console.error('取得長者趨勢失敗:', err);
        }
    };

    // 趨勢圖示
    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return <span className="text-success">↑</span>;
            case 'down': return <span className="text-danger">↓</span>;
            default: return <span className="text-secondary">→</span>;
        }
    };

    // 產生年份選項
    const yearOptions = [];
    for (let y = 2024; y <= new Date().getFullYear() + 1; y++) {
        yearOptions.push(y);
    }

    if (isLoading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">載入中...</span>
                </div>
                <p className="mt-2">載入統計資料中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                {error}
            </div>
        );
    }

    return (
        <div>
            {/* 頁面標題與選擇器 */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="fas fa-chart-bar me-2"></i>
                    季度統計報表
                </h2>
                <div className="d-flex gap-2">
                    <select
                        className="form-select"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        style={{ width: '120px' }}
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>{y} 年</option>
                        ))}
                    </select>
                    <select
                        className="form-select"
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                        style={{ width: '100px' }}
                    >
                        <option value={1}>Q1</option>
                        <option value={2}>Q2</option>
                        <option value={3}>Q3</option>
                        <option value={4}>Q4</option>
                    </select>
                </div>
            </div>

            {/* 摘要卡片 */}
            {stats && (
                <div className="row mb-4">
                    <div className="col-md-3">
                        <div className="card bg-primary text-white">
                            <div className="card-body text-center">
                                <h3 className="mb-0">{stats.period}</h3>
                                <small>統計期間</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-success text-white">
                            <div className="card-body text-center">
                                <h3 className="mb-0">{stats.totalActivities}</h3>
                                <small>活動次數</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-info text-white">
                            <div className="card-body text-center">
                                <h3 className="mb-0">{stats.elders?.length || 0}</h3>
                                <small>參與長者人數</small>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-warning text-dark">
                            <div className="card-body text-center">
                                <h3 className="mb-0">
                                    {stats.elders?.filter(e => e.needsAttention).length || 0}
                                </h3>
                                <small>需關注人數</small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 統計表格 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="mb-0">
                        <i className="fas fa-users me-2"></i>
                        長者表現統計
                    </h5>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover">
                            <thead className="table-light">
                                <tr>
                                    <th>長者姓名</th>
                                    <th className="text-center">參與次數</th>
                                    <th className="text-center">專注力</th>
                                    <th className="text-center">人際互動</th>
                                    <th className="text-center">注意力</th>
                                    <th className="text-center">趨勢</th>
                                    <th className="text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats?.elders?.map((elder) => (
                                    <tr
                                        key={elder.id}
                                        className={elder.needsAttention ? 'table-warning' : ''}
                                    >
                                        <td>
                                            <strong>{elder.name}</strong>
                                            {elder.needsAttention && (
                                                <span className="badge bg-danger ms-2">需關注</span>
                                            )}
                                        </td>
                                        <td className="text-center">{elder.participationCount}</td>
                                        <td className="text-center">
                                            <span className={parseFloat(elder.avgFocus) < 3 ? 'text-danger fw-bold' : ''}>
                                                {elder.avgFocus}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className={parseFloat(elder.avgInteraction) < 3 ? 'text-danger fw-bold' : ''}>
                                                {elder.avgInteraction}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <span className={parseFloat(elder.avgAttention) < 3 ? 'text-danger fw-bold' : ''}>
                                                {elder.avgAttention}
                                            </span>
                                        </td>
                                        <td className="text-center fs-5">
                                            {getTrendIcon(elder.trend)}
                                        </td>
                                        <td className="text-center">
                                            <button
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => fetchElderTrend(elder.name)}
                                            >
                                                <i className="fas fa-chart-line me-1"></i>
                                                趨勢
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 長者個人趨勢 Modal */}
            {selectedElder && elderTrend && (
                <div className="card border-primary">
                    <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                            <i className="fas fa-user me-2"></i>
                            {selectedElder} - 歷史趨勢
                        </h5>
                        <button
                            className="btn btn-sm btn-light"
                            onClick={() => { setSelectedElder(null); setElderTrend(null); }}
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-8">
                                <h6>季度表現變化</h6>
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>季度</th>
                                            <th className="text-center">專注力</th>
                                            <th className="text-center">人際互動</th>
                                            <th className="text-center">注意力</th>
                                            <th className="text-center">參與次數</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {elderTrend.quarters?.map((q, idx) => (
                                            <tr key={idx}>
                                                <td>{q.period}</td>
                                                <td className="text-center">{q.avgFocus}</td>
                                                <td className="text-center">{q.avgInteraction}</td>
                                                <td className="text-center">{q.avgAttention}</td>
                                                <td className="text-center">{q.participationCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="col-md-4">
                                <h6>最近備註</h6>
                                {elderTrend.recentNotes?.length > 0 ? (
                                    <ul className="list-group list-group-flush">
                                        {elderTrend.recentNotes.map((note, idx) => (
                                            <li key={idx} className="list-group-item px-0">
                                                <small className="text-muted">{note.date}</small>
                                                <br />
                                                {note.note}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-muted">暫無備註</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 返回按鈕 */}
            <div className="mt-4">
                <Link to="/" className="btn btn-secondary">
                    <i className="fas fa-arrow-left me-2"></i>
                    返回首頁
                </Link>
            </div>
        </div>
    );
}

export default QuarterlyStats;

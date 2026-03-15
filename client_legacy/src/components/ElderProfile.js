import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function ElderProfile() {
    const { name } = useParams();
    const navigate = useNavigate();
    const [elderData, setElderData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchElderData = async () => {
            if (!name) return;
            setIsLoading(true);
            try {
                const response = await axios.get(
                    `${API_BASE_URL}/api/stats/elder/${encodeURIComponent(name)}`
                );
                setElderData(response.data);
            } catch (err) {
                console.error('取得長者資料失敗:', err);
                setError('無法載入長者資料');
            } finally {
                setIsLoading(false);
            }
        };
        fetchElderData();
    }, [name]);

    // 計算整體平均
    const calculateOverallAvg = (field) => {
        if (!elderData?.quarters?.length) return 0;
        const sum = elderData.quarters.reduce((acc, q) => acc + parseFloat(q[field] || 0), 0);
        return (sum / elderData.quarters.length).toFixed(1);
    };

    // 趨勢圖示
    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return <span className="text-success fs-4">📈</span>;
            case 'down': return <span className="text-danger fs-4">📉</span>;
            default: return <span className="text-secondary fs-4">➡️</span>;
        }
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

    if (error) {
        return (
            <div className="alert alert-danger" role="alert">
                {error}
                <br />
                <Link to="/quarterly" className="btn btn-secondary mt-3">返回季度報表</Link>
            </div>
        );
    }

    return (
        <div>
            {/* 頁面標題 */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="fas fa-user me-2"></i>
                    {elderData?.name} - 個人檔案
                </h2>
                <button className="btn btn-secondary" onClick={() => navigate(-1)}>
                    <i className="fas fa-arrow-left me-2"></i>
                    返回
                </button>
            </div>

            {/* 整體表現摘要 */}
            <div className="row mb-4">
                <div className="col-md-3">
                    <div className="card text-center">
                        <div className="card-body">
                            <h5 className="card-title text-muted">整體趨勢</h5>
                            <div className="display-4">
                                {getTrendIcon(elderData?.overallTrend)}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center bg-primary text-white">
                        <div className="card-body">
                            <h5 className="card-title">平均專注力</h5>
                            <h2 className="mb-0">{calculateOverallAvg('avgFocus')}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center bg-success text-white">
                        <div className="card-body">
                            <h5 className="card-title">平均互動</h5>
                            <h2 className="mb-0">{calculateOverallAvg('avgInteraction')}</h2>
                        </div>
                    </div>
                </div>
                <div className="col-md-3">
                    <div className="card text-center bg-info text-white">
                        <div className="card-body">
                            <h5 className="card-title">平均注意力</h5>
                            <h2 className="mb-0">{calculateOverallAvg('avgAttention')}</h2>
                        </div>
                    </div>
                </div>
            </div>

            {/* 季度表現歷史 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h5 className="mb-0">
                        <i className="fas fa-chart-line me-2"></i>
                        季度表現歷史
                    </h5>
                </div>
                <div className="card-body">
                    {elderData?.quarters?.length > 0 ? (
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>季度</th>
                                        <th className="text-center">專注力</th>
                                        <th className="text-center">人際互動</th>
                                        <th className="text-center">注意力</th>
                                        <th className="text-center">參與次數</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {elderData.quarters.map((q, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{q.period}</strong></td>
                                            <td className="text-center">{q.avgFocus}</td>
                                            <td className="text-center">{q.avgInteraction}</td>
                                            <td className="text-center">{q.avgAttention}</td>
                                            <td className="text-center">{q.participationCount}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-muted">暫無歷史資料</p>
                    )}
                </div>
            </div>

            {/* 最近備註 */}
            <div className="card">
                <div className="card-header">
                    <h5 className="mb-0">
                        <i className="fas fa-sticky-note me-2"></i>
                        最近備註
                    </h5>
                </div>
                <div className="card-body">
                    {elderData?.recentNotes?.length > 0 ? (
                        <ul className="list-group list-group-flush">
                            {elderData.recentNotes.map((note, idx) => (
                                <li key={idx} className="list-group-item">
                                    <small className="text-muted">{note.date}</small>
                                    <p className="mb-0">{note.note}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-muted">暫無備註</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ElderProfile;

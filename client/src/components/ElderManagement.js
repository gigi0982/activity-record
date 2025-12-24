import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

function ElderManagement() {
    const [elders, setElders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newElder, setNewElder] = useState({ name: '', level: 'A', notes: '' });
    const [isAdding, setIsAdding] = useState(false);

    // 載入長者名單
    useEffect(() => {
        loadElders();
    }, []);

    const loadElders = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sheets-elders`);
            setElders(response.data || []);
        } catch (err) {
            console.error('載入失敗:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // 取得分級說明和評分範圍
    const getLevelInfo = (level) => {
        switch (level) {
            case 'A': return { desc: '輕度', range: '4-5分', color: '#4CAF50' };
            case 'B': return { desc: '中度', range: '3-4分', color: '#FF9800' };
            case 'C': return { desc: '重度', range: '2-3分', color: '#f44336' };
            default: return { desc: '', range: '', color: '#999' };
        }
    };

    // 新增長者
    const handleAddElder = async () => {
        if (!newElder.name.trim()) {
            alert('請輸入長者姓名');
            return;
        }

        setIsAdding(true);
        const levelInfo = getLevelInfo(newElder.level);

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addElder',
                    name: newElder.name.trim(),
                    level: newElder.level,
                    levelDesc: levelInfo.desc,
                    scoreRange: levelInfo.range,
                    notes: newElder.notes
                })
            });

            alert('新增成功！');
            setNewElder({ name: '', level: 'A', notes: '' });

            // 等待一下再重新載入
            setTimeout(loadElders, 1500);
        } catch (err) {
            console.error('新增失敗:', err);
            alert('新增失敗，請稍後再試');
        } finally {
            setIsAdding(false);
        }
    };

    // 刪除長者
    const handleDeleteElder = async (name) => {
        if (!window.confirm(`確定要刪除「${name}」嗎？`)) return;

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteElder',
                    name: name
                })
            });

            alert('刪除成功！');
            setTimeout(loadElders, 1500);
        } catch (err) {
            console.error('刪除失敗:', err);
            alert('刪除失敗，請稍後再試');
        }
    };

    return (
        <div className="elder-management">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="fas fa-users me-2"></i>
                    長者名單管理
                </h2>
                <div>
                    <button className="btn btn-outline-primary me-2" onClick={loadElders}>
                        🔄 重新整理
                    </button>
                    <Link to="/" className="btn btn-secondary">
                        ← 返回首頁
                    </Link>
                </div>
            </div>

            {/* 新增長者表單 */}
            <div className="card mb-4">
                <div className="card-header bg-success text-white">
                    <h5 className="mb-0">➕ 新增長者</h5>
                </div>
                <div className="card-body">
                    <div className="row align-items-end">
                        <div className="col-md-4 mb-2">
                            <label className="form-label">姓名 *</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="請輸入長者姓名"
                                value={newElder.name}
                                onChange={(e) => setNewElder({ ...newElder, name: e.target.value })}
                            />
                        </div>
                        <div className="col-md-2 mb-2">
                            <label className="form-label">能力分級 *</label>
                            <select
                                className="form-select"
                                value={newElder.level}
                                onChange={(e) => setNewElder({ ...newElder, level: e.target.value })}
                            >
                                <option value="A">A - 輕度</option>
                                <option value="B">B - 中度</option>
                                <option value="C">C - 重度</option>
                            </select>
                        </div>
                        <div className="col-md-4 mb-2">
                            <label className="form-label">備註</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="選填"
                                value={newElder.notes}
                                onChange={(e) => setNewElder({ ...newElder, notes: e.target.value })}
                            />
                        </div>
                        <div className="col-md-2 mb-2">
                            <button
                                className="btn btn-success w-100"
                                onClick={handleAddElder}
                                disabled={isAdding}
                            >
                                {isAdding ? '新增中...' : '新增'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 長者列表 */}
            <div className="card">
                <div className="card-header">
                    <h5 className="mb-0">📋 現有長者名單</h5>
                </div>
                <div className="card-body">
                    {isLoading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status"></div>
                            <p className="mt-2">載入中...</p>
                        </div>
                    ) : elders.length === 0 ? (
                        <div className="text-center text-muted py-4">
                            尚無長者資料，請新增
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>姓名</th>
                                        <th>能力分級</th>
                                        <th>建議評分</th>
                                        <th>備註</th>
                                        <th style={{ width: '80px' }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {elders.map((elder, index) => {
                                        const levelInfo = getLevelInfo(elder.level);
                                        return (
                                            <tr key={index}>
                                                <td><strong>{elder.name}</strong></td>
                                                <td>
                                                    <span
                                                        className="badge"
                                                        style={{ backgroundColor: levelInfo.color }}
                                                    >
                                                        {elder.level} - {elder.levelDesc || levelInfo.desc}
                                                    </span>
                                                </td>
                                                <td>{elder.scoreRange || levelInfo.range}</td>
                                                <td><small className="text-muted">{elder.notes || '-'}</small></td>
                                                <td>
                                                    <button
                                                        className="btn btn-outline-danger btn-sm"
                                                        onClick={() => handleDeleteElder(elder.name)}
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="text-muted small mt-2">
                        共 {elders.length} 位長者
                    </div>
                </div>
            </div>

            <div className="alert alert-info mt-4">
                <strong>💡 提示：</strong>新增或刪除後，需等待約 1-2 秒資料才會同步到 Google Sheets。
            </div>
        </div>
    );
}

export default ElderManagement;

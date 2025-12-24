import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

function ActivitySettings() {
    // 活動目的
    const [purposes, setPurposes] = useState([]);
    const [newPurpose, setNewPurpose] = useState({ name: '', description: '' });
    const [isLoadingPurposes, setIsLoadingPurposes] = useState(true);

    // 活動主題
    const [topics, setTopics] = useState([]);
    const [newTopic, setNewTopic] = useState({ name: '', purposes: '' });
    const [isLoadingTopics, setIsLoadingTopics] = useState(true);

    // 當前分頁
    const [activeTab, setActiveTab] = useState('purposes');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadPurposes();
        loadTopics();
    }, []);

    // 載入活動目的
    const loadPurposes = async () => {
        setIsLoadingPurposes(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sheets-purposes`);
            setPurposes(response.data || []);
        } catch (err) {
            console.error('載入活動目的失敗:', err);
        } finally {
            setIsLoadingPurposes(false);
        }
    };

    // 載入活動主題
    const loadTopics = async () => {
        setIsLoadingTopics(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sheets-topics`);
            setTopics(response.data || []);
        } catch (err) {
            console.error('載入活動主題失敗:', err);
        } finally {
            setIsLoadingTopics(false);
        }
    };

    // 新增活動目的
    const handleAddPurpose = async () => {
        if (!newPurpose.name.trim()) {
            alert('請輸入活動目的名稱');
            return;
        }

        setIsAdding(true);
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addPurpose',
                    name: newPurpose.name.trim(),
                    description: newPurpose.description
                })
            });

            alert('新增成功！');
            setNewPurpose({ name: '', description: '' });
            setTimeout(loadPurposes, 1500);
        } catch (err) {
            console.error('新增失敗:', err);
            alert('新增失敗，請稍後再試');
        } finally {
            setIsAdding(false);
        }
    };

    // 刪除活動目的
    const handleDeletePurpose = async (name) => {
        if (!window.confirm(`確定要刪除「${name}」嗎？`)) return;

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deletePurpose',
                    name: name
                })
            });

            alert('刪除成功！');
            setTimeout(loadPurposes, 1500);
        } catch (err) {
            console.error('刪除失敗:', err);
        }
    };

    // 新增活動主題
    const handleAddTopic = async () => {
        if (!newTopic.name.trim()) {
            alert('請輸入活動主題名稱');
            return;
        }

        setIsAdding(true);
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addTopic',
                    name: newTopic.name.trim(),
                    purposes: newTopic.purposes
                })
            });

            alert('新增成功！');
            setNewTopic({ name: '', purposes: '' });
            setTimeout(loadTopics, 1500);
        } catch (err) {
            console.error('新增失敗:', err);
            alert('新增失敗，請稍後再試');
        } finally {
            setIsAdding(false);
        }
    };

    // 刪除活動主題
    const handleDeleteTopic = async (name) => {
        if (!window.confirm(`確定要刪除「${name}」嗎？`)) return;

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deleteTopic',
                    name: name
                })
            });

            alert('刪除成功！');
            setTimeout(loadTopics, 1500);
        } catch (err) {
            console.error('刪除失敗:', err);
        }
    };

    return (
        <div className="activity-settings">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="fas fa-cog me-2"></i>
                    活動設定
                </h2>
                <Link to="/" className="btn btn-secondary">
                    ← 返回首頁
                </Link>
            </div>

            {/* Tab 導航 */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'purposes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('purposes')}
                    >
                        🎯 活動目的
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'topics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('topics')}
                    >
                        📋 活動主題
                    </button>
                </li>
            </ul>

            {/* 活動目的管理 */}
            {activeTab === 'purposes' && (
                <div>
                    {/* 新增活動目的 */}
                    <div className="card mb-4">
                        <div className="card-header bg-info text-white">
                            <h5 className="mb-0">➕ 新增活動目的</h5>
                        </div>
                        <div className="card-body">
                            <div className="row align-items-end">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">目的名稱 *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="例：提升認知功能"
                                        value={newPurpose.name}
                                        onChange={(e) => setNewPurpose({ ...newPurpose, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6 mb-2">
                                    <label className="form-label">說明</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="選填，例：訓練記憶力、注意力"
                                        value={newPurpose.description}
                                        onChange={(e) => setNewPurpose({ ...newPurpose, description: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-2 mb-2">
                                    <button
                                        className="btn btn-info text-white w-100"
                                        onClick={handleAddPurpose}
                                        disabled={isAdding}
                                    >
                                        {isAdding ? '新增中...' : '新增'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 活動目的列表 */}
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">📋 現有活動目的</h5>
                            <button className="btn btn-outline-primary btn-sm" onClick={loadPurposes}>
                                🔄 重新整理
                            </button>
                        </div>
                        <div className="card-body">
                            {isLoadingPurposes ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary"></div>
                                    <p className="mt-2">載入中...</p>
                                </div>
                            ) : purposes.length === 0 ? (
                                <div className="text-center text-muted py-4">
                                    尚無活動目的，請新增
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th>目的名稱</th>
                                                <th>說明</th>
                                                <th style={{ width: '80px' }}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {purposes.map((purpose, index) => (
                                                <tr key={index}>
                                                    <td><strong>{purpose.name}</strong></td>
                                                    <td><small className="text-muted">{purpose.description || '-'}</small></td>
                                                    <td>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleDeletePurpose(purpose.name)}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="text-muted small mt-2">
                                共 {purposes.length} 個活動目的
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 活動主題管理 */}
            {activeTab === 'topics' && (
                <div>
                    {/* 新增活動主題 */}
                    <div className="card mb-4">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">➕ 新增活動主題</h5>
                        </div>
                        <div className="card-body">
                            <div className="row align-items-end">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">主題名稱 *</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="例：懷舊歌曲欣賞"
                                        value={newTopic.name}
                                        onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-6 mb-2">
                                    <label className="form-label">對應活動目的（逗號分隔）</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="例：提升認知功能, 促進情緒表達"
                                        value={newTopic.purposes}
                                        onChange={(e) => setNewTopic({ ...newTopic, purposes: e.target.value })}
                                    />
                                </div>
                                <div className="col-md-2 mb-2">
                                    <button
                                        className="btn btn-primary w-100"
                                        onClick={handleAddTopic}
                                        disabled={isAdding}
                                    >
                                        {isAdding ? '新增中...' : '新增'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 活動主題列表 */}
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">📋 現有活動主題</h5>
                            <button className="btn btn-outline-primary btn-sm" onClick={loadTopics}>
                                🔄 重新整理
                            </button>
                        </div>
                        <div className="card-body">
                            {isLoadingTopics ? (
                                <div className="text-center py-4">
                                    <div className="spinner-border text-primary"></div>
                                    <p className="mt-2">載入中...</p>
                                </div>
                            ) : topics.length === 0 ? (
                                <div className="text-center text-muted py-4">
                                    尚無活動主題，請新增
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th>主題名稱</th>
                                                <th>對應活動目的</th>
                                                <th style={{ width: '80px' }}>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topics.map((topic, index) => (
                                                <tr key={index}>
                                                    <td><strong>{topic.name}</strong></td>
                                                    <td>
                                                        {topic.relatedPurposes?.map((p, i) => (
                                                            <span key={i} className="badge bg-info me-1">{p}</span>
                                                        )) || <span className="text-muted">-</span>}
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleDeleteTopic(topic.name)}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="text-muted small mt-2">
                                共 {topics.length} 個活動主題
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="alert alert-info mt-4">
                <strong>💡 提示：</strong>新增或刪除後，需等待約 1-2 秒資料才會同步。
            </div>
        </div>
    );
}

export default ActivitySettings;

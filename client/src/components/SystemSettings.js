import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

function SystemSettings() {
    // 長者
    const [elders, setElders] = useState([]);
    const [newElder, setNewElder] = useState({ name: '', level: 'A', notes: '' });
    const [isLoadingElders, setIsLoadingElders] = useState(true);

    // 活動主題
    const [topics, setTopics] = useState([]);
    const [newTopic, setNewTopic] = useState({ name: '', purposes: '' });
    const [isLoadingTopics, setIsLoadingTopics] = useState(true);
    const [editingTopic, setEditingTopic] = useState(null); // 編輯中的主題

    // 當前分頁
    const [activeTab, setActiveTab] = useState('elders');
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadElders();
        loadTopics();
    }, []);

    // 載入資料
    const loadElders = async () => {
        setIsLoadingElders(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sheets-elders`);
            setElders(response.data || []);
        } catch (err) { console.error('載入長者失敗:', err); }
        finally { setIsLoadingElders(false); }
    };

    const loadTopics = async () => {
        setIsLoadingTopics(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sheets-topics`);
            setTopics(response.data || []);
        } catch (err) { console.error('載入活動主題失敗:', err); }
        finally { setIsLoadingTopics(false); }
    };

    // 長者管理
    const getLevelInfo = (level) => {
        switch (level) {
            case 'A': return { desc: '輕度', range: '4-5分', color: '#4CAF50' };
            case 'B': return { desc: '中度', range: '3-4分', color: '#FF9800' };
            case 'C': return { desc: '重度', range: '2-3分', color: '#f44336' };
            default: return { desc: '', range: '', color: '#999' };
        }
    };

    const handleAddElder = async () => {
        if (!newElder.name.trim()) { alert('請輸入長者姓名'); return; }
        setIsAdding(true);
        const levelInfo = getLevelInfo(newElder.level);
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'addElder', name: newElder.name.trim(), level: newElder.level, levelDesc: levelInfo.desc, scoreRange: levelInfo.range, notes: newElder.notes })
            });
            alert('新增成功！'); setNewElder({ name: '', level: 'A', notes: '' });
            setTimeout(loadElders, 1500);
        } catch (err) { alert('新增失敗'); }
        finally { setIsAdding(false); }
    };

    const handleDeleteElder = async (name) => {
        if (!window.confirm(`確定要刪除「${name}」嗎？`)) return;
        try {
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteElder', name }) });
            alert('刪除成功！'); setTimeout(loadElders, 1500);
        } catch (err) { alert('刪除失敗'); }
    };

    // 活動主題管理
    const handleAddTopic = async () => {
        if (!newTopic.name.trim()) { alert('請輸入活動主題名稱'); return; }
        if (!newTopic.purposes.trim()) { alert('請輸入對應的活動目的'); return; }
        setIsAdding(true);
        try {
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addTopic', name: newTopic.name.trim(), purposes: newTopic.purposes }) });
            alert('新增成功！'); setNewTopic({ name: '', purposes: '' });
            setTimeout(loadTopics, 1500);
        } catch (err) { alert('新增失敗'); }
        finally { setIsAdding(false); }
    };

    const handleDeleteTopic = async (name) => {
        if (!window.confirm(`確定要刪除「${name}」嗎？`)) return;
        try {
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteTopic', name }) });
            alert('刪除成功！'); setTimeout(loadTopics, 1500);
        } catch (err) { alert('刪除失敗'); }
    };

    // 開始編輯主題
    const startEditTopic = (topic) => {
        setEditingTopic({
            name: topic.name,
            purposes: topic.relatedPurposes?.join(', ') || ''
        });
    };

    // 取消編輯
    const cancelEditTopic = () => {
        setEditingTopic(null);
    };

    // 儲存編輯
    const handleUpdateTopic = async () => {
        if (!editingTopic.purposes.trim()) { alert('請輸入對應的活動目的'); return; }
        setIsAdding(true);
        try {
            // 先刪除舊的，再新增新的
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteTopic', name: editingTopic.name }) });
            await new Promise(r => setTimeout(r, 500));
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addTopic', name: editingTopic.name, purposes: editingTopic.purposes }) });
            alert('更新成功！'); setEditingTopic(null);
            setTimeout(loadTopics, 1500);
        } catch (err) { alert('更新失敗'); }
        finally { setIsAdding(false); }
    };

    return (
        <div className="system-settings">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-cog me-2"></i>系統設定</h2>
                <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
            </div>

            {/* Tab 導航 */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === 'elders' ? 'active' : ''}`} onClick={() => setActiveTab('elders')}>
                        👴 長者名單
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${activeTab === 'topics' ? 'active' : ''}`} onClick={() => setActiveTab('topics')}>
                        📋 活動主題
                    </button>
                </li>
            </ul>

            {/* 長者名單 */}
            {activeTab === 'elders' && (
                <div>
                    <div className="card mb-4">
                        <div className="card-header bg-success text-white"><h5 className="mb-0">➕ 新增長者</h5></div>
                        <div className="card-body">
                            <div className="row align-items-end">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">姓名 *</label>
                                    <input type="text" className="form-control" placeholder="長者姓名" value={newElder.name} onChange={(e) => setNewElder({ ...newElder, name: e.target.value })} />
                                </div>
                                <div className="col-md-2 mb-2">
                                    <label className="form-label">能力分級 *</label>
                                    <select className="form-select" value={newElder.level} onChange={(e) => setNewElder({ ...newElder, level: e.target.value })}>
                                        <option value="A">A - 輕度</option>
                                        <option value="B">B - 中度</option>
                                        <option value="C">C - 重度</option>
                                    </select>
                                </div>
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">備註</label>
                                    <input type="text" className="form-control" placeholder="選填" value={newElder.notes} onChange={(e) => setNewElder({ ...newElder, notes: e.target.value })} />
                                </div>
                                <div className="col-md-2 mb-2">
                                    <button className="btn btn-success w-100" onClick={handleAddElder} disabled={isAdding}>{isAdding ? '...' : '新增'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header d-flex justify-content-between">
                            <h5 className="mb-0">📋 長者名單</h5>
                            <button className="btn btn-outline-primary btn-sm" onClick={loadElders}>🔄 重新整理</button>
                        </div>
                        <div className="card-body">
                            {isLoadingElders ? <div className="text-center py-3"><div className="spinner-border text-primary"></div></div> :
                                elders.length === 0 ? <div className="text-muted text-center py-3">尚無資料</div> :
                                    <div className="table-responsive">
                                        <table className="table table-hover table-sm">
                                            <thead className="table-light"><tr><th>姓名</th><th>分級</th><th>建議評分</th><th>備註</th><th>操作</th></tr></thead>
                                            <tbody>
                                                {elders.map((elder, i) => {
                                                    const info = getLevelInfo(elder.level);
                                                    return (<tr key={i}>
                                                        <td><strong>{elder.name}</strong></td>
                                                        <td><span className="badge" style={{ backgroundColor: info.color }}>{elder.level}-{elder.levelDesc || info.desc}</span></td>
                                                        <td>{elder.scoreRange || info.range}</td>
                                                        <td><small className="text-muted">{elder.notes || '-'}</small></td>
                                                        <td><button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteElder(elder.name)}>🗑️</button></td>
                                                    </tr>);
                                                })}
                                            </tbody>
                                        </table>
                                    </div>}
                            <small className="text-muted">共 {elders.length} 位</small>
                        </div>
                    </div>
                </div>
            )}

            {/* 活動主題 */}
            {activeTab === 'topics' && (
                <div>
                    <div className="card mb-4">
                        <div className="card-header bg-primary text-white"><h5 className="mb-0">➕ 新增活動主題</h5></div>
                        <div className="card-body">
                            <div className="row align-items-end">
                                <div className="col-md-4 mb-2">
                                    <label className="form-label">主題名稱 *</label>
                                    <input type="text" className="form-control" placeholder="例：認知促進" value={newTopic.name} onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })} />
                                </div>
                                <div className="col-md-6 mb-2">
                                    <label className="form-label">對應活動目的 *（逗號分隔）</label>
                                    <input type="text" className="form-control" placeholder="例：提升專注力, 增進社交技巧" value={newTopic.purposes} onChange={(e) => setNewTopic({ ...newTopic, purposes: e.target.value })} />
                                </div>
                                <div className="col-md-2 mb-2">
                                    <button className="btn btn-primary w-100" onClick={handleAddTopic} disabled={isAdding}>{isAdding ? '...' : '新增'}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header d-flex justify-content-between">
                            <h5 className="mb-0">📋 活動主題列表</h5>
                            <button className="btn btn-outline-primary btn-sm" onClick={loadTopics}>🔄 重新整理</button>
                        </div>
                        <div className="card-body">
                            {isLoadingTopics ? <div className="text-center py-3"><div className="spinner-border text-primary"></div></div> :
                                topics.length === 0 ? <div className="text-muted text-center py-3">尚無資料</div> :
                                    <div className="table-responsive">
                                        <table className="table table-hover table-sm">
                                            <thead className="table-light"><tr><th>主題名稱</th><th>對應活動目的</th><th>操作</th></tr></thead>
                                            <tbody>
                                                {topics.map((t, i) => (
                                                    <tr key={i}>
                                                        <td><strong>{t.name}</strong></td>
                                                        <td>
                                                            {editingTopic && editingTopic.name === t.name ? (
                                                                <input
                                                                    type="text"
                                                                    className="form-control form-control-sm"
                                                                    value={editingTopic.purposes}
                                                                    onChange={(e) => setEditingTopic({ ...editingTopic, purposes: e.target.value })}
                                                                    placeholder="逗號分隔，例：提升專注力, 增進社交技巧"
                                                                />
                                                            ) : (
                                                                t.relatedPurposes?.map((p, j) => <span key={j} className="badge bg-info me-1">{p}</span>) || '-'
                                                            )}
                                                        </td>
                                                        <td>
                                                            {editingTopic && editingTopic.name === t.name ? (
                                                                <>
                                                                    <button className="btn btn-success btn-sm me-1" onClick={handleUpdateTopic} disabled={isAdding}>✓</button>
                                                                    <button className="btn btn-secondary btn-sm" onClick={cancelEditTopic}>✕</button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button className="btn btn-outline-warning btn-sm me-1" onClick={() => startEditTopic(t)}>✏️</button>
                                                                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteTopic(t.name)}>🗑️</button>
                                                                </>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>}
                            <small className="text-muted">共 {topics.length} 個</small>
                        </div>
                    </div>
                </div>
            )}

            <div className="alert alert-info mt-4">
                <strong>💡 提示：</strong>在「新增活動」頁面選擇主題後，會自動帶出對應的活動目的。
            </div>
        </div>
    );
}

export default SystemSettings;

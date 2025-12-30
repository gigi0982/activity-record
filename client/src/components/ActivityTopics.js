import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import PageHeader from './PageHeader';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

function ActivityTopics() {
    // 活動主題
    const [topics, setTopics] = useState([]);
    const [newTopic, setNewTopic] = useState({ name: '', selectedPurposes: {} });
    const [isLoadingTopics, setIsLoadingTopics] = useState(true);
    const [editingTopic, setEditingTopic] = useState(null);

    // 活動目的清單（可選標籤）
    const [purposeList, setPurposeList] = useState([]);
    const [isLoadingPurposes, setIsLoadingPurposes] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadTopics();
        loadPurposes();
    }, []);

    const loadTopics = async () => {
        setIsLoadingTopics(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sheets-topics`);
            setTopics(response.data || []);
        } catch (err) { console.error('載入活動主題失敗:', err); }
        finally { setIsLoadingTopics(false); }
    };

    const loadPurposes = async () => {
        setIsLoadingPurposes(true);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/sheets-purposes`);
            setPurposeList(response.data || []);
        } catch (err) {
            console.error('載入活動目的失敗:', err);
            setPurposeList([
                { id: 'P1', name: '提升專注力' },
                { id: 'P2', name: '增進記憶力' },
                { id: 'P3', name: '促進社交互動' },
                { id: 'P4', name: '維持認知功能' },
                { id: 'P5', name: '情緒穩定' },
                { id: 'P6', name: '增進手眼協調' },
                { id: 'P7', name: '提升自我表達' },
                { id: 'P8', name: '增加生活參與' }
            ]);
        }
        finally { setIsLoadingPurposes(false); }
    };

    // 切換目的選取
    const togglePurpose = (purposeName) => {
        setNewTopic(prev => ({
            ...prev,
            selectedPurposes: {
                ...prev.selectedPurposes,
                [purposeName]: !prev.selectedPurposes[purposeName]
            }
        }));
    };

    const handleAddTopic = async () => {
        if (!newTopic.name.trim()) { alert('請輸入活動主題名稱'); return; }
        const selectedList = Object.keys(newTopic.selectedPurposes).filter(k => newTopic.selectedPurposes[k]);
        if (selectedList.length === 0) { alert('請至少選擇一個活動目的'); return; }

        setIsAdding(true);
        const purposesString = selectedList.join(', ');
        try {
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addTopic', name: newTopic.name.trim(), purposes: purposesString }) });
            alert('新增成功！'); setNewTopic({ name: '', selectedPurposes: {} });
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
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'deleteTopic', name: editingTopic.name }) });
            await new Promise(r => setTimeout(r, 500));
            await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'addTopic', name: editingTopic.name, purposes: editingTopic.purposes }) });
            alert('更新成功！'); setEditingTopic(null);
            setTimeout(loadTopics, 1500);
        } catch (err) { alert('更新失敗'); }
        finally { setIsAdding(false); }
    };

    return (
        <div className="activity-topics">
            <PageHeader
                title="活動主題管理"
                icon="🏷️"
                subtitle="管理活動主題與對應的活動目的"
            />

            {/* 新增活動主題 */}
            <div className="card mb-4">
                <div className="card-header bg-primary text-white"><h5 className="mb-0">➕ 新增活動主題</h5></div>
                <div className="card-body">
                    <div className="mb-3">
                        <label className="form-label">主題名稱 *</label>
                        <input type="text" className="form-control" placeholder="例：認知促進" value={newTopic.name} onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">對應活動目的 *（點擊選取）</label>
                        {isLoadingPurposes ? (
                            <div className="text-muted">載入中...</div>
                        ) : (
                            <div className="border rounded p-3 bg-light">
                                <div className="d-flex flex-wrap gap-2">
                                    {purposeList.map((p, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className={`btn btn-sm ${newTopic.selectedPurposes?.[p.name] ? 'btn-success' : 'btn-outline-secondary'}`}
                                            onClick={() => togglePurpose(p.name)}
                                            style={{
                                                transition: 'all 0.2s',
                                                borderRadius: '20px',
                                                fontWeight: newTopic.selectedPurposes?.[p.name] ? '600' : '400'
                                            }}
                                        >
                                            {newTopic.selectedPurposes?.[p.name] ? '✓ ' : ''}{p.name}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2 pt-2 border-top">
                                    <small className="text-muted">
                                        已選擇 {Object.values(newTopic.selectedPurposes || {}).filter(v => v).length} 個目的
                                    </small>
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="btn btn-primary" onClick={handleAddTopic} disabled={isAdding}>
                        {isAdding ? '新增中...' : '✓ 新增主題'}
                    </button>
                </div>
            </div>

            {/* 活動主題列表 */}
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

            <div className="alert alert-info mt-4">
                <strong>💡 提示：</strong>在「新增活動」頁面選擇主題後，會自動帶出對應的活動目的。
            </div>

            <Link to="/" className="btn btn-secondary mt-3">← 返回首頁</Link>
        </div>
    );
}

export default ActivityTopics;

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

    // 活動目的清單
    const [purposeList, setPurposeList] = useState([]);
    const [isLoadingPurposes, setIsLoadingPurposes] = useState(true);
    const [newPurposeName, setNewPurposeName] = useState('');
    const [isAddingPurpose, setIsAddingPurpose] = useState(false);

    // 操作狀態
    const [isAdding, setIsAdding] = useState(false);
    const [activeTab, setActiveTab] = useState('topics'); // 'topics' or 'purposes'

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
            if (response.data && response.data.length > 0) {
                setPurposeList(response.data);
            } else {
                // 預設清單
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

    // ========== 活動目的管理 ==========

    // 新增活動目的
    const handleAddPurpose = async () => {
        if (!newPurposeName.trim()) {
            alert('請輸入活動目的名稱');
            return;
        }

        // 檢查是否重複
        if (purposeList.some(p => p.name === newPurposeName.trim())) {
            alert('此活動目的已存在');
            return;
        }

        setIsAddingPurpose(true);
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addPurpose',
                    name: newPurposeName.trim()
                })
            });

            // 立即更新本地清單
            const newPurpose = {
                id: `P${Date.now()}`,
                name: newPurposeName.trim()
            };
            setPurposeList(prev => [...prev, newPurpose]);
            setNewPurposeName('');
            alert('新增成功！');

            // 延遲重新載入確保同步
            setTimeout(loadPurposes, 2000);
        } catch (err) {
            console.error('新增活動目的失敗:', err);
            alert('新增失敗');
        } finally {
            setIsAddingPurpose(false);
        }
    };

    // 刪除活動目的
    const handleDeletePurpose = async (purposeName) => {
        if (!window.confirm(`確定要刪除「${purposeName}」嗎？\n\n注意：已使用此目的的主題不會受影響。`)) return;

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'deletePurpose',
                    name: purposeName
                })
            });

            // 立即從本地清單移除
            setPurposeList(prev => prev.filter(p => p.name !== purposeName));
            alert('刪除成功！');
        } catch (err) {
            console.error('刪除活動目的失敗:', err);
            alert('刪除失敗');
        }
    };

    // ========== 活動主題管理 ==========

    // 切換目的選取（新增主題用）
    const togglePurpose = (purposeName) => {
        setNewTopic(prev => ({
            ...prev,
            selectedPurposes: {
                ...prev.selectedPurposes,
                [purposeName]: !prev.selectedPurposes[purposeName]
            }
        }));
    };

    // 切換目的選取（編輯主題用）
    const toggleEditPurpose = (purposeName) => {
        setEditingTopic(prev => ({
            ...prev,
            selectedPurposes: {
                ...prev.selectedPurposes,
                [purposeName]: !prev.selectedPurposes[purposeName]
            }
        }));
    };

    // 新增活動主題
    const handleAddTopic = async () => {
        if (!newTopic.name.trim()) {
            alert('請輸入活動主題名稱');
            return;
        }
        const selectedList = Object.keys(newTopic.selectedPurposes).filter(k => newTopic.selectedPurposes[k]);
        if (selectedList.length === 0) {
            alert('請至少選擇一個活動目的');
            return;
        }

        setIsAdding(true);
        const purposesString = selectedList.join(', ');
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addTopic',
                    name: newTopic.name.trim(),
                    purposes: purposesString
                })
            });
            alert('新增成功！');
            setNewTopic({ name: '', selectedPurposes: {} });
            setTimeout(loadTopics, 1500);
        } catch (err) {
            alert('新增失敗');
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
                body: JSON.stringify({ action: 'deleteTopic', name })
            });
            alert('刪除成功！');
            setTimeout(loadTopics, 1500);
        } catch (err) {
            alert('刪除失敗');
        }
    };

    // 開始編輯主題（轉換為標籤式選取）
    const startEditTopic = (topic) => {
        const selectedPurposes = {};
        topic.relatedPurposes?.forEach(p => {
            selectedPurposes[p] = true;
        });
        setEditingTopic({
            originalName: topic.name,
            name: topic.name,
            selectedPurposes
        });
    };

    // 取消編輯
    const cancelEditTopic = () => {
        setEditingTopic(null);
    };

    // 儲存編輯
    const handleUpdateTopic = async () => {
        const selectedList = Object.keys(editingTopic.selectedPurposes).filter(k => editingTopic.selectedPurposes[k]);
        if (selectedList.length === 0) {
            alert('請至少選擇一個活動目的');
            return;
        }

        setIsAdding(true);
        try {
            // 先刪除舊的
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteTopic', name: editingTopic.originalName })
            });
            await new Promise(r => setTimeout(r, 500));

            // 再新增更新後的
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addTopic',
                    name: editingTopic.name,
                    purposes: selectedList.join(', ')
                })
            });

            alert('更新成功！');
            setEditingTopic(null);
            setTimeout(loadTopics, 1500);
        } catch (err) {
            alert('更新失敗');
        } finally {
            setIsAdding(false);
        }
    };

    // 從主題中移除單一目的
    const removePurposeFromTopic = async (topic, purposeName) => {
        const newPurposes = topic.relatedPurposes.filter(p => p !== purposeName);
        if (newPurposes.length === 0) {
            alert('主題至少需要一個活動目的');
            return;
        }

        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteTopic', name: topic.name })
            });
            await new Promise(r => setTimeout(r, 500));
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addTopic',
                    name: topic.name,
                    purposes: newPurposes.join(', ')
                })
            });

            // 立即更新本地狀態
            setTopics(prev => prev.map(t =>
                t.name === topic.name
                    ? { ...t, relatedPurposes: newPurposes }
                    : t
            ));
        } catch (err) {
            alert('移除失敗');
        }
    };

    return (
        <div className="activity-topics">
            <PageHeader
                title="活動主題管理"
                icon="🏷️"
                subtitle="管理活動主題與活動目的"
            />

            {/* 分頁切換 */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'topics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('topics')}
                        style={{ fontWeight: activeTab === 'topics' ? 'bold' : 'normal' }}
                    >
                        🏷️ 活動主題
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'purposes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('purposes')}
                        style={{ fontWeight: activeTab === 'purposes' ? 'bold' : 'normal' }}
                    >
                        🎯 活動目的
                    </button>
                </li>
            </ul>

            {/* ========== 活動目的管理分頁 ========== */}
            {activeTab === 'purposes' && (
                <div className="purposes-management">
                    <div className="card mb-4">
                        <div className="card-header bg-success text-white">
                            <h5 className="mb-0">🎯 活動目的管理</h5>
                        </div>
                        <div className="card-body">
                            {/* 新增活動目的 */}
                            <div className="mb-4">
                                <label className="form-label fw-bold">新增活動目的</label>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="輸入新的活動目的名稱，例：增強肌力"
                                        value={newPurposeName}
                                        onChange={(e) => setNewPurposeName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleAddPurpose()}
                                    />
                                    <button
                                        className="btn btn-success"
                                        onClick={handleAddPurpose}
                                        disabled={isAddingPurpose}
                                    >
                                        {isAddingPurpose ? '新增中...' : '➕ 新增'}
                                    </button>
                                </div>
                            </div>

                            {/* 現有活動目的清單 */}
                            <div>
                                <label className="form-label fw-bold">
                                    現有活動目的（共 {purposeList.length} 個）
                                </label>
                                {isLoadingPurposes ? (
                                    <div className="text-center py-3">
                                        <div className="spinner-border text-success"></div>
                                    </div>
                                ) : (
                                    <div className="border rounded p-3 bg-light">
                                        <div className="d-flex flex-wrap gap-2">
                                            {purposeList.map((p, i) => (
                                                <span
                                                    key={i}
                                                    className="badge bg-success d-flex align-items-center"
                                                    style={{
                                                        fontSize: '0.95rem',
                                                        padding: '8px 12px',
                                                        borderRadius: '20px'
                                                    }}
                                                >
                                                    {p.name}
                                                    <button
                                                        type="button"
                                                        className="btn-close btn-close-white ms-2"
                                                        style={{ fontSize: '0.6rem' }}
                                                        onClick={() => handleDeletePurpose(p.name)}
                                                        title="刪除此目的"
                                                    />
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="alert alert-info mt-3 mb-0">
                                <small>
                                    💡 <strong>提示：</strong>新增的活動目的會自動同步到 Google Sheets，
                                    並可在新增活動主題時選用。
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== 活動主題管理分頁 ========== */}
            {activeTab === 'topics' && (
                <div className="topics-management">
                    {/* 新增活動主題 */}
                    <div className="card mb-4">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">➕ 新增活動主題</h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label fw-bold">主題名稱 *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="例：認知促進、懷舊團體、音樂律動"
                                    value={newTopic.name}
                                    onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label fw-bold">
                                    對應活動目的 *（點擊選取，可複選）
                                </label>
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
                                        <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                                            <small className={`${Object.values(newTopic.selectedPurposes || {}).filter(v => v).length === 0 ? 'text-danger' : 'text-success'}`}>
                                                已選擇 {Object.values(newTopic.selectedPurposes || {}).filter(v => v).length} 個目的
                                            </small>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline-success"
                                                onClick={() => setActiveTab('purposes')}
                                            >
                                                ➕ 新增活動目的
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={handleAddTopic}
                                disabled={isAdding}
                            >
                                {isAdding ? '新增中...' : '✓ 新增主題'}
                            </button>
                        </div>
                    </div>

                    {/* 活動主題列表 */}
                    <div className="card">
                        <div className="card-header d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">📋 活動主題列表</h5>
                            <button className="btn btn-outline-primary btn-sm" onClick={loadTopics}>
                                🔄 重新整理
                            </button>
                        </div>
                        <div className="card-body">
                            {isLoadingTopics ? (
                                <div className="text-center py-3">
                                    <div className="spinner-border text-primary"></div>
                                </div>
                            ) : topics.length === 0 ? (
                                <div className="text-muted text-center py-4">
                                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
                                    <p>尚無活動主題，請新增第一個主題</p>
                                </div>
                            ) : (
                                <div className="topic-list">
                                    {topics.map((t, i) => (
                                        <div
                                            key={i}
                                            className="topic-item border rounded p-3 mb-3"
                                            style={{
                                                backgroundColor: editingTopic?.originalName === t.name ? '#fff3cd' : '#fff',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {editingTopic?.originalName === t.name ? (
                                                // 編輯模式
                                                <div>
                                                    <div className="mb-3">
                                                        <label className="form-label fw-bold">主題名稱</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={editingTopic.name}
                                                            onChange={(e) => setEditingTopic({
                                                                ...editingTopic,
                                                                name: e.target.value
                                                            })}
                                                        />
                                                    </div>
                                                    <div className="mb-3">
                                                        <label className="form-label fw-bold">對應活動目的（點擊選取）</label>
                                                        <div className="d-flex flex-wrap gap-2">
                                                            {purposeList.map((p, j) => (
                                                                <button
                                                                    key={j}
                                                                    type="button"
                                                                    className={`btn btn-sm ${editingTopic.selectedPurposes?.[p.name] ? 'btn-success' : 'btn-outline-secondary'}`}
                                                                    onClick={() => toggleEditPurpose(p.name)}
                                                                    style={{
                                                                        borderRadius: '20px',
                                                                        fontWeight: editingTopic.selectedPurposes?.[p.name] ? '600' : '400'
                                                                    }}
                                                                >
                                                                    {editingTopic.selectedPurposes?.[p.name] ? '✓ ' : ''}{p.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="d-flex gap-2">
                                                        <button
                                                            className="btn btn-success"
                                                            onClick={handleUpdateTopic}
                                                            disabled={isAdding}
                                                        >
                                                            {isAdding ? '儲存中...' : '✓ 儲存變更'}
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={cancelEditTopic}
                                                        >
                                                            取消
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                // 顯示模式
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div style={{ flex: 1 }}>
                                                        <h6 className="mb-2" style={{ fontSize: '1.1rem' }}>
                                                            <strong>{t.name}</strong>
                                                        </h6>
                                                        <div className="d-flex flex-wrap gap-1">
                                                            {t.relatedPurposes?.map((p, j) => (
                                                                <span
                                                                    key={j}
                                                                    className="badge bg-info d-flex align-items-center"
                                                                    style={{
                                                                        fontSize: '0.85rem',
                                                                        padding: '5px 10px',
                                                                        borderRadius: '15px'
                                                                    }}
                                                                >
                                                                    {p}
                                                                    <button
                                                                        type="button"
                                                                        className="btn-close btn-close-white ms-1"
                                                                        style={{ fontSize: '0.5rem' }}
                                                                        onClick={() => removePurposeFromTopic(t, p)}
                                                                        title="從此主題移除"
                                                                    />
                                                                </span>
                                                            )) || <span className="text-muted">無對應目的</span>}
                                                        </div>
                                                    </div>
                                                    <div className="btn-group">
                                                        <button
                                                            className="btn btn-outline-warning btn-sm"
                                                            onClick={() => startEditTopic(t)}
                                                            title="編輯"
                                                        >
                                                            ✏️ 編輯
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => handleDeleteTopic(t.name)}
                                                            title="刪除"
                                                        >
                                                            🗑️ 刪除
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <small className="text-muted">共 {topics.length} 個活動主題</small>
                        </div>
                    </div>
                </div>
            )}

            <div className="alert alert-info mt-4">
                <strong>💡 使用說明：</strong>
                <ul className="mb-0 mt-2">
                    <li>先在「活動目的」分頁新增需要的目的選項</li>
                    <li>在「活動主題」分頁建立主題並選取對應目的</li>
                    <li>新增活動時選擇主題，系統會自動帶出對應目的</li>
                </ul>
            </div>

            <Link to="/" className="btn btn-secondary mt-3">← 返回首頁</Link>
        </div>
    );
}

export default ActivityTopics;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

// LocalStorage 鍵名
const STORAGE_KEYS = {
    ELDERS: 'settings_elders',
    TOPICS: 'settings_topics',
    PURPOSES: 'settings_purposes'
};

// 預設活動目的清單
const DEFAULT_PURPOSES = [
    { id: 'P1', name: '提升認知功能', description: '訓練記憶力、注意力' },
    { id: 'P2', name: '促進情緒表達', description: '引導表達感受' },
    { id: 'P3', name: '增進手部功能', description: '精細動作訓練' },
    { id: 'P4', name: '促進社交互動', description: '增加人際交流' },
    { id: 'P5', name: '提升生活品質', description: '增加生活樂趣' },
    { id: 'P6', name: '維持專注能力', description: '訓練持續專注' },
    { id: 'P7', name: '刺激感官功能', description: '視聽觸覺刺激' }
];

// 預設活動主題清單
const DEFAULT_TOPICS = [
    { id: 'T1', name: '懷舊歌曲欣賞', relatedPurposes: ['P1', 'P2', 'P5', 'P7'] },
    { id: 'T2', name: '手工藝製作', relatedPurposes: ['P1', 'P3', 'P4', 'P6'] },
    { id: 'T3', name: '園藝活動', relatedPurposes: ['P1', 'P3', 'P5', 'P7'] },
    { id: 'T4', name: '桌遊互動', relatedPurposes: ['P1', 'P4', 'P6'] },
    { id: 'T5', name: '體適能活動', relatedPurposes: ['P3', 'P5', 'P6'] }
];

function SystemSettings() {
    // 長者管理
    const [elders, setElders] = useState([]);
    const [newElder, setNewElder] = useState({ name: '', level: 'A', levelDesc: '輕度', notes: '' });
    const [editingElder, setEditingElder] = useState(null);

    // 活動目的管理
    const [purposes, setPurposes] = useState([]);
    const [newPurpose, setNewPurpose] = useState({ name: '', description: '' });

    // 活動主題管理
    const [topics, setTopics] = useState([]);
    const [newTopic, setNewTopic] = useState({ name: '', relatedPurposes: [] });
    const [editingTopic, setEditingTopic] = useState(null);

    // 目前選擇的 Tab
    const [activeTab, setActiveTab] = useState('elders');

    // 載入資料
    useEffect(() => {
        // 載入長者名單
        const savedElders = localStorage.getItem(STORAGE_KEYS.ELDERS);
        if (savedElders) {
            setElders(JSON.parse(savedElders));
        }

        // 載入活動目的
        const savedPurposes = localStorage.getItem(STORAGE_KEYS.PURPOSES);
        if (savedPurposes) {
            setPurposes(JSON.parse(savedPurposes));
        } else {
            setPurposes(DEFAULT_PURPOSES);
            localStorage.setItem(STORAGE_KEYS.PURPOSES, JSON.stringify(DEFAULT_PURPOSES));
        }

        // 載入活動主題
        const savedTopics = localStorage.getItem(STORAGE_KEYS.TOPICS);
        if (savedTopics) {
            setTopics(JSON.parse(savedTopics));
        } else {
            setTopics(DEFAULT_TOPICS);
            localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(DEFAULT_TOPICS));
        }
    }, []);

    // 儲存長者
    const saveElders = (newElders) => {
        setElders(newElders);
        localStorage.setItem(STORAGE_KEYS.ELDERS, JSON.stringify(newElders));
    };

    // 儲存活動目的
    const savePurposes = (newPurposes) => {
        setPurposes(newPurposes);
        localStorage.setItem(STORAGE_KEYS.PURPOSES, JSON.stringify(newPurposes));
    };

    // 儲存活動主題
    const saveTopics = (newTopics) => {
        setTopics(newTopics);
        localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(newTopics));
    };

    // === 長者管理 ===
    const addElder = () => {
        if (!newElder.name.trim()) {
            alert('請輸入長者姓名');
            return;
        }
        const elder = {
            id: `E${Date.now()}`,
            ...newElder,
            scoreRange: newElder.level === 'A' ? '4-5分' : newElder.level === 'B' ? '3-4分' : '2-3分'
        };
        saveElders([...elders, elder]);
        setNewElder({ name: '', level: 'A', levelDesc: '輕度', notes: '' });
    };

    const updateElder = () => {
        if (!editingElder.name.trim()) {
            alert('請輸入長者姓名');
            return;
        }
        const updated = elders.map(e =>
            e.id === editingElder.id
                ? { ...editingElder, scoreRange: editingElder.level === 'A' ? '4-5分' : editingElder.level === 'B' ? '3-4分' : '2-3分' }
                : e
        );
        saveElders(updated);
        setEditingElder(null);
    };

    const deleteElder = (id) => {
        if (window.confirm('確定要刪除這位長者嗎？')) {
            saveElders(elders.filter(e => e.id !== id));
        }
    };

    // === 活動目的管理 ===
    const addPurpose = () => {
        if (!newPurpose.name.trim()) {
            alert('請輸入活動目的名稱');
            return;
        }
        const purpose = {
            id: `P${Date.now()}`,
            ...newPurpose
        };
        savePurposes([...purposes, purpose]);
        setNewPurpose({ name: '', description: '' });
    };

    const deletePurpose = (id) => {
        if (window.confirm('確定要刪除這個活動目的嗎？')) {
            savePurposes(purposes.filter(p => p.id !== id));
            // 同時從主題中移除此目的
            const updatedTopics = topics.map(t => ({
                ...t,
                relatedPurposes: t.relatedPurposes.filter(pId => pId !== id)
            }));
            saveTopics(updatedTopics);
        }
    };

    // === 活動主題管理 ===
    const addTopic = () => {
        if (!newTopic.name.trim()) {
            alert('請輸入活動主題名稱');
            return;
        }
        const topic = {
            id: `T${Date.now()}`,
            ...newTopic
        };
        saveTopics([...topics, topic]);
        setNewTopic({ name: '', relatedPurposes: [] });
    };

    const updateTopic = () => {
        if (!editingTopic.name.trim()) {
            alert('請輸入活動主題名稱');
            return;
        }
        const updated = topics.map(t =>
            t.id === editingTopic.id ? editingTopic : t
        );
        saveTopics(updated);
        setEditingTopic(null);
    };

    const deleteTopic = (id) => {
        if (window.confirm('確定要刪除這個活動主題嗎？')) {
            saveTopics(topics.filter(t => t.id !== id));
        }
    };

    const togglePurposeForTopic = (purposeId) => {
        if (editingTopic) {
            const currentPurposes = editingTopic.relatedPurposes || [];
            const newPurposes = currentPurposes.includes(purposeId)
                ? currentPurposes.filter(id => id !== purposeId)
                : [...currentPurposes, purposeId];
            setEditingTopic({ ...editingTopic, relatedPurposes: newPurposes });
        } else {
            const currentPurposes = newTopic.relatedPurposes || [];
            const newPurposes = currentPurposes.includes(purposeId)
                ? currentPurposes.filter(id => id !== purposeId)
                : [...currentPurposes, purposeId];
            setNewTopic({ ...newTopic, relatedPurposes: newPurposes });
        }
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

    return (
        <div className="system-settings">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="fas fa-cog me-2"></i>
                    系統設定
                </h2>
                <Link to="/" className="btn btn-secondary">
                    ← 返回首頁
                </Link>
            </div>

            {/* Tab 導航 */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'elders' ? 'active' : ''}`}
                        onClick={() => setActiveTab('elders')}
                    >
                        👴 長者名單管理
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'topics' ? 'active' : ''}`}
                        onClick={() => setActiveTab('topics')}
                    >
                        📋 活動主題管理
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'purposes' ? 'active' : ''}`}
                        onClick={() => setActiveTab('purposes')}
                    >
                        🎯 活動目的管理
                    </button>
                </li>
            </ul>

            {/* ========== 長者名單管理 ========== */}
            {activeTab === 'elders' && (
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">👴 長者名單管理</h5>
                    </div>
                    <div className="card-body">
                        {/* 新增長者表單 */}
                        <div className="row mb-4 p-3 bg-light rounded">
                            <div className="col-md-3 mb-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="姓名"
                                    value={newElder.name}
                                    onChange={(e) => setNewElder({ ...newElder, name: e.target.value })}
                                />
                            </div>
                            <div className="col-md-2 mb-2">
                                <select
                                    className="form-select"
                                    value={newElder.level}
                                    onChange={(e) => {
                                        const level = e.target.value;
                                        const levelDesc = level === 'A' ? '輕度' : level === 'B' ? '中度' : '重度';
                                        setNewElder({ ...newElder, level, levelDesc });
                                    }}
                                >
                                    <option value="A">A - 輕度</option>
                                    <option value="B">B - 中度</option>
                                    <option value="C">C - 重度</option>
                                </select>
                            </div>
                            <div className="col-md-4 mb-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="備註（選填）"
                                    value={newElder.notes}
                                    onChange={(e) => setNewElder({ ...newElder, notes: e.target.value })}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <button className="btn btn-primary w-100" onClick={addElder}>
                                    ➕ 新增長者
                                </button>
                            </div>
                        </div>

                        {/* 長者列表 */}
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>姓名</th>
                                        <th>能力分級</th>
                                        <th>建議評分範圍</th>
                                        <th>備註</th>
                                        <th style={{ width: '120px' }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {elders.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted py-4">
                                                尚無長者資料，請新增長者
                                            </td>
                                        </tr>
                                    ) : elders.map((elder) => (
                                        <tr key={elder.id}>
                                            {editingElder?.id === elder.id ? (
                                                <>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            value={editingElder.name}
                                                            onChange={(e) => setEditingElder({ ...editingElder, name: e.target.value })}
                                                        />
                                                    </td>
                                                    <td>
                                                        <select
                                                            className="form-select form-select-sm"
                                                            value={editingElder.level}
                                                            onChange={(e) => {
                                                                const level = e.target.value;
                                                                const levelDesc = level === 'A' ? '輕度' : level === 'B' ? '中度' : '重度';
                                                                setEditingElder({ ...editingElder, level, levelDesc });
                                                            }}
                                                        >
                                                            <option value="A">A - 輕度</option>
                                                            <option value="B">B - 中度</option>
                                                            <option value="C">C - 重度</option>
                                                        </select>
                                                    </td>
                                                    <td>-</td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            value={editingElder.notes || ''}
                                                            onChange={(e) => setEditingElder({ ...editingElder, notes: e.target.value })}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button className="btn btn-success btn-sm me-1" onClick={updateElder}>
                                                            ✓
                                                        </button>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingElder(null)}>
                                                            ✗
                                                        </button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td><strong>{elder.name}</strong></td>
                                                    <td>
                                                        <span
                                                            className="badge"
                                                            style={{ backgroundColor: getLevelColor(elder.level) }}
                                                        >
                                                            {elder.level} - {elder.levelDesc}
                                                        </span>
                                                    </td>
                                                    <td>{elder.scoreRange || '-'}</td>
                                                    <td><small className="text-muted">{elder.notes || '-'}</small></td>
                                                    <td>
                                                        <button
                                                            className="btn btn-outline-primary btn-sm me-1"
                                                            onClick={() => setEditingElder({ ...elder })}
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn btn-outline-danger btn-sm"
                                                            onClick={() => deleteElder(elder.id)}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-muted small mt-2">
                            共 {elders.length} 位長者
                        </div>
                    </div>
                </div>
            )}

            {/* ========== 活動主題管理 ========== */}
            {activeTab === 'topics' && (
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">📋 活動主題管理</h5>
                    </div>
                    <div className="card-body">
                        {/* 新增主題表單 */}
                        <div className="row mb-4 p-3 bg-light rounded">
                            <div className="col-md-4 mb-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="活動主題名稱"
                                    value={newTopic.name}
                                    onChange={(e) => setNewTopic({ ...newTopic, name: e.target.value })}
                                />
                            </div>
                            <div className="col-md-6 mb-2">
                                <div className="d-flex flex-wrap gap-2">
                                    {purposes.map(p => (
                                        <div key={p.id} className="form-check">
                                            <input
                                                className="form-check-input"
                                                type="checkbox"
                                                id={`new-${p.id}`}
                                                checked={newTopic.relatedPurposes.includes(p.id)}
                                                onChange={() => togglePurposeForTopic(p.id)}
                                            />
                                            <label className="form-check-label small" htmlFor={`new-${p.id}`}>
                                                {p.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="col-md-2 mb-2">
                                <button className="btn btn-primary w-100" onClick={addTopic}>
                                    ➕ 新增主題
                                </button>
                            </div>
                        </div>

                        {/* 主題列表 */}
                        {topics.length === 0 ? (
                            <div className="text-center text-muted py-4">
                                尚無活動主題，請新增
                            </div>
                        ) : topics.map((topic) => (
                            <div key={topic.id} className="card mb-2">
                                <div className="card-body py-2">
                                    {editingTopic?.id === topic.id ? (
                                        <div className="row align-items-center">
                                            <div className="col-md-3">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    value={editingTopic.name}
                                                    onChange={(e) => setEditingTopic({ ...editingTopic, name: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-md-7">
                                                <div className="d-flex flex-wrap gap-2">
                                                    {purposes.map(p => (
                                                        <div key={p.id} className="form-check">
                                                            <input
                                                                className="form-check-input"
                                                                type="checkbox"
                                                                id={`edit-${p.id}`}
                                                                checked={editingTopic.relatedPurposes?.includes(p.id)}
                                                                onChange={() => togglePurposeForTopic(p.id)}
                                                            />
                                                            <label className="form-check-label small" htmlFor={`edit-${p.id}`}>
                                                                {p.name}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="col-md-2 text-end">
                                                <button className="btn btn-success btn-sm me-1" onClick={updateTopic}>
                                                    ✓
                                                </button>
                                                <button className="btn btn-secondary btn-sm" onClick={() => setEditingTopic(null)}>
                                                    ✗
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="row align-items-center">
                                            <div className="col-md-3">
                                                <strong>{topic.name}</strong>
                                            </div>
                                            <div className="col-md-7">
                                                {topic.relatedPurposes?.map(pId => {
                                                    const purpose = purposes.find(p => p.id === pId);
                                                    return purpose ? (
                                                        <span key={pId} className="badge bg-info me-1">
                                                            {purpose.name}
                                                        </span>
                                                    ) : null;
                                                })}
                                                {(!topic.relatedPurposes || topic.relatedPurposes.length === 0) && (
                                                    <span className="text-muted small">尚未設定相關目的</span>
                                                )}
                                            </div>
                                            <div className="col-md-2 text-end">
                                                <button
                                                    className="btn btn-outline-primary btn-sm me-1"
                                                    onClick={() => setEditingTopic({ ...topic })}
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => deleteTopic(topic.id)}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className="text-muted small mt-2">
                            共 {topics.length} 個活動主題
                        </div>
                    </div>
                </div>
            )}

            {/* ========== 活動目的管理 ========== */}
            {activeTab === 'purposes' && (
                <div className="card">
                    <div className="card-header">
                        <h5 className="mb-0">🎯 活動目的管理</h5>
                    </div>
                    <div className="card-body">
                        {/* 新增目的表單 */}
                        <div className="row mb-4 p-3 bg-light rounded">
                            <div className="col-md-4 mb-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="活動目的名稱"
                                    value={newPurpose.name}
                                    onChange={(e) => setNewPurpose({ ...newPurpose, name: e.target.value })}
                                />
                            </div>
                            <div className="col-md-5 mb-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="說明（選填）"
                                    value={newPurpose.description}
                                    onChange={(e) => setNewPurpose({ ...newPurpose, description: e.target.value })}
                                />
                            </div>
                            <div className="col-md-3 mb-2">
                                <button className="btn btn-primary w-100" onClick={addPurpose}>
                                    ➕ 新增目的
                                </button>
                            </div>
                        </div>

                        {/* 目的列表 */}
                        <div className="table-responsive">
                            <table className="table table-hover">
                                <thead className="table-light">
                                    <tr>
                                        <th>活動目的</th>
                                        <th>說明</th>
                                        <th style={{ width: '80px' }}>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {purposes.length === 0 ? (
                                        <tr>
                                            <td colSpan="3" className="text-center text-muted py-4">
                                                尚無活動目的，請新增
                                            </td>
                                        </tr>
                                    ) : purposes.map((purpose) => (
                                        <tr key={purpose.id}>
                                            <td><strong>{purpose.name}</strong></td>
                                            <td><small className="text-muted">{purpose.description || '-'}</small></td>
                                            <td>
                                                <button
                                                    className="btn btn-outline-danger btn-sm"
                                                    onClick={() => deletePurpose(purpose.id)}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="text-muted small mt-2">
                            共 {purposes.length} 個活動目的
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SystemSettings;

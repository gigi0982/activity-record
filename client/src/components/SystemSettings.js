import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import PageHeader from './PageHeader';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

function SystemSettings() {
    // 長者
    const [elders, setElders] = useState([]);
    const [newElder, setNewElder] = useState({ name: '', level: 'A', identityType: 'normal', notes: '', familyLineId: '' });
    const [isLoadingElders, setIsLoadingElders] = useState(true);
    const [editingElder, setEditingElder] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadElders();
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


    // 長者管理
    const getLevelInfo = (level) => {
        switch (level) {
            case 'A': return { desc: '輕度', range: '4-5分', color: '#4CAF50' };
            case 'B': return { desc: '中度', range: '3-4分', color: '#FF9800' };
            case 'C': return { desc: '重度', range: '2-3分', color: '#f44336' };
            default: return { desc: '', range: '', color: '#999' };
        }
    };

    // 身份類別資訊（含車資）
    const getIdentityInfo = (type) => {
        switch (type) {
            case 'normal': return { desc: '一般戶', fare: 18, color: '#2196F3' };
            case 'mediumLow': return { desc: '中低收', fare: 5, color: '#FF9800' };
            case 'low': return { desc: '低收', fare: 0, color: '#4CAF50' };
            default: return { desc: '一般戶', fare: 18, color: '#2196F3' };
        }
    };

    const handleAddElder = async () => {
        if (!newElder.name.trim()) { alert('請輸入長者姓名'); return; }
        setIsAdding(true);
        const levelInfo = getLevelInfo(newElder.level);
        const identityInfo = getIdentityInfo(newElder.identityType);
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'addElder',
                    name: newElder.name.trim(),
                    level: newElder.level,
                    levelDesc: levelInfo.desc,
                    scoreRange: levelInfo.range,
                    identityType: newElder.identityType,
                    identityDesc: identityInfo.desc,
                    fare: identityInfo.fare,
                    notes: newElder.notes,
                    familyLineId: newElder.familyLineId.trim()
                })
            });
            alert('新增成功！'); setNewElder({ name: '', level: 'A', identityType: 'normal', notes: '', familyLineId: '' });
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

    // 編輯長者
    const handleEditElder = (elder) => {
        setEditingElder({
            originalName: elder.name,
            name: elder.name,
            level: elder.level || 'A',
            identityType: elder.identityType || 'normal',
            notes: elder.notes || '',
            familyLineId: elder.familyLineId || ''
        });
    };

    const handleUpdateElder = async () => {
        if (!editingElder.name.trim()) { alert('請輸入長者姓名'); return; }
        setIsUpdating(true);
        const levelInfo = getLevelInfo(editingElder.level);
        const identityInfo = getIdentityInfo(editingElder.identityType);
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'updateElder',
                    originalName: editingElder.originalName,
                    name: editingElder.name.trim(),
                    level: editingElder.level,
                    levelDesc: levelInfo.desc,
                    scoreRange: levelInfo.range,
                    identityType: editingElder.identityType,
                    identityDesc: identityInfo.desc,
                    fare: identityInfo.fare,
                    notes: editingElder.notes,
                    familyLineId: editingElder.familyLineId.trim()
                })
            });
            alert('更新成功！');
            setEditingElder(null);
            setTimeout(loadElders, 1500);
        } catch (err) { alert('更新失敗'); }
        finally { setIsUpdating(false); }
    };


    return (
        <div className="system-settings">
            <PageHeader
                title="長者管理"
                icon="👴"
                subtitle="管理長者名單與基本資料"
            />

            {/* 長者名單 */}
            {true && (
                <div>
                    <div className="card mb-4">
                        <div className="card-header bg-success text-white"><h5 className="mb-0">➕ 新增長者</h5></div>
                        <div className="card-body">
                            <div className="row align-items-end">
                                <div className="col-md-3 mb-2">
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
                                <div className="col-md-2 mb-2">
                                    <label className="form-label">身份類別 *</label>
                                    <select className="form-select" value={newElder.identityType} onChange={(e) => setNewElder({ ...newElder, identityType: e.target.value })}>
                                        <option value="normal">一般戶 ($18)</option>
                                        <option value="mediumLow">中低收 ($5)</option>
                                        <option value="low">低收 ($0)</option>
                                    </select>
                                </div>
                                <div className="col-md-2 mb-2">
                                    <label className="form-label">備註</label>
                                    <input type="text" className="form-control" placeholder="選填" value={newElder.notes} onChange={(e) => setNewElder({ ...newElder, notes: e.target.value })} />
                                </div>
                                <div className="col-md-3 mb-2">
                                    <label className="form-label">家屬 LINE ID</label>
                                    <input type="text" className="form-control" placeholder="選填（如 U1234...）" value={newElder.familyLineId} onChange={(e) => setNewElder({ ...newElder, familyLineId: e.target.value })} />
                                </div>
                            </div>
                            <div className="row mt-2">
                                <div className="col-12 text-end">
                                    <button className="btn btn-success" onClick={handleAddElder} disabled={isAdding}>{isAdding ? '新增中...' : '➕ 新增長者'}</button>
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
                                            <thead className="table-light"><tr><th>姓名</th><th>分級</th><th>身份類別</th><th>車資</th><th>家屬 LINE</th><th>備註</th><th>操作</th></tr></thead>
                                            <tbody>
                                                {elders.map((elder, i) => {
                                                    const info = getLevelInfo(elder.level);
                                                    const identityInfo = getIdentityInfo(elder.identityType);
                                                    return (<tr key={i}>
                                                        <td><strong>{elder.name}</strong></td>
                                                        <td><span className="badge" style={{ backgroundColor: info.color }}>{elder.level}-{elder.levelDesc || info.desc}</span></td>
                                                        <td><span className="badge" style={{ backgroundColor: identityInfo.color }}>{elder.identityDesc || identityInfo.desc}</span></td>
                                                        <td><strong>${elder.fare !== undefined ? elder.fare : identityInfo.fare}</strong></td>
                                                        <td>{elder.familyLineId ? <span className="badge bg-success">✓</span> : <span className="text-muted">-</span>}</td>
                                                        <td><small className="text-muted">{elder.notes || '-'}</small></td>
                                                        <td>
                                                            <button className="btn btn-outline-primary btn-sm me-1" onClick={() => handleEditElder(elder)}>✏️</button>
                                                            <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteElder(elder.name)}>🗑️</button>
                                                        </td>
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

            {/* 編輯長者 Modal */}
            {editingElder && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">✏️ 編輯長者資料</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setEditingElder(null)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">姓名 *</label>
                                    <input type="text" className="form-control" value={editingElder.name}
                                        onChange={(e) => setEditingElder({ ...editingElder, name: e.target.value })} />
                                </div>
                                <div className="row">
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">能力分級</label>
                                        <select className="form-select" value={editingElder.level}
                                            onChange={(e) => setEditingElder({ ...editingElder, level: e.target.value })}>
                                            <option value="A">A - 輕度</option>
                                            <option value="B">B - 中度</option>
                                            <option value="C">C - 重度</option>
                                        </select>
                                    </div>
                                    <div className="col-md-6 mb-3">
                                        <label className="form-label">身份類別</label>
                                        <select className="form-select" value={editingElder.identityType}
                                            onChange={(e) => setEditingElder({ ...editingElder, identityType: e.target.value })}>
                                            <option value="normal">一般戶 ($18)</option>
                                            <option value="mediumLow">中低收 ($5)</option>
                                            <option value="low">低收 ($0)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">家屬 LINE ID</label>
                                    <input type="text" className="form-control" placeholder="例如：U1234567890abcdef..."
                                        value={editingElder.familyLineId}
                                        onChange={(e) => setEditingElder({ ...editingElder, familyLineId: e.target.value })} />
                                    <small className="text-muted">家屬在官方帳號輸入「我的ID」可取得</small>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">備註</label>
                                    <input type="text" className="form-control" placeholder="選填" value={editingElder.notes}
                                        onChange={(e) => setEditingElder({ ...editingElder, notes: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setEditingElder(null)}>取消</button>
                                <button className="btn btn-primary" onClick={handleUpdateElder} disabled={isUpdating}>
                                    {isUpdating ? '更新中...' : '💾 儲存變更'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

export default SystemSettings;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function PettyCash() {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);
    const [records, setRecords] = useState([]);
    const [newRecord, setNewRecord] = useState({
        item: '',
        amount: '',
        category: '文具用品',
        note: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    // 類別選項
    const categories = [
        '文具用品', '清潔用品', '食材', '活動材料', '交通', '雜支', '其他'
    ];

    // 載入當月紀錄
    useEffect(() => {
        const yearMonth = selectedDate.substring(0, 7);
        const saved = localStorage.getItem(`petty_cash_${yearMonth}`);
        if (saved) {
            setRecords(JSON.parse(saved));
        } else {
            setRecords([]);
        }
    }, [selectedDate]);

    // 儲存紀錄
    const saveRecords = (newRecords) => {
        const yearMonth = selectedDate.substring(0, 7);
        localStorage.setItem(`petty_cash_${yearMonth}`, JSON.stringify(newRecords));
        setRecords(newRecords);
    };

    // 新增紀錄
    const addRecord = () => {
        if (!newRecord.item.trim() || !newRecord.amount) {
            alert('請填寫項目名稱和金額');
            return;
        }

        const record = {
            id: Date.now(),
            date: selectedDate,
            item: newRecord.item.trim(),
            amount: parseInt(newRecord.amount) || 0,
            category: newRecord.category,
            note: newRecord.note.trim(),
            createdAt: new Date().toISOString(),
        };

        saveRecords([record, ...records]);
        setNewRecord({ item: '', amount: '', category: '文具用品', note: '' });
    };

    // 刪除紀錄
    const deleteRecord = (id) => {
        if (!window.confirm('確定要刪除這筆紀錄嗎？')) return;
        saveRecords(records.filter(r => r.id !== id));
    };

    // 計算當月總支出
    const monthlyTotal = records.reduce((sum, r) => sum + r.amount, 0);

    // 按類別統計
    const categoryStats = records.reduce((acc, r) => {
        acc[r.category] = (acc[r.category] || 0) + r.amount;
        return acc;
    }, {});

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-coins me-2"></i>零用金登記</h2>
                <input
                    type="month"
                    className="form-control"
                    style={{ width: '180px' }}
                    value={selectedDate.substring(0, 7)}
                    onChange={(e) => setSelectedDate(e.target.value + '-01')}
                />
            </div>

            {/* 月統計卡片 */}
            <div className="row mb-4">
                <div className="col-md-4">
                    <div className="card text-white" style={{ background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' }}>
                        <div className="card-body text-center">
                            <div className="h3 mb-0">${monthlyTotal.toLocaleString()}</div>
                            <small>本月總支出</small>
                        </div>
                    </div>
                </div>
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-body">
                            <h6 className="mb-2">類別統計</h6>
                            <div className="d-flex flex-wrap gap-2">
                                {Object.entries(categoryStats).map(([cat, amount]) => (
                                    <span key={cat} className="badge bg-secondary">
                                        {cat}: ${amount}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 新增表單 */}
            <div className="card mb-4">
                <div className="card-header bg-warning">
                    <i className="fas fa-plus me-2"></i>新增支出
                </div>
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-2">
                            <label className="form-label">日期</label>
                            <input
                                type="date"
                                className="form-control"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                            />
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">項目名稱 *</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="例：影印紙"
                                value={newRecord.item}
                                onChange={(e) => setNewRecord({ ...newRecord, item: e.target.value })}
                            />
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">金額 *</label>
                            <div className="input-group">
                                <span className="input-group-text">$</span>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={newRecord.amount}
                                    onChange={(e) => setNewRecord({ ...newRecord, amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">類別</label>
                            <select
                                className="form-select"
                                value={newRecord.category}
                                onChange={(e) => setNewRecord({ ...newRecord, category: e.target.value })}
                            >
                                {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-2">
                            <label className="form-label">備註</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="選填"
                                value={newRecord.note}
                                onChange={(e) => setNewRecord({ ...newRecord, note: e.target.value })}
                            />
                        </div>
                        <div className="col-md-1 d-flex align-items-end">
                            <button className="btn btn-success w-100" onClick={addRecord}>
                                新增
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 紀錄列表 */}
            <div className="card">
                <div className="card-header">
                    <i className="fas fa-list me-2"></i>支出紀錄
                </div>
                <div className="card-body p-0">
                    {records.length === 0 ? (
                        <p className="text-muted text-center py-4">本月尚無零用金支出紀錄</p>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>日期</th>
                                        <th>項目</th>
                                        <th>類別</th>
                                        <th className="text-end">金額</th>
                                        <th>備註</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map(r => (
                                        <tr key={r.id}>
                                            <td>{r.date}</td>
                                            <td><strong>{r.item}</strong></td>
                                            <td><span className="badge bg-secondary">{r.category}</span></td>
                                            <td className="text-end text-danger fw-bold">${r.amount}</td>
                                            <td><small className="text-muted">{r.note || '-'}</small></td>
                                            <td>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => deleteRecord(r.id)}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4">
                <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
            </div>
        </div>
    );
}

export default PettyCash;

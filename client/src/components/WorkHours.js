import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function WorkHours() {
    const today = new Date().toISOString().split('T')[0];
    const [selectedMonth, setSelectedMonth] = useState(today.substring(0, 7));
    const [assistants, setAssistants] = useState([]);
    const [records, setRecords] = useState([]);
    const [newAssistant, setNewAssistant] = useState('');
    const [hourlyRate, setHourlyRate] = useState(183); // 基本時薪

    // 載入助理名單
    useEffect(() => {
        const saved = localStorage.getItem('work_hours_assistants');
        if (saved) {
            setAssistants(JSON.parse(saved));
        } else {
            setAssistants(['助理A', '助理B']);
        }

        const savedRate = localStorage.getItem('work_hours_rate');
        if (savedRate) setHourlyRate(parseInt(savedRate));
    }, []);

    // 載入當月工時紀錄
    useEffect(() => {
        const saved = localStorage.getItem(`work_hours_${selectedMonth}`);
        if (saved) {
            setRecords(JSON.parse(saved));
        } else {
            setRecords([]);
        }
    }, [selectedMonth]);

    // 儲存紀錄
    const saveRecords = (newRecords) => {
        localStorage.setItem(`work_hours_${selectedMonth}`, JSON.stringify(newRecords));
        setRecords(newRecords);
    };

    // 新增助理
    const addAssistant = () => {
        if (!newAssistant.trim()) return;
        const updated = [...assistants, newAssistant.trim()];
        localStorage.setItem('work_hours_assistants', JSON.stringify(updated));
        setAssistants(updated);
        setNewAssistant('');
    };

    // 移除助理
    const removeAssistant = (name) => {
        if (!window.confirm(`確定要移除「${name}」嗎？`)) return;
        const updated = assistants.filter(a => a !== name);
        localStorage.setItem('work_hours_assistants', JSON.stringify(updated));
        setAssistants(updated);
    };

    // 更新工時
    const updateHours = (date, assistant, hours) => {
        const key = `${date}_${assistant}`;
        const existing = records.find(r => r.key === key);

        if (existing) {
            saveRecords(records.map(r =>
                r.key === key ? { ...r, hours: parseFloat(hours) || 0 } : r
            ));
        } else {
            saveRecords([...records, {
                key,
                date,
                assistant,
                hours: parseFloat(hours) || 0,
            }]);
        }
    };

    // 取得指定日期和助理的工時
    const getHours = (date, assistant) => {
        const record = records.find(r => r.date === date && r.assistant === assistant);
        return record ? record.hours : '';
    };

    // 取得當月所有日期
    const getDaysInMonth = () => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const days = new Date(year, month, 0).getDate();
        return Array.from({ length: days }, (_, i) => {
            const day = String(i + 1).padStart(2, '0');
            return `${selectedMonth}-${day}`;
        });
    };

    // 計算每位助理的月總工時
    const getMonthlyTotal = (assistant) => {
        return records
            .filter(r => r.assistant === assistant)
            .reduce((sum, r) => sum + (r.hours || 0), 0);
    };

    // 儲存時薪
    const saveRate = () => {
        localStorage.setItem('work_hours_rate', String(hourlyRate));
        alert('時薪設定已儲存');
    };

    // 計算薪資
    const calculateSalary = (hours) => Math.round(hours * hourlyRate);

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-clock me-2"></i>助理工時登記</h2>
                <div className="d-flex gap-2 align-items-center">
                    <input
                        type="month"
                        className="form-control"
                        style={{ width: '150px' }}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    />
                </div>
            </div>

            {/* 設定區 */}
            <div className="row mb-4">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header bg-info text-white">
                            <i className="fas fa-users me-2"></i>助理名單
                        </div>
                        <div className="card-body">
                            <div className="d-flex gap-2 flex-wrap mb-3">
                                {assistants.map(a => (
                                    <span key={a} className="badge bg-primary d-flex align-items-center gap-1" style={{ fontSize: '1rem', padding: '8px 12px' }}>
                                        {a}
                                        <button
                                            className="btn-close btn-close-white ms-1"
                                            style={{ fontSize: '0.6rem' }}
                                            onClick={() => removeAssistant(a)}
                                        />
                                    </span>
                                ))}
                            </div>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="新增助理姓名"
                                    value={newAssistant}
                                    onChange={(e) => setNewAssistant(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addAssistant()}
                                />
                                <button className="btn btn-success" onClick={addAssistant}>
                                    <i className="fas fa-plus"></i> 新增
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-header bg-warning">
                            <i className="fas fa-dollar-sign me-2"></i>薪資設定
                        </div>
                        <div className="card-body">
                            <div className="row align-items-center">
                                <div className="col-md-6">
                                    <label className="form-label">時薪</label>
                                    <div className="input-group">
                                        <span className="input-group-text">$</span>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={hourlyRate}
                                            onChange={(e) => setHourlyRate(parseInt(e.target.value) || 0)}
                                        />
                                        <span className="input-group-text">/小時</span>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label">&nbsp;</label>
                                    <button className="btn btn-primary w-100" onClick={saveRate}>
                                        儲存設定
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 月統計 */}
            <div className="card mb-4">
                <div className="card-header bg-success text-white">
                    <i className="fas fa-chart-bar me-2"></i>{selectedMonth} 月份統計
                </div>
                <div className="card-body">
                    <div className="row">
                        {assistants.map(assistant => {
                            const totalHours = getMonthlyTotal(assistant);
                            const salary = calculateSalary(totalHours);
                            return (
                                <div key={assistant} className="col-md-4 mb-3">
                                    <div className="card">
                                        <div className="card-body text-center">
                                            <h5 className="mb-2">{assistant}</h5>
                                            <div className="h4 text-primary mb-1">{totalHours} 小時</div>
                                            <div className="h5 text-success">${salary.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 工時表格 */}
            <div className="card mb-4">
                <div className="card-header">
                    <i className="fas fa-table me-2"></i>每日工時紀錄
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="table table-sm table-bordered mb-0">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th style={{ width: '120px' }}>日期</th>
                                    {assistants.map(a => (
                                        <th key={a} className="text-center">{a}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {getDaysInMonth().map(date => (
                                    <tr key={date}>
                                        <td className="fw-bold">{date}</td>
                                        {assistants.map(assistant => (
                                            <td key={assistant} className="text-center p-1">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm text-center"
                                                    style={{ width: '70px', margin: '0 auto' }}
                                                    placeholder="0"
                                                    step="0.5"
                                                    value={getHours(date, assistant)}
                                                    onChange={(e) => updateHours(date, assistant, e.target.value)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
        </div>
    );
}

export default WorkHours;

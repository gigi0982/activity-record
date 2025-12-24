import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function PlanEditor() {
    // 當前年月
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);

    // 活動規劃資料
    const [plannedActivities, setPlannedActivities] = useState([]);
    const [topicList, setTopicList] = useState([]);
    const [isLoadingTopics, setIsLoadingTopics] = useState(true);

    // 新增活動表單
    const [newActivity, setNewActivity] = useState({
        date: '',
        topic: '',
        time: '09:00-11:00',
        notes: ''
    });
    const [showAddForm, setShowAddForm] = useState(false);

    // 載入活動主題
    useEffect(() => {
        const fetchTopics = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/sheets-topics`);
                setTopicList(response.data || []);
            } catch (err) {
                console.error('載入主題失敗:', err);
            } finally {
                setIsLoadingTopics(false);
            }
        };
        fetchTopics();
    }, []);

    // 載入當月規劃資料
    useEffect(() => {
        const key = `planned_activities_${currentYear}_${currentMonth}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            setPlannedActivities(JSON.parse(saved));
        } else {
            setPlannedActivities([]);
        }
    }, [currentYear, currentMonth]);

    // 儲存規劃資料
    const saveActivities = (activities) => {
        const key = `planned_activities_${currentYear}_${currentMonth}`;
        localStorage.setItem(key, JSON.stringify(activities));
        setPlannedActivities(activities);
    };

    // 新增活動
    const handleAddActivity = () => {
        if (!newActivity.date || !newActivity.topic) {
            alert('請選擇日期和活動主題');
            return;
        }
        const activity = {
            id: Date.now(),
            ...newActivity,
            status: 'planned' // planned = 規劃中, done = 已執行
        };
        saveActivities([...plannedActivities, activity]);
        setNewActivity({ date: '', topic: '', time: '09:00-11:00', notes: '' });
        setShowAddForm(false);
    };

    // 刪除活動
    const handleDeleteActivity = (id) => {
        if (!window.confirm('確定要刪除這個活動嗎？')) return;
        saveActivities(plannedActivities.filter(a => a.id !== id));
    };

    // 標記已執行
    const markAsDone = (id) => {
        saveActivities(plannedActivities.map(a =>
            a.id === id ? { ...a, status: 'done' } : a
        ));
    };

    // 切換月份
    const changeMonth = (delta) => {
        let newMonth = currentMonth + delta;
        let newYear = currentYear;
        if (newMonth > 12) { newMonth = 1; newYear++; }
        if (newMonth < 1) { newMonth = 12; newYear--; }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
    };

    // 取得當月天數
    const getDaysInMonth = () => {
        return new Date(currentYear, currentMonth, 0).getDate();
    };

    // 取得當月第一天是星期幾
    const getFirstDayOfMonth = () => {
        return new Date(currentYear, currentMonth - 1, 1).getDay();
    };

    // 生成日曆格子
    const renderCalendar = () => {
        const daysInMonth = getDaysInMonth();
        const firstDay = getFirstDayOfMonth();
        const days = [];
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

        // 表頭
        const header = weekDays.map(d => (
            <div key={d} className="calendar-header-cell text-center fw-bold bg-light py-2">
                {d}
            </div>
        ));

        // 空白格
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-cell"></div>);
        }

        // 日期格
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayActivities = plannedActivities.filter(a => a.date === dateStr);
            const isToday = today.getFullYear() === currentYear &&
                today.getMonth() + 1 === currentMonth &&
                today.getDate() === day;

            days.push(
                <div
                    key={day}
                    className={`calendar-cell border p-1 ${isToday ? 'bg-warning bg-opacity-25' : ''}`}
                    style={{ minHeight: '80px', cursor: 'pointer' }}
                    onClick={() => {
                        setNewActivity(prev => ({ ...prev, date: dateStr }));
                        setShowAddForm(true);
                    }}
                >
                    <div className={`fw-bold ${isToday ? 'text-primary' : ''}`}>{day}</div>
                    {dayActivities.map(a => (
                        <div
                            key={a.id}
                            className={`badge w-100 text-start mb-1 ${a.status === 'done' ? 'bg-success' : 'bg-info'}`}
                            style={{ fontSize: '0.7rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                            onClick={(e) => { e.stopPropagation(); }}
                        >
                            {a.topic}
                        </div>
                    ))}
                </div>
            );
        }

        return (
            <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
                {header}
                {days}
            </div>
        );
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-calendar me-2"></i>活動規劃</h2>
                <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-outline-secondary" onClick={() => changeMonth(-1)}>
                        <i className="fas fa-chevron-left"></i>
                    </button>
                    <span className="h5 mb-0 mx-2">{currentYear} 年 {currentMonth} 月</span>
                    <button className="btn btn-outline-secondary" onClick={() => changeMonth(1)}>
                        <i className="fas fa-chevron-right"></i>
                    </button>
                    <button className="btn btn-primary ms-3" onClick={() => setShowAddForm(true)}>
                        <i className="fas fa-plus me-1"></i>新增活動
                    </button>
                </div>
            </div>

            {/* 日曆 */}
            <div className="card mb-4">
                <div className="card-body">
                    {renderCalendar()}
                </div>
            </div>

            {/* 本月活動列表 */}
            <div className="card mb-4">
                <div className="card-header d-flex justify-content-between">
                    <span><i className="fas fa-list me-2"></i>本月活動列表</span>
                    <span className="badge bg-primary">{plannedActivities.length} 個活動</span>
                </div>
                <div className="card-body">
                    {plannedActivities.length === 0 ? (
                        <p className="text-muted text-center mb-0">本月尚無規劃活動，點擊日曆或「新增活動」開始規劃</p>
                    ) : (
                        <table className="table table-sm table-hover">
                            <thead>
                                <tr>
                                    <th>日期</th>
                                    <th>時間</th>
                                    <th>活動主題</th>
                                    <th>備註</th>
                                    <th>狀態</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plannedActivities.sort((a, b) => a.date.localeCompare(b.date)).map(a => (
                                    <tr key={a.id}>
                                        <td>{a.date}</td>
                                        <td>{a.time}</td>
                                        <td><strong>{a.topic}</strong></td>
                                        <td><small className="text-muted">{a.notes || '-'}</small></td>
                                        <td>
                                            {a.status === 'done' ? (
                                                <span className="badge bg-success">✓ 已執行</span>
                                            ) : (
                                                <span className="badge bg-secondary">待執行</span>
                                            )}
                                        </td>
                                        <td>
                                            {a.status !== 'done' && (
                                                <button className="btn btn-sm btn-outline-success me-1" onClick={() => markAsDone(a.id)}>
                                                    ✓
                                                </button>
                                            )}
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteActivity(a.id)}>
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* 新增活動 Modal */}
            {showAddForm && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">新增活動規劃</h5>
                                <button type="button" className="btn-close" onClick={() => setShowAddForm(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">日期 *</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={newActivity.date}
                                        onChange={(e) => setNewActivity({ ...newActivity, date: e.target.value })}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">活動主題 *</label>
                                    {isLoadingTopics ? (
                                        <div className="text-muted">載入中...</div>
                                    ) : (
                                        <select
                                            className="form-select"
                                            value={newActivity.topic}
                                            onChange={(e) => setNewActivity({ ...newActivity, topic: e.target.value })}
                                        >
                                            <option value="">-- 請選擇 --</option>
                                            {topicList.map((t, i) => (
                                                <option key={i} value={t.name}>{t.name}</option>
                                            ))}
                                            <option value="__other">其他（自訂）</option>
                                        </select>
                                    )}
                                    {newActivity.topic === '__other' && (
                                        <input
                                            type="text"
                                            className="form-control mt-2"
                                            placeholder="輸入自訂活動主題"
                                            onChange={(e) => setNewActivity({ ...newActivity, topic: e.target.value })}
                                        />
                                    )}
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">時間</label>
                                    <select
                                        className="form-select"
                                        value={newActivity.time}
                                        onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                                    >
                                        <option value="09:00-11:00">上午 09:00-11:00</option>
                                        <option value="13:30-15:30">下午 13:30-15:30</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">備註</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={newActivity.notes}
                                        onChange={(e) => setNewActivity({ ...newActivity, notes: e.target.value })}
                                        placeholder="選填"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>取消</button>
                                <button type="button" className="btn btn-primary" onClick={handleAddActivity}>新增</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
        </div>
    );
}

export default PlanEditor;

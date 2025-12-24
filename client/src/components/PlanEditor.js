import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function PlanEditor() {
    // 當前季度
    const getQuarter = () => {
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        const q = Math.ceil(month / 3);
        return `${year}-Q${q}`;
    };

    const [selectedQuarter, setSelectedQuarter] = useState(getQuarter());
    const [topicList, setTopicList] = useState([]);
    const [isLoadingTopics, setIsLoadingTopics] = useState(true);

    // 每週課表（週一到週五）
    const [weeklySchedule, setWeeklySchedule] = useState({
        monday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
        tuesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
        wednesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
        thursday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
        friday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } }
    });

    const dayNames = {
        monday: '週一',
        tuesday: '週二',
        wednesday: '週三',
        thursday: '週四',
        friday: '週五'
    };

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

    // 載入儲存的課表
    useEffect(() => {
        const key = `weekly_schedule_${selectedQuarter}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            setWeeklySchedule(JSON.parse(saved));
        } else {
            // 重置為空
            setWeeklySchedule({
                monday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
                tuesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
                wednesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
                thursday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
                friday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } }
            });
        }
    }, [selectedQuarter]);

    // 更新課表項目
    const updateSchedule = (day, period, field, value) => {
        setWeeklySchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [period]: {
                    ...prev[day][period],
                    [field]: value
                }
            }
        }));
    };

    // 儲存課表
    const saveSchedule = () => {
        const key = `weekly_schedule_${selectedQuarter}`;
        localStorage.setItem(key, JSON.stringify(weeklySchedule));
        alert('課表已儲存！');
    };

    // 清空課表
    const clearSchedule = () => {
        if (!window.confirm('確定要清空本季課表嗎？')) return;
        const empty = {
            monday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
            tuesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
            wednesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
            thursday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
            friday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } }
        };
        setWeeklySchedule(empty);
        localStorage.removeItem(`weekly_schedule_${selectedQuarter}`);
    };

    // 渲染課表格子
    const renderCell = (day, period) => {
        const data = weeklySchedule[day]?.[period] || { topic: '', activityName: '', materials: '' };

        return (
            <td className="p-2" style={{ verticalAlign: 'top', minWidth: '180px' }}>
                <select
                    className="form-select form-select-sm mb-1"
                    value={data.topic}
                    onChange={(e) => updateSchedule(day, period, 'topic', e.target.value)}
                >
                    <option value="">-- 選擇主題 --</option>
                    {topicList.map((t, i) => (
                        <option key={i} value={t.name}>{t.name}</option>
                    ))}
                </select>
                {data.topic && (
                    <>
                        <input
                            type="text"
                            className="form-control form-control-sm mb-1"
                            placeholder="活動名稱"
                            value={data.activityName}
                            onChange={(e) => updateSchedule(day, period, 'activityName', e.target.value)}
                        />
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="材料"
                            value={data.materials}
                            onChange={(e) => updateSchedule(day, period, 'materials', e.target.value)}
                        />
                    </>
                )}
            </td>
        );
    };

    // 統計本季課程數
    const countCourses = () => {
        let count = 0;
        Object.values(weeklySchedule).forEach(day => {
            if (day.am?.topic) count++;
            if (day.pm?.topic) count++;
        });
        return count;
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-calendar-week me-2"></i>每週課表</h2>
                <div className="d-flex align-items-center gap-2">
                    <select
                        className="form-select"
                        style={{ width: '150px' }}
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(e.target.value)}
                    >
                        <option value="2024-Q4">2024 Q4</option>
                        <option value="2025-Q1">2025 Q1</option>
                        <option value="2025-Q2">2025 Q2</option>
                        <option value="2025-Q3">2025 Q3</option>
                        <option value="2025-Q4">2025 Q4</option>
                    </select>
                </div>
            </div>

            <div className="alert alert-info mb-4">
                <strong>💡 說明：</strong>設定好每週固定課表後，本季每週都會照此安排執行。
                <span className="badge bg-primary ms-2">{countCourses()} 堂課/週</span>
            </div>

            {/* 每週課表 */}
            <div className="card mb-4">
                <div className="card-header">
                    <span><i className="fas fa-table me-2"></i>{selectedQuarter} 每週課表</span>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-bordered mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th className="text-center" style={{ width: '80px' }}>時段</th>
                                    {Object.entries(dayNames).map(([key, name]) => (
                                        <th key={key} className="text-center">{name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="text-center fw-bold bg-light">
                                        <div>上午</div>
                                        <small className="text-muted">09:00-11:00</small>
                                    </td>
                                    {Object.keys(dayNames).map(day => renderCell(day, 'am'))}
                                </tr>
                                <tr>
                                    <td className="text-center fw-bold bg-light">
                                        <div>下午</div>
                                        <small className="text-muted">13:30-15:30</small>
                                    </td>
                                    {Object.keys(dayNames).map(day => renderCell(day, 'pm'))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* 課表摘要 */}
            <div className="card mb-4">
                <div className="card-header">
                    <span><i className="fas fa-list me-2"></i>課表摘要</span>
                </div>
                <div className="card-body">
                    {countCourses() === 0 ? (
                        <p className="text-muted mb-0">尚未設定任何課程</p>
                    ) : (
                        <div className="row">
                            {Object.entries(dayNames).map(([day, name]) => {
                                const am = weeklySchedule[day]?.am;
                                const pm = weeklySchedule[day]?.pm;
                                if (!am?.topic && !pm?.topic) return null;
                                return (
                                    <div key={day} className="col-md-4 mb-3">
                                        <div className="card h-100">
                                            <div className="card-header py-2 bg-primary text-white">{name}</div>
                                            <div className="card-body py-2">
                                                {am?.topic && (
                                                    <div className="mb-2">
                                                        <span className="badge bg-warning text-dark me-1">上午</span>
                                                        <strong>{am.topic}</strong>
                                                        {am.activityName && <div><small>{am.activityName}</small></div>}
                                                        {am.materials && <div><small className="text-muted">材料：{am.materials}</small></div>}
                                                    </div>
                                                )}
                                                {pm?.topic && (
                                                    <div>
                                                        <span className="badge bg-info me-1">下午</span>
                                                        <strong>{pm.topic}</strong>
                                                        {pm.activityName && <div><small>{pm.activityName}</small></div>}
                                                        {pm.materials && <div><small className="text-muted">材料：{pm.materials}</small></div>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* 操作按鈕 */}
            <div className="d-flex gap-2">
                <button className="btn btn-primary btn-lg" onClick={saveSchedule}>
                    <i className="fas fa-save me-1"></i>儲存課表
                </button>
                <button className="btn btn-outline-danger" onClick={clearSchedule}>
                    清空課表
                </button>
                <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
            </div>
        </div>
    );
}

export default PlanEditor;

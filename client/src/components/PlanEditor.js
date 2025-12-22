import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function PlanEditor() {
    const [plans, setPlans] = useState([]);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [meetings, setMeetings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newPlanQuarter, setNewPlanQuarter] = useState('2025-Q1');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plansRes, meetingsRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/plans`),
                    axios.get(`${API_BASE_URL}/api/meetings`)
                ]);
                setPlans(plansRes.data);
                setMeetings(meetingsRes.data);
                if (plansRes.data.length > 0) {
                    setSelectedPlan(plansRes.data[0]);
                }
            } catch (err) {
                console.error('載入資料失敗:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const createNewPlan = () => {
        const newPlan = {
            id: `plan_${newPlanQuarter}`,
            quarter: newPlanQuarter,
            title: `${newPlanQuarter.replace('-', ' ')} 活動規劃`,
            activities: [],
            specialNotes: []
        };
        setSelectedPlan(newPlan);
    };

    const addActivity = () => {
        setSelectedPlan(prev => ({
            ...prev,
            activities: [...prev.activities, { month: 1, topic: '', count: 1, notes: '' }]
        }));
    };

    const updateActivity = (idx, field, value) => {
        setSelectedPlan(prev => ({
            ...prev,
            activities: prev.activities.map((a, i) =>
                i === idx ? { ...a, [field]: value } : a
            )
        }));
    };

    const removeActivity = (idx) => {
        setSelectedPlan(prev => ({
            ...prev,
            activities: prev.activities.filter((_, i) => i !== idx)
        }));
    };

    const importFromMeeting = (meeting) => {
        const notes = meeting.decisions?.map(d => ({
            elderName: '全體',
            note: d.content,
            fromMeeting: meeting.id
        })) || [];

        const elderNotes = meeting.discussions?.map(d => ({
            elderName: d.elderName,
            note: d.suggestion,
            fromMeeting: meeting.id
        })) || [];

        setSelectedPlan(prev => ({
            ...prev,
            specialNotes: [...(prev.specialNotes || []), ...notes, ...elderNotes]
        }));
    };

    const removeNote = (idx) => {
        setSelectedPlan(prev => ({
            ...prev,
            specialNotes: prev.specialNotes.filter((_, i) => i !== idx)
        }));
    };

    const savePlan = async () => {
        setIsSaving(true);
        try {
            await axios.post(`${API_BASE_URL}/api/plans`, selectedPlan);
            alert('活動規劃儲存成功！');
            // 重新載入
            const res = await axios.get(`${API_BASE_URL}/api/plans`);
            setPlans(res.data);
        } catch (err) {
            console.error('儲存失敗:', err);
            alert('儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    const getMonthName = (month) => {
        return ['', '一月', '二月', '三月', '四月', '五月', '六月',
            '七月', '八月', '九月', '十月', '十一月', '十二月'][month];
    };

    if (isLoading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-calendar-alt me-2"></i>活動規劃</h2>
                <div className="d-flex gap-2">
                    <select
                        className="form-select"
                        style={{ width: '150px' }}
                        value={newPlanQuarter}
                        onChange={e => setNewPlanQuarter(e.target.value)}
                    >
                        <option value="2025-Q1">2025 Q1</option>
                        <option value="2025-Q2">2025 Q2</option>
                        <option value="2025-Q3">2025 Q3</option>
                        <option value="2025-Q4">2025 Q4</option>
                    </select>
                    <button className="btn btn-primary" onClick={createNewPlan}>
                        <i className="fas fa-plus me-1"></i>新增規劃
                    </button>
                </div>
            </div>

            {/* 現有規劃選擇 */}
            {plans.length > 0 && (
                <div className="mb-4">
                    <div className="btn-group">
                        {plans.map(plan => (
                            <button
                                key={plan.id}
                                className={`btn ${selectedPlan?.id === plan.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setSelectedPlan(plan)}
                            >
                                {plan.quarter}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {selectedPlan ? (
                <div>
                    {/* 活動規劃表格 */}
                    <div className="card mb-4">
                        <div className="card-header d-flex justify-content-between">
                            <span><i className="fas fa-list me-2"></i>{selectedPlan.title || selectedPlan.quarter} 活動</span>
                            <button className="btn btn-sm btn-success" onClick={addActivity}>
                                <i className="fas fa-plus me-1"></i>新增活動
                            </button>
                        </div>
                        <div className="card-body">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>月份</th>
                                        <th>活動主題</th>
                                        <th>次數</th>
                                        <th>備註</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedPlan.activities?.map((a, idx) => (
                                        <tr key={idx}>
                                            <td style={{ width: '100px' }}>
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={a.month}
                                                    onChange={e => updateActivity(idx, 'month', parseInt(e.target.value))}
                                                >
                                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                                        <option key={m} value={m}>{getMonthName(m)}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td>
                                                <input
                                                    className="form-control form-control-sm"
                                                    value={a.topic}
                                                    onChange={e => updateActivity(idx, 'topic', e.target.value)}
                                                    placeholder="活動主題"
                                                />
                                            </td>
                                            <td style={{ width: '80px' }}>
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    value={a.count}
                                                    onChange={e => updateActivity(idx, 'count', parseInt(e.target.value))}
                                                    min="1"
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    className="form-control form-control-sm"
                                                    value={a.notes}
                                                    onChange={e => updateActivity(idx, 'notes', e.target.value)}
                                                    placeholder="備註"
                                                />
                                            </td>
                                            <td style={{ width: '50px' }}>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => removeActivity(idx)}
                                                >
                                                    <i className="fas fa-times"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {selectedPlan.activities?.length === 0 && (
                                <p className="text-muted text-center">尚無活動，點擊「新增活動」開始規劃</p>
                            )}
                        </div>
                    </div>

                    {/* 特別注意事項（來自會議決議） */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <i className="fas fa-exclamation-triangle me-2"></i>特別注意事項
                        </div>
                        <div className="card-body">
                            {/* 從會議匯入 */}
                            {meetings.length > 0 && (
                                <div className="mb-3">
                                    <label className="form-label">從會議決議匯入：</label>
                                    <div className="d-flex gap-2 flex-wrap">
                                        {meetings.map(m => (
                                            <button
                                                key={m.id}
                                                className="btn btn-sm btn-outline-secondary"
                                                onClick={() => importFromMeeting(m)}
                                            >
                                                匯入 {m.quarter} 會議
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedPlan.specialNotes?.length > 0 ? (
                                <ul className="list-group">
                                    {selectedPlan.specialNotes.map((note, idx) => (
                                        <li key={idx} className="list-group-item d-flex justify-content-between">
                                            <div>
                                                <strong>{note.elderName}</strong>：{note.note}
                                            </div>
                                            <button
                                                className="btn btn-sm btn-outline-danger"
                                                onClick={() => removeNote(idx)}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-muted">無特別注意事項</p>
                            )}
                        </div>
                    </div>

                    {/* 儲存按鈕 */}
                    <div className="d-flex gap-2">
                        <button
                            className="btn btn-primary btn-lg"
                            onClick={savePlan}
                            disabled={isSaving}
                        >
                            {isSaving ? '儲存中...' : '儲存規劃'}
                        </button>
                        <Link to="/" className="btn btn-secondary btn-lg">返回首頁</Link>
                    </div>
                </div>
            ) : (
                <div className="alert alert-info">
                    請選擇現有規劃或新增一個新的季度規劃
                </div>
            )}
        </div>
    );
}

export default PlanEditor;

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function MeetingForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [elderList, setElderList] = useState([]);
    const [activities, setActivities] = useState([]);
    const [selectedActivities, setSelectedActivities] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        quarter: `${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
        title: '',
        attendees: ['主任', '社工', '照服員'],
        discussions: [],
        decisions: [],
        linkedActivities: []
    });

    useEffect(() => {
        // 載入長者名單
        axios.get(`${API_BASE_URL}/api/elders`)
            .then(res => setElderList(res.data))
            .catch(console.error);

        // 載入活動列表
        axios.get(`${API_BASE_URL}/api/activities`)
            .then(res => setActivities(res.data))
            .catch(console.error);

        // 如果是編輯模式，載入資料
        if (id) {
            axios.get(`${API_BASE_URL}/api/meetings/${id}`)
                .then(res => {
                    setFormData(res.data);
                    setSelectedActivities(res.data.linkedActivities || []);
                })
                .catch(console.error);
        }
    }, [id]);

    const toggleActivitySelection = (activity) => {
        setSelectedActivities(prev => {
            const isSelected = prev.some(a => a.id === activity.id);
            if (isSelected) {
                return prev.filter(a => a.id !== activity.id);
            } else {
                return [...prev, activity];
            }
        });
        setFormData(prev => ({
            ...prev,
            linkedActivities: selectedActivities.some(a => a.id === activity.id)
                ? selectedActivities.filter(a => a.id !== activity.id)
                : [...selectedActivities, activity]
        }));
    };

    const addDiscussion = () => {
        setFormData(prev => ({
            ...prev,
            discussions: [...prev.discussions, { elderName: '', issue: '', suggestion: '' }]
        }));
    };

    const updateDiscussion = (idx, field, value) => {
        setFormData(prev => ({
            ...prev,
            discussions: prev.discussions.map((d, i) =>
                i === idx ? { ...d, [field]: value } : d
            )
        }));
    };

    const removeDiscussion = (idx) => {
        setFormData(prev => ({
            ...prev,
            discussions: prev.discussions.filter((_, i) => i !== idx)
        }));
    };

    const addDecision = () => {
        setFormData(prev => ({
            ...prev,
            decisions: [...prev.decisions, {
                id: Date.now(),
                content: '',
                assignee: '',
                status: 'pending'
            }]
        }));
    };

    const updateDecision = (idx, field, value) => {
        setFormData(prev => ({
            ...prev,
            decisions: prev.decisions.map((d, i) =>
                i === idx ? { ...d, [field]: value } : d
            )
        }));
    };

    const removeDecision = (idx) => {
        setFormData(prev => ({
            ...prev,
            decisions: prev.decisions.filter((_, i) => i !== idx)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await axios.post(`${API_BASE_URL}/api/meetings`, formData);
            alert('會議記錄儲存成功！');
            navigate('/meetings');
        } catch (err) {
            console.error('儲存失敗:', err);
            alert('儲存失敗');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h2><i className="fas fa-edit me-2"></i>{id ? '編輯' : '新增'}會議記錄</h2>

            <form onSubmit={handleSubmit} className="mt-4">
                <div className="card mb-4">
                    <div className="card-header">基本資訊</div>
                    <div className="card-body">
                        <div className="row">
                            <div className="col-md-4 mb-3">
                                <label className="form-label">會議日期</label>
                                <input
                                    type="date"
                                    className="form-control"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="col-md-4 mb-3">
                                <label className="form-label">對應季度</label>
                                <select
                                    className="form-select"
                                    value={formData.quarter}
                                    onChange={e => setFormData({ ...formData, quarter: e.target.value })}
                                >
                                    <option value="2024-Q4">2024 Q4</option>
                                    <option value="2025-Q1">2025 Q1</option>
                                    <option value="2025-Q2">2025 Q2</option>
                                </select>
                            </div>
                            <div className="col-md-4 mb-3">
                                <label className="form-label">會議標題</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="例：2024 Q4 季度檢討會議"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-header bg-info text-white">
                        <i className="fas fa-link me-2"></i>關聯活動（可選擇要討論的活動）
                    </div>
                    <div className="card-body">
                        {activities.length === 0 ? (
                            <p className="text-muted">載入活動資料中...</p>
                        ) : (
                            <>
                                <p className="text-muted mb-3">勾選要在本次會議討論的活動，將自動帶入活動統計資料</p>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {activities.map(activity => (
                                        <div
                                            key={activity.id}
                                            className={`border rounded p-2 mb-2 ${selectedActivities.some(a => a.id === activity.id) ? 'bg-light border-primary' : ''}`}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => toggleActivitySelection(activity)}
                                        >
                                            <div className="d-flex align-items-center">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input me-2"
                                                    checked={selectedActivities.some(a => a.id === activity.id)}
                                                    onChange={() => { }}
                                                />
                                                <div className="flex-grow-1">
                                                    <strong>{activity.date}</strong> - {activity.topic}
                                                    <span className="badge bg-secondary ms-2">{activity.purpose}</span>
                                                </div>
                                                <div className="text-muted small">
                                                    參與：{activity.participants?.length || 0}人
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {selectedActivities.length > 0 && (
                                    <div className="mt-3 p-3 bg-light rounded">
                                        <h6 className="text-primary mb-2">📊 已選活動統計摘要</h6>
                                        <div className="row">
                                            <div className="col-4 text-center">
                                                <div className="h4 text-info">{selectedActivities.length}</div>
                                                <small className="text-muted">活動數</small>
                                            </div>
                                            <div className="col-4 text-center">
                                                <div className="h4 text-success">
                                                    {selectedActivities.reduce((sum, a) => sum + (a.participants?.length || 0), 0)}
                                                </div>
                                                <small className="text-muted">總參與人次</small>
                                            </div>
                                            <div className="col-4 text-center">
                                                <div className="h4 text-warning">
                                                    {(selectedActivities.reduce((sum, a) => sum + (a.participants?.length || 0), 0) / selectedActivities.length).toFixed(1)}
                                                </div>
                                                <small className="text-muted">平均參與</small>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-header d-flex justify-content-between">
                        <span>討論事項</span>
                        <button type="button" className="btn btn-sm btn-primary" onClick={addDiscussion}>
                            <i className="fas fa-plus me-1"></i>新增
                        </button>
                    </div>
                    <div className="card-body">
                        {formData.discussions.length === 0 ? (
                            <p className="text-muted">點擊「新增」添加討論事項</p>
                        ) : (
                            formData.discussions.map((d, idx) => (
                                <div key={idx} className="border rounded p-3 mb-3 bg-light">
                                    <div className="row">
                                        <div className="col-md-3 mb-2">
                                            <label className="form-label">長者</label>
                                            <select
                                                className="form-select"
                                                value={d.elderName}
                                                onChange={e => updateDiscussion(idx, 'elderName', e.target.value)}
                                            >
                                                <option value="">選擇長者</option>
                                                {elderList.map(elder => (
                                                    <option key={elder.id} value={elder.name}>{elder.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="col-md-4 mb-2">
                                            <label className="form-label">問題/現象</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={d.issue}
                                                onChange={e => updateDiscussion(idx, 'issue', e.target.value)}
                                                placeholder="描述問題"
                                            />
                                        </div>
                                        <div className="col-md-4 mb-2">
                                            <label className="form-label">建議措施</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={d.suggestion}
                                                onChange={e => updateDiscussion(idx, 'suggestion', e.target.value)}
                                                placeholder="建議的處理方式"
                                            />
                                        </div>
                                        <div className="col-md-1 d-flex align-items-end mb-2">
                                            <button
                                                type="button"
                                                className="btn btn-outline-danger btn-sm"
                                                onClick={() => removeDiscussion(idx)}
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="card mb-4">
                    <div className="card-header d-flex justify-content-between">
                        <span>決議事項</span>
                        <button type="button" className="btn btn-sm btn-primary" onClick={addDecision}>
                            <i className="fas fa-plus me-1"></i>新增
                        </button>
                    </div>
                    <div className="card-body">
                        {formData.decisions.length === 0 ? (
                            <p className="text-muted">點擊「新增」添加決議事項</p>
                        ) : (
                            formData.decisions.map((d, idx) => (
                                <div key={idx} className="d-flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={d.content}
                                        onChange={e => updateDecision(idx, 'content', e.target.value)}
                                        placeholder="決議內容"
                                    />
                                    <input
                                        type="text"
                                        className="form-control"
                                        style={{ width: '150px' }}
                                        value={d.assignee}
                                        onChange={e => updateDecision(idx, 'assignee', e.target.value)}
                                        placeholder="負責人"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline-danger btn-sm"
                                        onClick={() => removeDecision(idx)}
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="d-flex gap-2">
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? '儲存中...' : '儲存會議記錄'}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate('/meetings')}>
                        取消
                    </button>
                </div>
            </form>
        </div>
    );
}

export default MeetingForm;

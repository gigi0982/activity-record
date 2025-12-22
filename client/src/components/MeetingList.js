import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function MeetingList() {
    const [meetings, setMeetings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/meetings`);
                setMeetings(response.data);
            } catch (err) {
                console.error('取得會議列表失敗:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMeetings();
    }, []);

    const updateDecisionStatus = async (meetingId, decisionId, newStatus) => {
        try {
            await axios.put(`${API_BASE_URL}/api/meetings/${meetingId}/decisions/${decisionId}`, {
                status: newStatus
            });
            // 更新本地狀態
            setMeetings(prev => prev.map(m => {
                if (m.id === meetingId) {
                    return {
                        ...m,
                        decisions: m.decisions.map(d =>
                            d.id === decisionId ? { ...d, status: newStatus } : d
                        )
                    };
                }
                return m;
            }));
        } catch (err) {
            console.error('更新決議狀態失敗:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status"></div>
                <p className="mt-2">載入中...</p>
            </div>
        );
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-clipboard-list me-2"></i>會議記錄</h2>
                <Link to="/meetings/new" className="btn btn-primary">
                    <i className="fas fa-plus me-2"></i>新增會議
                </Link>
            </div>

            {meetings.length === 0 ? (
                <div className="alert alert-info">尚無會議記錄</div>
            ) : (
                meetings.map(meeting => (
                    <div key={meeting.id} className="card mb-4">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-calendar me-2"></i>
                                {meeting.title || `${meeting.quarter} 檢討會議`}
                                <span className="badge bg-light text-primary ms-2">{meeting.date}</span>
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6">
                                    <h6><i className="fas fa-users me-2"></i>出席人員</h6>
                                    <p>{meeting.attendees?.join('、') || '未記錄'}</p>

                                    <h6 className="mt-3"><i className="fas fa-comments me-2"></i>討論事項</h6>
                                    {meeting.discussions?.length > 0 ? (
                                        <ul className="list-group list-group-flush">
                                            {meeting.discussions.map((d, idx) => (
                                                <li key={idx} className="list-group-item px-0">
                                                    <strong>{d.elderName}</strong>：{d.issue}
                                                    <br />
                                                    <small className="text-muted">建議：{d.suggestion}</small>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-muted">無討論事項</p>
                                    )}
                                </div>

                                <div className="col-md-6">
                                    <h6><i className="fas fa-check-square me-2"></i>決議事項</h6>
                                    {meeting.decisions?.length > 0 ? (
                                        <ul className="list-group">
                                            {meeting.decisions.map((d, idx) => (
                                                <li key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <span className={d.status === 'completed' ? 'text-decoration-line-through text-muted' : ''}>
                                                            {d.content}
                                                        </span>
                                                        <br />
                                                        <small className="text-muted">負責人：{d.assignee}</small>
                                                    </div>
                                                    <button
                                                        className={`btn btn-sm ${d.status === 'completed' ? 'btn-success' : 'btn-outline-secondary'}`}
                                                        onClick={() => updateDecisionStatus(
                                                            meeting.id,
                                                            d.id,
                                                            d.status === 'completed' ? 'pending' : 'completed'
                                                        )}
                                                    >
                                                        {d.status === 'completed' ? '✓ 已完成' : '待處理'}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-muted">無決議事項</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default MeetingList;

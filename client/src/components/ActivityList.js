import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { getActivities, initSampleData } from '../utils/storage';
import { exportToExcel, exportToPDF, exportAllToPDF } from '../utils/exportUtils';

function ActivityList() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 初始化範例資料（如果 LocalStorage 是空的）
    initSampleData();
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      // 優先從 LocalStorage 讀取
      const localActivities = getActivities();

      if (localActivities.length > 0) {
        setActivities(localActivities);
      } else {
        // 如果本地沒資料，嘗試從 API 取得（作為備援）
        try {
          const response = await axios.get(`${API_BASE_URL}/api/activities`);
          setActivities(response.data);
        } catch (apiError) {
          console.log('API 不可用，使用本地資料');
          setActivities([]);
        }
      }
    } catch (error) {
      console.error('取得活動列表錯誤:', error);
      setError('無法載入活動列表，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 4) return 'text-success';
    if (score >= 3) return 'text-warning';
    return 'text-danger';
  };

  const calculateAverage = (participants, field) => {
    if (!participants || participants.length === 0) return 0;
    const sum = participants.reduce((total, participant) => total + participant[field], 0);
    return (sum / participants.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
        <p className="mt-2">載入活動列表中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
        <br />
        <button className="btn btn-outline-danger mt-2" onClick={fetchActivities}>
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h2>活動紀錄列表</h2>
        <div className="d-flex gap-2 flex-wrap">
          <Link to="/add" className="btn btn-primary">
            新增活動紀錄
          </Link>
          <Link to="/stats" className="btn btn-info">
            統計分析
          </Link>
          {activities.length > 0 && (
            <>
              <button
                className="btn btn-success"
                onClick={() => exportToExcel(activities)}
              >
                📄 匯出 Excel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => exportAllToPDF(activities)}
              >
                📄 匯出 PDF
              </button>
            </>
          )}
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-5">
          <h4>尚無活動紀錄</h4>
          <p className="text-muted">點選上方按鈕開始新增第一筆活動紀錄</p>
          <Link to="/add" className="btn btn-primary">
            新增活動紀錄
          </Link>
        </div>
      ) : (
        <div className="row">
          {activities.map((activity) => (
            <div key={activity.id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h6 className="mb-0">{activity.date}</h6>
                  <small className="text-muted">{activity.topic}</small>
                </div>
                <div className="card-body">
                  <h6 className="card-title">{activity.purpose}</h6>

                  {activity.participants ? (
                    <>
                      <div className="mb-3">
                        <strong>參與者（{activity.participants.length}人）：</strong>
                        <div className="mt-2">
                          {activity.participants.map((participant, index) => (
                            <div key={index} className="border rounded p-2 mb-2 bg-light">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="fw-bold">{participant.name}</span>
                                <div className="small">
                                  <span className={`badge me-1 ${getScoreColor(participant.focus) === 'text-success' ? 'bg-success' : getScoreColor(participant.focus) === 'text-warning' ? 'bg-warning' : 'bg-danger'}`}>
                                    專注 {participant.focus}
                                  </span>
                                  <span className={`badge me-1 ${getScoreColor(participant.interaction) === 'text-success' ? 'bg-success' : getScoreColor(participant.interaction) === 'text-warning' ? 'bg-warning' : 'bg-danger'}`}>
                                    互動 {participant.interaction}
                                  </span>
                                  <span className={`badge ${getScoreColor(participant.attention) === 'text-success' ? 'bg-success' : getScoreColor(participant.attention) === 'text-warning' ? 'bg-warning' : 'bg-danger'}`}>
                                    注意 {participant.attention}
                                  </span>
                                </div>
                              </div>
                              {participant.notes && (
                                <small className="text-muted d-block mt-1">{participant.notes}</small>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="row text-center mb-3 border-top pt-2">
                        <div className="col-12 mb-2">
                          <small className="text-muted">平均分數</small>
                        </div>
                        <div className="col-4">
                          <div className={`h6 ${getScoreColor(calculateAverage(activity.participants, 'focus'))}`}>
                            {calculateAverage(activity.participants, 'focus')}
                          </div>
                          <small className="text-muted">專注力</small>
                        </div>
                        <div className="col-4">
                          <div className={`h6 ${getScoreColor(calculateAverage(activity.participants, 'interaction'))}`}>
                            {calculateAverage(activity.participants, 'interaction')}
                          </div>
                          <small className="text-muted">人際互動</small>
                        </div>
                        <div className="col-4">
                          <div className={`h6 ${getScoreColor(calculateAverage(activity.participants, 'attention'))}`}>
                            {calculateAverage(activity.participants, 'attention')}
                          </div>
                          <small className="text-muted">注意力</small>
                        </div>
                      </div>
                    </>
                  ) : (
                    // 向下兼容舊格式
                    <>
                      <p className="card-text">
                        <strong>參與成員：</strong>{activity.members}
                      </p>

                      <div className="row text-center mb-3">
                        <div className="col-4">
                          <div className={`h5 ${getScoreColor(activity.focus)}`}>
                            {activity.focus}
                          </div>
                          <small className="text-muted">專注力</small>
                        </div>
                        <div className="col-4">
                          <div className={`h5 ${getScoreColor(activity.interaction)}`}>
                            {activity.interaction}
                          </div>
                          <small className="text-muted">人際互動</small>
                        </div>
                        <div className="col-4">
                          <div className={`h5 ${getScoreColor(activity.attention)}`}>
                            {activity.attention}
                          </div>
                          <small className="text-muted">注意力</small>
                        </div>
                      </div>
                    </>
                  )}

                  {/* 活動照片 */}
                  {/* 照片顯示 - 支援 Cloudinary */}
                  {activity.photos && activity.photos.length > 0 && (
                    <div className="mb-3">
                      <small className="text-muted d-block mb-2">活動照片：</small>
                      <div className="row">
                        {activity.photos.slice(0, 2).map((photo, photoIndex) => (
                          <div key={photoIndex} className="col-6">
                            <img
                              src={photo}
                              alt={`活動照片 ${photoIndex + 1}`}
                              className="img-fluid rounded border mb-1"
                              style={{
                                width: '100%',
                                height: '80px',
                                objectFit: 'cover',
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(photo, '_blank')}
                            />
                          </div>
                        ))}
                        {activity.photos.length > 2 && (
                          <div className="col-12">
                            <small className="text-muted">
                              +{activity.photos.length - 2} 張照片
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activity.special && (
                    <div className="mb-2">
                      <small className="text-muted">特殊狀況：</small>
                      <p className="small">{activity.special}</p>
                    </div>
                  )}

                  {activity.discussion && (
                    <div className="mb-2">
                      <small className="text-muted">後續討論：</small>
                      <p className="small">{activity.discussion}</p>
                    </div>
                  )}
                </div>
                <div className="card-footer text-muted">
                  <small>
                    平均分數: {((parseInt(activity.focus) + parseInt(activity.interaction) + parseInt(activity.attention)) / 3).toFixed(1)}
                  </small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activities.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-muted">共 {activities.length} 筆活動紀錄</p>
        </div>
      )}
    </div>
  );
}

export default ActivityList;
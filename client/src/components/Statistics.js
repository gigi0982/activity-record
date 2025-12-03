import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function Statistics() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('取得統計資料錯誤:', error);
      setError('無法載入統計資料，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 4) return 'success';
    if (score >= 3) return 'warning';
    return 'danger';
  };

  const calculateOverallAverage = () => {
    if (stats.length === 0) return { focus: 0, interaction: 0, attention: 0, totalParticipants: 0, totalActivities: 0 };
    
    const totalFocus = stats.reduce((sum, stat) => sum + parseFloat(stat.avgFocus), 0);
    const totalInteraction = stats.reduce((sum, stat) => sum + parseFloat(stat.avgInteraction), 0);
    const totalAttention = stats.reduce((sum, stat) => sum + parseFloat(stat.avgAttention), 0);
    const totalParticipants = stats.reduce((sum, stat) => sum + (stat.participantCount || 0), 0);
    const totalActivities = stats.reduce((sum, stat) => sum + stat.count, 0);
    
    return {
      focus: (totalFocus / stats.length).toFixed(2),
      interaction: (totalInteraction / stats.length).toFixed(2),
      attention: (totalAttention / stats.length).toFixed(2),
      totalParticipants,
      totalActivities
    };
  };

  const overallAvg = calculateOverallAverage();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
        <p className="mt-2">載入統計資料中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
        <br />
        <button className="btn btn-outline-danger mt-2" onClick={fetchStatistics}>
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>統計分析</h2>
        <div>
          <Link to="/" className="btn btn-secondary me-2">
            活動列表
          </Link>
          <Link to="/add" className="btn btn-primary">
            新增活動
          </Link>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="text-center py-5">
          <h4>尚無統計資料</h4>
          <p className="text-muted">請先新增活動紀錄後再查看統計分析</p>
          <Link to="/add" className="btn btn-primary">
            新增活動紀錄
          </Link>
        </div>
      ) : (
        <>
          {/* 整體平均分數卡片 */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card stats-card">
                <div className="card-body text-center">
                  <h5 className="card-title">整體統計摘要</h5>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <h4 className="text-primary">{overallAvg.totalActivities}</h4>
                      <p className="mb-0">總活動次數</p>
                    </div>
                    <div className="col-md-6">
                      <h4 className="text-success">{overallAvg.totalParticipants}</h4>
                      <p className="mb-0">總參與人次</p>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-4">
                      <h3 className={`text-${getScoreColor(overallAvg.focus)}`}>{overallAvg.focus}</h3>
                      <p className="mb-0">平均專注力</p>
                    </div>
                    <div className="col-md-4">
                      <h3 className={`text-${getScoreColor(overallAvg.interaction)}`}>{overallAvg.interaction}</h3>
                      <p className="mb-0">平均人際互動</p>
                    </div>
                    <div className="col-md-4">
                      <h3 className={`text-${getScoreColor(overallAvg.attention)}`}>{overallAvg.attention}</h3>
                      <p className="mb-0">平均注意力</p>
                    </div>
                  </div>
                  <small className="text-muted">
                    基於過去 {stats.length} 個月的資料
                  </small>
                </div>
              </div>
            </div>
          </div>

          {/* 每月統計表格 */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">每月活動表現統計</h5>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>月份</th>
                      <th>活動次數</th>
                      <th>參與人次</th>
                      <th>平均專注力</th>
                      <th>平均人際互動</th>
                      <th>平均注意力</th>
                      <th>整體平均</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((stat) => {
                      const overallScore = ((parseFloat(stat.avgFocus) + parseFloat(stat.avgInteraction) + parseFloat(stat.avgAttention)) / 3).toFixed(2);
                      return (
                        <tr key={stat.month}>
                          <td>
                            <strong>{stat.month}</strong>
                          </td>
                          <td>
                            <span className="badge bg-info">{stat.count}</span>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{stat.participantCount || 0}</span>
                          </td>
                          <td>
                            <span className={`badge bg-${getScoreColor(stat.avgFocus)}`}>
                              {stat.avgFocus}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${getScoreColor(stat.avgInteraction)}`}>
                              {stat.avgInteraction}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${getScoreColor(stat.avgAttention)}`}>
                              {stat.avgAttention}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${getScoreColor(overallScore)} fs-6`}>
                              {overallScore}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 統計資訊 */}
          <div className="row mt-4">
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">評分標準</h6>
                  <ul className="list-unstyled mb-0">
                    <li><span className="badge bg-danger me-2">1-2</span>需要改善</li>
                    <li><span className="badge bg-warning me-2">3</span>普通表現</li>
                    <li><span className="badge bg-success me-2">4-5</span>良好表現</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h6 className="card-title">資料摘要</h6>
                  <ul className="list-unstyled mb-0">
                    <li>統計月份：{stats.length} 個月</li>
                    <li>總活動次數：{stats.reduce((sum, stat) => sum + stat.count, 0)} 次</li>
                    <li>平均每月活動：{(stats.reduce((sum, stat) => sum + stat.count, 0) / stats.length).toFixed(1)} 次</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Statistics;
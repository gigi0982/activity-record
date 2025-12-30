import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

function FeeHistory() {
    const navigate = useNavigate();
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // 載入當月紀錄
    useEffect(() => {
        const loadRecords = async () => {
            setIsLoading(true);
            const localRecords = [];
            const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

            // 從 Google Sheets 或 localStorage 載入每日紀錄
            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                let record = null;
                try {
                    const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getFeeRecord&date=${dateStr}`);
                    const data = await res.json();
                    if (data && data.participants) {
                        record = data;
                    }
                } catch (err) { }

                // 備援：從 localStorage 讀取
                if (!record) {
                    const saved = localStorage.getItem(`fee_record_${dateStr}`);
                    if (saved) record = JSON.parse(saved);
                }

                if (record) {
                    localRecords.push(record);
                }
            }

            setRecords(localRecords);
            setIsLoading(false);
        };
        loadRecords();
    }, [selectedYear, selectedMonth]);

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
        return `${d.getDate()} (${weekDays[d.getDay()]})`;
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-history me-2"></i>歷史紀錄</h2>
                <div className="d-flex gap-2 align-items-center">
                    <select className="form-select" style={{ width: '100px' }}
                        value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                    </select>
                    <select className="form-select" style={{ width: '100px' }}
                        value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                            <option key={m} value={m}>{m}月</option>
                        ))}
                    </select>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary"></div>
                    <p className="mt-3">載入中...</p>
                </div>
            ) : records.length === 0 ? (
                <div className="alert alert-info">
                    {selectedYear}年{selectedMonth}月 尚無收費紀錄
                </div>
            ) : (
                <div className="card">
                    <div className="card-header">
                        <span><i className="fas fa-calendar me-2"></i>{selectedYear}年{selectedMonth}月 收費紀錄</span>
                        <span className="badge bg-primary ms-2">{records.length} 天</span>
                    </div>
                    <div className="list-group list-group-flush">
                        {records.map(record => (
                            <div
                                key={record.date}
                                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                style={{ cursor: 'pointer' }}
                                onClick={() => navigate(`/fee-edit/${record.date}`)}
                            >
                                <div>
                                    <strong className="me-3">{formatDate(record.date)}</strong>
                                    <span className="text-muted">
                                        出席 {record.stats?.attended || 0} 人
                                    </span>
                                </div>
                                <div className="d-flex gap-3 align-items-center">
                                    <span className="badge bg-success">來程 {record.stats?.pickupAM || 0}</span>
                                    <span className="badge bg-purple" style={{ backgroundColor: '#9C27B0' }}>回程 {record.stats?.pickupPM || 0}</span>
                                    {(record.stats?.caregiverAM > 0 || record.stats?.caregiverPM > 0) && (
                                        <span className="badge bg-warning text-dark">
                                            外勞 {(record.stats?.caregiverAM || 0) + (record.stats?.caregiverPM || 0)}
                                        </span>
                                    )}
                                    <i className="fas fa-chevron-right text-muted"></i>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="d-flex gap-2 mt-4">
                <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
                <Link to="/fee-report" className="btn btn-outline-primary">📊 月結報表</Link>
            </div>
        </div>
    );
}

export default FeeHistory;

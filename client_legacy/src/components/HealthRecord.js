import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import { useToast } from './Toast';
import { useLoading } from './Loading';
import EmptyState from './EmptyState';
import PageHeader from './PageHeader';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

function HealthRecord() {
    const toast = useToast();
    const { showLoading, hideLoading } = useLoading();
    const [elders, setElders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSendingLine, setIsSendingLine] = useState(false);
    const [isLoadingCharts, setIsLoadingCharts] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTime, setSelectedTime] = useState('morning'); // morning, afternoon
    const [healthRecords, setHealthRecords] = useState({});
    const [viewMode, setViewMode] = useState('entry'); // entry, history
    const [selectedElder, setSelectedElder] = useState('');
    const [historyRecords, setHistoryRecords] = useState([]);
    const [showLineModal, setShowLineModal] = useState(false);
    const [familyLineId, setFamilyLineId] = useState('');
    const [messageFormat, setMessageFormat] = useState('flex'); // flex, chart, text
    const [chartPreview, setChartPreview] = useState(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // 載入長者名單並同步出席資料
    useEffect(() => {
        const fetchElders = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/sheets-elders`);
                const elderList = response.data || [];
                setElders(elderList);
                // 初始化健康紀錄
                const initRecords = {};
                elderList.forEach(elder => {
                    initRecords[elder.name] = { systolic: '', diastolic: '', temperature: '', notes: '' };
                });
                setHealthRecords(initRecords);
            } catch (err) {
                console.error('載入長者名單失敗:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchElders();
    }, []);

    // 取得今日出席的長者
    const getAttendedElders = () => {
        const feeRecord = localStorage.getItem(`fee_record_${selectedDate}`);
        if (!feeRecord) return elders; // 如果沒有出席資料，顯示全部長者

        const data = JSON.parse(feeRecord);
        const participants = data.participants || [];
        const attendedNames = participants.filter(p => p.attended).map(p => p.name);

        if (attendedNames.length === 0) return elders; // 如果沒有人出席，顯示全部長者

        return elders.filter(elder => attendedNames.includes(elder.name));
    };

    const attendedElders = getAttendedElders();

    // 血壓狀態判定
    const getBPStatus = (systolic, diastolic) => {
        const s = parseInt(systolic);
        const d = parseInt(diastolic);
        if (!s || !d) return { status: '', color: '#999', icon: '' };
        if (s < 90 || d < 60) return { status: '偏低', color: '#2196F3', icon: '🔵' };
        if (s <= 120 && d <= 80) return { status: '正常', color: '#4CAF50', icon: '🟢' };
        if (s <= 139 && d <= 89) return { status: '偏高', color: '#FF9800', icon: '🟡' };
        return { status: '高血壓', color: '#f44336', icon: '🔴' };
    };

    // 體溫狀態判定
    const getTempStatus = (temp) => {
        const t = parseFloat(temp);
        if (!t) return { status: '', color: '#999', icon: '' };
        if (t < 36) return { status: '偏低', color: '#2196F3', icon: '🔵' };
        if (t <= 37.4) return { status: '正常', color: '#4CAF50', icon: '🟢' };
        if (t <= 38) return { status: '微燒', color: '#FF9800', icon: '🟡' };
        return { status: '發燒', color: '#f44336', icon: '🔴' };
    };

    // 更新紀錄
    const updateRecord = (elderName, field, value) => {
        setHealthRecords(prev => ({
            ...prev,
            [elderName]: { ...prev[elderName], [field]: value }
        }));
    };

    // 儲存所有紀錄
    const saveAllRecords = async () => {
        const recordsToSave = Object.entries(healthRecords)
            .filter(([_, record]) => record.systolic || record.diastolic || record.temperature)
            .map(([name, record]) => ({
                date: selectedDate,
                time: selectedTime === 'morning' ? '上午' : '下午',
                name,
                systolic: record.systolic,
                diastolic: record.diastolic,
                temperature: record.temperature,
                bpStatus: getBPStatus(record.systolic, record.diastolic).status,
                tempStatus: getTempStatus(record.temperature).status,
                notes: record.notes
            }));

        if (recordsToSave.length === 0) {
            toast.warning('請至少輸入一筆資料');
            return;
        }

        setIsSaving(true);
        try {
            // 儲存到 Google Sheets
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'saveHealthRecords', records: recordsToSave })
            });

            // 同時儲存到 localStorage 作為備份
            const key = `health_${selectedDate}_${selectedTime}`;
            localStorage.setItem(key, JSON.stringify(recordsToSave));

            // 檢查異常值並自動通知家屬
            const abnormalRecords = recordsToSave.filter(record =>
                record.bpStatus === '高血壓' ||
                record.bpStatus === '偏低' ||
                record.tempStatus === '發燒'
            );

            if (abnormalRecords.length > 0) {
                // 找出有設定家屬 LINE ID 的異常紀錄
                for (const record of abnormalRecords) {
                    const elder = elders.find(e => e.name === record.name);
                    if (elder && elder.familyLineId) {
                        try {
                            await axios.post(`${API_BASE_URL}/api/line/send-health-report`, {
                                userId: elder.familyLineId,
                                healthData: {
                                    elderName: record.name,
                                    date: record.date,
                                    time: record.time,
                                    systolic: record.systolic,
                                    diastolic: record.diastolic,
                                    temperature: record.temperature,
                                    bpStatus: record.bpStatus,
                                    tempStatus: record.tempStatus,
                                    notes: `⚠️ 自動通知：${record.bpStatus === '高血壓' ? '血壓偏高' : record.tempStatus === '發燒' ? '體溫偏高' : '健康數值異常'}${record.notes ? '\n' + record.notes : ''}`
                                }
                            });
                            console.log(`已發送異常通知給 ${record.name} 的家屬`);
                        } catch (lineErr) {
                            console.error(`發送 LINE 通知失敗 (${record.name}):`, lineErr);
                        }
                    }
                }

                const notifiedCount = abnormalRecords.filter(r => {
                    const elder = elders.find(e => e.name === r.name);
                    return elder && elder.familyLineId;
                }).length;

                if (notifiedCount > 0) {
                    toast.success(`成功儲存 ${recordsToSave.length} 筆健康紀錄！發現 ${abnormalRecords.length} 筆異常，已通知 ${notifiedCount} 位家屬`);
                } else {
                    toast.success(`成功儲存 ${recordsToSave.length} 筆健康紀錄！發現 ${abnormalRecords.length} 筆異常`);
                }
            } else {
                toast.success(`成功儲存 ${recordsToSave.length} 筆健康紀錄！`);
            }

            // 清空已輸入的資料
            const resetRecords = {};
            elders.forEach(elder => {
                resetRecords[elder.name] = { systolic: '', diastolic: '', temperature: '', notes: '' };
            });
            setHealthRecords(resetRecords);
        } catch (err) {
            console.error('儲存失敗:', err);
            toast.error('儲存失敗，請稍後再試');
        } finally {
            setIsSaving(false);
        }
    };

    // 查詢個人歷史
    const loadHistory = async (elderName) => {
        setSelectedElder(elderName);
        setHistoryRecords([]); // 先清空
        setIsLoadingHistory(true);
        setViewMode('history');

        try {
            // 從 Google Sheets 讀取歷史紀錄
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getHealthByElder&elder=${encodeURIComponent(elderName)}`);
            const data = await response.json();

            if (data && Array.isArray(data) && data.length > 0) {
                // 排序：最新的在前面
                const sortedRecords = data.sort((a, b) => {
                    const dateA = new Date(a.date + ' ' + (a.time || ''));
                    const dateB = new Date(b.date + ' ' + (b.time || ''));
                    return dateB - dateA;
                });
                setHistoryRecords(sortedRecords);
            } else {
                // 如果 Google Sheets 沒資料，嘗試從 localStorage 讀取（相容舊資料）
                const allKeys = Object.keys(localStorage).filter(k => k.startsWith('health_'));
                const records = [];
                allKeys.forEach(key => {
                    const localData = JSON.parse(localStorage.getItem(key));
                    localData.forEach(record => {
                        if (record.name === elderName) {
                            records.push(record);
                        }
                    });
                });
                records.sort((a, b) => new Date(b.date) - new Date(a.date));
                setHistoryRecords(records);
            }
        } catch (error) {
            console.error('載入歷史紀錄失敗:', error);
            // 失敗時嘗試從 localStorage 讀取
            const allKeys = Object.keys(localStorage).filter(k => k.startsWith('health_'));
            const records = [];
            allKeys.forEach(key => {
                const data = JSON.parse(localStorage.getItem(key));
                data.forEach(record => {
                    if (record.name === elderName) {
                        records.push(record);
                    }
                });
            });
            records.sort((a, b) => new Date(b.date) - new Date(a.date));
            setHistoryRecords(records);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    // 載入圖表預覽
    const loadChartPreview = async () => {
        if (historyRecords.length === 0) return;

        setIsLoadingCharts(true);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/line-webhook`, {
                action: 'charts-preview',
                elderName: selectedElder,
                records: historyRecords
            });

            if (response.data.success) {
                setChartPreview(response.data.charts);
            }
        } catch (error) {
            console.error('載入圖表預覽失敗:', error);
        } finally {
            setIsLoadingCharts(false);
        }
    };

    // 打開 LINE modal 時載入圖表預覽並自動填入 LINE ID
    const openLineModal = () => {
        // 自動帶入該長者的家屬 LINE ID
        const selectedElderData = elders.find(e => e.name === selectedElder);
        if (selectedElderData?.familyLineId) {
            setFamilyLineId(selectedElderData.familyLineId);
        }
        setShowLineModal(true);
        loadChartPreview();
    };

    // 發送健康紀錄給家屬 LINE
    const sendToFamilyLine = async () => {
        if (!familyLineId.trim()) {
            toast.warning('請輸入家屬的 LINE User ID');
            return;
        }

        if (historyRecords.length === 0) {
            toast.warning('沒有可發送的紀錄');
            return;
        }

        setIsSendingLine(true);
        try {
            // 根據訊息格式選擇不同的 action
            const actionMap = {
                'flex': 'send-flex-message',
                'chart': 'send-health-report-with-chart',
                'text': 'send-health-report-batch'
            };
            const action = actionMap[messageFormat] || 'send-flex-message';

            const response = await axios.post(`${API_BASE_URL}/api/line-webhook`, {
                action: action,
                userId: familyLineId.trim(),
                elderName: selectedElder,
                records: historyRecords
            });

            if (response.data.success) {
                toast.success(response.data.message);
                setShowLineModal(false);
                setFamilyLineId('');
                setChartPreview(null);
            } else {
                const errorMsg = typeof response.data.error === 'object'
                    ? JSON.stringify(response.data.error)
                    : response.data.error;
                toast.error('發送失敗：' + errorMsg);
            }
        } catch (error) {
            console.error('發送失敗:', error);
            const errorDetail = error.response?.data?.error || error.response?.data?.details || error.message;
            const errorMsg = typeof errorDetail === 'object'
                ? JSON.stringify(errorDetail)
                : errorDetail;
            toast.error('發送失敗：' + errorMsg);
        } finally {
            setIsSendingLine(false);
        }
    };

    // 統計有資料的人數（只統計出席者）
    const filledCount = attendedElders.filter(elder => {
        const record = healthRecords[elder.name] || {};
        return record.systolic || record.temperature;
    }).length;

    if (isLoading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary"></div>
                <p className="mt-2">載入中...</p>
            </div>
        );
    }

    return (
        <div className="health-record">
            <PageHeader
                title="健康紀錄"
                icon="❤️"
                subtitle="血壓、體溫管理與 LINE 通知"
            />

            {/* 切換模式 */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button className={`nav-link ${viewMode === 'entry' ? 'active' : ''}`} onClick={() => setViewMode('entry')}>
                        📝 登記紀錄
                    </button>
                </li>
                <li className="nav-item">
                    <button className={`nav-link ${viewMode === 'history' ? 'active' : ''}`} onClick={() => setViewMode('history')}>
                        📊 歷史查詢
                    </button>
                </li>
            </ul>

            {viewMode === 'entry' && (
                <>
                    {/* 日期時間選擇 */}
                    <div className="card mb-4">
                        <div className="card-body">
                            <div className="row align-items-center">
                                <div className="col-md-4">
                                    <label className="form-label">日期</label>
                                    <input
                                        type="date"
                                        className="form-control"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>
                                <div className="col-md-4">
                                    <label className="form-label">時段</label>
                                    <div className="btn-group w-100">
                                        <button
                                            className={`btn ${selectedTime === 'morning' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setSelectedTime('morning')}
                                        >
                                            ☀️ 上午
                                        </button>
                                        <button
                                            className={`btn ${selectedTime === 'afternoon' ? 'btn-primary' : 'btn-outline-primary'}`}
                                            onClick={() => setSelectedTime('afternoon')}
                                        >
                                            🌙 下午
                                        </button>
                                    </div>
                                </div>
                                <div className="col-md-4 text-end">
                                    <div className="mt-4">
                                        <span className="badge bg-info me-2">已填 {filledCount} / {attendedElders.length}</span>
                                        <button
                                            className="btn btn-success btn-lg"
                                            onClick={saveAllRecords}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? '儲存中...' : '💾 儲存全部'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 批次輸入表格 */}
                    <div className="card">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0">🏥 健康數據登記</h5>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: '120px' }}>姓名</th>
                                            <th style={{ width: '180px' }}>血壓 (收縮/舒張)</th>
                                            <th style={{ width: '100px' }}>狀態</th>
                                            <th style={{ width: '100px' }}>體溫 °C</th>
                                            <th style={{ width: '80px' }}>狀態</th>
                                            <th>備註</th>
                                            <th style={{ width: '80px' }}>歷史</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {attendedElders.map((elder, i) => {
                                            const record = healthRecords[elder.name] || {};
                                            const bpStatus = getBPStatus(record.systolic, record.diastolic);
                                            const tempStatus = getTempStatus(record.temperature);
                                            return (
                                                <tr key={i}>
                                                    <td><strong>{elder.name}</strong></td>
                                                    <td>
                                                        <div className="d-flex gap-1 align-items-center">
                                                            <input
                                                                type="number"
                                                                inputMode="numeric"
                                                                className="form-control form-control-sm"
                                                                style={{
                                                                    width: '70px',
                                                                    borderColor: record.systolic && (parseInt(record.systolic) < 60 || parseInt(record.systolic) > 220) ? '#f44336' : undefined,
                                                                    backgroundColor: record.systolic && (parseInt(record.systolic) >= 140) ? '#ffebee' : undefined
                                                                }}
                                                                placeholder="收縮"
                                                                min="60"
                                                                max="220"
                                                                value={record.systolic || ''}
                                                                onChange={(e) => updateRecord(elder.name, 'systolic', e.target.value)}
                                                            />
                                                            <span>/</span>
                                                            <input
                                                                type="number"
                                                                inputMode="numeric"
                                                                className="form-control form-control-sm"
                                                                style={{
                                                                    width: '70px',
                                                                    borderColor: record.diastolic && (parseInt(record.diastolic) < 40 || parseInt(record.diastolic) > 140) ? '#f44336' : undefined,
                                                                    backgroundColor: record.diastolic && (parseInt(record.diastolic) >= 90) ? '#ffebee' : undefined
                                                                }}
                                                                placeholder="舒張"
                                                                min="40"
                                                                max="140"
                                                                value={record.diastolic || ''}
                                                                onChange={(e) => updateRecord(elder.name, 'diastolic', e.target.value)}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {bpStatus.status && (
                                                            <span className="badge" style={{ backgroundColor: bpStatus.color }}>
                                                                {bpStatus.icon} {bpStatus.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            inputMode="decimal"
                                                            step="0.1"
                                                            className="form-control form-control-sm"
                                                            style={{
                                                                borderColor: record.temperature && (parseFloat(record.temperature) < 34 || parseFloat(record.temperature) > 42) ? '#f44336' : undefined,
                                                                backgroundColor: record.temperature && (parseFloat(record.temperature) >= 37.5) ? '#ffebee' : undefined
                                                            }}
                                                            placeholder="36.5"
                                                            min="34"
                                                            max="42"
                                                            value={record.temperature || ''}
                                                            onChange={(e) => updateRecord(elder.name, 'temperature', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        {tempStatus.status && (
                                                            <span className="badge" style={{ backgroundColor: tempStatus.color }}>
                                                                {tempStatus.icon} {tempStatus.status}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control form-control-sm"
                                                            placeholder="特殊狀況"
                                                            value={record.notes || ''}
                                                            onChange={(e) => updateRecord(elder.name, 'notes', e.target.value)}
                                                        />
                                                    </td>
                                                    <td>
                                                        <button
                                                            className="btn btn-outline-info btn-sm"
                                                            onClick={() => loadHistory(elder.name)}
                                                        >
                                                            📊
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 判定標準說明 */}
                    <div className="alert alert-info mt-4">
                        <strong>📋 判定標準：</strong><br />
                        血壓：🟢 正常 (90-120/60-80) | 🟡 偏高 (121-139/81-89) | 🔴 高血壓 (≥140/≥90) | 🔵 偏低 (&lt;90/&lt;60)<br />
                        體溫：🟢 正常 (36-37.4°C) | 🟡 微燒 (37.5-38°C) | 🔴 發燒 (&gt;38°C) | 🔵 偏低 (&lt;36°C)
                    </div>
                </>
            )}

            {viewMode === 'history' && (
                <div className="card">
                    <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">📊 歷史查詢 {selectedElder && `- ${selectedElder}`}</h5>
                        <button className="btn btn-light btn-sm" onClick={() => setViewMode('entry')}>← 返回登記</button>
                    </div>
                    <div className="card-body">
                        {/* 長者選擇 */}
                        <div className="mb-4">
                            <label className="form-label">選擇長者</label>
                            <select
                                className="form-select"
                                value={selectedElder}
                                onChange={(e) => loadHistory(e.target.value)}
                            >
                                <option value="">-- 請選擇 --</option>
                                {elders.map((elder, i) => (
                                    <option key={i} value={elder.name}>{elder.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* 歷史紀錄表格 */}
                        {historyRecords.length > 0 ? (
                            <>
                                <div className="table-responsive">
                                    <table className="table table-striped">
                                        <thead>
                                            <tr>
                                                <th>日期</th>
                                                <th>時段</th>
                                                <th>血壓</th>
                                                <th>狀態</th>
                                                <th>體溫</th>
                                                <th>狀態</th>
                                                <th>備註</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {historyRecords.map((record, i) => {
                                                const bpStatus = getBPStatus(record.systolic, record.diastolic);
                                                const tempStatus = getTempStatus(record.temperature);
                                                return (
                                                    <tr key={i}>
                                                        <td>{record.date}</td>
                                                        <td>{record.time}</td>
                                                        <td><strong>{record.systolic}/{record.diastolic}</strong></td>
                                                        <td><span className="badge" style={{ backgroundColor: bpStatus.color }}>{bpStatus.icon} {bpStatus.status}</span></td>
                                                        <td><strong>{record.temperature}°C</strong></td>
                                                        <td><span className="badge" style={{ backgroundColor: tempStatus.color }}>{tempStatus.icon} {tempStatus.status}</span></td>
                                                        <td>{record.notes || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* 發送給家屬按鈕 */}
                                <div className="d-flex gap-2 mt-3">
                                    <button
                                        className="btn btn-success"
                                        onClick={openLineModal}
                                    >
                                        📤 發送給家屬 LINE
                                    </button>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => window.print()}
                                    >
                                        🖨️ 列印
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div>
                                {isLoadingHistory ? (
                                    <div className="text-center py-4">
                                        <div className="spinner-border text-primary mb-2"></div>
                                        <p className="text-muted">正在從雲端載入歷史紀錄...</p>
                                    </div>
                                ) : selectedElder ? (
                                    <EmptyState
                                        icon="📊"
                                        title="尚無健康紀錄"
                                        description="這位長者還沒有健康紀錄，請先在「登記紀錄」頁面新增資料"
                                        action={{
                                            label: '⇐ 前往登記紀錄',
                                            onClick: () => setViewMode('entry')
                                        }}
                                        variant="compact"
                                    />
                                ) : (
                                    <EmptyState
                                        icon="👤"
                                        title="請先選擇長者"
                                        description="從上方下拉選單選擇要查詢的長者"
                                        variant="compact"
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* LINE 發送 Modal */}
            {showLineModal && (
                <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">📤 發送健康報告給家屬</h5>
                                <button
                                    type="button"
                                    className="btn-close btn-close-white"
                                    onClick={() => { setShowLineModal(false); setChartPreview(null); }}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p className="mb-3">
                                    將 <strong>{selectedElder}</strong> 的 {historyRecords.length} 筆健康紀錄發送給家屬
                                </p>

                                {/* 訊息格式選擇 */}
                                <div className="mb-4">
                                    <label className="form-label fw-bold mb-3">📨 選擇訊息格式</label>

                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="messageFormat"
                                            id="formatFlex"
                                            value="flex"
                                            checked={messageFormat === 'flex'}
                                            onChange={(e) => setMessageFormat(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="formatFlex">
                                            <strong>🎨 專業卡片（推薦）</strong>
                                            <br />
                                            <small className="text-muted">精美卡片式報告，含統計數據、異常次數、趨勢分析</small>
                                        </label>
                                    </div>

                                    <div className="form-check mb-2">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="messageFormat"
                                            id="formatChart"
                                            value="chart"
                                            checked={messageFormat === 'chart'}
                                            onChange={(e) => setMessageFormat(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="formatChart">
                                            <strong>📊 圖表報告</strong>
                                            <br />
                                            <small className="text-muted">血壓體溫趨勢圖 + 文字摘要</small>
                                        </label>
                                    </div>

                                    <div className="form-check">
                                        <input
                                            className="form-check-input"
                                            type="radio"
                                            name="messageFormat"
                                            id="formatText"
                                            value="text"
                                            checked={messageFormat === 'text'}
                                            onChange={(e) => setMessageFormat(e.target.value)}
                                        />
                                        <label className="form-check-label" htmlFor="formatText">
                                            <strong>📝 純文字</strong>
                                            <br />
                                            <small className="text-muted">簡單文字列表，適合網路較慢時使用</small>
                                        </label>
                                    </div>

                                    {/* 圖表預覽（僅圖表模式顯示） */}
                                    {messageFormat === 'chart' && (
                                        <div className="border rounded p-3 bg-light mt-3">
                                            <h6 className="mb-3">📈 圖表預覽</h6>
                                            {isLoadingCharts ? (
                                                <div className="text-center py-3">
                                                    <div className="spinner-border text-primary spinner-border-sm"></div>
                                                    <span className="ms-2">載入圖表中...</span>
                                                </div>
                                            ) : chartPreview ? (
                                                <div className="row">
                                                    <div className="col-md-6 mb-3">
                                                        <img
                                                            src={chartPreview.bloodPressure}
                                                            alt="血壓趨勢圖"
                                                            className="img-fluid rounded shadow-sm"
                                                            style={{ maxHeight: '150px' }}
                                                        />
                                                        <small className="d-block text-center text-muted mt-1">血壓趨勢</small>
                                                    </div>
                                                    <div className="col-md-6 mb-3">
                                                        <img
                                                            src={chartPreview.temperature}
                                                            alt="體溫趨勢圖"
                                                            className="img-fluid rounded shadow-sm"
                                                            style={{ maxHeight: '150px' }}
                                                        />
                                                        <small className="d-block text-center text-muted mt-1">體溫趨勢</small>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-muted text-center py-3">
                                                    點擊「圖表報告」後會載入預覽
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">家屬 LINE User ID</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="例如：U1234567890abcdef..."
                                        value={familyLineId}
                                        onChange={(e) => setFamilyLineId(e.target.value)}
                                    />
                                    <small className="text-muted">
                                        家屬需先加入據點官方帳號，輸入「我的ID」即可取得
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => { setShowLineModal(false); setChartPreview(null); }}
                                >
                                    取消
                                </button>
                                <button
                                    className="btn btn-success"
                                    onClick={sendToFamilyLine}
                                    disabled={isSendingLine}
                                >
                                    {isSendingLine ? '發送中...' :
                                        messageFormat === 'flex' ? '🎨 發送專業卡片' :
                                            messageFormat === 'chart' ? '📊 發送圖表報告' : '📝 發送文字報告'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HealthRecord;

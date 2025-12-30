import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';
import PageHeader from './PageHeader';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

function ExpenseEntry() {
    const [activeTab, setActiveTab] = useState('lunch');
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);

    // 通用的月份選擇
    const selectedMonth = selectedDate.substring(0, 7);

    // ========== 便當相關 ==========
    const [elders, setElders] = useState([]);
    const [lunchRecords, setLunchRecords] = useState({}); // { date: { elderId: true/false, ... } }
    const [stores, setStores] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [storePrice, setStorePrice] = useState(70);

    // 載入長者名單
    useEffect(() => {
        const fetchElders = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/sheets-elders`);
                setElders(res.data || []);
            } catch (err) {
                console.error('載入長者名單失敗:', err);
                // 使用備用資料
                setElders([
                    { id: 'E1', name: '吳王素香' }, { id: 'E2', name: '彭李瑞月' },
                    { id: 'E3', name: '賴葉玉美' }, { id: 'E4', name: '黃張美' },
                ]);
            }
        };
        fetchElders();

        // 載入便當店設定
        const savedStores = localStorage.getItem('lunchbox_stores');
        if (savedStores) {
            const parsed = JSON.parse(savedStores);
            setStores(parsed);
            if (parsed.length > 0) {
                setSelectedStore(parsed[0].name);
                setStorePrice(parsed[0].price);
            }
        } else {
            setStores([{ name: '預設便當店', price: 70 }]);
            setSelectedStore('預設便當店');
        }
    }, []);

    // 自動從快速登記讀取便當資料
    const getLunchStatsFromFeeRecords = () => {
        const days = [];
        const [year, month] = selectedMonth.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const date = `${selectedMonth}-${String(d).padStart(2, '0')}`;
            const saved = localStorage.getItem(`fee_record_${date}`);
            if (!saved) continue;

            const data = JSON.parse(saved);
            const participants = data.participants || [];

            const elderMeals = participants.filter(p => p.mealFee).length;
            const caregiverMeals = participants.filter(p => p.caregiverMeal).length;

            if (elderMeals > 0 || caregiverMeals > 0) {
                days.push({
                    date,
                    elderMeals,
                    caregiverMeals,
                    total: elderMeals + caregiverMeals,
                    cost: (elderMeals + caregiverMeals) * storePrice
                });
            }
        }
        return days;
    };

    const lunchStats = getLunchStatsFromFeeRecords();
    const lunchTotal = lunchStats.reduce((sum, d) => sum + d.cost, 0);
    const totalElderMeals = lunchStats.reduce((sum, d) => sum + d.elderMeals, 0);
    const totalCaregiverMeals = lunchStats.reduce((sum, d) => sum + d.caregiverMeals, 0);

    // 取得今日便當統計
    const getTodayLunchStats = () => {
        const saved = localStorage.getItem(`fee_record_${selectedDate}`);
        if (!saved) return { elderMeals: 0, caregiverMeals: 0, total: 0 };
        const data = JSON.parse(saved);
        const participants = data.participants || [];
        const elderMeals = participants.filter(p => p.mealFee).length;
        const caregiverMeals = participants.filter(p => p.caregiverMeal).length;
        return { elderMeals, caregiverMeals, total: elderMeals + caregiverMeals };
    };
    const todayLunch = getTodayLunchStats();

    // ========== 駕駛薪資相關（自動從快速登記讀取）==========
    const [driverStats, setDriverStats] = useState([]);
    const [driverRate, setDriverRate] = useState({ elderTransport: 90, selfPayTransport: 100 });

    // 取得當月所有日期
    const getDaysInMonth = () => {
        const [year, month] = selectedMonth.split('-').map(Number);
        const days = new Date(year, month, 0).getDate();
        return Array.from({ length: days }, (_, i) => {
            const day = String(i + 1).padStart(2, '0');
            return `${selectedMonth}-${day}`;
        });
    };

    // 從快速登記資料計算每日接送統計
    useEffect(() => {
        const rates = localStorage.getItem('transport_rates');
        if (rates) {
            const r = JSON.parse(rates);
            setDriverRate({ elderTransport: r.elderTransport || 90, selfPayTransport: r.caregiverTransport || 100 });
        }

        // 讀取當月每天的快速登記資料
        const days = getDaysInMonth();
        const stats = days.map(date => {
            const saved = localStorage.getItem(`fee_record_${date}`);
            if (!saved) return { date, elderAM: 0, elderPM: 0, selfPayAM: 0, selfPayPM: 0, salary: 0 };

            const data = JSON.parse(saved);
            const participants = data.participants || [];

            // 計算各類接送人數
            const elderAM = participants.filter(p => p.pickupAM && p.identity === '長者').length;
            const elderPM = participants.filter(p => p.pickupPM && p.identity === '長者').length;
            const selfPayAM = participants.filter(p => p.pickupAM && p.identity !== '長者').length;
            const selfPayPM = participants.filter(p => p.pickupPM && p.identity !== '長者').length;

            const salary = (elderAM + elderPM) * driverRate.elderTransport + (selfPayAM + selfPayPM) * driverRate.selfPayTransport;

            return { date, elderAM, elderPM, selfPayAM, selfPayPM, salary };
        }).filter(d => d.elderAM > 0 || d.elderPM > 0 || d.selfPayAM > 0 || d.selfPayPM > 0);

        setDriverStats(stats);
    }, [selectedMonth, selectedDate]);

    // 計算駕駛薪資總額
    const driverTotal = driverStats.reduce((sum, d) => sum + d.salary, 0);

    // ========== 助理工時相關 ==========
    const [assistants, setAssistants] = useState([]);
    const [workRecords, setWorkRecords] = useState([]);
    const [hourlyRate, setHourlyRate] = useState(183);

    useEffect(() => {
        const loadAssistantsAndRecords = async () => {
            try {
                // 從 Google Sheets 讀取助理設定
                const configRes = await fetch(`${GOOGLE_SCRIPT_URL}?action=getWorkHoursConfig`);
                const configData = await configRes.json();
                if (configData && configData.assistants) {
                    setAssistants(configData.assistants);
                    if (configData.hourlyRate) setHourlyRate(configData.hourlyRate);
                } else {
                    const savedAssistants = localStorage.getItem('work_hours_assistants');
                    if (savedAssistants) setAssistants(JSON.parse(savedAssistants));
                    else setAssistants(['助理A']);
                    const savedRate = localStorage.getItem('work_hours_rate');
                    if (savedRate) setHourlyRate(parseInt(savedRate));
                }

                // 從 Google Sheets 讀取工時紀錄
                const recordsRes = await fetch(`${GOOGLE_SCRIPT_URL}?action=getWorkHours&month=${selectedMonth}`);
                const recordsData = await recordsRes.json();
                if (recordsData && Array.isArray(recordsData)) {
                    setWorkRecords(recordsData);
                } else {
                    const saved = localStorage.getItem(`work_hours_${selectedMonth}`);
                    if (saved) setWorkRecords(JSON.parse(saved));
                    else setWorkRecords([]);
                }
            } catch (err) {
                const savedAssistants = localStorage.getItem('work_hours_assistants');
                if (savedAssistants) setAssistants(JSON.parse(savedAssistants));
                else setAssistants(['助理A']);
                const savedRate = localStorage.getItem('work_hours_rate');
                if (savedRate) setHourlyRate(parseInt(savedRate));
                const saved = localStorage.getItem(`work_hours_${selectedMonth}`);
                if (saved) setWorkRecords(JSON.parse(saved));
                else setWorkRecords([]);
            }
        };
        loadAssistantsAndRecords();
    }, [selectedMonth]);

    const saveWorkRecords = async (records) => {
        setWorkRecords(records);
        localStorage.setItem(`work_hours_${selectedMonth}`, JSON.stringify(records));
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'saveWorkHours', month: selectedMonth, records })
            });
        } catch (err) { }
    };

    const updateWorkHours = (date, assistant, hours) => {
        const key = `${date}_${assistant}`;
        const existing = workRecords.find(r => r.key === key);
        if (existing) {
            saveWorkRecords(workRecords.map(r => r.key === key ? { ...r, hours: parseFloat(hours) || 0 } : r));
        } else {
            saveWorkRecords([...workRecords, { key, date, assistant, hours: parseFloat(hours) || 0 }]);
        }
    };

    const getWorkHours = (date, assistant) => {
        const record = workRecords.find(r => r.date === date && r.assistant === assistant);
        return record ? record.hours : '';
    };

    const workTotal = workRecords.reduce((sum, r) => sum + (r.hours || 0) * hourlyRate, 0);

    // ========== 零用金相關 ==========
    const [pettyCashRecords, setPettyCashRecords] = useState([]);
    const [newPettyCash, setNewPettyCash] = useState({ item: '', amount: '', category: '文具用品' });
    const categories = ['文具用品', '清潔用品', '食材', '活動材料', '交通', '雜支', '其他'];

    useEffect(() => {
        const loadPettyCash = async () => {
            try {
                const res = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPettyCash&month=${selectedMonth}`);
                const data = await res.json();
                if (data && Array.isArray(data)) {
                    setPettyCashRecords(data);
                } else {
                    const saved = localStorage.getItem(`petty_cash_${selectedMonth}`);
                    if (saved) setPettyCashRecords(JSON.parse(saved));
                    else setPettyCashRecords([]);
                }
            } catch (err) {
                const saved = localStorage.getItem(`petty_cash_${selectedMonth}`);
                if (saved) setPettyCashRecords(JSON.parse(saved));
                else setPettyCashRecords([]);
            }
        };
        loadPettyCash();
    }, [selectedMonth]);

    const savePettyCash = async (records) => {
        setPettyCashRecords(records);
        localStorage.setItem(`petty_cash_${selectedMonth}`, JSON.stringify(records));
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST', mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'savePettyCash', month: selectedMonth, records })
            });
        } catch (err) { }
    };

    const addPettyCashRecord = () => {
        if (!newPettyCash.item.trim() || !newPettyCash.amount) {
            alert('請填寫項目和金額');
            return;
        }
        const record = {
            id: Date.now(),
            date: selectedDate,
            item: newPettyCash.item.trim(),
            amount: parseInt(newPettyCash.amount) || 0,
            category: newPettyCash.category,
        };
        savePettyCash([record, ...pettyCashRecords]);
        setNewPettyCash({ item: '', amount: '', category: '文具用品' });
    };

    const deletePettyCash = (id) => {
        savePettyCash(pettyCashRecords.filter(r => r.id !== id));
    };

    const pettyCashTotal = pettyCashRecords.reduce((sum, r) => sum + r.amount, 0);

    // ========== 長者收費相關 ==========
    const MEAL_FEE = 40;  // 向長者收取餐費 40 元

    // 根據身份類別取得車資
    const getFareByIdentity = (identityType) => {
        switch (identityType) {
            case 'low': return 0;        // 低收：免費
            case 'mediumLow': return 5;  // 中低收：5元
            default: return 18;          // 一般戶：18元
        }
    };

    // 計算長者月結明細
    const calculateElderBilling = () => {
        const days = getDaysInMonth();
        const billing = {};

        // 初始化每位長者的統計
        elders.forEach(elder => {
            billing[elder.name] = {
                name: elder.name,
                identityType: elder.identityType || 'normal',
                mealDays: 0,
                transportDays: 0,
                mealFee: 0,
                transportFee: 0,
                total: 0
            };
        });

        // 遍歷當月每天的快速登記資料
        days.forEach(date => {
            const saved = localStorage.getItem(`fee_record_${date}`);
            if (!saved) return;

            const data = JSON.parse(saved);
            const participants = data.participants || [];

            participants.forEach(p => {
                if (!billing[p.name]) return;

                // 統計餐費（如果有勾選）
                if (p.mealFee) {
                    billing[p.name].mealDays += 1;
                }

                // 統計車資（有來程或回程就算一天）
                if (p.pickupAM || p.pickupPM) {
                    billing[p.name].transportDays += 1;
                }
            });
        });

        // 計算費用
        Object.keys(billing).forEach(name => {
            const elder = elders.find(e => e.name === name);
            const fare = getFareByIdentity(elder?.identityType || 'normal');

            billing[name].mealFee = billing[name].mealDays * MEAL_FEE;
            billing[name].transportFee = billing[name].transportDays * fare;
            billing[name].total = billing[name].mealFee + billing[name].transportFee;
        });

        return Object.values(billing).filter(b => b.mealDays > 0 || b.transportDays > 0);
    };

    const elderBilling = calculateElderBilling();
    const elderBillingTotal = elderBilling.reduce((sum, b) => sum + b.total, 0);

    // Tab 樣式
    const tabStyle = (isActive) => ({
        padding: '12px 20px',
        border: 'none',
        background: isActive ? 'linear-gradient(135deg, #1976D2 0%, #1565c0 100%)' : '#f5f5f5',
        color: isActive ? 'white' : '#666',
        fontWeight: isActive ? '600' : '400',
        borderRadius: '10px 10px 0 0',
        cursor: 'pointer',
        marginRight: '4px',
    });

    return (
        <div>
            <PageHeader
                title="支出登記"
                icon="💳"
                subtitle="便當、駕駛薪資、工時、零用金"
                actions={[
                    {
                        label: selectedDate,
                        icon: '📅',
                        onClick: () => document.getElementById('dateInput').click()
                    }
                ]}
            />
            <input
                type="date"
                id="dateInput"
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
            />

            {/* Tab 導航 */}
            <div style={{ display: 'flex', marginBottom: '-1px', flexWrap: 'wrap' }}>
                <button style={tabStyle(activeTab === 'lunch')} onClick={() => setActiveTab('lunch')}>
                    🍱 便當 <span className="badge bg-light text-dark ms-1">${lunchTotal}</span>
                </button>
                <button style={tabStyle(activeTab === 'driver')} onClick={() => setActiveTab('driver')}>
                    🚗 駕駛薪資 <span className="badge bg-light text-dark ms-1">${driverTotal}</span>
                </button>
                <button style={tabStyle(activeTab === 'work')} onClick={() => setActiveTab('work')}>
                    ⏰ 助理工時 <span className="badge bg-light text-dark ms-1">${workTotal}</span>
                </button>
                <button style={tabStyle(activeTab === 'petty')} onClick={() => setActiveTab('petty')}>
                    💰 零用金 <span className="badge bg-light text-dark ms-1">${pettyCashTotal}</span>
                </button>
                <button style={tabStyle(activeTab === 'elderBilling')} onClick={() => setActiveTab('elderBilling')}>
                    👴 長者收費 <span className="badge bg-light text-dark ms-1">${elderBillingTotal}</span>
                </button>
            </div>

            {/* Tab 內容 */}
            <div className="card" style={{ borderTopLeftRadius: 0 }}>
                <div className="card-body">

                    {/* 便當 Tab */}
                    {activeTab === 'lunch' && (
                        <div>
                            {/* 便當店選擇 */}
                            <div className="row mb-3">
                                <div className="col-md-4">
                                    <label className="form-label">便當店</label>
                                    <select className="form-select" value={selectedStore}
                                        onChange={(e) => {
                                            setSelectedStore(e.target.value);
                                            const store = stores.find(s => s.name === e.target.value);
                                            if (store) setStorePrice(store.price);
                                        }}>
                                        {stores.map((s, i) => (
                                            <option key={i} value={s.name}>{s.name} (${s.price})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">單價</label>
                                    <div className="input-group">
                                        <span className="input-group-text">$</span>
                                        <input type="number" inputMode="numeric" className="form-control"
                                            min="0" max="200"
                                            style={{ borderColor: storePrice < 0 || storePrice > 200 ? '#f44336' : undefined }}
                                            value={storePrice}
                                            onChange={(e) => setStorePrice(parseInt(e.target.value) || 0)} />
                                    </div>
                                </div>
                            </div>

                            {/* 今日統計 */}
                            <div className="alert alert-success mb-4">
                                <div className="d-flex justify-content-around text-center">
                                    <div>
                                        <div className="h4 mb-0">{todayLunch.elderMeals}</div>
                                        <small>長者用餐</small>
                                    </div>
                                    <div>
                                        <div className="h4 mb-0">{todayLunch.caregiverMeals}</div>
                                        <small>外勞用餐</small>
                                    </div>
                                    <div>
                                        <div className="h4 mb-0 text-primary">{todayLunch.total}</div>
                                        <small><strong>便當總計</strong></small>
                                    </div>
                                    <div>
                                        <div className="h4 mb-0 text-danger">${todayLunch.total * storePrice}</div>
                                        <small><strong>今日金額</strong></small>
                                    </div>
                                </div>
                            </div>

                            <div className="alert alert-info mb-3">
                                <i className="fas fa-info-circle me-2"></i>
                                便當數量自動從「今日快速登記」的餐費勾選讀取，無需手動輸入。
                            </div>

                            {/* 月份統計表格 */}
                            {lunchStats.length === 0 ? (
                                <p className="text-muted text-center py-4">本月尚無便當紀錄（請先在「今日快速登記」勾選餐費）</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-sm table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th>日期</th>
                                                <th className="text-center">長者</th>
                                                <th className="text-center">外勞</th>
                                                <th className="text-center">總計</th>
                                                <th className="text-end">金額</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lunchStats.map(d => (
                                                <tr key={d.date}>
                                                    <td>{d.date}</td>
                                                    <td className="text-center">{d.elderMeals}</td>
                                                    <td className="text-center">{d.caregiverMeals}</td>
                                                    <td className="text-center fw-bold">{d.total}</td>
                                                    <td className="text-end text-primary">${d.cost}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="table-warning">
                                            <tr>
                                                <th>月份合計</th>
                                                <th className="text-center">{totalElderMeals}</th>
                                                <th className="text-center">{totalCaregiverMeals}</th>
                                                <th className="text-center">{totalElderMeals + totalCaregiverMeals}</th>
                                                <th className="text-end text-success h5 mb-0">${lunchTotal}</th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 駕駛薪資 Tab */}
                    {activeTab === 'driver' && (
                        <div>
                            <div className="alert alert-info mb-3">
                                <i className="fas fa-info-circle me-2"></i>
                                資料自動從「今日快速登記」的接送紀錄讀取，無需手動輸入。
                                <br />
                                <small>費率：長者 ${driverRate.elderTransport}/趟、自費 ${driverRate.selfPayTransport}/趟</small>
                            </div>
                            {driverStats.length === 0 ? (
                                <p className="text-muted text-center py-4">本月尚無接送紀錄（請先在「今日快速登記」登記）</p>
                            ) : (
                                <table className="table table-sm table-hover">
                                    <thead className="table-light">
                                        <tr>
                                            <th>日期</th>
                                            <th className="text-center">長者來程</th>
                                            <th className="text-center">長者回程</th>
                                            <th className="text-center">自費來程</th>
                                            <th className="text-center">自費回程</th>
                                            <th className="text-end">當日薪資</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {driverStats.map(d => (
                                            <tr key={d.date}>
                                                <td>{d.date}</td>
                                                <td className="text-center">{d.elderAM > 0 ? d.elderAM : '-'}</td>
                                                <td className="text-center">{d.elderPM > 0 ? d.elderPM : '-'}</td>
                                                <td className="text-center">{d.selfPayAM > 0 ? d.selfPayAM : '-'}</td>
                                                <td className="text-center">{d.selfPayPM > 0 ? d.selfPayPM : '-'}</td>
                                                <td className="text-end text-primary fw-bold">${d.salary}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-warning">
                                        <tr>
                                            <th colSpan="5">月份合計</th>
                                            <th className="text-end text-success h5 mb-0">${driverTotal}</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    )}

                    {/* 助理工時 Tab */}
                    {activeTab === 'work' && (
                        <div>
                            <div className="mb-3">
                                <small className="text-muted">時薪 ${hourlyRate}/小時（可在設定中修改）</small>
                            </div>
                            <div className="row">
                                {assistants.map(assistant => {
                                    const totalHours = workRecords.filter(r => r.assistant === assistant).reduce((s, r) => s + (r.hours || 0), 0);
                                    return (
                                        <div key={assistant} className="col-md-6 mb-3">
                                            <div className="card">
                                                <div className="card-header bg-info text-white d-flex justify-content-between">
                                                    <span>{assistant}</span>
                                                    <span>{totalHours}小時 = ${totalHours * hourlyRate}</span>
                                                </div>
                                                <div className="card-body">
                                                    <div className="d-flex align-items-center gap-2">
                                                        <span>今日工時：</span>
                                                        <input type="number" inputMode="decimal" className="form-control form-control-sm" style={{ width: '80px' }}
                                                            step="0.5" min="0" max="12" placeholder="0"
                                                            value={getWorkHours(selectedDate, assistant)}
                                                            onChange={(e) => updateWorkHours(selectedDate, assistant, e.target.value)} />
                                                        <span>小時</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 零用金 Tab */}
                    {activeTab === 'petty' && (
                        <div>
                            <div className="row g-2 mb-3">
                                <div className="col-md-3">
                                    <input type="text" className="form-control" placeholder="項目名稱"
                                        value={newPettyCash.item} onChange={(e) => setNewPettyCash({ ...newPettyCash, item: e.target.value })} />
                                </div>
                                <div className="col-md-2">
                                    <div className="input-group">
                                        <span className="input-group-text">$</span>
                                        <input type="number" inputMode="numeric" className="form-control" placeholder="金額"
                                            min="1" max="100000"
                                            style={{ borderColor: newPettyCash.amount && (newPettyCash.amount < 1 || newPettyCash.amount > 100000) ? '#f44336' : undefined }}
                                            value={newPettyCash.amount} onChange={(e) => setNewPettyCash({ ...newPettyCash, amount: e.target.value })} />
                                    </div>
                                </div>
                                <div className="col-md-2">
                                    <select className="form-select" value={newPettyCash.category}
                                        onChange={(e) => setNewPettyCash({ ...newPettyCash, category: e.target.value })}>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="col-md-2">
                                    <button className="btn btn-success w-100" onClick={addPettyCashRecord}>新增</button>
                                </div>
                            </div>
                            {pettyCashRecords.length === 0 ? (
                                <p className="text-muted">本月尚無零用金支出</p>
                            ) : (
                                <table className="table table-sm">
                                    <thead><tr><th>日期</th><th>項目</th><th>類別</th><th>金額</th><th></th></tr></thead>
                                    <tbody>
                                        {pettyCashRecords.map(r => (
                                            <tr key={r.id}>
                                                <td>{r.date}</td>
                                                <td>{r.item}</td>
                                                <td><span className="badge bg-secondary">{r.category}</span></td>
                                                <td className="text-danger fw-bold">${r.amount}</td>
                                                <td><button className="btn btn-sm btn-outline-danger" onClick={() => deletePettyCash(r.id)}>✕</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {/* 長者收費 Tab */}
                    {activeTab === 'elderBilling' && (
                        <div>
                            <div className="alert alert-info mb-3">
                                <strong>📋 收費標準：</strong><br />
                                餐費：$40/餐<br />
                                車資：一般戶 $18 / 中低收 $5 / 低收 $0
                            </div>
                            {elderBilling.length === 0 ? (
                                <p className="text-muted text-center py-4">本月尚無長者出席紀錄（請先在「今日快速登記」登記）</p>
                            ) : (
                                <div className="table-responsive">
                                    <table className="table table-hover">
                                        <thead className="table-light">
                                            <tr>
                                                <th>姓名</th>
                                                <th className="text-center">身份類別</th>
                                                <th className="text-center">用餐天數</th>
                                                <th className="text-center">餐費</th>
                                                <th className="text-center">接送天數</th>
                                                <th className="text-center">車資</th>
                                                <th className="text-end">應收合計</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {elderBilling.map((b, i) => {
                                                const identityLabel = b.identityType === 'low' ? '低收' :
                                                    b.identityType === 'mediumLow' ? '中低收' : '一般戶';
                                                const identityColor = b.identityType === 'low' ? '#4CAF50' :
                                                    b.identityType === 'mediumLow' ? '#FF9800' : '#2196F3';
                                                return (
                                                    <tr key={i}>
                                                        <td><strong>{b.name}</strong></td>
                                                        <td className="text-center">
                                                            <span className="badge" style={{ backgroundColor: identityColor }}>{identityLabel}</span>
                                                        </td>
                                                        <td className="text-center">{b.mealDays} 天</td>
                                                        <td className="text-center">${b.mealFee}</td>
                                                        <td className="text-center">{b.transportDays} 天</td>
                                                        <td className="text-center">${b.transportFee}</td>
                                                        <td className="text-end text-success fw-bold">${b.total}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot className="table-warning">
                                            <tr>
                                                <th colSpan="3">合計</th>
                                                <th className="text-center">${elderBilling.reduce((s, b) => s + b.mealFee, 0)}</th>
                                                <th></th>
                                                <th className="text-center">${elderBilling.reduce((s, b) => s + b.transportFee, 0)}</th>
                                                <th className="text-end text-success h5 mb-0">${elderBillingTotal}</th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 月份總計 */}
            <div className="card mt-4">
                <div className="card-body text-center">
                    <h5>📊 {selectedMonth} 月份支出總計</h5>
                    <div className="d-flex justify-content-around mt-3">
                        <div><div className="h5 text-success">${lunchTotal}</div><small>便當</small></div>
                        <div><div className="h5 text-primary">${driverTotal}</div><small>駕駛薪資</small></div>
                        <div><div className="h5 text-info">${workTotal}</div><small>助理工時</small></div>
                        <div><div className="h5 text-warning">${pettyCashTotal}</div><small>零用金</small></div>
                        <div><div className="h4 text-danger">${lunchTotal + driverTotal + workTotal + pettyCashTotal}</div><small><strong>合計</strong></small></div>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
            </div>
        </div >
    );
}

export default ExpenseEntry;

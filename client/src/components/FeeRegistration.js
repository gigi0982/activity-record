import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import API_BASE_URL from '../config/api';

function FeeRegistration() {
    const today = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(today);

    // 參與者名單（從活動紀錄或長者名單載入）
    const [participants, setParticipants] = useState([]);
    const [elderList, setElderList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // 便當店設定
    const [lunchBoxStores, setLunchBoxStores] = useState([]);
    const [lunchOrders, setLunchOrders] = useState([]);

    // 費率設定
    const [rates, setRates] = useState({
        elderTransport: 90,  // 長者車資（駕駛薪資）
        selfPayTransport: 100, // 自費車資
    });

    // 載入資料
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // 載入長者名單
                const elderRes = await axios.get(`${API_BASE_URL}/api/sheets-elders`);
                const elders = elderRes.data || [];
                setElderList(elders);

                // 初始化參與者（預設全部載入）
                setParticipants(elders.map(e => ({
                    ...e,
                    attended: false,
                    pickupAM: false,
                    pickupPM: false,
                    lunch: false,
                    identity: e.identity || '長者', // 長者/外勞/自費
                })));

                // 載入便當店（從 LocalStorage）
                const savedStores = localStorage.getItem('lunchbox_stores');
                if (savedStores) {
                    setLunchBoxStores(JSON.parse(savedStores));
                } else {
                    // 預設便當店
                    setLunchBoxStores([
                        { id: 1, name: '福來便當', price: 70, note: '葷食' },
                        { id: 2, name: '阿嬤廚房', price: 65, note: '素食' },
                    ]);
                }

                // 載入費率設定
                const savedRates = localStorage.getItem('transport_rates');
                if (savedRates) {
                    setRates(JSON.parse(savedRates));
                }

                // 載入當日已儲存的登記資料
                const savedData = localStorage.getItem(`fee_record_${selectedDate}`);
                if (savedData) {
                    const parsed = JSON.parse(savedData);
                    setParticipants(parsed.participants || []);
                    setLunchOrders(parsed.lunchOrders || []);
                }
            } catch (err) {
                console.error('載入資料失敗:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedDate]);

    // 切換參與者狀態
    const toggleParticipant = (index, field) => {
        setParticipants(prev => prev.map((p, i) =>
            i === index ? { ...p, [field]: !p[field] } : p
        ));
    };

    // 全選功能
    const selectAll = (field) => {
        const allChecked = participants.every(p => p[field]);
        setParticipants(prev => prev.map(p => ({ ...p, [field]: !allChecked })));
    };

    // 新增便當訂單
    const addLunchOrder = (store) => {
        setLunchOrders(prev => [...prev, {
            storeId: store.id,
            storeName: store.name,
            price: store.price,
            quantity: 1,
            note: store.note
        }]);
    };

    // 更新便當訂單數量
    const updateLunchQuantity = (index, quantity) => {
        setLunchOrders(prev => prev.map((o, i) =>
            i === index ? { ...o, quantity: parseInt(quantity) || 0 } : o
        ));
    };

    // 刪除便當訂單
    const removeLunchOrder = (index) => {
        setLunchOrders(prev => prev.filter((_, i) => i !== index));
    };

    // 計算統計
    const calculateStats = () => {
        const attended = participants.filter(p => p.attended);
        const pickupAM = participants.filter(p => p.pickupAM);
        const pickupPM = participants.filter(p => p.pickupPM);
        const lunch = participants.filter(p => p.lunch);

        // 分類統計
        const elderAM = pickupAM.filter(p => p.identity === '長者').length;
        const selfPayAM = pickupAM.filter(p => p.identity !== '長者').length;
        const elderPM = pickupPM.filter(p => p.identity === '長者').length;
        const selfPayPM = pickupPM.filter(p => p.identity !== '長者').length;

        // 駕駛薪資
        const driverSalaryAM = elderAM * rates.elderTransport + selfPayAM * rates.selfPayTransport;
        const driverSalaryPM = elderPM * rates.elderTransport + selfPayPM * rates.selfPayTransport;

        // 便當費用
        const lunchTotal = lunchOrders.reduce((sum, o) => sum + (o.price * o.quantity), 0);

        return {
            attendedCount: attended.length,
            pickupAMCount: pickupAM.length,
            pickupPMCount: pickupPM.length,
            lunchCount: lunch.length,
            elderAM, selfPayAM, elderPM, selfPayPM,
            driverSalaryAM, driverSalaryPM,
            driverSalaryTotal: driverSalaryAM + driverSalaryPM,
            lunchTotal,
        };
    };

    const stats = calculateStats();

    // 儲存紀錄
    const saveRecord = () => {
        const record = {
            date: selectedDate,
            participants,
            lunchOrders,
            stats,
        };
        localStorage.setItem(`fee_record_${selectedDate}`, JSON.stringify(record));
        alert('紀錄已儲存！');
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
                <h2><i className="fas fa-money-bill-wave me-2"></i>收費登記</h2>
                <div className="d-flex gap-2 align-items-center">
                    <input
                        type="date"
                        className="form-control"
                        style={{ width: '180px' }}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                    />
                    <Link to="/fee-settings" className="btn btn-outline-secondary">
                        <i className="fas fa-cog"></i> 設定
                    </Link>
                </div>
            </div>

            {/* 接送登記 */}
            <div className="card mb-4">
                <div className="card-header bg-primary text-white d-flex justify-content-between">
                    <span><i className="fas fa-bus me-2"></i>接送登記</span>
                    <div>
                        <button className="btn btn-sm btn-light me-1" onClick={() => selectAll('attended')}>
                            全選出席
                        </button>
                        <button className="btn btn-sm btn-light me-1" onClick={() => selectAll('pickupAM')}>
                            全選來程
                        </button>
                        <button className="btn btn-sm btn-light" onClick={() => selectAll('pickupPM')}>
                            全選回程
                        </button>
                    </div>
                </div>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-sm table-hover mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>姓名</th>
                                    <th>身份</th>
                                    <th className="text-center">出席</th>
                                    <th className="text-center">來程接送</th>
                                    <th className="text-center">回程接送</th>
                                    <th className="text-center">用餐</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participants.map((p, index) => (
                                    <tr key={p.id || index}>
                                        <td><strong>{p.name}</strong></td>
                                        <td>
                                            <select
                                                className="form-select form-select-sm"
                                                style={{ width: '80px' }}
                                                value={p.identity}
                                                onChange={(e) => {
                                                    setParticipants(prev => prev.map((pp, i) =>
                                                        i === index ? { ...pp, identity: e.target.value } : pp
                                                    ));
                                                }}
                                            >
                                                <option value="長者">長者</option>
                                                <option value="外勞">外勞</option>
                                                <option value="自費">自費</option>
                                            </select>
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={p.attended}
                                                onChange={() => toggleParticipant(index, 'attended')}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={p.pickupAM}
                                                onChange={() => toggleParticipant(index, 'pickupAM')}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={p.pickupPM}
                                                onChange={() => toggleParticipant(index, 'pickupPM')}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                className="form-check-input"
                                                checked={p.lunch}
                                                onChange={() => toggleParticipant(index, 'lunch')}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="card-footer">
                    <div className="row text-center">
                        <div className="col">
                            <div className="h5 text-primary mb-0">{stats.attendedCount}</div>
                            <small>出席人數</small>
                        </div>
                        <div className="col">
                            <div className="h5 text-success mb-0">{stats.pickupAMCount}</div>
                            <small>來程接送</small>
                        </div>
                        <div className="col">
                            <div className="h5 text-info mb-0">{stats.pickupPMCount}</div>
                            <small>回程接送</small>
                        </div>
                        <div className="col">
                            <div className="h5 text-warning mb-0">{stats.lunchCount}</div>
                            <small>用餐人數</small>
                        </div>
                    </div>
                </div>
            </div>

            {/* 駕駛薪資統計 */}
            <div className="card mb-4">
                <div className="card-header bg-success text-white">
                    <i className="fas fa-car me-2"></i>駕駛薪資統計
                </div>
                <div className="card-body">
                    <div className="row">
                        <div className="col-md-6">
                            <h6>來程</h6>
                            <p className="mb-1">長者 {stats.elderAM} 人 × {rates.elderTransport}元 = {stats.elderAM * rates.elderTransport}元</p>
                            <p className="mb-1">自費 {stats.selfPayAM} 人 × {rates.selfPayTransport}元 = {stats.selfPayAM * rates.selfPayTransport}元</p>
                            <p className="fw-bold">小計：{stats.driverSalaryAM}元</p>
                        </div>
                        <div className="col-md-6">
                            <h6>回程</h6>
                            <p className="mb-1">長者 {stats.elderPM} 人 × {rates.elderTransport}元 = {stats.elderPM * rates.elderTransport}元</p>
                            <p className="mb-1">自費 {stats.selfPayPM} 人 × {rates.selfPayTransport}元 = {stats.selfPayPM * rates.selfPayTransport}元</p>
                            <p className="fw-bold">小計：{stats.driverSalaryPM}元</p>
                        </div>
                    </div>
                    <hr />
                    <div className="text-center">
                        <span className="h4 text-success">今日駕駛薪資合計：{stats.driverSalaryTotal}元</span>
                    </div>
                </div>
            </div>

            {/* 便當登記 */}
            <div className="card mb-4">
                <div className="card-header bg-warning d-flex justify-content-between">
                    <span><i className="fas fa-utensils me-2"></i>便當登記</span>
                    <div className="dropdown">
                        <button className="btn btn-sm btn-light dropdown-toggle" data-bs-toggle="dropdown">
                            <i className="fas fa-plus"></i> 新增便當
                        </button>
                        <ul className="dropdown-menu">
                            {lunchBoxStores.map(store => (
                                <li key={store.id}>
                                    <button className="dropdown-item" onClick={() => addLunchOrder(store)}>
                                        {store.name} - ${store.price} ({store.note})
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="card-body">
                    {lunchOrders.length === 0 ? (
                        <p className="text-muted text-center mb-0">尚未登記便當，點擊「新增便當」開始</p>
                    ) : (
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>便當店</th>
                                    <th>單價</th>
                                    <th>數量</th>
                                    <th>小計</th>
                                    <th>備註</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {lunchOrders.map((order, index) => (
                                    <tr key={index}>
                                        <td>{order.storeName}</td>
                                        <td>${order.price}</td>
                                        <td>
                                            <input
                                                type="number"
                                                className="form-control form-control-sm"
                                                style={{ width: '80px' }}
                                                value={order.quantity}
                                                onChange={(e) => updateLunchQuantity(index, e.target.value)}
                                                min="1"
                                            />
                                        </td>
                                        <td className="fw-bold">${order.price * order.quantity}</td>
                                        <td><small className="text-muted">{order.note}</small></td>
                                        <td>
                                            <button className="btn btn-sm btn-outline-danger" onClick={() => removeLunchOrder(index)}>
                                                <i className="fas fa-times"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="3" className="text-end fw-bold">合計：</td>
                                    <td colSpan="3" className="fw-bold text-warning">${stats.lunchTotal}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>

            {/* 操作按鈕 */}
            <div className="d-flex gap-2">
                <button className="btn btn-primary btn-lg" onClick={saveRecord}>
                    <i className="fas fa-save me-1"></i>儲存紀錄
                </button>
                <Link to="/fee-report" className="btn btn-info btn-lg">
                    <i className="fas fa-chart-bar me-1"></i>月結報表
                </Link>
                <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
            </div>
        </div>
    );
}

export default FeeRegistration;

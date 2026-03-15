import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from './PageHeader';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyK19-9KHzqb_wPHntBlExiOeI-dxUNrZQM4RT2w-Ng6S2NqywtDFSenbsVwIevIp3twQ/exec';

function FeeReport() {
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [records, setRecords] = useState([]);
    const [personStats, setPersonStats] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rates, setRates] = useState({
        elderTransport: 90,
        elderMeal: 70,
        caregiverTransport: 100,
        caregiverMeal: 100,
    });

    // 載入當月所有紀錄
    useEffect(() => {
        const loadAllData = async () => {
            setIsLoading(true);

            // 先載入費率設定
            let currentRates = { ...rates };
            try {
                const settingsRes = await fetch(`${GOOGLE_SCRIPT_URL}?action=getSettings`);
                const settingsData = await settingsRes.json();
                if (settingsData && settingsData.rates) {
                    currentRates = { ...currentRates, ...settingsData.rates };
                }
            } catch (err) {
                const rateData = JSON.parse(localStorage.getItem('transport_rates') || '{}');
                currentRates = {
                    elderTransport: rateData.elderTransport || 90,
                    elderMeal: rateData.elderMeal || 70,
                    caregiverTransport: rateData.caregiverTransport || 100,
                    caregiverMeal: rateData.caregiverMeal || 100,
                };
            }
            setRates(currentRates);

            const monthRecords = [];
            const personMap = {};
            const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

            // 嘗試從 Google Sheets 讀取每日紀錄
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
                    monthRecords.push({
                        date: dateStr,
                        ...record.stats,
                        lunchOrders: record.lunchOrders || [],
                        participants: record.participants || [],
                    });

                    // 計算每個人的月統計
                    (record.participants || []).forEach(p => {
                        if (!p.attended) return;

                        if (!personMap[p.name]) {
                            personMap[p.name] = {
                                name: p.name,
                                trips: 0,
                                mealCount: 0,
                                caregiverTrips: 0,
                                caregiverMeals: 0,
                                transportFee: 0,
                                mealFeeAmount: 0,
                                caregiverTransportFee: 0,
                                caregiverMealFee: 0,
                            };
                        }

                        const person = personMap[p.name];
                        if (p.pickupAM) person.trips++;
                        if (p.pickupPM) person.trips++;
                        if (p.lunch) person.mealCount++;
                        if (p.caregiverAM) person.caregiverTrips++;
                        if (p.caregiverPM) person.caregiverTrips++;
                        if (p.caregiverLunch) person.caregiverMeals++;
                    });
                }
            }

            // 計算費用
            Object.values(personMap).forEach(p => {
                p.transportFee = p.trips * currentRates.elderTransport;
                p.mealFeeAmount = p.mealCount * currentRates.elderMeal;
                p.caregiverTransportFee = p.caregiverTrips * currentRates.caregiverTransport;
                p.caregiverMealFee = p.caregiverMeals * currentRates.caregiverMeal;
                p.selfPayAmount = p.caregiverTransportFee + p.caregiverMealFee;
                p.total = p.transportFee + p.mealFeeAmount + p.selfPayAmount;
            });

            setRecords(monthRecords);
            setPersonStats(Object.values(personMap).sort((a, b) => b.total - a.total));
            setIsLoading(false);
        };

        loadAllData();
    }, [selectedYear, selectedMonth]);

    // 匯出個人總表 CSV
    const exportPersonReport = () => {
        const lines = [
            `${selectedYear}年${selectedMonth}月 分餐收費明細`,
            `費率設定：長者車資 ${rates.elderTransport}元/趟, 長者餐費 ${rates.elderMeal}元/次, 外勞車資 ${rates.caregiverTransport}元/趟, 外勞餐費 ${rates.caregiverMeal}元/次`,
            '',
            '姓名,長者趟次,長者車費,餐次,餐費,外勞趟次,外勞車費,外勞餐次,外勞餐費,自費小計,合計',
        ];

        personStats.forEach(p => {
            lines.push(`${p.name},${p.trips},${p.transportFee},${p.mealCount || 0},${p.mealFeeAmount},${p.caregiverTrips},${p.caregiverTransportFee || 0},${p.caregiverMeals},${p.caregiverMealFee || 0},${p.selfPayAmount},${p.total}`);
        });

        // 合計
        const totals = personStats.reduce((acc, p) => ({
            trips: acc.trips + p.trips,
            transport: acc.transport + p.transportFee,
            mealCount: acc.mealCount + (p.mealCount || 0),
            meal: acc.meal + p.mealFeeAmount,
            caregiverTrips: acc.caregiverTrips + p.caregiverTrips,
            caregiverTransport: acc.caregiverTransport + (p.caregiverTransportFee || 0),
            caregiverMeals: acc.caregiverMeals + p.caregiverMeals,
            caregiverMeal: acc.caregiverMeal + (p.caregiverMealFee || 0),
            selfPay: acc.selfPay + p.selfPayAmount,
            total: acc.total + p.total,
        }), { trips: 0, transport: 0, mealCount: 0, meal: 0, caregiverTrips: 0, caregiverTransport: 0, caregiverMeals: 0, caregiverMeal: 0, selfPay: 0, total: 0 });

        lines.push(`合計,${totals.trips},${totals.transport},${totals.mealCount},${totals.meal},${totals.caregiverTrips},${totals.caregiverTransport},${totals.caregiverMeals},${totals.caregiverMeal},${totals.selfPay},${totals.total}`);

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `分餐收費_${selectedYear}年${selectedMonth}月.csv`;
        link.click();
    };

    // 計算總計
    const totals = personStats.reduce((acc, p) => ({
        trips: acc.trips + p.trips,
        transport: acc.transport + p.transportFee,
        mealCount: acc.mealCount + (p.mealCount || 0),
        meal: acc.meal + (p.mealFeeAmount || 0),
        selfPay: acc.selfPay + (p.selfPayAmount || 0),
        total: acc.total + p.total,
    }), { trips: 0, transport: 0, mealCount: 0, meal: 0, selfPay: 0, total: 0 });

    return (
        <div>
            <PageHeader
                title="月結報表"
                icon="📈"
                subtitle={`${selectedYear}年${selectedMonth}月 收費統計`}
            />
            <div className="mb-4 d-flex gap-2">
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

            {records.length === 0 ? (
                <div className="alert alert-info">
                    {selectedYear}年{selectedMonth}月 尚無收費紀錄
                </div>
            ) : (
                <>
                    {/* 月統計摘要 */}
                    <div className="row mb-4">
                        <div className="col-3">
                            <div className="card text-white bg-primary">
                                <div className="card-body text-center py-2">
                                    <div className="h4 mb-0">{records.length}</div>
                                    <small>活動天數</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-3">
                            <div className="card text-white bg-success">
                                <div className="card-body text-center py-2">
                                    <div className="h4 mb-0">${totals.transport.toLocaleString()}</div>
                                    <small>車費</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-3">
                            <div className="card text-white bg-warning">
                                <div className="card-body text-center py-2">
                                    <div className="h4 mb-0">${totals.meal.toLocaleString()}</div>
                                    <small>餐費</small>
                                </div>
                            </div>
                        </div>
                        <div className="col-3">
                            <div className="card text-white bg-danger">
                                <div className="card-body text-center py-2">
                                    <div className="h4 mb-0">${totals.total.toLocaleString()}</div>
                                    <small>總計</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 個人月總表 */}
                    <div className="card mb-4">
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <span><i className="fas fa-users me-2"></i>個人月總表</span>
                            <button className="btn btn-sm btn-light" onClick={exportPersonReport}>
                                <i className="fas fa-download me-1"></i>匯出 CSV
                            </button>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-sm table-striped mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>姓名</th>
                                            <th className="text-center">趟次</th>
                                            <th className="text-end">車費</th>
                                            <th className="text-center">餐次</th>
                                            <th className="text-end">餐費</th>
                                            <th className="text-end text-danger">自費</th>
                                            <th className="text-end">合計</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {personStats.map(p => (
                                            <tr key={p.name}>
                                                <td><strong>{p.name}</strong></td>
                                                <td className="text-center">{p.trips}</td>
                                                <td className="text-end">${p.transportFee}</td>
                                                <td className="text-center">{p.mealCount || 0}</td>
                                                <td className="text-end">${p.mealFeeAmount || 0}</td>
                                                <td className="text-end text-danger">
                                                    {p.selfPayAmount > 0 ? (
                                                        <span title={`外勞接送${p.caregiverTrips}趟 + 外勞餐${p.caregiverMeals}次`}>
                                                            ${p.selfPayAmount}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="text-end fw-bold">${p.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-secondary">
                                        <tr>
                                            <td className="fw-bold">合計</td>
                                            <td className="text-center fw-bold">{totals.trips}</td>
                                            <td className="text-end fw-bold">${totals.transport.toLocaleString()}</td>
                                            <td className="text-center fw-bold">{totals.mealCount || 0}</td>
                                            <td className="text-end fw-bold">${totals.meal.toLocaleString()}</td>
                                            <td className="text-end fw-bold text-danger">${totals.selfPay.toLocaleString()}</td>
                                            <td className="text-end fw-bold">${totals.total.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* 每日明細 */}
                    <div className="card mb-4">
                        <div className="card-header">
                            <i className="fas fa-list me-2"></i>每日明細
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-sm table-striped mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>日期</th>
                                            <th className="text-center">出席</th>
                                            <th className="text-center">長者來</th>
                                            <th className="text-center">長者回</th>
                                            <th className="text-center">外勞來</th>
                                            <th className="text-center">外勞回</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map(r => (
                                            <tr key={r.date}>
                                                <td>{r.date}</td>
                                                <td className="text-center">{r.attended || 0}</td>
                                                <td className="text-center">{r.pickupAM || 0}</td>
                                                <td className="text-center">{r.pickupPM || 0}</td>
                                                <td className="text-center">{r.caregiverAM || 0}</td>
                                                <td className="text-center">{r.caregiverPM || 0}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="d-flex gap-2">
                <Link to="/" className="btn btn-secondary">← 返回首頁</Link>
            </div>
        </div>
    );
}

export default FeeReport;

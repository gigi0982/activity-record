import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function FeeReport() {
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [records, setRecords] = useState([]);
    const [personStats, setPersonStats] = useState([]);
    const [rates, setRates] = useState({ elderTransport: 90, selfPayTransport: 100 });

    // 載入當月所有紀錄
    useEffect(() => {
        const loadRecords = () => {
            const monthRecords = [];
            const personMap = {}; // 個人統計
            const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const saved = localStorage.getItem(`fee_record_${dateStr}`);
                if (saved) {
                    const record = JSON.parse(saved);
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
                                trips: 0,           // 趟次（來+回）
                                transportFee: 0,    // 車費
                                mealFee: 0,         // 餐費
                                selfPayFee: 0,      // 自費（外勞）
                                caregiverTrips: 0,  // 外勞趟次
                                caregiverMeals: 0,  // 外勞餐次
                            };
                        }

                        const person = personMap[p.name];

                        // 長者接送
                        if (p.pickupAM) person.trips++;
                        if (p.pickupPM) person.trips++;

                        // 長者便當（假設有勾選就計算一次）
                        if (p.lunch) person.mealFee++;

                        // 外勞接送
                        if (p.caregiverAM) { person.caregiverTrips++; person.selfPayFee++; }
                        if (p.caregiverPM) { person.caregiverTrips++; person.selfPayFee++; }

                        // 外勞餐費
                        if (p.caregiverLunch) { person.caregiverMeals++; person.selfPayFee++; }
                    });
                }
            }

            // 計算費用
            const rateData = JSON.parse(localStorage.getItem('transport_rates') || '{}');
            const elderRate = rateData.elderTransport || 90;
            const selfPayRate = rateData.selfPayTransport || 100;
            const mealRate = 70; // 假設餐費 70 元

            Object.values(personMap).forEach(p => {
                p.transportFee = p.trips * elderRate;
                p.mealFeeAmount = p.mealFee * mealRate;
                p.selfPayAmount = (p.caregiverTrips * selfPayRate) + (p.caregiverMeals * mealRate);
                p.total = p.transportFee + p.mealFeeAmount + p.selfPayAmount;
            });

            setRecords(monthRecords);
            setPersonStats(Object.values(personMap).sort((a, b) => b.total - a.total));
        };

        const savedRates = localStorage.getItem('transport_rates');
        if (savedRates) setRates(JSON.parse(savedRates));
        loadRecords();
    }, [selectedYear, selectedMonth]);

    // 匯出個人總表 CSV
    const exportPersonReport = () => {
        const lines = [
            `${selectedYear}年${selectedMonth}月 分餐收費`,
            '姓名,趟次,車費,餐費,自費,合計',
        ];

        personStats.forEach(p => {
            lines.push(`${p.name},${p.trips},${p.transportFee},${p.mealFeeAmount},${p.selfPayAmount},${p.total}`);
        });

        // 合計
        const totals = personStats.reduce((acc, p) => ({
            trips: acc.trips + p.trips,
            transport: acc.transport + p.transportFee,
            meal: acc.meal + p.mealFeeAmount,
            selfPay: acc.selfPay + p.selfPayAmount,
            total: acc.total + p.total,
        }), { trips: 0, transport: 0, meal: 0, selfPay: 0, total: 0 });

        lines.push(`合計,${totals.trips},${totals.transport},${totals.meal},${totals.selfPay},${totals.total}`);

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
        meal: acc.meal + (p.mealFeeAmount || 0),
        selfPay: acc.selfPay + (p.selfPayAmount || 0),
        total: acc.total + p.total,
    }), { trips: 0, transport: 0, meal: 0, selfPay: 0, total: 0 });

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-chart-bar me-2"></i>月結報表</h2>
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
                                            <th className="text-end">餐費</th>
                                            <th className="text-end">自費</th>
                                            <th className="text-end">合計</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {personStats.map(p => (
                                            <tr key={p.name}>
                                                <td><strong>{p.name}</strong></td>
                                                <td className="text-center">{p.trips}</td>
                                                <td className="text-end">${p.transportFee}</td>
                                                <td className="text-end">${p.mealFeeAmount || 0}</td>
                                                <td className="text-end text-danger">{p.selfPayAmount > 0 ? `$${p.selfPayAmount}` : '-'}</td>
                                                <td className="text-end fw-bold">${p.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-secondary">
                                        <tr>
                                            <td className="fw-bold">合計</td>
                                            <td className="text-center fw-bold">{totals.trips}</td>
                                            <td className="text-end fw-bold">${totals.transport.toLocaleString()}</td>
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

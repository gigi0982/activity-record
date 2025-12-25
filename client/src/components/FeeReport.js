import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function FeeReport() {
    const today = new Date();
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [records, setRecords] = useState([]);
    const [rates, setRates] = useState({ elderTransport: 90, selfPayTransport: 100 });

    // 載入當月所有紀錄
    useEffect(() => {
        const loadRecords = () => {
            const monthRecords = [];
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
                    });
                }
            }
            setRecords(monthRecords);
        };

        const savedRates = localStorage.getItem('transport_rates');
        if (savedRates) {
            setRates(JSON.parse(savedRates));
        }

        loadRecords();
    }, [selectedYear, selectedMonth]);

    // 計算月統計
    const calculateMonthlyStats = () => {
        let totalDriverSalary = 0;
        let totalLunchCost = 0;
        let totalAttendance = 0;
        let totalPickupAM = 0;
        let totalPickupPM = 0;
        const storeTotals = {};

        records.forEach(r => {
            totalDriverSalary += r.driverSalaryTotal || 0;
            totalLunchCost += r.lunchTotal || 0;
            totalAttendance += r.attendedCount || 0;
            totalPickupAM += r.pickupAMCount || 0;
            totalPickupPM += r.pickupPMCount || 0;

            // 統計各便當店
            (r.lunchOrders || []).forEach(order => {
                if (!storeTotals[order.storeName]) {
                    storeTotals[order.storeName] = { quantity: 0, total: 0 };
                }
                storeTotals[order.storeName].quantity += order.quantity;
                storeTotals[order.storeName].total += order.price * order.quantity;
            });
        });

        return {
            totalDriverSalary,
            totalLunchCost,
            totalAttendance,
            totalPickupAM,
            totalPickupPM,
            storeTotals,
            recordCount: records.length,
        };
    };

    const monthStats = calculateMonthlyStats();

    // 匯出報表
    const exportReport = () => {
        const lines = [
            `${selectedYear}年${selectedMonth}月 收費統計報表`,
            '',
            `活動天數：${monthStats.recordCount} 天`,
            `總出席人次：${monthStats.totalAttendance}`,
            `總接送來程人次：${monthStats.totalPickupAM}`,
            `總接送回程人次：${monthStats.totalPickupPM}`,
            '',
            `【駕駛薪資】`,
            `月薪資總計：${monthStats.totalDriverSalary} 元`,
            '',
            `【便當費用】`,
        ];

        Object.entries(monthStats.storeTotals).forEach(([store, data]) => {
            lines.push(`${store}：${data.quantity} 個，共 ${data.total} 元`);
        });
        lines.push(`便當總計：${monthStats.totalLunchCost} 元`);
        lines.push('');
        lines.push(`【每日明細】`);
        lines.push('日期,出席,來程,回程,駕駛薪資,便當費用');

        records.forEach(r => {
            lines.push(`${r.date},${r.attendedCount},${r.pickupAMCount},${r.pickupPMCount},${r.driverSalaryTotal},${r.lunchTotal}`);
        });

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `收費報表_${selectedYear}年${selectedMonth}月.csv`;
        link.click();
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><i className="fas fa-chart-bar me-2"></i>月結報表</h2>
                <div className="d-flex gap-2 align-items-center">
                    <select
                        className="form-select"
                        style={{ width: '100px' }}
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                    </select>
                    <select
                        className="form-select"
                        style={{ width: '100px' }}
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                            <option key={m} value={m}>{m}月</option>
                        ))}
                    </select>
                    <button className="btn btn-success" onClick={exportReport}>
                        <i className="fas fa-download me-1"></i>匯出 CSV
                    </button>
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
                        <div className="col-md-3">
                            <div className="card text-white bg-primary">
                                <div className="card-body text-center">
                                    <div className="h3">{monthStats.recordCount}</div>
                                    <div>活動天數</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-white bg-success">
                                <div className="card-body text-center">
                                    <div className="h3">${monthStats.totalDriverSalary.toLocaleString()}</div>
                                    <div>駕駛薪資</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-white bg-warning">
                                <div className="card-body text-center">
                                    <div className="h3">${monthStats.totalLunchCost.toLocaleString()}</div>
                                    <div>便當費用</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card text-white bg-info">
                                <div className="card-body text-center">
                                    <div className="h3">{monthStats.totalAttendance}</div>
                                    <div>總出席人次</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 便當店統計 */}
                    {Object.keys(monthStats.storeTotals).length > 0 && (
                        <div className="card mb-4">
                            <div className="card-header bg-warning">
                                <i className="fas fa-utensils me-2"></i>各便當店統計
                            </div>
                            <div className="card-body">
                                <table className="table table-sm">
                                    <thead>
                                        <tr>
                                            <th>便當店</th>
                                            <th>數量</th>
                                            <th>金額</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Object.entries(monthStats.storeTotals).map(([store, data]) => (
                                            <tr key={store}>
                                                <td>{store}</td>
                                                <td>{data.quantity} 個</td>
                                                <td>${data.total.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="table-warning">
                                            <td className="fw-bold">合計</td>
                                            <td className="fw-bold">
                                                {Object.values(monthStats.storeTotals).reduce((s, d) => s + d.quantity, 0)} 個
                                            </td>
                                            <td className="fw-bold">${monthStats.totalLunchCost.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

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
                                            <th className="text-center">來程</th>
                                            <th className="text-center">回程</th>
                                            <th className="text-end">駕駛薪資</th>
                                            <th className="text-end">便當費用</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {records.map(r => (
                                            <tr key={r.date}>
                                                <td>{r.date}</td>
                                                <td className="text-center">{r.attendedCount}</td>
                                                <td className="text-center">{r.pickupAMCount}</td>
                                                <td className="text-center">{r.pickupPMCount}</td>
                                                <td className="text-end">${r.driverSalaryTotal}</td>
                                                <td className="text-end">${r.lunchTotal}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="table-secondary">
                                        <tr>
                                            <td className="fw-bold">合計</td>
                                            <td className="text-center fw-bold">{monthStats.totalAttendance}</td>
                                            <td className="text-center fw-bold">{monthStats.totalPickupAM}</td>
                                            <td className="text-center fw-bold">{monthStats.totalPickupPM}</td>
                                            <td className="text-end fw-bold">${monthStats.totalDriverSalary.toLocaleString()}</td>
                                            <td className="text-end fw-bold">${monthStats.totalLunchCost.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="d-flex gap-2">
                <Link to="/fee" className="btn btn-secondary">← 返回收費登記</Link>
                <Link to="/" className="btn btn-outline-secondary">返回首頁</Link>
            </div>
        </div>
    );
}

export default FeeReport;

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface FeeRecord {
    date: string;
    stats: {
        attended: number;
        pickupAM: number;
        pickupPM: number;
        mealFee: number;
        caregiverAM: number;
        caregiverPM: number;
        caregiverMeal: number;
        selfAM: number;
        selfPM: number;
    };
    fees?: {
        elderTransportFee: number;
        elderMealFee: number;
        driverSalary: number;
        lunchboxCost: number;
        totalIncome: number;
        totalExpense: number;
    };
    lunchStores?: { name: string; count: number }[];
    elderDetails?: ElderDetail[];
}

interface ElderDetail {
    name: string;
    pickupAM?: boolean;
    pickupPM?: boolean;
    mealFee?: boolean;
    selfAM?: boolean;
    selfPM?: boolean;
    transportFee: number;
    mealAmount: number;
    selfAmount: number;
    total: number;
}

interface ElderSummary {
    name: string;
    transportFee: number;
    mealAmount: number;
    selfAmount: number;
    total: number;
    days: number;
}

// 費率設定
const FEE_RATES = {
    DRIVER_PER_TRIP: 80,
    LUNCHBOX_COST: 70,
};

type ViewType = 'attendance' | 'elderFees' | 'driverSalary' | 'lunchbox' | 'caregiver';

export default function FeesPage() {
    const params = useParams();
    const siteId = params.site as string;

    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [records, setRecords] = useState<FeeRecord[]>([]);
    const [elderSummaries, setElderSummaries] = useState<ElderSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<ViewType>('attendance');
    const [selectedElder, setSelectedElder] = useState<string | null>(null);

    useEffect(() => {
        loadRecords();
    }, [selectedMonth]);

    const loadRecords = () => {
        setIsLoading(true);
        const monthRecords: FeeRecord[] = [];
        const elderMap = new Map<string, ElderSummary>();

        if (typeof window !== 'undefined') {
            const [year, month] = selectedMonth.split('-').map(Number);
            const daysInMonth = new Date(year, month, 0).getDate();

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
                const saved = localStorage.getItem(`fee_record_${dateStr}`);
                if (saved) {
                    const data = JSON.parse(saved);
                    const record: FeeRecord = {
                        date: dateStr,
                        stats: data.stats || {
                            attended: 0, pickupAM: 0, pickupPM: 0, mealFee: 0,
                            caregiverAM: 0, caregiverPM: 0, caregiverMeal: 0,
                            selfAM: 0, selfPM: 0
                        },
                        fees: data.fees || null,
                        lunchStores: data.lunchStores || [],
                        elderDetails: data.elderDetails || [],
                    };
                    monthRecords.push(record);

                    // 累加每位長者的費用
                    if (data.elderDetails) {
                        data.elderDetails.forEach((ed: ElderDetail) => {
                            if (elderMap.has(ed.name)) {
                                const existing = elderMap.get(ed.name)!;
                                existing.transportFee += ed.transportFee || 0;
                                existing.mealAmount += ed.mealAmount || 0;
                                existing.selfAmount += ed.selfAmount || 0;
                                existing.total += ed.total || 0;
                                existing.days += 1;
                            } else {
                                elderMap.set(ed.name, {
                                    name: ed.name,
                                    transportFee: ed.transportFee || 0,
                                    mealAmount: ed.mealAmount || 0,
                                    selfAmount: ed.selfAmount || 0,
                                    total: ed.total || 0,
                                    days: 1,
                                });
                            }
                        });
                    }
                }
            }
        }

        setRecords(monthRecords);
        setElderSummaries(Array.from(elderMap.values()).sort((a, b) => b.total - a.total));
        setIsLoading(false);
    };

    const getMonthOptions = () => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
            options.push({ value, label });
        }
        return options;
    };

    // 計算月度總計
    const totals = records.reduce((acc, r) => ({
        attended: acc.attended + r.stats.attended,
        pickupAM: acc.pickupAM + r.stats.pickupAM,
        pickupPM: acc.pickupPM + r.stats.pickupPM,
        mealFee: acc.mealFee + r.stats.mealFee,
        caregiverAM: acc.caregiverAM + r.stats.caregiverAM,
        caregiverPM: acc.caregiverPM + r.stats.caregiverPM,
        caregiverMeal: acc.caregiverMeal + r.stats.caregiverMeal,
        selfAM: acc.selfAM + (r.stats.selfAM || 0),
        selfPM: acc.selfPM + (r.stats.selfPM || 0),
    }), {
        attended: 0, pickupAM: 0, pickupPM: 0, mealFee: 0,
        caregiverAM: 0, caregiverPM: 0, caregiverMeal: 0,
        selfAM: 0, selfPM: 0
    });

    // 計算長者總收費
    const totalElderFee = elderSummaries.reduce((sum, e) => sum + e.total, 0);

    // 計算駕駛薪資
    const totalDriverSalary = records.reduce((sum, r) => sum + (r.fees?.driverSalary || 0), 0);

    // 計算便當費用 (從各店家統計)
    const calculateLunchboxStats = () => {
        const storeMap = new Map<string, number>();
        let totalLunchboxes = 0;

        records.forEach(r => {
            if (r.lunchStores) {
                r.lunchStores.forEach(s => {
                    const current = storeMap.get(s.name) || 0;
                    storeMap.set(s.name, current + s.count);
                    totalLunchboxes += s.count;
                });
            }
        });

        return {
            stores: Array.from(storeMap.entries()).map(([name, count]) => ({ name, count })),
            totalLunchboxes,
            totalCost: totalLunchboxes * FEE_RATES.LUNCHBOX_COST,
        };
    };

    const lunchboxStats = calculateLunchboxStats();

    // 取得長者明細（含來/回/餐詳細）
    const getElderRecords = (name: string) => {
        const details: {
            date: string;
            pickupAM: boolean;
            pickupPM: boolean;
            mealFee: boolean;
            selfAM: boolean;
            selfPM: boolean;
            transportFee: number;
            mealAmount: number;
            selfAmount: number;
            total: number
        }[] = [];
        records.forEach(r => {
            const ed = r.elderDetails?.find(e => e.name === name);
            if (ed) {
                details.push({
                    date: r.date,
                    pickupAM: ed.pickupAM || false,
                    pickupPM: ed.pickupPM || false,
                    mealFee: ed.mealFee || false,
                    selfAM: ed.selfAM || false,
                    selfPM: ed.selfPM || false,
                    transportFee: ed.transportFee,
                    mealAmount: ed.mealAmount,
                    selfAmount: ed.selfAmount,
                    total: ed.total,
                });
            }
        });
        return details;
    };

    // CSV 匯出功能
    const downloadCSV = (filename: string, content: string) => {
        // 加入 BOM 以支援 Excel 正確顯示中文
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const exportElderFees = () => {
        const monthLabel = selectedMonth.replace('-', '年') + '月';

        // 輔助函數
        const getTransportDesc = (am: boolean, pm: boolean) => {
            if (am && pm) return '來回';
            if (am) return '來程';
            if (pm) return '回程';
            return '';
        };

        // === 第一部分：長者個別明細 ===
        let csv = `${monthLabel} 長者收費明細\n\n`;

        elderSummaries.forEach(elder => {
            const elderRecords = getElderRecords(elder.name);
            csv += `【${elder.name}】\n`;
            csv += `日期,車程,車資,用餐,餐費,自費,當日合計\n`;

            elderRecords.forEach(r => {
                const dateStr = r.date.substring(5).replace('-', '/');
                const transportDesc = getTransportDesc(r.pickupAM, r.pickupPM);
                const mealDesc = r.mealFee ? '是' : '';
                const selfDesc = (r.selfAM || r.selfPM) ? '是' : '';
                csv += `${dateStr},${transportDesc},${r.transportFee},${mealDesc},${r.mealAmount},${r.selfAmount},${r.total}\n`;
            });

            csv += `小計,,${elder.transportFee},,${elder.mealAmount},${elder.selfAmount},${elder.total}\n`;
            csv += `\n`;
        });

        // === 第二部分：月份總表 ===
        csv += `\n===== 月份總表 =====\n`;
        csv += `姓名,車資,餐費,自費,合計,出席天數\n`;

        elderSummaries.forEach(elder => {
            csv += `${elder.name},${elder.transportFee},${elder.mealAmount},${elder.selfAmount},${elder.total},${elder.days}\n`;
        });

        csv += `總計,${elderSummaries.reduce((s, e) => s + e.transportFee, 0)},`;
        csv += `${elderSummaries.reduce((s, e) => s + e.mealAmount, 0)},`;
        csv += `${elderSummaries.reduce((s, e) => s + e.selfAmount, 0)},`;
        csv += `${elderSummaries.reduce((s, e) => s + e.total, 0)},`;
        csv += `${elderSummaries.reduce((s, e) => s + e.days, 0)}\n`;

        downloadCSV(`長者收費明細_${selectedMonth}.csv`, csv);
    };

    // 匯出單一長者明細
    const exportSingleElder = (elderName: string) => {
        const monthLabel = selectedMonth.replace('-', '年') + '月';
        const elderRecords = getElderRecords(elderName);
        const elder = elderSummaries.find(e => e.name === elderName);

        if (!elder || elderRecords.length === 0) return;

        // 輔助函數
        const getTransportDesc = (am: boolean, pm: boolean) => {
            if (am && pm) return '來回';
            if (am) return '來';
            if (pm) return '回';
            return '';
        };

        // 格式化搭乘日期
        const transportDates = elderRecords
            .filter(r => r.pickupAM || r.pickupPM)
            .map(r => {
                const dateStr = r.date.substring(5).replace('-', '');
                const desc = getTransportDesc(r.pickupAM, r.pickupPM);
                return `${dateStr}(${desc})`;
            })
            .join(', ');

        // 計算總趟次
        const totalTrips = elderRecords.reduce((sum, r) => {
            let trips = 0;
            if (r.pickupAM) trips++;
            if (r.pickupPM) trips++;
            return sum + trips;
        }, 0);

        // 格式化用餐日期
        const mealDates = elderRecords
            .filter(r => r.mealFee)
            .map(r => r.date.substring(5).replace('-', ''))
            .join(', ');

        const totalMeals = elderRecords.filter(r => r.mealFee).length;

        // CSV 內容
        let csv = `${monthLabel} ${elderName} 收費明細\n\n`;

        // 車資明細
        csv += `【車資明細】\n`;
        csv += `姓名,搭乘日期,總趟次,單價,總計\n`;
        csv += `${elderName},"${transportDates}",${totalTrips},${Math.round(elder.transportFee / (totalTrips || 1))},${elder.transportFee}\n\n`;

        // 餐費明細
        csv += `【餐費明細】\n`;
        csv += `姓名,用餐日期,總餐數,單價,總計\n`;
        csv += `${elderName},"${mealDates}",${totalMeals},${Math.round(elder.mealAmount / (totalMeals || 1))},${elder.mealAmount}\n\n`;

        // 自費明細
        if (elder.selfAmount > 0) {
            const selfDates = elderRecords
                .filter(r => r.selfAM || r.selfPM)
                .map(r => {
                    const dateStr = r.date.substring(5).replace('-', '');
                    const sessions = [];
                    if (r.selfAM) sessions.push('上');
                    if (r.selfPM) sessions.push('下');
                    return `${dateStr}(${sessions.join('')})`;
                })
                .join(', ');

            const totalSelfSessions = elderRecords.reduce((sum, r) => {
                let s = 0;
                if (r.selfAM) s++;
                if (r.selfPM) s++;
                return sum + s;
            }, 0);

            csv += `【自費明細】\n`;
            csv += `姓名,自費日期,時段數,單價,總計\n`;
            csv += `${elderName},"${selfDates}",${totalSelfSessions},200,${elder.selfAmount}\n\n`;
        }

        // 總計
        csv += `【合計】\n`;
        csv += `項目,金額\n`;
        csv += `車資,${elder.transportFee}\n`;
        csv += `餐費,${elder.mealAmount}\n`;
        csv += `自費,${elder.selfAmount}\n`;
        csv += `總計,${elder.total}\n`;

        downloadCSV(`${elderName}_收費明細_${selectedMonth}.csv`, csv);
    };

    const exportLunchbox = () => {
        const monthLabel = selectedMonth.replace('-', '年') + '月';
        let csv = `${monthLabel} 便當費用明細\n`;
        csv += `日期,便當數量,金額,店家明細\n`;

        records.forEach(record => {
            const totalBoxes = record.lunchStores?.reduce((s, x) => s + x.count, 0) || 0;
            const storeDetails = record.lunchStores?.filter(s => s.count > 0)
                .map(s => `${s.name}${s.count}個`)
                .join(' ') || '';
            csv += `${record.date},${totalBoxes},${totalBoxes * FEE_RATES.LUNCHBOX_COST},${storeDetails}\n`;
        });

        csv += `\n總計,${lunchboxStats.totalLunchboxes},${lunchboxStats.totalCost},\n`;

        downloadCSV(`便當費用明細_${selectedMonth}.csv`, csv);
    };

    const exportDriverSalary = () => {
        const monthLabel = selectedMonth.replace('-', '年') + '月';
        let csv = `${monthLabel} 駕駛薪資明細\n`;
        csv += `日期,長者來程,長者回程,外籍來程,外籍回程,長者薪資,外籍薪資,當日合計\n`;

        records.forEach(record => {
            const elderSalary = (record.stats.pickupAM + record.stats.pickupPM) * 80;
            const caregiverSalary = (record.stats.caregiverAM + record.stats.caregiverPM) * 100;
            csv += `${record.date},${record.stats.pickupAM},${record.stats.pickupPM},`;
            csv += `${record.stats.caregiverAM},${record.stats.caregiverPM},`;
            csv += `${elderSalary},${caregiverSalary},${elderSalary + caregiverSalary}\n`;
        });

        csv += `\n總計,${totals.pickupAM},${totals.pickupPM},${totals.caregiverAM},${totals.caregiverPM},`;
        csv += `${(totals.pickupAM + totals.pickupPM) * 80},${(totals.caregiverAM + totals.caregiverPM) * 100},${totalDriverSalary}\n`;

        downloadCSV(`駕駛薪資明細_${selectedMonth}.csv`, csv);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-500">載入中...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            {/* 標題區 */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">📊 收費報表</h1>
                <select
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                >
                    {getMonthOptions().map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            </div>

            {/* 統計卡片 - 可點擊切換檢視 */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <button
                    onClick={() => setActiveView('attendance')}
                    className={`rounded-xl p-4 text-white text-left transition-all ${activeView === 'attendance'
                        ? 'bg-gradient-to-br from-green-500 to-green-700 ring-4 ring-green-300'
                        : 'bg-gradient-to-br from-green-400 to-green-600 hover:scale-105'
                        }`}
                >
                    <div className="text-3xl font-bold">{totals.attended}</div>
                    <div className="text-sm opacity-80">總出席人次</div>
                </button>
                <button
                    onClick={() => setActiveView('elderFees')}
                    className={`rounded-xl p-4 text-white text-left transition-all ${activeView === 'elderFees'
                        ? 'bg-gradient-to-br from-teal-500 to-teal-700 ring-4 ring-teal-300'
                        : 'bg-gradient-to-br from-teal-400 to-teal-600 hover:scale-105'
                        }`}
                >
                    <div className="text-3xl font-bold">${totalElderFee}</div>
                    <div className="text-sm opacity-80">長者收費</div>
                </button>
                <button
                    onClick={() => setActiveView('driverSalary')}
                    className={`rounded-xl p-4 text-white text-left transition-all ${activeView === 'driverSalary'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-700 ring-4 ring-blue-300'
                        : 'bg-gradient-to-br from-blue-400 to-blue-600 hover:scale-105'
                        }`}
                >
                    <div className="text-3xl font-bold">${totalDriverSalary}</div>
                    <div className="text-sm opacity-80">駕駛薪資</div>
                </button>
                <button
                    onClick={() => setActiveView('lunchbox')}
                    className={`rounded-xl p-4 text-white text-left transition-all ${activeView === 'lunchbox'
                        ? 'bg-gradient-to-br from-orange-500 to-orange-700 ring-4 ring-orange-300'
                        : 'bg-gradient-to-br from-orange-400 to-orange-600 hover:scale-105'
                        }`}
                >
                    <div className="text-3xl font-bold">${lunchboxStats.totalCost}</div>
                    <div className="text-sm opacity-80">便當費</div>
                </button>
                <button
                    onClick={() => setActiveView('caregiver')}
                    className={`rounded-xl p-4 text-white text-left transition-all ${activeView === 'caregiver'
                        ? 'bg-gradient-to-br from-purple-500 to-purple-700 ring-4 ring-purple-300'
                        : 'bg-gradient-to-br from-purple-400 to-purple-600 hover:scale-105'
                        }`}
                >
                    <div className="text-3xl font-bold">{totals.caregiverAM + totals.caregiverPM}</div>
                    <div className="text-sm opacity-80">外勞接送</div>
                </button>
            </div>

            {/* 動態內容區 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-20">
                {/* 出席列表 */}
                {activeView === 'attendance' && (
                    <>
                        <div className="px-4 py-3 border-b bg-green-50">
                            <h2 className="font-semibold text-green-800">📋 每日出席紀錄</h2>
                        </div>
                        {records.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">本月尚無紀錄</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600">
                                            <th className="px-4 py-2 text-left">日期</th>
                                            <th className="px-4 py-2 text-center">出席</th>
                                            <th className="px-4 py-2 text-center">來程</th>
                                            <th className="px-4 py-2 text-center">回程</th>
                                            <th className="px-4 py-2 text-center">用餐</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {records.map((record, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium">
                                                    <Link href={`/${siteId}/quick?date=${record.date}`} className="text-blue-600 hover:text-blue-800 underline">
                                                        {record.date}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-2 text-center text-green-600 font-bold">{record.stats.attended}</td>
                                                <td className="px-4 py-2 text-center text-blue-600">{record.stats.pickupAM}</td>
                                                <td className="px-4 py-2 text-center text-purple-600">{record.stats.pickupPM}</td>
                                                <td className="px-4 py-2 text-center text-orange-600">{record.stats.mealFee}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* 長者收費明細 */}
                {activeView === 'elderFees' && (
                    <>
                        <div className="px-4 py-3 border-b bg-teal-50 flex justify-between items-center">
                            <h2 className="font-semibold text-teal-800">👴 長者收費明細</h2>
                            <button
                                onClick={exportElderFees}
                                className="px-3 py-1 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 transition"
                            >
                                ⬇️ 匯出 CSV
                            </button>
                        </div>
                        {elderSummaries.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <p>尚無長者收費資料</p>
                                <p className="text-xs mt-2">請先在快速登記頁面儲存出席紀錄</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 text-gray-600">
                                            <th className="px-4 py-2 text-left">姓名</th>
                                            <th className="px-4 py-2 text-center">車資</th>
                                            <th className="px-4 py-2 text-center">便當</th>
                                            <th className="px-4 py-2 text-center">自費</th>
                                            <th className="px-4 py-2 text-center">合計</th>
                                            <th className="px-4 py-2 text-center">明細</th>
                                            <th className="px-4 py-2 text-center">匯出</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {elderSummaries.map((elder, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 font-medium">{elder.name}</td>
                                                <td className="px-4 py-2 text-center text-blue-600">${elder.transportFee}</td>
                                                <td className="px-4 py-2 text-center text-orange-600">${elder.mealAmount}</td>
                                                <td className="px-4 py-2 text-center text-yellow-600">${elder.selfAmount}</td>
                                                <td className="px-4 py-2 text-center font-bold text-teal-600">${elder.total}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => setSelectedElder(elder.name)}
                                                        className="text-blue-500 hover:text-blue-700 underline text-xs"
                                                    >
                                                        查看
                                                    </button>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => exportSingleElder(elder.name)}
                                                        className="px-2 py-1 bg-teal-500 text-white text-xs rounded hover:bg-teal-600 transition"
                                                    >
                                                        ⬇️
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        <tr className="bg-teal-50 font-bold">
                                            <td className="px-4 py-2">總計</td>
                                            <td className="px-4 py-2 text-center text-blue-600">
                                                ${elderSummaries.reduce((s, e) => s + e.transportFee, 0)}
                                            </td>
                                            <td className="px-4 py-2 text-center text-orange-600">
                                                ${elderSummaries.reduce((s, e) => s + e.mealAmount, 0)}
                                            </td>
                                            <td className="px-4 py-2 text-center text-yellow-600">
                                                ${elderSummaries.reduce((s, e) => s + e.selfAmount, 0)}
                                            </td>
                                            <td className="px-4 py-2 text-center text-teal-700">${totalElderFee}</td>
                                            <td className="px-4 py-2"></td>
                                            <td className="px-4 py-2"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {/* 駕駛薪資 */}
                {activeView === 'driverSalary' && (
                    <>
                        <div className="px-4 py-3 border-b bg-blue-50 flex justify-between items-center">
                            <div>
                                <h2 className="font-semibold text-blue-800">🚗 駕駛薪資明細</h2>
                                <p className="text-sm text-gray-600">{selectedMonth.replace('-', '年')}月 | 長者每趟 $80、外籍每趟 $100</p>
                            </div>
                            <button
                                onClick={exportDriverSalary}
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
                            >
                                ⬇️ 匯出 CSV
                            </button>
                        </div>

                        {/* 月份總計摘要 */}
                        <div className="p-4 bg-blue-100">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-700">
                                    ${totalDriverSalary}
                                </div>
                                <div className="text-sm text-blue-600">
                                    本月駕駛薪資合計
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                    <div className="font-medium text-gray-700">長者接送</div>
                                    <div className="text-xl font-bold text-blue-600">{totals.pickupAM + totals.pickupPM} 趟</div>
                                    <div className="text-sm text-gray-500">${(totals.pickupAM + totals.pickupPM) * 80}</div>
                                </div>
                                <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                                    <div className="font-medium text-gray-700">外籍接送</div>
                                    <div className="text-xl font-bold text-purple-600">{totals.caregiverAM + totals.caregiverPM} 趟</div>
                                    <div className="text-sm text-gray-500">${(totals.caregiverAM + totals.caregiverPM) * 100}</div>
                                </div>
                            </div>
                        </div>

                        {/* 每日明細 - 文字格式 */}
                        <div className="p-4">
                            <h3 className="font-bold text-gray-700 mb-3">📅 每日明細</h3>
                            <div className="space-y-2">
                                {records.map((record, i) => {
                                    const dailySalary = record.fees?.driverSalary || 0;
                                    const dateStr = record.date.substring(5).replace('-', '/');
                                    const elderTrips = record.stats.pickupAM + record.stats.pickupPM;
                                    const caregiverTrips = record.stats.caregiverAM + record.stats.caregiverPM;

                                    const items = [];
                                    if (elderTrips > 0) {
                                        items.push(`長者 ${elderTrips}趟 $${elderTrips * 80}`);
                                    }
                                    if (caregiverTrips > 0) {
                                        items.push(`外籍 ${caregiverTrips}趟 $${caregiverTrips * 100}`);
                                    }

                                    return (
                                        <div key={i} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-gray-600">{dateStr}</span>
                                                <span className="text-gray-700">{items.join(' + ')}</span>
                                            </div>
                                            <span className="font-bold text-blue-600">= ${dailySalary}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* 便當費用 */}
                {activeView === 'lunchbox' && (
                    <>
                        <div className="px-4 py-3 border-b bg-orange-50 flex justify-between items-center">
                            <div>
                                <h2 className="font-semibold text-orange-800">🍱 便當費用明細</h2>
                                <p className="text-sm text-gray-600">{selectedMonth.replace('-', '年')}月 | 每個便當 $70</p>
                            </div>
                            <button
                                onClick={exportLunchbox}
                                className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition"
                            >
                                ⬇️ 匯出 CSV
                            </button>
                        </div>

                        {/* 月份總計摘要 */}
                        <div className="p-4 bg-orange-100">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-orange-700">
                                    {lunchboxStats.totalLunchboxes} 個
                                </div>
                                <div className="text-lg text-orange-600">
                                    共 ${lunchboxStats.totalCost}
                                </div>
                            </div>

                            {/* 店家分類 */}
                            {lunchboxStats.stores.length > 0 && (
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    {lunchboxStats.stores.map((store, i) => (
                                        <div key={i} className="bg-white rounded-lg p-3 text-center shadow-sm">
                                            <div className="font-medium text-gray-700">{store.name}</div>
                                            <div className="text-xl font-bold text-orange-600">{store.count} 個</div>
                                            <div className="text-sm text-gray-500">${store.count * FEE_RATES.LUNCHBOX_COST}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 每日明細 - 文字格式 */}
                        <div className="p-4">
                            <h3 className="font-bold text-gray-700 mb-3">📅 每日明細</h3>
                            <div className="space-y-2">
                                {records.map((record, i) => {
                                    const totalBoxes = record.lunchStores?.reduce((s, x) => s + x.count, 0) || 0;
                                    const dateStr = record.date.substring(5).replace('-', '/');
                                    const storeDetails = record.lunchStores?.filter(s => s.count > 0)
                                        .map(s => `${s.name} ${s.count}個`)
                                        .join('、') || '';

                                    return (
                                        <div key={i} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-gray-600">{dateStr}</span>
                                                <span className="text-gray-700">
                                                    便當 {totalBoxes} 個
                                                    {storeDetails && <span className="text-gray-500 text-sm ml-1">({storeDetails})</span>}
                                                </span>
                                            </div>
                                            <span className="font-bold text-orange-600">
                                                ${totalBoxes * FEE_RATES.LUNCHBOX_COST}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}

                {/* 外勞明細 */}
                {activeView === 'caregiver' && (
                    <>
                        <div className="px-4 py-3 border-b bg-purple-50">
                            <h2 className="font-semibold text-purple-800">👷 外勞接送明細</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600">
                                        <th className="px-4 py-2 text-left">日期</th>
                                        <th className="px-4 py-2 text-center">來程</th>
                                        <th className="px-4 py-2 text-center">回程</th>
                                        <th className="px-4 py-2 text-center">用餐</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {records.map((record, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 font-medium">
                                                <Link href={`/${siteId}/quick?date=${record.date}`} className="text-blue-600 hover:text-blue-800 underline">
                                                    {record.date}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-2 text-center text-purple-600">{record.stats.caregiverAM}</td>
                                            <td className="px-4 py-2 text-center text-pink-600">{record.stats.caregiverPM}</td>
                                            <td className="px-4 py-2 text-center text-amber-700">{record.stats.caregiverMeal}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {/* 長者明細 Modal */}
            {selectedElder && (() => {
                const elderRecords = getElderRecords(selectedElder);
                const totals = elderRecords.reduce((acc, r) => ({
                    transportFee: acc.transportFee + r.transportFee,
                    mealAmount: acc.mealAmount + r.mealAmount,
                    selfAmount: acc.selfAmount + r.selfAmount,
                    total: acc.total + r.total,
                }), { transportFee: 0, mealAmount: 0, selfAmount: 0, total: 0 });

                const getTransportDesc = (am: boolean, pm: boolean) => {
                    if (am && pm) return '來回';
                    if (am) return '來程';
                    if (pm) return '回程';
                    return '-';
                };

                return (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[80vh] overflow-auto">
                            <div className="bg-teal-500 text-white px-4 py-3 rounded-t-xl flex justify-between items-center sticky top-0">
                                <div>
                                    <h3 className="font-semibold">👴 {selectedElder}</h3>
                                    <p className="text-sm opacity-80">{selectedMonth.replace('-', '年')}月 收費明細</p>
                                </div>
                                <button className="text-white/80 hover:text-white text-xl" onClick={() => setSelectedElder(null)}>
                                    ✕
                                </button>
                            </div>
                            <div className="p-4">
                                {/* 明細列表 - 文字格式 */}
                                <div className="space-y-2 mb-4">
                                    {elderRecords.map((r, i) => {
                                        const dateStr = r.date.substring(5).replace('-', '/');
                                        const items = [];
                                        if (r.pickupAM || r.pickupPM) {
                                            items.push(`${getTransportDesc(r.pickupAM, r.pickupPM)} $${r.transportFee}`);
                                        }
                                        if (r.mealFee) {
                                            items.push(`用餐 $${r.mealAmount}`);
                                        }
                                        if (r.selfAM || r.selfPM) {
                                            items.push(`自費 $${r.selfAmount}`);
                                        }

                                        return (
                                            <div key={i} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <span className="font-mono text-gray-600">{dateStr}</span>
                                                    <span className="text-gray-700">{items.join(' + ')}</span>
                                                </div>
                                                <span className="font-bold text-teal-600">= ${r.total}</span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* 月份合計 */}
                                <div className="bg-teal-50 rounded-lg p-4">
                                    <div className="text-center mb-3">
                                        <span className="text-lg font-bold text-teal-800">
                                            {selectedMonth.replace('-', '年')}月 總計
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div>
                                            <div className="text-xl font-bold text-blue-600">${totals.transportFee}</div>
                                            <div className="text-xs text-gray-600">車資</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-orange-600">${totals.mealAmount}</div>
                                            <div className="text-xs text-gray-600">餐費</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-yellow-600">${totals.selfAmount}</div>
                                            <div className="text-xs text-gray-600">自費</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-teal-700">${totals.total}</div>
                                            <div className="text-xs text-gray-600">應收合計</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* 底部按鈕 */}
            <div className="fixed bottom-16 left-0 right-0 p-3 bg-white shadow-lg z-40">
                <Link
                    href={`/${siteId}`}
                    className="block w-full py-4 bg-gray-400 text-white text-center rounded-xl font-bold hover:bg-gray-500 transition"
                >
                    ← 返回儀表板
                </Link>
            </div>
        </div>
    );
}

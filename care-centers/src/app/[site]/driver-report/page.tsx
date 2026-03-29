'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface DailyRecord {
    date: string;
    pickupCount: number;
    amount: number;
    elders: string[];
}

interface DriverReportData {
    success: boolean;
    siteId: string;
    month: string;
    driverRate: number;
    days: DailyRecord[];
    total: number;
    totalAmount: number;
}

// 羅東保底規則
const LUODONG_GUARANTEE = {
    minDaily: 1800,        // 每日保底
    threshold: 20,         // 保底人次上限
    extraRate: 90,         // 超過人次加收
};

function calcDailyAmount(pickupCount: number, driverRate: number, siteId: string): number {
    if (siteId === 'luodong') {
        if (pickupCount === 0) return 0;
        if (pickupCount <= LUODONG_GUARANTEE.threshold) {
            return LUODONG_GUARANTEE.minDaily;
        }
        return LUODONG_GUARANTEE.minDaily + (pickupCount - LUODONG_GUARANTEE.threshold) * LUODONG_GUARANTEE.extraRate;
    }
    return pickupCount * driverRate;
}

export default function DriverReportPage() {
    const params = useParams();
    const siteId = params.site as string;

    const [month, setMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [report, setReport] = useState<DriverReportData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const siteNames: Record<string, string> = {
        sanxing: '三星據點',
        lifeng: '頭城據點',
    };

    const loadReport = async () => {
        setIsLoading(true);
        setError('');
        try {
            const queryString = new URLSearchParams({ action: 'getDriverReport', siteId, month }).toString();
            const url = `/api/gas?${queryString}`;
            const response = await fetch(url, { credentials: 'include' });
            const data = await response.json();

            if (data.success) {
                setReport(data);
            } else {
                setError(data.message || '載入失敗');
            }
        } catch (err) {
            console.error('載入報表失敗:', err);
            setError('載入報表失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadReport();
    }, [month, siteId]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        return {
            display: `${dateStr.substring(5)}`,
            dayOfWeek: days[date.getDay()]
        };
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm print:hidden">
                <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <Link href={`/${siteId}`} className="text-gray-500 hover:text-gray-700 text-sm">
                            ← 返回
                        </Link>
                        <h1 className="text-base sm:text-xl font-bold text-gray-800">🚗 司機對帳報表</h1>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
                    >
                        🖨️ 列印
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* 月份選擇器 */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 print:hidden">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        <label className="font-medium text-gray-700 text-sm whitespace-nowrap">選擇月份：</label>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex-1 sm:flex-none"
                            />
                            <button
                                onClick={loadReport}
                                className="bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-600 transition text-sm whitespace-nowrap"
                            >
                                🔄 重新載入
                            </button>
                        </div>
                    </div>
                </div>

                {/* 報表內容 */}
                <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 print:shadow-none">
                    {/* 報表標題 */}
                    <div className="text-center mb-6 border-b pb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                            {siteNames[siteId] || siteId} - 司機載客對帳表
                        </h2>
                        <p className="text-base sm:text-lg text-gray-600 mt-1">
                            {month.replace('-', '年')}月
                        </p>
                        {report && (
                            <p className="text-sm text-gray-500 mt-2">
                                費率：每人次 ${report.driverRate}
                            </p>
                        )}
                    </div>

                    {/* 載入中 */}
                    {isLoading && (
                        <div className="text-center py-10">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto"></div>
                            <p className="text-gray-500 mt-4">載入中...</p>
                        </div>
                    )}

                    {/* 錯誤訊息 */}
                    {error && (
                        <div className="text-center py-10">
                            <p className="text-red-500">{error}</p>
                        </div>
                    )}

                    {/* 無資料 */}
                    {!isLoading && !error && report && report.days.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-gray-500">本月尚無載客紀錄</p>
                            <p className="text-sm text-gray-400 mt-2">
                                請先透過「快速登記」功能登記每日出席
                            </p>
                        </div>
                    )}

                    {/* 明細表格 */}
                    {!isLoading && !error && report && report.days.length > 0 && (() => {
                        const isLuodong = siteId === 'luodong';
                        const recalcDays = report.days.map(day => ({
                            ...day,
                            calcAmount: calcDailyAmount(day.pickupCount, report.driverRate, siteId),
                        }));
                        const recalcTotal = recalcDays.reduce((s, d) => s + d.calcAmount, 0);
                        const recalcTotalTrips = recalcDays.reduce((s, d) => s + d.pickupCount, 0);

                        return (
                        <>
                            {/* 羅東保底規則說明 */}
                            {isLuodong && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 mb-4 text-sm">
                                    <p className="font-bold text-amber-800 mb-1">📌 羅東據點司機薪資規則</p>
                                    <ul className="list-disc list-inside text-amber-700 space-y-0.5 text-xs sm:text-sm">
                                        <li>每日保底 ${LUODONG_GUARANTEE.minDaily.toLocaleString()}（≤ {LUODONG_GUARANTEE.threshold} 人次，含照服員）</li>
                                        <li>超過 {LUODONG_GUARANTEE.threshold} 人次：每人加收 ${LUODONG_GUARANTEE.extraRate}</li>
                                        <li>無載客日不計薪</li>
                                    </ul>
                                </div>
                            )}

                            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                            <table className="w-full border-collapse mb-6 min-w-[500px]">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-300 px-3 py-2 text-left">日期</th>
                                        <th className="border border-gray-300 px-3 py-2 text-center">星期</th>
                                        <th className="border border-gray-300 px-3 py-2 text-center">載客人數</th>
                                        <th className="border border-gray-300 px-3 py-2 text-right">
                                            {isLuodong ? '計算方式' : '單價'}
                                        </th>
                                        <th className="border border-gray-300 px-3 py-2 text-right">金額</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recalcDays.map((day) => {
                                        const { display, dayOfWeek } = formatDate(day.date);
                                        const overThreshold = isLuodong && day.pickupCount > LUODONG_GUARANTEE.threshold;
                                        return (
                                            <tr key={day.date} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-3 py-2">{display}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center">{dayOfWeek}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                                                    {day.pickupCount} 人
                                                    {overThreshold && (
                                                        <span className="text-red-500 text-xs ml-1">
                                                            (+{day.pickupCount - LUODONG_GUARANTEE.threshold})
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2 text-right text-sm">
                                                    {isLuodong ? (
                                                        day.pickupCount === 0 ? (
                                                            <span className="text-gray-400">-</span>
                                                        ) : overThreshold ? (
                                                            <span className="text-xs">
                                                                ${LUODONG_GUARANTEE.minDaily} + {day.pickupCount - LUODONG_GUARANTEE.threshold}×${LUODONG_GUARANTEE.extraRate}
                                                            </span>
                                                        ) : (
                                                            <span>保底 ${LUODONG_GUARANTEE.minDaily}</span>
                                                        )
                                                    ) : (
                                                        <span>${report.driverRate}</span>
                                                    )}
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2 text-right font-medium">
                                                    ${day.calcAmount.toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-blue-50 font-bold">
                                        <td colSpan={2} className="border border-gray-300 px-3 py-3 text-center">
                                            本月合計
                                        </td>
                                        <td className="border border-gray-300 px-3 py-3 text-center text-blue-600">
                                            {recalcTotalTrips} 人次
                                        </td>
                                        <td className="border border-gray-300 px-3 py-3">
                                            {isLuodong && (
                                                <span className="text-xs text-gray-500">共 {recalcDays.filter(d => d.pickupCount > 0).length} 天出車</span>
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-3 text-right text-blue-600 text-lg">
                                            ${recalcTotal.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                            </div>

                            {/* 簽名區 */}
                            <div className="mt-8 pt-6 border-t border-dashed">
                                <div className="grid grid-cols-2 gap-4 sm:gap-8">
                                    <div>
                                        <p className="text-gray-600 mb-2 text-sm sm:text-base">司機確認簽名：</p>
                                        <div className="border-b border-gray-400 h-10"></div>
                                        <p className="text-xs sm:text-sm text-gray-400 mt-1">日期：＿＿＿年＿＿月＿＿日</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-600 mb-2 text-sm sm:text-base">據點確認簽名：</p>
                                        <div className="border-b border-gray-400 h-10"></div>
                                        <p className="text-xs sm:text-sm text-gray-400 mt-1">日期：＿＿＿年＿＿月＿＿日</p>
                                    </div>
                                </div>
                            </div>
                        </>
                        );
                    })()}
                </div>

                {/* 使用說明 */}
                <div className="mt-6 bg-blue-50 rounded-xl p-4 text-sm text-blue-700 print:hidden">
                    <p className="font-medium mb-2">💡 使用說明</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>此報表自動從「快速登記」資料計算每日載客人數</li>
                        <li>載客人數 = 當日有勾選「早上搭車」或「下午搭車」的長者數量</li>
                        <li>可列印後由雙方簽名確認</li>
                        <li>建議每週核對一次，避免月底爭議</li>
                    </ul>
                </div>
            </div>

            {/* 列印樣式 */}
            <style jsx global>{`
                @media print {
                    body { background: white !important; }
                    .print\\:hidden { display: none !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
}

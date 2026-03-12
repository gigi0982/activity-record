'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { elderApi, expenseApi } from '@/lib/api';

interface ElderFee {
    name: string;
    identityType: string;
    mealCount: number;
    mealFee: number;
    tripCount: number;
    transportFee: number;
    selfFee: number;
    total: number;
}

type TabType = 'lunch' | 'driver' | 'assistant' | 'petty' | 'elder';

export default function ExpenseEntryPage() {
    const params = useParams();
    const siteId = params.site as string;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentMonth = today.toISOString().slice(0, 7);

    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [activeTab, setActiveTab] = useState<TabType>('lunch');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // 便當店家
    const [storeA, setStoreA] = useState({ name: '便當店 A', count: 0 });
    const [storeB, setStoreB] = useState({ name: '便當店 B', count: 0 });
    const lunchPrice = 70;

    // 駕駛薪資
    const [driverTrips, setDriverTrips] = useState(0);
    const driverRate = 80;

    // 助理工時
    const [assistantHours, setAssistantHours] = useState(0);
    const assistantRate = 176;

    // 零用金
    const [pettyCashList, setPettyCashList] = useState<{ item: string; amount: number }[]>([]);

    // 長者收費明細
    const [elderFees, setElderFees] = useState<ElderFee[]>([]);

    useEffect(() => {
        loadData(selectedDate);
    }, [selectedDate]);

    const loadData = async (dateStr: string) => {
        setIsLoading(true);
        // 重置狀態
        setStoreA({ name: '便當店 A', count: 0 });
        setStoreB({ name: '便當店 B', count: 0 });
        setDriverTrips(0);
        setAssistantHours(0);
        setPettyCashList([]);
        setElderFees([]);

        try {
            // 優先從 Google Sheets API 載入
            const apiResult = await expenseApi.get(siteId, dateStr);
            if (apiResult.success && apiResult.data) {
                const data = apiResult.data;
                if (data.lunch) {
                    setStoreA(data.lunch.storeA || { name: '便當店 A', count: 0 });
                    setStoreB(data.lunch.storeB || { name: '便當店 B', count: 0 });
                }
                if (data.driver) setDriverTrips(data.driver.trips || 0);
                if (data.assistant) setAssistantHours(data.assistant.hours || 0);
                if (data.petty) setPettyCashList(data.petty.items || []);
            } else {
                // 備用：從 localStorage 載入
                const expenseData = localStorage.getItem(`expense_${dateStr}`);
                if (expenseData) {
                    const data = JSON.parse(expenseData);
                    if (data.lunch) {
                        setStoreA(data.lunch.storeA || { name: '便當店 A', count: 0 });
                        setStoreB(data.lunch.storeB || { name: '便當店 B', count: 0 });
                    }
                    if (data.driver) setDriverTrips(data.driver.trips || 0);
                    if (data.assistant) setAssistantHours(data.assistant.hours || 0);
                    if (data.petty) setPettyCashList(data.petty.items || []);
                    if (data.elderFees) setElderFees(data.elderFees);
                } else {
                    // 從快速登記資料載入
                    const quickData = localStorage.getItem(`fee_record_${dateStr}`);
                    if (quickData) {
                        const data = JSON.parse(quickData);
                        if (data.stats) {
                            setDriverTrips(data.stats.pickupAM + data.stats.pickupPM);
                        }
                        if (data.elderDetails) {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            setElderFees(data.elderDetails.map((e: any) => ({
                                name: e.name,
                                identityType: e.identityType || 'normal',
                                mealCount: e.mealFee ? 1 : 0,
                                mealFee: e.mealAmount || e.mealFee || 0,
                                tripCount: (e.pickupAM ? 1 : 0) + (e.pickupPM ? 1 : 0),
                                transportFee: e.transportFee || 0,
                                selfFee: e.selfAmount || e.selfFee || 0,
                                total: e.total || 0,
                            })));
                        }
                        if (data.lunchStores) {
                            if (data.lunchStores[0]) setStoreA({ name: data.lunchStores[0].name, count: data.lunchStores[0].count });
                            if (data.lunchStores[1]) setStoreB({ name: data.lunchStores[1].name, count: data.lunchStores[1].count });
                        }
                    }
                }
            }
        } catch (err) {
            console.error('載入失敗:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // 計算總計
    const lunchTotal = (storeA.count + storeB.count) * lunchPrice;
    const driverTotal = driverTrips * driverRate;
    const assistantTotal = assistantHours * assistantRate;
    const pettyTotal = pettyCashList.reduce((sum, p) => sum + (p.amount || 0), 0);
    const elderTotal = elderFees.reduce((sum, e) => sum + e.total, 0);

    const grandTotal = lunchTotal + driverTotal + assistantTotal + pettyTotal;

    const addPettyCash = () => {
        setPettyCashList(prev => [...prev, { item: '', amount: 0 }]);
    };

    const removePettyCash = (index: number) => {
        setPettyCashList(prev => prev.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        setIsSaving(true);
        const expenseData = {
            date: selectedDate,
            siteId: siteId,
            lunch: { storeA, storeB, total: lunchTotal },
            driver: { trips: driverTrips, total: driverTotal },
            assistant: { hours: assistantHours, total: assistantTotal },
            petty: { items: pettyCashList, total: pettyTotal },
            grandTotal,
        };

        // 同時儲存到 Google Sheets API 和 localStorage
        try {
            await expenseApi.save(expenseData);
        } catch (err) {
            console.error('儲存到 API 失敗:', err);
        }
        localStorage.setItem(`expense_${selectedDate}`, JSON.stringify(expenseData));

        setShowSuccess(true);
        setIsSaving(false);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const tabs = [
        { id: 'lunch' as TabType, label: '便當', icon: '🍱', amount: lunchTotal },
        { id: 'driver' as TabType, label: '駕駛薪資', icon: '🚐', amount: driverTotal },
        { id: 'assistant' as TabType, label: '助理工時', icon: '⏰', amount: assistantTotal },
        { id: 'petty' as TabType, label: '零用金', icon: '💵', amount: pettyTotal },
        { id: 'elder' as TabType, label: '長者收費', icon: '👴', amount: elderTotal },
    ];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-500">載入中...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-24">
            {/* 成功訊息 */}
            {showSuccess && (
                <div className="fixed top-0 left-0 right-0 bg-green-500 text-white p-4 text-center z-50 shadow-lg">
                    ✅ 支出紀錄已儲存！
                </div>
            )}

            {/* 標題區 */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-b-2xl shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            💼 支出登記
                        </h1>
                        <p className="text-blue-200 text-sm mt-1">便當、駕駛薪資、工時、零用金</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-white/20 px-3 py-1.5 rounded-lg text-sm text-white border-none cursor-pointer"
                            style={{ colorScheme: 'dark' }}
                        />
                        <Link
                            href={`/${siteId}`}
                            className="bg-white/20 px-3 py-1.5 rounded-lg text-sm hover:bg-white/30"
                        >
                            ← 返回首頁
                        </Link>
                    </div>
                </div>
            </div>

            {/* 分頁標籤 */}
            <div className="flex overflow-x-auto gap-2 p-4 bg-gray-50 -mx-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-blue-600 text-white shadow-lg'
                            : 'bg-white text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        <span>{tab.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100'
                            }`}>
                            ${tab.amount}
                        </span>
                    </button>
                ))}
            </div>

            {/* 內容區 */}
            <div className="p-4">
                {/* 便當 */}
                {activeTab === 'lunch' && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 fade-in">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            🍱 便當訂購
                        </h2>
                        <div className="bg-blue-50 p-4 rounded-xl mb-4">
                            <div className="text-sm text-blue-700">
                                💡 收費標準：每個便當 ${lunchPrice}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <input
                                    type="text"
                                    value={storeA.name}
                                    onChange={(e) => setStoreA({ ...storeA, name: e.target.value })}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                                    placeholder="店家名稱"
                                />
                                <input
                                    type="number"
                                    value={storeA.count || ''}
                                    onChange={(e) => setStoreA({ ...storeA, count: parseInt(e.target.value) || 0 })}
                                    className="w-24 px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-xl font-bold"
                                    min={0}
                                />
                                <span className="text-gray-500">個</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="text"
                                    value={storeB.name}
                                    onChange={(e) => setStoreB({ ...storeB, name: e.target.value })}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                                    placeholder="店家名稱"
                                />
                                <input
                                    type="number"
                                    value={storeB.count || ''}
                                    onChange={(e) => setStoreB({ ...storeB, count: parseInt(e.target.value) || 0 })}
                                    className="w-24 px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-xl font-bold"
                                    min={0}
                                />
                                <span className="text-gray-500">個</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t flex justify-between items-center">
                            <span className="text-gray-600">合計</span>
                            <span className="text-2xl font-bold text-blue-600">
                                {storeA.count + storeB.count} 個 = ${lunchTotal}
                            </span>
                        </div>
                    </div>
                )}

                {/* 駕駛薪資 */}
                {activeTab === 'driver' && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 fade-in">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            🚐 駕駛薪資
                        </h2>
                        <div className="bg-orange-50 p-4 rounded-xl mb-4">
                            <div className="text-sm text-orange-700">
                                💡 每趟 ${driverRate}（從快速登記自動計算）
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="text-gray-600">趟數</label>
                            <input
                                type="number"
                                value={driverTrips || ''}
                                onChange={(e) => setDriverTrips(parseInt(e.target.value) || 0)}
                                className="w-32 px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-xl font-bold"
                                min={0}
                            />
                            <span className="text-gray-500">趟</span>
                        </div>

                        <div className="mt-6 pt-4 border-t flex justify-between items-center">
                            <span className="text-gray-600">合計</span>
                            <span className="text-2xl font-bold text-orange-600">${driverTotal}</span>
                        </div>
                    </div>
                )}

                {/* 助理工時 */}
                {activeTab === 'assistant' && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 fade-in">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            ⏰ 助理工時
                        </h2>
                        <div className="bg-teal-50 p-4 rounded-xl mb-4">
                            <div className="text-sm text-teal-700">
                                💡 時薪 ${assistantRate}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <label className="text-gray-600">工時</label>
                            <input
                                type="number"
                                value={assistantHours || ''}
                                onChange={(e) => setAssistantHours(parseFloat(e.target.value) || 0)}
                                className="w-32 px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-xl font-bold"
                                min={0}
                                step={0.5}
                            />
                            <span className="text-gray-500">小時</span>
                        </div>

                        <div className="mt-6 pt-4 border-t flex justify-between items-center">
                            <span className="text-gray-600">合計</span>
                            <span className="text-2xl font-bold text-teal-600">${assistantTotal}</span>
                        </div>
                    </div>
                )}

                {/* 零用金 */}
                {activeTab === 'petty' && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 fade-in">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            💵 零用金支出
                        </h2>

                        <div className="space-y-3 mb-4">
                            {pettyCashList.map((item, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <input
                                        type="text"
                                        value={item.item}
                                        onChange={(e) => {
                                            const newList = [...pettyCashList];
                                            newList[index].item = e.target.value;
                                            setPettyCashList(newList);
                                        }}
                                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl"
                                        placeholder="支出項目"
                                    />
                                    <input
                                        type="number"
                                        value={item.amount || ''}
                                        onChange={(e) => {
                                            const newList = [...pettyCashList];
                                            newList[index].amount = parseInt(e.target.value) || 0;
                                            setPettyCashList(newList);
                                        }}
                                        className="w-28 px-4 py-3 border-2 border-gray-200 rounded-xl text-center"
                                        placeholder="金額"
                                    />
                                    <button
                                        onClick={() => removePettyCash(index)}
                                        className="w-10 h-10 bg-red-100 text-red-500 rounded-xl hover:bg-red-200"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={addPettyCash}
                            className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-gray-400 hover:text-gray-600"
                        >
                            ＋ 新增支出項目
                        </button>

                        <div className="mt-6 pt-4 border-t flex justify-between items-center">
                            <span className="text-gray-600">合計</span>
                            <span className="text-2xl font-bold text-purple-600">${pettyTotal}</span>
                        </div>
                    </div>
                )}

                {/* 長者收費明細 */}
                {activeTab === 'elder' && (
                    <div className="bg-white rounded-2xl shadow-sm p-6 fade-in">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            👴 長者收費明細
                        </h2>
                        <div className="bg-blue-50 p-4 rounded-xl mb-4">
                            <div className="text-sm text-blue-700">
                                💡 收費標準：<br />
                                餐費：$40/餐<br />
                                車資：一般戶 $18 / 中低收 $5 / 低收 $0
                            </div>
                        </div>

                        {elderFees.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                                本月尚無長者出席紀錄（請先在「今日快速登記」登記）
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left p-3">姓名</th>
                                            <th className="text-center p-3">餐費</th>
                                            <th className="text-center p-3">車資</th>
                                            <th className="text-center p-3">自費</th>
                                            <th className="text-right p-3">合計</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {elderFees.filter(e => e.total > 0).map((elder, index) => (
                                            <tr key={index} className="border-b border-gray-100">
                                                <td className="p-3 font-medium">{elder.name}</td>
                                                <td className="p-3 text-center text-orange-600">
                                                    {elder.mealFee > 0 ? `$${elder.mealFee}` : '-'}
                                                </td>
                                                <td className="p-3 text-center text-blue-600">
                                                    {elder.transportFee > 0 ? `$${elder.transportFee}` : '-'}
                                                </td>
                                                <td className="p-3 text-center text-purple-600">
                                                    {elder.selfFee > 0 ? `$${elder.selfFee}` : '-'}
                                                </td>
                                                <td className="p-3 text-right font-bold">${elder.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold">
                                        <tr>
                                            <td className="p-3">合計</td>
                                            <td className="p-3 text-center text-orange-600">
                                                ${elderFees.reduce((sum, e) => sum + e.mealFee, 0)}
                                            </td>
                                            <td className="p-3 text-center text-blue-600">
                                                ${elderFees.reduce((sum, e) => sum + e.transportFee, 0)}
                                            </td>
                                            <td className="p-3 text-center text-purple-600">
                                                ${elderFees.reduce((sum, e) => sum + e.selfFee, 0)}
                                            </td>
                                            <td className="p-3 text-right text-green-600">${elderTotal}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 月份總計 */}
            <div className="mx-4 p-4 bg-white rounded-2xl shadow-sm mb-4">
                <h3 className="font-bold text-center mb-4">📊 {currentMonth} 月份支出總計</h3>
                <div className="grid grid-cols-5 gap-2 text-center">
                    <div>
                        <div className="text-xl font-bold text-blue-600">${lunchTotal}</div>
                        <div className="text-xs text-gray-500">便當</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-orange-600">${driverTotal}</div>
                        <div className="text-xs text-gray-500">駕駛薪資</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-teal-600">${assistantTotal}</div>
                        <div className="text-xs text-gray-500">助理工時</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-purple-600">${pettyTotal}</div>
                        <div className="text-xs text-gray-500">零用金</div>
                    </div>
                    <div>
                        <div className="text-xl font-bold text-red-600">${grandTotal}</div>
                        <div className="text-xs text-gray-500">合計</div>
                    </div>
                </div>
            </div>

            {/* 底部按鈕 */}
            <div className="fixed bottom-16 left-0 right-0 p-3 bg-white shadow-lg flex gap-3 z-40">
                <Link
                    href={`/${siteId}`}
                    className="flex-1 py-4 bg-gray-400 text-white text-center rounded-xl font-bold hover:bg-gray-500 transition"
                >
                    ← 返回首頁
                </Link>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-[2] py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl text-lg font-bold transition disabled:opacity-50"
                >
                    {isSaving ? '儲存中...' : '💾 儲存支出紀錄'}
                </button>
            </div>
        </div>
    );
}

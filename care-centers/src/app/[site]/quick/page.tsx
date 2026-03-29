'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { elderApi, quickEntryApi, settingsApi, Elder, api } from '@/lib/api';
import { getIdentityInfo } from '@/lib/utils';

interface ElderWithStatus extends Elder {
    attendedAM: boolean;  // 上午出席
    attendedPM: boolean;  // 下午出席
    pickupAM: boolean;
    pickupPM: boolean;
    mealFee: boolean;
    caregiverAM: boolean;
    caregiverPM: boolean;
    caregiverMeal: boolean;
    selfAM: boolean;
    selfPM: boolean;
    virtual: boolean;     // 虛報（有刷卡但沒來上課）
}

interface LunchStore {
    name: string;
    count: number;
}

// 預設費率設定（會被 API 載入的設定覆蓋）
const DEFAULT_FEE_RATES = {
    DRIVER_PER_TRIP: 115,      // 駕駛薪資（每人次）
    DRIVER_MIN_DAILY: 0,       // 駕駛每日保底（0=無保底）
    ELDER_MEAL: 40,            // 長者餐費
    LUNCHBOX_COST: 70,         // 便當成本
    CAREGIVER_MEAL: 70,        // 外籍餐費
    CAREGIVER_TRANSPORT: 100,  // 外籍坐車
    CAREGIVER_DRIVER: 100,     // 外籍駕駛薪資
    SELF_FUNDED_FEE: 200,      // 自費長者費用
    TRANSPORT_NORMAL: 18,      // 一般長者車資
    TRANSPORT_FOREIGN: 115,    // 外籍配偶車資
};

function CheckBox({ checked, onChange, disabled, color }: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    color: string;
}) {
    return (
        <div
            onClick={!disabled ? onChange : undefined}
            className={`w-8 h-8 rounded-md flex items-center justify-center cursor-pointer transition-all
        ${disabled ? 'opacity-20 cursor-not-allowed' : 'hover:scale-105'}`}
            style={{
                border: disabled ? '2px solid #eee' : `2px solid ${color}`,
                backgroundColor: checked ? color : 'white',
            }}
        >
            {checked && <span className="text-white text-lg font-bold">✓</span>}
        </div>
    );
}

// 折疊區塊組件
function CollapsibleSection({
    title,
    icon,
    isOpen,
    onToggle,
    badge,
    color = 'gray',
    children
}: {
    title: string;
    icon: string;
    isOpen: boolean;
    onToggle: () => void;
    badge?: React.ReactNode;
    color?: string;
    children: React.ReactNode;
}) {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
        green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
        orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
        purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
        gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
    };
    const c = colors[color] || colors.gray;

    return (
        <div className={`mb-4 border-2 ${c.border} rounded-xl overflow-hidden`}>
            <button
                onClick={onToggle}
                className={`w-full px-4 py-3 ${c.bg} flex items-center justify-between transition-all`}
            >
                <div className="flex items-center gap-2">
                    <span className="text-xl">{icon}</span>
                    <span className={`font-bold ${c.text}`}>{title}</span>
                    {badge}
                </div>
                <span className={`text-xl transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                </span>
            </button>
            <div className={`transition-all duration-300 ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                {children}
            </div>
        </div>
    );
}

export default function QuickEntryPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const siteId = params.site as string;

    const today = new Date();
    const dateParam = searchParams.get('date');
    const todayStr = dateParam || today.toISOString().split('T')[0];
    const selectedDate = new Date(todayStr + 'T00:00:00');
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const isAM = dateParam ? true : today.getHours() < 12;
    const isViewingPast = dateParam && dateParam !== today.toISOString().split('T')[0];

    const [elders, setElders] = useState<ElderWithStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // 月額度追蹤
    const [quotaUsage, setQuotaUsage] = useState<Record<string, { totalUsed: number; quota: number; remaining: number; percentage: number; tripCount?: number; maxTrips?: number; remainingTrips?: number; overQuotaTrips?: number; overQuotaAmount?: number; isOverQuota?: boolean }>>({});

    // 動態費率設定（從費用設定頁面載入）
    const [feeRates, setFeeRates] = useState(DEFAULT_FEE_RATES);

    // 便當店
    const [lunchStores, setLunchStores] = useState<LunchStore[]>([
        { name: '便當店A', count: 0 },
        { name: '便當店B', count: 0 },
    ]);

    // 折疊區塊狀態
    const [sections, setSections] = useState({
        elderList: true,   // 長者名單預設展開
        lunchbox: false,   // 便當登記預設收起
        fees: false,       // 費用計算預設收起
    });

    const toggleSection = (key: keyof typeof sections) => {
        setSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // 載入長者列表
            const elderList = await elderApi.getElders();
            const lastRecord = typeof window !== 'undefined'
                ? localStorage.getItem('last_attendance')
                : null;
            const lastAttendees: string[] = lastRecord ? JSON.parse(lastRecord) : [];

            const initialElders = elderList.map(e => ({
                ...e,
                attendedAM: false,
                attendedPM: false,
                pickupAM: false,
                pickupPM: false,
                mealFee: false,
                caregiverAM: false,
                caregiverPM: false,
                caregiverMeal: false,
                selfAM: false,
                selfPM: false,
                virtual: false,
            }));

            // 載入今天的既有記錄，自動帶入勾選
            try {
                const existingRecords = await quickEntryApi.getQuickEntry(siteId as string, todayStr);
                if (existingRecords && existingRecords.length > 0) {
                    existingRecords.forEach(record => {
                        const elder = initialElders.find(e => e.name === record.elderName);
                        if (elder) {
                            elder.attendedAM = elder.attendedAM || record.presentAM;
                            elder.attendedPM = elder.attendedPM || record.presentPM;
                            elder.pickupAM = elder.pickupAM || record.pickUp;
                            elder.pickupPM = elder.pickupPM || record.dropOff;
                            elder.mealFee = elder.mealFee || record.meal;
                            elder.selfAM = elder.selfAM || record.selfPay;
                            elder.virtual = elder.virtual || (record.virtual ?? false);
                        }
                    });
                }
            } catch (quickErr) {
                console.log('載入既有記錄失敗:', quickErr);
            }

            setElders(initialElders);

            // 載入費用設定
            try {
                const settings = await settingsApi.getSettings(siteId);
                if (settings && settings.mealPrice) {
                    setFeeRates(prev => ({
                        ...prev,
                        ELDER_MEAL: settings.mealPrice || prev.ELDER_MEAL,
                        TRANSPORT_NORMAL: settings.transportNormal || prev.TRANSPORT_NORMAL,
                        TRANSPORT_FOREIGN: settings.transportForeign || prev.TRANSPORT_FOREIGN,
                        DRIVER_PER_TRIP: settings.driverSalaryPerTrip || prev.DRIVER_PER_TRIP,
                        DRIVER_MIN_DAILY: settings.driverMinDaily ?? prev.DRIVER_MIN_DAILY,
                    }));
                }
            } catch (settingsErr) {
                console.log('使用預設費用設定');
            }

            // 載入月額度使用資料
            try {
                const currentMonth = todayStr.substring(0, 7);
                const usage = await api.getFromGoogleScript<{ elderName: string; totalUsed: number; quota: number; remaining: number; percentage: number }[]>(
                    'getElderMonthlyUsage', { siteId: siteId as string, month: currentMonth }
                );
                if (usage && usage.length > 0) {
                    const usageMap: Record<string, { totalUsed: number; quota: number; remaining: number; percentage: number }> = {};
                    usage.forEach(u => { usageMap[u.elderName] = u; });
                    setQuotaUsage(usageMap);
                }
            } catch (quotaErr) {
                console.log('載入額度資料失敗:', quotaErr);
            }
        } catch (err) {
            console.error('載入失敗:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggle = (index: number, field: keyof ElderWithStatus) => {
        setElders(prev => prev.map((e, i) => i === index ? { ...e, [field]: !e[field] } : e));
    };

    const toggleAll = (field: keyof ElderWithStatus) => {
        const allChecked = elders.every(e => e[field]);
        setElders(prev => prev.map(e => ({ ...e, [field]: !allChecked })));
    };

    // 全選上午出席（同時勾選上午接送）
    const toggleAllAttendedAM = () => {
        const allChecked = elders.every(e => e.attendedAM);
        setElders(prev => prev.map(e => ({
            ...e,
            attendedAM: !allChecked,
            pickupAM: !allChecked  // 出席自動帶入接送
        })));
    };

    // 全選下午出席（同時勾選下午接送）
    const toggleAllAttendedPM = () => {
        const allChecked = elders.every(e => e.attendedPM);
        setElders(prev => prev.map(e => ({
            ...e,
            attendedPM: !allChecked,
            pickupPM: !allChecked  // 出席自動帶入接送
        })));
    };

    const toggleAllPickupForAttended = () => {
        const attendedElders = elders.filter(e => e.attendedAM || e.attendedPM);
        const allPickup = attendedElders.every(e => e.pickupAM && e.pickupPM);
        setElders(prev => prev.map(e => {
            if (!e.attendedAM && !e.attendedPM) return e;
            return { ...e, pickupAM: !allPickup, pickupPM: !allPickup };
        }));
    };

    const toggleAllMealForAttended = () => {
        const attendedElders = elders.filter(e => e.attendedAM || e.attendedPM);
        const allMeal = attendedElders.every(e => e.mealFee);
        setElders(prev => prev.map(e => {
            if (!e.attendedAM && !e.attendedPM) return e;
            return { ...e, mealFee: !allMeal };
        }));
    };

    // 切換上午出席
    const toggleAttendedAM = (index: number) => {
        const elder = elders[index];
        const newAttended = !elder.attendedAM;
        // 檢查額度
        if (newAttended) {
            const usage = quotaUsage[elder.name];
            if (usage && usage.isOverQuota) {
                alert(`🚨 ${elder.name} 本月已超出額度！\n\n額度：$${usage.quota.toLocaleString()}\n已用：$${usage.totalUsed.toLocaleString()}（${usage.tripCount} 趟）\n超額：${usage.overQuotaTrips} 趟 = $${(usage.overQuotaAmount || 0).toLocaleString()}\n\n⚠️ 超額部分每趟 $115 需向家屬收取自費！`);
            } else if (usage && usage.percentage >= 80) {
                alert(`⚠️ ${elder.name} 本月額度即將用完！\n\n額度：$${usage.quota.toLocaleString()}\n剩餘：$${usage.remaining} （剩 ${usage.remainingTrips} 趟）\n\n超過額度後每趟 $115 需向家屬收取自費`);
            }
        }
        setElders(prev => prev.map((e, i) => {
            if (i !== index) return e;
            return {
                ...e,
                attendedAM: newAttended,
                pickupAM: newAttended,
            };
        }));
    };

    // 切換下午出席
    const toggleAttendedPM = (index: number) => {
        const elder = elders[index];
        const newAttended = !elder.attendedPM;
        // 檢查額度
        if (newAttended) {
            const usage = quotaUsage[elder.name];
            if (usage && usage.isOverQuota) {
                alert(`🚨 ${elder.name} 本月已超出額度！\n\n額度：$${usage.quota.toLocaleString()}\n已用：$${usage.totalUsed.toLocaleString()}（${usage.tripCount} 趟）\n超額：${usage.overQuotaTrips} 趟 = $${(usage.overQuotaAmount || 0).toLocaleString()}\n\n⚠️ 超額部分每趟 $115 需向家屬收取自費！`);
            } else if (usage && usage.percentage >= 80) {
                alert(`⚠️ ${elder.name} 本月額度即將用完！\n\n額度：$${usage.quota.toLocaleString()}\n剩餘：$${usage.remaining} （剩 ${usage.remainingTrips} 趟）\n\n超過額度後每趟 $115 需向家屬收取自費`);
            }
        }
        setElders(prev => prev.map((e, i) => {
            if (i !== index) return e;
            return {
                ...e,
                attendedPM: newAttended,
                pickupPM: newAttended,
            };
        }));
    };

    // 統計
    // 實際出席的長者（排除虛報）
    const realElders = elders.filter(e => !e.virtual);

    const stats = {
        attendedAM: elders.filter(e => e.attendedAM).length,
        attendedPM: elders.filter(e => e.attendedPM).length,
        attended: elders.filter(e => e.attendedAM || e.attendedPM).length,  // 總出席（上午或下午，含虛報）
        virtual: elders.filter(e => e.virtual && (e.attendedAM || e.attendedPM)).length,  // 虛報人數
        realAttended: realElders.filter(e => e.attendedAM || e.attendedPM).length,  // 實際到場
        pickupAM: realElders.filter(e => e.pickupAM).length,
        pickupPM: realElders.filter(e => e.pickupPM).length,
        mealFee: realElders.filter(e => e.mealFee).length,
        caregiverAM: realElders.filter(e => e.caregiverAM).length,
        caregiverPM: realElders.filter(e => e.caregiverPM).length,
        caregiverMeal: realElders.filter(e => e.caregiverMeal).length,
        selfAM: realElders.filter(e => e.selfAM).length,
        selfPM: realElders.filter(e => e.selfPM).length,
    };

    // 計算費用
    const calculateFees = () => {
        // 長者接送費用 (依身份類別 co-pay)
        let elderTransportFee = 0;
        // 駕駛薪資：依每位長者的自訂車資加總
        let driverSalaryRaw = 0;
        // 超額自費金額（超過月額度的趟次，每趟 $115 需家屬自付）
        let overQuotaFee = 0;
        let overQuotaElders: { name: string; trips: number; amount: number }[] = [];
        // 只計算非虛報的長者費用
        realElders.forEach(e => {
            if (e.pickupAM || e.pickupPM) {
                // 長者 co-pay 費用依身份類別
                const info = getIdentityInfo(e.identityType);
                if (e.pickupAM) elderTransportFee += info.fare;
                if (e.pickupPM) elderTransportFee += info.fare;
                // 駕駛薪資：有自訂車資用自訂，否則用預設費率
                const driverFare = (e.customFare && e.customFare > 0) ? e.customFare : feeRates.DRIVER_PER_TRIP;
                // 每人每趟（來回各算一趟）
                let trips = 0;
                if (e.pickupAM) trips++;
                if (e.pickupPM) trips++;
                driverSalaryRaw += driverFare * trips;
            }
            // 計算超額自費
            const usage = quotaUsage[e.name];
            if (usage && usage.isOverQuota && usage.overQuotaAmount && usage.overQuotaAmount > 0) {
                overQuotaFee += usage.overQuotaAmount;
                overQuotaElders.push({
                    name: e.name,
                    trips: usage.overQuotaTrips || 0,
                    amount: usage.overQuotaAmount
                });
            }
        });
        const driverSalary = feeRates.DRIVER_MIN_DAILY > 0
            ? Math.max(driverSalaryRaw, feeRates.DRIVER_MIN_DAILY)
            : driverSalaryRaw;
        const isDriverMinApplied = feeRates.DRIVER_MIN_DAILY > 0 && driverSalaryRaw < feeRates.DRIVER_MIN_DAILY;

        // 長者餐費
        const elderMealFee = stats.mealFee * feeRates.ELDER_MEAL;

        // 便當成本
        const totalLunchboxes = lunchStores.reduce((sum, s) => sum + s.count, 0);
        const lunchboxCost = totalLunchboxes * feeRates.LUNCHBOX_COST;

        // 外籍費用
        const caregiverMealFee = stats.caregiverMeal * feeRates.CAREGIVER_MEAL;
        const caregiverTrips = stats.caregiverAM + stats.caregiverPM;
        const caregiverTransportFee = caregiverTrips * feeRates.CAREGIVER_TRANSPORT;
        const caregiverDriverSalary = (stats.caregiverAM > 0 || stats.caregiverPM > 0)
            ? Math.ceil(caregiverTrips / 2) * feeRates.CAREGIVER_DRIVER
            : 0;

        // 自費長者
        const selfFundedFee = (stats.selfAM + stats.selfPM) * feeRates.SELF_FUNDED_FEE;

        return {
            elderTransportFee,
            driverSalary,
            isDriverMinApplied,
            elderMealFee,
            totalLunchboxes,
            lunchboxCost,
            caregiverMealFee,
            caregiverTransportFee,
            caregiverDriverSalary,
            selfFundedFee,
            overQuotaFee,
            overQuotaElders,
            totalIncome: elderTransportFee + elderMealFee + caregiverMealFee + caregiverTransportFee + selfFundedFee + overQuotaFee,
            totalExpense: lunchboxCost + driverSalary + caregiverDriverSalary,
        };
    };

    const fees = calculateFees();

    // 檢查便當數量
    const lunchboxMismatch = fees.totalLunchboxes !== (stats.mealFee + stats.caregiverMeal);

    const getSelfFundedWarnings = () => {
        return elders.filter(e =>
            (e.attendedAM || e.attendedPM) && e.subsidyType === 'self' && !e.selfAM && !e.selfPM
        ).map(e => e.name);
    };

    const handleSave = async () => {
        setIsSaving(true);

        const attendees = elders.filter(e => e.attendedAM || e.attendedPM).map(e => e.name);

        // 計算每位長者的個別費用
        const elderDetails = elders.filter(e => e.attendedAM || e.attendedPM).map(e => {
            const identityInfo = getIdentityInfo(e.identityType);
            const transportFee = (e.pickupAM ? identityInfo.fare : 0) + (e.pickupPM ? identityInfo.fare : 0);
            const mealFee = e.mealFee ? feeRates.ELDER_MEAL : 0;
            const selfFee = (e.selfAM ? feeRates.SELF_FUNDED_FEE : 0) + (e.selfPM ? feeRates.SELF_FUNDED_FEE : 0);

            return {
                name: e.name,
                identityType: e.identityType,
                pickupAM: e.pickupAM,
                pickupPM: e.pickupPM,
                mealFee: e.mealFee,
                selfAM: e.selfAM,
                selfPM: e.selfPM,
                transportFee,
                mealAmount: mealFee,
                selfAmount: selfFee,
                total: transportFee + mealFee + selfFee,
            };
        });

        // 將費用計算結果展開為純物件
        const feesSummary = {
            elderTransportFee: fees.elderTransportFee,
            driverSalary: fees.driverSalary,
            elderMealFee: fees.elderMealFee,
            totalLunchboxes: fees.totalLunchboxes,
            lunchboxCost: fees.lunchboxCost,
            caregiverMealFee: fees.caregiverMealFee,
            caregiverTransportFee: fees.caregiverTransportFee,
            caregiverDriverSalary: fees.caregiverDriverSalary,
            selfFundedFee: fees.selfFundedFee,
            overQuotaFee: fees.overQuotaFee,
            overQuotaElders: fees.overQuotaElders,
            totalIncome: fees.totalIncome,
            totalExpense: fees.totalExpense,
        };

        const feeData = {
            date: todayStr,
            stats: { ...stats },
            fees: feesSummary,
            lunchStores: lunchStores.map(s => ({ name: s.name, count: s.count })),
            elderDetails,  // 加入長者個別費用
        };

        localStorage.setItem('last_attendance', JSON.stringify(attendees));
        localStorage.setItem(`fee_record_${todayStr}`, JSON.stringify(feeData));

        // 同步到 Google Sheets
        try {
            const records = elders.filter(e => e.attendedAM || e.attendedPM).map(e => ({
                elderName: e.name,
                presentAM: e.attendedAM,
                presentPM: e.attendedPM,
                pickUp: e.pickupAM,
                dropOff: e.pickupPM,
                meal: e.mealFee,
                selfPay: e.subsidyType === 'self',
                virtual: e.virtual,
            }));
            await quickEntryApi.saveQuickEntry({
                siteId: siteId as string,
                date: todayStr,
                records,
            });
        } catch (err) {
            console.error('同步到 Google Sheets 失敗:', err);
        }

        // 設定成功狀態
        setSuccessMessage(`✅ 已儲存！上午 ${stats.attendedAM} 人 | 下午 ${stats.attendedPM} 人`);
        setShowSuccess(true);
        setIsSaving(false);

        // 5秒後隱藏訊息
        setTimeout(() => setShowSuccess(false), 5000);
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
        <div className="max-w-4xl mx-auto px-4 pb-44">
            {/* 成功訊息橫幅 */}
            {showSuccess && (
                <div
                    className="fixed top-0 left-0 right-0 bg-green-500 text-white p-4 text-center z-50 shadow-lg cursor-pointer"
                    onClick={() => setShowSuccess(false)}
                >
                    <div className="font-bold text-lg">{successMessage}</div>
                    <div className="text-xs opacity-80 mt-1">（點擊關閉）</div>
                </div>
            )}

            {/* 標題區 */}
            <div className="text-center my-4 p-4 bg-blue-600 text-white rounded-xl">
                <div className="text-sm opacity-90">
                    {todayStr} ({weekDays[selectedDate.getDay()]}) {isViewingPast ? '📅 查看模式' : (isAM ? '上午' : '下午')}
                </div>
                <div className="text-xl font-bold mt-1">今日活動</div>
            </div>

            {/* 快速全選區 */}
            <div className="grid grid-cols-2 gap-3 mb-2">
                <button
                    onClick={toggleAllAttendedAM}
                    className="py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition"
                >
                    ☀️ 全選上午出席
                </button>
                <button
                    onClick={toggleAllAttendedPM}
                    className="py-3 px-4 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition"
                >
                    🌙 全選下午出席
                </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                    onClick={toggleAllPickupForAttended}
                    className="py-3 px-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition"
                >
                    🚐 全選接送
                </button>
                <button
                    onClick={toggleAllMealForAttended}
                    className="py-3 px-4 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 transition"
                >
                    🍱 全選用餐
                </button>
            </div>

            {/* 長者列表 - 折疊區塊 */}
            <CollapsibleSection
                title={`長者名單 (${stats.attended}/${elders.length})`}
                icon="👴"
                isOpen={sections.elderList}
                onToggle={() => toggleSection('elderList')}
                color="green"
                badge={
                    <span className="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                        實到 {stats.realAttended} 人{stats.virtual > 0 ? ` | 虛 ${stats.virtual} 人` : ''}
                    </span>
                }
            >
                {/* 表頭 */}
                <div className="grid gap-1 p-2 bg-gray-100 text-xs font-bold text-center"
                    style={{ gridTemplateColumns: '1fr 36px 36px 36px 36px 36px 36px 36px 36px 10px 36px 36px 36px' }}>
                    <div className="text-left">姓名</div>
                    <div className="text-green-600">上午</div>
                    <div className="text-green-500">下午</div>
                    <div className="text-blue-500">來</div>
                    <div className="text-purple-500">回</div>
                    <div className="text-orange-500">餐</div>
                    <div className="text-teal-500">自上</div>
                    <div className="text-gray-500">自下</div>
                    <div className="text-red-500">虛</div>
                    <div></div>
                    <div className="text-orange-600">外來</div>
                    <div className="text-pink-500">外回</div>
                    <div className="text-amber-700">外餐</div>
                </div>

                {/* 長者列表 */}
                <div className="bg-white">
                    {elders.map((elder, index) => {
                        const isAttended = elder.attendedAM || elder.attendedPM;
                        return (
                            <div
                                key={elder.id || index}
                                className={`grid gap-1 p-2 border-b border-gray-100 items-center ${elder.virtual ? 'bg-red-50' : isAttended ? 'bg-green-50' : ''}`}
                                style={{ gridTemplateColumns: '1fr 36px 36px 36px 36px 36px 36px 36px 36px 10px 36px 36px 36px' }}
                            >
                                <div className="flex items-center gap-1">
                                    <span className={`font-bold text-sm ${elder.virtual ? 'line-through text-gray-400' : ''}`}>{elder.name}</span>
                                    {quotaUsage[elder.name] && (
                                        <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${quotaUsage[elder.name].isOverQuota ? 'bg-red-600 text-white animate-pulse' :
                                            quotaUsage[elder.name].percentage >= 90 ? 'bg-red-500 text-white' :
                                            quotaUsage[elder.name].percentage >= 70 ? 'bg-yellow-400 text-gray-800' :
                                                'bg-green-400 text-white'
                                            }`}>
                                            {quotaUsage[elder.name].isOverQuota ? `超額${quotaUsage[elder.name].overQuotaTrips}趟` : `剩${100 - quotaUsage[elder.name].percentage}%`}
                                        </span>
                                    )}
                                    {elder.virtual && (
                                        <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">
                                            虛
                                        </span>
                                    )}
                                    {elder.subsidyType === 'self' && (
                                        <span className="text-[10px] bg-yellow-400 text-gray-800 px-1.5 py-0.5 rounded font-bold">
                                            自費
                                        </span>
                                    )}
                                    {isAttended && elder.subsidyType === 'self' && !elder.selfAM && !elder.selfPM && (
                                        <span className="text-red-500" title="請勾選自上或自下">⚠️</span>
                                    )}
                                </div>
                                <CheckBox checked={elder.attendedAM} onChange={() => toggleAttendedAM(index)} color="#16a34a" />
                                <CheckBox checked={elder.attendedPM} onChange={() => toggleAttendedPM(index)} color="#22c55e" />
                                <CheckBox checked={elder.pickupAM} onChange={() => toggle(index, 'pickupAM')} disabled={!isAttended} color="#2196F3" />
                                <CheckBox checked={elder.pickupPM} onChange={() => toggle(index, 'pickupPM')} disabled={!isAttended} color="#9C27B0" />
                                <CheckBox checked={elder.mealFee} onChange={() => toggle(index, 'mealFee')} disabled={!isAttended} color="#FF9800" />
                                <CheckBox checked={elder.selfAM} onChange={() => toggle(index, 'selfAM')} disabled={!isAttended} color="#009688" />
                                <CheckBox checked={elder.selfPM} onChange={() => toggle(index, 'selfPM')} disabled={!isAttended} color="#607D8B" />
                                <CheckBox checked={elder.virtual} onChange={() => toggle(index, 'virtual')} disabled={!isAttended} color="#EF4444" />
                                <div className="w-0.5 h-full bg-gray-300 mx-auto"></div>
                                <CheckBox checked={elder.caregiverAM} onChange={() => toggle(index, 'caregiverAM')} disabled={!isAttended} color="#FF5722" />
                                <CheckBox checked={elder.caregiverPM} onChange={() => toggle(index, 'caregiverPM')} disabled={!isAttended} color="#E91E63" />
                                <CheckBox checked={elder.caregiverMeal} onChange={() => toggle(index, 'caregiverMeal')} disabled={!isAttended} color="#795548" />
                            </div>
                        );
                    })}
                </div>
            </CollapsibleSection>

            {/* 便當登記 */}
            <div className={`mb-4 p-4 rounded-xl border-2 ${lunchboxMismatch ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400'}`}>
                <div className="flex justify-between items-center mb-3">
                    <div className="font-bold text-yellow-700">🍱 便當登記</div>
                    {lunchboxMismatch && (
                        <span className="text-red-500 text-sm font-bold animate-pulse">
                            ⚠️ 數量不符！
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    {lunchStores.map((store, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                value={store.name}
                                onChange={(e) => {
                                    const newStores = [...lunchStores];
                                    newStores[idx].name = e.target.value;
                                    setLunchStores(newStores);
                                }}
                            />
                            <input
                                type="number"
                                className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-center"
                                value={store.count}
                                min={0}
                                onChange={(e) => {
                                    const newStores = [...lunchStores];
                                    newStores[idx].count = Math.max(0, parseInt(e.target.value) || 0);
                                    setLunchStores(newStores);
                                }}
                            />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-4 text-center border-t pt-3">
                    <div>
                        <div className="text-2xl font-bold text-orange-500">{stats.mealFee}</div>
                        <div className="text-xs text-gray-600">長者用餐</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-amber-700">{stats.caregiverMeal}</div>
                        <div className="text-xs text-gray-600">外籍用餐</div>
                    </div>
                    <div>
                        <div className={`text-2xl font-bold ${lunchboxMismatch ? 'text-red-500' : 'text-green-600'}`}>
                            {fees.totalLunchboxes}
                        </div>
                        <div className="text-xs text-gray-600">便當登記</div>
                    </div>
                </div>
            </div>

            {/* 便當店訂購 */}
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 mb-4">
                <div className="font-bold text-orange-700 mb-3">🍱 便當店訂購數量</div>
                <div className="grid grid-cols-2 gap-4">
                    {lunchStores.map((store, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <label className="text-sm font-medium text-gray-700 flex-1">{store.name}</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={store.count || ''}
                                onChange={(e) => {
                                    const newStores = [...lunchStores];
                                    newStores[index].count = parseInt(e.target.value) || 0;
                                    setLunchStores(newStores);
                                }}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold"
                                placeholder="0"
                            />
                            <span className="text-sm text-gray-600">個</span>
                        </div>
                    ))}
                </div>
                <div className="mt-3 pt-3 border-t border-orange-200 flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                        用餐人數：{stats.mealFee + stats.caregiverMeal} 人
                    </span>
                    <span className={`font-bold ${lunchboxMismatch ? 'text-red-500' : 'text-green-600'}`}>
                        便當總計：{fees.totalLunchboxes} 個 = ${fees.lunchboxCost}
                    </span>
                </div>
                {lunchboxMismatch && (
                    <div className="mt-2 text-red-500 text-sm">
                        ⚠️ 便當數量與用餐人數不符
                    </div>
                )}
            </div>

            {/* 費用計算總覽 */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-4 text-white mb-4">
                <div className="font-bold mb-3">💰 費用計算</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                    {/* 收入 */}
                    <div className="bg-white/10 rounded-lg p-3">
                        <div className="font-bold text-green-300 mb-2">📈 收入</div>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>長者接送費：</span>
                                <span>${fees.elderTransportFee}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>長者餐費 ({stats.mealFee}人×$40)：</span>
                                <span>${fees.elderMealFee}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>外籍餐費 ({stats.caregiverMeal}×$70)：</span>
                                <span>${fees.caregiverMealFee}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>外籍坐車 ({stats.caregiverAM + stats.caregiverPM}×$100)：</span>
                                <span>${fees.caregiverTransportFee}</span>
                            </div>
                            {fees.selfFundedFee > 0 && (
                                <div className="flex justify-between text-yellow-300">
                                    <span>自費收入：</span>
                                    <span>${fees.selfFundedFee}</span>
                                </div>
                            )}
                            {fees.overQuotaFee > 0 && (
                                <div className="flex justify-between text-red-300">
                                    <span>🚨 超額自費：</span>
                                    <span>${fees.overQuotaFee.toLocaleString()}</span>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-white/30 mt-2 pt-2 flex justify-between font-bold text-lg">
                            <span>小計：</span>
                            <span className="text-green-300">${fees.totalIncome}</span>
                        </div>
                    </div>
                    {/* 支出 */}
                    <div className="bg-white/10 rounded-lg p-3">
                        <div className="font-bold text-red-300 mb-2">📉 支出</div>
                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>駕駛薪資 (長者){fees.isDriverMinApplied ? ' (保底)' : ''}：</span>
                                <span>${fees.driverSalary}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>駕駛薪資 (外籍)：</span>
                                <span>${fees.caregiverDriverSalary}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>便當成本 ({fees.totalLunchboxes}×$70)：</span>
                                <span>${fees.lunchboxCost}</span>
                            </div>
                        </div>
                        <div className="border-t border-white/30 mt-2 pt-2 flex justify-between font-bold text-lg">
                            <span>小計：</span>
                            <span className="text-red-300">${fees.totalExpense}</span>
                        </div>
                    </div>
                </div>
                {/* 淨額 */}
                <div className="mt-3 pt-3 border-t border-white/30 flex justify-between items-center">
                    <span className="font-bold">今日淨額：</span>
                    <span className={`text-2xl font-bold ${fees.totalIncome - fees.totalExpense >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                        ${fees.totalIncome - fees.totalExpense}
                    </span>
                </div>
            </div>

            {/* 超額自費提醒 */}
            {fees.overQuotaElders.length > 0 && (
                <div className="bg-red-50 border-2 border-red-400 rounded-xl p-4 mb-4 animate-pulse">
                    <div className="font-bold text-red-700 mb-2">🚨 超額自費提醒（需向家屬收取）</div>
                    <div className="text-sm text-red-600 mb-2">
                        以下長者本月已超出長照額度，超額部分每趟 $115 需由家屬自費：
                    </div>
                    <div className="space-y-1">
                        {fees.overQuotaElders.map(e => (
                            <div key={e.name} className="flex justify-between items-center bg-red-100 rounded-lg px-3 py-2 text-sm">
                                <span className="font-bold text-red-800">{e.name}</span>
                                <span className="text-red-700">超額 {e.trips} 趟 × $115 = <strong>${e.amount.toLocaleString()}</strong></span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-red-300 flex justify-between font-bold text-red-800">
                        <span>超額自費合計：</span>
                        <span className="text-lg">${fees.overQuotaFee.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-red-500 mt-2">⚠️ 請於月底越捷報表中向家屬收取此費用，避免漏收</p>
                </div>
            )}

            {/* 統計區 */}
            <div className="grid grid-cols-5 gap-2 p-4 bg-gray-100 rounded-xl mb-20">
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">{stats.realAttended}</div>
                    <div className="text-xs text-gray-600">實到</div>
                </div>
                {stats.virtual > 0 && (
                    <div className="text-center">
                        <div className="text-2xl font-bold text-red-500">{stats.virtual}</div>
                        <div className="text-xs text-gray-600">虛報</div>
                    </div>
                )}
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">{stats.pickupAM}</div>
                    <div className="text-xs text-gray-600">長者來程</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-purple-500">{stats.pickupPM}</div>
                    <div className="text-xs text-gray-600">長者回程</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{stats.caregiverAM + stats.caregiverPM}</div>
                    <div className="text-xs text-gray-600">外籍接送</div>
                </div>
            </div>

            {/* 底部按鈕 */}
            <div className="fixed bottom-16 left-0 right-0 p-3 bg-white shadow-lg flex gap-3 z-40">
                <Link
                    href={`/${siteId}`}
                    className="flex-1 py-4 bg-gray-400 text-white text-center rounded-xl font-bold hover:bg-gray-500 transition"
                >
                    ← 返回
                </Link>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={`flex-[2] py-4 ${isSaving ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                        } text-white rounded-xl text-lg font-bold transition`}
                >
                    {isSaving ? '儲存中...' : '✓ 儲存今日紀錄'}
                </button>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { scheduleApi } from '@/lib/api';

interface ScheduleSlot {
    topic: string;
    activityName: string;
    materials: string;
}

interface DaySchedule {
    am: ScheduleSlot;
    pm: ScheduleSlot;
}

type WeeklySchedule = {
    [key: string]: DaySchedule;
};

const dayNames: Record<string, string> = {
    monday: '週一',
    tuesday: '週二',
    wednesday: '週三',
    thursday: '週四',
    friday: '週五'
};

const emptySchedule: WeeklySchedule = {
    monday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
    tuesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
    wednesday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
    thursday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } },
    friday: { am: { topic: '', activityName: '', materials: '' }, pm: { topic: '', activityName: '', materials: '' } }
};

export default function SchedulePage() {
    const params = useParams();
    const siteId = params.site as string;

    const getQuarter = () => {
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear();
        const q = Math.ceil(month / 3);
        return `${year}-Q${q}`;
    };

    const getQuarterOptions = () => {
        const options = [];
        for (let year = 2024; year <= 2027; year++) {
            for (let q = 1; q <= 4; q++) {
                if (year === 2024 && q < 4) continue;
                options.push(`${year}-Q${q}`);
            }
        }
        return options;
    };

    const [selectedQuarter, setSelectedQuarter] = useState(getQuarter());
    const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(emptySchedule);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const topicList = [
        '認知促進', '懷舊治療', '音樂治療', '藝術創作',
        '體適能', '園藝治療', '烹飪活動', '社交活動',
        '生活功能訓練', '節慶活動'
    ];

    useEffect(() => {
        loadSchedule();
    }, [selectedQuarter]);

    const loadSchedule = async () => {
        setIsLoading(true);
        try {
            // 優先從 API 載入
            const apiData = await scheduleApi.get(selectedQuarter);
            if (apiData && apiData.schedule) {
                setWeeklySchedule(apiData.schedule as WeeklySchedule);
            } else {
                // 備用：從 localStorage 載入
                const key = `weekly_schedule_${selectedQuarter}`;
                const saved = localStorage.getItem(key);
                if (saved) setWeeklySchedule(JSON.parse(saved));
                else setWeeklySchedule(emptySchedule);
            }
        } catch {
            // 從 localStorage 載入
            const key = `weekly_schedule_${selectedQuarter}`;
            const saved = localStorage.getItem(key);
            if (saved) setWeeklySchedule(JSON.parse(saved));
            else setWeeklySchedule(emptySchedule);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSchedule = (day: string, period: 'am' | 'pm', field: keyof ScheduleSlot, value: string) => {
        setWeeklySchedule(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [period]: {
                    ...prev[day][period],
                    [field]: value
                }
            }
        }));
    };

    const saveSchedule = async () => {
        setIsSaving(true);
        const key = `weekly_schedule_${selectedQuarter}`;
        localStorage.setItem(key, JSON.stringify(weeklySchedule));

        // 同步到 Google Sheets
        try {
            await scheduleApi.save({
                siteId: siteId,
                quarter: selectedQuarter,
                schedule: weeklySchedule,
            });
            alert('課表已儲存並同步！');
        } catch (err) {
            console.error('同步失敗:', err);
            alert('課表已存到本機，但同步到雲端失敗');
        }
        setIsSaving(false);
    };

    const clearSchedule = () => {
        if (!window.confirm('確定要清空本季課表嗎？')) return;
        setWeeklySchedule(emptySchedule);
        localStorage.removeItem(`weekly_schedule_${selectedQuarter}`);
    };

    const countCourses = () => {
        let count = 0;
        Object.values(weeklySchedule).forEach(day => {
            if (day.am?.topic) count++;
            if (day.pm?.topic) count++;
        });
        return count;
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
        <div className="max-w-6xl mx-auto p-4 pb-24">
            {/* 標題區 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">📅 每週課表</h1>
                <div className="flex items-center gap-3">
                    <select
                        className="px-3 py-2 border border-gray-300 rounded-lg"
                        value={selectedQuarter}
                        onChange={(e) => setSelectedQuarter(e.target.value)}
                    >
                        {getQuarterOptions().map(q => (
                            <option key={q} value={q}>{q}</option>
                        ))}
                    </select>
                    <span className="text-sm text-gray-500">
                        本季課程：<strong className="text-blue-600">{countCourses()}</strong> 堂
                    </span>
                </div>
            </div>

            {/* 課表表格 */}
            <div className="bg-white rounded-xl shadow-sm overflow-x-auto mb-6">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3 text-left font-medium text-gray-600 w-20">時段</th>
                            {Object.entries(dayNames).map(([key, name]) => (
                                <th key={key} className="p-3 text-center font-medium text-gray-600">{name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(['am', 'pm'] as const).map(period => (
                            <tr key={period} className="border-t">
                                <td className="p-3 bg-gray-50 font-medium text-center">
                                    {period === 'am' ? '上午' : '下午'}
                                </td>
                                {Object.keys(dayNames).map(day => {
                                    const data = weeklySchedule[day]?.[period] || { topic: '', activityName: '', materials: '' };
                                    return (
                                        <td key={day} className="p-2 border-l">
                                            <select
                                                className="w-full px-2 py-1 text-sm border border-gray-200 rounded mb-1"
                                                value={data.topic}
                                                onChange={(e) => updateSchedule(day, period, 'topic', e.target.value)}
                                            >
                                                <option value="">-- 選擇主題 --</option>
                                                {topicList.map((t, i) => (
                                                    <option key={i} value={t}>{t}</option>
                                                ))}
                                            </select>
                                            {data.topic && (
                                                <>
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded mb-1"
                                                        placeholder="活動名稱"
                                                        value={data.activityName}
                                                        onChange={(e) => updateSchedule(day, period, 'activityName', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                                                        placeholder="材料"
                                                        value={data.materials}
                                                        onChange={(e) => updateSchedule(day, period, 'materials', e.target.value)}
                                                    />
                                                </>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-3 mb-20">
                <button
                    onClick={clearSchedule}
                    className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                >
                    🗑️ 清空課表
                </button>
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
                    onClick={saveSchedule}
                    disabled={isSaving}
                    className={`flex-[2] py-4 ${isSaving ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                        } text-white rounded-xl text-lg font-bold transition`}
                >
                    {isSaving ? '儲存中...' : '💾 儲存課表'}
                </button>
            </div>
        </div>
    );
}

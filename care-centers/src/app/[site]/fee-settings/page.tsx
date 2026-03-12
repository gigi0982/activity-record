'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { settingsApi } from '@/lib/api';

interface FeeSettings {
    mealPrice: number;
    transportFees: {
        normal: number;
        foreign: number;
    };
    driverSalaryPerTrip: number;
    driverMinDaily: number;
    assistantHourlyRate: number;
}

const DEFAULT_SETTINGS: FeeSettings = {
    mealPrice: 70,
    transportFees: {
        normal: 80,
        foreign: 100,
    },
    driverSalaryPerTrip: 115,
    driverMinDaily: 0,
    assistantHourlyRate: 176,
};

const STORAGE_KEY = 'fee_settings';

export default function FeeSettingsPage() {
    const params = useParams();
    const siteId = params.site as string;

    const [settings, setSettings] = useState<FeeSettings>(DEFAULT_SETTINGS);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 載入設定
    useEffect(() => {
        const loadSettings = async () => {
            try {
                // 優先從 API 載入
                const apiSettings = await settingsApi.getSettings(siteId);
                if (apiSettings && apiSettings.mealPrice) {
                    setSettings({
                        mealPrice: apiSettings.mealPrice,
                        transportFees: {
                            normal: apiSettings.transportNormal,
                            foreign: apiSettings.transportForeign,
                        },
                        driverSalaryPerTrip: apiSettings.driverSalaryPerTrip || 115,
                        driverMinDaily: apiSettings.driverMinDaily || 0,
                        assistantHourlyRate: apiSettings.assistantHourlyRate,
                    });
                } else {
                    // 備用：從 localStorage 載入
                    const saved = localStorage.getItem(STORAGE_KEY);
                    if (saved) setSettings(JSON.parse(saved));
                }
            } catch {
                // 從 localStorage 載入
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) setSettings(JSON.parse(saved));
            } finally {
                setIsLoading(false);
            }
        };
        loadSettings();
    }, [siteId]);

    const handleSave = async () => {
        setIsSaving(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));

        // 同步到 Google Sheets
        try {
            await settingsApi.saveSettings({
                siteId,
                mealPrice: settings.mealPrice,
                transportNormal: settings.transportFees.normal,
                transportForeign: settings.transportFees.foreign,
                driverSalaryPerTrip: settings.driverSalaryPerTrip,
                driverMinDaily: settings.driverMinDaily,
                assistantHourlyRate: settings.assistantHourlyRate,
            });
            alert('收費設定已儲存並同步！');
        } catch {
            alert('設定已存到本機，但同步到雲端失敗');
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen">載入中...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">⚙️ 收費設定</h1>

            {/* 餐費設定 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                <h2 className="font-bold text-gray-800 mb-4">🍱 餐費設定</h2>
                <div className="flex items-center gap-4">
                    <label className="text-gray-600">每餐價格：</label>
                    <input
                        type="number"
                        className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                        value={settings.mealPrice}
                        onChange={(e) => setSettings({ ...settings, mealPrice: Number(e.target.value) })}
                    />
                    <span className="text-gray-500">元</span>
                </div>
            </div>

            {/* 交通費設定 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                <h2 className="font-bold text-gray-800 mb-4">🚗 交通費設定</h2>
                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <label className="text-gray-600 w-32">一般長者：</label>
                        <input
                            type="number"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                            value={settings.transportFees.normal}
                            onChange={(e) => setSettings({
                                ...settings,
                                transportFees: { ...settings.transportFees, normal: Number(e.target.value) }
                            })}
                        />
                        <span className="text-gray-500">元/趟</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-gray-600 w-32">外籍配偶：</label>
                        <input
                            type="number"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                            value={settings.transportFees.foreign}
                            onChange={(e) => setSettings({
                                ...settings,
                                transportFees: { ...settings.transportFees, foreign: Number(e.target.value) }
                            })}
                        />
                        <span className="text-gray-500">元/趟</span>
                    </div>
                </div>
            </div>

            {/* 人事費設定 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                <h2 className="font-bold text-gray-800 mb-4">👩‍💼 人事費設定</h2>
                <div className="space-y-3">
                    <div className="flex items-center gap-4">
                        <label className="text-gray-600 w-32">駕駛薪資：</label>
                        <input
                            type="number"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                            value={settings.driverSalaryPerTrip}
                            onChange={(e) => setSettings({ ...settings, driverSalaryPerTrip: Number(e.target.value) })}
                        />
                        <span className="text-gray-500">元/人次</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-gray-600 w-32">每日保底：</label>
                        <input
                            type="number"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                            value={settings.driverMinDaily}
                            onChange={(e) => setSettings({ ...settings, driverMinDaily: Number(e.target.value) })}
                        />
                        <span className="text-gray-500">元/天（0=無保底）</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-gray-600 w-32">助理時薪：</label>
                        <input
                            type="number"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg"
                            value={settings.assistantHourlyRate}
                            onChange={(e) => setSettings({ ...settings, assistantHourlyRate: Number(e.target.value) })}
                        />
                        <span className="text-gray-500">元/小時</span>
                    </div>
                </div>
            </div>

            {/* 儲存按鈕 */}
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
                    className={`flex-[2] py-4 ${isSaving ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white rounded-xl text-lg font-bold transition`}
                >
                    {isSaving ? '儲存中...' : '💾 儲存設定'}
                </button>
            </div>
        </div>
    );
}

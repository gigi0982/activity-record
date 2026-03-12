'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { elderApi, healthApi, Elder } from '@/lib/api';

interface HealthRecord {
    date: string;
    elderName: string;
    bloodPressure: { systolic: number; diastolic: number };
    pulse: number;
    temperature: number;
    weight: number;
    notes: string;
}

export default function HealthPage() {
    const params = useParams();
    const siteId = params.site as string;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const [elders, setElders] = useState<Elder[]>([]);
    const [selectedElder, setSelectedElder] = useState<string>('');
    const [records, setRecords] = useState<HealthRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [newRecord, setNewRecord] = useState({
        systolic: 120,
        diastolic: 80,
        pulse: 70,
        temperature: 36.5,
        weight: 60,
        notes: '',
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedElder) {
            loadRecords();
        }
    }, [selectedElder]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const elderList = await elderApi.getElders();
            setElders(elderList);
            if (elderList.length > 0) {
                setSelectedElder(elderList[0].name);
            }
        } catch (err) {
            console.error('載入失敗:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const loadRecords = async () => {
        if (!selectedElder) return;
        try {
            // 優先從 API 載入
            const apiRecords = await healthApi.getByElder(selectedElder);
            if (apiRecords && apiRecords.length > 0) {
                // 轉換格式
                const formatted = apiRecords.map(r => ({
                    date: r.date,
                    elderName: r.elderName,
                    bloodPressure: r.bloodPressure ? {
                        systolic: parseInt(r.bloodPressure.split('/')[0]) || 120,
                        diastolic: parseInt(r.bloodPressure.split('/')[1]) || 80,
                    } : { systolic: 120, diastolic: 80 },
                    pulse: r.heartRate || 70,
                    temperature: 36.5,
                    weight: r.weight || 60,
                    notes: r.note || '',
                }));
                setRecords(formatted);
            } else {
                // 備用：從 localStorage 載入
                const key = `health_${selectedElder}`;
                const saved = localStorage.getItem(key);
                if (saved) setRecords(JSON.parse(saved));
                else setRecords([]);
            }
        } catch {
            // 從 localStorage 載入
            const key = `health_${selectedElder}`;
            const saved = localStorage.getItem(key);
            if (saved) setRecords(JSON.parse(saved));
            else setRecords([]);
        }
    };

    const handleSave = async () => {
        if (!selectedElder) return;

        setIsSaving(true);
        const record: HealthRecord = {
            date: todayStr,
            elderName: selectedElder,
            bloodPressure: { systolic: newRecord.systolic, diastolic: newRecord.diastolic },
            pulse: newRecord.pulse,
            temperature: newRecord.temperature,
            weight: newRecord.weight,
            notes: newRecord.notes,
        };

        const key = `health_${selectedElder}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const updated = [record, ...existing.filter((r: HealthRecord) => r.date !== todayStr)];
        localStorage.setItem(key, JSON.stringify(updated.slice(0, 100)));

        // 同步到 Google Sheets
        try {
            await healthApi.save([{
                elderName: selectedElder,
                date: todayStr,
                bloodPressure: `${newRecord.systolic}/${newRecord.diastolic}`,
                heartRate: newRecord.pulse,
                weight: newRecord.weight,
                note: newRecord.notes,
            }]);
        } catch (err) {
            console.error('同步到 Google Sheets 失敗:', err);
        }

        setRecords(updated);
        setNewRecord({ systolic: 120, diastolic: 80, pulse: 70, temperature: 36.5, weight: 60, notes: '' });
        setIsSaving(false);
        alert('健康紀錄已儲存並同步！');
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
            <h1 className="text-2xl font-bold text-gray-800 mb-6">❤️ 健康紀錄</h1>

            {/* 長者選擇 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <label className="block text-sm font-medium text-gray-600 mb-2">選擇長者</label>
                <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    value={selectedElder}
                    onChange={(e) => setSelectedElder(e.target.value)}
                >
                    {elders.map((elder) => (
                        <option key={elder.id} value={elder.name}>{elder.name}</option>
                    ))}
                </select>
            </div>

            {/* 新增紀錄 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <h2 className="font-semibold text-gray-800 mb-4">📅 {todayStr} 紀錄</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">收縮壓</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={newRecord.systolic}
                                onChange={(e) => setNewRecord({ ...newRecord, systolic: Number(e.target.value) })}
                            />
                            <span className="text-gray-500">mmHg</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">舒張壓</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={newRecord.diastolic}
                                onChange={(e) => setNewRecord({ ...newRecord, diastolic: Number(e.target.value) })}
                            />
                            <span className="text-gray-500">mmHg</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">脈搏</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={newRecord.pulse}
                                onChange={(e) => setNewRecord({ ...newRecord, pulse: Number(e.target.value) })}
                            />
                            <span className="text-gray-500">次/分</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">體溫</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={newRecord.temperature}
                                onChange={(e) => setNewRecord({ ...newRecord, temperature: Number(e.target.value) })}
                            />
                            <span className="text-gray-500">°C</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">體重</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.1"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                value={newRecord.weight}
                                onChange={(e) => setNewRecord({ ...newRecord, weight: Number(e.target.value) })}
                            />
                            <span className="text-gray-500">kg</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-sm text-gray-600 mb-1">備註</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="特殊狀況記錄..."
                        value={newRecord.notes}
                        onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="mt-4 w-full py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 disabled:opacity-50"
                >
                    {isSaving ? '儲存中...' : '💾 儲存今日紀錄'}
                </button>
            </div>

            {/* 歷史紀錄 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-20">
                <div className="px-4 py-3 border-b bg-gray-50">
                    <h2 className="font-semibold text-gray-800">📋 {selectedElder} 的歷史紀錄</h2>
                </div>
                {records.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">尚無紀錄</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-600">
                                    <th className="px-4 py-2 text-left">日期</th>
                                    <th className="px-4 py-2 text-center">血壓</th>
                                    <th className="px-4 py-2 text-center">脈搏</th>
                                    <th className="px-4 py-2 text-center">體溫</th>
                                    <th className="px-4 py-2 text-center">體重</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {records.slice(0, 10).map((record, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium">{record.date}</td>
                                        <td className="px-4 py-2 text-center">
                                            {record.bloodPressure.systolic}/{record.bloodPressure.diastolic}
                                        </td>
                                        <td className="px-4 py-2 text-center">{record.pulse}</td>
                                        <td className="px-4 py-2 text-center">{record.temperature}°C</td>
                                        <td className="px-4 py-2 text-center">{record.weight}kg</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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

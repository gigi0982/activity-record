'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { elderApi, healthApi, Elder } from '@/lib/api';
import { Heart, Save, ArrowLeft, Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, Loader2, ClipboardList } from 'lucide-react';

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
                <Loader2 className="w-10 h-10 animate-spin" style={{ color: 'var(--primary)' }} />
                <p className="mt-4 text-sm" style={{ color: 'var(--muted)' }}>載入中...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            <div className="flex items-center gap-2.5 mb-6">
                <Heart className="w-6 h-6" style={{ color: 'var(--danger)' }} />
                <h1 className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>健康紀錄</h1>
            </div>

            {/* 長者選擇 */}
            <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>選擇長者</label>
                <select
                    className="w-full px-3 py-2.5 rounded-lg text-sm cursor-pointer transition-colors duration-150"
                    style={{ border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)', minHeight: '44px' }}
                    value={selectedElder}
                    onChange={(e) => setSelectedElder(e.target.value)}
                >
                    {elders.map((elder) => (
                        <option key={elder.id} value={elder.name}>{elder.name}</option>
                    ))}
                </select>
            </div>

            {/* 新增紀錄 */}
            <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{todayStr} 紀錄</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>收縮壓</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ border: '1.5px solid var(--border)', minHeight: '44px' }}
                                value={newRecord.systolic}
                                onChange={(e) => setNewRecord({ ...newRecord, systolic: Number(e.target.value) })}
                            />
                            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>mmHg</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>舒張壓</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ border: '1.5px solid var(--border)', minHeight: '44px' }}
                                value={newRecord.diastolic}
                                onChange={(e) => setNewRecord({ ...newRecord, diastolic: Number(e.target.value) })}
                            />
                            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>mmHg</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>脈搏</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ border: '1.5px solid var(--border)', minHeight: '44px' }}
                                value={newRecord.pulse}
                                onChange={(e) => setNewRecord({ ...newRecord, pulse: Number(e.target.value) })}
                            />
                            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>次/分</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>體溫</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.1"
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ border: '1.5px solid var(--border)', minHeight: '44px' }}
                                value={newRecord.temperature}
                                onChange={(e) => setNewRecord({ ...newRecord, temperature: Number(e.target.value) })}
                            />
                            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>°C</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>體重</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                step="0.1"
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{ border: '1.5px solid var(--border)', minHeight: '44px' }}
                                value={newRecord.weight}
                                onChange={(e) => setNewRecord({ ...newRecord, weight: Number(e.target.value) })}
                            />
                            <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>kg</span>
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>備註</label>
                    <input
                        type="text"
                        className="w-full px-3 py-2.5 rounded-lg text-sm"
                        style={{ border: '1.5px solid var(--border)', minHeight: '44px' }}
                        placeholder="特殊狀況記錄..."
                        value={newRecord.notes}
                        onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })}
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="mt-4 w-full py-3 text-white rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    style={{ background: 'var(--primary)', minHeight: '48px' }}
                >
                    {isSaving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> 儲存中...</>
                    ) : (
                        <><Save className="w-4 h-4" /> 儲存今日紀錄</>
                    )}
                </button>
            </div>

            {/* 血壓統計與提醒 */}
            {records.length >= 3 && (() => {
                const systolicValues = records.map(r => r.bloodPressure.systolic).filter(v => v > 0);
                const diastolicValues = records.map(r => r.bloodPressure.diastolic).filter(v => v > 0);

                const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
                const median = (arr: number[]) => {
                    if (arr.length === 0) return 0;
                    const sorted = [...arr].sort((a, b) => a - b);
                    const mid = Math.floor(sorted.length / 2);
                    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
                };

                const avgSys = avg(systolicValues);
                const avgDia = avg(diastolicValues);
                const medSys = median(systolicValues);
                const medDia = median(diastolicValues);

                const getBPLevel = (sys: number, dia: number) => {
                    if (sys >= 180 || dia >= 120) return { level: '高血壓危象', color: '#DC2626', bgColor: '#FEE2E2' };
                    if (sys >= 160 || dia >= 100) return { level: '第二期高血壓', color: '#EF4444', bgColor: '#FEE2E2' };
                    if (sys >= 140 || dia >= 90) return { level: '第一期高血壓', color: '#F97316', bgColor: '#FFF7ED' };
                    if (sys >= 130 || dia >= 85) return { level: '高血壓前期', color: '#D97706', bgColor: '#FEF3C7' };
                    if (sys >= 120) return { level: '血壓偏高', color: '#EAB308', bgColor: '#FEF9C3' };
                    if (sys < 90 || dia < 60) return { level: '低血壓', color: '#3B82F6', bgColor: '#DBEAFE' };
                    return { level: '正常', color: '#22C55E', bgColor: '#DCFCE7' };
                };

                const avgLevel = getBPLevel(avgSys, avgDia);
                const isAbnormal = avgLevel.level !== '正常' && avgLevel.level !== '血壓偏高';

                const recent3 = systolicValues.slice(0, 3);
                const older3 = systolicValues.slice(3, 6);
                let trendIcon = null;
                let trendText = '';
                if (recent3.length >= 3 && older3.length >= 3) {
                    const recentAvg = avg(recent3);
                    const olderAvg = avg(older3);
                    if (recentAvg > olderAvg + 10) { trendIcon = <TrendingUp className="w-4 h-4 inline mr-1" style={{ color: '#EF4444' }} />; trendText = '近期血壓有上升趨勢'; }
                    else if (recentAvg < olderAvg - 10) { trendIcon = <TrendingDown className="w-4 h-4 inline mr-1" style={{ color: '#22C55E' }} />; trendText = '近期血壓有下降趨勢'; }
                    else { trendIcon = <Minus className="w-4 h-4 inline mr-1" style={{ color: 'var(--muted)' }} />; trendText = '近期血壓趨勢平穩'; }
                }

                return (
                    <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                            <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>血壓統計分析（近 {records.length} 筆）</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--primary-50)' }}>
                                <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>平均血壓</div>
                                <div className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{avgSys}/{avgDia}</div>
                            </div>
                            <div className="rounded-lg p-3 text-center" style={{ background: 'var(--primary-50)' }}>
                                <div className="text-xs mb-1" style={{ color: 'var(--muted)' }}>中位數血壓</div>
                                <div className="text-xl font-bold" style={{ color: 'var(--foreground)' }}>{medSys}/{medDia}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>評估分級：</span>
                            <span
                                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                style={{ background: avgLevel.bgColor, color: avgLevel.color }}
                            >
                                {avgLevel.level}
                            </span>
                        </div>

                        {isAbnormal && (
                            <div className="mt-2 p-3 rounded-lg flex items-start gap-2" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
                                <p className="text-sm font-medium" style={{ color: '#991B1B' }}>
                                    {selectedElder} 近期血壓平均值偏高（{avgSys}/{avgDia}），建議諮詢醫師
                                </p>
                            </div>
                        )}

                        {trendText && (
                            <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                {trendIcon}{trendText}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* 歷史紀錄 */}
            <div className="rounded-xl overflow-hidden mb-20" style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--primary-50)' }}>
                    <ClipboardList className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground)' }}>{selectedElder} 的歷史紀錄</h2>
                </div>
                {records.length === 0 ? (
                    <div className="p-8 text-center text-sm" style={{ color: 'var(--muted)' }}>尚無紀錄</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th className="px-4 py-2.5 text-left text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>日期</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>血壓</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>脈搏</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>體溫</th>
                                    <th className="px-4 py-2.5 text-center text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>體重</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.slice(0, 10).map((record, i) => {
                                    const sys = record.bloodPressure.systolic;
                                    const dia = record.bloodPressure.diastolic;
                                    const isHigh = sys >= 140 || dia >= 90;
                                    const isPreHigh = sys >= 130 || dia >= 85;
                                    const isLow = sys < 90 || dia < 60;
                                    const bpStyle = isHigh
                                        ? { color: '#DC2626', fontWeight: 700 }
                                        : isPreHigh
                                            ? { color: '#D97706', fontWeight: 600 }
                                            : isLow
                                                ? { color: '#3B82F6', fontWeight: 600 }
                                                : { color: 'var(--foreground)' };
                                    return (
                                        <tr key={i} className="transition-colors duration-150" style={{ borderBottom: '1px solid var(--border-light)' }}>
                                            <td className="px-4 py-2.5 font-medium text-sm" style={{ color: 'var(--foreground)' }}>{record.date}</td>
                                            <td className="px-4 py-2.5 text-center text-sm flex items-center justify-center gap-1" style={bpStyle}>
                                                {sys}/{dia}
                                                {isHigh && <AlertTriangle className="w-3.5 h-3.5" />}
                                            </td>
                                            <td className="px-4 py-2.5 text-center text-sm" style={{ color: 'var(--foreground)' }}>{record.pulse}</td>
                                            <td className="px-4 py-2.5 text-center text-sm" style={{ color: 'var(--foreground)' }}>{record.temperature}°C</td>
                                            <td className="px-4 py-2.5 text-center text-sm" style={{ color: 'var(--foreground)' }}>{record.weight}kg</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* 底部按鈕 */}
            <div className="fixed bottom-16 left-0 right-0 p-3 z-40" style={{ background: 'var(--surface)', boxShadow: '0 -2px 8px rgba(0,0,0,0.06)' }}>
                <Link
                    href={`/${siteId}`}
                    className="flex items-center justify-center gap-2 w-full py-3.5 text-white text-center rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
                    style={{ background: 'var(--text-secondary)' }}
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回儀表板
                </Link>
            </div>
        </div>
    );
}

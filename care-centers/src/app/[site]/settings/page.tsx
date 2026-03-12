'use client';

import { useState, useEffect } from 'react';
import { elderApi, Elder } from '@/lib/api';
import { getLevelInfo, getIdentityInfo } from '@/lib/utils';

interface NewElder {
    name: string;
    level: string;
    identityType: string;
    subsidyType: string;
    notes: string;
    familyLineId: string;
    customFare: string;
    monthlyQuota: string;
}

interface EditingElder extends NewElder {
    originalName: string;
}

export default function SettingsPage() {
    const [elders, setElders] = useState<Elder[]>([]);
    const [newElder, setNewElder] = useState<NewElder>({
        name: '', level: 'A', identityType: 'normal', subsidyType: 'subsidy', notes: '', familyLineId: '', customFare: '', monthlyQuota: ''
    });
    const [isLoadingElders, setIsLoadingElders] = useState(true);
    const [editingElder, setEditingElder] = useState<EditingElder | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    useEffect(() => {
        loadElders();
    }, []);

    const loadElders = async () => {
        setIsLoadingElders(true);
        try {
            const data = await elderApi.getElders();
            setElders(data || []);
        } catch (err) {
            console.error('載入長者失敗:', err);
        } finally {
            setIsLoadingElders(false);
        }
    };

    const handleAddElder = async () => {
        if (!newElder.name.trim()) {
            alert('請輸入長者姓名');
            return;
        }
        setIsAdding(true);
        const levelInfo = getLevelInfo(newElder.level);
        const identityInfo = getIdentityInfo(newElder.identityType);
        try {
            await elderApi.addElder({
                name: newElder.name.trim(),
                level: newElder.level,
                levelDesc: levelInfo.desc,
                scoreRange: levelInfo.range,
                identityType: newElder.identityType,
                identityDesc: identityInfo.desc,
                fare: identityInfo.fare,
                subsidyType: newElder.subsidyType,
                notes: newElder.notes,
                familyLineId: newElder.familyLineId.trim(),
                customFare: newElder.customFare ? Number(newElder.customFare) : undefined,
                monthlyQuota: newElder.monthlyQuota ? Number(newElder.monthlyQuota) : undefined,
            });
            setNewElder({ name: '', level: 'A', identityType: 'normal', subsidyType: 'subsidy', notes: '', familyLineId: '', customFare: '', monthlyQuota: '' });
            alert('新增成功！資料將在 1-2 秒後更新');
            setTimeout(loadElders, 1500);
        } catch (err) {
            alert('新增失敗');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteElder = async (name: string) => {
        if (!window.confirm(`確定要刪除「${name}」嗎？\n\n此操作無法復原！`)) return;
        try {
            const result = await elderApi.deleteElder(name);
            if (result.success) {
                alert(`已成功刪除「${name}」！`);
                loadElders();
            } else {
                alert(`刪除失敗：${result.message || '未知錯誤'}`);
            }
        } catch (err) {
            console.error('刪除失敗:', err);
            alert('刪除請求失敗，請稍後再試');
        }
    };

    const handleEditElder = (elder: Elder) => {
        setEditingElder({
            originalName: elder.name,
            name: elder.name,
            level: elder.level || 'A',
            identityType: elder.identityType || 'normal',
            subsidyType: elder.subsidyType || 'subsidy',
            notes: elder.notes || '',
            familyLineId: elder.familyLineId || '',
            customFare: elder.customFare ? String(elder.customFare) : '',
            monthlyQuota: elder.monthlyQuota ? String(elder.monthlyQuota) : '',
        });
    };

    const handleUpdateElder = async () => {
        if (!editingElder || !editingElder.name.trim()) {
            alert('請輸入長者姓名');
            return;
        }
        setIsUpdating(true);
        const levelInfo = getLevelInfo(editingElder.level);
        const identityInfo = getIdentityInfo(editingElder.identityType);
        try {
            await elderApi.updateElder({
                originalName: editingElder.originalName,
                name: editingElder.name.trim(),
                level: editingElder.level,
                levelDesc: levelInfo.desc,
                scoreRange: levelInfo.range,
                identityType: editingElder.identityType,
                identityDesc: identityInfo.desc,
                fare: identityInfo.fare,
                subsidyType: editingElder.subsidyType,
                notes: editingElder.notes,
                familyLineId: editingElder.familyLineId.trim(),
                customFare: editingElder.customFare ? Number(editingElder.customFare) : undefined,
                monthlyQuota: editingElder.monthlyQuota ? Number(editingElder.monthlyQuota) : undefined,
            });
            alert('更新成功！');
            setEditingElder(null);
            setTimeout(loadElders, 1500);
        } catch (err) {
            alert('更新失敗');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4">
            {/* 頁面標題 */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    👴 長者管理
                </h1>
                <p className="text-gray-500">管理長者名單與基本資料</p>
            </div>

            {/* 新增長者表單 */}
            <div className="bg-white rounded-xl shadow-sm mb-6 overflow-hidden">
                <div className="bg-green-500 text-white px-4 py-3 font-semibold">
                    ➕ 新增長者
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="長者姓名"
                                value={newElder.name}
                                onChange={(e) => setNewElder({ ...newElder, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">能力分級</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                value={newElder.level}
                                onChange={(e) => setNewElder({ ...newElder, level: e.target.value })}
                            >
                                <option value="A">A-輕度</option>
                                <option value="B">B-中度</option>
                                <option value="C">C-重度</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">身份類別</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                value={newElder.identityType}
                                onChange={(e) => setNewElder({ ...newElder, identityType: e.target.value })}
                            >
                                <option value="normal">一般戶</option>
                                <option value="mediumLow">中低收</option>
                                <option value="low">低收</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">補助/自費</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                value={newElder.subsidyType}
                                onChange={(e) => setNewElder({ ...newElder, subsidyType: e.target.value })}
                            >
                                <option value="subsidy">補助</option>
                                <option value="self">自費</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">司機車資</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                placeholder="留空=依身份"
                                value={newElder.customFare}
                                onChange={(e) => setNewElder({ ...newElder, customFare: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">月額度上限</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                placeholder="0=不限"
                                value={newElder.monthlyQuota}
                                onChange={(e) => setNewElder({ ...newElder, monthlyQuota: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">家屬 LINE ID</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                placeholder="U1234567890abcdef..."
                                value={newElder.familyLineId}
                                onChange={(e) => setNewElder({ ...newElder, familyLineId: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                placeholder="選填"
                                value={newElder.notes}
                                onChange={(e) => setNewElder({ ...newElder, notes: e.target.value })}
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 font-medium"
                                onClick={handleAddElder}
                                disabled={isAdding}
                            >
                                {isAdding ? '新增中...' : '➕ 新增'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 長者名單 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800">📋 長者名單</h2>
                    <button
                        className="text-blue-500 hover:text-blue-700 text-sm font-medium"
                        onClick={loadElders}
                    >
                        🔄 重新整理
                    </button>
                </div>
                <div className="p-4">
                    {isLoadingElders ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                            <p className="mt-2 text-gray-500">載入中...</p>
                        </div>
                    ) : elders.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">尚無資料</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                        <th className="px-4 py-3 font-medium">姓名</th>
                                        <th className="px-4 py-3 font-medium">分級</th>
                                        <th className="px-4 py-3 font-medium">身份類別</th>
                                        <th className="px-4 py-3 font-medium">補助/自費</th>
                                        <th className="px-4 py-3 font-medium">車資</th>
                                        <th className="px-4 py-3 font-medium">月額度</th>
                                        <th className="px-4 py-3 font-medium">家屬 LINE</th>
                                        <th className="px-4 py-3 font-medium">備註</th>
                                        <th className="px-4 py-3 font-medium">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {elders.map((elder, i) => {
                                        const info = getLevelInfo(elder.level);
                                        const identityInfo = getIdentityInfo(elder.identityType);
                                        return (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium">{elder.name}</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className="px-2 py-1 rounded-full text-white text-xs font-medium"
                                                        style={{ backgroundColor: info.color }}
                                                    >
                                                        {elder.level}-{info.desc}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className="px-2 py-1 rounded-full text-white text-xs font-medium"
                                                        style={{ backgroundColor: identityInfo.color }}
                                                    >
                                                        {elder.identityDesc || identityInfo.desc}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${elder.subsidyType === 'self'
                                                        ? 'bg-yellow-400 text-gray-800'
                                                        : 'bg-green-500 text-white'
                                                        }`}>
                                                        {elder.subsidyType === 'self' ? '自費' : '補助'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium">
                                                    {elder.customFare ? (
                                                        <span className="text-blue-600">${elder.customFare}</span>
                                                    ) : (
                                                        <span>${elder.fare !== undefined ? elder.fare : identityInfo.fare}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {elder.monthlyQuota ? (
                                                        <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                                            ${elder.monthlyQuota.toLocaleString()}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">不限</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {elder.familyLineId && elder.familyLineId.trim() ? (
                                                        <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">✓</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-sm">{elder.notes || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="text-blue-500 hover:text-blue-700"
                                                            onClick={() => handleEditElder(elder)}
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="text-red-500 hover:text-red-700"
                                                            onClick={() => handleDeleteElder(elder.name)}
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <p className="mt-4 text-sm text-gray-500">共 {elders.length} 位</p>
                </div>
            </div>

            {/* 編輯長者 Modal */}
            {editingElder && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
                        <div className="bg-blue-500 text-white px-4 py-3 rounded-t-xl flex justify-between items-center">
                            <h3 className="font-semibold">✏️ 編輯長者資料</h3>
                            <button className="text-white/80 hover:text-white" onClick={() => setEditingElder(null)}>
                                ✕
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    value={editingElder.name}
                                    onChange={(e) => setEditingElder({ ...editingElder, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">能力分級</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        value={editingElder.level}
                                        onChange={(e) => setEditingElder({ ...editingElder, level: e.target.value })}
                                    >
                                        <option value="A">A - 輕度</option>
                                        <option value="B">B - 中度</option>
                                        <option value="C">C - 重度</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">身份類別</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        value={editingElder.identityType}
                                        onChange={(e) => setEditingElder({ ...editingElder, identityType: e.target.value })}
                                    >
                                        <option value="normal">一般戶 ($18)</option>
                                        <option value="mediumLow">中低收 ($5)</option>
                                        <option value="low">低收 ($0)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">補助/自費</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    value={editingElder.subsidyType}
                                    onChange={(e) => setEditingElder({ ...editingElder, subsidyType: e.target.value })}
                                >
                                    <option value="subsidy">補助</option>
                                    <option value="self">自費</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">家屬 LINE ID</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="例如：U1234567890abcdef..."
                                    value={editingElder.familyLineId}
                                    onChange={(e) => setEditingElder({ ...editingElder, familyLineId: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-1">家屬在官方帳號輸入「我的ID」可取得</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">司機車資</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="留空=依身份類別"
                                        value={editingElder.customFare}
                                        onChange={(e) => setEditingElder({ ...editingElder, customFare: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">司機載這位長者每趨的車資（留空=使用預設 $115）</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">月額度上限</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        placeholder="0=不限"
                                        value={editingElder.monthlyQuota}
                                        onChange={(e) => setEditingElder({ ...editingElder, monthlyQuota: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">參考：CMS2=$3,006 / CMS3=$4,638 / CMS4=$5,574</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="選填"
                                    value={editingElder.notes}
                                    onChange={(e) => setEditingElder({ ...editingElder, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button
                                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                                onClick={() => setEditingElder(null)}
                            >
                                取消
                            </button>
                            <button
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                                onClick={handleUpdateElder}
                                disabled={isUpdating}
                            >
                                {isUpdating ? '更新中...' : '💾 儲存變更'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

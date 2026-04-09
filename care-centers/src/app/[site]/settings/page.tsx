'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { elderApi, Elder } from '@/lib/api';
import { getLevelInfo, getIdentityInfo } from '@/lib/utils';

interface NewElder {
    name: string;
    caseNumber: string;
    level: string;
    identityType: string;
    subsidyType: string;
    notes: string;
    familyLineId: string;
    customFare: string;
    monthlyQuota: string;
    caseSource: string;
    hospital: string;
    diagnosisDate: string;
    dementiaLevel: string;
    cdrScore: string;
    cmsScore: string;
    adlScore: string;
    iadlScore: string;
    caregiverBurdenScore: string;
}

interface EditingElder extends NewElder {
    originalName: string;
}

export default function SettingsPage() {
    const params = useParams();
    const siteId = params.site as string;
    const [elders, setElders] = useState<Elder[]>([]);
    const [newElder, setNewElder] = useState<NewElder>({
        name: '', caseNumber: '', level: 'A', identityType: 'normal', subsidyType: 'subsidy', notes: '', familyLineId: '', customFare: '', monthlyQuota: '',
        caseSource: '', hospital: '', diagnosisDate: '', dementiaLevel: '', cdrScore: '', cmsScore: '', adlScore: '', iadlScore: '', caregiverBurdenScore: ''
    });
    const [isLoadingElders, setIsLoadingElders] = useState(true);
    const [editingElder, setEditingElder] = useState<EditingElder | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [selectedForDelete, setSelectedForDelete] = useState<Set<string>>(new Set());
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);

    useEffect(() => {
        loadElders();
    }, []);

    const loadElders = async () => {
        setIsLoadingElders(true);
        try {
            const data = await elderApi.getElders(siteId);
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
                caseNumber: newElder.caseNumber.trim(),
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
                caseSource: newElder.caseSource,
                hospital: newElder.hospital,
                diagnosisDate: newElder.diagnosisDate,
                dementiaLevel: newElder.dementiaLevel,
                cdrScore: newElder.cdrScore,
                cmsScore: newElder.cmsScore,
                adlScore: newElder.adlScore,
                iadlScore: newElder.iadlScore,
                caregiverBurdenScore: newElder.caregiverBurdenScore,
            });
            setNewElder({ name: '', caseNumber: '', level: 'A', identityType: 'normal', subsidyType: 'subsidy', notes: '', familyLineId: '', customFare: '', monthlyQuota: '',
                caseSource: '', hospital: '', diagnosisDate: '', dementiaLevel: '', cdrScore: '', cmsScore: '', adlScore: '', iadlScore: '', caregiverBurdenScore: '' });
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
            const result = await elderApi.deleteElder(name, siteId);
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

    // 批量刪除
    const toggleSelectForDelete = (name: string) => {
        setSelectedForDelete(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedForDelete.size === elders.length) {
            setSelectedForDelete(new Set());
        } else {
            setSelectedForDelete(new Set(elders.map(e => e.name)));
        }
    };

    const handleBatchDelete = async () => {
        if (selectedForDelete.size === 0) return;
        const names = Array.from(selectedForDelete);
        if (!window.confirm(`確定要刪除以下 ${names.length} 位長者嗎？\n\n${names.join('、')}\n\n⚠️ 此操作無法復原！`)) return;

        setIsBatchDeleting(true);
        let successCount = 0;
        let failCount = 0;

        for (const name of names) {
            try {
                const result = await elderApi.deleteElder(name, siteId);
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch {
                failCount++;
            }
        }

        setSelectedForDelete(new Set());
        setIsBatchDeleting(false);
        alert(`批量刪除完成！\n✅ 成功：${successCount} 位\n${failCount > 0 ? `❌ 失敗：${failCount} 位` : ''}`);
        loadElders();
    };

    const handleEditElder = (elder: Elder) => {
        setEditingElder({
            originalName: elder.name,
            name: elder.name,
            caseNumber: elder.caseNumber || '',
            level: elder.level || 'A',
            identityType: elder.identityType || 'normal',
            subsidyType: elder.subsidyType || 'subsidy',
            notes: elder.notes || '',
            familyLineId: elder.familyLineId || '',
            customFare: elder.customFare ? String(elder.customFare) : '',
            monthlyQuota: elder.monthlyQuota ? String(elder.monthlyQuota) : '',
            caseSource: elder.caseSource || '',
            hospital: elder.hospital || '',
            diagnosisDate: elder.diagnosisDate || '',
            dementiaLevel: elder.dementiaLevel || '',
            cdrScore: elder.cdrScore || '',
            cmsScore: elder.cmsScore || '',
            adlScore: elder.adlScore || '',
            iadlScore: elder.iadlScore || '',
            caregiverBurdenScore: elder.caregiverBurdenScore || '',
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
                caseNumber: editingElder.caseNumber.trim(),
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
                caseSource: editingElder.caseSource,
                hospital: editingElder.hospital,
                diagnosisDate: editingElder.diagnosisDate,
                dementiaLevel: editingElder.dementiaLevel,
                cdrScore: editingElder.cdrScore,
                cmsScore: editingElder.cmsScore,
                adlScore: editingElder.adlScore,
                iadlScore: editingElder.iadlScore,
                caregiverBurdenScore: editingElder.caregiverBurdenScore,
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">個案編號</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                placeholder="例：A11200001"
                                value={newElder.caseNumber}
                                onChange={(e) => setNewElder({ ...newElder, caseNumber: e.target.value })}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
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
                            {newElder.monthlyQuota && Number(newElder.monthlyQuota) > 0 && (
                                <p className="text-xs text-blue-600 mt-1 font-medium">
                                    💡 ${Number(newElder.monthlyQuota).toLocaleString()} ÷ $115 = 可搭 {Math.floor(Number(newElder.monthlyQuota) / 115)} 趟（{Math.floor(Number(newElder.monthlyQuota) / 115 / 2)} 來回）
                                </p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">CMS2=$3,006 / CMS3=$4,638 / CMS4=$5,574</p>
                        </div>
                    </div>
                    {/* 評估資料 */}
                    <div className="border-t border-gray-200 pt-3 mt-3">
                        <p className="text-sm font-semibold text-gray-600 mb-2">📋 評估資料</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">個案來源</label>
                                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="例：醫院轉介" value={newElder.caseSource}
                                    onChange={(e) => setNewElder({ ...newElder, caseSource: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">確診醫院</label>
                                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="例：羅東博愛醫院" value={newElder.hospital}
                                    onChange={(e) => setNewElder({ ...newElder, hospital: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">診斷書日期</label>
                                <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    value={newElder.diagnosisDate}
                                    onChange={(e) => setNewElder({ ...newElder, diagnosisDate: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">失智程度</label>
                                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    value={newElder.dementiaLevel}
                                    onChange={(e) => setNewElder({ ...newElder, dementiaLevel: e.target.value })}>
                                    <option value="">未填</option>
                                    <option value="極輕度">極輕度</option>
                                    <option value="輕度">輕度</option>
                                    <option value="中度">中度</option>
                                    <option value="重度">重度</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CDR</label>
                                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="0.5/1/2/3" value={newElder.cdrScore}
                                    onChange={(e) => setNewElder({ ...newElder, cdrScore: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CMS</label>
                                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="1~8" value={newElder.cmsScore}
                                    onChange={(e) => setNewElder({ ...newElder, cmsScore: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ADL</label>
                                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="0~100" value={newElder.adlScore}
                                    onChange={(e) => setNewElder({ ...newElder, adlScore: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">IADL</label>
                                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="0~24" value={newElder.iadlScore}
                                    onChange={(e) => setNewElder({ ...newElder, iadlScore: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">照顧者負荷</label>
                                <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                                    placeholder="分數" value={newElder.caregiverBurdenScore}
                                    onChange={(e) => setNewElder({ ...newElder, caregiverBurdenScore: e.target.value })} />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
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
                    <div className="flex items-center gap-3">
                        <h2 className="font-semibold text-gray-800">📋 長者名單</h2>
                        {selectedForDelete.size > 0 && (
                            <button
                                className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-1"
                                onClick={handleBatchDelete}
                                disabled={isBatchDeleting}
                            >
                                🗑️ {isBatchDeleting ? '刪除中...' : `批量刪除 (${selectedForDelete.size})`}
                            </button>
                        )}
                    </div>
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
                        <div className="overflow-x-auto -mx-4 px-4">
                            <table className="w-full min-w-[800px]">
                                <thead>
                                    <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                        <th className="px-2 py-3 font-medium w-10">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-400 cursor-pointer"
                                                checked={selectedForDelete.size === elders.length && elders.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="px-3 py-3 font-medium">姓名</th>
                                        <th className="px-3 py-3 font-medium">個案編號</th>
                                        <th className="px-3 py-3 font-medium">分級</th>
                                        <th className="px-3 py-3 font-medium">身份類別</th>
                                        <th className="px-3 py-3 font-medium">補助/自費</th>
                                        <th className="px-3 py-3 font-medium">車資</th>
                                        <th className="px-3 py-3 font-medium">月額度</th>
                                        <th className="px-3 py-3 font-medium">家屬 LINE</th>
                                        <th className="px-3 py-3 font-medium">評估資料</th>
                                        <th className="px-3 py-3 font-medium">備註</th>
                                        <th className="px-3 py-3 font-medium">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {elders.map((elder, i) => {
                                        const info = getLevelInfo(elder.level);
                                        const identityInfo = getIdentityInfo(elder.identityType);
                                        return (
                                            <tr key={i} className={`hover:bg-gray-50 ${selectedForDelete.has(elder.name) ? 'bg-red-50' : ''}`}>
                                                <td className="px-2 py-3">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-400 cursor-pointer"
                                                        checked={selectedForDelete.has(elder.name)}
                                                        onChange={() => toggleSelectForDelete(elder.name)}
                                                    />
                                                </td>
                                                <td className="px-3 py-3 font-medium whitespace-nowrap">{elder.name}</td>
                                                <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{elder.caseNumber || '-'}</td>
                                                <td className="px-3 py-3">
                                                    <span
                                                        className="px-2 py-1 rounded-full text-white text-xs font-medium whitespace-nowrap"
                                                        style={{ backgroundColor: info.color }}
                                                    >
                                                        {elder.level}-{info.desc}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span
                                                        className="px-2 py-1 rounded-full text-white text-xs font-medium whitespace-nowrap"
                                                        style={{ backgroundColor: identityInfo.color }}
                                                    >
                                                        {elder.identityDesc || identityInfo.desc}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${elder.subsidyType === 'self'
                                                        ? 'bg-yellow-400 text-gray-800'
                                                        : 'bg-green-500 text-white'
                                                        }`}>
                                                        {elder.subsidyType === 'self' ? '自費' : '補助'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-3 font-medium whitespace-nowrap">
                                                    {elder.customFare ? (
                                                        <span className="text-blue-600">${elder.customFare}</span>
                                                    ) : (
                                                        <span>${elder.fare !== undefined ? elder.fare : identityInfo.fare}</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    {elder.monthlyQuota ? (
                                                        <div>
                                                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                                                                ${elder.monthlyQuota.toLocaleString()}
                                                            </span>
                                                            <span className="text-[10px] text-gray-500 ml-1">
                                                                {Math.floor(elder.monthlyQuota / 115)}趟
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">不限</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {elder.familyLineId && elder.familyLineId.trim() ? (
                                                        <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">✓</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {(elder.cdrScore || elder.cmsScore || elder.dementiaLevel) ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {elder.dementiaLevel && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{elder.dementiaLevel}</span>}
                                                            {elder.cdrScore && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">CDR:{elder.cdrScore}</span>}
                                                            {elder.cmsScore && <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded">CMS:{elder.cmsScore}</span>}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3 text-gray-500 text-sm max-w-[120px] truncate">{elder.notes || '-'}</td>
                                                <td className="px-3 py-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="text-blue-500 hover:text-blue-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                                                            onClick={() => handleEditElder(elder)}
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="text-red-500 hover:text-red-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                    <div className="bg-white rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">個案編號</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="例：A11200001"
                                    value={editingElder.caseNumber}
                                    onChange={(e) => setEditingElder({ ...editingElder, caseNumber: e.target.value })}
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
                                    {editingElder.monthlyQuota && Number(editingElder.monthlyQuota) > 0 && (
                                        <p className="text-xs text-blue-600 mt-1 font-medium">
                                            💡 ${Number(editingElder.monthlyQuota).toLocaleString()} ÷ $115 = 可搭 {Math.floor(Number(editingElder.monthlyQuota) / 115)} 趟（{Math.floor(Number(editingElder.monthlyQuota) / 115 / 2)} 來回）
                                        </p>
                                    )}
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
                            {/* 評估資料 */}
                            <div className="border-t border-gray-200 pt-3">
                                <p className="text-sm font-semibold text-gray-600 mb-2">📋 評估資料</p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">個案來源</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            placeholder="例：醫院轉介" value={editingElder.caseSource}
                                            onChange={(e) => setEditingElder({ ...editingElder, caseSource: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">確診醫院</label>
                                        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            placeholder="例：羅東博愛醫院" value={editingElder.hospital}
                                            onChange={(e) => setEditingElder({ ...editingElder, hospital: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">診斷書日期</label>
                                        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            value={editingElder.diagnosisDate}
                                            onChange={(e) => setEditingElder({ ...editingElder, diagnosisDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">失智程度</label>
                                        <select className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                            value={editingElder.dementiaLevel}
                                            onChange={(e) => setEditingElder({ ...editingElder, dementiaLevel: e.target.value })}>
                                            <option value="">未填</option>
                                            <option value="極輕度">極輕度</option>
                                            <option value="輕度">輕度</option>
                                            <option value="中度">中度</option>
                                            <option value="重度">重度</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-5 gap-2">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">CDR</label>
                                        <input type="text" className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                                            placeholder="0.5/1/2/3" value={editingElder.cdrScore}
                                            onChange={(e) => setEditingElder({ ...editingElder, cdrScore: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">CMS</label>
                                        <input type="text" className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                                            placeholder="1~8" value={editingElder.cmsScore}
                                            onChange={(e) => setEditingElder({ ...editingElder, cmsScore: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">ADL</label>
                                        <input type="text" className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                                            placeholder="0~100" value={editingElder.adlScore}
                                            onChange={(e) => setEditingElder({ ...editingElder, adlScore: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">IADL</label>
                                        <input type="text" className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                                            placeholder="0~24" value={editingElder.iadlScore}
                                            onChange={(e) => setEditingElder({ ...editingElder, iadlScore: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">照顧者負荷</label>
                                        <input type="text" className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                                            placeholder="分數" value={editingElder.caregiverBurdenScore}
                                            onChange={(e) => setEditingElder({ ...editingElder, caregiverBurdenScore: e.target.value })} />
                                    </div>
                                </div>
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

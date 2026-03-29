'use client';

import { useState, useEffect, useCallback } from 'react';
import { driverApi, DriverSetting, LineUserRecord, ElderFamily } from '@/lib/api';
import { useParams } from 'next/navigation';
import {
    Truck, Heart, MessageCircle, Send, Plus, Trash2, Pencil, RefreshCw,
    Copy, CheckCircle2, XCircle, Users, Bell, HelpCircle, ChevronDown, ChevronUp,
    Smartphone, QrCode
} from 'lucide-react';

const SITE_NAMES: Record<string, string> = {
    sanxing: '三星',
    luodong: '羅東',
    dongguashan: '冬瓜山',
    jiaoxi: '礁溪',
    young: '年輕型',
    all: '所有據點',
};

export default function LineSettingsPage() {
    const params = useParams();
    const siteId = typeof params?.site === 'string' ? params.site : '';

    // ========== 司機管理 ==========
    const [drivers, setDrivers] = useState<DriverSetting[]>([]);
    const [isLoadingDrivers, setIsLoadingDrivers] = useState(true);
    const [showAddDriver, setShowAddDriver] = useState(false);
    const [newDriver, setNewDriver] = useState({ name: '', lineUserId: '', siteId: siteId, notes: '' });
    const [editingDriver, setEditingDriver] = useState<(DriverSetting & { originalName: string }) | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ========== 家屬 LINE ==========
    const [eldersFamily, setEldersFamily] = useState<ElderFamily[]>([]);
    const [isLoadingFamily, setIsLoadingFamily] = useState(true);

    // ========== LINE 用戶紀錄 ==========
    const [lineUsers, setLineUsers] = useState<LineUserRecord[]>([]);
    const [isLoadingLineUsers, setIsLoadingLineUsers] = useState(true);

    // ========== 測試發送 ==========
    const [testUserId, setTestUserId] = useState('');
    const [testBotType, setTestBotType] = useState<'driver' | 'health'>('driver');
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isSendingTest, setIsSendingTest] = useState(false);

    // ========== UI ==========
    const [activeTab, setActiveTab] = useState<'drivers' | 'family' | 'lineUsers' | 'guide'>('drivers');
    const [copiedId, setCopiedId] = useState('');
    const [showGuide, setShowGuide] = useState(false);

    const loadDrivers = useCallback(async () => {
        setIsLoadingDrivers(true);
        try {
            const data = await driverApi.getDrivers(siteId);
            setDrivers(data || []);
        } catch { /* empty */ }
        finally { setIsLoadingDrivers(false); }
    }, [siteId]);

    const loadFamily = useCallback(async () => {
        setIsLoadingFamily(true);
        try {
            const data = await driverApi.getEldersWithFamily(siteId);
            setEldersFamily(data || []);
        } catch { /* empty */ }
        finally { setIsLoadingFamily(false); }
    }, [siteId]);

    const loadLineUsers = useCallback(async () => {
        setIsLoadingLineUsers(true);
        try {
            const data = await driverApi.getLineUsers();
            setLineUsers(data || []);
        } catch { /* empty */ }
        finally { setIsLoadingLineUsers(false); }
    }, []);

    useEffect(() => {
        loadDrivers();
        loadFamily();
        loadLineUsers();
    }, [loadDrivers, loadFamily, loadLineUsers]);

    // ========== 司機 CRUD ==========
    const handleAddDriver = async () => {
        if (!newDriver.name.trim()) return alert('請輸入司機姓名');
        setIsSubmitting(true);
        try {
            const result = await driverApi.addDriver(newDriver);
            if (result.success) {
                alert('✅ 司機已新增');
                setNewDriver({ name: '', lineUserId: '', siteId: siteId, notes: '' });
                setShowAddDriver(false);
                setTimeout(loadDrivers, 1500);
            } else {
                alert(`❌ ${result.message}`);
            }
        } catch { alert('新增失敗'); }
        finally { setIsSubmitting(false); }
    };

    const handleUpdateDriver = async () => {
        if (!editingDriver) return;
        setIsSubmitting(true);
        try {
            const result = await driverApi.updateDriver({
                originalName: editingDriver.originalName,
                name: editingDriver.name,
                lineUserId: editingDriver.lineUserId,
                siteId: siteId,
                enabled: editingDriver.enabled,
                notes: editingDriver.notes,
            });
            if (result.success) {
                alert('✅ 司機已更新');
                setEditingDriver(null);
                setTimeout(loadDrivers, 1500);
            } else {
                alert(`❌ ${result.message}`);
            }
        } catch { alert('更新失敗'); }
        finally { setIsSubmitting(false); }
    };

    const handleDeleteDriver = async (name: string) => {
        if (!confirm(`確定要刪除司機「${name}」嗎？`)) return;
        try {
            const result = await driverApi.deleteDriver(name);
            if (result.success) {
                alert('✅ 已刪除');
                loadDrivers();
            } else {
                alert(`❌ ${result.message}`);
            }
        } catch { alert('刪除失敗'); }
    };

    // ========== 測試發送 ==========
    const handleTestSend = async () => {
        if (!testUserId.trim()) return alert('請輸入 User ID');
        setIsSendingTest(true);
        setTestResult(null);
        try {
            const result = await driverApi.testSendLine(testUserId.trim(), testBotType);
            setTestResult({
                success: result.success,
                message: result.success ? '✅ 訊息已發送！請檢查 LINE' : `❌ ${result.message || result.error || '發送失敗'}`,
            });
        } catch {
            setTestResult({ success: false, message: '❌ 發送失敗' });
        } finally {
            setIsSendingTest(false);
        }
    };

    // ========== 複製 User ID ==========
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(text);
        setTimeout(() => setCopiedId(''), 2000);
    };

    // ========== Tab 定義 ==========
    const tabs = [
        { key: 'drivers' as const, label: '司機設定', icon: Truck, count: drivers.length },
        { key: 'family' as const, label: '家屬 LINE', icon: Heart, count: eldersFamily.filter(e => e.familyLineId).length },
        { key: 'lineUsers' as const, label: 'User ID 紀錄', icon: Users, count: lineUsers.length },
        { key: 'guide' as const, label: '使用教學', icon: HelpCircle },
    ];

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            {/* 頁面標題 */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Bell className="w-6 h-6 text-sky-600" />
                    LINE 通知設定
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                    管理 <span className="font-semibold text-sky-700">{SITE_NAMES[siteId] || siteId}</span> 據點的司機與家屬 LINE 通知
                </p>
            </div>

            {/* 自動通知說明卡 */}
            <div className="bg-gradient-to-r from-sky-50 to-green-50 rounded-xl p-4 mb-6 border border-sky-100">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-sky-100 rounded-lg shrink-0">
                        <MessageCircle className="w-5 h-5 text-sky-600" />
                    </div>
                    <div className="text-sm">
                        <p className="font-semibold text-gray-800 mb-1">📅 每兩週自動推送通知</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600">
                            <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-sky-500 shrink-0" />
                                <span><strong>隔週六 20:00</strong>・司機薪資 Flex 卡片</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-rose-500 shrink-0" />
                                <span><strong>隔週日 10:00</strong>・家屬血壓報告卡片</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab 導航 */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 overflow-x-auto">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex-1 justify-center ${activeTab === tab.key
                                ? 'bg-white text-sky-700 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                            <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            {tab.count !== undefined && (
                                <span className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.key ? 'bg-sky-100 text-sky-700' : 'bg-gray-200 text-gray-500'
                                    }`}>{tab.count}</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ========== 司機設定 Tab ========== */}
            {activeTab === 'drivers' && (
                <div className="space-y-4">
                    {/* 新增司機按鈕 */}
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-sky-600" />
                            {SITE_NAMES[siteId] || siteId}據點 司機名單
                        </h2>
                        <div className="flex gap-2">
                            <button onClick={loadDrivers} className="text-gray-500 hover:text-sky-600 p-2 rounded-lg hover:bg-sky-50 transition-colors">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowAddDriver(!showAddDriver)}
                                className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm font-medium transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                新增司機
                            </button>
                        </div>
                    </div>

                    {/* 新增表單 */}
                    {showAddDriver && (
                        <div className="bg-white rounded-xl border-2 border-sky-200 shadow-sm overflow-hidden">
                            <div className="bg-sky-50 px-4 py-3 flex items-center gap-2 border-b border-sky-100">
                                <Plus className="w-4 h-4 text-sky-600" />
                                <span className="font-semibold text-sky-800 text-sm">新增司機</span>
                            </div>
                            <div className="p-4 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">司機姓名 *</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-base"
                                            placeholder="例如：王大明"
                                            value={newDriver.name}
                                            onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            LINE User ID
                                            <button onClick={() => setShowGuide(!showGuide)} className="ml-1 text-sky-500 hover:text-sky-700">
                                                <HelpCircle className="w-3.5 h-3.5 inline" />
                                            </button>
                                        </label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono text-sm"
                                            placeholder="U1234567890abcdef..."
                                            value={newDriver.lineUserId}
                                            onChange={(e) => setNewDriver({ ...newDriver, lineUserId: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">服務據點</label>
                                        <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium">
                                            📍 {SITE_NAMES[siteId] || siteId}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">依當前登入據點自動設定</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                                            placeholder="選填"
                                            value={newDriver.notes}
                                            onChange={(e) => setNewDriver({ ...newDriver, notes: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {showGuide && (
                                    <div className="bg-amber-50 rounded-lg p-3 text-sm text-amber-800 border border-amber-200">
                                        <p className="font-medium mb-1">📱 如何取得 LINE User ID？</p>
                                        <ol className="list-decimal list-inside space-y-1 text-xs">
                                            <li>請司機加入「<strong>司機通知 Bot</strong>」（@079rshsc）為好友</li>
                                            <li>在聊天視窗隨意傳送任一訊息</li>
                                            <li>Bot 會自動回覆 User ID（U 開頭的長字串）</li>
                                            <li>複製 User ID 填入上方欄位</li>
                                        </ol>
                                    </div>
                                )}

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        onClick={() => setShowAddDriver(false)}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                                    >
                                        取消
                                    </button>
                                    <button
                                        onClick={handleAddDriver}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 text-sm font-medium"
                                    >
                                        {isSubmitting ? '新增中...' : '✅ 確認新增'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 司機列表 */}
                    {isLoadingDrivers ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-sky-500 border-t-transparent"></div>
                            <p className="mt-2 text-gray-500 text-sm">載入中...</p>
                        </div>
                    ) : drivers.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">尚未新增司機</p>
                            <p className="text-gray-400 text-sm mt-1">點擊「新增司機」開始設定</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {drivers.map((driver, i) => (
                                <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${driver.enabled ? 'bg-sky-500' : 'bg-gray-400'}`}>
                                                    {driver.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-800">{driver.name}</span>
                                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${driver.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                            {driver.enabled ? '✅ 啟用' : '⏸️ 暫停'}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-500 mt-0.5">
                                                        📍 {SITE_NAMES[driver.siteId] || driver.siteId}
                                                        {driver.notes && ` · ${driver.notes}`}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => setEditingDriver({ ...driver, originalName: driver.name })}
                                                    className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteDriver(driver.name)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        {/* LINE User ID */}
                                        <div className="mt-3 flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                            <MessageCircle className="w-4 h-4 text-green-500 shrink-0" />
                                            {driver.lineUserId ? (
                                                <>
                                                    <code className="text-xs text-gray-600 truncate flex-1">{driver.lineUserId}</code>
                                                    <button
                                                        onClick={() => copyToClipboard(driver.lineUserId)}
                                                        className="text-gray-400 hover:text-sky-600 shrink-0"
                                                    >
                                                        {copiedId === driver.lineUserId ? (
                                                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => { setTestUserId(driver.lineUserId); setTestBotType('driver'); setActiveTab('drivers'); }}
                                                        className="text-xs text-sky-600 hover:text-sky-800 font-medium whitespace-nowrap"
                                                    >
                                                        測試
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="text-xs text-amber-600">⚠️ 尚未設定 LINE User ID</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* 測試發送區 */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
                        <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
                            <Send className="w-4 h-4 text-sky-600" />
                            <span className="font-semibold text-gray-800 text-sm">測試訊息發送</span>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">LINE User ID</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono text-sm"
                                        placeholder="U1234567890abcdef..."
                                        value={testUserId}
                                        onChange={(e) => setTestUserId(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bot 類型</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                                        value={testBotType}
                                        onChange={(e) => setTestBotType(e.target.value as 'driver' | 'health')}
                                    >
                                        <option value="driver">🚗 司機通知 Bot</option>
                                        <option value="health">❤️ 健康/家屬 Bot</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleTestSend}
                                    disabled={isSendingTest || !testUserId.trim()}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                    {isSendingTest ? '發送中...' : '發送測試訊息'}
                                </button>
                                {testResult && (
                                    <span className={`text-sm flex items-center gap-1 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                        {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                                        {testResult.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ========== 家屬 LINE Tab ========== */}
            {activeTab === 'family' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Heart className="w-5 h-5 text-rose-500" />
                            家屬 LINE 通知設定
                        </h2>
                        <button onClick={loadFamily} className="text-gray-500 hover:text-sky-600 p-2 rounded-lg hover:bg-sky-50 transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 text-sm text-amber-800">
                        <p className="font-medium flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4" />
                            家屬 LINE ID 在哪裡設定？
                        </p>
                        <p className="mt-1 text-xs">
                            前往 <strong>「設定 → 長者管理」</strong>，在每位長者的資料中填寫「<strong>家屬 LINE ID</strong>」欄位。
                            填寫後系統會每兩週自動發送血壓健康報告給家屬。
                        </p>
                        <p className="mt-1 text-xs">
                            📱 家屬需先加入「<strong>健康通知 Bot</strong>」（@618gzkhw）為好友，傳送任意訊息取得 User ID。
                        </p>
                    </div>

                    {isLoadingFamily ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-rose-500 border-t-transparent"></div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[400px]">
                                    <thead>
                                        <tr className="bg-gray-50 text-left text-sm text-gray-600">
                                            <th className="px-4 py-3 font-medium">長者姓名</th>
                                            <th className="px-4 py-3 font-medium">分級</th>
                                            <th className="px-4 py-3 font-medium">家屬 LINE ID</th>
                                            <th className="px-4 py-3 font-medium">狀態</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {eldersFamily.map((elder, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-800">{elder.name}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${elder.level === 'A' ? 'bg-green-500' : elder.level === 'B' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                                        {elder.level}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {elder.familyLineId ? (
                                                        <div className="flex items-center gap-2">
                                                            <code className="text-xs text-gray-600 truncate max-w-[180px]">{elder.familyLineId}</code>
                                                            <button onClick={() => copyToClipboard(elder.familyLineId)} className="text-gray-400 hover:text-sky-600 shrink-0">
                                                                {copiedId === elder.familyLineId ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">未設定</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {elder.familyLineId ? (
                                                        <span className="flex items-center gap-1 text-green-600 text-xs font-medium">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            已設定
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            未設定
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
                                共 {eldersFamily.length} 位長者，{eldersFamily.filter(e => e.familyLineId).length} 位已設定家屬 LINE
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ========== LINE 用戶紀錄 Tab ========== */}
            {activeTab === 'lineUsers' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-600" />
                            LINE User ID 紀錄
                        </h2>
                        <button onClick={loadLineUsers} className="text-gray-500 hover:text-sky-600 p-2 rounded-lg hover:bg-sky-50 transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200 text-sm text-blue-800">
                        <p className="font-medium">📋 這是什麼？</p>
                        <p className="mt-1 text-xs">
                            當使用者首次加入 LINE Bot 並傳送訊息時，系統會自動記錄其 User ID。
                            您可以從這裡複製 User ID，貼到司機設定或長者資料的家屬 LINE 欄位。
                        </p>
                    </div>

                    {isLoadingLineUsers ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                        </div>
                    ) : lineUsers.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">尚無 User ID 紀錄</p>
                            <p className="text-gray-400 text-sm mt-1">請讓司機/家屬加入 Bot 並傳送訊息</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lineUsers.map((user, i) => (
                                <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs text-gray-400">
                                                    {user.time ? new Date(user.time).toLocaleString('zh-TW') : '未知時間'}
                                                </span>
                                                {user.processed === '是' && (
                                                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">已處理</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <code className="text-sm font-mono text-gray-800 bg-gray-50 px-2 py-1 rounded truncate">{user.userId}</code>
                                                <button
                                                    onClick={() => copyToClipboard(user.userId)}
                                                    className="text-gray-400 hover:text-sky-600 shrink-0 p-1"
                                                >
                                                    {copiedId === user.userId ? (
                                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                    ) : (
                                                        <Copy className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>
                                            {user.message && (
                                                <p className="text-xs text-gray-500 mt-1 truncate">
                                                    💬 {user.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ========== 使用教學 Tab ========== */}
            {activeTab === 'guide' && (
                <div className="space-y-4">
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-amber-500" />
                        使用教學
                    </h2>

                    {/* 司機 Bot 設定 */}
                    <GuideCard
                        icon={<Truck className="w-5 h-5 text-sky-600" />}
                        title="🚗 司機通知設定步驟"
                        color="sky"
                        steps={[
                            { icon: <QrCode className="w-4 h-4" />, text: '請司機用 LINE 搜尋 @079rshsc 或掃描 QR Code 加入「司機通知 Bot」' },
                            { icon: <Smartphone className="w-4 h-4" />, text: '加入後，在聊天視窗隨意傳送一則訊息（如：你好）' },
                            { icon: <MessageCircle className="w-4 h-4" />, text: 'Bot 會自動回覆 User ID（格式為 U 開頭 + 32 字元）' },
                            { icon: <Copy className="w-4 h-4" />, text: '複製 User ID，到「司機設定」Tab 新增司機並貼上' },
                            { icon: <Send className="w-4 h-4" />, text: '設定完成！系統每兩週六 20:00 自動發送薪資 Flex 卡片' },
                        ]}
                    />

                    {/* 家屬 Bot 設定 */}
                    <GuideCard
                        icon={<Heart className="w-5 h-5 text-rose-500" />}
                        title="❤️ 家屬血壓通知設定步驟"
                        color="rose"
                        steps={[
                            { icon: <QrCode className="w-4 h-4" />, text: '請家屬用 LINE 搜尋 @618gzkhw 或掃描 QR Code 加入「健康通知 Bot」' },
                            { icon: <Smartphone className="w-4 h-4" />, text: '加入後，在聊天視窗傳送任意訊息取得 User ID' },
                            { icon: <Copy className="w-4 h-4" />, text: '複製 User ID' },
                            { icon: <Users className="w-4 h-4" />, text: '到「設定 → 長者管理」，編輯該長者，貼上「家屬 LINE ID」' },
                            { icon: <Send className="w-4 h-4" />, text: '設定完成！系統每兩週日 10:00 自動發送血壓報告給家屬' },
                        ]}
                    />

                    {/* Bot 資訊 */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                        <h3 className="font-semibold text-gray-800 text-sm mb-3">📌 LINE Bot 資訊</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="bg-sky-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Truck className="w-4 h-4 text-sky-600" />
                                    <span className="font-medium text-sky-800 text-sm">司機通知 Bot</span>
                                </div>
                                <p className="text-xs text-sky-700 font-mono">LINE ID：@079rshsc</p>
                                <p className="text-xs text-sky-600 mt-1">• 每兩週發送薪資 Flex 卡片</p>
                                <p className="text-xs text-sky-600">• 支援查詢載送名單</p>
                            </div>
                            <div className="bg-rose-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Heart className="w-4 h-4 text-rose-600" />
                                    <span className="font-medium text-rose-800 text-sm">健康/家屬通知 Bot</span>
                                </div>
                                <p className="text-xs text-rose-700 font-mono">LINE ID：@618gzkhw</p>
                                <p className="text-xs text-rose-600 mt-1">• 每兩週發送血壓報告給家屬</p>
                                <p className="text-xs text-rose-600">• 包含統計圖表與分級評估</p>
                            </div>
                        </div>
                    </div>

                    {/* 常見問題 */}
                    <FaqSection />
                </div>
            )}

            {/* ========== 編輯司機 Modal ========== */}
            {editingDriver && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full shadow-xl">
                        <div className="bg-sky-600 text-white px-4 py-3 rounded-t-xl flex justify-between items-center">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Pencil className="w-4 h-4" />
                                編輯司機
                            </h3>
                            <button className="text-white/80 hover:text-white" onClick={() => setEditingDriver(null)}>✕</button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">司機姓名 *</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base"
                                    value={editingDriver.name}
                                    onChange={(e) => setEditingDriver({ ...editingDriver, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">LINE User ID</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                                    placeholder="U1234567890abcdef..."
                                    value={editingDriver.lineUserId}
                                    onChange={(e) => setEditingDriver({ ...editingDriver, lineUserId: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">服務據點</label>
                                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm font-medium">
                                        📍 {SITE_NAMES[siteId] || siteId}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">啟用通知</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        value={editingDriver.enabled ? 'yes' : 'no'}
                                        onChange={(e) => setEditingDriver({ ...editingDriver, enabled: e.target.value === 'yes' })}
                                    >
                                        <option value="yes">✅ 啟用</option>
                                        <option value="no">⏸️ 暫停</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    placeholder="選填"
                                    value={editingDriver.notes || ''}
                                    onChange={(e) => setEditingDriver({ ...editingDriver, notes: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="px-4 py-3 bg-gray-50 rounded-b-xl flex justify-end gap-3">
                            <button className="px-4 py-2 text-gray-600 hover:text-gray-800" onClick={() => setEditingDriver(null)}>取消</button>
                            <button
                                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50 font-medium"
                                onClick={handleUpdateDriver}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? '更新中...' : '💾 儲存變更'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ===================================================
// 子元件
// ===================================================

function GuideCard({ icon, title, color, steps }: {
    icon: React.ReactNode;
    title: string;
    color: string;
    steps: { icon: React.ReactNode; text: string }[];
}) {
    const [isOpen, setIsOpen] = useState(true);
    const bgColor = color === 'sky' ? 'bg-sky-50 border-sky-200' : 'bg-rose-50 border-rose-200';
    const headerBg = color === 'sky' ? 'hover:bg-sky-100/50' : 'hover:bg-rose-100/50';
    const stepColor = color === 'sky' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700';
    const lineColor = color === 'sky' ? 'border-sky-200' : 'border-rose-200';

    return (
        <div className={`rounded-xl border ${bgColor} overflow-hidden`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 flex items-center justify-between ${headerBg} transition-colors`}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-semibold text-gray-800 text-sm">{title}</span>
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {isOpen && (
                <div className="px-4 pb-4">
                    <div className="space-y-3">
                        {steps.map((step, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className={`w-7 h-7 rounded-full ${stepColor} flex items-center justify-center shrink-0 text-sm font-bold`}>
                                    {i + 1}
                                </div>
                                {i < steps.length - 1 && (
                                    <div className={`absolute ml-3.5 mt-7 w-px h-4 border-l ${lineColor}`} />
                                )}
                                <div className="flex items-center gap-2 pt-1">
                                    <span className="text-gray-400">{step.icon}</span>
                                    <p className="text-sm text-gray-700" dangerouslySetInnerHTML={{ __html: step.text }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

function FaqSection() {
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const faqs = [
        {
            q: '司機/家屬怎麼找不到 Bot？',
            a: '請確認搜尋時加上 @ 符號。司機 Bot 搜尋 @079rshsc，家屬 Bot 搜尋 @618gzkhw。也可以請管理員提供 QR Code 掃描加入。',
        },
        {
            q: 'User ID 跟 LINE ID 有什麼不同？',
            a: 'LINE ID 是使用者自訂的帳號名稱（如 @john123），而 User ID 是 LINE 系統分配的唯一識別碼（U 開頭 + 32 字元），兩者不同。系統需要的是 User ID。',
        },
        {
            q: '設定完成後多久會收到通知？',
            a: '司機薪資：每隔兩週六晚上 8 點自動發送。家屬血壓報告：每隔兩週日上午 10 點自動發送。你也可以在「測試發送」區域立即發送測試訊息確認。',
        },
        {
            q: '家屬收到的報告包含什麼內容？',
            a: '包含長者近兩週的血壓統計（平均值、中位數、最高/最低值）、血壓分級評估（正常/偏高/高血壓等）、近期量測紀錄、以及心率資料。',
        },
        {
            q: '可以暫停通知嗎？',
            a: '可以！在司機設定中將「啟用通知」改為「暫停」即可。家屬通知則是清空長者資料中的「家屬 LINE ID」欄位。',
        },
    ];

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
                <h3 className="font-semibold text-gray-800 text-sm">❓ 常見問題</h3>
            </div>
            <div className="divide-y divide-gray-100">
                {faqs.map((faq, i) => (
                    <div key={i}>
                        <button
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                            onClick={() => setOpenIdx(openIdx === i ? null : i)}
                        >
                            <span className="text-sm font-medium text-gray-700">{faq.q}</span>
                            {openIdx === i ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                        </button>
                        {openIdx === i && (
                            <div className="px-4 pb-3 text-sm text-gray-600">{faq.a}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

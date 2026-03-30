'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { financeRecordApi, FinanceRecordItem, FinanceAutoFillData, BudgetItem, ReimbursementItem } from '@/lib/api';
import { SITES } from '@/config/sites';
import { Plus, Trash2, Copy, DollarSign, TrendingUp, TrendingDown, FileText, PiggyBank, RefreshCw, Lock, LogOut, Zap } from 'lucide-react';

// ===== 管理帳號密碼（全據點共用） =====
const FINANCE_ACCOUNT = 'gigi0982';
const FINANCE_PASSWORD = 'kimi0915';
const SESSION_KEY = 'finance_auth';

// 支出分類
const EXPENSE_CATEGORIES = [
    { value: '員工薪資', label: '💼 員工薪資', fixed: true },
    { value: '房租', label: '🏠 房租', fixed: true },
    { value: '水電費', label: '💡 水電費', fixed: true },
    { value: '網路費', label: '🌐 網路費', fixed: true },
    { value: '材料費', label: '🎨 材料費', fixed: false },
    { value: '便當費', label: '🍱 便當費', fixed: false },
    { value: '保險費', label: '🛡️ 保險費', fixed: true },
    { value: '清潔費', label: '🧹 清潔費', fixed: true },
    { value: '交通費', label: '🚗 交通費', fixed: false },
    { value: '文具用品', label: '📎 文具用品', fixed: false },
    { value: '維修費', label: '🔧 維修費', fixed: false },
    { value: '雜支', label: '📋 雜支', fixed: false },
];

// 收入（預算）分類
const BUDGET_CATEGORIES = [
    '長照補助',
    '社會局補助',
    '衛生局補助',
    '自籌款',
    '其他補助',
];

type TabType = 'expense' | 'income' | 'overview';

// ========================================
// 登入畫面元件
// ========================================
function LoginScreen({ siteId, siteName, onLogin }: { siteId: string; siteName: string; onLogin: () => void }) {
    const [account, setAccount] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = () => {
        const inputAccount = account.trim();
        const inputPassword = password.trim();
        if (inputAccount === FINANCE_ACCOUNT && inputPassword === FINANCE_PASSWORD) {
            try { sessionStorage.setItem(SESSION_KEY, 'true'); } catch { /* */ }
            onLogin();
        } else {
            setError('帳號或密碼錯誤');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Lock className="w-8 h-8 text-emerald-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">收支管理系統</h2>
                        <p className="text-sm text-gray-500 mt-1">請輸入管理帳號密碼</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">帳號</label>
                            <input
                                type="text"
                                value={account}
                                onChange={e => { setAccount(e.target.value); setError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                placeholder="請輸入帳號"
                                autoComplete="username"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                placeholder="請輸入密碼"
                                autoComplete="current-password"
                            />
                        </div>
                        {error && (
                            <p className="text-red-500 text-sm text-center">{error}</p>
                        )}
                        <button
                            onClick={handleLogin}
                            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition"
                        >
                            登入
                        </button>
                    </div>
                    <div className="mt-4 text-center">
                        <Link href={`/${siteId}`} className="text-sm text-gray-400 hover:text-gray-600">
                            ← 返回{siteName}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

// 有 sheetId 的據點（排除 young 等尚未配置的）
const FINANCE_SITES = Object.values(SITES).filter(s => s.sheetId);

// ========================================
// 主內容元件（已登入才渲染）
// ========================================
function FinanceContent({ siteId, onLogout }: { siteId: string; onLogout: () => void }) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<TabType>('expense');
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const currentYear = selectedMonth.split('-')[0];

    // 支出
    const [records, setRecords] = useState<FinanceRecordItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newRecord, setNewRecord] = useState({
        date: new Date().toISOString().split('T')[0],
        category: '員工薪資',
        description: '',
        amount: '',
    });

    // 收入/預算
    const [budgets, setBudgets] = useState<BudgetItem[]>([]);
    const [reimbursements, setReimbursements] = useState<ReimbursementItem[]>([]);
    const [showBudgetForm, setShowBudgetForm] = useState(false);
    const [showReimburseForm, setShowReimburseForm] = useState(false);
    const [newBudget, setNewBudget] = useState({ category: '長照補助', approvedAmount: '', description: '' });
    const [newReimburse, setNewReimburse] = useState({ category: '長照補助', amount: '', description: '', date: new Date().toISOString().split('T')[0] });

    const [isSaving, setIsSaving] = useState(false);
    const [isCopying, setIsCopying] = useState(false);
    const [message, setMessage] = useState('');

    // 自動帶入
    const [autoFillData, setAutoFillData] = useState<FinanceAutoFillData | null>(null);
    const [showAutoFill, setShowAutoFill] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [autoFillChecked, setAutoFillChecked] = useState({
        mealIncome: true,
        elderTransport: true,
        transportSubsidy: true,
        driverSalary: true,
    });

    const loadExpenses = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await financeRecordApi.getRecords(siteId, selectedMonth);
            setRecords(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('載入失敗:', err);
            setRecords([]);
        } finally {
            setIsLoading(false);
        }
    }, [siteId, selectedMonth]);

    const loadBudget = useCallback(async () => {
        try {
            const data = await financeRecordApi.getBudget(siteId, currentYear);
            setBudgets(data.budgets || []);
            setReimbursements(data.reimbursements || []);
        } catch (err) {
            console.error('載入預算失敗:', err);
        }
    }, [siteId, currentYear]);

    useEffect(() => { loadExpenses(); }, [loadExpenses]);
    useEffect(() => { loadBudget(); }, [loadBudget]);

    // 新增支出
    const handleAddExpense = async () => {
        if (!newRecord.amount || Number(newRecord.amount) <= 0) {
            setMessage('❌ 請輸入金額');
            return;
        }
        setIsSaving(true);
        try {
            await financeRecordApi.addRecord({
                siteId,
                date: newRecord.date,
                type: 'expense',
                category: newRecord.category,
                description: newRecord.description,
                amount: Number(newRecord.amount),
                createdBy: '管理者',
            });
            setMessage('✅ 已新增支出紀錄');
            setShowAddForm(false);
            setNewRecord({ date: new Date().toISOString().split('T')[0], category: '員工薪資', description: '', amount: '' });
            loadExpenses();
        } catch {
            setMessage('❌ 新增失敗');
        } finally {
            setIsSaving(false);
        }
    };

    // 刪除
    const handleDelete = async (record: FinanceRecordItem) => {
        if (!confirm(`確定刪除「${record.category} - ${record.description || ''} $${record.amount.toLocaleString()}」？`)) return;
        try {
            await financeRecordApi.deleteRecord(siteId, record.id);
            setMessage('✅ 已刪除');
            loadExpenses();
        } catch {
            setMessage('❌ 刪除失敗');
        }
    };

    // 與上月相同
    const handleCopyLastMonth = async () => {
        if (!confirm(`將複製上月的固定支出項目（薪資、房租、水電等）到 ${selectedMonth.replace('-', '年')}月，確定嗎？`)) return;
        setIsCopying(true);
        try {
            const result = await financeRecordApi.copyLastMonth(siteId, selectedMonth, '管理者');
            setMessage(`✅ ${result.message}`);
            loadExpenses();
        } catch {
            setMessage('❌ 複製失敗');
        } finally {
            setIsCopying(false);
        }
    };

    // 自動帶入（從快速登記計算）
    const handleAutoFillLoad = async () => {
        setIsAutoFilling(true);
        try {
            const data = await financeRecordApi.getAutoFill(siteId, selectedMonth);
            if (data && data.success) {
                setAutoFillData(data);
                setShowAutoFill(true);
                setAutoFillChecked({
                    mealIncome: true,
                    elderTransport: true,
                    transportSubsidy: true,
                    driverSalary: true,
                });
            } else {
                setMessage('❌ 無法取得自動帶入資料');
            }
        } catch {
            setMessage('❌ 載入自動帶入資料失敗');
        } finally {
            setIsAutoFilling(false);
        }
    };

    const handleAutoFillConfirm = async () => {
        if (!autoFillData) return;
        setIsAutoFilling(true);
        const lastDay = new Date(Number(selectedMonth.split('-')[0]), Number(selectedMonth.split('-')[1]), 0).getDate();
        const recordDate = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`; // 用月底日期

        try {
            const promises: Promise<{ success: boolean; message: string }>[] = [];

            if (autoFillChecked.mealIncome && autoFillData.mealIncome > 0) {
                promises.push(financeRecordApi.addRecord({
                    siteId, date: recordDate, type: 'income',
                    category: '長輩自付額（餐費）',
                    description: `${selectedMonth} 用餐 ${autoFillData.mealCount} 人次 × $${autoFillData.rates.mealPrice}`,
                    amount: autoFillData.mealIncome,
                    createdBy: '系統帶入',
                }));
            }

            if (autoFillChecked.elderTransport && autoFillData.elderTransportIncome > 0) {
                promises.push(financeRecordApi.addRecord({
                    siteId, date: recordDate, type: 'income',
                    category: '長輩自付額（交通）',
                    description: `${selectedMonth} 搭車 ${autoFillData.transportTripCount} 趟次 × $${autoFillData.rates.transportNormal}`,
                    amount: autoFillData.elderTransportIncome,
                    createdBy: '系統帶入',
                }));
            }

            if (autoFillChecked.transportSubsidy && autoFillData.transportSubsidy > 0) {
                promises.push(financeRecordApi.addRecord({
                    siteId, date: recordDate, type: 'income',
                    category: '交通申請補助款',
                    description: `${selectedMonth} BD03補助 ${autoFillData.transportTripCount} 趟次 × $${autoFillData.rates.BD03_RATE}`,
                    amount: autoFillData.transportSubsidy,
                    createdBy: '系統帶入',
                }));
            }

            if (autoFillChecked.driverSalary && autoFillData.driverSalaryExpense > 0) {
                promises.push(financeRecordApi.addRecord({
                    siteId, date: recordDate, type: 'expense',
                    category: '駕駛薪資',
                    description: `${selectedMonth} 接送 ${autoFillData.transportPersonCount} 人次 × $${autoFillData.rates.driverSalaryPerTrip}`,
                    amount: autoFillData.driverSalaryExpense,
                    createdBy: '系統帶入',
                }));
            }

            await Promise.all(promises);
            setMessage(`✅ 已自動帶入 ${promises.length} 筆紀錄`);
            setShowAutoFill(false);
            setAutoFillData(null);
            loadExpenses();
        } catch {
            setMessage('❌ 自動帶入失敗');
        } finally {
            setIsAutoFilling(false);
        }
    };

    // 新增年度預算
    const handleAddBudget = async () => {
        if (!newBudget.approvedAmount || Number(newBudget.approvedAmount) <= 0) {
            setMessage('❌ 請輸入核定金額');
            return;
        }
        setIsSaving(true);
        try {
            await financeRecordApi.saveBudget({
                siteId,
                year: currentYear,
                category: newBudget.category,
                approvedAmount: Number(newBudget.approvedAmount),
                description: newBudget.description,
                createdBy: '管理者',
            });
            setMessage('✅ 預算已儲存');
            setShowBudgetForm(false);
            setNewBudget({ category: '長照補助', approvedAmount: '', description: '' });
            loadBudget();
        } catch {
            setMessage('❌ 儲存失敗');
        } finally {
            setIsSaving(false);
        }
    };

    // 新增核銷
    const handleAddReimburse = async () => {
        if (!newReimburse.amount || Number(newReimburse.amount) <= 0) {
            setMessage('❌ 請輸入核銷金額');
            return;
        }
        setIsSaving(true);
        try {
            await financeRecordApi.addReimbursement({
                siteId,
                year: currentYear,
                category: newReimburse.category,
                amount: Number(newReimburse.amount),
                description: newReimburse.description,
                date: newReimburse.date,
                createdBy: '管理者',
            });
            setMessage('✅ 核銷紀錄已新增');
            setShowReimburseForm(false);
            setNewReimburse({ category: '長照補助', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
            loadBudget();
        } catch {
            setMessage('❌ 新增失敗');
        } finally {
            setIsSaving(false);
        }
    };

    // 計算
    const expenseRecords = records.filter(r => r.type === 'expense');
    const incomeRecords = records.filter(r => r.type === 'income');
    const totalExpense = expenseRecords.reduce((s, r) => s + r.amount, 0);
    const totalIncome = incomeRecords.reduce((s, r) => s + r.amount, 0);

    const expenseByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        expenseRecords.forEach(r => {
            map[r.category] = (map[r.category] || 0) + r.amount;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [expenseRecords]);

    const budgetSummary = useMemo(() => {
        return budgets.map(b => {
            const used = reimbursements.filter(r => r.category === b.category).reduce((s, r) => s + r.amount, 0);
            return { ...b, used, remaining: b.approvedAmount - used, percentage: b.approvedAmount > 0 ? Math.round((used / b.approvedAmount) * 100) : 0 };
        });
    }, [budgets, reimbursements]);

    const totalBudget = budgets.reduce((s, b) => s + b.approvedAmount, 0);
    const totalUsed = budgetSummary.reduce((s, b) => s + b.used, 0);

    const monthOptions = useMemo(() => {
        const opts = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        return opts;
    }, []);

    useEffect(() => {
        if (message) {
            const t = setTimeout(() => setMessage(''), 3000);
            return () => clearTimeout(t);
        }
    }, [message]);

    const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
        { key: 'expense', label: '支出', icon: <TrendingDown className="w-4 h-4" /> },
        { key: 'income', label: '收入/預算', icon: <TrendingUp className="w-4 h-4" /> },
        { key: 'overview', label: '總覽', icon: <FileText className="w-4 h-4" /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3">
                <div className="max-w-2xl mx-auto">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            <h1 className="text-lg font-bold">收支管理</h1>
                        </div>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-1 text-white/70 hover:text-white text-xs bg-white/15 hover:bg-white/25 px-2.5 py-1.5 rounded-lg transition"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            登出
                        </button>
                    </div>
                    {/* 據點快速切換 */}
                    <div className="flex gap-1.5 mt-2.5 overflow-x-auto pb-0.5">
                        {FINANCE_SITES.map(site => (
                            <button
                                key={site.id}
                                onClick={() => {
                                    if (site.id !== siteId) {
                                        router.push(`/${site.id}/finance`);
                                    }
                                }}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    site.id === siteId
                                        ? 'bg-white text-emerald-700 shadow-sm'
                                        : 'bg-white/20 text-white/90 hover:bg-white/30'
                                }`}
                            >
                                <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: site.color }} />
                                {site.name.replace('樂智據點', '')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 訊息 */}
            {message && (
                <div className="max-w-2xl mx-auto px-4 pt-3">
                    <div className={`p-3 rounded-lg text-sm font-medium ${message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="max-w-2xl mx-auto px-4 pt-4">
                <div className="flex bg-white rounded-xl shadow-sm p-1 gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.key
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 pt-4">
                {/* ========== 支出 Tab ========== */}
                {activeTab === 'expense' && (
                    <>
                        {/* 月份選擇 + 操作 */}
                        <div className="flex items-center gap-2 mb-4">
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="flex-1 p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium"
                            >
                                {monthOptions.map(m => (
                                    <option key={m} value={m}>{m.replace('-', '年')}月</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAutoFillLoad}
                                disabled={isAutoFilling}
                                className="flex items-center gap-1 px-3 py-2.5 bg-violet-500 text-white rounded-lg text-sm font-medium hover:bg-violet-600 disabled:opacity-50 whitespace-nowrap"
                            >
                                <Zap className="w-4 h-4" />
                                {isAutoFilling ? '計算中...' : '自動帶入'}
                            </button>
                            <button
                                onClick={handleCopyLastMonth}
                                disabled={isCopying}
                                className="flex items-center gap-1 px-3 py-2.5 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50 whitespace-nowrap"
                            >
                                <Copy className="w-4 h-4" />
                                {isCopying ? '複製中...' : '與上月相同'}
                            </button>
                            <button
                                onClick={() => setShowAddForm(true)}
                                className="flex items-center gap-1 px-3 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4" />
                                新增
                            </button>
                        </div>

                        {/* 月支出合計 */}
                        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 text-sm">本月支出合計</span>
                                <span className="text-2xl font-bold text-red-600">${totalExpense.toLocaleString()}</span>
                            </div>
                            {expenseByCategory.length > 0 && (
                                <div className="mt-3 pt-3 border-t space-y-1.5">
                                    {expenseByCategory.map(([cat, amt]) => (
                                        <div key={cat} className="flex justify-between text-sm">
                                            <span className="text-gray-600">{EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat}</span>
                                            <span className="font-medium text-gray-800">${amt.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 自動帶入預覽 */}
                        {showAutoFill && autoFillData && (
                            <div className="bg-violet-50 border-2 border-violet-300 rounded-xl p-4 mb-4">
                                <div className="font-bold text-violet-800 mb-1">⚡ 自動帶入預覽</div>
                                <p className="text-xs text-violet-600 mb-3">以下金額根據 {selectedMonth.replace('-', '年')}月 快速登記資料自動計算，勾選後確認帶入</p>
                                
                                <div className="space-y-2.5">
                                    {/* 收入：長輩自付額（餐費） */}
                                    <label className="flex items-center gap-3 bg-white rounded-lg p-3 cursor-pointer hover:bg-green-50 transition">
                                        <input
                                            type="checkbox"
                                            checked={autoFillChecked.mealIncome}
                                            onChange={e => setAutoFillChecked({ ...autoFillChecked, mealIncome: e.target.checked })}
                                            className="w-4 h-4 accent-emerald-600"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">收入</span>
                                                <span className="text-sm font-medium">長輩自付額（餐費）</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                用餐 {autoFillData.mealCount} 人次 × ${autoFillData.rates.mealPrice}
                                            </p>
                                        </div>
                                        <span className="text-emerald-600 font-bold">${autoFillData.mealIncome.toLocaleString()}</span>
                                    </label>

                                    {/* 收入：長輩自付額（交通） */}
                                    <label className="flex items-center gap-3 bg-white rounded-lg p-3 cursor-pointer hover:bg-green-50 transition">
                                        <input
                                            type="checkbox"
                                            checked={autoFillChecked.elderTransport}
                                            onChange={e => setAutoFillChecked({ ...autoFillChecked, elderTransport: e.target.checked })}
                                            className="w-4 h-4 accent-emerald-600"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">收入</span>
                                                <span className="text-sm font-medium">長輩自付額（交通）</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                搭車 {autoFillData.transportTripCount} 趟次 × ${autoFillData.rates.transportNormal}
                                            </p>
                                        </div>
                                        <span className="text-emerald-600 font-bold">${autoFillData.elderTransportIncome.toLocaleString()}</span>
                                    </label>

                                    {/* 收入：交通申請補助款 */}
                                    <label className="flex items-center gap-3 bg-white rounded-lg p-3 cursor-pointer hover:bg-green-50 transition">
                                        <input
                                            type="checkbox"
                                            checked={autoFillChecked.transportSubsidy}
                                            onChange={e => setAutoFillChecked({ ...autoFillChecked, transportSubsidy: e.target.checked })}
                                            className="w-4 h-4 accent-emerald-600"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">收入</span>
                                                <span className="text-sm font-medium">交通申請補助款</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                BD03補助 {autoFillData.transportTripCount} 趟次 × ${autoFillData.rates.BD03_RATE}
                                            </p>
                                        </div>
                                        <span className="text-emerald-600 font-bold">${autoFillData.transportSubsidy.toLocaleString()}</span>
                                    </label>

                                    {/* 支出：駕駛薪資 */}
                                    <label className="flex items-center gap-3 bg-white rounded-lg p-3 cursor-pointer hover:bg-red-50 transition">
                                        <input
                                            type="checkbox"
                                            checked={autoFillChecked.driverSalary}
                                            onChange={e => setAutoFillChecked({ ...autoFillChecked, driverSalary: e.target.checked })}
                                            className="w-4 h-4 accent-red-600"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">支出</span>
                                                <span className="text-sm font-medium">駕駛薪資</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                接送 {autoFillData.transportPersonCount} 人次 × ${autoFillData.rates.driverSalaryPerTrip}
                                            </p>
                                        </div>
                                        <span className="text-red-600 font-bold">${autoFillData.driverSalaryExpense.toLocaleString()}</span>
                                    </label>
                                </div>

                                <div className="flex gap-2 mt-4">
                                    <button
                                        onClick={handleAutoFillConfirm}
                                        disabled={isAutoFilling || (!autoFillChecked.mealIncome && !autoFillChecked.elderTransport && !autoFillChecked.transportSubsidy && !autoFillChecked.driverSalary)}
                                        className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition"
                                    >
                                        {isAutoFilling ? '帶入中...' : '✓ 確認帶入'}
                                    </button>
                                    <button
                                        onClick={() => { setShowAutoFill(false); setAutoFillData(null); }}
                                        className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm"
                                    >
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 新增支出表單 */}
                        {showAddForm && (
                            <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 mb-4">
                                <div className="font-bold text-emerald-800 mb-3">➕ 新增支出</div>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">日期</label>
                                            <input
                                                type="date"
                                                value={newRecord.date}
                                                onChange={e => setNewRecord({ ...newRecord, date: e.target.value })}
                                                className="w-full p-2 border rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">分類</label>
                                            <select
                                                value={newRecord.category}
                                                onChange={e => setNewRecord({ ...newRecord, category: e.target.value })}
                                                className="w-full p-2 border rounded-lg text-sm"
                                            >
                                                {EXPENSE_CATEGORIES.map(c => (
                                                    <option key={c.value} value={c.value}>{c.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">說明</label>
                                        <input
                                            type="text"
                                            value={newRecord.description}
                                            onChange={e => setNewRecord({ ...newRecord, description: e.target.value })}
                                            className="w-full p-2 border rounded-lg text-sm"
                                            placeholder="例：3月份薪資 - 王小明"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">金額</label>
                                        <input
                                            type="number"
                                            value={newRecord.amount}
                                            onChange={e => setNewRecord({ ...newRecord, amount: e.target.value })}
                                            className="w-full p-2 border rounded-lg text-sm"
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleAddExpense}
                                            disabled={isSaving}
                                            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                                        >
                                            {isSaving ? '儲存中...' : '✓ 確認新增'}
                                        </button>
                                        <button
                                            onClick={() => setShowAddForm(false)}
                                            className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm"
                                        >
                                            取消
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 支出列表 */}
                        {isLoading ? (
                            <div className="text-center py-10">
                                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                                <p className="text-gray-500 mt-2 text-sm">載入中...</p>
                            </div>
                        ) : expenseRecords.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <PiggyBank className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                <p>本月尚無支出紀錄</p>
                                <p className="text-xs mt-1">點擊「新增」或「與上月相同」開始記帳</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                <div className="divide-y">
                                    {expenseRecords.map(r => (
                                        <div key={r.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium">
                                                        {EXPENSE_CATEGORIES.find(c => c.value === r.category)?.label || r.category}
                                                    </span>
                                                    {EXPENSE_CATEGORIES.find(c => c.value === r.category)?.fixed && (
                                                        <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">固定</span>
                                                    )}
                                                </div>
                                                {r.description && <p className="text-xs text-gray-500 truncate">{r.description}</p>}
                                                <p className="text-xs text-gray-400">{r.date}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-red-600 font-bold">${r.amount.toLocaleString()}</span>
                                                <button
                                                    onClick={() => handleDelete(r)}
                                                    className="text-gray-400 hover:text-red-500 transition"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ========== 收入/預算 Tab ========== */}
                {activeTab === 'income' && (
                    <>
                        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="font-bold text-gray-800">{currentYear} 年度核定預算</h2>
                                <button
                                    onClick={() => setShowBudgetForm(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    登記預算
                                </button>
                            </div>

                            {budgetSummary.length > 0 ? (
                                <div className="space-y-3">
                                    {budgetSummary.map(b => (
                                        <div key={b.id} className="border rounded-lg p-3">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium text-gray-800">{b.category}</span>
                                                <span className="text-xs text-gray-500">{b.description}</span>
                                            </div>
                                            <div className="flex justify-between text-sm mb-1.5">
                                                <span className="text-gray-500">核定 ${b.approvedAmount.toLocaleString()}</span>
                                                <span className="text-gray-500">已核銷 ${b.used.toLocaleString()}</span>
                                                <span className={`font-bold ${b.remaining >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    餘 ${b.remaining.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        b.percentage >= 100 ? 'bg-red-500' :
                                                        b.percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                                    }`}
                                                    style={{ width: `${Math.min(b.percentage, 100)}%` }}
                                                />
                                            </div>
                                            <div className="text-right text-xs text-gray-400 mt-1">{b.percentage}%</div>
                                        </div>
                                    ))}
                                    <div className="border-t pt-3 flex justify-between font-bold">
                                        <span>年度合計</span>
                                        <div className="text-right">
                                            <div className="text-sm">核定 ${totalBudget.toLocaleString()} / 已用 ${totalUsed.toLocaleString()}</div>
                                            <div className={`text-lg ${totalBudget - totalUsed >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                餘額 ${(totalBudget - totalUsed).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-center text-gray-400 py-4 text-sm">尚未登記年度預算</p>
                            )}
                        </div>

                        {showBudgetForm && (
                            <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 mb-4">
                                <div className="font-bold text-blue-800 mb-3">📋 登記 {currentYear} 年度核定金額</div>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">補助類別</label>
                                        <select
                                            value={newBudget.category}
                                            onChange={e => setNewBudget({ ...newBudget, category: e.target.value })}
                                            className="w-full p-2 border rounded-lg text-sm"
                                        >
                                            {BUDGET_CATEGORIES.map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">核定總金額</label>
                                        <input
                                            type="number"
                                            value={newBudget.approvedAmount}
                                            onChange={e => setNewBudget({ ...newBudget, approvedAmount: e.target.value })}
                                            className="w-full p-2 border rounded-lg text-sm"
                                            placeholder="0"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1">說明</label>
                                        <input
                                            type="text"
                                            value={newBudget.description}
                                            onChange={e => setNewBudget({ ...newBudget, description: e.target.value })}
                                            className="w-full p-2 border rounded-lg text-sm"
                                            placeholder="例：115年度長照2.0補助"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={handleAddBudget} disabled={isSaving}
                                            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">
                                            {isSaving ? '儲存中...' : '✓ 確認'}
                                        </button>
                                        <button onClick={() => setShowBudgetForm(false)}
                                            className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm">取消</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                            <div className="flex justify-between items-center mb-3">
                                <h2 className="font-bold text-gray-800">📑 核銷紀錄</h2>
                                <button
                                    onClick={() => setShowReimburseForm(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-medium hover:bg-orange-600"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    登記核銷
                                </button>
                            </div>

                            {showReimburseForm && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">類別</label>
                                                <select
                                                    value={newReimburse.category}
                                                    onChange={e => setNewReimburse({ ...newReimburse, category: e.target.value })}
                                                    className="w-full p-2 border rounded-lg text-sm"
                                                >
                                                    {BUDGET_CATEGORIES.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs text-gray-600 mb-1">日期</label>
                                                <input type="date" value={newReimburse.date}
                                                    onChange={e => setNewReimburse({ ...newReimburse, date: e.target.value })}
                                                    className="w-full p-2 border rounded-lg text-sm" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">核銷金額</label>
                                            <input type="number" value={newReimburse.amount}
                                                onChange={e => setNewReimburse({ ...newReimburse, amount: e.target.value })}
                                                className="w-full p-2 border rounded-lg text-sm" placeholder="0" min="0" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">說明</label>
                                            <input type="text" value={newReimburse.description}
                                                onChange={e => setNewReimburse({ ...newReimburse, description: e.target.value })}
                                                className="w-full p-2 border rounded-lg text-sm" placeholder="例：1-3月核銷" />
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={handleAddReimburse} disabled={isSaving}
                                                className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold disabled:opacity-50">
                                                {isSaving ? '儲存中...' : '✓ 確認核銷'}
                                            </button>
                                            <button onClick={() => setShowReimburseForm(false)}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm">取消</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {reimbursements.length === 0 ? (
                                <p className="text-center text-gray-400 py-4 text-sm">尚無核銷紀錄</p>
                            ) : (
                                <div className="divide-y">
                                    {reimbursements.map(r => (
                                        <div key={r.id} className="flex justify-between items-center py-2.5">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{r.category}</span>
                                                    <span className="text-sm">{r.description}</span>
                                                </div>
                                                <span className="text-xs text-gray-400">{r.date}</span>
                                            </div>
                                            <span className="text-orange-600 font-bold">${r.amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ========== 總覽 Tab ========== */}
                {activeTab === 'overview' && (
                    <>
                        <div className="mb-4">
                            <select
                                value={selectedMonth}
                                onChange={e => setSelectedMonth(e.target.value)}
                                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium"
                            >
                                {monthOptions.map(m => (
                                    <option key={m} value={m}>{m.replace('-', '年')}月</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <div className="bg-emerald-500 text-white rounded-xl p-3 text-center">
                                <div className="text-xs opacity-80">收入</div>
                                <div className="text-xl font-bold">${totalIncome.toLocaleString()}</div>
                            </div>
                            <div className="bg-red-500 text-white rounded-xl p-3 text-center">
                                <div className="text-xs opacity-80">支出</div>
                                <div className="text-xl font-bold">${totalExpense.toLocaleString()}</div>
                            </div>
                            <div className={`${totalIncome - totalExpense >= 0 ? 'bg-blue-500' : 'bg-gray-500'} text-white rounded-xl p-3 text-center`}>
                                <div className="text-xs opacity-80">結餘</div>
                                <div className="text-xl font-bold">${(totalIncome - totalExpense).toLocaleString()}</div>
                            </div>
                        </div>

                        {budgetSummary.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
                                <h3 className="font-bold text-gray-800 mb-3">📊 {currentYear} 年度預算使用率</h3>
                                {budgetSummary.map(b => (
                                    <div key={b.id} className="mb-3">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span>{b.category}</span>
                                            <span className={b.percentage >= 100 ? 'text-red-600 font-bold' : 'text-gray-600'}>
                                                {b.percentage}%（${b.used.toLocaleString()} / ${b.approvedAmount.toLocaleString()}）
                                            </span>
                                        </div>
                                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    b.percentage >= 100 ? 'bg-red-500' :
                                                    b.percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                                }`}
                                                style={{ width: `${Math.min(b.percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {expenseByCategory.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm p-4">
                                <h3 className="font-bold text-gray-800 mb-3">📋 {selectedMonth.replace('-', '年')}月 支出分類</h3>
                                <div className="space-y-2">
                                    {expenseByCategory.map(([cat, amt]) => {
                                        const pct = totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0;
                                        return (
                                            <div key={cat} className="flex items-center gap-3">
                                                <span className="text-sm w-20 truncate">{EXPENSE_CATEGORIES.find(c => c.value === cat)?.label || cat}</span>
                                                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-red-400 rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 8)}%` }}>
                                                        <span className="text-[10px] text-white font-bold">{pct}%</span>
                                                    </div>
                                                </div>
                                                <span className="text-sm font-bold text-gray-700 w-24 text-right">${amt.toLocaleString()}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ========================================
// 頁面入口（控制登入狀態）
// ========================================
export default function FinanceManagementPage() {
    const params = useParams();
    const siteId = params.site as string;
    const siteName = SITES[siteId]?.name || siteId;

    const [isAuthed, setIsAuthed] = useState(false);
    const [mounted, setMounted] = useState(false);

    // client side 掛載後從 sessionStorage 讀取登入狀態
    useEffect(() => {
        const timer = requestAnimationFrame(() => {
            try {
                if (sessionStorage.getItem(SESSION_KEY) === 'true') {
                    setIsAuthed(true);
                }
            } catch { /* SSR safe */ }
            setMounted(true);
        });
        return () => cancelAnimationFrame(timer);
    }, []);

    const handleLogout = () => {
        setIsAuthed(false);
        try { sessionStorage.removeItem(SESSION_KEY); } catch { /* */ }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
        );
    }

    if (!isAuthed) {
        return <LoginScreen siteId={siteId} siteName={siteName} onLogin={() => setIsAuthed(true)} />;
    }

    return <FinanceContent siteId={siteId} onLogout={handleLogout} />;
}

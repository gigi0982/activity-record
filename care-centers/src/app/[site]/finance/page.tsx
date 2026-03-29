'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { financeRecordApi, FinanceRecordItem, BudgetItem, ReimbursementItem } from '@/lib/api';
import { SITES } from '@/config/sites';
import { ArrowLeft, Plus, Trash2, Copy, DollarSign, TrendingUp, TrendingDown, FileText, PiggyBank, RefreshCw } from 'lucide-react';

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

export default function FinanceManagementPage() {
    const params = useParams();
    const siteId = params.site as string;
    const siteName = SITES[siteId]?.name || siteId;

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

    const loadExpenses = async () => {
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
    };

    const loadBudget = async () => {
        try {
            const data = await financeRecordApi.getBudget(siteId, currentYear);
            setBudgets(data.budgets || []);
            setReimbursements(data.reimbursements || []);
        } catch (err) {
            console.error('載入預算失敗:', err);
        }
    };

    // 載入資料
    useEffect(() => { loadExpenses(); }, [selectedMonth, siteId]); // eslint-disable-line react-hooks/exhaustive-deps
    useEffect(() => { loadBudget(); }, [currentYear, siteId]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // 支出分類統計
    const expenseByCategory = useMemo(() => {
        const map: Record<string, number> = {};
        expenseRecords.forEach(r => {
            map[r.category] = (map[r.category] || 0) + r.amount;
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]);
    }, [expenseRecords]);

    // 預算統計
    const budgetSummary = useMemo(() => {
        return budgets.map(b => {
            const used = reimbursements.filter(r => r.category === b.category).reduce((s, r) => s + r.amount, 0);
            return { ...b, used, remaining: b.approvedAmount - used, percentage: b.approvedAmount > 0 ? Math.round((used / b.approvedAmount) * 100) : 0 };
        });
    }, [budgets, reimbursements]);

    const totalBudget = budgets.reduce((s, b) => s + b.approvedAmount, 0);
    const totalUsed = budgetSummary.reduce((s, b) => s + b.used, 0);

    // 月份選項
    const monthOptions = useMemo(() => {
        const opts = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        return opts;
    }, []);

    // 清除訊息
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
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3">
                <div className="max-w-2xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Link href={`/${siteId}`} className="text-white/80 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <DollarSign className="w-5 h-5" />
                        <h1 className="text-lg font-bold">{siteName} 收支管理</h1>
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
                        {/* 年度標題 */}
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

                            {/* 預算總覽 */}
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
                                            {/* 進度條 */}
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
                                    {/* 合計 */}
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

                        {/* 登記預算表單 */}
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

                        {/* 核銷紀錄 */}
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

                            {/* 新增核銷表單 */}
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

                            {/* 核銷列表 */}
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
                        {/* 月份選擇 */}
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

                        {/* 收支卡片 */}
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

                        {/* 年度預算使用 */}
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

                        {/* 支出分類明細 */}
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

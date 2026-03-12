'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAllSites } from '@/config/sites';
import { FinanceRecord, FINANCE_TYPE_CONFIG } from '@/types/finance';
import { financeApi } from '@/lib/api';
import { showToast } from '@/components/common/ErrorToast';
import Link from 'next/link';

export default function FinancePage() {
    const { user, canManageFinance, logout } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [records, setRecords] = useState<FinanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const sites = getAllSites();

    useEffect(() => {
        loadRecords();
    }, [selectedMonth]);

    const loadRecords = async () => {
        setIsLoading(true);
        try {
            const data = await financeApi.getFinance('all', selectedMonth);
            setRecords(data);
        } catch (error) {
            console.error('Failed to load finance records:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 過濾當月記錄
    const monthRecords = records.filter(r => r.date.startsWith(selectedMonth));

    // 依據點統計
    const siteStats = sites.map(site => {
        const siteRecords = monthRecords.filter(r => r.siteId === site.id);
        const income = siteRecords.filter(r => r.isIncome).reduce((sum, r) => sum + r.amount, 0);
        const expense = siteRecords.filter(r => !r.isIncome).reduce((sum, r) => sum + r.amount, 0);
        return {
            site,
            income,
            expense,
            balance: income - expense,
            recordCount: siteRecords.length,
        };
    });

    // 總計
    const totalIncome = siteStats.reduce((sum, s) => sum + s.income, 0);
    const totalExpense = siteStats.reduce((sum, s) => sum + s.expense, 0);
    const totalBalance = totalIncome - totalExpense;

    // 依類型統計
    const typeStats = Object.entries(FINANCE_TYPE_CONFIG).map(([type, config]) => {
        const typeRecords = monthRecords.filter(r => r.type === type);
        const total = typeRecords.reduce((sum, r) => sum + r.amount, 0);
        return { type, config, total, count: typeRecords.length };
    }).filter(t => t.count > 0);

    // 取得月份選項
    const getMonthOptions = () => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        return options;
    };

    if (!canManageFinance) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-xl shadow-lg text-center">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">無權限存取</h1>
                    <p className="text-gray-600 mb-4">只有財務管理者可以查看財務總覽</p>
                    <Link href="/" className="text-blue-500 hover:underline">返回首頁</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* 頂部導航 */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-3">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="text-white/80 hover:text-white">←</Link>
                        <h1 className="text-lg font-bold">💰 全據點財務總覽</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm opacity-80">{user?.name}</span>
                        <button onClick={logout} className="text-sm bg-white/20 px-2 py-1 rounded">
                            登出
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4">
                {/* 月份選擇 */}
                <div className="mb-4">
                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            disabled={isLoading}
                            className="w-full p-3 bg-white rounded-xl shadow text-lg font-medium appearance-none disabled:bg-gray-50"
                        >
                            {getMonthOptions().map(m => (
                                <option key={m} value={m}>{m.replace('-', '年')}月</option>
                            ))}
                        </select>
                        {isLoading && (
                            <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                <span className="animate-spin inline-block w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full"></span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 總覽卡片 */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-500 text-white rounded-xl p-4 text-center">
                        <div className="text-sm opacity-80">總收入</div>
                        <div className="text-2xl font-bold">${totalIncome.toLocaleString()}</div>
                    </div>
                    <div className="bg-red-500 text-white rounded-xl p-4 text-center">
                        <div className="text-sm opacity-80">總支出</div>
                        <div className="text-2xl font-bold">${totalExpense.toLocaleString()}</div>
                    </div>
                    <div className={`${totalBalance >= 0 ? 'bg-blue-500' : 'bg-gray-500'} text-white rounded-xl p-4 text-center`}>
                        <div className="text-sm opacity-80">結餘</div>
                        <div className="text-2xl font-bold">${totalBalance.toLocaleString()}</div>
                    </div>
                </div>

                {/* 據點收支表 */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-4">
                    <div className="px-4 py-3 bg-orange-50 border-b">
                        <h2 className="font-bold text-orange-800">📊 據點收支統計</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left">據點</th>
                                    <th className="px-4 py-2 text-right text-green-600">收入</th>
                                    <th className="px-4 py-2 text-right text-red-600">支出</th>
                                    <th className="px-4 py-2 text-right text-blue-600">結餘</th>
                                    <th className="px-4 py-2 text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {siteStats.map(({ site, income, expense, balance }) => (
                                    <tr key={site.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span
                                                className="inline-block w-3 h-3 rounded-full mr-2"
                                                style={{ backgroundColor: site.color }}
                                            />
                                            {site.name}
                                        </td>
                                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                                            ${income.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-red-600 font-medium">
                                            ${expense.toLocaleString()}
                                        </td>
                                        <td className={`px-4 py-3 text-right font-bold ${balance >= 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                                            ${balance.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Link
                                                href={`/${site.id}/expense`}
                                                className="text-blue-500 hover:underline text-xs"
                                            >
                                                查看明細
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="bg-orange-50 font-bold">
                                    <td className="px-4 py-3">總計</td>
                                    <td className="px-4 py-3 text-right text-green-600">${totalIncome.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right text-red-600">${totalExpense.toLocaleString()}</td>
                                    <td className={`px-4 py-3 text-right ${totalBalance >= 0 ? 'text-blue-600' : 'text-gray-600'}`}>
                                        ${totalBalance.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 分類支出統計 */}
                {typeStats.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="px-4 py-3 bg-purple-50 border-b">
                            <h2 className="font-bold text-purple-800">📈 分類統計</h2>
                        </div>
                        <div className="p-4 space-y-2">
                            {typeStats.map(({ type, config, total, count }) => (
                                <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{config.icon}</span>
                                        <span className="font-medium">{config.label}</span>
                                        <span className="text-xs text-gray-500">({count}筆)</span>
                                    </div>
                                    <span
                                        className="font-bold"
                                        style={{ color: config.color }}
                                    >
                                        {config.isIncome ? '+' : '-'}${total.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 無資料提示 */}
                {monthRecords.length === 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-400">
                        <div className="text-5xl mb-4">📭</div>
                        <p>本月尚無財務記錄</p>
                        <p className="text-sm mt-2">請至各據點登記收支資料</p>
                    </div>
                )}
            </div>
        </div>
    );
}

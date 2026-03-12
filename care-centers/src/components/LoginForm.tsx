'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function LoginForm() {
    const { login, isLoading } = useAuth();
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const submitLogin = async () => {
        setError('');

        if (!name.trim() || !password.trim()) {
            setError('請輸入帳號和密碼');
            return;
        }

        setIsSubmitting(true);
        const result = await login(name.trim(), password);

        if (!result.success) {
            setError(result.message);
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitLogin();
    };

    const isNetworkError = error.includes('網路');
    const isServerError = error.includes('伺服器');

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-4"
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #4F46E5 100%)' }}
        >
            {/* 背景裝飾 */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 fade-in">
                {/* 標題區 */}
                <div className="p-8 text-center" style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)' }}>
                    <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur">
                        <span className="text-5xl">🏥</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">長照據點管理系統</h1>
                    <p className="text-indigo-200 mt-2">Care Center Management</p>
                </div>

                {/* 登入表單 */}
                <form onSubmit={handleSubmit} className="p-8 space-y-5">
                    <div className="slide-up" style={{ animationDelay: '0.1s' }}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            帳號
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="請輸入帳號"
                                className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-all bg-gray-50 focus:bg-white"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="slide-up" style={{ animationDelay: '0.2s' }}>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            密碼
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔑</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="請輸入密碼"
                                className="w-full pl-12 pr-12 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg transition-all bg-gray-50 focus:bg-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl transition-colors"
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg text-red-600 text-sm fade-in">
                            <div className="flex items-center gap-2">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                            {isServerError ? (
                                <div className="mt-2 text-xs text-red-500">
                                    伺服器設定或連線異常，請聯絡管理員。
                                </div>
                            ) : isNetworkError ? (
                                <div className="mt-2 text-xs text-red-500">
                                    請確認網路連線正常，或稍後再試一次。
                                </div>
                            ) : (
                                <div className="mt-2 text-xs text-red-500">
                                    請確認帳號密碼是否正確，或聯絡管理員重設。
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 text-white font-bold rounded-xl text-lg transition-all hover:opacity-95 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 slide-up"
                        style={{
                            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                            boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
                            animationDelay: '0.3s'
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="loading"></span>
                                <span>登入中...</span>
                            </>
                        ) : (
                            '登入系統'
                        )}
                    </button>

                    {error && isNetworkError && (
                        <button
                            type="button"
                            onClick={submitLogin}
                            disabled={isSubmitting}
                            className="w-full py-3 text-indigo-600 font-semibold rounded-xl text-base border-2 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            重試登入
                        </button>
                    )}
                </form>

                {/* 提示區 */}
                <div className="px-8 pb-6 text-center">
                    <p className="text-gray-400 text-sm">如忘記密碼，請聯繫管理員重設</p>
                </div>
            </div>

            {/* 底部版權 */}
            <div className="fixed bottom-4 text-center text-white/60 text-xs">
                © 2026 長福社區照顧關懷據點
            </div>
        </div>
    );
}

'use client';

import { useAuth } from '@/context/AuthContext';
import { useParams, usePathname } from 'next/navigation';
import { ROLE_CONFIG } from '@/types/user';
import LoginForm from './LoginForm';
import Link from 'next/link';

interface SiteAuthProps {
    children: React.ReactNode;
}

// 不需要系統登入、自行管理認證的頁面
const SELF_AUTH_PAGES = ['/finance'];

export default function SiteAuth({ children }: SiteAuthProps) {
    const params = useParams();
    const siteId = params.site as string;
    const pathname = usePathname();
    const { user, isLoading, logout, canManageUsers, canManageFinance, changePassword } = useAuth();

    // 檢查是否為自行管理認證的頁面（如收支管理），直接放行
    const isSelfAuthPage = SELF_AUTH_PAGES.some(p => pathname === `/${siteId}${p}`);
    if (isSelfAuthPage) {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    // 未登入顯示登入表單
    if (!user) {
        return <LoginForm />;
    }

    // 檢查權限：用戶必須有權限進入此據點
    const hasAccess = user.siteId === 'all' || user.siteId === siteId;

    if (!hasAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">無權限存取此據點</h1>
                    <p className="text-gray-600 mb-4">
                        您的帳號只能存取指定的據點。
                        {user.siteId !== 'all' && (
                            <span className="block mt-2">您可以存取的據點：{user.siteId}</span>
                        )}
                    </p>
                    <div className="space-y-2">
                        <Link
                            href={`/${user.siteId}`}
                            className="block w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                        >
                            前往我的據點
                        </Link>
                        <button
                            onClick={logout}
                            className="block w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        >
                            登出
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 已登入且有權限，顯示內容
    return <>{children}</>;
}

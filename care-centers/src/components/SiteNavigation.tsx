'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROLE_CONFIG } from '@/types/user';

interface SiteNavigationProps {
    siteName: string;
    siteColor: string;
}

export default function SiteNavigation({ siteName, siteColor }: SiteNavigationProps) {
    const pathname = usePathname();
    const params = useParams();
    const rawSite = params?.site;
    const siteId =
        typeof rawSite === 'string'
            ? rawSite
            : Array.isArray(rawSite)
                ? rawSite[0]
                : pathname.split('/')[1];
    const { user, canManageUsers, canManageFinance } = useAuth();

    // 基本導航項目（所有人可見）
    const baseNavItems = [
        { href: `/${siteId}`, label: '首頁', icon: '🏠' },
        { href: `/${siteId}/quick`, label: '快速登記', icon: '✏️' },
        { href: `/${siteId}/activity/new`, label: '新增活動', icon: '📝' },
        { href: `/${siteId}/fees`, label: '報表', icon: '📊' },
        { href: `/${siteId}/settings`, label: '設定', icon: '⚙️' },
    ];

    // 依角色添加額外導航項目
    const navItems = [...baseNavItems];

    return (
        <>
            {/* 頂部導航 */}
            <header
                className="sticky top-0 z-50 shadow-md"
                style={{ backgroundColor: siteColor }}
            >
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="text-white hover:opacity-80 transition-opacity">
                        ← 切換據點
                    </Link>
                    <div className="text-center">
                        <h1 className="text-white font-bold text-lg">{siteName}</h1>
                        {user && (
                            <div className="flex items-center justify-center gap-2 mt-0.5">
                                <span
                                    className="px-2 py-0.5 text-xs rounded-full"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                >
                                    {user.name}
                                </span>
                                {user.role !== 'staff' && (
                                    <span
                                        className="px-2 py-0.5 text-xs text-white rounded-full"
                                        style={{ backgroundColor: ROLE_CONFIG[user.role].color }}
                                    >
                                        {ROLE_CONFIG[user.role].label}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {/* 快捷按鈕 */}
                    <div className="flex items-center gap-2">
                        {canManageUsers && (
                            <Link
                                href="/admin/users"
                                className="text-white text-sm bg-white/20 px-2 py-1 rounded hover:bg-white/30"
                            >
                                👥
                            </Link>
                        )}
                        {canManageFinance && (
                            <Link
                                href="/admin/finance"
                                className="text-white text-sm bg-white/20 px-2 py-1 rounded hover:bg-white/30"
                            >
                                💰
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* 底部導航 */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-around">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== `/${siteId}` && pathname.startsWith(item.href));

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`relative flex flex-col items-center py-2 px-4 transition-all ${isActive
                                    ? 'text-white'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                style={isActive ? { color: siteColor } : {}}
                            >
                                {/* 活動狀態背景 */}
                                {isActive && (
                                    <div
                                        className="absolute inset-0 rounded-xl opacity-10"
                                        style={{ backgroundColor: siteColor }}
                                    />
                                )}
                                {/* 頂部指示條 */}
                                {isActive && (
                                    <div
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 rounded-b-full"
                                        style={{ backgroundColor: siteColor }}
                                    />
                                )}
                                <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>
                                    {item.icon}
                                </span>
                                <span className={`text-xs mt-1 font-medium ${isActive ? 'font-bold' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        </>
    );
}

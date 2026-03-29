'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ROLE_CONFIG } from '@/types/user';
import { Home, PenSquare, FilePlus, BarChart3, Settings, Users, Wallet, Bell, DollarSign } from 'lucide-react';

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
        { href: `/${siteId}`, label: '首頁', icon: Home },
        { href: `/${siteId}/quick`, label: '快速登記', icon: PenSquare },
        { href: `/${siteId}/activity/new`, label: '新增活動', icon: FilePlus },
        { href: `/${siteId}/fees`, label: '報表', icon: BarChart3 },
        { href: `/${siteId}/finance`, label: '收支', icon: DollarSign },
        { href: `/${siteId}/line-settings`, label: 'LINE', icon: Bell },
        { href: `/${siteId}/settings`, label: '設定', icon: Settings },
    ];

    // 依角色添加額外導航項目
    const navItems = [...baseNavItems];

    return (
        <>
            {/* 頂部導航 */}
            <header
                className="sticky top-0 z-50"
                style={{
                    backgroundColor: siteColor,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                }}
            >
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Link href="/" className="text-white/90 hover:text-white transition-colors duration-200 text-sm font-medium cursor-pointer flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        切換據點
                    </Link>
                    <div className="text-center">
                        <h1 className="text-white font-bold text-lg tracking-wide">{siteName}</h1>
                        {user && (
                            <div className="flex items-center justify-center gap-2 mt-0.5">
                                <span
                                    className="px-2 py-0.5 text-xs rounded-full font-medium"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }}
                                >
                                    {user.name}
                                </span>
                                {user.role !== 'staff' && (
                                    <span
                                        className="px-2 py-0.5 text-xs text-white rounded-full font-medium"
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
                                className="text-white/90 hover:text-white bg-white/15 hover:bg-white/25 p-2 rounded-lg transition-all duration-200 cursor-pointer"
                                aria-label="用戶管理"
                            >
                                <Users className="w-4 h-4" />
                            </Link>
                        )}
                        {canManageFinance && (
                            <Link
                                href="/admin/finance"
                                className="text-white/90 hover:text-white bg-white/15 hover:bg-white/25 p-2 rounded-lg transition-all duration-200 cursor-pointer"
                                aria-label="財務管理"
                            >
                                <Wallet className="w-4 h-4" />
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* 底部導航 */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t z-50" style={{ borderColor: 'var(--border)', boxShadow: '0 -1px 3px rgba(0,0,0,0.06)' }}>
                <div className="max-w-7xl mx-auto flex justify-around">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== `/${siteId}` && pathname.startsWith(item.href));
                        const IconComponent = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="relative flex flex-col items-center py-2 sm:py-2.5 px-2 sm:px-4 transition-all duration-200 cursor-pointer min-w-[52px] sm:min-w-[64px] min-h-[48px]"
                                style={{ color: isActive ? siteColor : 'var(--muted)' }}
                            >
                                {/* 頂部指示條 */}
                                {isActive && (
                                    <div
                                        className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full"
                                        style={{ backgroundColor: siteColor }}
                                    />
                                )}
                                <IconComponent className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={`text-[10px] sm:text-xs mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
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

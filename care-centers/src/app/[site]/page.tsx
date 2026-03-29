import Link from 'next/link';
import { getSiteConfig } from '@/config/sites';
import {
    ClipboardList, CalendarDays, Target,
    Users, Heart,
    Receipt, FileSpreadsheet, Settings as SettingsIcon,
    TrendingUp, GitCompare, BookOpen, CheckSquare,
    PenSquare, FilePlus, ChevronRight, Truck
} from 'lucide-react';

export default async function SiteDashboard({ params }: { params: Promise<{ site: string }> }) {
    const { site: siteId } = await params;
    const siteConfig = getSiteConfig(siteId);

    if (!siteConfig) {
        return <div>據點不存在</div>;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

    const menuItems = [
        {
            title: '活動管理',
            icon: ClipboardList,
            color: '#0369A1',
            items: [
                { href: `/${siteId}/activities`, label: '活動列表', icon: ClipboardList },
                { href: `/${siteId}/schedule`, label: '每週課表', icon: CalendarDays },
                { href: `/${siteId}/topics`, label: '活動主題', icon: Target },
            ]
        },
        {
            title: '長者管理',
            icon: Users,
            color: '#059669',
            items: [
                { href: `/${siteId}/settings`, label: '長者名單', icon: Users },
                { href: `/${siteId}/health`, label: '健康紀錄', icon: Heart },
            ]
        },
        {
            title: '費用管理',
            icon: Receipt,
            color: '#D97706',
            items: [
                { href: `/${siteId}/fees`, label: '月結報表', icon: FileSpreadsheet },
                { href: `/${siteId}/expense`, label: '支出登記', icon: Receipt },
                { href: `/${siteId}/fee-settings`, label: '收費設定', icon: SettingsIcon },
                { href: `/${siteId}/driver-report`, label: '司機報表', icon: Truck },
            ]
        },
        {
            title: '評鑑資料',
            icon: TrendingUp,
            color: '#DC2626',
            items: [
                { href: `/${siteId}/reports/quarterly`, label: '季度報表', icon: TrendingUp },
                { href: `/${siteId}/reports/compare`, label: '季度比較', icon: GitCompare },
                { href: `/${siteId}/meetings`, label: '會議紀錄', icon: BookOpen },
                { href: `/${siteId}/tracking`, label: '執行追蹤', icon: CheckSquare },
            ]
        }
    ];

    return (
        <div className="min-h-screen" style={{ background: 'var(--background)' }}>
            <div className="max-w-4xl mx-auto p-4 sm:p-5 pb-24">
                {/* 歡迎卡片 */}
                <div
                    className="rounded-xl p-6 mb-8 relative overflow-hidden"
                    style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-md)',
                    }}
                >
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
                                <div className="w-2 h-2 rounded-full" style={{ background: siteConfig.color }}></div>
                                <span className="font-medium">{siteConfig.name}</span>
                            </div>
                            <Link
                                href="/"
                                className="text-sm px-3 py-1.5 rounded-lg transition-colors duration-200 cursor-pointer font-medium"
                                style={{ background: 'var(--border-light)', color: 'var(--text-secondary)' }}
                            >
                                切換據點
                            </Link>
                        </div>
                        <h1
                            className="text-2xl font-bold mb-1"
                            style={{ color: 'var(--foreground)' }}
                        >
                            歡迎回來
                        </h1>
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>{dateStr}</p>
                    </div>
                    {/* 裝飾底邊 */}
                    <div
                        className="absolute bottom-0 left-0 w-full h-0.5"
                        style={{ background: `linear-gradient(90deg, ${siteConfig.color} 0%, transparent 60%)` }}
                    ></div>
                </div>

                {/* 快捷按鈕 */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-8 sm:mb-10">
                    <Link
                        href={`/${siteId}/quick`}
                        className="group rounded-xl p-4 sm:p-5 transition-all duration-200 cursor-pointer btn-hover-darken active:scale-[0.98]"
                        style={{
                            background: 'var(--primary)',
                            boxShadow: 'var(--shadow-md)',
                        }}
                    >
                        <div className="flex items-center justify-center gap-3 text-white">
                            <PenSquare className="w-5 h-5 opacity-90" />
                            <span className="font-semibold tracking-wide">快速登記</span>
                        </div>
                    </Link>
                    <Link
                        href={`/${siteId}/activity/new`}
                        className="group rounded-xl p-4 sm:p-5 transition-all duration-200 cursor-pointer btn-hover-darken active:scale-[0.98]"
                        style={{
                            background: 'var(--accent)',
                            boxShadow: 'var(--shadow-md)',
                        }}
                    >
                        <div className="flex items-center justify-center gap-3 text-white">
                            <FilePlus className="w-5 h-5 opacity-90" />
                            <span className="font-semibold tracking-wide">新增活動</span>
                        </div>
                    </Link>
                </div>

                {/* 功能選單 */}
                <div className="space-y-6">
                    {menuItems.map((section, sectionIdx) => {
                        const SectionIcon = section.icon;
                        return (
                            <div key={section.title} className="fade-in" style={{ animationDelay: `${sectionIdx * 0.1}s` }}>
                                <div className="flex items-center gap-2.5 mb-3 px-1">
                                    <SectionIcon className="w-4 h-4" style={{ color: section.color }} />
                                    <h3 className="text-sm font-bold tracking-wide" style={{ color: 'var(--foreground)' }}>
                                        {section.title}
                                    </h3>
                                </div>
                                <div
                                    className="rounded-xl overflow-hidden"
                                    style={{
                                        background: 'var(--surface)',
                                        border: '1px solid var(--border)',
                                        boxShadow: 'var(--shadow-sm)',
                                    }}
                                >
                                    {section.items.map((item, itemIdx) => {
                                        const ItemIcon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className="flex items-center justify-between px-4 py-3.5 transition-colors duration-150 cursor-pointer group hover:bg-sky-50"
                                                style={{
                                                    borderBottom: itemIdx < section.items.length - 1 ? '1px solid var(--border-light)' : 'none',
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                                                        style={{ background: `${section.color}12` }}
                                                    >
                                                        <ItemIcon className="w-4.5 h-4.5" style={{ color: section.color }} />
                                                    </div>
                                                    <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                                                        {item.label}
                                                    </span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" style={{ color: 'var(--muted)' }} />
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 底部 */}
                <div className="text-center mt-12">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-8 h-px" style={{ background: 'var(--border)' }}></div>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary-light)' }}></div>
                        <div className="w-8 h-px" style={{ background: 'var(--border)' }}></div>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>
                        © 2026 {siteConfig.name}
                    </p>
                </div>
            </div>
        </div>
    );
}

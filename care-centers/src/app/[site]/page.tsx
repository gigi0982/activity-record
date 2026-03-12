import Link from 'next/link';
import { getSiteConfig } from '@/config/sites';

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
            icon: '📋',
            color: '#4F46E5',
            bgColor: 'rgba(79, 70, 229, 0.1)',
            items: [
                { href: `/${siteId}/activities`, label: '活動列表', icon: '📄' },
                { href: `/${siteId}/schedule`, label: '每週課表', icon: '📅' },
                { href: `/${siteId}/topics`, label: '活動主題', icon: '🎯' },
            ]
        },
        {
            title: '長者管理',
            icon: '👴',
            color: '#059669',
            bgColor: 'rgba(5, 150, 105, 0.1)',
            items: [
                { href: `/${siteId}/settings`, label: '長者名單', icon: '👥' },
                { href: `/${siteId}/health`, label: '健康紀錄', icon: '❤️' },
            ]
        },
        {
            title: '費用管理',
            icon: '💰',
            color: '#D97706',
            bgColor: 'rgba(217, 119, 6, 0.1)',
            items: [
                { href: `/${siteId}/fees`, label: '月結報表', icon: '📊' },
                { href: `/${siteId}/expense`, label: '支出登記', icon: '📁' },
                { href: `/${siteId}/fee-settings`, label: '收費設定', icon: '⚙️' },
            ]
        },
        {
            title: '評鑑資料',
            icon: '📈',
            color: '#DC2626',
            bgColor: 'rgba(220, 38, 38, 0.1)',
            items: [
                { href: `/${siteId}/reports/quarterly`, label: '季度報表', icon: '📊' },
                { href: `/${siteId}/reports/compare`, label: '季度比較', icon: '📈' },
                { href: `/${siteId}/meetings`, label: '會議紀錄', icon: '📝' },
                { href: `/${siteId}/tracking`, label: '執行追蹤', icon: '✓' },
            ]
        }
    ];

    return (
        <div className="min-h-screen" style={{ background: '#FAF9F7' }}>
            <div className="max-w-4xl mx-auto p-5 pb-24">
                {/* 文青風歡迎卡片 */}
                <div
                    className="rounded-lg p-8 mb-8 relative overflow-hidden"
                    style={{
                        background: '#FFFFFF',
                        border: '1px solid #E8E4DE',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
                    }}
                >
                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2 text-sm" style={{ color: '#8B8B8B' }}>
                                <span style={{ color: '#C9A86C' }}>◆</span>
                                <span style={{ fontWeight: 500 }}>{siteConfig.name}</span>
                            </div>
                            <Link
                                href="/"
                                className="text-sm px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                                style={{ color: '#5D6B72' }}
                            >
                                ⇄ 切換據點
                            </Link>
                        </div>
                        <h1
                            className="text-3xl mb-2"
                            style={{
                                fontFamily: "'Noto Serif TC', serif",
                                fontWeight: 600,
                                color: '#3D3D3D',
                                letterSpacing: '0.05em'
                            }}
                        >
                            歡迎回來
                        </h1>
                        <p style={{ color: '#8B8B8B', fontSize: '15px' }}>{dateStr}</p>
                    </div>
                    {/* 裝飾線條 */}
                    <div
                        className="absolute bottom-0 left-0 w-full h-1"
                        style={{ background: 'linear-gradient(90deg, #C9A86C 0%, transparent 60%)' }}
                    ></div>
                </div>

                {/* 快捷按鈕 - 文青風 */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <Link
                        href={`/${siteId}/quick`}
                        className="group rounded-lg p-5 transition-all hover:shadow-lg active:scale-[0.98]"
                        style={{
                            background: '#5D6B72',
                            boxShadow: '0 4px 12px rgba(93,107,114,0.2)'
                        }}
                    >
                        <div className="flex items-center justify-center gap-3 text-white">
                            <span className="text-xl opacity-80">✎</span>
                            <span style={{ fontWeight: 500, letterSpacing: '0.05em' }}>快速登記</span>
                        </div>
                    </Link>
                    <Link
                        href={`/${siteId}/activity/new`}
                        className="group rounded-lg p-5 transition-all hover:shadow-lg active:scale-[0.98]"
                        style={{
                            background: '#C9A86C',
                            boxShadow: '0 4px 12px rgba(201,168,108,0.3)'
                        }}
                    >
                        <div className="flex items-center justify-center gap-3 text-white">
                            <span className="text-xl opacity-80">✦</span>
                            <span style={{ fontWeight: 500, letterSpacing: '0.05em' }}>新增活動</span>
                        </div>
                    </Link>
                </div>

                {/* 功能選單 - 極簡風 */}
                <div className="space-y-8">
                    {menuItems.map((section, sectionIdx) => (
                        <div key={section.title} className="fade-in" style={{ animationDelay: `${sectionIdx * 0.15}s` }}>
                            <div className="flex items-center gap-3 mb-4 px-1">
                                <div
                                    className="w-1 h-5 rounded-full"
                                    style={{ background: '#C9A86C' }}
                                ></div>
                                <h3
                                    style={{
                                        fontFamily: "'Noto Serif TC', serif",
                                        fontWeight: 600,
                                        color: '#3D3D3D',
                                        letterSpacing: '0.05em'
                                    }}
                                >
                                    {section.title}
                                </h3>
                            </div>
                            <div
                                className="rounded-lg p-4"
                                style={{
                                    background: '#FFFFFF',
                                    border: '1px solid #E8E4DE',
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
                                }}
                            >
                                <div className={`grid gap-3 ${section.items.length === 1 ? 'grid-cols-1' :
                                    section.items.length === 2 ? 'grid-cols-2' :
                                        'grid-cols-3'
                                    }`}>
                                    {section.items.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className="flex flex-col items-center justify-center p-5 rounded-md transition-all group active:scale-95 hover:bg-gray-50"
                                        >
                                            <span
                                                className="text-2xl mb-3 transition-transform group-hover:scale-110"
                                                style={{ opacity: 0.85 }}
                                            >
                                                {item.icon}
                                            </span>
                                            <span
                                                className="text-sm font-medium transition-colors"
                                                style={{ color: '#5D6B72' }}
                                            >
                                                {item.label}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 底部 - 極簡 */}
                <div className="text-center mt-12" style={{ color: '#C9A86C' }}>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-8 h-px" style={{ background: '#E8E4DE' }}></div>
                        <span style={{ fontSize: '12px', letterSpacing: '0.1em' }}>◆</span>
                        <div className="w-8 h-px" style={{ background: '#E8E4DE' }}></div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#8B8B8B', letterSpacing: '0.03em' }}>
                        © 2026 {siteConfig.name}
                    </p>
                </div>
            </div>
        </div>
    );
}

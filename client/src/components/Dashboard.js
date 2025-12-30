import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
    const [showMore, setShowMore] = useState(false);
    const today = new Date();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')} (${weekDays[today.getDay()]})`;

    // 時間問候語
    const hour = today.getHours();
    const greeting = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安';

    // 主要功能（每日使用）- 精簡為 4 個
    const mainFunctions = [
        { path: '/quick', icon: '⚡', title: '今日快速登記', subtitle: '出席+接送', color: 'linear-gradient(135deg, #E91E63 0%, #C2185B 100%)' },
        { path: '/add', icon: '📝', title: '新增活動', subtitle: '詳細紀錄', color: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)' },
        { path: '/expense', icon: '💳', title: '支出登記', subtitle: '費用管理', color: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)' },
        { path: '/health', icon: '❤️', title: '健康紀錄', subtitle: '血壓體溫', color: 'linear-gradient(135deg, #E91E63 0%, #AD1457 100%)' },
    ];

    // 進階功能（按類別分組）
    const functionCategories = [
        {
            title: '📝 活動管理',
            color: '#4CAF50',
            items: [
                { path: '/activities', icon: '📋', title: '活動列表' },
                { path: '/plans', icon: '📅', title: '每週課表' },
                { path: '/topics', icon: '🏷️', title: '活動主題' },
            ]
        },
        {
            title: '👴 長者管理',
            color: '#9C27B0',
            items: [
                { path: '/settings', icon: '👥', title: '長者名單' },
            ]
        },
        {
            title: '💰 費用管理',
            color: '#FF9800',
            items: [
                { path: '/fee-report', icon: '💵', title: '月結報表' },
                { path: '/fee-history', icon: '📜', title: '歷史紀錄' },
                { path: '/fee-settings', icon: '⚙️', title: '收費設定' },
            ]
        },
        {
            title: '📊 評鑑資料',
            color: '#2196F3',
            items: [
                { path: '/quarterly', icon: '📊', title: '季度報表' },
                { path: '/comparison', icon: '📈', title: '季度比較' },
                { path: '/evaluation', icon: '📋', title: '評鑑報告' },
                { path: '/meetings', icon: '📝', title: '會議紀錄' },
                { path: '/tracking', icon: '✓', title: '執行追蹤' },
            ]
        }
    ];

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #e3f2fd 0%, #fafafa 30%)'
        }}>
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
                {/* 標題區 - 漸層卡片設計 */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    background: 'linear-gradient(135deg, #1976D2 0%, #1565c0 100%)',
                    borderRadius: '20px',
                    padding: '30px 20px',
                    color: 'white',
                    boxShadow: '0 8px 30px rgba(25, 118, 210, 0.3)'
                }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '8px', opacity: 0.9 }}>
                        {greeting}！👋
                    </div>
                    <h1 style={{ color: 'white', marginBottom: '10px', fontSize: '1.4rem', fontWeight: '600' }}>
                        失智據點活動紀錄系統
                    </h1>
                    <div style={{
                        fontSize: '1rem',
                        opacity: 0.85,
                        background: 'rgba(255,255,255,0.15)',
                        display: 'inline-block',
                        padding: '6px 16px',
                        borderRadius: '20px'
                    }}>
                        📅 {dateStr}
                    </div>
                </div>

                {/* 主要功能區 - 大按鈕 */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '15px',
                    marginBottom: '30px'
                }}>
                    {mainFunctions.map((func, index) => (
                        <Link
                            key={index}
                            to={func.path}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '25px 15px',
                                background: func.color,
                                color: 'white',
                                borderRadius: '16px',
                                textDecoration: 'none',
                                boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.25)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                            }}
                        >
                            <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{func.icon}</span>
                            <span style={{ fontSize: '1.1rem', fontWeight: '600', textAlign: 'center' }}>{func.title}</span>
                            <span style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '4px' }}>{func.subtitle}</span>
                        </Link>
                    ))}
                </div>

                {/* 分隔線 */}
                <div style={{
                    textAlign: 'center',
                    marginBottom: '20px',
                    position: 'relative'
                }}>
                    <hr style={{ borderColor: '#ddd' }} />
                    <button
                        onClick={() => setShowMore(!showMore)}
                        style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: 'white',
                            border: '2px solid #ddd',
                            borderRadius: '20px',
                            padding: '8px 20px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            color: '#666',
                        }}
                    >
                        {showMore ? '▲ 收起' : '▼ 更多功能（管理者）'}
                    </button>
                </div>

                {/* 進階功能區 - 可展開 - 分類顯示 */}
                {showMore && (
                    <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                        {functionCategories.map((category, catIndex) => (
                            <div key={catIndex} style={{ marginBottom: '20px' }}>
                                {/* 類別標題 */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '10px',
                                    paddingBottom: '8px',
                                    borderBottom: `2px solid ${category.color}`
                                }}>
                                    <span style={{
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        color: category.color
                                    }}>
                                        {category.title}
                                    </span>
                                </div>
                                {/* 功能按鈕網格 - 響應式 */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))',
                                    gap: '10px'
                                }}>
                                    {category.items.map((func, index) => (
                                        <Link
                                            key={index}
                                            to={func.path}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '15px 10px',
                                                backgroundColor: '#f5f5f5',
                                                color: '#333',
                                                borderRadius: '10px',
                                                textDecoration: 'none',
                                                border: `1px solid ${category.color}22`,
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.backgroundColor = `${category.color}15`;
                                                e.currentTarget.style.borderColor = category.color;
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                                                e.currentTarget.style.borderColor = `${category.color}22`;
                                            }}
                                        >
                                            <span style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{func.icon}</span>
                                            <span style={{ fontSize: '0.8rem', textAlign: 'center' }}>{func.title}</span>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 底部提示 */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '40px',
                    color: '#999',
                    fontSize: '0.8rem'
                }}>
                    三星樂智據點
                </div>
            </div>
        </div>
    );
}

export default Dashboard;

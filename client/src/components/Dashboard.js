import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Dashboard() {
    const [showMore, setShowMore] = useState(false);
    const today = new Date();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const dateStr = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')} (${weekDays[today.getDay()]})`;

    // 主要功能（每日使用）
    const mainFunctions = [
        { path: '/quick', icon: '⚡', title: '今日快速登記', subtitle: '出席+接送+便當', color: '#E91E63' },
        { path: '/add', icon: '📝', title: '新增活動', subtitle: '詳細紀錄', color: '#4CAF50' },
        { path: '/activities', icon: '📋', title: '活動列表', subtitle: '查看紀錄', color: '#2196F3' },
        { path: '/settings', icon: '👥', title: '長者名單', subtitle: '系統設定', color: '#9C27B0' },
    ];

    // 進階功能（管理者使用）
    const advancedFunctions = [
        { path: '/fee', icon: '💰', title: '收費登記', color: '#FF9800' },
        { path: '/plans', icon: '📅', title: '每週課表', color: '#607D8B' },
        { path: '/quarterly', icon: '📊', title: '季度報表', color: '#009688' },
        { path: '/meetings', icon: '📝', title: '會議紀錄', color: '#795548' },
        { path: '/comparison', icon: '📈', title: '季度比較', color: '#3F51B5' },
        { path: '/evaluation', icon: '📋', title: '評鑑報告', color: '#E91E63' },
        { path: '/fee-report', icon: '💵', title: '月結報表', color: '#FF5722' },
        { path: '/tracking', icon: '✓', title: '執行追蹤', color: '#00BCD4' },
        { path: '/fee-settings', icon: '⚙️', title: '收費設定', color: '#9E9E9E' },
    ];

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            {/* 標題區 */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: '#1976D2', marginBottom: '5px', fontSize: '1.5rem' }}>
                    失智據點活動紀錄系統
                </h1>
                <div style={{ fontSize: '1.2rem', color: '#666' }}>
                    {dateStr}
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
                            backgroundColor: func.color,
                            color: 'white',
                            borderRadius: '15px',
                            textDecoration: 'none',
                            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-3px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
                        }}
                    >
                        <span style={{ fontSize: '2.5rem', marginBottom: '8px' }}>{func.icon}</span>
                        <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{func.title}</span>
                        <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>{func.subtitle}</span>
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

            {/* 進階功能區 - 可展開 */}
            {showMore && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '10px',
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    {advancedFunctions.map((func, index) => (
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
                                border: '1px solid #ddd',
                                transition: 'background-color 0.2s',
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#e0e0e0';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#f5f5f5';
                            }}
                        >
                            <span style={{ fontSize: '1.5rem', marginBottom: '5px' }}>{func.icon}</span>
                            <span style={{ fontSize: '0.8rem', textAlign: 'center' }}>{func.title}</span>
                        </Link>
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
    );
}

export default Dashboard;

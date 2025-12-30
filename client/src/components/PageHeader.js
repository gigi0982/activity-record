import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

/**
 * PageHeader - 統一頁面標題元件
 * 
 * @param {string} title - 頁面標題
 * @param {string} icon - emoji 圖示
 * @param {string} subtitle - 副標題（可選）
 * @param {boolean} showBack - 是否顯示返回按鈕（預設 true）
 * @param {string} backTo - 返回路徑（預設 /）
 * @param {string} backLabel - 返回按鈕文字
 * @param {array} actions - 右側操作按鈕（可選）
 * @param {string} variant - 樣式變體：'default' | 'gradient' | 'minimal'
 */
function PageHeader({
    title,
    icon = '',
    subtitle = '',
    showBack = true,
    backTo = '/',
    backLabel = '返回首頁',
    actions = [],
    variant = 'gradient'
}) {
    const navigate = useNavigate();

    const styles = {
        gradient: {
            container: {
                background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '24px',
                color: 'white',
                boxShadow: '0 4px 20px rgba(25, 118, 210, 0.25)'
            },
            title: { color: 'white' },
            subtitle: { color: 'rgba(255,255,255,0.85)' },
            backBtn: {
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: 'none'
            }
        },
        default: {
            container: {
                background: 'white',
                borderRadius: '12px',
                padding: '16px 20px',
                marginBottom: '20px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                borderLeft: '4px solid #1976D2'
            },
            title: { color: '#333' },
            subtitle: { color: '#666' },
            backBtn: {
                background: '#f5f5f5',
                color: '#666',
                border: '1px solid #ddd'
            }
        },
        minimal: {
            container: {
                padding: '12px 0',
                marginBottom: '16px',
                borderBottom: '2px solid #e0e0e0'
            },
            title: { color: '#333' },
            subtitle: { color: '#666' },
            backBtn: {
                background: 'transparent',
                color: '#1976D2',
                border: 'none'
            }
        }
    };

    const currentStyle = styles[variant] || styles.gradient;

    return (
        <div style={currentStyle.container}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                {/* 左側：標題 */}
                <div>
                    <h2 style={{
                        margin: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        fontSize: '1.5rem',
                        fontWeight: '600',
                        ...currentStyle.title
                    }}>
                        {icon && <span style={{ fontSize: '1.4rem' }}>{icon}</span>}
                        {title}
                    </h2>
                    {subtitle && (
                        <p style={{
                            margin: '6px 0 0 0',
                            fontSize: '0.9rem',
                            ...currentStyle.subtitle
                        }}>
                            {subtitle}
                        </p>
                    )}
                </div>

                {/* 右側：操作按鈕 */}
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {/* 自訂操作按鈕 */}
                    {actions.map((action, index) => (
                        action.to ? (
                            <Link
                                key={index}
                                to={action.to}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    ...currentStyle.backBtn,
                                    ...(action.style || {})
                                }}
                            >
                                {action.icon && <span>{action.icon}</span>}
                                {action.label}
                            </Link>
                        ) : (
                            <button
                                key={index}
                                onClick={action.onClick}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    ...currentStyle.backBtn,
                                    ...(action.style || {})
                                }}
                            >
                                {action.icon && <span>{action.icon}</span>}
                                {action.label}
                            </button>
                        )
                    ))}

                    {/* 返回按鈕 */}
                    {showBack && (
                        <button
                            onClick={() => navigate(backTo)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                transition: 'all 0.2s',
                                ...currentStyle.backBtn
                            }}
                        >
                            ← {backLabel}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default PageHeader;

import React from 'react';
import { Link } from 'react-router-dom';

/**
 * EmptyState - 空狀態元件
 * 
 * 用於顯示沒有資料時的友善提示
 * 
 * @param {string} icon - 圖示 emoji
 * @param {string} title - 主要標題
 * @param {string} description - 描述文字（可選）
 * @param {object} action - 操作按鈕（可選）
 *   @param {string} action.label - 按鈕文字
 *   @param {string} action.to - 連結路徑（使用 Link）
 *   @param {function} action.onClick - 點擊事件（使用 button）
 * @param {string} variant - 樣式變體：'default' | 'compact' | 'card'
 */
function EmptyState({
    icon = '📋',
    title = '尚無資料',
    description = '',
    action = null,
    variant = 'default'
}) {
    const styles = {
        default: {
            container: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px 20px',
                textAlign: 'center'
            },
            iconSize: '4rem',
            titleSize: '1.3rem',
            descSize: '1rem'
        },
        compact: {
            container: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px 15px',
                textAlign: 'center'
            },
            iconSize: '2.5rem',
            titleSize: '1rem',
            descSize: '0.9rem'
        },
        card: {
            container: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
                borderRadius: '16px',
                border: '2px dashed #d0d5dd'
            },
            iconSize: '3rem',
            titleSize: '1.1rem',
            descSize: '0.95rem'
        }
    };

    const currentStyle = styles[variant] || styles.default;

    return (
        <div style={currentStyle.container}>
            {/* Icon */}
            <div style={{
                fontSize: currentStyle.iconSize,
                marginBottom: '16px',
                opacity: 0.9,
                animation: 'pulse 2s ease-in-out infinite'
            }}>
                {icon}
            </div>

            {/* Title */}
            <h3 style={{
                fontSize: currentStyle.titleSize,
                fontWeight: '600',
                color: '#333',
                marginBottom: description ? '8px' : '20px',
                margin: 0
            }}>
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p style={{
                    fontSize: currentStyle.descSize,
                    color: '#666',
                    marginBottom: '20px',
                    maxWidth: '300px',
                    lineHeight: 1.5
                }}>
                    {description}
                </p>
            )}

            {/* Action Button */}
            {action && (
                action.to ? (
                    <Link
                        to={action.to}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                            color: 'white',
                            borderRadius: '12px',
                            textDecoration: 'none',
                            fontWeight: '500',
                            fontSize: '0.95rem',
                            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(25, 118, 210, 0.4)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
                        }}
                    >
                        {action.label}
                    </Link>
                ) : action.onClick ? (
                    <button
                        onClick={action.onClick}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 24px',
                            background: 'linear-gradient(135deg, #1976D2 0%, #1565C0 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '0.95rem',
                            boxShadow: '0 4px 12px rgba(25, 118, 210, 0.3)',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 16px rgba(25, 118, 210, 0.4)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
                        }}
                    >
                        {action.label}
                    </button>
                ) : null
            )}
        </div>
    );
}

export default EmptyState;

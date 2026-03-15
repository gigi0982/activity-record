import React, { createContext, useContext, useState, useCallback } from 'react';

// Toast Context
const ToastContext = createContext(null);

// Toast Provider Component
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        const newToast = { id, message, type };

        setToasts(prev => [...prev, newToast]);

        // 自動移除
        if (duration > 0) {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = {
        success: (msg, duration) => addToast(msg, 'success', duration),
        error: (msg, duration) => addToast(msg, 'error', duration ?? 5000),
        info: (msg, duration) => addToast(msg, 'info', duration),
        warning: (msg, duration) => addToast(msg, 'warning', duration ?? 4000),
    };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </ToastContext.Provider>
    );
}

// Toast Container
function ToastContainer({ toasts, onClose }) {
    if (toasts.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            maxWidth: '90%',
            pointerEvents: 'none'
        }}>
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onClose={() => onClose(toast.id)} />
            ))}
        </div>
    );
}

// Single Toast Item
function ToastItem({ toast, onClose }) {
    const styles = {
        success: {
            background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
            icon: '✅'
        },
        error: {
            background: 'linear-gradient(135deg, #f44336 0%, #c62828 100%)',
            icon: '❌'
        },
        warning: {
            background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            icon: '⚠️'
        },
        info: {
            background: 'linear-gradient(135deg, #2196F3 0%, #1565C0 100%)',
            icon: 'ℹ️'
        }
    };

    const style = styles[toast.type] || styles.info;

    return (
        <div
            style={{
                background: style.background,
                color: 'white',
                padding: '12px 20px',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                minWidth: '200px',
                maxWidth: '400px',
                animation: 'slideDown 0.3s ease-out',
                pointerEvents: 'auto'
            }}
            onClick={onClose}
        >
            <span style={{ fontSize: '1.2rem' }}>{style.icon}</span>
            <span style={{ flex: 1, fontSize: '0.95rem', lineHeight: 1.4 }}>{toast.message}</span>
            <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem'
                }}
            >
                ✕
            </button>
        </div>
    );
}

// Custom Hook
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

// CSS Animation (add to index.css)
export const toastStyles = `
@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`;

export default ToastProvider;

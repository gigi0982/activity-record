import React, { createContext, useContext, useState, useCallback } from 'react';

// Loading Context
const LoadingContext = createContext(null);

// Loading Provider Component
export function LoadingProvider({ children }) {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState('');

    const showLoading = useCallback((text = '處理中...') => {
        setLoadingText(text);
        setIsLoading(true);
    }, []);

    const hideLoading = useCallback(() => {
        setIsLoading(false);
        setLoadingText('');
    }, []);

    // 包裝異步函數，自動顯示/隱藏 loading
    const withLoading = useCallback(async (asyncFn, text = '處理中...') => {
        showLoading(text);
        try {
            return await asyncFn();
        } finally {
            hideLoading();
        }
    }, [showLoading, hideLoading]);

    return (
        <LoadingContext.Provider value={{ isLoading, showLoading, hideLoading, withLoading }}>
            {children}
            {isLoading && <LoadingOverlay text={loadingText} />}
        </LoadingContext.Provider>
    );
}

// Loading Overlay Component
function LoadingOverlay({ text }) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            backdropFilter: 'blur(2px)'
        }}>
            <div style={{
                background: 'white',
                padding: '30px 50px',
                borderRadius: '16px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                {/* Spinner */}
                <div style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #e0e0e0',
                    borderTop: '4px solid #1976D2',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
                {/* Text */}
                <div style={{
                    color: '#333',
                    fontSize: '1rem',
                    fontWeight: '500'
                }}>
                    {text}
                </div>
            </div>
        </div>
    );
}

// Custom Hook
export function useLoading() {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
}

export default LoadingProvider;

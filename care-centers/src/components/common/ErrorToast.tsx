'use client';

import { useState, useEffect, useCallback } from 'react';

interface Toast {
    id: number;
    message: string;
    type: 'error' | 'success' | 'info';
}

let toastListener: ((message: string, type: 'error' | 'success' | 'info') => void) | null = null;

export const showToast = (message: string, type: 'error' | 'success' | 'info' = 'error') => {
    if (toastListener) {
        toastListener(message, type);
    }
};

export default function ErrorToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: 'error' | 'success' | 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    useEffect(() => {
        toastListener = addToast;
        return () => {
            toastListener = null;
        };
    }, [addToast]);

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-sm px-4">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`p-4 rounded-xl shadow-lg text-white flex items-center justify-between transform transition-all animate-bounce-in ${toast.type === 'error' ? 'bg-red-500' :
                            toast.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <span className="text-xl">
                            {toast.type === 'error' ? '⚠️' : toast.type === 'success' ? '✅' : 'ℹ️'}
                        </span>
                        <span className="font-medium">{toast.message}</span>
                    </div>
                    <button
                        onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                        className="text-white/80 hover:text-white"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}

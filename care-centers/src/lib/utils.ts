// 共用工具函數

// 獲取分級資訊
export function getLevelInfo(level: string) {
    switch (level) {
        case 'A':
            return { desc: '輕度', range: '4-5分', color: '#4CAF50' };
        case 'B':
            return { desc: '中度', range: '3-4分', color: '#FF9800' };
        case 'C':
            return { desc: '重度', range: '2-3分', color: '#f44336' };
        default:
            return { desc: '', range: '', color: '#999' };
    }
}

// 獲取身份類別資訊（含車資）
export function getIdentityInfo(type: string) {
    switch (type) {
        case 'normal':
            return { desc: '一般戶', fare: 18, color: '#2196F3' };
        case 'mediumLow':
            return { desc: '中低收', fare: 5, color: '#FF9800' };
        case 'low':
            return { desc: '低收', fare: 0, color: '#4CAF50' };
        default:
            return { desc: '一般戶', fare: 18, color: '#2196F3' };
    }
}

// 日期格式化
export function formatDate(date: Date | string, format: 'full' | 'short' | 'time' = 'full'): string {
    const d = new Date(date);

    if (format === 'full') {
        return d.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    } else if (format === 'short') {
        return d.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' });
    } else {
        return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    }
}

// 延遲函數
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

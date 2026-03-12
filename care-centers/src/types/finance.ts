// 財務記錄類型定義
export interface FinanceRecord {
    id: string;
    siteId: string;
    date: string;  // YYYY-MM-DD
    type: 'subsidy' | 'utility' | 'pettyCash' | 'elderFee' | 'driverSalary' | 'lunchCost' | 'other';
    category: string;  // 子分類
    description: string;
    amount: number;
    isIncome: boolean;  // true=收入, false=支出
    createdBy: string;
    createdAt: string;
}

// 財務類型配置
export const FINANCE_TYPE_CONFIG: Record<string, {
    label: string;
    icon: string;
    color: string;
    isIncome: boolean;
    categories: string[];
}> = {
    subsidy: {
        label: '政府補助',
        icon: '🏛️',
        color: '#10B981',
        isIncome: true,
        categories: ['長照補助', '社會局補助', '其他補助'],
    },
    elderFee: {
        label: '長者收費',
        icon: '👴',
        color: '#3B82F6',
        isIncome: true,
        categories: ['車資', '餐費', '自費'],
    },
    utility: {
        label: '水電費',
        icon: '💡',
        color: '#F59E0B',
        isIncome: false,
        categories: ['電費', '水費', '瓦斯費', '網路費'],
    },
    pettyCash: {
        label: '零用金',
        icon: '💵',
        color: '#EF4444',
        isIncome: false,
        categories: ['文具用品', '清潔用品', '雜支', '交通費', '其他'],
    },
    driverSalary: {
        label: '駕駛薪資',
        icon: '🚗',
        color: '#8B5CF6',
        isIncome: false,
        categories: ['駕駛薪資'],
    },
    lunchCost: {
        label: '便當費',
        icon: '🍱',
        color: '#EC4899',
        isIncome: false,
        categories: ['便當費'],
    },
    other: {
        label: '其他',
        icon: '📋',
        color: '#6B7280',
        isIncome: false,
        categories: ['其他收入', '其他支出'],
    },
};

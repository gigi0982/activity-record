// 用戶類型定義
export type UserRole = 'superAdmin' | 'financeAdmin' | 'siteAdmin' | 'staff';

export interface User {
    id: string;
    name: string;           // 帳號（員工姓名）
    password: string;       // 密碼
    role: UserRole;         // 角色
    siteId: string;         // 所屬據點（superAdmin 可為 'all'）
    createdAt: string;      // 建立時間
    lastLogin?: string;     // 最後登入時間
}

export interface UserSession {
    userId: string;
    name: string;
    role: UserRole;
    siteId: string;
}

// 角色權限配置
export const ROLE_CONFIG: Record<UserRole, {
    label: string;
    color: string;
    canManageUsers: boolean;
    canViewAllSites: boolean;
    canManageFinance: boolean;
}> = {
    superAdmin: {
        label: '超級管理者',
        color: '#DC2626',
        canManageUsers: true,
        canViewAllSites: true,
        canManageFinance: true,
    },
    financeAdmin: {
        label: '財務管理者',
        color: '#F59E0B',
        canManageUsers: false,
        canViewAllSites: false,
        canManageFinance: true,
    },
    siteAdmin: {
        label: '據點管理者',
        color: '#2563EB',
        canManageUsers: false,
        canViewAllSites: false,
        canManageFinance: false,
    },
    staff: {
        label: '一般人員',
        color: '#10B981',
        canManageUsers: false,
        canViewAllSites: false,
        canManageFinance: false,
    },
};

// 初始超級管理者（預設帳號）

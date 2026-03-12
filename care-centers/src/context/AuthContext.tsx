'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, ROLE_CONFIG } from '@/types/user';
import { userApi, UserData } from '@/lib/api';

interface UserSession {
    userId: string;
    name: string;
    role: UserRole;
    siteId: string;
}

interface AuthContextType {
    user: UserSession | null;
    isLoading: boolean;
    login: (name: string, password: string) => Promise<{ success: boolean; message: string }>;
    logout: () => void;
    changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    canManageUsers: boolean;
    canViewAllSites: boolean;
    canManageFinance: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USE_GOOGLE_SHEETS = true;

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserSession | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isActive = true;
        const loadSession = async () => {
            try {
                const result = await userApi.me();
                if (isActive) {
                    setUser(result.user ? {
                        userId: result.user.id || `user-${Date.now()}`,
                        name: result.user.name,
                        role: result.user.role as UserRole,
                        siteId: result.user.siteId,
                    } : null);
                }
            } catch {
                if (isActive) setUser(null);
            } finally {
                if (isActive) setIsLoading(false);
            }
        };

        loadSession();
        return () => {
            isActive = false;
        };
    }, []);

    const login = async (name: string, password: string): Promise<{ success: boolean; message: string }> => {
        if (!USE_GOOGLE_SHEETS) {
            return { success: false, message: '未啟用 Google Sheets 驗證' };
        }

        try {
            const result = await userApi.login(name, password);
            if (result.success && result.user) {
                const session: UserSession = {
                    userId: result.user.id || `user-${Date.now()}`,
                    name: result.user.name,
                    role: result.user.role as UserRole,
                    siteId: result.user.siteId,
                };
                setUser(session);
                return { success: true, message: '登入成功' };
            }
            return { success: false, message: result.message || '帳號或密碼錯誤' };
        } catch {
            return { success: false, message: '網路連線錯誤，請檢查網路後再試' };
        }
    };

    const logout = () => {
        userApi.logout();
        setUser(null);
    };

    const changePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        if (!user) return { success: false, message: '未登入' };

        if (newPassword.length < 4) {
            return { success: false, message: '新密碼至少需要 4 個字元' };
        }

        const result = await userApi.resetPassword(user.name, newPassword);
        if (result.success) {
            return { success: true, message: '密碼修改成功' };
        }
        return { success: false, message: result.message || '密碼修改失敗' };
    };

    const roleConfig = user ? ROLE_CONFIG[user.role] : null;

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            login,
            logout,
            changePassword,
            canManageUsers: roleConfig?.canManageUsers ?? false,
            canViewAllSites: roleConfig?.canViewAllSites ?? false,
            canManageFinance: roleConfig?.canManageFinance ?? false,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

// 用戶管理 API（供管理者使用）- 使用 Google Sheets
export const userManagementApi = {
    getUsers: async (): Promise<UserData[]> => {
        if (!USE_GOOGLE_SHEETS) return [];
        try {
            return await userApi.getUsers();
        } catch {
            return [];
        }
    },

    addUser: async (userData: { name: string; password?: string; role: string; siteId: string }): Promise<{ success: boolean; message: string }> => {
        if (!USE_GOOGLE_SHEETS) return { success: false, message: '請啟用 Google Sheets 模式' };
        const result = await userApi.addUser(userData);
        if (result.success) return { success: true, message: '新增成功' };
        return { success: false, message: result.message || '新增失敗' };
    },

    deleteUser: async (name: string): Promise<{ success: boolean; message: string }> => {
        if (!USE_GOOGLE_SHEETS) return { success: false, message: '請啟用 Google Sheets 模式' };
        const result = await userApi.deleteUser(name);
        if (result.success) return { success: true, message: result.message || '刪除成功' };
        return { success: false, message: result.message || '刪除失敗' };
    },

    resetPassword: async (name: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
        if (!USE_GOOGLE_SHEETS) return { success: false, message: '請啟用 Google Sheets 模式' };
        const result = await userApi.resetPassword(name, newPassword);
        if (result.success) return { success: true, message: result.message || '密碼已重設' };
        return { success: false, message: result.message || '重設失敗' };
    },
};

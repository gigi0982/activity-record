import { getAllSites } from '@/config/sites';
import { getGoogleScriptUrl } from '@/lib/gas';
import { UserRole } from '@/types/user';
import bcrypt from 'bcryptjs';

export interface LoginUser {
    id: string;
    name: string;
    role: UserRole;
    siteId: string;
}

export interface LoginResult {
    success: boolean;
    user?: LoginUser;
    message?: string;
}

type AuthProvider = 'gas' | 'supabase';

function getAuthProvider(): AuthProvider {
    const provider = String(process.env.AUTH_PROVIDER || 'gas').toLowerCase();
    return provider === 'supabase' ? 'supabase' : 'gas';
}

function toRole(value: unknown): UserRole | null {
    if (value === 'superAdmin' || value === 'financeAdmin' || value === 'siteAdmin' || value === 'staff') {
        return value;
    }
    return null;
}

function toLoginUser(value: unknown): LoginUser | null {
    if (!value || typeof value !== 'object') return null;
    const user = value as Record<string, unknown>;
    const role = toRole(user.role);
    if (typeof user.name !== 'string' || !role || typeof user.siteId !== 'string') return null;
    return {
        id: typeof user.id === 'string' && user.id ? user.id : `user-${Date.now()}`,
        name: user.name,
        role,
        siteId: user.siteId,
    };
}

async function tryGasLogin(url: string, name: string, password: string): Promise<LoginResult> {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'login', name, password }),
        });

        const text = await response.text();
        let parsed: { success?: boolean; user?: unknown; message?: string } | null = null;

        try {
            parsed = JSON.parse(text);
        } catch {
            if (response.status === 403) {
                return { success: false, message: '登入服務尚未開放存取（GAS 權限為 403）' };
            }
            return { success: false, message: '登入回應格式錯誤' };
        }

        const user = toLoginUser(parsed?.user);
        if (!parsed?.success || !user) {
            return { success: false, message: parsed?.message || '帳號或密碼錯誤' };
        }
        return { success: true, user };
    } catch {
        return { success: false, message: '登入服務暫時無法使用' };
    }
}

async function loginWithGas(name: string, password: string): Promise<LoginResult> {
    const centralUrl = getGoogleScriptUrl();
    const centralResult = await tryGasLogin(centralUrl, name, password);
    if (centralResult.success) return centralResult;

    const candidateUrls = Array.from(new Set(
        getAllSites()
            .map((site) => getGoogleScriptUrl(site.id))
            .filter((url) => !!url && url !== centralUrl)
    ));

    for (const url of candidateUrls) {
        const siteResult = await tryGasLogin(url, name, password);
        if (siteResult.success) return siteResult;
    }

    return centralResult;
}

interface SupabaseUserRow {
    id: string;
    name: string;
    role: string;
    site_id: string;
    password_hash: string;
    is_active?: boolean;
}

async function loginWithSupabase(name: string, password: string): Promise<LoginResult> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return { success: false, message: 'Supabase 設定不完整（缺少 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）' };
    }

    try {
        const queryName = encodeURIComponent(name);
        const response = await fetch(
            `${supabaseUrl}/rest/v1/users?name=eq.${queryName}&select=id,name,role,site_id,password_hash,is_active&limit=1`,
            {
                headers: {
                    apikey: serviceRoleKey,
                    Authorization: `Bearer ${serviceRoleKey}`,
                },
                cache: 'no-store',
            }
        );

        if (!response.ok) {
            return { success: false, message: '登入服務暫時無法使用' };
        }

        const rows = await response.json() as SupabaseUserRow[];
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (!row || row.is_active === false) {
            return { success: false, message: '帳號或密碼錯誤' };
        }

        const valid = await bcrypt.compare(password, row.password_hash || '');
        if (!valid) {
            return { success: false, message: '帳號或密碼錯誤' };
        }

        const role = toRole(row.role);
        if (!role) {
            return { success: false, message: '帳號角色設定錯誤，請聯絡管理員' };
        }

        return {
            success: true,
            user: {
                id: row.id,
                name: row.name,
                role,
                siteId: row.site_id,
            },
        };
    } catch {
        return { success: false, message: '登入服務暫時無法使用' };
    }
}

export async function authenticateUser(name: string, password: string): Promise<LoginResult> {
    const provider = getAuthProvider();
    if (provider === 'supabase') {
        return loginWithSupabase(name, password);
    }
    return loginWithGas(name, password);
}

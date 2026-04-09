import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getGoogleScriptUrl } from '@/lib/gas';
import { getAuthSecret, SESSION_COOKIE, verifySessionToken } from '@/lib/session';
import { ROLE_CONFIG } from '@/types/user';

export const runtime = 'nodejs';

const ADMIN_ACTIONS = new Set(['getUsers', 'addUser', 'deleteUser', 'resetPassword']);
const FINANCE_ACTIONS = new Set([
    'getFinance',
    'addFinance',
    'saveFinanceBatch',
    'getDriverReport',
    'saveExpense',
    'getExpense',
    'getExpenseList',
]);
const SITE_ACTIONS = new Set([
    'getElders',
    'addElder',
    'updateElder',
    'deleteElder',
    'saveHealthRecords',
    'getHealthByElder',
    'getAllHealth',
    'getSchedule',
    'saveSchedule',
    'addActivity',
    'getActivities',
    'getActivityById',
    'addFinance',
    'saveFinanceBatch',
    'saveQuickEntry',
    'getQuickEntry',
    'getQuickEntrySummary',
    'getSettings',
    'saveSettings',
    'getElderMonthlyUsage',
    'uploadPhoto',
    'uploadPhotos',
]);
const SELF_ACTIONS = new Set(['changePassword']);

async function getSessionUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    try {
        const secret = getAuthSecret();
        return verifySessionToken(token, secret);
    } catch {
        return null;
    }
}

function canManageUsers(role?: string) {
    if (!role) return false;
    return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]?.canManageUsers ?? false;
}

function canManageFinance(role?: string) {
    if (!role) return false;
    return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]?.canManageFinance ?? false;
}

function enforceSiteAccess(userSiteId: string, targetSiteId?: string) {
    if (!targetSiteId) return true;
    if (userSiteId === 'all') return true;
    return userSiteId === targetSiteId;
}

function extractSiteIdFromBody(body: Record<string, unknown>): string | undefined {
    if (typeof body.siteId === 'string') return body.siteId;
    const records = body.records;
    if (Array.isArray(records)) {
        const siteIds = records
            .map((record) => (record && typeof record === 'object' ? (record as { siteId?: string }).siteId : undefined))
            .filter((id): id is string => typeof id === 'string');
        if (siteIds.length === 0) return undefined;
        const unique = new Set(siteIds);
        return unique.size === 1 ? siteIds[0] : 'mixed';
    }
    return undefined;
}

function unauthorized() {
    const res = NextResponse.json({ success: false, message: '未登入或權限不足' }, { status: 401 });
    res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
    return res;
}

function forbidden(message: string) {
    return NextResponse.json({ success: false, message }, { status: 403 });
}

export async function GET(request: Request) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || '';
    if (!action) {
        return NextResponse.json({ success: false, message: '缺少 action' }, { status: 400 });
    }

    if (ADMIN_ACTIONS.has(action) && !canManageUsers(user.role)) {
        return forbidden('權限不足');
    }
    if (FINANCE_ACTIONS.has(action) && !canManageFinance(user.role)) {
        return forbidden('權限不足');
    }

    let targetSiteId = url.searchParams.get('siteId') || undefined;
    const isUserAction = action === 'getUsers';

    if ((SITE_ACTIONS.has(action) || isUserAction) && !targetSiteId && user.siteId !== 'all') {
        targetSiteId = user.siteId;
        url.searchParams.set('siteId', targetSiteId);
    }
    if (targetSiteId && !enforceSiteAccess(user.siteId, targetSiteId)) {
        return forbidden('無法存取其他據點資料');
    }
    if (SITE_ACTIONS.has(action) && !targetSiteId) {
        return NextResponse.json({ success: false, message: '缺少 siteId' }, { status: 400 });
    }

    try {
        const queryString = url.searchParams.toString();
        // SITE_ACTIONS 走各據點自己的 GAS（未來在 sites.ts 設定 scriptUrl）
        // 其他後台共用功能（例如 getUsers）則走預設的中央 GAS
        const baseUrl = SITE_ACTIONS.has(action) ? getGoogleScriptUrl(targetSiteId || undefined) : getGoogleScriptUrl();
        const response = await fetch(`${baseUrl}?${queryString}`, { cache: 'no-store' });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch {
        return NextResponse.json({ success: false, message: '伺服器連線失敗' }, { status: 502 });
    }
}

export async function POST(request: Request) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: '無效的請求內容' }, { status: 400 });
    }

    const action = typeof body.action === 'string' ? body.action : '';
    if (!action) {
        return NextResponse.json({ success: false, message: '缺少 action' }, { status: 400 });
    }

    if (ADMIN_ACTIONS.has(action) && !canManageUsers(user.role)) {
        return forbidden('權限不足');
    }
    if (FINANCE_ACTIONS.has(action) && !canManageFinance(user.role)) {
        return forbidden('權限不足');
    }
    if (SELF_ACTIONS.has(action)) {
        const targetName = typeof body.name === 'string' ? body.name : '';
        if (!targetName || targetName !== user.name) {
            return forbidden('權限不足');
        }
    }

    let targetSiteId = extractSiteIdFromBody(body);
    if (SITE_ACTIONS.has(action) && !targetSiteId && user.siteId !== 'all') {
        targetSiteId = user.siteId;
        body.siteId = user.siteId;
    }
    if (targetSiteId === 'mixed') {
        return forbidden('不允許跨據點批次操作');
    }
    if (targetSiteId && !enforceSiteAccess(user.siteId, targetSiteId)) {
        return forbidden('無法存取其他據點資料');
    }
    if (SITE_ACTIONS.has(action) && !targetSiteId) {
        return NextResponse.json({ success: false, message: '缺少 siteId' }, { status: 400 });
    }

    try {
        // SITE_ACTIONS 走各據點自己的 GAS，其餘走中央 GAS
        const baseUrl = SITE_ACTIONS.has(action) ? getGoogleScriptUrl(targetSiteId || undefined) : getGoogleScriptUrl();
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch {
        return NextResponse.json({ success: false, message: '伺服器連線失敗' }, { status: 502 });
    }
}

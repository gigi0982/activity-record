import { NextResponse } from 'next/server';
import { authenticateUser } from '@/lib/auth/loginProvider';
import { createSessionToken, getAuthSecret, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/session';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    let payload: { name?: string; password?: string } | null = null;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: '請輸入帳號和密碼' }, { status: 400 });
    }

    const name = String(payload?.name ?? '').trim();
    const password = String(payload?.password ?? '');

    if (!name || !password) {
        return NextResponse.json({ success: false, message: '請輸入帳號和密碼' }, { status: 400 });
    }

    try {
        const result = await authenticateUser(name, password);
        if (!result.success || !result.user) {
            return NextResponse.json(
                { success: false, message: result?.message || '帳號或密碼錯誤' },
                { status: 401 }
            );
        }

        let secret: string;
        try {
            secret = getAuthSecret();
        } catch {
            return NextResponse.json(
                { success: false, message: '伺服器設定錯誤，請聯絡管理員' },
                { status: 500 }
            );
        }
        const user = {
            id: result.user.id || `user-${Date.now()}`,
            name: result.user.name,
            role: result.user.role,
            siteId: result.user.siteId,
        };

        const token = createSessionToken(user, secret);
        const res = NextResponse.json({ success: true, user });
        res.cookies.set(SESSION_COOKIE, token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: SESSION_MAX_AGE,
        });
        return res;
    } catch {
        return NextResponse.json({ success: false, message: '網路連線錯誤，請檢查網路後再試' }, { status: 502 });
    }
}

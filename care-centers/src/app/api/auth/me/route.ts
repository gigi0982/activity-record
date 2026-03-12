import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAuthSecret, SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export const runtime = 'nodejs';

export async function GET() {
    const token = cookies().get(SESSION_COOKIE)?.value;
    if (!token) {
        return NextResponse.json({ user: null });
    }

    let user = null;
    try {
        const secret = getAuthSecret();
        user = verifySessionToken(token, secret);
    } catch {
        user = null;
    }

    if (!user) {
        const res = NextResponse.json({ user: null });
        res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
        return res;
    }

    return NextResponse.json({ user });
}

import crypto from 'crypto';

export const SESSION_COOKIE = 'cc_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface SessionUser {
    id: string;
    name: string;
    role: string;
    siteId: string;
}

interface SessionPayload {
    v: number;
    exp: number;
    user: SessionUser;
}

export function getAuthSecret(): string {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
        // 在建立期間提供預設值，避免 crash
        if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
            throw new Error('AUTH_SECRET is not set');
        }
        return 'build-time-fallback-secret-do-not-use-in-production';
    }
    return secret;
}

export function createSessionToken(user: SessionUser, secret: string): string {
    const payload: SessionPayload = {
        v: 1,
        exp: Date.now() + SESSION_MAX_AGE * 1000,
        user,
    };
    const body = base64urlEncode(JSON.stringify(payload));
    const signature = sign(body, secret);
    return `${body}.${signature}`;
}

export function verifySessionToken(token: string, secret: string): SessionUser | null {
    const [body, signature] = token.split('.');
    if (!body || !signature) return null;

    const expected = sign(body, secret);
    if (!safeEqual(signature, expected)) return null;

    try {
        const payload = JSON.parse(base64urlDecode(body).toString('utf8')) as SessionPayload;
        if (!payload || payload.exp < Date.now()) return null;
        return payload.user || null;
    } catch {
        return null;
    }
}

function sign(data: string, secret: string): string {
    return base64urlEncode(crypto.createHmac('sha256', secret).update(data).digest());
}

function safeEqual(a: string, b: string): boolean {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
}

function base64urlEncode(input: Buffer | string): string {
    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
    return buffer
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}

function base64urlDecode(input: string): Buffer {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (padded.length % 4)) % 4);
    return Buffer.from(padded + pad, 'base64');
}

import { getSiteConfig } from '@/config/sites';

const DEFAULT_GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbz6TXA-JMCbdRfRnd0qZYv0Y5mwLoJVOtI95VRjN8vk05EX4lPeA03Zapq6THoBsc4iTA/exec';

export function getGoogleScriptUrl(siteId?: string): string {
    const override = process.env.GOOGLE_SCRIPT_URL;
    if (override) return override;

    if (siteId) {
        const site = getSiteConfig(siteId);
        if (site) {
            // 未來可依據點配置不同 Script URL
        }
    }

    return DEFAULT_GOOGLE_SCRIPT_URL;
}

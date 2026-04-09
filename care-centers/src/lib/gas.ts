import { getSiteConfig } from '@/config/sites';

// 預設：共用一個「中央後台」 GAS Web App，處理登入、帳號管理等跨據點功能
const DEFAULT_GOOGLE_SCRIPT_URL =
    'https://script.google.com/macros/s/AKfycbxSpZ4B-pmsVrhzXYMH7RCbdD7tCPQIVnI5vcJEUVicAhq93Dk_iqETwMYtnBE7bYnGbA/exec';

/**
 * 取得要呼叫的 GAS Web App URL
 * - 若有設定環境變數 GOOGLE_SCRIPT_URL：全部請求都走這個（方便測試 / 暫時切到同一支）
 * - 若有傳入 siteId，且在 `sites.ts` 有設定該據點的 scriptUrl，就走該據點專用的 GAS
 * - 其他情況回到預設共用的 DEFAULT_GOOGLE_SCRIPT_URL
 */
export function getGoogleScriptUrl(siteId?: string): string {
    // 全域覆寫（例如測試環境用）
    const override = process.env.GOOGLE_SCRIPT_URL;
    if (override) return override;

    // 未來拆成四個 GAS 專案時：在 `sites.ts` 裡為每個據點填上自己的 scriptUrl
    if (siteId) {
        const site = getSiteConfig(siteId);
        if (site?.scriptUrl) {
            return site.scriptUrl;
        }
    }

    // 預設共用一個 GAS（現在的行為跟原本完全一樣）
    return DEFAULT_GOOGLE_SCRIPT_URL;
}

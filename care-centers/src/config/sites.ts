// ============================================================
// 據點配置
// 新增據點只需在 SITES 新增一筆，不需要改任何頁面程式碼
// ============================================================

/** 各據點可自訂的功能開關 */
export interface SiteFeatures {
    /** 是否啟用外籍照顧者相關欄位（預設 true） */
    caregiver?: boolean;
    /** 是否啟用虛報欄位（預設 true） */
    virtualAttendance?: boolean;
    /** 是否啟用自費長者功能（預設 true） */
    selfFunded?: boolean;
    /** 是否啟用健康追蹤功能（預設 true） */
    healthTracking?: boolean;
    /** 是否啟用 LINE 通知（預設 false） */
    lineNotify?: boolean;
    /** 是否啟用照片上傳（預設 true） */
    photoUpload?: boolean;
}

/** 各據點可自訂的費率（未設定則用全域預設值） */
export interface SiteFeeRates {
    DRIVER_PER_TRIP?: number;
    DRIVER_MIN_DAILY?: number;
    ELDER_MEAL?: number;
    LUNCHBOX_COST?: number;
    CAREGIVER_MEAL?: number;
    CAREGIVER_TRANSPORT?: number;
    CAREGIVER_DRIVER?: number;
    SELF_FUNDED_FEE?: number;
    TRANSPORT_NORMAL?: number;
    TRANSPORT_FOREIGN?: number;
}

export interface SiteConfig {
    id: string;
    name: string;
    /** 據點簡稱（用於報表、選單等） */
    shortName?: string;
    sheetId: string;
    color: string;
    /** 若有設定，前端會優先呼叫這個據點專用的 GAS Web App URL */
    scriptUrl?: string;
    /** 據點功能開關（未設定的功能使用預設值） */
    features?: SiteFeatures;
    /** 據點專屬費率（未設定的費率使用全域預設值） */
    feeRates?: SiteFeeRates;
    /** 據點備註或說明 */
    description?: string;
}

/** 全域預設費率 */
export const DEFAULT_FEE_RATES: Required<SiteFeeRates> = {
    DRIVER_PER_TRIP: 115,
    DRIVER_MIN_DAILY: 0,
    ELDER_MEAL: 40,
    LUNCHBOX_COST: 70,
    CAREGIVER_MEAL: 70,
    CAREGIVER_TRANSPORT: 100,
    CAREGIVER_DRIVER: 100,
    SELF_FUNDED_FEE: 200,
    TRANSPORT_NORMAL: 18,
    TRANSPORT_FOREIGN: 115,
};

/** 全域預設功能開關 */
export const DEFAULT_FEATURES: Required<SiteFeatures> = {
    caregiver: true,
    virtualAttendance: true,
    selfFunded: true,
    healthTracking: true,
    lineNotify: false,
    photoUpload: true,
};

export const SITES: Record<string, SiteConfig> = {
    sanxing: {
        id: 'sanxing',
        name: '三星樂智據點',
        shortName: '三星',
        sheetId: '1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc',
        color: '#4CAF50', // 綠色
        scriptUrl:
            'https://script.google.com/macros/s/AKfycbwJ1XVXJMrgPkx2IrG9paDg2TaIKiJC6c3mQHjhIDt1GCWk_NAK9fqv_2LsLItQNVRH/exec',
    },
    luodong: {
        id: 'luodong',
        name: '羅東樂智據點',
        shortName: '羅東',
        sheetId: '1nWWfPKOWSz4LH_ijZyx1kV689j4Pw3Ci1fmIGwOnf-8',
        color: '#2196F3', // 藍色
        scriptUrl:
            'https://script.google.com/macros/s/AKfycbwZWYm9mfaDA3Gk5SF7Z6TaYxL8GchqAsu_BMJMZMW1fbVyZE0I0k-OTtcKmnv8GTNY/exec',
    },
    dongguashan: {
        id: 'dongguashan',
        name: '冬瓜山樂智據點',
        shortName: '冬瓜山',
        sheetId: '1l-gMy3mhtB8en6qzj8NhkP7m2GG4QXJgRBNruWyEfLI',
        color: '#FF9800', // 橙色
        scriptUrl:
            'https://script.google.com/macros/s/AKfycbwP4-_ageAy3QTix5DJ5zLfd7wseyDyU37rwDea5UqiH1Hoc-PJ8TSF4yungH7zK1L-YA/exec',
    },
    jiaoxi: {
        id: 'jiaoxi',
        name: '礁溪樂智據點',
        shortName: '礁溪',
        sheetId: '1eStK13s5eVUAzGIeDsYns56wb-A58CF_sdr6_M8cQ2o',
        color: '#9C27B0', // 紫色
        scriptUrl:
            'https://script.google.com/macros/s/AKfycbwNX_nktMjO1WWqemQfa1OE-6pqbrQZqS_oNm20lzpWpDF3vr3tj8GGLmIJytLrAgLR/exec',
    },
    young: {
        id: 'young',
        name: '年輕型樂智據點',
        shortName: '年輕型',
        sheetId: '', // 待配置
        color: '#E91E63', // 粉色
        features: {
            // 年輕型據點可能有不同的功能需求，在此自訂
        },
    },
};

export const getSiteConfig = (siteId: string): SiteConfig | undefined => {
    return SITES[siteId];
};

export const getAllSites = (): SiteConfig[] => {
    return Object.values(SITES);
};

/** 取得據點的完整費率（據點自訂 + 全域預設合併） */
export const getSiteFeeRates = (siteId: string): Required<SiteFeeRates> => {
    const site = SITES[siteId];
    return { ...DEFAULT_FEE_RATES, ...(site?.feeRates || {}) };
};

/** 取得據點的完整功能開關（據點自訂 + 全域預設合併） */
export const getSiteFeatures = (siteId: string): Required<SiteFeatures> => {
    const site = SITES[siteId];
    return { ...DEFAULT_FEATURES, ...(site?.features || {}) };
};

/** 取得據點簡稱（fallback 到全名） */
export const getSiteShortName = (siteId: string): string => {
    const site = SITES[siteId];
    return site?.shortName || site?.name || siteId;
};

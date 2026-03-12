// 據點配置
export interface SiteConfig {
    id: string;
    name: string;
    sheetId: string;
    color: string;
}

export const SITES: Record<string, SiteConfig> = {
    luodong: {
        id: 'luodong',
        name: '羅東樂智據點',
        sheetId: '1nWWfPKOWSz4LH_ijZyx1kV689j4Pw3Ci1fmIGwOnf-8',
        color: '#2196F3', // 藍色
    },
    sanxing: {
        id: 'sanxing',
        name: '三星樂智據點',
        sheetId: '1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc',
        color: '#4CAF50', // 綠色
    },
    dongguashan: {
        id: 'dongguashan',
        name: '冬瓜山樂智據點',
        sheetId: '1l-gMy3mhtB8en6qzj8NhkP7m2GG4QXJgRBNruWyEfLI',
        color: '#FF9800', // 橙色
    },
    jiaoxi: {
        id: 'jiaoxi',
        name: '礁溪樂智據點',
        sheetId: '1eStK13s5eVUAzGIeDsYns56wb-A58CF_sdr6_M8cQ2o',
        color: '#9C27B0', // 紫色
    },
    young: {
        id: 'young',
        name: '年輕型樂智據點',
        sheetId: '', // 待配置
        color: '#E91E63', // 粉色
    },
};

export const getSiteConfig = (siteId: string): SiteConfig | undefined => {
    return SITES[siteId];
};

export const getAllSites = (): SiteConfig[] => {
    return Object.values(SITES);
};

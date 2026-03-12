'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SiteConfig, getSiteConfig, SITES } from '@/config/sites';

interface SiteContextType {
    currentSite: SiteConfig | null;
    setSiteId: (siteId: string) => void;
    isLoading: boolean;
}

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children, siteId }: { children: ReactNode; siteId?: string }) {
    const [currentSite, setCurrentSite] = useState<SiteConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (siteId) {
            const site = getSiteConfig(siteId);
            setCurrentSite(site || null);
        }
        setIsLoading(false);
    }, [siteId]);

    const setSiteId = (newSiteId: string) => {
        const site = getSiteConfig(newSiteId);
        setCurrentSite(site || null);
        // 儲存到 localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('selectedSite', newSiteId);
        }
    };

    return (
        <SiteContext.Provider value={{ currentSite, setSiteId, isLoading }}>
            {children}
        </SiteContext.Provider>
    );
}

export function useSite() {
    const context = useContext(SiteContext);
    if (context === undefined) {
        throw new Error('useSite must be used within a SiteProvider');
    }
    return context;
}

export { SITES };

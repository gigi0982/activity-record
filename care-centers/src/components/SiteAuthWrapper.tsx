'use client';

import SiteAuth from './SiteAuth';

interface SiteAuthWrapperProps {
    children: React.ReactNode;
}

export default function SiteAuthWrapper({ children }: SiteAuthWrapperProps) {
    return <SiteAuth>{children}</SiteAuth>;
}

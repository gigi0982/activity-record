import { SiteProvider } from '@/context/SiteContext';
import { getSiteConfig } from '@/config/sites';
import { notFound } from 'next/navigation';
import SiteNavigation from '@/components/SiteNavigation';
import SiteAuthWrapper from '@/components/SiteAuthWrapper';

export default async function SiteLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ site: string }>;
}) {
    const { site: siteId } = await params;
    const siteConfig = getSiteConfig(siteId);

    if (!siteConfig) {
        notFound();
    }

    return (
        <SiteProvider siteId={siteId}>
            <SiteAuthWrapper>
                <div className="min-h-screen" style={{ background: 'var(--background)' }}>
                    <SiteNavigation siteName={siteConfig.name} siteColor={siteConfig.color} />
                    <main className="pb-20">
                        {children}
                    </main>
                </div>
            </SiteAuthWrapper>
        </SiteProvider>
    );
}

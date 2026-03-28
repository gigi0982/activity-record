import Link from 'next/link';
import { getAllSites } from '@/config/sites';
import { Building2, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export default function HomePage() {
  const sites = getAllSites();

  return (
    <main className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--background)' }}>
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5" style={{ background: 'var(--primary-100)' }}>
            <Building2 className="w-8 h-8" style={{ color: 'var(--primary)' }} />
          </div>
          <h1 className="text-3xl font-bold mb-3" style={{ color: 'var(--foreground)' }}>
            失智據點管理系統
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '16px' }}>請選擇您要管理的據點</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sites.map((site) => (
            <Link
              key={site.id}
              href={`/${site.id}`}
              className="group block p-6 rounded-xl transition-all duration-200 cursor-pointer site-card"
              style={{
                background: 'var(--surface)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                className="w-14 h-14 rounded-xl mb-4 flex items-center justify-center text-white text-xl font-bold"
                style={{ backgroundColor: site.color }}
              >
                {site.name.charAt(0)}
              </div>
              <h2 className="text-lg font-semibold mb-1 transition-colors duration-200" style={{ color: 'var(--foreground)' }}>
                {site.name}
              </h2>
              <p className="text-sm flex items-center gap-1.5 mb-4" style={{ color: 'var(--muted)' }}>
                {site.sheetId ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} /> 已配置</>
                ) : (
                  <><Clock className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} /> 待配置</>
                )}
              </p>
              <div className="flex items-center text-sm font-medium cursor-pointer" style={{ color: site.color }}>
                進入管理
                <ArrowRight className="ml-1.5 w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
          © 2026 失智據點管理系統
        </div>
      </div>
    </main>
  );
}

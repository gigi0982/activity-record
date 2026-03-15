import Link from 'next/link';
import { getAllSites } from '@/config/sites';

export default function HomePage() {
  const sites = getAllSites();

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">
            🏥 失智據點管理系統
          </h1>
          <p className="text-gray-600 text-lg">請選擇您要管理的據點</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sites.map((site) => (
            <Link
              key={site.id}
              href={`/${site.id}`}
              className="group block p-6 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div
                className="w-16 h-16 rounded-full mb-4 flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: site.color }}
              >
                {site.name.charAt(0)}
              </div>
              <h2 className="text-xl font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">
                {site.name}
              </h2>
              <p className="text-gray-500 mt-2 text-sm">
                {site.sheetId ? '✅ 已配置' : '⏳ 待配置'}
              </p>
              <div className="mt-4 flex items-center text-indigo-500 text-sm font-medium">
                進入管理
                <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center text-gray-500 text-sm">
          © 2026 失智據點管理系統 | 版本 1.1 (Multi-Site)
        </div>
      </div>
    </main>
  );
}

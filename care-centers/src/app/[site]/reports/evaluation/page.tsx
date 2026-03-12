'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EvaluationReportPage() {
    const params = useParams();
    const siteId = params.site as string;

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">📋 評鑑報告</h1>

            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <div className="text-6xl mb-4">🚧</div>
                <h2 className="text-xl font-bold text-gray-700 mb-2">功能開發中</h2>
                <p className="text-gray-500">評鑑報告功能即將推出</p>
                <p className="text-sm text-gray-400 mt-2">此功能將自動生成符合評鑑標準的報告</p>
            </div>

            <div className="fixed bottom-16 left-0 right-0 p-3 bg-white shadow-lg z-40">
                <Link
                    href={`/${siteId}`}
                    className="block w-full py-4 bg-gray-400 text-white text-center rounded-xl font-bold hover:bg-gray-500 transition"
                >
                    ← 返回首頁
                </Link>
            </div>
        </div>
    );
}

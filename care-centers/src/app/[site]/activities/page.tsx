'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { activityApi } from '@/lib/api';

interface Participant {
    name: string;
    level?: string;
}

interface Activity {
    key: string;
    id?: string;
    date: string;
    time: string;
    topic: string;
    activityName?: string;
    participants?: Participant[];
    purposes?: string[];
    materials?: string;
    notes?: string;
    photos?: string[];
    leader?: string;
    coLeader?: string;
    recorder?: string;
}

interface FullActivity extends Activity {
    createdAt?: string;
}

export default function ActivitiesPage() {
    const params = useParams();
    const siteId = params.site as string;

    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [fullActivity, setFullActivity] = useState<FullActivity | null>(null);

    useEffect(() => {
        loadActivities();
    }, []);

    const loadActivities = async () => {
        setIsLoading(true);
        try {
            // 優先從 Google Sheets API 載入
            const apiActivities = await activityApi.getActivities(siteId);

            // 轉換 API 格式為本地格式
            const formattedApiActivities: Activity[] = (apiActivities || []).map((a, idx) => ({
                key: a.id || `gs_${idx}`,
                id: a.id,
                date: a.date,
                time: a.time,
                topic: a.topic,
                activityName: a.activityName,
                participants: typeof a.participants === 'string'
                    ? (a.participants as string).split('、').filter(Boolean).map(n => ({ name: n }))
                    : a.participants,
                purposes: typeof a.purposes === 'string'
                    ? (a.purposes as string).split('、').filter(Boolean)
                    : a.purposes,
                notes: a.notes,
                photos: a.photos,
            }));

            // 同時載入本地資料作為補充
            const localList = typeof window !== 'undefined'
                ? JSON.parse(localStorage.getItem('activities_list') || '[]')
                : [];

            // 合併：API 資料優先，避免重複（根據日期+時間判斷）
            const mergedMap = new Map<string, Activity>();

            formattedApiActivities.forEach(a => {
                mergedMap.set(`${a.date}_${a.time}`, a);
            });

            localList.forEach((a: Activity) => {
                const key = `${a.date}_${a.time}`;
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, a);
                }
            });

            const merged = Array.from(mergedMap.values())
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setActivities(merged);
        } catch (err) {
            console.error('從 API 載入失敗，使用本地資料:', err);
            // 備用：從 localStorage 載入
            const listKey = 'activities_list';
            const list = JSON.parse(localStorage.getItem(listKey) || '[]');
            setActivities(list);
        } finally {
            setIsLoading(false);
        }
    };

    const loadFullActivity = (key: string) => {
        if (typeof window === 'undefined') return null;

        // 嘗試兩種 key 格式
        const keys = [
            `activity_${key}`,  // 新格式：activity_2026-01-15_am
            key,                // 舊格式：2026-01-15_am
        ];

        for (const k of keys) {
            const data = localStorage.getItem(k);
            if (data) {
                return JSON.parse(data) as FullActivity;
            }
        }
        return null;
    };

    const handleExpand = (activity: Activity) => {
        if (expandedKey === activity.key) {
            setExpandedKey(null);
            setFullActivity(null);
        } else {
            setExpandedKey(activity.key);
            const full = loadFullActivity(activity.key);
            setFullActivity(full || activity);
        }
    };

    const filteredActivities = activities.filter(a => a.date.startsWith(selectedMonth));

    const getMonthOptions = () => {
        const options = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            options.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
        return options;
    };

    const getSiteDisplayName = () => {
        const names: Record<string, string> = {
            'sanxing': '三星據點',
            'yuanshan': '員山據點',
            'dongshan': '冬山據點',
        };
        return names[siteId] || siteId;
    };

    const formatDateChinese = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        const rocYear = parseInt(year) - 1911;
        const weekday = ['日', '一', '二', '三', '四', '五', '六'][new Date(dateStr).getDay()];
        return `${rocYear} 年 ${month} 月 ${day} 日(星期${weekday})`;
    };

    const handleExport = (activity: Activity) => {
        const full = loadFullActivity(activity.key) || activity;

        // 建立 HTML 內容（類似 Word 格式）
        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="ProgId" content="Word.Document">
    <title>活動紀錄 - ${full.topic}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        * { font-family: '標楷體', DFKai-SB, BiauKai, serif !important; }
        body { font-size: 12pt; line-height: 1.8; }
        h1 { text-align: center; font-size: 18pt; margin-bottom: 10px; }
        h2 { text-align: center; font-size: 16pt; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        td, th { border: 1px solid #000; padding: 8px; vertical-align: top; }
        .label { background: #f5f5f5; width: 100px; font-weight: bold; }
        .highlight { color: red; }
        .section-title { background: #e0e0e0; font-weight: bold; text-align: center; }
        .photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }
        .photo-grid img { width: 100%; max-height: 300px; object-fit: cover; }
    </style>
</head>
<body>
    <h1>社團法人宜蘭縣長期照護及社會福祉推廣協會</h1>
    <h2>${getSiteDisplayName()}</h2>
    
    <table>
        <tr>
            <td class="label">班別名稱</td>
            <td>■認知■藝術□體適能■音樂□園藝</td>
            <td class="label">課程名稱</td>
            <td>${full.activityName || full.topic}</td>
            <td class="label">期程</td>
            <td>___/___</td>
        </tr>
        <tr>
            <td class="label">活動日期/星期</td>
            <td>${formatDateChinese(full.date)}</td>
            <td class="label">時間</td>
            <td colspan="3">${full.time === 'am' ? '■上午 09:00-12:00' : '□上午 09:00-12:00'}${full.time === 'pm' ? '■下午 13:00-16:00' : '□下午 13:00-16:00'}</td>
        </tr>
        <tr>
            <td class="label">活動地點</td>
            <td>${getSiteDisplayName()}</td>
            <td class="label">領導者</td>
            <td>${full.leader || '___'}</td>
            <td class="label">紀錄</td>
            <td>${full.recorder || '___'}</td>
        </tr>
    </table>

    <table>
        <tr>
            <td class="section-title" colspan="2">出席狀況</td>
        </tr>
        <tr>
            <td class="label">參與人數</td>
            <td class="highlight">${full.participants?.length || 0} 人</td>
        </tr>
        <tr>
            <td class="label">參與名單</td>
            <td>${full.participants?.map(p => p.name).join('、') || '無'}</td>
        </tr>
    </table>

    <table>
        <tr>
            <td class="section-title" colspan="2">活動內容</td>
        </tr>
        <tr>
            <td class="label">團體主要效益</td>
            <td>${full.purposes?.join('、') || '身體功能、認知功能、情緒抒發、社交互動'}</td>
        </tr>
        <tr>
            <td class="label">團體目的</td>
            <td>
                ${full.purposes?.map((p, i) => `${i + 1}. ${p}`).join('<br>') || '1. 促進社交互動<br>2. 增進認知功能'}
            </td>
        </tr>
        <tr>
            <td class="label">教材</td>
            <td>${full.materials || '■CD+音響 ■椅子 ■桌子 □名牌 □茶杯 □白板 ■簽到表 ■茶水'}</td>
        </tr>
    </table>

    ${full.notes ? `
    <table>
        <tr>
            <td class="section-title">特殊狀況/備註</td>
        </tr>
        <tr>
            <td>${full.notes}</td>
        </tr>
    </table>
    ` : ''}

    <!-- 個案評估表 -->
    ${full.participants && full.participants.length > 0 ? `
    <div style="page-break-before: always;"></div>
    <h1 style="text-align: center; font-size: 18pt; margin-top: 20px;">社團法人宜蘭縣長期照護及社會福祉推廣協會</h1>
    <h2 style="text-align: center; font-size: 16pt; margin-bottom: 20px;">${getSiteDisplayName()} - 個案評估表</h2>
    
    <table>
        <tr>
            <th rowspan="2" style="width: 80px;">個案姓名</th>
            <th>注意力</th>
            <th>出席程度</th>
            <th>人際互動</th>
            <th>發言次數</th>
            <th>參與程度</th>
            <th>享受活動</th>
            <th>短期記憶</th>
            <th>長期記憶</th>
        </tr>
        <tr>
            <td style="font-size: 8pt;">
                0 &lt;10分鐘<br>
                1 10-20分<br>
                2 20-40分<br>
                3 40-60分<br>
                4 &gt;60分鐘
            </td>
            <td style="font-size: 8pt;">
                0 拒絕出席<br>
                1 需說服<br>
                2 需提醒<br>
                3 不需催促<br>
                4 主動詢問
            </td>
            <td style="font-size: 8pt;">
                0 不互動<br>
                1 偶爾回應<br>
                2 回應他人<br>
                3 主動(個別)<br>
                4 主動(成員)
            </td>
            <td style="font-size: 8pt;">
                0 &lt;5次<br>
                1 5-9次<br>
                2 10-14次<br>
                3 15-19次<br>
                4 &gt;20次
            </td>
            <td style="font-size: 8pt;">
                0 完全不參與<br>
                1 引導下<br>
                2 少許參與<br>
                3 多可參與<br>
                4 積極參與
            </td>
            <td style="font-size: 8pt;">
                0 無顯好/厭惡<br>
                1 愉悅表現<br>
                2 關心享受<br>
                3 多數活動<br>
                4 全程活動
            </td>
            <td style="font-size: 8pt;">
                0 引導下<br>
                1 需回想<br>
                2 記1<br>
                3 記全程<br>
                4 能回憶
            </td>
            <td style="font-size: 8pt;">
                0 引導下<br>
                1 片段<br>
                2 記1<br>
                3 記全程<br>
                4 能回憶
            </td>
        </tr>
        ${full.participants.map(p => `
        <tr>
            <td style="font-weight: bold;">${p.name}</td>
            <td style="text-align: center;">3</td>
            <td style="text-align: center;">3</td>
            <td style="text-align: center;">3</td>
            <td style="text-align: center;">3</td>
            <td style="text-align: center;">3</td>
            <td style="text-align: center;">3</td>
            <td style="text-align: center;">2</td>
            <td style="text-align: center;">2</td>
        </tr>
        `).join('')}
    </table>
    ` : ''}

    <div style="text-align: center; margin-top: 30px; font-weight: bold;">活動照片</div>
    ${(() => {
                // 優先使用 API 返回的照片 URL（activity），其次使用 localStorage（full）
                const photoList = activity.photos || full.photos || [];
                if (photoList.length > 0) {
                    // 使用 table 佈局（Word 相容）
                    return `
            <table style="width: 100%; margin-top: 10px;">
                <tr>
                ${photoList.map((p, i) => `
                    <td style="width: 50%; padding: 5px; text-align: center; vertical-align: top;">
                        <img src="${p}" alt="活動照片${i + 1}" style="max-width: 100%; max-height: 280px; border: 1px solid #ccc;">
                    </td>
                    ${i % 2 === 1 && i < photoList.length - 1 ? '</tr><tr>' : ''}
                `).join('')}
                </tr>
            </table>`;
                } else {
                    return '<p style="text-align: center; color: #999;">（無照片）</p>';
                }
            })()}

    <div style="margin-top: 50px; text-align: right; font-size: 10pt; color: #666;">
        匯出時間：${new Date().toLocaleString('zh-TW')}
    </div>
</body>
</html>`;

        // 下載為 HTML 檔案（可用 Word 開啟）
        const blob = new Blob([html], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `活動紀錄_${full.date}_${full.topic}.doc`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">📄 活動列表</h1>

            {/* 月份選擇 */}
            <div className="mb-4">
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full p-3 bg-white rounded-xl shadow text-lg font-medium"
                >
                    {getMonthOptions().map(m => (
                        <option key={m} value={m}>{m.replace('-', '年')}月</option>
                    ))}
                </select>
            </div>

            {/* 活動列表 */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                        <div className="text-5xl mb-4 animate-bounce">⏳</div>
                        <p className="text-gray-600 font-medium">載入活動紀錄中...</p>
                        <p className="text-gray-400 text-sm mt-2">首次載入可能需要 3-5 秒</p>
                    </div>
                ) : filteredActivities.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-400">
                        <div className="text-5xl mb-4">📭</div>
                        <p>本月尚無活動紀錄</p>
                        <Link
                            href={`/${siteId}/activity/new`}
                            className="inline-block mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                        >
                            + 新增活動
                        </Link>
                    </div>
                ) : (
                    filteredActivities.map((activity, index) => (
                        <div key={index} className="bg-white rounded-xl shadow-sm overflow-hidden">
                            {/* 活動摘要 */}
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="font-bold text-lg">{activity.topic}</div>
                                        {activity.activityName && (
                                            <div className="text-gray-600">{activity.activityName}</div>
                                        )}
                                        <div className="text-sm text-gray-500 mt-1">
                                            {activity.date} {activity.time === 'am' ? '上午' : '下午'}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                            {activity.participants?.length || 0} 人參與
                                        </span>
                                    </div>
                                </div>

                                {/* 操作按鈕 */}
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => handleExpand(activity)}
                                        className="flex-1 py-2 px-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition"
                                    >
                                        {expandedKey === activity.key ? '▲ 收合' : '▼ 查看更多'}
                                    </button>
                                    <button
                                        onClick={() => handleExport(activity)}
                                        className="flex-1 py-2 px-3 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition"
                                    >
                                        📥 匯出
                                    </button>
                                </div>
                            </div>

                            {/* 展開詳情 */}
                            {expandedKey === activity.key && fullActivity && (
                                <div className="border-t bg-gray-50 p-4">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-gray-500">主題：</span>
                                            <span className="font-medium">{fullActivity.topic}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">活動：</span>
                                            <span className="font-medium">{fullActivity.activityName || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">日期：</span>
                                            <span className="font-medium">{fullActivity.date}</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">時段：</span>
                                            <span className="font-medium">{fullActivity.time === 'am' ? '上午' : '下午'}</span>
                                        </div>
                                    </div>

                                    {/* 活動目的 */}
                                    {fullActivity.purposes && fullActivity.purposes.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-gray-500 text-sm mb-1">活動目的：</div>
                                            <div className="flex flex-wrap gap-1">
                                                {fullActivity.purposes.map((p, i) => (
                                                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                                                        {p}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 參與者名單 */}
                                    <div className="mt-3">
                                        <div className="text-gray-500 text-sm mb-1">
                                            參與者（{fullActivity.participants?.length || 0} 人）：
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {fullActivity.participants?.map((p, i) => (
                                                <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                                    {p.name}
                                                </span>
                                            )) || <span className="text-gray-400">無</span>}
                                        </div>
                                    </div>

                                    {/* 備註 */}
                                    {fullActivity.notes && (
                                        <div className="mt-3">
                                            <div className="text-gray-500 text-sm mb-1">備註：</div>
                                            <div className="text-gray-700 text-sm bg-white p-2 rounded">
                                                {fullActivity.notes}
                                            </div>
                                        </div>
                                    )}

                                    {/* 照片預覽 */}
                                    {fullActivity.photos && fullActivity.photos.length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-gray-500 text-sm mb-1">活動照片：</div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {fullActivity.photos.slice(0, 3).map((photo, i) => (
                                                    <img
                                                        key={i}
                                                        src={photo}
                                                        alt={`照片${i + 1}`}
                                                        className="w-full h-20 object-cover rounded"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 編輯按鈕 */}
                                    <div className="mt-4 pt-3 border-t">
                                        <Link
                                            href={`/${siteId}/activity/new?edit=${encodeURIComponent(activity.key)}`}
                                            className="block w-full py-2 bg-green-500 text-white text-center rounded-lg font-medium hover:bg-green-600 transition"
                                        >
                                            ✏️ 編輯此活動
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* 返回按鈕 */}
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

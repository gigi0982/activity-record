'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { elderApi, activityApi, quickEntryApi, Elder, QuickEntryRecord } from '@/lib/api';
import { checkDateLock, isAdminOverride } from '@/lib/dataLock';

interface ParticipantRating {
    name: string;
    level: string;
    focus: number;      // 專注力
    social: number;     // 人際互動
    attention: number;  // 注意力
    participation: number; // 參與程度
    notes: string;      // 備註
}

interface Topic {
    id: string;
    name: string;
    purposes: string[];
}

const DEFAULT_TOPICS: Topic[] = [
    { id: '1', name: '認知促進', purposes: ['提升專注力', '增進記憶力', '維持認知功能'] },
    { id: '2', name: '懷舊治療', purposes: ['增進記憶力', '情緒穩定', '促進社交互動'] },
    { id: '3', name: '音樂治療', purposes: ['情緒穩定', '提升自我表達', '增加生活參與'] },
    { id: '4', name: '藝術創作', purposes: ['提升專注力', '增進手眼協調', '提升自我表達'] },
    { id: '5', name: '體適能', purposes: ['增進手眼協調', '維持認知功能', '增加生活參與'] },
    { id: '6', name: '園藝治療', purposes: ['情緒穩定', '增加生活參與', '促進社交互動'] },
    { id: '7', name: '烹飪活動', purposes: ['維持認知功能', '增進手眼協調', '增加生活參與'] },
    { id: '8', name: '社交活動', purposes: ['促進社交互動', '情緒穩定', '增加生活參與'] },
    { id: '9', name: '生活功能訓練', purposes: ['維持認知功能', '增進手眼協調', '增加生活參與'] },
    { id: '10', name: '節慶活動', purposes: ['情緒穩定', '促進社交互動', '增加生活參與'] },
];

const ALL_PURPOSES = [
    '提升專注力',
    '增進記憶力',
    '促進社交互動',
    '維持認知功能',
    '情緒穩定',
    '增進手眼協調',
    '提升自我表達',
    '增加生活參與',
];

const ratingOptions = [
    { value: 1, label: '1 - 很差' },
    { value: 2, label: '2 - 較差' },
    { value: 3, label: '3 - 普通' },
    { value: 4, label: '4 - 良好' },
    { value: 5, label: '5 - 優秀' },
];

const getLevelColor = (level: string) => {
    switch (level) {
        case 'A': return { bg: '#4CAF50', text: 'white' }; // 綠色
        case 'B': return { bg: '#FF9800', text: 'white' }; // 橙色
        case 'C': return { bg: '#F44336', text: 'white' }; // 紅色
        default: return { bg: '#9E9E9E', text: 'white' };
    }
};

const getDefaultRating = (level: string) => {
    switch (level) {
        case 'A': return 4;
        case 'B': return 3;
        case 'C': return 2;
        default: return 3;
    }
};

export default function NewActivityPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const siteId = params.site as string;
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 檢查是否為編輯模式
    const editId = searchParams.get('edit');
    const isEditMode = !!editId;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const isAM = today.getHours() < 12;

    const [formData, setFormData] = useState({
        date: todayStr,
        time: isAM ? 'am' : 'pm',
        timeSlot: isAM ? '09:00-11:00' : '13:30-15:30',
        topic: '',
        activityName: '',
        specialSituation: '',
    });

    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedPurposes, setSelectedPurposes] = useState<string[]>([]);
    const [elders, setElders] = useState<Elder[]>([]);
    const [participants, setParticipants] = useState<ParticipantRating[]>([]);
    const [photos, setPhotos] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            // 載入長者資料
            const elderList = await elderApi.getElders();
            setElders(elderList);

            // 載入活動主題
            let loadedTopics = DEFAULT_TOPICS;
            if (typeof window !== 'undefined') {
                const savedTopics = localStorage.getItem('activity_topics');
                if (savedTopics) {
                    loadedTopics = JSON.parse(savedTopics);
                }
            }
            setTopics(loadedTopics);

            // 如果是編輯模式，載入現有活動資料
            if (isEditMode && editId) {
                await loadExistingActivity(editId, elderList, loadedTopics);
            } else {
                // 新增模式：嘗試從快速登記載入今日出席名單
                try {
                    const timeSlot = isAM ? 'am' : 'pm';
                    console.log('嘗試載入今日快速登記出席資料:', todayStr, timeSlot);
                    const records = await quickEntryApi.getQuickEntry(siteId, todayStr);

                    console.log('API 回傳資料:', JSON.stringify(records));
                    console.log('資料筆數:', records?.length || 0);

                    if (records && records.length > 0) {
                        console.log('第一筆資料:', JSON.stringify(records[0]));

                        const attendees = records.filter(r => {
                            const isPresent = timeSlot === 'am' ? r.presentAM : r.presentPM;
                            const isVirtual = r.virtual;
                            console.log(`${r.elderName}: presentAM=${r.presentAM}, presentPM=${r.presentPM}, virtual=${isVirtual}, 符合=${isPresent && !isVirtual}`);
                            return isPresent && !isVirtual;
                        }).map(r => r.elderName);

                        console.log('篩選後出席者:', attendees);

                        if (attendees.length > 0) {
                            const participantRatings: ParticipantRating[] = attendees.map(name => {
                                const elder = elderList.find(e => e.name === name);
                                const level = elder?.level || 'B';
                                const defaultScore = getDefaultRating(level);
                                return {
                                    name,
                                    level,
                                    focus: defaultScore,
                                    social: defaultScore,
                                    attention: defaultScore,
                                    participation: defaultScore,
                                    notes: '',
                                };
                            });
                            setParticipants(participantRatings);
                            console.log('✅ 已自動帶入', attendees.length, '位出席者');
                        } else {
                            console.log('⚠️ 沒有找到符合時段的出席者');
                        }
                    } else {
                        console.log('⚠️ API 回傳空資料或 null');
                    }
                } catch (err) {
                    console.log('無法載入快速登記資料，可能尚未登記:', err);
                }
            }
        } catch (err) {
            console.error('載入失敗:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // 載入現有活動資料（使用快速 API，帶 fallback）
    const loadExistingActivity = async (activityId: string, elderList: Elder[], topicList: Topic[]) => {
        console.log('開始載入活動資料, ID:', activityId);

        try {
            // 嘗試使用快速 API 只取得單一活動
            let activity = null;

            try {
                const response = await activityApi.getActivityById(activityId);
                console.log('快速 API 回應:', response);
                // 檢查是否為有效的活動資料（需要有 id 或 date 欄位）
                if (response && (response.id || response.date)) {
                    activity = response;
                } else {
                    console.log('快速 API 回應格式不正確，使用 fallback');
                }
            } catch (fastApiError) {
                console.log('快速 API 錯誤，使用傳統方法:', fastApiError);
            }

            // 如果快速 API 失敗或返回無效資料，使用傳統方法
            if (!activity) {
                console.log('使用傳統方法載入所有活動...');
                const activities = await activityApi.getActivities(siteId);
                console.log('取得活動數量:', activities.length);
                activity = activities.find((a: any) => a.id === activityId) || null;
                console.log('找到的活動:', activity);
            }

            if (activity) {
                // 設定基本資料
                setFormData({
                    date: activity.date || todayStr,
                    time: activity.time || 'am',
                    timeSlot: activity.time === 'pm' ? '13:30-15:30' : '09:00-11:00',
                    topic: activity.topic || '',
                    activityName: activity.activityName || (activity as any).name || '',
                    specialSituation: activity.notes || (activity as any).specialSituation || '',
                });

                // 設定活動目的
                if (activity.purposes && Array.isArray(activity.purposes)) {
                    setSelectedPurposes(activity.purposes);
                } else if ((activity as any).purpose && typeof (activity as any).purpose === 'string') {
                    // API 返回的是字串格式（頓號分隔）
                    const purposeStr = (activity as any).purpose as string;
                    const purposeList = purposeStr.split('、').filter((p: string) => p.trim());
                    setSelectedPurposes(purposeList);
                } else if (activity.topic) {
                    // 如果沒有 purposes，從主題取得預設目的
                    const topic = topicList.find(t => t.name === activity.topic);
                    if (topic) {
                        setSelectedPurposes(topic.purposes);
                    }
                }

                // 設定參與者
                let participantList: string[] = [];

                if (activity.participants && Array.isArray(activity.participants)) {
                    // 如果已經是陣列
                    participantList = activity.participants.map((p: any) =>
                        typeof p === 'string' ? p : p.name
                    );
                } else if (activity.participants && typeof activity.participants === 'string') {
                    // API 返回的是字串格式（頓號分隔）
                    participantList = (activity.participants as string).split('、').filter((p: string) => p.trim());
                }

                if (participantList.length > 0) {
                    const participantRatings: ParticipantRating[] = participantList.map((name: string) => {
                        const elder = elderList.find(e => e.name === name);
                        const level = elder?.level || 'B';
                        const defaultScore = getDefaultRating(level);
                        return {
                            name: name,
                            level: level,
                            focus: defaultScore,
                            social: defaultScore,
                            attention: defaultScore,
                            participation: defaultScore,
                            notes: '',
                        };
                    });
                    setParticipants(participantRatings);
                }

                // 設定照片
                if (activity.photos && Array.isArray(activity.photos)) {
                    setPhotos(activity.photos);
                }

                console.log('已載入活動資料:', activity);
            } else {
                console.warn('找不到活動:', activityId);
            }
        } catch (err) {
            console.error('載入活動資料失敗:', err);
            // 嘗試從 localStorage 載入
            if (typeof window !== 'undefined') {
                const localData = localStorage.getItem(`activity_${activityId}`);
                if (localData) {
                    const activity = JSON.parse(localData);
                    setFormData({
                        date: activity.date || todayStr,
                        time: activity.time || 'am',
                        timeSlot: activity.time === 'pm' ? '13:30-15:30' : '09:00-11:00',
                        topic: activity.topic || '',
                        activityName: activity.activityName || '',
                        specialSituation: activity.specialSituation || '',
                    });
                    if (activity.purposes) setSelectedPurposes(activity.purposes);
                    if (activity.participants) setParticipants(activity.participants);
                    if (activity.photos) setPhotos(activity.photos);
                }
            }
        }
    };

    // 從快速登記載入出席名單
    const loadAttendanceFromQuickEntry = async (date: string, timeSlot: 'am' | 'pm') => {
        try {
            console.log('載入快速登記出席資料:', date, timeSlot);
            const records = await quickEntryApi.getQuickEntry(siteId, date);

            if (records && records.length > 0) {
                // 根據時段篩選出席者（排除虛報）
                const attendees = records.filter(r =>
                    (timeSlot === 'am' ? r.presentAM : r.presentPM) && !r.virtual
                ).map(r => r.elderName);

                console.log('找到出席者:', attendees);

                if (attendees.length > 0) {
                    // 將出席者轉換為 ParticipantRating 格式
                    const participantRatings: ParticipantRating[] = attendees.map(name => {
                        const elder = elders.find(e => e.name === name);
                        const level = elder?.level || 'B';
                        const defaultScore = getDefaultRating(level);
                        return {
                            name,
                            level,
                            focus: defaultScore,
                            social: defaultScore,
                            attention: defaultScore,
                            participation: defaultScore,
                            notes: '',
                        };
                    });
                    setParticipants(participantRatings);
                    return attendees.length;
                }
            }
            return 0;
        } catch (err) {
            console.error('載入快速登記出席資料失敗:', err);
            return 0;
        }
    };

    // 當日期或時段改變時，詢問是否載入出席名單
    const handleDateChange = async (newDate: string) => {
        setFormData(prev => ({ ...prev, date: newDate }));

        // 如果不是編輯模式，嘗試載入該日期的出席資料
        if (!isEditMode && elders.length > 0) {
            const count = await loadAttendanceFromQuickEntry(newDate, formData.time as 'am' | 'pm');
            if (count > 0) {
                alert(`✅ 已從快速登記帶入 ${count} 位${formData.time === 'am' ? '上午' : '下午'}出席的長者！`);
            }
        }
    };

    const handleTimeChange = async (newTime: 'am' | 'pm') => {
        setFormData(prev => ({
            ...prev,
            time: newTime,
            timeSlot: newTime === 'am' ? '09:00-11:00' : '13:30-15:30'
        }));

        // 如果不是編輯模式，嘗試載入該時段的出席資料
        if (!isEditMode && elders.length > 0) {
            const count = await loadAttendanceFromQuickEntry(formData.date, newTime);
            if (count > 0) {
                alert(`✅ 已從快速登記帶入 ${count} 位${newTime === 'am' ? '上午' : '下午'}出席的長者！`);
            }
        }
    };

    const handleTopicChange = (topicName: string) => {
        setFormData({ ...formData, topic: topicName });
        // 根據主題自動選擇相關目的
        const topic = topics.find(t => t.name === topicName);
        if (topic) {
            setSelectedPurposes(topic.purposes);
        } else {
            setSelectedPurposes([]);
        }
    };

    const togglePurpose = (purpose: string) => {
        setSelectedPurposes(prev =>
            prev.includes(purpose)
                ? prev.filter(p => p !== purpose)
                : [...prev, purpose]
        );
    };

    const toggleElder = (elder: Elder) => {
        const exists = participants.find(p => p.name === elder.name);
        if (exists) {
            setParticipants(prev => prev.filter(p => p.name !== elder.name));
        } else {
            const defaultScore = getDefaultRating(elder.level);
            setParticipants(prev => [...prev, {
                name: elder.name,
                level: elder.level,
                focus: defaultScore,
                social: defaultScore,
                attention: defaultScore,
                participation: defaultScore,
                notes: '',
            }]);
        }
    };

    const selectAllElders = () => {
        setParticipants(elders.map(e => ({
            name: e.name,
            level: e.level,
            focus: getDefaultRating(e.level),
            social: getDefaultRating(e.level),
            attention: getDefaultRating(e.level),
            participation: getDefaultRating(e.level),
            notes: '',
        })));
    };

    const deselectAllElders = () => {
        setParticipants([]);
    };

    const removeParticipant = (name: string) => {
        setParticipants(prev => prev.filter(p => p.name !== name));
    };

    const updateRating = (name: string, field: keyof ParticipantRating, value: number | string) => {
        setParticipants(prev => prev.map(p =>
            p.name === name ? { ...p, [field]: value } : p
        ));
    };

    // 壓縮圖片函數
    const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.6): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // 如果圖片太大，等比例縮小
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('無法創建 canvas context'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);

                    // 輸出壓縮後的 base64
                    const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                    console.log(`壓縮後大小: ${Math.round(compressedBase64.length / 1024)} KB`);
                    resolve(compressedBase64);
                };
                img.onerror = () => reject(new Error('圖片載入失敗'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            reader.readAsDataURL(file);
        });
    };

    const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        for (const file of Array.from(files)) {
            if (photos.length >= 4) break;

            try {
                // 壓縮照片（最大寬度 800px，品質 60%）
                const compressedBase64 = await compressImage(file, 800, 0.6);
                setPhotos(prev => {
                    if (prev.length >= 4) return prev;
                    return [...prev, compressedBase64];
                });
            } catch (err) {
                console.error('照片壓縮失敗:', err);
                alert('照片處理失敗，請重試');
            }
        }
    };

    const removePhoto = (index: number) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!formData.topic) {
            alert('請選擇活動主題');
            return;
        }
        if (selectedPurposes.length === 0) {
            alert('請選擇至少一個活動目的');
            return;
        }
        if (participants.length === 0) {
            alert('請選擇至少一位參與者');
            return;
        }

        // 資料鎖定檢查
        const lockStatus = checkDateLock(formData.date);
        if (lockStatus.isLocked && !isAdminOverride()) {
            alert(`🔒 ${lockStatus.message}\n\n如需修改，請聯繫管理員。`);
            return;
        }

        // 檢查是否已有同一天同一時段的活動（僅在新增模式時檢查）
        if (!isEditMode) {
            try {
                const existingActivities = await activityApi.getActivities(siteId);
                const timeSlotLabel = formData.time === 'am' ? '上午' : '下午';
                const duplicateActivity = existingActivities.find(
                    (a: { date: string; time: string }) => a.date === formData.date && a.time === formData.time
                );

                if (duplicateActivity) {
                    const confirm = window.confirm(
                        `⚠️ ${formData.date} ${timeSlotLabel} 已經有一筆活動紀錄！\n\n確定要新增另一筆嗎？\n（建議：點擊「取消」，然後到活動紀錄列表編輯既有的活動）`
                    );
                    if (!confirm) {
                        return;
                    }
                }
            } catch (err) {
                console.log('檢查既有活動失敗，繼續儲存:', err);
            }
        }

        setIsSaving(true);
        try {
            const activity = {
                ...formData,
                purposes: selectedPurposes,
                participants,
                photos,
                createdAt: new Date().toISOString(),
            };

            // 儲存到 localStorage（不包含照片，避免容量問題）
            if (typeof window !== 'undefined') {
                const key = `activity_${formData.date}_${formData.time}`;
                const activityForStorage = {
                    ...activity,
                    photos: photos.slice(0, 3), // 只存前3張照片
                };

                try {
                    localStorage.setItem(key, JSON.stringify(activityForStorage));
                } catch (storageErr) {
                    console.warn('照片太大，改存不含照片版本');
                    localStorage.setItem(key, JSON.stringify({ ...activity, photos: [] }));
                }

                // 加入活動列表
                const listKey = 'activities_list';
                const list = JSON.parse(localStorage.getItem(listKey) || '[]');
                list.unshift({
                    key,
                    date: formData.date,
                    time: formData.time,
                    topic: formData.topic,
                    activityName: formData.activityName,
                    participants: participants
                });
                localStorage.setItem(listKey, JSON.stringify(list.slice(0, 100)));
            }

            // 同步到 Google Sheets（照片會在 GAS 自動上傳到 Google Drive）
            try {
                await activityApi.addActivity({
                    date: formData.date,
                    time: formData.time,
                    topic: formData.topic,
                    activityName: formData.activityName,
                    purposes: selectedPurposes,
                    participants,
                    notes: formData.specialSituation,
                    siteId: siteId as string,
                    base64Photos: photos,  // 直接傳送 base64 照片，讓 GAS 處理上傳
                });
            } catch (apiErr) {
                console.error('同步到 Google Sheets 失敗:', apiErr);
            }

            // 顯示成功訊息並延遲跳轉
            alert(`✅ 活動記錄已儲存！\n\n📋 活動：${formData.topic}\n👥 參與：${participants.length} 人`);

            // 延遲後跳轉
            setTimeout(() => {
                router.push(`/${siteId}/activities`);
            }, 500);
        } catch (err) {
            console.error('儲存錯誤:', err);
            alert(`儲存失敗：${err instanceof Error ? err.message : '未知錯誤'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-500">載入中...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 pb-24">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">
                {isEditMode ? '✏️ 編輯活動紀錄' : '新增活動紀錄'}
            </h1>

            {/* 基本資訊 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">活動日期 *</label>
                        <input
                            type="date"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            value={formData.date}
                            onChange={(e) => handleDateChange(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">活動時間 *</label>
                        <div className="flex gap-2">
                            <label className="flex items-center gap-1">
                                <input
                                    type="radio"
                                    name="timeSlot"
                                    checked={formData.timeSlot === '09:00-11:00'}
                                    onChange={() => handleTimeChange('am')}
                                />
                                <span className="text-sm">09:00-11:00</span>
                            </label>
                            <label className="flex items-center gap-1">
                                <input
                                    type="radio"
                                    name="timeSlot"
                                    checked={formData.timeSlot === '13:30-15:30'}
                                    onChange={() => handleTimeChange('pm')}
                                />
                                <span className="text-sm">13:30-15:30</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">活動名稱 *</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="例：認知訓練課程、懷舊音樂"
                            value={formData.activityName}
                            onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
                        />
                    </div>
                </div>

                {/* 活動主題 */}
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm text-gray-600">活動主題 *</label>
                        <Link
                            href={`/${siteId}/topics`}
                            className="text-blue-500 hover:underline text-sm"
                        >
                            + 新增主題
                        </Link>
                    </div>
                    <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        value={formData.topic}
                        onChange={(e) => handleTopicChange(e.target.value)}
                    >
                        <option value="">-- 請選擇活動主題 --</option>
                        {topics.map((t) => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* 活動目的 */}
                <div>
                    <label className="block text-sm text-gray-600 mb-2">
                        活動目的 *（點擊選取，建議選 2-3 個）
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {ALL_PURPOSES.map(purpose => (
                            <button
                                key={purpose}
                                type="button"
                                onClick={() => togglePurpose(purpose)}
                                className={`px-3 py-1.5 rounded-full text-sm transition ${selectedPurposes.includes(purpose)
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {purpose}
                            </button>
                        ))}
                    </div>
                    <p className={`mt-2 text-sm ${selectedPurposes.length === 0 ? 'text-red-500' : 'text-green-600'}`}>
                        已選擇 {selectedPurposes.length} 個目的
                    </p>
                </div>
            </div>

            {/* 參與者選擇 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-gray-800">選擇今日參與的長者</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={selectAllElders}
                            className="px-3 py-1 text-sm text-green-600 hover:text-green-800"
                        >
                            ✓ 全選
                        </button>
                        <button
                            onClick={deselectAllElders}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                            ✕ 取消全選
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {elders.map((elder) => {
                        const isSelected = participants.some(p => p.name === elder.name);
                        const levelColor = getLevelColor(elder.level);
                        return (
                            <label
                                key={elder.id}
                                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition hover:bg-gray-50 ${isSelected ? 'bg-green-50' : ''
                                    }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleElder(elder)}
                                    className="w-4 h-4 text-green-600 rounded"
                                />
                                <span className="text-sm font-medium">{elder.name}</span>
                                <span
                                    className="px-1.5 py-0.5 text-xs rounded-full font-bold"
                                    style={{ backgroundColor: levelColor.bg, color: levelColor.text }}
                                >
                                    {elder.level}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* 參與者表現評分 */}
            {participants.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                    <h2 className="font-semibold text-gray-800 mb-4">參與者表現評分</h2>
                    <div className="space-y-4">
                        {participants.map((p) => {
                            const levelColor = getLevelColor(p.level);
                            const suggestedScore = getDefaultRating(p.level);
                            return (
                                <div key={p.name} className="border border-gray-200 rounded-lg p-4">
                                    {/* 標題行 */}
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-lg">{p.name}</span>
                                            <span
                                                className="px-2 py-0.5 text-xs rounded-full font-bold"
                                                style={{ backgroundColor: levelColor.bg, color: levelColor.text }}
                                            >
                                                {p.level} - {suggestedScore}-4分
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => removeParticipant(p.name)}
                                            className="text-red-500 hover:text-red-700 text-sm"
                                        >
                                            移除
                                        </button>
                                    </div>

                                    {/* 系統建議 */}
                                    <div className="mb-3 text-sm text-gray-500">
                                        💡 系統建議：依據分級，建議評分範圍 - 分
                                    </div>

                                    {/* 評分選項 */}
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">專注力</label>
                                            <select
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                value={p.focus}
                                                onChange={(e) => updateRating(p.name, 'focus', Number(e.target.value))}
                                            >
                                                {ratingOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">人際互動</label>
                                            <select
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                value={p.social}
                                                onChange={(e) => updateRating(p.name, 'social', Number(e.target.value))}
                                            >
                                                {ratingOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">注意力</label>
                                            <select
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                value={p.attention}
                                                onChange={(e) => updateRating(p.name, 'attention', Number(e.target.value))}
                                            >
                                                {ratingOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">參與程度</label>
                                            <select
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                value={p.participation}
                                                onChange={(e) => updateRating(p.name, 'participation', Number(e.target.value))}
                                            >
                                                {ratingOptions.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">備註</label>
                                            <input
                                                type="text"
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                                placeholder="備註"
                                                value={p.notes}
                                                onChange={(e) => updateRating(p.name, 'notes', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 活動照片 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="font-semibold text-gray-800">活動照片（最多4張）</h2>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                        選擇照片
                    </button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                />
                <p className="text-sm text-gray-500 mb-3">
                    支援 JPEG、PNG、GIF、WebP 格式，單一檔案最大 5MB
                </p>

                {photos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {photos.map((photo, index) => (
                            <div key={index} className="relative">
                                <img
                                    src={photo}
                                    alt={`活動照片 ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg"
                                />
                                <button
                                    onClick={() => removePhoto(index)}
                                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 特殊狀況 */}
            <div className="bg-white rounded-xl shadow-sm p-4 mb-20">
                <label className="block font-semibold text-gray-800 mb-2">特殊狀況</label>
                <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    rows={3}
                    placeholder="記錄特殊狀況、長者異常反應等..."
                    value={formData.specialSituation}
                    onChange={(e) => setFormData({ ...formData, specialSituation: e.target.value })}
                />
            </div>

            {/* 底部按鈕 */}
            <div className="fixed bottom-16 left-0 right-0 p-3 bg-white shadow-lg flex gap-3 z-40">
                <Link
                    href={`/${siteId}`}
                    className="flex-1 py-4 bg-gray-400 text-white text-center rounded-xl font-bold hover:bg-gray-500 transition"
                >
                    ← 取消
                </Link>
                <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className={`flex-[2] py-4 ${isSaving ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'
                        } text-white rounded-xl text-lg font-bold transition`}
                >
                    {isSaving ? '儲存中...' : '✓ 儲存活動'}
                </button>
            </div>
        </div>
    );
}

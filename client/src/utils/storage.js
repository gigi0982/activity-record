// 本地儲存工具函數
// 使用 LocalStorage 儲存活動資料

const STORAGE_KEYS = {
    ACTIVITIES: 'activity_records',
    MEETINGS: 'meeting_records',
    PLANS: 'plan_records'
};

// 取得所有活動
export const getActivities = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('讀取活動資料失敗:', e);
        return [];
    }
};

// 新增活動
export const addActivity = (activity) => {
    try {
        const activities = getActivities();
        const newActivity = {
            ...activity,
            id: 'activity-' + Date.now(),
            createdAt: new Date().toISOString()
        };
        activities.unshift(newActivity); // 新的放最前面
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
        return { success: true, activity: newActivity };
    } catch (e) {
        console.error('儲存活動失敗:', e);
        return { success: false, error: e.message };
    }
};

// 刪除活動
export const deleteActivity = (activityId) => {
    try {
        const activities = getActivities();
        const filtered = activities.filter(a => a.id !== activityId);
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(filtered));
        return { success: true };
    } catch (e) {
        console.error('刪除活動失敗:', e);
        return { success: false, error: e.message };
    }
};

// 取得所有會議
export const getMeetings = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.MEETINGS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('讀取會議資料失敗:', e);
        return [];
    }
};

// 新增會議
export const addMeeting = (meeting) => {
    try {
        const meetings = getMeetings();
        const newMeeting = {
            ...meeting,
            id: 'meeting-' + Date.now(),
            createdAt: new Date().toISOString()
        };
        meetings.unshift(newMeeting);
        localStorage.setItem(STORAGE_KEYS.MEETINGS, JSON.stringify(meetings));
        return { success: true, meeting: newMeeting };
    } catch (e) {
        console.error('儲存會議失敗:', e);
        return { success: false, error: e.message };
    }
};

// 取得所有規劃
export const getPlans = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.PLANS);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('讀取規劃資料失敗:', e);
        return [];
    }
};

// 新增規劃
export const addPlan = (plan) => {
    try {
        const plans = getPlans();
        const newPlan = {
            ...plan,
            id: 'plan-' + Date.now(),
            createdAt: new Date().toISOString()
        };
        plans.unshift(newPlan);
        localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(plans));
        return { success: true, plan: newPlan };
    } catch (e) {
        console.error('儲存規劃失敗:', e);
        return { success: false, error: e.message };
    }
};

// 初始化範例資料（如果 LocalStorage 是空的）
export const initSampleData = () => {
    // 檢查是否已有活動資料
    if (getActivities().length === 0) {
        const sampleActivities = [
            {
                id: 'sample-1',
                date: '2024-12-20',
                purpose: '提升認知功能',
                topic: '懷舊歌曲欣賞',
                participants: [
                    { name: '王阿姨', level: 'A', focus: 4, interaction: 5, attention: 4, notes: '很投入活動' },
                    { name: '李伯伯', level: 'B', focus: 3, interaction: 4, attention: 3, notes: '' },
                    { name: '陳奶奶', level: 'B', focus: 4, interaction: 3, attention: 3, notes: '' }
                ],
                special: '王阿姨特別投入',
                discussion: '大家都很喜歡這個活動',
                createdAt: new Date().toISOString()
            },
            {
                id: 'sample-2',
                date: '2024-12-18',
                purpose: '促進社交互動',
                topic: '手工藝製作',
                participants: [
                    { name: '張先生', level: 'A', focus: 4, interaction: 5, attention: 4, notes: '作品完成度高' },
                    { name: '劉太太', level: 'A', focus: 5, interaction: 5, attention: 4, notes: '很有創意' },
                    { name: '吳阿公', level: 'C', focus: 2, interaction: 3, attention: 2, notes: '需要較多協助' }
                ],
                special: '',
                discussion: '作品完成度很高',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(sampleActivities));
    }
};

export default {
    getActivities,
    addActivity,
    deleteActivity,
    getMeetings,
    addMeeting,
    getPlans,
    addPlan,
    initSampleData
};

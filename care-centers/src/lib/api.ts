const DEFAULT_TIMEOUT_MS = 15000;
const UPLOAD_TIMEOUT_MS = 60000;

// 取得據點的 API Base URL
export function getApiBaseUrl(): string {
    return process.env.NEXT_PUBLIC_API_URL || 'https://activity-record-gyb2.vercel.app';
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

function detectLargePayload(data: any): boolean {
    if (!data) return false;
    if (Array.isArray(data.base64Photos) && data.base64Photos.length > 0) return true;
    if (typeof data.base64 === 'string' && data.base64.length > 200000) return true;
    return false;
}

// API 工具函數
export const api = {
    // GET 請求
    async get<T>(url: string): Promise<T> {
        const response = await fetchWithTimeout(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    },

    // POST 請求到 Google Apps Script
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async postToGoogleScript(action: string, data: any): Promise<void> {
        const bodyData = { action, ...data };
        const bodyString = JSON.stringify(bodyData);
        const timeoutMs = detectLargePayload(data) ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;

        if (process.env.NODE_ENV !== 'production') {
            console.log('=== POST 請求詳情 ===');
            console.log('action:', action);
            console.log('body 大小:', Math.round(bodyString.length / 1024), 'KB');
            console.log('base64Photos 存在:', !!data.base64Photos);
            console.log('base64Photos 長度:', data.base64Photos?.length || 0);
        }

        try {
            const response = await fetchWithTimeout('/api/gas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: bodyString,
            }, timeoutMs);
            if (process.env.NODE_ENV !== 'production') {
                console.log('POST 回應狀態:', response.status, response.statusText);
            }
        } catch (err) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('POST 請求失敗');
            }
        }
    },

    async postToGoogleScriptWithResult<T>(action: string, data: any): Promise<T> {
        const bodyData = { action, ...data };
        const timeoutMs = detectLargePayload(data) ? UPLOAD_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
        const response = await fetchWithTimeout('/api/gas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(bodyData),
        }, timeoutMs);
        return response.json();
    },

    // GET 請求到 Google Apps Script（用於 delete 等操作）
    async getFromGoogleScript<T>(action: string, params: Record<string, string>): Promise<T> {
        const queryString = new URLSearchParams({ action, ...params }).toString();
        const response = await fetchWithTimeout(`/api/gas?${queryString}`, { credentials: 'include' });
        return response.json();
    },
};

// 長者相關 API
export const elderApi = {
    // 取得長者列表
    async getElders(siteId?: string): Promise<Elder[]> {
        // 從 Google Apps Script 載入長者資料
        return api.getFromGoogleScript<Elder[]>('getElders', siteId ? { siteId } : {});
    },

    // 新增長者
    async addElder(data: NewElderData): Promise<void> {
        return api.postToGoogleScript('addElder', data);
    },

    // 刪除長者
    async deleteElder(name: string, siteId?: string): Promise<{ success: boolean; message: string }> {
        const params: Record<string, string> = { name };
        if (siteId) params.siteId = siteId;
        return api.getFromGoogleScript('deleteElder', params);
    },

    // 更新長者
    async updateElder(data: UpdateElderData): Promise<void> {
        return api.postToGoogleScript('updateElder', data);
    },
};

// 驗證相關 API
export const authApi = {
    // 驗證據點密碼（從 Google Sheets 讀取）
    async verifySitePassword(siteId: string, password: string): Promise<{ success: boolean; message: string; siteName?: string }> {
        return api.getFromGoogleScript('verifySitePassword', { siteId, password });
    },
};

// 類型定義
export interface Elder {
    id: string;
    name: string;
    caseNumber: string;       // 個案編號
    level: 'A' | 'B' | 'C';
    levelDesc: string;
    scoreRange: string;
    identityType: 'normal' | 'mediumLow' | 'low';
    identityDesc: string;
    fare: number;
    subsidyType: 'subsidy' | 'self';
    familyLineId: string;
    notes: string;
    customFare?: number;      // 自訂車資（外籍專用）
    monthlyQuota?: number;    // 月額度上限（0=不限）
    caseSource?: string;      // 個案來源
    hospital?: string;        // 確診醫院
    diagnosisDate?: string;   // 診斷書日期
    dementiaLevel?: string;   // 失智程度
    cdrScore?: string;        // CDR分數
    cmsScore?: string;        // CMS分數
    adlScore?: string;        // ADL
    iadlScore?: string;       // IADL
    caregiverBurdenScore?: string; // 照顧者負荷量量表分數
}

export interface NewElderData {
    name: string;
    caseNumber?: string;
    level: string;
    levelDesc: string;
    scoreRange: string;
    identityType: string;
    identityDesc: string;
    fare: number;
    subsidyType: string;
    notes: string;
    familyLineId: string;
    customFare?: number;
    monthlyQuota?: number;
    caseSource?: string;
    hospital?: string;
    diagnosisDate?: string;
    dementiaLevel?: string;
    cdrScore?: string;
    cmsScore?: string;
    adlScore?: string;
    iadlScore?: string;
    caregiverBurdenScore?: string;
}

export interface UpdateElderData extends NewElderData {
    originalName: string;
}

// 用戶管理 API（使用 Google Sheets）
export const userApi = {
    // 登入驗證
    async login(name: string, password: string): Promise<{ success: boolean; message?: string; user?: UserData }> {
        try {
            const response = await fetchWithTimeout('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, password }),
            });
            const result = await response.json();
            if (!response.ok) {
                return { success: false, message: result?.message || '帳號或密碼錯誤' };
            }
            return result;
        } catch {
            return { success: false, message: '網路連線錯誤' };
        }
    },

    // 取得當前登入使用者
    async me(): Promise<{ user: UserData | null }> {
        try {
            const response = await fetchWithTimeout('/api/auth/me', { cache: 'no-store', credentials: 'include' });
            if (!response.ok) return { user: null };
            return response.json();
        } catch {
            return { user: null };
        }
    },

    // 登出
    async logout(): Promise<void> {
        try {
            await fetchWithTimeout('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch {
            // 忽略登出失敗
        }
    },

    // 取得所有用戶
    async getUsers(): Promise<UserData[]> {
        try {
            const result = await api.getFromGoogleScript<unknown>('getUsers', {});
            return Array.isArray(result) ? (result as UserData[]) : [];
        } catch {
            return [];
        }
    },

    // 新增用戶
    async addUser(data: { name: string; password?: string; role: string; siteId: string }): Promise<{ success: boolean; message?: string }> {
        try {
            return await api.postToGoogleScriptWithResult<{ success: boolean; message?: string }>('addUser', data);
        } catch {
            return { success: false, message: '新增失敗' };
        }
    },

    // 刪除用戶
    async deleteUser(name: string): Promise<{ success: boolean; message?: string }> {
        try {
            return await api.getFromGoogleScript<{ success: boolean; message?: string }>('deleteUser', { name });
        } catch {
            return { success: false, message: '刪除失敗' };
        }
    },

    // 重設密碼
    async resetPassword(name: string, password: string): Promise<{ success: boolean; message?: string }> {
        try {
            return await api.postToGoogleScriptWithResult<{ success: boolean; message?: string }>('resetPassword', { name, password });
        } catch {
            return { success: false, message: '重設失敗' };
        }
    },
};

// 費用設定 API
export const settingsApi = {
    // 取得設定
    async getSettings(siteId: string = 'all'): Promise<SettingsData> {
        return api.getFromGoogleScript<SettingsData>('getSettings', { siteId });
    },

    // 儲存設定
    async saveSettings(data: SettingsData & { siteId: string }): Promise<void> {
        return api.postToGoogleScript('saveSettings', data);
    },
};

// 活動紀錄 API
export interface ActivityData {
    date: string;
    time: string;
    topic: string;
    activityName?: string;
    purposes?: string[];
    participants?: { name: string; level?: string }[];
    materials?: string;
    notes?: string;
    photos?: string[];
    base64Photos?: string[];  // base64 格式的照片（用於上傳）
    leader?: string;
    coLeader?: string;
    recorder?: string;
    siteId?: string;
}

export interface ActivityRecord extends ActivityData {
    id: string;
    createdAt?: string;
}

export const activityApi = {
    // 取得活動列表
    async getActivities(siteId?: string): Promise<ActivityRecord[]> {
        const params: Record<string, string> = {};
        if (siteId) params.siteId = siteId;
        return api.getFromGoogleScript<ActivityRecord[]>('getActivities', params);
    },

    // 取得單一活動（效能優化版，只取一筆資料）
    async getActivityById(id: string): Promise<ActivityRecord | null> {
        return api.getFromGoogleScript<ActivityRecord | null>('getActivityById', { id });
    },

    // 新增活動（含照片上傳）
    async addActivity(data: ActivityData): Promise<void> {
        // 轉換格式以匹配 Google Sheets 結構
        const formattedData = {
            date: data.date,
            time: data.time,
            activityName: data.activityName || data.topic,
            purpose: data.purposes?.join('、') || '',
            topic: data.topic,
            participants: data.participants?.map(p => p.name).join('、') || '',
            special: data.notes || '',
            discussion: '',
            siteId: data.siteId || '',
            photos: data.photos?.join(',') || '',
            base64Photos: data.base64Photos || [],  // 傳送 base64 照片讓 GAS 上傳
        };
        return api.postToGoogleScript('addActivity', formattedData);
    },

    // 上傳照片到 Google Drive（需要取得回應）
    async uploadPhotos(photos: string[], activityId: string): Promise<{ success: boolean; urls: string[]; message?: string }> {
        try {
            return api.postToGoogleScriptWithResult<{ success: boolean; urls: string[]; message?: string }>('uploadPhotos', {
                photos,
                activityId,
            });
        } catch (err) {
            console.error('照片上傳錯誤:', err);
            return { success: false, urls: [], message: '上傳失敗' };
        }
    },
};

// 快速登記 API
export const quickEntryApi = {
    // 取得登記記錄
    async getQuickEntry(siteId: string, date: string): Promise<QuickEntryRecord[]> {
        return api.getFromGoogleScript<QuickEntryRecord[]>('getQuickEntry', { siteId, date });
    },

    // 儲存登記記錄
    async saveQuickEntry(data: { siteId: string; date: string; records: QuickEntryRecord[]; createdBy?: string }): Promise<void> {
        return api.postToGoogleScript('saveQuickEntry', data);
    },

    // 取得月度統計
    async getSummary(siteId: string, month: string): Promise<QuickEntrySummary> {
        return api.getFromGoogleScript<QuickEntrySummary>('getQuickEntrySummary', { siteId, month });
    },
};

// 財務記錄 API
export const financeApi = {
    // 取得財務記錄
    async getFinance(siteId: string = 'all', month?: string): Promise<FinanceRecord[]> {
        const params: Record<string, string> = { siteId };
        if (month) params.month = month;
        return api.getFromGoogleScript<FinanceRecord[]>('getFinance', params);
    },

    // 新增財務記錄
    async addFinance(data: FinanceRecord): Promise<void> {
        return api.postToGoogleScript('addFinance', data);
    },

    // 批次新增財務記錄
    async saveBatch(records: FinanceRecord[]): Promise<void> {
        return api.postToGoogleScript('saveFinanceBatch', { records });
    },
};

// 類型定義
export interface UserData {
    id?: string;
    name: string;
    role: 'superAdmin' | 'financeAdmin' | 'siteAdmin' | 'staff';
    siteId: string;
}

export interface SettingsData {
    mealPrice: number;
    transportNormal: number;
    transportForeign: number;
    driverSalaryPerTrip: number;
    driverMinDaily: number;
    assistantHourlyRate: number;
}

export interface QuickEntryRecord {
    elderName: string;
    presentAM: boolean;   // 上午出席
    presentPM: boolean;   // 下午出席
    pickUp: boolean;
    dropOff: boolean;
    meal: boolean;
    selfPay: boolean;
    virtual?: boolean;    // 虛報（有刷卡但沒來上課）
}

export interface QuickEntrySummary {
    elders: Record<string, { presentAM: number; presentPM: number; pickUp: number; dropOff: number; meal: number; selfPay: number }>;
    totals: { presentAM: number; presentPM: number; pickUp: number; dropOff: number; meal: number };
}

export interface FinanceRecord {
    id: string;
    siteId: string;
    date: string;
    type: 'subsidy' | 'utility' | 'pettyCash' | 'elderFee' | 'driverSalary' | 'lunchCost' | 'other';
    category: string;
    description: string;
    amount: number;
    isIncome: boolean;
    createdBy: string;
    createdAt: string;
}

// 照片上傳 API
export const photoApi = {
    // 壓縮圖片
    compress: (file: File, maxWidth: number = 1200, quality: number = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // 計算縮放比例
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('無法取得 canvas context'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    const base64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(base64);
                };
                img.onerror = () => reject(new Error('圖片載入失敗'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            reader.readAsDataURL(file);
        });
    },

    // 上傳單張照片到 Google Drive
    upload: async (base64: string, fileName: string, siteId: string, date: string): Promise<PhotoUploadResult> => {
        try {
            return api.postToGoogleScriptWithResult<PhotoUploadResult>('uploadPhoto', {
                base64,
                fileName,
                siteId,
                date,
            });
        } catch {
            return { success: false, error: '上傳失敗' };
        }
    },

    // 壓縮並上傳照片
    compressAndUpload: async (file: File, siteId: string, date: string): Promise<PhotoUploadResult> => {
        try {
            const base64 = await photoApi.compress(file);
            const fileName = `${date}_${Date.now()}.jpg`;
            return photoApi.upload(base64, fileName, siteId, date);
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : '未知錯誤' };
        }
    },

    // 批次上傳多張照片
    uploadMultiple: async (files: File[], siteId: string, date: string): Promise<PhotoUploadResult[]> => {
        const results: PhotoUploadResult[] = [];
        for (const file of files) {
            const result = await photoApi.compressAndUpload(file, siteId, date);
            results.push(result);
        }
        return results;
    },

    // 刪除照片
    delete: async (fileId: string): Promise<{ success: boolean }> => {
        return api.postToGoogleScript('deletePhoto', { fileId }).then(() => ({ success: true }));
    },
};

export interface PhotoUploadResult {
    success: boolean;
    url?: string;
    fileId?: string;
    fileName?: string;
    error?: string;
}

// 支出紀錄 API
export interface ExpenseData {
    date: string;
    siteId: string;
    lunch: {
        storeA: { name: string; count: number };
        storeB: { name: string; count: number };
        total: number;
    };
    driver: { trips: number; total: number };
    assistant: { hours: number; total: number };
    petty: { items: { item: string; amount: number }[]; total: number };
    grandTotal: number;
}

export const expenseApi = {
    // 儲存支出紀錄
    async save(data: ExpenseData): Promise<{ success: boolean; error?: string }> {
        try {
            return api.postToGoogleScriptWithResult<{ success: boolean; error?: string }>('saveExpense', data);
        } catch {
            return { success: false, error: '儲存失敗' };
        }
    },

    // 取得支出紀錄
    async get(siteId: string, date: string): Promise<{ success: boolean; data: ExpenseData | null; error?: string }> {
        try {
            return api.getFromGoogleScript<{ success: boolean; data: ExpenseData | null; error?: string }>('getExpense', { siteId, date });
        } catch {
            return { success: false, data: null, error: '取得失敗' };
        }
    },

    // 取得月份支出列表
    async getList(siteId: string, month: string): Promise<{ success: boolean; data: ExpenseData[]; error?: string }> {
        try {
            return api.getFromGoogleScript<{ success: boolean; data: ExpenseData[]; error?: string }>('getExpenseList', { siteId, month });
        } catch {
            return { success: false, data: [], error: '取得失敗' };
        }
    },
};

// ===================================================
// 收支管理 API
// ===================================================

export interface FinanceRecordItem {
    id: string;
    siteId: string;
    date: string;
    type: 'expense' | 'income';
    category: string;
    description: string;
    amount: number;
    createdBy: string;
    createdAt: string;
}

export interface BudgetItem {
    id: string;
    year: string;
    category: string;
    approvedAmount: number;
    description: string;
}

export interface ReimbursementItem {
    id: string;
    year: string;
    category: string;
    amount: number;
    description: string;
    date: string;
    createdBy: string;
    createdAt: string;
}

export interface FinanceAutoFillData {
    success: boolean;
    month: string;
    siteId: string;
    mealCount: number;
    mealIncome: number;
    transportPersonCount: number;
    transportTripCount: number;
    elderTransportIncome: number;
    transportSubsidy: number;
    driverSalaryExpense: number;
    rates: {
        mealPrice: number;
        transportNormal: number;
        driverSalaryPerTrip: number;
        BD03_RATE: number;
    };
}

export const financeRecordApi = {
    async getRecords(siteId: string, month?: string): Promise<FinanceRecordItem[]> {
        const params: Record<string, string> = { siteId };
        if (month) params.month = month;
        return api.getFromGoogleScript<FinanceRecordItem[]>('getFinanceRecords', params);
    },

    async addRecord(data: Partial<FinanceRecordItem>): Promise<{ success: boolean; message: string }> {
        return api.postToGoogleScriptWithResult<{ success: boolean; message: string }>('addFinanceRecord', data);
    },

    async deleteRecord(siteId: string, recordId: string): Promise<{ success: boolean; message: string }> {
        return api.getFromGoogleScript<{ success: boolean; message: string }>('deleteFinanceRecord', { siteId, recordId });
    },

    async copyLastMonth(siteId: string, targetMonth: string, createdBy: string): Promise<{ success: boolean; message: string; count: number }> {
        return api.postToGoogleScriptWithResult<{ success: boolean; message: string; count: number }>('copyLastMonthExpenses', { siteId, targetMonth, createdBy });
    },

    async getBudget(siteId: string, year?: string): Promise<{ budgets: BudgetItem[]; reimbursements: ReimbursementItem[] }> {
        const params: Record<string, string> = { siteId };
        if (year) params.year = year;
        return api.getFromGoogleScript<{ budgets: BudgetItem[]; reimbursements: ReimbursementItem[] }>('getAnnualBudget', params);
    },

    async saveBudget(data: { siteId: string; year: string; category: string; approvedAmount: number; description?: string; createdBy?: string }): Promise<{ success: boolean; message: string }> {
        return api.postToGoogleScriptWithResult<{ success: boolean; message: string }>('saveAnnualBudget', data);
    },

    async addReimbursement(data: { siteId: string; year: string; category: string; amount: number; description: string; date: string; createdBy?: string }): Promise<{ success: boolean; message: string }> {
        return api.postToGoogleScriptWithResult<{ success: boolean; message: string }>('addReimbursement', data);
    },

    async getAutoFill(siteId: string, month: string): Promise<FinanceAutoFillData> {
        return api.getFromGoogleScript<FinanceAutoFillData>('getFinanceAutoFill', { siteId, month });
    },
};

// 健康紀錄 API
export interface HealthRecord {
    elderName: string;
    date: string;
    bloodPressure?: string;
    heartRate?: number;
    weight?: number;
    note?: string;
}

export const healthApi = {
    // 取得長者健康紀錄
    async getByElder(elderName: string): Promise<HealthRecord[]> {
        return api.getFromGoogleScript<HealthRecord[]>('getHealthByElder', { elderName });
    },

    // 取得所有健康紀錄
    async getAll(): Promise<HealthRecord[]> {
        return api.getFromGoogleScript<HealthRecord[]>('getAllHealth', {});
    },

    // 儲存健康紀錄
    async save(records: HealthRecord[]): Promise<void> {
        return api.postToGoogleScript('saveHealthRecords', { records });
    },
};

// 每週課表 API
export interface ScheduleData {
    siteId: string;
    quarter: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schedule: any;
}

export const scheduleApi = {
    // 取得課表
    async get(quarter: string): Promise<ScheduleData | null> {
        return api.getFromGoogleScript<ScheduleData>('getSchedule', { quarter });
    },

    // 儲存課表
    async save(data: ScheduleData): Promise<void> {
        return api.postToGoogleScript('saveSchedule', data);
    },
};

// ===================================================
// 司機設定 API
// ===================================================

export interface DriverSetting {
    name: string;
    lineUserId: string;
    siteId: string;
    enabled: boolean;
    notes?: string;
}

export interface LineUserRecord {
    time: string;
    userId: string;
    message: string;
    processed: string;
}

export interface ElderFamily {
    name: string;
    familyLineId: string;
    level: string;
}

export const driverApi = {
    // 取得司機（依據點過濾）
    async getDrivers(siteId?: string): Promise<DriverSetting[]> {
        try {
            const params: Record<string, string> = {};
            if (siteId) params.siteId = siteId;
            const result = await api.getFromGoogleScript<unknown>('getDrivers', params);
            return Array.isArray(result) ? (result as DriverSetting[]) : [];
        } catch {
            return [];
        }
    },

    // 新增司機
    async addDriver(data: { name: string; lineUserId: string; siteId: string; enabled?: boolean; notes?: string }): Promise<{ success: boolean; message?: string }> {
        try {
            return await api.postToGoogleScriptWithResult<{ success: boolean; message?: string }>('addDriver', data);
        } catch {
            return { success: false, message: '新增失敗' };
        }
    },

    // 更新司機
    async updateDriver(data: { originalName: string; name: string; lineUserId: string; siteId: string; enabled?: boolean; notes?: string }): Promise<{ success: boolean; message?: string }> {
        try {
            return await api.postToGoogleScriptWithResult<{ success: boolean; message?: string }>('updateDriver', data);
        } catch {
            return { success: false, message: '更新失敗' };
        }
    },

    // 刪除司機
    async deleteDriver(name: string): Promise<{ success: boolean; message?: string }> {
        try {
            return await api.postToGoogleScriptWithResult<{ success: boolean; message?: string }>('deleteDriver', { name });
        } catch {
            return { success: false, message: '刪除失敗' };
        }
    },

    // 取得 LINE 用戶紀錄
    async getLineUsers(): Promise<LineUserRecord[]> {
        try {
            const result = await api.getFromGoogleScript<unknown>('getLineUsers', {});
            return Array.isArray(result) ? (result as LineUserRecord[]) : [];
        } catch {
            return [];
        }
    },

    // 取得長者家屬 LINE 列表
    async getEldersWithFamily(siteId: string): Promise<ElderFamily[]> {
        try {
            const result = await api.getFromGoogleScript<unknown>('getEldersWithFamily', { siteId });
            return Array.isArray(result) ? (result as ElderFamily[]) : [];
        } catch {
            return [];
        }
    },

    // 發送測試訊息
    async testSendLine(userId: string, botType: 'driver' | 'health', message?: string): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            return await api.postToGoogleScriptWithResult<{ success: boolean; message?: string; error?: string }>('testSendLineToUser', { userId, botType, message });
        } catch {
            return { success: false, message: '發送失敗' };
        }
    },
};

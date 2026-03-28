/**
 * 資料鎖定機制
 * 每月 20 號（含）之後，上月資料自動鎖定，不可修改
 * 管理員（superAdmin）可解鎖
 */

export interface LockStatus {
    isLocked: boolean;
    lockedMonth: string;  // e.g. "2025-06"
    lockDate: string;     // e.g. "2025-07-20"
    message: string;
}

/**
 * 檢查某月份的資料是否已鎖定
 * 規則：每月 20 號起，上月資料自動鎖定
 * 例：2025-07-20 起，2025-06 的資料鎖定
 */
export function checkDataLock(targetMonth: string): LockStatus {
    const now = new Date();
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-based

    // 解析目標月份
    const [tYear, tMonth] = targetMonth.split('-').map(Number);

    // 計算鎖定基準：如果今天 >= 20 號，上個月的資料鎖定
    // 如果今天 < 20 號，上上個月及更早的資料鎖定
    let lockBoundaryYear: number;
    let lockBoundaryMonth: number;

    if (currentDay >= 20) {
        // 20 號（含）之後：上月及更早的資料鎖定
        lockBoundaryYear = currentYear;
        lockBoundaryMonth = currentMonth; // 鎖定 < currentMonth 的月份
    } else {
        // 20 號之前：上上月及更早的資料鎖定
        if (currentMonth <= 1) {
            lockBoundaryYear = currentYear - 1;
            lockBoundaryMonth = 12;
        } else {
            lockBoundaryYear = currentYear;
            lockBoundaryMonth = currentMonth - 1;
        }
    }

    // 目標月份是否在鎖定範圍內
    const targetDate = tYear * 100 + tMonth;
    const lockBoundary = lockBoundaryYear * 100 + lockBoundaryMonth;

    if (targetDate < lockBoundary) {
        const lockDateStr = currentDay >= 20
            ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-20`
            : `${lockBoundaryYear}-${String(lockBoundaryMonth).padStart(2, '0')}-20`;

        return {
            isLocked: true,
            lockedMonth: targetMonth,
            lockDate: lockDateStr,
            message: `${targetMonth} 的資料已於 ${lockDateStr} 鎖定，無法修改`,
        };
    }

    return {
        isLocked: false,
        lockedMonth: targetMonth,
        lockDate: '',
        message: '',
    };
}

/**
 * 檢查某個日期的資料是否已鎖定
 */
export function checkDateLock(dateStr: string): LockStatus {
    const month = dateStr.substring(0, 7); // "2025-06-15" -> "2025-06"
    return checkDataLock(month);
}

/**
 * 從 cookie/localStorage 檢查是否為超級管理員（可覆寫鎖定）
 */
export function isAdminOverride(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const session = document.cookie
            .split(';')
            .find(c => c.trim().startsWith('cc_session='));
        if (session) {
            const payload = session.split('=')[1];
            const decoded = JSON.parse(atob(payload.split('.')[0]));
            return decoded.role === 'superAdmin';
        }
    } catch {
        // ignore
    }
    return false;
}

/**
 * 取得鎖定提示元件用的資訊
 */
export function getLockWarning(targetMonth: string): {
    show: boolean;
    type: 'locked' | 'warning' | 'none';
    message: string;
} {
    const lock = checkDataLock(targetMonth);

    if (lock.isLocked) {
        return {
            show: true,
            type: 'locked',
            message: `🔒 ${lock.message}`,
        };
    }

    // 如果接近鎖定日（本月 15-19 號），顯示即將鎖定警告
    const now = new Date();
    const currentDay = now.getDate();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const prevMonth = currentMonth === 1
        ? `${currentYear - 1}-12`
        : `${currentYear}-${String(currentMonth - 1).padStart(2, '0')}`;

    if (targetMonth === prevMonth && currentDay >= 15 && currentDay < 20) {
        return {
            show: true,
            type: 'warning',
            message: `⚠️ ${targetMonth} 的資料將在本月 20 號鎖定，請盡快完成修改`,
        };
    }

    return { show: false, type: 'none', message: '' };
}

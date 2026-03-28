/**
 * ===================================================
 * 活動管理系統 - Google Apps Script
 * ===================================================
 * 
 * 使用方式：
 * 1. 開啟 Google Sheets
 * 2. 擴充功能 → Apps Script
 * 3. 將此程式碼複製貼上（或更新現有程式碼）
 * 4. 點擊「部署」→「新增部署」→ 選擇「網頁應用程式」
 * 5. 設定「執行身份」為「您」，「存取權限」為「任何人」
 * 6. 複製部署網址，更新前端的 GOOGLE_SCRIPT_URL
 * 
 * 支援的工作表：
 * - 活動紀錄：儲存每日活動資料
 * - 活動主題：儲存主題與對應目的
 * - 活動目的：儲存可用的活動目的清單（新增）
 * - 每週課表：儲存課表排程
 */

// ========== 據點專屬 Google Sheets ID 配置 ==========
const SITE_SHEETS = {
  'sanxing': '1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc',      // 三星據點
  'luodong': '1nWWfPKOWSz4LH_ijZyx1kV689j4Pw3Ci1fmIGwOnf-8',      // 羅東據點
  'dongguashan': '1l-gMy3mhtB8en6qzj8NhkP7m2GG4QXJgRBNruWyEfLI', // 冬瓜山據點
  'jiaoxi': '1eStK13s5eVUAzGIeDsYns56wb-A58CF_sdr6_M8cQ2o',       // 礁溪據點
};

// 根據據點 ID 取得對應的 Spreadsheet
function getSpreadsheetBySiteId(siteId) {
  const sheetId = SITE_SHEETS[siteId];
  if (sheetId) {
    return SpreadsheetApp.openById(sheetId);
  }
  // 如果找不到對應的據點，使用當前綁定的試算表
  return SpreadsheetApp.getActiveSpreadsheet();
}

// 處理 POST 請求
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // ========== LINE Webhook 處理 ==========
    // LINE 會發送包含 events 陣列的請求
    if (data.events !== undefined) {
      return handleLineWebhook(data);
    }
    
    const action = data.action;
    
    let result;
    
    switch (action) {
      // ========== 活動紀錄 ==========
      case 'addActivity':
        result = addActivity(data);
        break;
      
      // ========== 活動主題管理 ==========
      case 'addTopic':
        result = addTopic(data.name, data.purposes);
        break;
      case 'deleteTopic':
        result = deleteTopic(data.name);
        break;
      case 'updateTopic':
        result = updateTopic(data.name, data.purposes);
        break;
      
      // ========== 活動目的管理 ==========
      case 'addPurpose':
        result = addPurpose(data.name);
        break;
      case 'deletePurpose':
        result = deletePurpose(data.name);
        break;
      
      // ========== 每週課表管理 ==========
      case 'saveSchedule':
        result = saveSchedule(data);
        break;
      
      // ========== 長者管理 ==========
      case 'addElder':
        result = addElder(data);
        break;
      case 'updateElder':
        result = updateElder(data);
        break;
      
      // ========== 用戶帳號管理 ==========
      case 'login':
        result = loginUser(data.name, data.password);
        break;
      case 'addUser':
        result = addUser(data);
        break;
      case 'deleteUser':
        result = deleteUser(data.name);
        break;
      case 'resetPassword':
        result = resetPassword(data.name, data.password);
        break;
      
      // ========== 費用設定 ==========
      case 'saveSettings':
        result = saveSettings(data);
        break;
      
      // ========== 快速登記 ==========
      case 'saveQuickEntry':
        result = saveQuickEntry(data);
        break;
      
      // ========== 照片上傳 ==========
      case 'uploadPhotos':
        result = uploadPhotosToDrive(data.photos, data.activityId);
        break;
      
      default:
        result = addActivity(data);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 處理 LINE Webhook 請求
 */
function handleLineWebhook(data) {
  try {
    if (data.events && data.events.length > 0) {
      data.events.forEach(event => {
        if (event.type === 'message' && event.source && event.source.userId) {
          const userId = event.source.userId;
          const messageText = event.message ? event.message.text || '' : '';
          
          // 檢查是否為已註冊的司機
          const driver = findDriverByUserId(userId);
          
          if (driver) {
            // 已註冊的司機
            if (messageText.includes('名單') || messageText.includes('詳細')) {
              // 發送詳細名單
              const detailedReport = generateDetailedDriverReport(driver.name, driver.siteId);
              sendLineMessage(userId, detailedReport);
            } else {
              // 一般訊息回覆
              sendLineMessage(userId, `${driver.name} 司機您好！\n\n如需查看本週詳細載送名單，請回覆「名單」`);
            }
          } else {
            // 新用戶，記錄 User ID
            const ss = SpreadsheetApp.getActiveSpreadsheet();
            let sheet = ss.getSheetByName('LINE用戶');
            
            if (!sheet) {
              sheet = ss.insertSheet('LINE用戶');
              sheet.appendRow(['時間', 'User ID', '訊息內容', '已處理']);
            }
            
            sheet.appendRow([new Date(), userId, messageText, '否']);
            
            sendLineMessage(userId, `您好！您的 User ID 已記錄：\n${userId}\n\n請告知管理員將此 ID 加入司機設定。`);
          }
        }
      });
    }
    
    // LINE Webhook 必須返回 200 OK
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    console.log('LINE Webhook 處理錯誤:', error.message);
    // 即使出錯也要返回 200，否則 LINE 會重試
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * 根據 User ID 查找司機
 */
function findDriverByUserId(userId) {
  const drivers = getDriverSettings();
  return drivers.find(d => d.lineUserId === userId);
}

/**
 * 產生詳細的司機載送名單
 */
function generateDetailedDriverReport(driverName, siteId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('快速登記');
  const settingsSheet = ss.getSheetByName('費用設定');
  
  // 取得費率
  let driverRate = 80;
  if (settingsSheet) {
    const settings = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < settings.length; i++) {
      if (settings[i][0] === siteId || settings[i][0] === 'all') {
        driverRate = settings[i][4] || 80;
        break;
      }
    }
  }
  
  // 計算上週日期範圍
  const today = new Date();
  const dayOfWeek = today.getDay();
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - dayOfWeek - 7);
  const lastSaturday = new Date(lastSunday);
  lastSaturday.setDate(lastSunday.getDate() + 6);
  
  const weekStart = formatDateYMD(lastSunday);
  const weekEnd = formatDateYMD(lastSaturday);
  
  if (!sheet) {
    return `📋 詳細載送名單\n\n⚠️ 尚無載客紀錄`;
  }
  
  const data = sheet.getDataRange().getValues();
  const dailyStats = {};
  
  // 過濾該週資料
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowSiteId = row[0];
    const rowDate = row[1];
    const elderName = row[2];
    
    if (siteId && siteId !== 'all' && rowSiteId !== siteId) continue;
    if (rowDate < weekStart || rowDate > weekEnd) continue;
    
    if (!dailyStats[rowDate]) {
      dailyStats[rowDate] = { date: rowDate, elders: [] };
    }
    
    const pickUp = row[4] === '是';
    const dropOff = row[5] === '是';
    
    if (pickUp || dropOff) {
      dailyStats[rowDate].elders.push(elderName);
    }
  }
  
  // 產生訊息
  const days = Object.values(dailyStats).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];
  
  let message = `📋 詳細載送名單\n\n`;
  message += `🚗 ${driverName} 司機\n`;
  message += `📅 ${formatShortDate(weekStart)} ~ ${formatShortDate(weekEnd)}\n\n`;
  
  if (days.length === 0) {
    message += `本週無載客紀錄`;
  } else {
    days.forEach(day => {
      const dateStr = String(day.date);
      const date = new Date(day.date);
      const weekDay = weekDayNames[date.getDay()];
      const shortDate = dateStr.length >= 10 ? dateStr.substring(5, 10) : dateStr;
      message += `【${shortDate} (${weekDay})】\n`;
      message += `${day.elders.join('、')}\n`;
      message += `共 ${day.elders.length} 人\n\n`;
    });
  }
  
  return message;
}



// 處理 GET 請求
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    switch (action) {
      // ========== 活動紀錄 ==========
      case 'getActivities':
        const activitiesSiteId = e.parameter.siteId || '';
        return ContentService.createTextOutput(JSON.stringify(getActivities(activitiesSiteId)))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'getActivityById':
        const activitySiteId = e.parameter.siteId || '';
        const activityId = e.parameter.id || '';
        return ContentService.createTextOutput(JSON.stringify(getActivityById(activitySiteId, activityId)))
          .setMimeType(ContentService.MimeType.JSON);
      
      // ========== 活動主題與目的 ==========
      case 'getTopics':
        return ContentService.createTextOutput(JSON.stringify(getTopics()))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'getPurposes':
        return ContentService.createTextOutput(JSON.stringify(getPurposes()))
          .setMimeType(ContentService.MimeType.JSON);
      
      // ========== 課表管理 ==========
      case 'getSchedule':
        const quarter = e.parameter.quarter || '';
        return ContentService.createTextOutput(JSON.stringify(getSchedule(quarter)))
          .setMimeType(ContentService.MimeType.JSON);
      
      // ========== 長者管理 ==========
      case 'getElders':
        const eldersSiteId = e.parameter.siteId || '';
        return ContentService.createTextOutput(JSON.stringify(getElders(eldersSiteId)))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'deleteElder':
        const deleteElderSiteId = e.parameter.siteId || '';
        const elderName = e.parameter.name;
        return ContentService.createTextOutput(JSON.stringify(deleteElder(deleteElderSiteId, elderName)))
          .setMimeType(ContentService.MimeType.JSON);
      
      // ========== 用戶帳號 ==========
      case 'getUsers':
        const usersSiteId = e.parameter.siteId || '';
        return ContentService.createTextOutput(JSON.stringify(getUsers(usersSiteId)))
          .setMimeType(ContentService.MimeType.JSON);
      
      // ========== 費用設定 ==========
      case 'getSettings':
        const settingsSiteId = e.parameter.siteId || 'all';
        return ContentService.createTextOutput(JSON.stringify(getSettings(settingsSiteId)))
          .setMimeType(ContentService.MimeType.JSON);
      
      // ========== 快速登記 ==========
      case 'getQuickEntry':
        const quickSiteId = e.parameter.siteId || '';
        const quickDate = e.parameter.date || '';
        return ContentService.createTextOutput(JSON.stringify(getQuickEntry(quickSiteId, quickDate)))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'getQuickEntrySummary':
        const summarySiteId = e.parameter.siteId || '';
        const summaryMonth = e.parameter.month || '';
        return ContentService.createTextOutput(JSON.stringify(getQuickEntrySummary(summarySiteId, summaryMonth)))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'getDriverReport':
        const driverSiteId = e.parameter.siteId || '';
        const driverMonth = e.parameter.month || '';
        return ContentService.createTextOutput(JSON.stringify(getDriverReport(driverSiteId, driverMonth)))
          .setMimeType(ContentService.MimeType.JSON);

      case 'getElderMonthlyUsage':
        const usageSiteId = e.parameter.siteId || '';
        const usageMonth = e.parameter.month || '';
        return ContentService.createTextOutput(JSON.stringify(getElderMonthlyUsage(usageSiteId, usageMonth)))
          .setMimeType(ContentService.MimeType.JSON);
      
      // ========== 據點密碼驗證 ==========
      case 'verifySitePassword':
        const verifySiteId = e.parameter.siteId || '';
        const verifyPassword = e.parameter.password || '';
        return ContentService.createTextOutput(JSON.stringify(verifySitePassword(verifySiteId, verifyPassword)))
          .setMimeType(ContentService.MimeType.JSON);
      
      default:
        return ContentService.createTextOutput(JSON.stringify({
          status: 'OK',
          message: '活動管理系統 API 運作中',
          version: '4.5',
          timestamp: new Date().toISOString(),
          availableActions: ['getActivities', 'getTopics', 'getPurposes', 'getSchedule', 'getElders', 'deleteElder', 'getUsers', 'getSettings', 'getQuickEntry', 'getQuickEntrySummary']
        })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ===================================================
// 活動紀錄相關函數
// ===================================================

function addActivity(data) {
  const siteId = data.siteId || '';
  const ss = getSpreadsheetBySiteId(siteId);
  let sheet = ss.getSheetByName('活動紀錄');
  
  // 如果工作表不存在，建立它
  if (!sheet) {
    sheet = ss.insertSheet('活動紀錄');
    sheet.appendRow(['日期', '時間', '活動名稱', '活動目的', '活動主題', '參與者', '特殊狀況', '討論事項', '照片', '建立時間']);
  }
  
  // 直接儲存 base64 照片（用 ||| 分隔）
  let photoData = data.photos || '';
  if (data.base64Photos && Array.isArray(data.base64Photos) && data.base64Photos.length > 0) {
    photoData = data.base64Photos.join('|||');
  }
  
  sheet.appendRow([
    data.date || '',
    data.time || '',
    data.activityName || '',
    data.purpose || '',
    data.topic || '',
    data.participants || '',
    data.special || '',
    data.discussion || '',
    photoData,
    new Date().toISOString()
  ]);
  
  return { success: true, message: '活動紀錄已新增' };
}

function getActivities(siteId) {
  const ss = getSpreadsheetBySiteId(siteId);
  const sheet = ss.getSheetByName('活動紀錄');

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const activities = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;

    // 解析照片欄位
    // 新格式：base64 照片（用 ||| 分隔）
    // 舊格式：URL（用 , 分隔）或時間戳記
    let photos = [];
    let createdAt = '';
    
    const col8 = row[8] || '';
    const col9 = row[9] || '';
    const col8Str = String(col8);
    
    // 判斷 col8 內容類型
    if (col8Str.includes('|||')) {
      // 新格式：base64 照片（用 ||| 分隔）
      // 效能優化：如果單筆資料太大，則忽略 base64 (P1 改進)
      if (col8Str.length > 500000) {
        photos = ["_LARGE_DATA_SKIPPED_"];
      } else {
        photos = col8Str.split('|||').filter(p => p.trim());
      }
      createdAt = col9;
    } else if (col8Str.startsWith('data:image')) {
      // 單張 base64 照片
      photos = [col8Str];
      createdAt = col9;
    } else if (col8Str.includes('drive.google.com') || col8Str.includes('http')) {
      // URL 格式
      photos = col8Str.split(',').filter(p => p.trim() && p.includes('http'));
      createdAt = col9;
    } else if (col8Str.match(/^\d{4}-\d{2}-\d{2}T/) || col8Str === '') {
      // 舊格式：col8 是建立時間
      createdAt = col8;
    } else if (col9) {
      createdAt = col9;
    }

    activities.push({
      id: `gs_${i}`,
      date: formatDate(row[0]),
      time: row[1] || '',
      activityName: row[2] || '',
      purpose: row[3] || '',
      topic: row[4] || '',
      participants: row[5] || '',
      special: row[6] || '',
      discussion: row[7] || '',
      photos: photos,
      createdAt: createdAt
    });
  }

  activities.sort((a, b) => new Date(b.date) - new Date(a.date));
  return activities;
}

/**
 * 取得單一活動資料（依據 ID）- 效能優化版本
 */
function getActivityById(siteId, id) {
  if (!id) return null;
  
  // 從 ID 取得行號，例如 gs_48 => 行號 48
  const match = id.match(/gs_(\d+)/);
  if (!match) return null;
  
  const rowIndex = parseInt(match[1], 10);
  
  const ss = getSpreadsheetBySiteId(siteId);
  const sheet = ss.getSheetByName('活動紀錄');
  if (!sheet) return null;
  
  const lastRow = sheet.getLastRow();
  if (rowIndex < 1 || rowIndex > lastRow) return null;
  
  // 只取得該一行資料
  const row = sheet.getRange(rowIndex + 1, 1, 1, 10).getValues()[0];
  if (!row[0]) return null;
  
  // 解析照片欄位
  let photos = [];
  let createdAt = '';
  
  const col8 = row[8] || '';
  const col9 = row[9] || '';
  const col8Str = String(col8);
  
  if (col8Str.includes('|||')) {
    // 效能優化：如果單筆資料太大，則忽略 base64 (P1 改進)
    if (col8Str.length > 500000) {
      photos = ["_LARGE_DATA_SKIPPED_"];
    } else {
      photos = col8Str.split('|||').filter(p => p.trim());
    }
    createdAt = col9;
  } else if (col8Str.startsWith('data:image')) {
    photos = [col8Str];
    createdAt = col9;
  } else if (col8Str.includes('drive.google.com') || col8Str.includes('http')) {
    photos = col8Str.split(',').filter(p => p.trim() && p.includes('http'));
    createdAt = col9;
  } else if (col8Str.match(/^\d{4}-\d{2}-\d{2}T/) || col8Str === '') {
    createdAt = col8;
  } else if (col9) {
    createdAt = col9;
  }

  return {
    id: id,
    date: formatDate(row[0]),
    time: row[1] || '',
    activityName: row[2] || '',
    purpose: row[3] || '',
    topic: row[4] || '',
    participants: row[5] || '',
    special: row[6] || '',
    discussion: row[7] || '',
    photos: photos,
    createdAt: createdAt
  };
}

function formatDate(dateValue) {
  if (!dateValue) return '';
  if (typeof dateValue === 'string') return dateValue;
  if (dateValue instanceof Date) {
    const y = dateValue.getFullYear();
    const m = String(dateValue.getMonth() + 1).padStart(2, '0');
    const d = String(dateValue.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(dateValue);
}

// ===================================================
// 活動主題相關函數
// ===================================================

function addTopic(name, purposes) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('活動主題');
  
  // 如果工作表不存在，建立它
  if (!sheet) {
    sheet = ss.insertSheet('活動主題');
    sheet.appendRow(['主題名稱', '對應活動目的']);
  }
  
  // 檢查是否已存在
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      return { success: false, message: '主題已存在' };
    }
  }
  
  sheet.appendRow([name, purposes]);
  return { success: true, message: '主題已新增' };
}

function deleteTopic(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('活動主題');
  
  if (!sheet) {
    return { success: false, message: '找不到活動主題工作表' };
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.deleteRow(i + 1);
      return { success: true, message: '主題已刪除' };
    }
  }
  
  return { success: false, message: '找不到該主題' };
}

function updateTopic(name, purposes) {
  // 先刪除再新增
  deleteTopic(name);
  return addTopic(name, purposes);
}

// ===================================================
// 活動目的相關函數（新增功能）
// ===================================================

/**
 * 新增活動目的
 * @param {string} name - 目的名稱
 */
function addPurpose(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('活動目的');
  
  // 如果工作表不存在，建立它
  if (!sheet) {
    sheet = ss.insertSheet('活動目的');
    sheet.appendRow(['目的名稱', '說明', '建立時間']);
    // 設定欄寬
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 300);
  }
  
  // 檢查是否已存在
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      return { success: false, message: '此活動目的已存在' };
    }
  }
  
  // 新增目的
  sheet.appendRow([name, '', new Date().toISOString()]);
  
  return { success: true, message: '活動目的已新增' };
}

/**
 * 刪除活動目的
 * @param {string} name - 目的名稱
 */
function deletePurpose(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('活動目的');
  
  if (!sheet) {
    return { success: false, message: '找不到活動目的工作表' };
  }
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.deleteRow(i + 1);
      return { success: true, message: '活動目的已刪除' };
    }
  }
  
  return { success: false, message: '找不到該活動目的' };
}

// ===================================================
// 每週課表相關函數
// ===================================================

function saveSchedule(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('每週課表');
  
  // 如果工作表不存在，建立它
  if (!sheet) {
    sheet = ss.insertSheet('每週課表');
    sheet.appendRow(['季度', '週幾', '時段', '主題', '活動名稱', '材料']);
  }
  
  const quarter = data.quarter;
  const schedule = data.schedule;
  
  // 刪除該季度的舊資料
  const existingData = sheet.getDataRange().getValues();
  for (let i = existingData.length - 1; i > 0; i--) {
    if (existingData[i][0] === quarter) {
      sheet.deleteRow(i + 1);
    }
  }
  
  // 新增新資料
  const dayNames = {
    monday: '週一',
    tuesday: '週二',
    wednesday: '週三',
    thursday: '週四',
    friday: '週五'
  };
  
  const periodNames = {
    am: '上午',
    pm: '下午'
  };
  
  Object.keys(schedule).forEach(day => {
    Object.keys(schedule[day]).forEach(period => {
      const item = schedule[day][period];
      if (item.topic || item.activityName) {
        sheet.appendRow([
          quarter,
          dayNames[day] || day,
          periodNames[period] || period,
          item.topic || '',
          item.activityName || '',
          item.materials || ''
        ]);
      }
    });
  });
  
  return { success: true, message: '課表已儲存' };
}

// ===================================================
// 長者名單管理 API
// ===================================================

function getElders(siteId) {
  const ss = getSpreadsheetBySiteId(siteId);
  const sheet = ss.getSheetByName('長者名單');
  
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const elders = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    elders.push({
      id: `elder_${i}`,
      name: row[0],
      level: row[1] || 'A',
      levelDesc: row[2] || '',
      scoreRange: row[3] || '',
      identityType: row[4] || 'normal',
      identityDesc: row[5] || '',
      fare: row[6] || 18,
      subsidyType: row[7] || 'subsidy',
      notes: row[8] || '',
      familyLineId: row[9] || '',
      customFare: row[10] || 0,
      monthlyQuota: row[11] || 0
    });
  }
  return elders;
}

function addElder(data) {
  const siteId = data.siteId || '';
  const ss = getSpreadsheetBySiteId(siteId);
  let sheet = ss.getSheetByName('長者名單');
  
  if (!sheet) {
    sheet = ss.insertSheet('長者名單');
    sheet.appendRow(['姓名', '分級', '分級說明', '建議評分', '身份類別', '身份說明', '車資', '補助類型', '備註', '家屬LINE', '自訂車資', '月額度上限', '建立時間']);
  }
  
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.name) {
      return { success: false, message: '長者已存在' };
    }
  }
  
  sheet.appendRow([
    data.name,
    data.level || 'A',
    data.levelDesc || '',
    data.scoreRange || '',
    data.identityType || 'normal',
    data.identityDesc || '一般戶',
    data.fare !== undefined ? data.fare : 18,
    data.subsidyType || 'subsidy',
    data.notes || '',
    data.familyLineId || '',
    data.customFare || 0,
    data.monthlyQuota || 0,
    new Date().toISOString()
  ]);
  
  return { success: true, message: '長者已新增' };
}

function updateElder(data) {
  const siteId = data.siteId || '';
  const ss = getSpreadsheetBySiteId(siteId);
  const sheet = ss.getSheetByName('長者名單');
  
  if (!sheet) return { success: false, message: '找不到長者名單' };
  
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === data.originalName || allData[i][0] === data.name) {
      const row = i + 1;
      sheet.getRange(row, 1).setValue(data.name);
      sheet.getRange(row, 2).setValue(data.level || 'A');
      sheet.getRange(row, 3).setValue(data.levelDesc || '');
      sheet.getRange(row, 4).setValue(data.scoreRange || '');
      sheet.getRange(row, 5).setValue(data.identityType || 'normal');
      sheet.getRange(row, 6).setValue(data.identityDesc || '一般戶');
      sheet.getRange(row, 7).setValue(data.fare !== undefined ? data.fare : 18);
      sheet.getRange(row, 8).setValue(data.subsidyType || 'subsidy');
      sheet.getRange(row, 9).setValue(data.notes || '');
      sheet.getRange(row, 10).setValue(data.familyLineId || '');
      sheet.getRange(row, 11).setValue(data.customFare || 0);
      sheet.getRange(row, 12).setValue(data.monthlyQuota || 0);
      return { success: true, message: '長者已更新' };
    }
  }
  return { success: false, message: '找不到該長者' };
}

function deleteElder(siteId, name) {
  const ss = getSpreadsheetBySiteId(siteId);
  const sheet = ss.getSheetByName('長者名單');
  
  if (!sheet) return { success: false, message: '找不到長者名單' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === name) {
      sheet.deleteRow(i + 1);
      return { success: true, message: '長者已刪除' };
    }
  }
  return { success: false, message: '找不到該長者' };
}

// ===================================================
// 用戶帳號管理 API
// ===================================================

function getUsers(siteId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('用戶帳號');
  
  if (!sheet) {
    sheet = ss.insertSheet('用戶帳號');
    sheet.appendRow(['帳號', '密碼', '角色', '據點', '建立時間', '上次登入']);
    sheet.appendRow(['admin', 'admin2026', 'superAdmin', 'all', new Date().toISOString(), '']);
    sheet.appendRow(['test', 'test123', 'staff', 'sanxing', new Date().toISOString(), '']);
    return [{ name: 'admin', role: 'superAdmin', siteId: 'all' }];
  }
  
  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    
    const userSiteId = data[i][3] || 'all';
    // 如果有指定 siteId 且不是 superAdmin (all)，則進行過濾
    if (siteId && siteId !== 'all' && userSiteId !== siteId && userSiteId !== 'all') {
      continue;
    }
    
    users.push({
      name: data[i][0],
      role: data[i][2] || 'staff',
      siteId: userSiteId
    });
  }
  return users;
}

function loginUser(name, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('用戶帳號');
  
  if (!sheet) return { success: false, message: '系統未初始化' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(name).trim() && String(data[i][1]) === String(password)) {
      sheet.getRange(i + 1, 6).setValue(new Date().toISOString());
      return {
        success: true,
        user: {
          id: `user_${i}`,
          name: data[i][0],
          role: data[i][2] || 'staff',
          siteId: data[i][3] || 'all'
        }
      };
    }
  }
  return { success: false, message: '帳號或密碼錯誤' };
}

// ===================================================
// 費用設定 API
// ===================================================

// ===================================================
// 新增用戶 API
// ===================================================
function addUser(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('用戶帳號');
  
  if (!sheet) {
    sheet = ss.insertSheet('用戶帳號');
    sheet.appendRow(['帳號', '密碼', '角色', '據點', '建立時間', '上次登入']);
  }
  
  // 檢查是否已存在
  const data2 = sheet.getDataRange().getValues();
  for (let i = 1; i < data2.length; i++) {
    if (String(data2[i][0]).trim() === String(data.name).trim()) {
      return { success: false, message: '帳號已存在' };
    }
  }
  
  sheet.appendRow([
    data.name,
    data.password,
    data.role || 'staff',
    data.siteId || 'all',
    new Date().toISOString(),
    ''
  ]);
  
  return { success: true, message: '帳號新增成功' };
}

// ===================================================
// 刪除用戶 API
// ===================================================
function deleteUser(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('用戶帳號');
  if (!sheet) return { success: false, message: '工作表不存在' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(name).trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, message: '帳號已刪除' };
    }
  }
  return { success: false, message: '找不到該帳號' };
}

// ===================================================
// 重設密碼 API
// ===================================================
function resetPassword(name, newPassword) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('用戶帳號');
  if (!sheet) return { success: false, message: '工作表不存在' };
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(name).trim()) {
      sheet.getRange(i + 1, 2).setValue(newPassword);
      return { success: true, message: '密碼已重設' };
    }
  }
  return { success: false, message: '找不到該帳號' };
}

// ===================================================
// 變更密碼 API
// ===================================================
function changePassword(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('用戶帳號');
  if (!sheet) return { success: false, message: '工作表不存在' };
  
  const sheetData = sheet.getDataRange().getValues();
  for (let i = 1; i < sheetData.length; i++) {
    if (String(sheetData[i][0]).trim() === String(data.name).trim()) {
      if (String(sheetData[i][1]) !== String(data.oldPassword)) {
        return { success: false, message: '舊密碼錯誤' };
      }
      sheet.getRange(i + 1, 2).setValue(data.newPassword);
      return { success: true, message: '密碼已變更' };
    }
  }
  return { success: false, message: '找不到該帳號' };
}

// ===================================================
// 據點密碼驗證 API
// ===================================================

/**
 * 驗證據點密碼
 * 密碼存儲在 '據點設定' 工作表中
 * 格式：據點ID | 據點名稱 | 據點密碼 | 建立時間
 */
function verifySitePassword(siteId, password) {
  // 使用主要的試算表（三星據點）來存儲所有據點的密碼設定
  const masterSheetId = '1ysrwCTKlE2YQeSQfa6jBZTPCjzqH2cxeq1YveaZpsDc';
  const ss = SpreadsheetApp.openById(masterSheetId);
  let sheet = ss.getSheetByName('據點設定');
  
  // 如果工作表不存在，建立它並設定預設密碼
  if (!sheet) {
    sheet = ss.insertSheet('據點設定');
    sheet.appendRow(['據點ID', '據點名稱', '據點密碼', '建立時間']);
    sheet.appendRow(['sanxing', '三星據點', 'sanxing2026', new Date().toISOString()]);
    sheet.appendRow(['luodong', '羅東據點', 'luodong2026', new Date().toISOString()]);
    sheet.appendRow(['dongguashan', '冬瓜山據點', 'dongguashan2026', new Date().toISOString()]);
    sheet.appendRow(['jiaoxi', '礁溪據點', 'jiaoxi2026', new Date().toISOString()]);
    sheet.appendRow(['young', '年輕型據點', 'young2026', new Date().toISOString()]);
  }
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[0]).trim() === String(siteId).trim()) {
      if (String(row[2]).trim() === String(password).trim()) {
        return { 
          success: true, 
          message: '驗證成功',
          siteName: row[1]
        };
      } else {
        return { 
          success: false, 
          message: '密碼錯誤' 
        };
      }
    }
  }
  
  return { 
    success: false, 
    message: '找不到該據點' 
  };
}

// ===================================================
// 費用設定 API
// ===================================================

function getSettings(siteId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('費用設定');
  
  const defaultSettings = {
    mealPrice: 40,
    transportNormal: 18,
    transportForeign: 115,
    driverSalaryPerTrip: 115,
    driverMinDaily: 0,
    assistantHourlyRate: 176
  };
  
  if (!sheet) return defaultSettings;
  
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === siteId || data[i][0] === 'all') {
      return {
        mealPrice: data[i][1] || 40,
        transportNormal: data[i][2] || 18,
        transportForeign: data[i][3] || 115,
        driverSalaryPerTrip: data[i][4] || 115,
        assistantHourlyRate: data[i][5] || 176,
        driverMinDaily: data[i][6] || 0
      };
    }
  }
  return defaultSettings;
}

function saveSettings(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('費用設定');
  
  if (!sheet) {
    sheet = ss.insertSheet('費用設定');
    sheet.appendRow(['據點', '餐費', '車資(一般)', '車資(外籍)', '駕駛薪資/人次', '助理時薪', '駕駛保底日薪']);
  }
  
  const siteId = data.siteId || 'all';
  const allData = sheet.getDataRange().getValues();
  
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][0] === siteId) {
      const row = i + 1;
      sheet.getRange(row, 2).setValue(data.mealPrice || 40);
      sheet.getRange(row, 3).setValue(data.transportNormal || 18);
      sheet.getRange(row, 4).setValue(data.transportForeign || 115);
      sheet.getRange(row, 5).setValue(data.driverSalaryPerTrip || 115);
      sheet.getRange(row, 6).setValue(data.assistantHourlyRate || 176);
      sheet.getRange(row, 7).setValue(data.driverMinDaily || 0);
      return { success: true };
    }
  }
  
  sheet.appendRow([siteId, data.mealPrice || 40, data.transportNormal || 18, data.transportForeign || 115, data.driverSalaryPerTrip || 115, data.assistantHourlyRate || 176, data.driverMinDaily || 0]);
  return { success: true };
}

// ===================================================
// 初始化函數（可選：手動執行建立預設資料）
// ===================================================

function initDefaultPurposes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('活動目的');
  
  // 如果工作表不存在，建立它
  if (!sheet) {
    sheet = ss.insertSheet('活動目的');
    sheet.appendRow(['目的名稱', '說明', '建立時間']);
  }
  
  // 預設目的清單
  const defaultPurposes = [
    '提升專注力',
    '增進記憶力',
    '促進社交互動',
    '維持認知功能',
    '情緒穩定',
    '增進手眼協調',
    '提升自我表達',
    '增加生活參與'
  ];
  
  const now = new Date().toISOString();
  
  defaultPurposes.forEach(purpose => {
    sheet.appendRow([purpose, '', now]);
  });
  
  return { success: true, message: '預設活動目的已初始化' };
}

// ===================================================
// 照片上傳到 Google Drive
// ===================================================

// 設定：請將此 ID 替換為您的 Google Drive 資料夾 ID
const PHOTO_FOLDER_ID = 'YOUR_FOLDER_ID_HERE';

/**
 * 上傳多張照片到 Google Drive
 * @param {Array<string>} photos - base64 編碼的照片陣列
 * @param {string} activityId - 活動 ID（用於檔案命名）
 * @returns {Object} - 包含上傳成功的照片 URL 列表
 */
function uploadPhotosToDrive(photos, activityId) {
  if (!photos || photos.length === 0) {
    return { success: true, urls: [], message: '沒有照片需要上傳' };
  }
  
  try {
    // 取得或建立資料夾
    let folder;
    if (PHOTO_FOLDER_ID === 'YOUR_FOLDER_ID_HERE') {
      // 如果沒有設定資料夾 ID，在根目錄建立資料夾
      const folders = DriveApp.getFoldersByName('活動照片');
      if (folders.hasNext()) {
        folder = folders.next();
      } else {
        folder = DriveApp.createFolder('活動照片');
      }
    } else {
      folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
    }
    
    const urls = [];
    const timestamp = new Date().getTime();
    
    photos.forEach((photo, index) => {
      try {
        // 移除 base64 前綴 (如 "data:image/jpeg;base64,")
        let base64Data = photo;
        let mimeType = 'image/jpeg';
        
        if (photo.startsWith('data:')) {
          const matches = photo.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            base64Data = matches[2];
          }
        }
        
        // 將 base64 轉換為 Blob
        const decodedBytes = Utilities.base64Decode(base64Data);
        const blob = Utilities.newBlob(decodedBytes, mimeType, `activity_${activityId || timestamp}_${index + 1}.jpg`);
        
        // 上傳到 Google Drive
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        // 取得可分享的 URL
        const fileId = file.getId();
        const viewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        
        urls.push(viewUrl);
      } catch (photoErr) {
        console.log('單張照片上傳失敗:', photoErr.message);
      }
    });
    
    return { 
      success: true, 
      urls: urls, 
      message: `成功上傳 ${urls.length} 張照片` 
    };
    
  } catch (error) {
    return { 
      success: false, 
      urls: [], 
      error: error.message 
    };
  }
}

/**
 * 取得指定資料夾中的所有照片
 * @param {string} activityId - 活動 ID
 * @returns {Array<string>} - 照片 URL 列表
 */
function getActivityPhotos(activityId) {
  try {
    let folder;
    if (PHOTO_FOLDER_ID === 'YOUR_FOLDER_ID_HERE') {
      const folders = DriveApp.getFoldersByName('活動照片');
      if (!folders.hasNext()) return [];
      folder = folders.next();
    } else {
      folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
    }
    
    const files = folder.searchFiles(`title contains 'activity_${activityId}'`);
    const urls = [];
    
    while (files.hasNext()) {
      const file = files.next();
      const fileId = file.getId();
      urls.push(`https://drive.google.com/uc?export=view&id=${fileId}`);
    }
    
    return urls;
  } catch (error) {
    console.log('取得照片失敗:', error.message);
    return [];
  }
}

// ===================================================
// 快速登記相關函數
// ===================================================

/**
 * 儲存每日快速登記資料
 */
function saveQuickEntry(data) {
  const siteId = data.siteId;
  const ss = getSpreadsheetBySiteId(siteId);
  let sheet = ss.getSheetByName('快速登記');
  
  if (!sheet) {
    sheet = ss.insertSheet('快速登記');
    sheet.appendRow(['據點', '日期', '姓名', '上午出席', '下午出席', '早上搭車', '下午搭車', '用餐', '自費', '虛報', '建立時間']);
  }
  
  const date = data.date;
  const records = data.records || [];
  const now = new Date().toISOString();
  
  // 刪除該日期的舊資料
  const existingData = sheet.getDataRange().getValues();
  for (let i = existingData.length - 1; i > 0; i--) {
    if (existingData[i][0] === siteId && existingData[i][1] === date) {
      sheet.deleteRow(i + 1);
    }
  }
  
  // 新增新資料
  records.forEach(r => {
    sheet.appendRow([
      siteId,
      date,
      r.elderName || '',
      r.presentAM ? '是' : '否',   // 上午出席
      r.presentPM ? '是' : '否',   // 下午出席
      r.pickUp ? '是' : '否',
      r.dropOff ? '是' : '否',
      r.meal ? '是' : '否',
      r.selfPay ? '是' : '否',
      r.virtual ? '是' : '否',     // 虛報
      now
    ]);
  });
  
  return { success: true, message: `已儲存 ${records.length} 筆紀錄` };
}

/**
 * 取得指定日期的快速登記資料
 */
function getQuickEntry(siteId, date) {
  const ss = getSpreadsheetBySiteId(siteId);
  const sheet = ss.getSheetByName('快速登記');
  
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const records = [];
  
  // 將傳入的日期轉換為標準格式進行比對
  const targetDate = String(date).trim();
  const targetSiteId = String(siteId).trim();
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowSiteId = String(row[0]).trim();
    
    // 處理日期：可能是 Date 物件、字串或數字
    let rowDate = row[1];
    if (rowDate instanceof Date) {
      // Date 物件轉換為 yyyy-MM-dd 格式
      const year = rowDate.getFullYear();
      const month = String(rowDate.getMonth() + 1).padStart(2, '0');
      const day = String(rowDate.getDate()).padStart(2, '0');
      rowDate = `${year}-${month}-${day}`;
    } else if (typeof rowDate === 'number') {
      // Excel 序號日期
      const excelDate = new Date((rowDate - 25569) * 86400 * 1000);
      const year = excelDate.getFullYear();
      const month = String(excelDate.getMonth() + 1).padStart(2, '0');
      const day = String(excelDate.getDate()).padStart(2, '0');
      rowDate = `${year}-${month}-${day}`;
    } else {
      rowDate = String(rowDate).trim();
    }
    
    if (rowSiteId === targetSiteId && rowDate === targetDate) {
      // 確保返回布林值，不是空字串
      const isYes = (val) => {
        if (!val) return false;
        return String(val).trim() === '是';
      };
      
      records.push({
        elderName: String(row[2]).trim(),
        presentAM: isYes(row[3]),   // 上午出席
        presentPM: isYes(row[4]),   // 下午出席
        pickUp: isYes(row[5]),
        dropOff: isYes(row[6]),
        meal: isYes(row[7]),
        selfPay: isYes(row[8]),
        virtual: isYes(row[9])      // 虛報
      });
    }
  }
  
  return records;
}

/**
 * 取得快速登記月統計（每日統計）
 */
function getQuickEntrySummary(siteId, month) {
  const ss = getSpreadsheetBySiteId(siteId);
  const sheet = ss.getSheetByName('快速登記');
  
  if (!sheet) return { success: false, days: [] };
  
  const data = sheet.getDataRange().getValues();
  const dailyStats = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowSiteId = row[0];
    const rowDate = row[1];
    
    // 過濾據點和月份
    if (siteId && rowSiteId !== siteId) continue;
    if (month && !rowDate.startsWith(month)) continue;
    
    if (!dailyStats[rowDate]) {
      dailyStats[rowDate] = { date: rowDate, attended: 0, pickup: 0, meal: 0 };
    }
    
    if (row[3] === '是') dailyStats[rowDate].attended++;
    if (row[4] === '是' || row[5] === '是') dailyStats[rowDate].pickup++;
    if (row[6] === '是') dailyStats[rowDate].meal++;
  }
  
  const days = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
  
  return { success: true, days };
}

/**
 * 取得司機對帳報表
 */
function getDriverReport(siteId, month) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('快速登記');
  const settingsSheet = ss.getSheetByName('費用設定');
  
  // 取得費率設定
  let driverRate = 80; // 預設每人次 $80
  if (settingsSheet) {
    const settings = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < settings.length; i++) {
      if (settings[i][0] === siteId || settings[i][0] === 'all') {
        driverRate = settings[i][4] || 80; // 駕駛薪資/趟
        break;
      }
    }
  }
  
  if (!sheet) {
    return { success: false, message: '找不到快速登記資料', days: [], total: 0, totalAmount: 0, driverRate };
  }
  
  const data = sheet.getDataRange().getValues();
  const dailyStats = {};
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowSiteId = row[0];
    const rowDate = row[1];
    
    // 過濾據點和月份
    if (siteId && rowSiteId !== siteId) continue;
    if (month && !rowDate.startsWith(month)) continue;
    
    if (!dailyStats[rowDate]) {
      dailyStats[rowDate] = { date: rowDate, pickupCount: 0, elders: [] };
    }
    
    // 計算搭車人次（早上接或下午送都算）
    const pickUp = row[4] === '是';
    const dropOff = row[5] === '是';
    
    if (pickUp || dropOff) {
      dailyStats[rowDate].pickupCount++;
      dailyStats[rowDate].elders.push(row[2]);
    }
  }
  
  // 轉換為陣列並排序
  const days = Object.values(dailyStats)
    .map(d => ({
      date: d.date,
      pickupCount: d.pickupCount,
      amount: d.pickupCount * driverRate,
      elders: d.elders
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  // 計算總計
  const total = days.reduce((sum, d) => sum + d.pickupCount, 0);
  const totalAmount = total * driverRate;
  
  return {
    success: true,
    siteId,
    month,
    driverRate,
    days,
    total,
    totalAmount
  };
}

// ===================================================
// 長者月額度追蹤
// ===================================================

/**
 * 取得每位長者當月累計使用金額
 */
function getElderMonthlyUsage(siteId, month) {
  const ss = getSpreadsheetBySiteId(siteId);
  const quickSheet = ss.getSheetByName('快速登記');
  const elderSheet = ss.getSheetByName('長者名單');
  
  if (!quickSheet || !elderSheet) return [];
  
  // 讀取長者名單取得 customFare 和 monthlyQuota
  const elderData = elderSheet.getDataRange().getValues();
  const elderMap = {};
  for (let i = 1; i < elderData.length; i++) {
    const name = String(elderData[i][0]).trim();
    if (!name) continue;
    elderMap[name] = {
      fare: elderData[i][6] || 18,
      customFare: elderData[i][10] || 0,
      monthlyQuota: elderData[i][11] || 0
    };
  }
  
  // 從快速登記統計當月每位長者的接送費用
  const quickData = quickSheet.getDataRange().getValues();
  const usageMap = {};
  
  for (let i = 1; i < quickData.length; i++) {
    const row = quickData[i];
    const rowSiteId = String(row[0]).trim();
    let rowDate = row[1];
    
    // 處理日期格式
    if (rowDate instanceof Date) {
      const year = rowDate.getFullYear();
      const m = String(rowDate.getMonth() + 1).padStart(2, '0');
      rowDate = year + '-' + m;
    } else {
      rowDate = String(rowDate).trim().substring(0, 7);
    }
    
    if (siteId && rowSiteId !== siteId) continue;
    if (month && rowDate !== month) continue;
    
    const elderName = String(row[2]).trim();
    const pickUp = String(row[5]).trim() === '是';
    const dropOff = String(row[6]).trim() === '是';
    const isVirtual = row[9] ? String(row[9]).trim() === '是' : false;
    
    // 虛報的不算費用
    if (isVirtual) continue;
    
    if (!usageMap[elderName]) {
      usageMap[elderName] = 0;
    }
    
    // 計算接送費用（BD03固定 $115/趟）
    var BD03_RATE = 115;
    if (pickUp) usageMap[elderName] += BD03_RATE;
    if (dropOff) usageMap[elderName] += BD03_RATE;
  }
  
  // 組合結果
  var result = [];
  for (var name in elderMap) {
    var elder = elderMap[name];
    if (elder.monthlyQuota > 0) {
      var totalUsed = usageMap[name] || 0;
      result.push({
        elderName: name,
        totalUsed: totalUsed,
        quota: elder.monthlyQuota,
        remaining: elder.monthlyQuota - totalUsed,
        percentage: Math.round((totalUsed / elder.monthlyQuota) * 100)
      });
    }
  }
  
  return result;
}

// ===================================================
// LINE Messaging API 推播功能
// ===================================================

// LINE Messaging API 設定
const LINE_CHANNEL_ACCESS_TOKEN = 'OLWZxDDoQQ3zdYipaw1v7sgBEyGohSe6U6cnC2thngmUnkWZBK2SyZjMMJGrn+cJnLcB66fQgcLY/5jy2Wlns+l+ghFRcX9rB2eXwSfX7O9vL21lTXKJEAoI+oGI90v28rLfrpc4cuDJNzKC5s2VzAdB04t89/1O/w1cDnyilFU=';

/**
 * 發送 LINE 推播訊息
 * @param {string} userId - LINE User ID
 * @param {string} message - 訊息內容
 */
function sendLineMessage(userId, message) {
  const url = 'https://api.line.me/v2/bot/message/push';
  
  const payload = {
    to: userId,
    messages: [
      {
        type: 'text',
        text: message
      }
    ]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true, message: '訊息發送成功' };
    } else {
      const responseBody = response.getContentText();
      console.log('LINE API 錯誤:', responseBody);
      return { success: false, error: responseBody };
    }
  } catch (error) {
    console.log('發送 LINE 訊息失敗:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 取得司機設定列表
 */
function getDriverSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('司機設定');
  
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  const drivers = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] || !row[1]) continue; // 需要姓名和 LINE User ID
    
    drivers.push({
      name: row[0],
      lineUserId: row[1],
      siteId: row[2] || 'all',
      enabled: row[3] !== '否'
    });
  }
  
  return drivers;
}

/**
 * 初始化司機設定工作表
 */
function initDriverSettingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('司機設定');
  
  if (!sheet) {
    sheet = ss.insertSheet('司機設定');
    sheet.appendRow(['司機姓名', 'LINE User ID', '服務據點', '啟用通知', '備註']);
    
    // 設定欄寬
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 250);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 80);
    sheet.setColumnWidth(5, 200);
    
    // 新增說明列
    sheet.appendRow(['（範例）王大明', 'U1234567890abcdef...', 'sanxing', '是', '請司機加入官方帳號後，用 Webhook 取得 User ID']);
  }
  
  return { success: true, message: '司機設定工作表已建立' };
}

/**
 * 產生司機週報訊息
 * @param {string} driverName - 司機姓名
 * @param {string} siteId - 據點 ID
 * @param {string} weekStart - 週開始日期 (YYYY-MM-DD)
 * @param {string} weekEnd - 週結束日期 (YYYY-MM-DD)
 */
function generateDriverWeeklyReport(driverName, siteId, weekStart, weekEnd) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('快速登記');
  const settingsSheet = ss.getSheetByName('費用設定');
  
  // 取得費率
  let driverRate = 80;
  if (settingsSheet) {
    const settings = settingsSheet.getDataRange().getValues();
    for (let i = 1; i < settings.length; i++) {
      if (settings[i][0] === siteId || settings[i][0] === 'all') {
        driverRate = settings[i][4] || 80;
        break;
      }
    }
  }
  
  if (!sheet) {
    return `📋 司機載客明細\n\n🚗 ${driverName} 司機您好\n📅 ${weekStart} ~ ${weekEnd}\n\n⚠️ 尚無載客紀錄`;
  }
  
  const data = sheet.getDataRange().getValues();
  const dailyStats = {};
  let totalPickup = 0;
  
  // 過濾該週資料
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowSiteId = row[0];
    const rowDate = row[1];
    const elderName = row[2]; // 長者姓名
    
    // 過濾據點
    if (siteId && siteId !== 'all' && rowSiteId !== siteId) continue;
    
    // 過濾日期範圍
    if (rowDate < weekStart || rowDate > weekEnd) continue;
    
    if (!dailyStats[rowDate]) {
      dailyStats[rowDate] = { date: rowDate, count: 0, elders: [] };
    }
    
    // 計算搭車人次
    const pickUp = row[4] === '是';
    const dropOff = row[5] === '是';
    
    if (pickUp || dropOff) {
      dailyStats[rowDate].count++;
      dailyStats[rowDate].elders.push(elderName);
      totalPickup++;
    }
  }
  
  // 產生訊息
  const days = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));
  const weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];
  
  let message = `📋 司機載客明細\n\n`;
  message += `🚗 ${driverName} 司機您好\n`;
  message += `📅 ${formatShortDate(weekStart)} ~ ${formatShortDate(weekEnd)}\n\n`;
  
  if (days.length === 0) {
    message += `本週無載客紀錄\n`;
  } else {
    message += `【每日明細】\n`;
    days.forEach(day => {
      const dateStr = String(day.date);
      const date = new Date(day.date);
      const weekDay = weekDayNames[date.getDay()];
      const amount = day.count * driverRate;
      const shortDate = dateStr.length >= 10 ? dateStr.substring(5, 10) : dateStr;
      message += `${shortDate} (${weekDay}) ${day.count}人次 $${amount}\n`;
    });
  }
  
  message += `\n【本週統計】\n`;
  message += `✅ 總人次：${totalPickup} 人次\n`;
  message += `💰 應付金額：$${totalPickup * driverRate}\n\n`;
  message += `感謝您的辛勞！\n\n`;
  message += `💡 如需查看詳細名單，請回覆「名單」`;
  
  return message;
}

/**
 * 格式化日期為簡短格式
 */
function formatShortDate(dateStr) {
  const parts = dateStr.split('-');
  return `${parts[1]}/${parts[2]}`;
}

/**
 * 發送所有司機的週報
 * 此函數由定時觸發器呼叫
 */
function sendWeeklyDriverReports() {
  const drivers = getDriverSettings();
  
  if (drivers.length === 0) {
    console.log('尚無司機設定');
    return { success: false, message: '尚無司機設定' };
  }
  
  // 計算上週日期範圍
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // 上週日（7天前的週日）
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - dayOfWeek - 7);
  
  // 上週六（昨天或更早的週六）
  const lastSaturday = new Date(lastSunday);
  lastSaturday.setDate(lastSunday.getDate() + 6);
  
  const weekStart = formatDateYMD(lastSunday);
  const weekEnd = formatDateYMD(lastSaturday);
  
  const results = [];
  
  drivers.forEach(driver => {
    if (!driver.enabled) {
      results.push({ name: driver.name, status: '已停用' });
      return;
    }
    
    const message = generateDriverWeeklyReport(driver.name, driver.siteId, weekStart, weekEnd);
    const sendResult = sendLineMessage(driver.lineUserId, message);
    
    results.push({
      name: driver.name,
      status: sendResult.success ? '發送成功' : '發送失敗',
      error: sendResult.error
    });
    
    // 避免過快發送（LINE 有頻率限制）
    Utilities.sleep(500);
  });
  
  console.log('週報發送結果:', JSON.stringify(results));
  return { success: true, results };
}

/**
 * 格式化日期為 YYYY-MM-DD
 */
function formatDateYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 設定每週定時觸發器
 * 手動執行一次此函數即可設定
 */
function setupWeeklyTrigger() {
  // 先刪除舊的觸發器
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'sendWeeklyDriverReports') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 建立新的每週觸發器（每週日晚上 8 點）
  ScriptApp.newTrigger('sendWeeklyDriverReports')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(20)
    .create();
  
  return { success: true, message: '已設定每週日 20:00 自動發送週報' };
}

/**
 * 測試 LINE 訊息發送（用於除錯）
 * 請先填入正確的 User ID
 */
function testSendLineMessage() {
  const testUserId = 'U替換成實際的UserID'; // 請替換為實際的 User ID
  const testMessage = '🔔 測試訊息\n\n這是司機載客通知系統的測試訊息。\n\n如果您收到這則訊息，表示設定成功！';
  
  const result = sendLineMessage(testUserId, testMessage);
  console.log('測試結果:', JSON.stringify(result));
  return result;
}

/**
 * 手動發送本週報表（用於除錯）
 */
function manualSendWeeklyReports() {
  return sendWeeklyDriverReports();
}

/**
 * LINE Webhook 處理函數
 * 用於接收司機發送的訊息並記錄 User ID
 */
function doPostLineWebhook(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.events && data.events.length > 0) {
      const event = data.events[0];
      
      if (event.type === 'message' && event.source.type === 'user') {
        const userId = event.source.userId;
        const messageText = event.message.text || '';
        
        // 記錄到 LINE用戶 工作表
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        let sheet = ss.getSheetByName('LINE用戶');
        
        if (!sheet) {
          sheet = ss.insertSheet('LINE用戶');
          sheet.appendRow(['時間', 'User ID', '訊息內容', '已處理']);
        }
        
        sheet.appendRow([new Date(), userId, messageText, '否']);
        
        // 自動回覆
        sendLineMessage(userId, `您好！您的 User ID 已記錄：\n${userId}\n\n請告知管理員將此 ID 加入司機設定。`);
      }
    }
    
    return ContentService.createTextOutput('OK');
  } catch (error) {
    console.log('Webhook 錯誤:', error.message);
    return ContentService.createTextOutput('Error');
  }
}


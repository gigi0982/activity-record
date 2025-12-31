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

// 處理 POST 請求
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
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
      
      // ========== 活動目的管理（新增）==========
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
      
      default:
        // 沒有 action 時，預設為新增活動紀錄
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

// 處理 GET 請求（用於測試）
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'OK',
    message: '活動管理系統 API 運作中',
    version: '2.0',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// ===================================================
// 活動紀錄相關函數
// ===================================================

function addActivity(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('活動紀錄');
  
  // 如果工作表不存在，建立它
  if (!sheet) {
    sheet = ss.insertSheet('活動紀錄');
    sheet.appendRow(['日期', '時間', '活動名稱', '活動目的', '活動主題', '參與者', '特殊狀況', '討論事項', '建立時間']);
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
    new Date().toISOString()
  ]);
  
  return { success: true, message: '活動紀錄已新增' };
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

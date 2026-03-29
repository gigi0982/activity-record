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
      
      // ========== 健康紀錄 ==========
      case 'saveHealthRecords':
        result = saveHealthRecords(data);
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
          
          // 檢查是否為家屬（根據長者名單的家屬LINE欄位）
          const familyElder = findElderByFamilyLineId(userId);
          
          if (driver) {
            // 已註冊的司機
            if (messageText.includes('名單') || messageText.includes('詳細')) {
              const detailedReport = generateDetailedDriverReport(driver.name, driver.siteId);
              sendLineMessage(userId, detailedReport);
            } else if (messageText.includes('薪資') || messageText.includes('對帳')) {
              // 查詢近兩週薪資 - 使用 Flex 卡片
              var today = new Date();
              var twoWeeksAgo = new Date(today);
              twoWeeksAgo.setDate(today.getDate() - 14);
              var salaryFlexResult = generateDriverSalaryFlexData(driver.name, driver.siteId, formatDateYMD(twoWeeksAgo), formatDateYMD(today));
              if (salaryFlexResult && salaryFlexResult.flexCard) {
                sendFlexMessage(userId, salaryFlexResult.flexCard, '🚗 司機薪資明細 - ' + driver.name);
              } else {
                // 如果 Flex 建立失敗，退回純文字
                var report = generateBiweeklyDriverReport(driver.name, driver.siteId, formatDateYMD(twoWeeksAgo), formatDateYMD(today));
                sendLineMessage(userId, report);
              }
            } else {
              sendLineMessage(userId, `${driver.name} 司機您好！\n\n可用指令：\n📋 回覆「名單」→ 本週載送名單\n💰 回覆「薪資」→ 近兩週薪資明細`);
            }
          } else if (familyElder) {
            // 家屬查詢血壓（使用血壓家屬 Bot 回覆）- 使用 Flex 卡片
            if (messageText.includes('血壓') || messageText.includes('健康') || messageText.includes('查詢')) {
              var elderRecords = getHealthByElder(familyElder.name);
              var recentRecords = elderRecords.slice(0, 14); // 最近 14 筆
              if (recentRecords.length > 0) {
                var bpFlexResult = generateBPFlexData(familyElder.name, recentRecords);
                if (bpFlexResult && bpFlexResult.flexCard) {
                  sendFlexBPMessage(userId, bpFlexResult.flexCard, '❤️ ' + familyElder.name + ' 的血壓報告');
                } else {
                  var bpReport = generateBiweeklyBPReport(familyElder.name, recentRecords);
                  sendLineBPMessage(userId, bpReport || '目前尚無血壓紀錄');
                }
              } else {
                sendLineBPMessage(userId, '❤️ ' + familyElder.name + '\n\n目前尚無血壓紀錄，紀錄後將定期推送報告給您。');
              }
            } else {
              sendLineBPMessage(userId, `您好！您是 ${familyElder.name} 的家屬。\n\n📋 回覆「血壓」→ 查看近期血壓報告\n\n系統會每 2 週自動推送血壓報告給您 ❤️`);
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
            
            sendLineMessage(userId, `您好！您的 User ID 已記錄：\n${userId}\n\n請告知據點管理員將此 ID 加入設定。\n\n📌 司機請加入「司機設定」\n📌 家屬請加入長者資料的「家屬LINE」欄位`);
          }
        }
      });
    }
    
    // LINE Webhook 必須返回 200 OK
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    
  } catch (error) {
    console.log('LINE Webhook 處理錯誤:', error.message);
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * 根據家屬 LINE User ID 查找長者
 */
function findElderByFamilyLineId(userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('長者名單');
  if (!sheet) return null;

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var familyLineId = String(data[i][9] || '').trim();
    if (familyLineId === userId) {
      return {
        name: data[i][0],
        level: data[i][1],
        familyLineId: familyLineId
      };
    }
  }
  return null;
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
      
      // ========== 健康紀錄 ==========
      case 'getHealthByElder':
        const healthElderName = e.parameter.elderName || '';
        return ContentService.createTextOutput(JSON.stringify(getHealthByElder(healthElderName)))
          .setMimeType(ContentService.MimeType.JSON);
      
      case 'getAllHealth':
        return ContentService.createTextOutput(JSON.stringify(getAllHealth()))
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

// LINE Bot 1：司機通知 (@079rshsc)
const LINE_CHANNEL_ACCESS_TOKEN = 'OLWZxDDoQQ3zdYipaw1v7sgBEyGohSe6U6cnC2thngmUnkWZBK2SyZjMMJGrn+cJnLcB66fQgcLY/5jy2Wlns+l+ghFRcX9rB2eXwSfX7O9vL21lTXKJEAoI+oGI90v28rLfrpc4cuDJNzKC5s2VzAdB04t89/1O/w1cDnyilFU=';
const LINE_DRIVER_ADMIN_USER_ID = 'Udd3152e0622b3cf91e6da5913d1a3e88';

// LINE Bot 2：血壓家屬通知 (@618gzkhw)
const LINE_BP_CHANNEL_ACCESS_TOKEN = 'Nxi+xNfc21bVfY8pLIeSIx9TfQ/Eib09fykEpKPTecjASgH6/qQkoHfKw2Yv8zF3zO74dZ6tvi2/JYGZhq4wMdZ50QS93GSUpB0/EwATmvKjQZASo79xX4pFZHd4V6Mh6oGV3M68NOwAHTX1BLd2GwdB04t89/1O/w1cDnyilFU=';
const LINE_BP_ADMIN_USER_ID = 'Uc696af3dd52c1d90c4464267fcc521cf';

/**
 * 發送 LINE 推播訊息（使用司機 Bot）
 * @param {string} userId - LINE User ID
 * @param {string} message - 訊息內容
 */
function sendLineMessage(userId, message) {
  return sendLineMessageWithToken(userId, message, LINE_CHANNEL_ACCESS_TOKEN);
}

/**
 * 發送 LINE 推播訊息（使用血壓家屬 Bot）
 */
function sendLineBPMessage(userId, message) {
  return sendLineMessageWithToken(userId, message, LINE_BP_CHANNEL_ACCESS_TOKEN);
}

/**
 * 發送 LINE 推播訊息（指定 token）
 */
function sendLineMessageWithToken(userId, message, token) {
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
      'Authorization': 'Bearer ' + token
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
 * 發送 LINE Flex Message（指定 token）
 * @param {string} userId - LINE User ID
 * @param {Object} flexContent - Flex Message 的 contents（bubble 或 carousel）
 * @param {string} altText - 無法顯示 Flex 時的替代文字
 * @param {string} token - LINE Channel Access Token
 */
function sendFlexMessageWithToken(userId, flexContent, altText, token) {
  const url = 'https://api.line.me/v2/bot/message/push';
  
  const payload = {
    to: userId,
    messages: [
      {
        type: 'flex',
        altText: altText,
        contents: flexContent
      }
    ]
  };
  
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    
    if (responseCode === 200) {
      return { success: true, message: 'Flex 訊息發送成功' };
    } else {
      const responseBody = response.getContentText();
      console.log('LINE Flex API 錯誤:', responseBody);
      return { success: false, error: responseBody };
    }
  } catch (error) {
    console.log('發送 Flex 訊息失敗:', error.message);
    return { success: false, error: error.message };
  }
}

/** 發送 Flex Message（司機 Bot） */
function sendFlexMessage(userId, flexContent, altText) {
  return sendFlexMessageWithToken(userId, flexContent, altText, LINE_CHANNEL_ACCESS_TOKEN);
}

/** 發送 Flex Message（血壓家屬 Bot） */
function sendFlexBPMessage(userId, flexContent, altText) {
  return sendFlexMessageWithToken(userId, flexContent, altText, LINE_BP_CHANNEL_ACCESS_TOKEN);
}

// ===================================================
// Flex Message 卡片模板
// ===================================================

/**
 * 建立司機薪資 Flex Message 卡片
 */
function buildDriverSalaryFlexCard(driverName, siteId, periodStart, periodEnd, dailyDetails, totalPickup, totalAmount, workDays, driverRate) {
  var isLuodong = (siteId === 'luodong');
  
  // 每日明細列
  var dailyRows = [];
  dailyDetails.forEach(function(day) {
    var weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];
    var date = new Date(day.date);
    var weekDay = weekDayNames[date.getDay()];
    var shortDate = day.date.length >= 10 ? day.date.substring(5, 10) : day.date;
    
    dailyRows.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: shortDate + '(' + weekDay + ')',
          size: 'sm',
          color: '#555555',
          flex: 3
        },
        {
          type: 'text',
          text: day.count + '人',
          size: 'sm',
          color: '#111111',
          align: 'center',
          flex: 2
        },
        {
          type: 'text',
          text: '$' + day.amount.toLocaleString(),
          size: 'sm',
          color: '#0369A1',
          align: 'end',
          weight: 'bold',
          flex: 2
        }
      ],
      margin: 'md'
    });
  });

  // 限制最多顯示 14 天，避免卡片過長
  if (dailyRows.length > 14) {
    dailyRows = dailyRows.slice(0, 14);
    dailyRows.push({
      type: 'text',
      text: '...更多紀錄請查看系統',
      size: 'xs',
      color: '#aaaaaa',
      margin: 'md'
    });
  }

  var bodyContents = [
    // 標題
    {
      type: 'text',
      text: '🚗 司機薪資明細',
      weight: 'bold',
      color: '#0369A1',
      size: 'lg'
    },
    // 司機姓名與期間
    {
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            { type: 'text', text: '司機', size: 'sm', color: '#aaaaaa', flex: 2 },
            { type: 'text', text: driverName, size: 'sm', color: '#111111', weight: 'bold', flex: 5 }
          ]
        },
        {
          type: 'box',
          layout: 'horizontal',
          margin: 'sm',
          contents: [
            { type: 'text', text: '期間', size: 'sm', color: '#aaaaaa', flex: 2 },
            { type: 'text', text: formatShortDate(periodStart) + ' ~ ' + formatShortDate(periodEnd), size: 'sm', color: '#111111', flex: 5 }
          ]
        }
      ]
    },
    // 分隔線
    {
      type: 'separator',
      margin: 'lg'
    },
    // 明細表頭
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'lg',
      contents: [
        { type: 'text', text: '日期', size: 'xs', color: '#aaaaaa', flex: 3 },
        { type: 'text', text: '人次', size: 'xs', color: '#aaaaaa', align: 'center', flex: 2 },
        { type: 'text', text: '金額', size: 'xs', color: '#aaaaaa', align: 'end', flex: 2 }
      ]
    }
  ];

  // 加入每日明細
  dailyRows.forEach(function(row) { bodyContents.push(row); });

  // 分隔線 + 統計
  bodyContents.push({
    type: 'separator',
    margin: 'lg'
  });

  // 統計區塊
  bodyContents.push({
    type: 'box',
    layout: 'vertical',
    margin: 'lg',
    contents: [
      {
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'text', text: '📅 出車天數', size: 'sm', color: '#555555', flex: 4 },
          { type: 'text', text: workDays + ' 天', size: 'sm', color: '#111111', weight: 'bold', align: 'end', flex: 3 }
        ]
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          { type: 'text', text: '✅ 總載客人次', size: 'sm', color: '#555555', flex: 4 },
          { type: 'text', text: totalPickup + ' 人次', size: 'sm', color: '#111111', weight: 'bold', align: 'end', flex: 3 }
        ]
      },
      {
        type: 'box',
        layout: 'horizontal',
        margin: 'md',
        contents: [
          { type: 'text', text: '💰 應付金額', size: 'md', color: '#0369A1', weight: 'bold', flex: 4 },
          { type: 'text', text: '$' + totalAmount.toLocaleString(), size: 'xl', color: '#0369A1', weight: 'bold', align: 'end', flex: 3 }
        ]
      }
    ]
  });

  // 羅東規則備註
  var footerContents = [];
  if (isLuodong) {
    footerContents.push({
      type: 'text',
      text: '📌 保底 $1,800/日（≤20人），超過 +$90/人',
      size: 'xxs',
      color: '#D97706',
      wrap: true
    });
  }
  footerContents.push({
    type: 'text',
    text: '感謝您的辛勞 💪 照護據點關心您',
    size: 'xxs',
    color: '#aaaaaa',
    margin: 'sm',
    wrap: true
  });

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '🏠 照護據點',
              size: 'xs',
              color: '#ffffff',
              flex: 0
            }
          ]
        }
      ],
      backgroundColor: '#0369A1',
      paddingAll: '15px'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: bodyContents,
      paddingAll: '20px'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: footerContents,
      paddingAll: '15px'
    },
    styles: {
      footer: {
        separator: true
      }
    }
  };
}

/**
 * 建立血壓報告 Flex Message 卡片
 */
function buildBPReportFlexCard(elderName, records, stats) {
  // stats = { avgSys, avgDia, medSys, medDia, maxSys, maxDia, minSys, minDia, avgPulse, level, emoji, recordCount }
  
  // 血壓分級顏色
  var levelColorMap = {
    '正常': '#22C55E',
    '血壓偏高': '#EAB308',
    '高血壓前期': '#D97706',
    '第一期高血壓': '#EF4444',
    '第二期高血壓': '#DC2626',
    '高血壓危象': '#991B1B',
    '低血壓': '#3B82F6'
  };
  var levelColor = levelColorMap[stats.level] || '#22C55E';
  var headerColor = (stats.level === '正常' || stats.level === '血壓偏高') ? '#22C55E' : '#EF4444';

  // 近期紀錄列
  var recentRows = [];
  var recentCount = Math.min(records.length, 5);
  for (var i = 0; i < recentCount; i++) {
    var r = records[i];
    var shortDate = String(r.date).length >= 10 ? String(r.date).substring(5, 10) : String(r.date);
    recentRows.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        { type: 'text', text: shortDate, size: 'sm', color: '#555555', flex: 2 },
        { type: 'text', text: String(r.bloodPressure || '-'), size: 'sm', color: '#111111', weight: 'bold', align: 'center', flex: 3 },
        { type: 'text', text: r.heartRate ? (r.heartRate + ' bpm') : '-', size: 'sm', color: '#888888', align: 'end', flex: 2 }
      ]
    });
  }

  var bodyContents = [
    // 長者姓名
    {
      type: 'text',
      text: '❤️ ' + elderName + ' 的血壓報告',
      weight: 'bold',
      color: '#0F172A',
      size: 'lg',
      wrap: true
    },
    // 期間
    {
      type: 'text',
      text: '📅 近兩週（共 ' + stats.recordCount + ' 筆紀錄）',
      size: 'sm',
      color: '#aaaaaa',
      margin: 'sm'
    },
    // 分隔線
    { type: 'separator', margin: 'lg' },
    // 血壓分級 Badge
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'lg',
      contents: [
        {
          type: 'text',
          text: stats.emoji + ' 評估分級',
          size: 'sm',
          color: '#555555',
          flex: 4
        },
        {
          type: 'text',
          text: stats.level,
          size: 'sm',
          color: levelColor,
          weight: 'bold',
          align: 'end',
          flex: 3
        }
      ]
    },
    // 統計卡片
    { type: 'separator', margin: 'lg' },
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          contents: [
            { type: 'text', text: '📊 平均', size: 'xs', color: '#aaaaaa', align: 'center' },
            { type: 'text', text: stats.avgSys + '/' + stats.avgDia, size: 'md', color: '#0369A1', weight: 'bold', align: 'center', margin: 'sm' }
          ]
        },
        { type: 'separator' },
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          contents: [
            { type: 'text', text: '📊 中位數', size: 'xs', color: '#aaaaaa', align: 'center' },
            { type: 'text', text: stats.medSys + '/' + stats.medDia, size: 'md', color: '#0369A1', weight: 'bold', align: 'center', margin: 'sm' }
          ]
        }
      ]
    },
    {
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          contents: [
            { type: 'text', text: '📈 最高', size: 'xs', color: '#aaaaaa', align: 'center' },
            { type: 'text', text: stats.maxSys + '/' + stats.maxDia, size: 'sm', color: '#EF4444', weight: 'bold', align: 'center', margin: 'sm' }
          ]
        },
        { type: 'separator' },
        {
          type: 'box',
          layout: 'vertical',
          flex: 1,
          contents: [
            { type: 'text', text: '📉 最低', size: 'xs', color: '#aaaaaa', align: 'center' },
            { type: 'text', text: stats.minSys + '/' + stats.minDia, size: 'sm', color: '#3B82F6', weight: 'bold', align: 'center', margin: 'sm' }
          ]
        }
      ]
    }
  ];

  // 心率
  if (stats.avgPulse > 0) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        { type: 'text', text: '💓 平均心率', size: 'sm', color: '#555555', flex: 4 },
        { type: 'text', text: stats.avgPulse + ' 次/分', size: 'sm', color: '#111111', weight: 'bold', align: 'end', flex: 3 }
      ]
    });
  }

  // 近期紀錄
  bodyContents.push({ type: 'separator', margin: 'lg' });
  bodyContents.push({
    type: 'text',
    text: '【近期紀錄】',
    size: 'sm',
    color: '#555555',
    weight: 'bold',
    margin: 'lg'
  });
  // 表頭
  bodyContents.push({
    type: 'box',
    layout: 'horizontal',
    margin: 'sm',
    contents: [
      { type: 'text', text: '日期', size: 'xs', color: '#aaaaaa', flex: 2 },
      { type: 'text', text: '血壓', size: 'xs', color: '#aaaaaa', align: 'center', flex: 3 },
      { type: 'text', text: '心率', size: 'xs', color: '#aaaaaa', align: 'end', flex: 2 }
    ]
  });
  // 近期列
  recentRows.forEach(function(row) { bodyContents.push(row); });

  // 異常提醒
  var footerContents = [];
  if (stats.level !== '正常' && stats.level !== '血壓偏高') {
    footerContents.push({
      type: 'text',
      text: '⚠️ 建議就醫諮詢，並持續追蹤血壓',
      size: 'xs',
      color: '#EF4444',
      wrap: true
    });
  }
  footerContents.push({
    type: 'text',
    text: '由照護據點關心您 🏠',
    size: 'xxs',
    color: '#aaaaaa',
    margin: 'sm',
    wrap: true
  });

  return {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '❤️ 血壓健康報告',
          size: 'sm',
          color: '#ffffff',
          weight: 'bold'
        }
      ],
      backgroundColor: headerColor,
      paddingAll: '15px'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: bodyContents,
      paddingAll: '20px'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: footerContents,
      paddingAll: '15px'
    },
    styles: {
      footer: {
        separator: true
      }
    }
  };
}

// ===================================================
// Flex Data 生成器（從真實資料建立 Flex 卡片）
// ===================================================

/**
 * 從真實資料產生司機薪資 Flex 卡片資料
 * 用於 webhook 回覆和定時推送
 */
function generateDriverSalaryFlexData(driverName, siteId, periodStart, periodEnd) {
  try {
    var ss = siteId ? getSpreadsheetBySiteId(siteId) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('快速登記');
    var settingsSheet = ss.getSheetByName('費用設定');

    var driverRate = 80;
    if (settingsSheet) {
      var settings = settingsSheet.getDataRange().getValues();
      for (var i = 1; i < settings.length; i++) {
        if (settings[i][0] === siteId || settings[i][0] === 'all') {
          driverRate = settings[i][4] || 80;
          break;
        }
      }
    }

    if (!sheet) return null;

    var data = sheet.getDataRange().getValues();
    var dailyStats = {};
    var totalPickup = 0;

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowSiteId = row[0];
      var rowDate = String(row[1]);
      if (siteId && siteId !== 'all' && rowSiteId !== siteId) continue;
      if (rowDate < periodStart || rowDate > periodEnd) continue;

      if (!dailyStats[rowDate]) {
        dailyStats[rowDate] = { date: rowDate, count: 0 };
      }
      var pickUp = row[4] === '是';
      var dropOff = row[5] === '是';
      if (pickUp || dropOff) {
        dailyStats[rowDate].count++;
        totalPickup++;
      }
    }

    var days = Object.keys(dailyStats).sort();
    var dailyDetails = [];
    var totalAmount = 0;

    days.forEach(function(dateKey) {
      var day = dailyStats[dateKey];
      var dailyPay = calcDriverDailyPay(day.count, driverRate, siteId);
      totalAmount += dailyPay;
      dailyDetails.push({ date: dateKey, count: day.count, amount: dailyPay });
    });

    var flexCard = buildDriverSalaryFlexCard(driverName, siteId, periodStart, periodEnd, dailyDetails, totalPickup, totalAmount, days.length, driverRate);
    return { flexCard: flexCard, totalAmount: totalAmount, totalPickup: totalPickup };
  } catch (e) {
    console.log('generateDriverSalaryFlexData 錯誤:', e.message);
    return null;
  }
}

/**
 * 從真實資料產生血壓報告 Flex 卡片資料
 * 用於 webhook 回覆和定時推送
 */
function generateBPFlexData(elderName, records) {
  try {
    if (!records || records.length === 0) return null;

    var systolicValues = [];
    var diastolicValues = [];
    var pulseValues = [];

    records.forEach(function(r) {
      var bp = String(r.bloodPressure || '');
      if (bp.indexOf('/') > 0) {
        var parts = bp.split('/');
        var sys = parseInt(parts[0]);
        var dia = parseInt(parts[1]);
        if (sys > 0) systolicValues.push(sys);
        if (dia > 0) diastolicValues.push(dia);
      }
      if (r.heartRate) pulseValues.push(Number(r.heartRate));
    });

    if (systolicValues.length === 0) return null;

    var avg = function(arr) { return arr.length > 0 ? Math.round(arr.reduce(function(a, b) { return a + b; }, 0) / arr.length) : 0; };
    var median = function(arr) {
      if (arr.length === 0) return 0;
      var sorted = arr.slice().sort(function(a, b) { return a - b; });
      var mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    var avgSys = avg(systolicValues);
    var avgDia = avg(diastolicValues);

    var level = '正常';
    var emoji = '✅';
    if (avgSys >= 180 || avgDia >= 120) { level = '高血壓危象'; emoji = '🔴'; }
    else if (avgSys >= 160 || avgDia >= 100) { level = '第二期高血壓'; emoji = '🔴'; }
    else if (avgSys >= 140 || avgDia >= 90) { level = '第一期高血壓'; emoji = '🟠'; }
    else if (avgSys >= 130 || avgDia >= 85) { level = '高血壓前期'; emoji = '🟡'; }
    else if (avgSys >= 120) { level = '血壓偏高'; emoji = '🟡'; }
    else if (avgSys < 90 || avgDia < 60) { level = '低血壓'; emoji = '🔵'; }

    var stats = {
      avgSys: avgSys,
      avgDia: avgDia,
      medSys: median(systolicValues),
      medDia: median(diastolicValues),
      maxSys: Math.max.apply(null, systolicValues),
      maxDia: Math.max.apply(null, diastolicValues),
      minSys: Math.min.apply(null, systolicValues),
      minDia: Math.min.apply(null, diastolicValues),
      avgPulse: avg(pulseValues),
      level: level,
      emoji: emoji,
      recordCount: records.length
    };

    var flexCard = buildBPReportFlexCard(elderName, records, stats);
    return { flexCard: flexCard, stats: stats };
  } catch (e) {
    console.log('generateBPFlexData 錯誤:', e.message);
    return null;
  }
}

// ===================================================
// 測試用：發送 Flex Message 卡片
// ===================================================

/**
 * 測試發送司機薪資 Flex 卡片（發送到司機 Bot 管理者）
 */
function testSendDriverFlexCard() {
  // 模擬資料
  var today = new Date();
  var twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 13);
  var startStr = formatDateYMD(twoWeeksAgo);
  var endStr = formatDateYMD(today);

  var mockDailyDetails = [];
  for (var i = 0; i < 10; i++) {
    var d = new Date(twoWeeksAgo);
    d.setDate(twoWeeksAgo.getDate() + i);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // 跳過週末
    var count = Math.floor(Math.random() * 15) + 8;
    var amount = count <= 20 ? 1800 : 1800 + (count - 20) * 90;
    mockDailyDetails.push({
      date: formatDateYMD(d),
      count: count,
      amount: amount
    });
  }

  var totalPickup = mockDailyDetails.reduce(function(s, d) { return s + d.count; }, 0);
  var totalAmount = mockDailyDetails.reduce(function(s, d) { return s + d.amount; }, 0);

  var flexCard = buildDriverSalaryFlexCard(
    '王大明',
    'luodong',
    startStr,
    endStr,
    mockDailyDetails,
    totalPickup,
    totalAmount,
    mockDailyDetails.length,
    80
  );

  var result = sendFlexMessage(LINE_DRIVER_ADMIN_USER_ID, flexCard, '🚗 司機薪資明細 - 王大明');
  console.log('測試司機 Flex 卡片結果:', JSON.stringify(result));
  return result;
}

/**
 * 測試發送血壓報告 Flex 卡片（發送到血壓 Bot 管理者）
 */
function testSendBPFlexCard() {
  // 模擬資料
  var mockRecords = [];
  var today = new Date();
  for (var i = 0; i < 8; i++) {
    var d = new Date(today);
    d.setDate(today.getDate() - i * 2);
    var sys = Math.floor(Math.random() * 40) + 120;
    var dia = Math.floor(Math.random() * 20) + 70;
    var pulse = Math.floor(Math.random() * 20) + 65;
    mockRecords.push({
      date: formatDateYMD(d),
      bloodPressure: sys + '/' + dia,
      heartRate: pulse,
      weight: 62,
      note: ''
    });
  }

  // 計算統計
  var systolicValues = [];
  var diastolicValues = [];
  var pulseValues = [];
  mockRecords.forEach(function(r) {
    var parts = String(r.bloodPressure).split('/');
    systolicValues.push(parseInt(parts[0]));
    diastolicValues.push(parseInt(parts[1]));
    if (r.heartRate) pulseValues.push(r.heartRate);
  });

  var avg = function(arr) { return arr.length > 0 ? Math.round(arr.reduce(function(a, b) { return a + b; }, 0) / arr.length) : 0; };
  var median = function(arr) {
    var sorted = arr.slice().sort(function(a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  var avgSys = avg(systolicValues);
  var avgDia = avg(diastolicValues);

  var level = '正常';
  var emoji = '✅';
  if (avgSys >= 180 || avgDia >= 120) { level = '高血壓危象'; emoji = '🔴'; }
  else if (avgSys >= 160 || avgDia >= 100) { level = '第二期高血壓'; emoji = '🔴'; }
  else if (avgSys >= 140 || avgDia >= 90) { level = '第一期高血壓'; emoji = '🟠'; }
  else if (avgSys >= 130 || avgDia >= 85) { level = '高血壓前期'; emoji = '🟡'; }
  else if (avgSys >= 120) { level = '血壓偏高'; emoji = '🟡'; }
  else if (avgSys < 90 || avgDia < 60) { level = '低血壓'; emoji = '🔵'; }

  var stats = {
    avgSys: avgSys,
    avgDia: avgDia,
    medSys: median(systolicValues),
    medDia: median(diastolicValues),
    maxSys: Math.max.apply(null, systolicValues),
    maxDia: Math.max.apply(null, diastolicValues),
    minSys: Math.min.apply(null, systolicValues),
    minDia: Math.min.apply(null, diastolicValues),
    avgPulse: avg(pulseValues),
    level: level,
    emoji: emoji,
    recordCount: mockRecords.length
  };

  var flexCard = buildBPReportFlexCard('陳阿嬤', mockRecords, stats);

  var result = sendFlexBPMessage(LINE_BP_ADMIN_USER_ID, flexCard, '❤️ 陳阿嬤 的血壓報告');
  console.log('測試血壓 Flex 卡片結果:', JSON.stringify(result));
  return result;
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

// ===================================================
// 健康紀錄管理
// ===================================================

/**
 * 儲存健康紀錄
 */
function saveHealthRecords(data) {
  const records = data.records || [];
  if (records.length === 0) return { success: false, message: '無資料' };

  const siteId = data.siteId || '';
  const ss = siteId ? getSpreadsheetBySiteId(siteId) : SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('健康紀錄');

  if (!sheet) {
    sheet = ss.insertSheet('健康紀錄');
    sheet.appendRow(['長者姓名', '日期', '血壓', '心率', '體重', '備註', '建立時間']);
  }

  records.forEach(function(r) {
    // 檢查是否已有同一天同一人的紀錄（更新而非新增）
    var allData = sheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === r.elderName && allData[i][1] === r.date) {
        sheet.getRange(i + 1, 3).setValue(r.bloodPressure || '');
        sheet.getRange(i + 1, 4).setValue(r.heartRate || '');
        sheet.getRange(i + 1, 5).setValue(r.weight || '');
        sheet.getRange(i + 1, 6).setValue(r.note || '');
        sheet.getRange(i + 1, 7).setValue(new Date().toISOString());
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow([
        r.elderName || '',
        r.date || '',
        r.bloodPressure || '',
        r.heartRate || '',
        r.weight || '',
        r.note || '',
        new Date().toISOString()
      ]);
    }
  });

  return { success: true, message: '健康紀錄已儲存' };
}

/**
 * 取得指定長者的健康紀錄
 */
function getHealthByElder(elderName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('健康紀錄');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === elderName) {
      results.push({
        elderName: data[i][0],
        date: data[i][1],
        bloodPressure: data[i][2],
        heartRate: data[i][3],
        weight: data[i][4],
        note: data[i][5]
      });
    }
  }
  // 按日期倒序
  results.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
  return results;
}

/**
 * 取得所有健康紀錄
 */
function getAllHealth() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('健康紀錄');
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  var results = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    results.push({
      elderName: data[i][0],
      date: data[i][1],
      bloodPressure: data[i][2],
      heartRate: data[i][3],
      weight: data[i][4],
      note: data[i][5]
    });
  }
  results.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
  return results;
}

// ===================================================
// 每 2 週駕駛薪資明細 LINE 推送
// ===================================================

// 羅東保底規則常數
var LUODONG_GUARANTEE_MIN_DAILY = 1800;
var LUODONG_GUARANTEE_THRESHOLD = 20;
var LUODONG_GUARANTEE_EXTRA_RATE = 90;

/**
 * 計算單日司機薪資（含羅東保底規則）
 */
function calcDriverDailyPay(pickupCount, driverRate, siteId) {
  if (siteId === 'luodong') {
    if (pickupCount === 0) return 0;
    if (pickupCount <= LUODONG_GUARANTEE_THRESHOLD) return LUODONG_GUARANTEE_MIN_DAILY;
    return LUODONG_GUARANTEE_MIN_DAILY + (pickupCount - LUODONG_GUARANTEE_THRESHOLD) * LUODONG_GUARANTEE_EXTRA_RATE;
  }
  return pickupCount * driverRate;
}

/**
 * 產生雙週駕駛薪資明細（含羅東保底）
 */
function generateBiweeklyDriverReport(driverName, siteId, periodStart, periodEnd) {
  const ss = siteId ? getSpreadsheetBySiteId(siteId) : SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('快速登記');
  const settingsSheet = ss.getSheetByName('費用設定');

  var driverRate = 80;
  if (settingsSheet) {
    var settings = settingsSheet.getDataRange().getValues();
    for (var i = 1; i < settings.length; i++) {
      if (settings[i][0] === siteId || settings[i][0] === 'all') {
        driverRate = settings[i][4] || 80;
        break;
      }
    }
  }

  if (!sheet) {
    return '📋 司機薪資明細\n\n🚗 ' + driverName + ' 司機您好\n📅 ' + periodStart + ' ~ ' + periodEnd + '\n\n⚠️ 尚無載客紀錄';
  }

  var data = sheet.getDataRange().getValues();
  var dailyStats = {};
  var totalAmount = 0;
  var totalPickup = 0;
  var workDays = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var rowSiteId = row[0];
    var rowDate = String(row[1]);

    if (siteId && siteId !== 'all' && rowSiteId !== siteId) continue;
    if (rowDate < periodStart || rowDate > periodEnd) continue;

    if (!dailyStats[rowDate]) {
      dailyStats[rowDate] = { date: rowDate, count: 0, elders: [] };
    }

    var pickUp = row[4] === '是';
    var dropOff = row[5] === '是';
    if (pickUp || dropOff) {
      dailyStats[rowDate].count++;
      dailyStats[rowDate].elders.push(row[2]);
      totalPickup++;
    }
  }

  var days = Object.keys(dailyStats).sort();
  var weekDayNames = ['日', '一', '二', '三', '四', '五', '六'];
  var isLuodong = (siteId === 'luodong');

  var message = '📋 司機薪資明細（雙週）\n\n';
  message += '🚗 ' + driverName + ' 司機您好\n';
  message += '📅 ' + formatShortDate(periodStart) + ' ~ ' + formatShortDate(periodEnd) + '\n';

  if (isLuodong) {
    message += '📌 羅東據點保底規則：≤' + LUODONG_GUARANTEE_THRESHOLD + '人 $' + LUODONG_GUARANTEE_MIN_DAILY + '/日，超過 +$' + LUODONG_GUARANTEE_EXTRA_RATE + '/人\n';
  }
  message += '\n【每日明細】\n';

  if (days.length === 0) {
    message += '本期無載客紀錄\n';
  } else {
    days.forEach(function(dateKey) {
      var day = dailyStats[dateKey];
      var date = new Date(dateKey);
      var weekDay = weekDayNames[date.getDay()];
      var shortDate = dateKey.length >= 10 ? dateKey.substring(5, 10) : dateKey;
      var dailyPay = calcDriverDailyPay(day.count, driverRate, siteId);
      totalAmount += dailyPay;
      workDays++;

      if (isLuodong) {
        if (day.count > LUODONG_GUARANTEE_THRESHOLD) {
          message += shortDate + '(' + weekDay + ') ' + day.count + '人 $' + LUODONG_GUARANTEE_MIN_DAILY + '+' + (day.count - LUODONG_GUARANTEE_THRESHOLD) + '×$' + LUODONG_GUARANTEE_EXTRA_RATE + '=$' + dailyPay + '\n';
        } else {
          message += shortDate + '(' + weekDay + ') ' + day.count + '人 保底$' + dailyPay + '\n';
        }
      } else {
        message += shortDate + '(' + weekDay + ') ' + day.count + '人次 $' + (day.count * driverRate) + '\n';
      }
    });
  }

  message += '\n【本期統計】\n';
  message += '📅 出車天數：' + workDays + ' 天\n';
  message += '✅ 總人次：' + totalPickup + ' 人次\n';
  message += '💰 應付金額：$' + totalAmount.toLocaleString() + '\n\n';
  message += '感謝您的辛勞！💪';

  return message;
}

/**
 * 每 2 週發送司機薪資明細
 * 此函數由定時觸發器每 2 週呼叫
 */
function sendBiweeklyDriverReports() {
  var drivers = getDriverSettings();
  if (drivers.length === 0) {
    console.log('尚無司機設定');
    return { success: false, message: '尚無司機設定' };
  }

  var today = new Date();
  // 往前推 14 天
  var periodEnd = new Date(today);
  periodEnd.setDate(today.getDate() - 1); // 到昨天
  var periodStart = new Date(periodEnd);
  periodStart.setDate(periodEnd.getDate() - 13); // 14 天前

  var startStr = formatDateYMD(periodStart);
  var endStr = formatDateYMD(periodEnd);

  var results = [];

  drivers.forEach(function(driver) {
    if (!driver.enabled) {
      results.push({ name: driver.name, status: '已停用' });
      return;
    }

    // 優先使用 Flex 卡片
    var flexResult = generateDriverSalaryFlexData(driver.name, driver.siteId, startStr, endStr);
    var sendResult;
    if (flexResult && flexResult.flexCard) {
      sendResult = sendFlexMessage(driver.lineUserId, flexResult.flexCard, '🚗 司機薪資明細 - ' + driver.name);
    } else {
      // 退回純文字
      var message = generateBiweeklyDriverReport(driver.name, driver.siteId, startStr, endStr);
      sendResult = sendLineMessage(driver.lineUserId, message);
    }

    results.push({
      name: driver.name,
      status: sendResult.success ? '發送成功' : '發送失敗',
      error: sendResult.error
    });

    Utilities.sleep(500);
  });

  console.log('雙週司機薪資發送結果:', JSON.stringify(results));
  return { success: true, results: results };
}

// ===================================================
// 每 2 週血壓報告 LINE 推送給家屬
// ===================================================

/**
 * 產生單位長者的雙週血壓報告
 */
function generateBiweeklyBPReport(elderName, records) {
  if (!records || records.length === 0) {
    return null; // 沒有紀錄就不發
  }

  var systolicValues = [];
  var diastolicValues = [];
  var pulseValues = [];

  records.forEach(function(r) {
    var bp = String(r.bloodPressure || '');
    if (bp.indexOf('/') > 0) {
      var parts = bp.split('/');
      var sys = parseInt(parts[0]);
      var dia = parseInt(parts[1]);
      if (sys > 0) systolicValues.push(sys);
      if (dia > 0) diastolicValues.push(dia);
    }
    if (r.heartRate) pulseValues.push(Number(r.heartRate));
  });

  if (systolicValues.length === 0) return null;

  // 計算統計
  var avg = function(arr) {
    return arr.length > 0 ? Math.round(arr.reduce(function(a, b) { return a + b; }, 0) / arr.length) : 0;
  };
  var median = function(arr) {
    if (arr.length === 0) return 0;
    var sorted = arr.slice().sort(function(a, b) { return a - b; });
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };
  var max = function(arr) { return Math.max.apply(null, arr); };
  var min = function(arr) { return Math.min.apply(null, arr); };

  var avgSys = avg(systolicValues);
  var avgDia = avg(diastolicValues);
  var medSys = median(systolicValues);
  var medDia = median(diastolicValues);

  // 血壓分級
  var level = '正常';
  var emoji = '✅';
  if (avgSys >= 180 || avgDia >= 120) { level = '高血壓危象'; emoji = '🔴'; }
  else if (avgSys >= 160 || avgDia >= 100) { level = '第二期高血壓'; emoji = '🔴'; }
  else if (avgSys >= 140 || avgDia >= 90) { level = '第一期高血壓'; emoji = '🟠'; }
  else if (avgSys >= 130 || avgDia >= 85) { level = '高血壓前期'; emoji = '🟡'; }
  else if (avgSys >= 120) { level = '血壓偏高'; emoji = '🟡'; }
  else if (avgSys < 90 || avgDia < 60) { level = '低血壓'; emoji = '🔵'; }

  var message = '❤️ ' + elderName + ' 的血壓報告\n';
  message += '📅 近兩週（共 ' + records.length + ' 筆紀錄）\n\n';

  message += '【統計數據】\n';
  message += '📊 平均血壓：' + avgSys + '/' + avgDia + ' mmHg\n';
  message += '📊 中位數血壓：' + medSys + '/' + medDia + ' mmHg\n';
  message += '📈 最高：' + max(systolicValues) + '/' + max(diastolicValues) + '\n';
  message += '📉 最低：' + min(systolicValues) + '/' + min(diastolicValues) + '\n';
  if (pulseValues.length > 0) {
    message += '💓 平均心率：' + avg(pulseValues) + ' 次/分\n';
  }

  message += '\n' + emoji + ' 評估分級：' + level + '\n';

  if (level !== '正常' && level !== '血壓偏高') {
    message += '\n⚠️ 建議就醫諮詢，並持續追蹤\n';
  }

  message += '\n【近期紀錄】\n';
  var recentCount = Math.min(records.length, 5);
  for (var i = 0; i < recentCount; i++) {
    var r = records[i];
    var shortDate = String(r.date).length >= 10 ? String(r.date).substring(5, 10) : String(r.date);
    message += shortDate + ' ' + (r.bloodPressure || '-') + ' mmHg';
    if (r.heartRate) message += ' 心率' + r.heartRate;
    message += '\n';
  }

  message += '\n由照護據點關心您 🏠\n如有疑問請洽據點服務人員';

  return message;
}

/**
 * 每 2 週自動發送血壓報告給家屬
 * 此函數由定時觸發器每 2 週呼叫
 */
function sendBiweeklyBPReports() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var elderSheet = ss.getSheetByName('長者名單');
  var healthSheet = ss.getSheetByName('健康紀錄');

  if (!elderSheet || !healthSheet) {
    console.log('缺少長者名單或健康紀錄工作表');
    return { success: false, message: '缺少必要工作表' };
  }

  // 取得所有長者及其家屬 LINE ID
  var elderData = elderSheet.getDataRange().getValues();
  var eldersWithFamily = [];
  for (var i = 1; i < elderData.length; i++) {
    var name = elderData[i][0];
    var familyLineId = elderData[i][9]; // 第 10 欄：家屬LINE
    if (name && familyLineId && String(familyLineId).trim().length > 0) {
      eldersWithFamily.push({ name: name, familyLineId: String(familyLineId).trim() });
    }
  }

  if (eldersWithFamily.length === 0) {
    console.log('沒有設定家屬 LINE ID 的長者');
    return { success: false, message: '沒有設定家屬 LINE ID' };
  }

  // 計算近兩週的日期範圍
  var today = new Date();
  var twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);
  var startStr = formatDateYMD(twoWeeksAgo);
  var endStr = formatDateYMD(today);

  // 取得所有健康紀錄
  var healthData = healthSheet.getDataRange().getValues();

  var results = [];

  eldersWithFamily.forEach(function(elder) {
    // 篩選該長者近兩週的紀錄
    var elderRecords = [];
    for (var j = 1; j < healthData.length; j++) {
      if (healthData[j][0] === elder.name) {
        var recDate = String(healthData[j][1]);
        if (recDate >= startStr && recDate <= endStr) {
          elderRecords.push({
            date: recDate,
            bloodPressure: healthData[j][2],
            heartRate: healthData[j][3],
            weight: healthData[j][4],
            note: healthData[j][5]
          });
        }
      }
    }

    // 按日期倒序
    elderRecords.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });

    if (elderRecords.length === 0) {
      results.push({ name: elder.name, status: '無紀錄，略過' });
      return;
    }

    var message = generateBiweeklyBPReport(elder.name, elderRecords);
    if (!message) {
      results.push({ name: elder.name, status: '無有效血壓資料' });
      return;
    }

    // 優先使用 Flex 卡片
    var bpFlexResult = generateBPFlexData(elder.name, elderRecords);
    var sendResult;
    if (bpFlexResult && bpFlexResult.flexCard) {
      sendResult = sendFlexBPMessage(elder.familyLineId, bpFlexResult.flexCard, '❤️ ' + elder.name + ' 的血壓報告');
    } else {
      sendResult = sendLineBPMessage(elder.familyLineId, message);
    }
    results.push({
      name: elder.name,
      familyLineId: elder.familyLineId.substring(0, 8) + '...',
      recordCount: elderRecords.length,
      status: sendResult.success ? '發送成功' : '發送失敗',
      error: sendResult.error
    });

    Utilities.sleep(500);
  });

  // 同時發送總結給血壓 Bot 管理者
  var bpAdminUserId = LINE_BP_ADMIN_USER_ID;
  var summaryMsg = '📊 雙週血壓報告發送結果\n\n';
  summaryMsg += '📅 ' + formatShortDate(startStr) + ' ~ ' + formatShortDate(endStr) + '\n\n';
  var successCount = results.filter(function(r) { return r.status === '發送成功'; }).length;
  var skipCount = results.filter(function(r) { return r.status === '無紀錄，略過' || r.status === '無有效血壓資料'; }).length;
  var failCount = results.filter(function(r) { return r.status === '發送失敗'; }).length;
  summaryMsg += '✅ 成功：' + successCount + ' 位\n';
  if (skipCount > 0) summaryMsg += '⏭️ 略過（無紀錄）：' + skipCount + ' 位\n';
  if (failCount > 0) summaryMsg += '❌ 失敗：' + failCount + ' 位\n';
  summaryMsg += '\n共處理 ' + results.length + ' 位長者';

  sendLineBPMessage(bpAdminUserId, summaryMsg);

  console.log('雙週血壓報告發送結果:', JSON.stringify(results));
  return { success: true, results: results };
}

// ===================================================
// 每月 20 號資料鎖定 + 自動備份
// ===================================================

/**
 * 每月 20 號自動備份上月資料
 * 此函數由定時觸發器呼叫
 */
function monthlyBackupAndLock() {
  var today = new Date();
  var day = today.getDate();
  
  // 只在 20 號執行
  if (day !== 20) {
    console.log('今天不是 20 號，跳過備份');
    return { success: false, message: '非 20 號' };
  }

  var lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  var lastMonthStr = formatDateYMD(lastMonth).substring(0, 7); // "2025-06"
  var backupName = '備份_' + lastMonthStr;
  
  var results = [];
  
  // 針對每個據點做備份
  var siteIds = Object.keys(SITE_SHEETS);
  siteIds.forEach(function(siteId) {
    try {
      var ss = getSpreadsheetBySiteId(siteId);
      
      // 備份快速登記
      var quickSheet = ss.getSheetByName('快速登記');
      if (quickSheet) {
        var backupSheet = ss.getSheetByName(backupName + '_快速登記');
        if (!backupSheet) {
          backupSheet = quickSheet.copyTo(ss);
          backupSheet.setName(backupName + '_快速登記');
          // 保護備份工作表
          var protection = backupSheet.protect();
          protection.setDescription('自動備份 - ' + lastMonthStr);
          protection.setWarningOnly(true);
        }
      }
      
      // 備份活動紀錄
      var activitySheet = ss.getSheetByName('活動紀錄');
      if (activitySheet) {
        var backupActivity = ss.getSheetByName(backupName + '_活動紀錄');
        if (!backupActivity) {
          backupActivity = activitySheet.copyTo(ss);
          backupActivity.setName(backupName + '_活動紀錄');
          var protectionA = backupActivity.protect();
          protectionA.setDescription('自動備份 - ' + lastMonthStr);
          protectionA.setWarningOnly(true);
        }
      }

      results.push({ siteId: siteId, status: '備份完成' });
    } catch (err) {
      results.push({ siteId: siteId, status: '備份失敗', error: err.message });
    }
  });

  // 通知管理者
  var adminUserId = 'Udd3152e0622b3cf91e6da5913d1a3e88';
  var msg = '🔒 月度自動備份完成\n\n';
  msg += '📅 已備份 ' + lastMonthStr + ' 月資料\n\n';
  results.forEach(function(r) {
    msg += (r.status === '備份完成' ? '✅' : '❌') + ' ' + r.siteId + '：' + r.status + '\n';
  });
  msg += '\n上月資料已鎖定，前端將禁止修改';

  sendLineMessage(adminUserId, msg);

  console.log('月度備份結果:', JSON.stringify(results));
  return { success: true, results: results };
}

// ===================================================
// 定時觸發器設定（整合版）
// ===================================================

/**
 * 設定所有定時觸發器（一次性執行）
 * 在 Google Apps Script 編輯器中手動執行一次
 */
function setupAllTriggers() {
  // 先清除所有舊的觸發器
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    var handler = trigger.getHandlerFunction();
    if (handler === 'sendWeeklyDriverReports' ||
        handler === 'sendBiweeklyDriverReports' ||
        handler === 'sendBiweeklyBPReports' ||
        handler === 'monthlyBackupAndLock') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 1. 每 2 週司機薪資報告（隔週六 20:00）
  ScriptApp.newTrigger('sendBiweeklyDriverReports')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SATURDAY)
    .atHour(20)
    .everyWeeks(2)
    .create();

  // 2. 每 2 週血壓報告傳送家屬（隔週日 10:00）
  ScriptApp.newTrigger('sendBiweeklyBPReports')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(10)
    .everyWeeks(2)
    .create();

  // 3. 每月 20 號自動備份（每天 01:00 檢查，函式內部判斷是否為 20 號）
  ScriptApp.newTrigger('monthlyBackupAndLock')
    .timeBased()
    .atHour(1)
    .everyDays(1)
    .create();

  console.log('✅ 所有觸發器已設定完成');
  
  // 通知管理者
  var adminUserId = 'Udd3152e0622b3cf91e6da5913d1a3e88';
  sendLineMessage(adminUserId, 
    '⚙️ 定時任務已設定完成\n\n' +
    '📋 司機薪資報告：隔週六 20:00\n' +
    '❤️ 血壓報告傳送家屬：隔週日 10:00\n' +
    '🔒 月度備份：每月 20 號 01:00\n\n' +
    '所有通知將發送到此帳號');
  
  return { 
    success: true, 
    message: '已設定觸發器：雙週司機薪資、雙週血壓報告、每月備份' 
  };
}

/**
 * 手動測試：發送雙週駕駛報告
 */
function testBiweeklyDriverReports() {
  return sendBiweeklyDriverReports();
}

/**
 * 手動測試：發送雙週血壓報告
 */
function testBiweeklyBPReports() {
  return sendBiweeklyBPReports();
}

/**
 * 手動測試：發送 LINE 訊息給管理者
 */
function testSendToAdmin() {
  var adminUserId = 'Udd3152e0622b3cf91e6da5913d1a3e88';
  return sendLineMessage(adminUserId, '🔔 測試訊息\n\n系統運作正常！\n\n' + new Date().toLocaleString('zh-TW'));
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


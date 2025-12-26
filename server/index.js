const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { google } = require('googleapis');
const admin = require('firebase-admin');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// 設定檔案上傳儲存
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/photos/')
  },
  filename: function (req, file, cb) {
    // 生成唯一檔案名稱: timestamp_originalname
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 檔案過濾器 - 只允許圖片檔案
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允許上傳圖片檔案！'), false);
  }
};

// 設定multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB限制
    files: 4 // 最多4個檔案
  }
});

// 中介軟體
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // 靜態檔案服務

// Google Sheets 設定
const sheets = google.sheets('v4');
let auth;

// Firebase 設定
let db;

// 初始化 Google Sheets API
async function initializeGoogleSheets() {
  try {
    // 檢查是否為測試環境
    const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    const testKeyContent = require(keyFile);

    if (testKeyContent.project_id === 'test-project') {
      console.log('Google Sheets API 測試模式 - 跳過真實初始化');
      return;
    }

    auth = new google.auth.GoogleAuth({
      keyFile: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    console.log('Google Sheets API 初始化成功');
  } catch (error) {
    console.error('Google Sheets API 初始化失敗:', error);
    console.log('繼續以測試模式運行（無 Google Sheets 功能）');
  }
}

// 初始化 Firebase
async function initializeFirebase() {
  try {
    if (!admin.apps.length) {
      // 檢查是否為測試環境
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
      const serviceAccount = require(serviceAccountPath);

      // 如果是測試金鑰，跳過初始化
      if (serviceAccount.project_id === 'test-project') {
        console.log('Firebase Firestore 測試模式 - 跳過真實初始化');
        return;
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    db = admin.firestore();
    console.log('Firebase Firestore 初始化成功');
  } catch (error) {
    console.error('Firebase Firestore 初始化失敗:', error);
    console.log('繼續以測試模式運行（無 Firestore 功能）');
  }
}

// 寫入 Google Sheet
async function writeToGoogleSheet(activityData) {
  try {
    const authClient = await auth.getClient();
    const values = [];

    // 為每位參與者建立一行資料
    activityData.participants.forEach(participant => {
      values.push([
        activityData.date,
        activityData.purpose,
        activityData.topic,
        participant.name,
        participant.focus,
        participant.interaction,
        participant.attention,
        participant.notes || '',
        activityData.special || '',
        activityData.discussion || '',
        activityData.photos ? activityData.photos.join('; ') : '' // 照片URL，用分號分隔
      ]);
    });

    const request = {
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'A:K', // A到K欄（新增照片欄位）
      valueInputOption: 'RAW',
      auth: authClient,
      resource: {
        values: values,
      },
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log('成功寫入 Google Sheet');
    return response;
  } catch (error) {
    console.error('寫入 Google Sheet 失敗:', error);
    throw error;
  }
}

// 寫入 Firebase Firestore (備援)
async function writeToFirestore(activityData) {
  try {
    const docRef = await db.collection('activities').add({
      ...activityData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('成功寫入 Firestore，文件 ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('寫入 Firestore 失敗:', error);
    throw error;
  }
}

// API 路由

// 新增活動紀錄
// 新增活動記錄 API（支援檔案上傳）
app.post('/api/activity', upload.array('photos', 4), async (req, res) => {
  try {
    const activityData = JSON.parse(req.body.data || '{}');
    const uploadedFiles = req.files || [];

    // 資料驗證
    const requiredFields = ['date', 'purpose', 'topic', 'participants'];
    for (const field of requiredFields) {
      if (!activityData[field]) {
        return res.status(400).json({ error: `缺少必要欄位: ${field}` });
      }
    }

    // 驗證參與者資料
    if (!Array.isArray(activityData.participants) || activityData.participants.length === 0) {
      return res.status(400).json({ error: '至少需要一位參與者' });
    }

    // 處理上傳的照片檔案路徑
    const photoUrls = uploadedFiles.map(file => `/uploads/photos/${file.filename}`);
    activityData.photos = photoUrls;

    // 驗證每位參與者的分數範圍 (1-5)
    for (let i = 0; i < activityData.participants.length; i++) {
      const participant = activityData.participants[i];
      if (!participant.name) {
        return res.status(400).json({ error: `第 ${i + 1} 位參與者缺少姓名` });
      }

      const scoreFields = ['focus', 'interaction', 'attention'];
      for (const field of scoreFields) {
        const score = parseInt(participant[field]);
        if (isNaN(score) || score < 1 || score > 5) {
          return res.status(400).json({
            error: `${participant.name} 的 ${field} 分數必須為 1-5 之間的數字`
          });
        }
      }
    }

    // 嘗試寫入 Google Sheet (主要)
    let sheetResult = null;
    try {
      sheetResult = await writeToGoogleSheet(activityData);
    } catch (sheetError) {
      console.log('Google Sheet 寫入失敗，使用 Firestore 備援');
    }

    // 無論 Google Sheet 是否成功，都寫入 Firestore 作為備援
    let firestoreResult = null;
    try {
      firestoreResult = await writeToFirestore(activityData);
    } catch (firestoreError) {
      console.log('Firestore 備援寫入也失敗');
    }

    if (!sheetResult && !firestoreResult) {
      return res.status(500).json({ error: '資料儲存失敗，請稍後再試' });
    }

    res.json({
      success: true,
      message: '活動紀錄新增成功',
      participantCount: activityData.participants.length,
      sheetWritten: !!sheetResult,
      firestoreWritten: !!firestoreResult
    });

  } catch (error) {
    console.error('新增活動紀錄錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 取得活動列表 (從 Firestore)
app.get('/api/activities', async (req, res) => {
  try {
    if (!db) {
      // 測試模式：返回範例資料
      const testActivities = [
        {
          id: 'test-1',
          date: '2024-12-01',
          purpose: '提升認知功能',
          topic: '懷舊歌曲欣賞',
          participants: [
            { name: '王阿姨', focus: 4, interaction: 5, attention: 3, notes: '很投入活動' },
            { name: '李伯伯', focus: 3, interaction: 4, attention: 4, notes: '' },
            { name: '陳奶奶', focus: 5, interaction: 3, attention: 2, notes: '注意力較不集中' }
          ],
          photos: ['/uploads/sample1.jpg', '/uploads/sample2.jpg'],
          special: '王阿姨特別投入',
          discussion: '大家都很喜歡這個活動',
          createdAt: new Date()
        },
        {
          id: 'test-2',
          date: '2024-12-02',
          purpose: '促進社交互動',
          topic: '手工藝製作',
          participants: [
            { name: '張先生', focus: 3, interaction: 4, attention: 4, notes: '作品完成度高' },
            { name: '劉太太', focus: 4, interaction: 5, attention: 3, notes: '很有創意' },
            { name: '吳阿公', focus: 2, interaction: 3, attention: 3, notes: '需要較多協助' }
          ],
          photos: ['/uploads/sample3.jpg'],
          special: '',
          discussion: '作品完成度很高',
          createdAt: new Date()
        }
      ];
      return res.json(testActivities);
    }

    const snapshot = await db.collection('activities')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const activities = [];
    snapshot.forEach(doc => {
      activities.push({
        id: doc.id,
        ...doc.data()
      });
    });

    res.json(activities);
  } catch (error) {
    console.error('取得活動列表錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 取得統計資料
app.get('/api/stats', async (req, res) => {
  try {
    if (!db) {
      // 測試模式：返回範例統計資料
      const testStats = [
        {
          month: '2024-12',
          count: 2,
          participantCount: 6,
          avgFocus: '3.83',
          avgInteraction: '4.33',
          avgAttention: '3.17'
        },
        {
          month: '2024-11',
          count: 3,
          participantCount: 8,
          avgFocus: '3.75',
          avgInteraction: '4.25',
          avgAttention: '3.63'
        }
      ];
      return res.json(testStats);
    }

    const snapshot = await db.collection('activities').get();
    const activities = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.date && (data.participants || (data.focus && data.interaction && data.attention))) {
        activities.push(data);
      }
    });

    // 按月份統計
    const monthlyStats = {};
    activities.forEach(activity => {
      const month = activity.date.substring(0, 7); // YYYY-MM
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          count: 0,
          participantCount: 0,
          totalFocus: 0,
          totalInteraction: 0,
          totalAttention: 0
        };
      }

      monthlyStats[month].count++;

      if (activity.participants) {
        // 新格式：個別參與者資料
        monthlyStats[month].participantCount += activity.participants.length;
        activity.participants.forEach(participant => {
          monthlyStats[month].totalFocus += parseInt(participant.focus);
          monthlyStats[month].totalInteraction += parseInt(participant.interaction);
          monthlyStats[month].totalAttention += parseInt(participant.attention);
        });
      } else {
        // 舊格式：群組評分
        monthlyStats[month].participantCount += 1;
        monthlyStats[month].totalFocus += parseInt(activity.focus);
        monthlyStats[month].totalInteraction += parseInt(activity.interaction);
        monthlyStats[month].totalAttention += parseInt(activity.attention);
      }
    });

    // 計算平均分數
    const stats = Object.keys(monthlyStats).map(month => ({
      month,
      count: monthlyStats[month].count,
      participantCount: monthlyStats[month].participantCount,
      avgFocus: monthlyStats[month].participantCount > 0 ? (monthlyStats[month].totalFocus / monthlyStats[month].participantCount).toFixed(2) : '0.00',
      avgInteraction: monthlyStats[month].participantCount > 0 ? (monthlyStats[month].totalInteraction / monthlyStats[month].participantCount).toFixed(2) : '0.00',
      avgAttention: monthlyStats[month].participantCount > 0 ? (monthlyStats[month].totalAttention / monthlyStats[month].participantCount).toFixed(2) : '0.00'
    })).sort((a, b) => b.month.localeCompare(a.month));

    res.json(stats);
  } catch (error) {
    console.error('取得統計資料錯誤:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 取得長者名單（從 Google Sheets）
app.get('/api/elders', async (req, res) => {
  try {
    if (!auth) {
      // 測試模式：返回範例長者名單
      const testElders = [
        { id: 1, name: '吳王素香' },
        { id: 2, name: '彭李瑞月' },
        { id: 3, name: '賴葉玉美' },
        { id: 4, name: '黃張美' },
        { id: 5, name: '曹阿明' },
        { id: 6, name: '黃陳阿雪' },
        { id: 7, name: '黃素蘭' },
        { id: 8, name: '李季錦' },
        { id: 9, name: '溫素花' },
        { id: 10, name: '郭田水' },
        { id: 11, name: '張薇芳' },
        { id: 12, name: '羅林美惠' },
        { id: 13, name: '游吳阿守' },
        { id: 14, name: '陳羅素玉' },
        { id: 15, name: '吳阿塗' },
        { id: 16, name: '楊美麗' },
        { id: 17, name: '王諶梅子' },
        { id: 18, name: '吳麗紅' },
        { id: 19, name: '林明珠' },
        { id: 20, name: '林維新' },
        { id: 21, name: '游進煌' }
      ];
      return res.json(testElders);
    }

    // 正式模式：從 Google Sheets 讀取長者名單
    const authClient = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: '長者名單!A:A', // 假設長者名單在第一個工作表的 A 欄
      auth: authClient,
    });

    const rows = response.data.values || [];
    // 跳過標題列，轉換成物件格式
    const elders = rows.slice(1).map((row, index) => ({
      id: index + 1,
      name: row[0] || ''
    })).filter(elder => elder.name.trim() !== '');

    res.json(elders);
  } catch (error) {
    console.error('取得長者名單錯誤:', error);
    res.status(500).json({ error: '無法取得長者名單' });
  }
});

// 別名路由 - 相容前端 /api/sheets-elders 呼叫
app.get('/api/sheets-elders', async (req, res) => {
  try {
    if (!auth) {
      // 測試模式：返回範例長者名單
      const testElders = [
        { id: 'E1', name: '吳王素香', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E2', name: '彭李瑞月', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E3', name: '賴葉玉美', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E4', name: '黃張美', level: 'B', levelDesc: '中度', scoreRange: '3-4', notes: '' },
        { id: 'E5', name: '曹阿明', level: 'B', levelDesc: '中度', scoreRange: '3-4', notes: '需多關注' },
        { id: 'E6', name: '黃陳阿雪', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E7', name: '黃素蘭', level: 'B', levelDesc: '中度', scoreRange: '3-4', notes: '' },
        { id: 'E8', name: '李季錦', level: 'B', levelDesc: '中度', scoreRange: '3-4', notes: '' },
        { id: 'E9', name: '溫素花', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E10', name: '郭田水', level: 'B', levelDesc: '中度', scoreRange: '3-4', notes: '' },
        { id: 'E11', name: '張薇芳', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E12', name: '羅林美惠', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E13', name: '游吳阿守', level: 'C', levelDesc: '重度', scoreRange: '2-3', notes: '需較多協助' },
        { id: 'E14', name: '陳羅素玉', level: 'B', levelDesc: '中度', scoreRange: '3-4', notes: '' },
        { id: 'E15', name: '吳阿塗', level: 'B', levelDesc: '中度', scoreRange: '3-4', notes: '' },
        { id: 'E16', name: '楊美麗', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E17', name: '王諶梅子', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E18', name: '吳麗紅', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' },
        { id: 'E19', name: '林明珠', level: 'B', levelDesc: '中度', scoreRange: '3-4', notes: '' },
        { id: 'E20', name: '林維新', level: 'B', levelDesc: '中度', scoreRange: '3-4', notes: '' },
        { id: 'E21', name: '游進煌', level: 'A', levelDesc: '輕度', scoreRange: '4-5', notes: '' }
      ];
      return res.json(testElders);
    }

    // 正式模式：從 Google Sheets 讀取長者名單
    const authClient = await auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: '長者名單!A:E',
      auth: authClient,
    });

    const rows = response.data.values || [];
    const elders = rows.slice(1).map((row, index) => ({
      id: `E${index + 1}`,
      name: row[0] || '',
      level: row[1] || 'A',
      levelDesc: row[2] || '',
      scoreRange: row[3] || '',
      notes: row[4] || ''
    })).filter(elder => elder.name.trim() !== '');

    res.json(elders);
  } catch (error) {
    console.error('取得長者名單錯誤:', error);
    res.status(500).json({ error: '無法取得長者名單' });
  }
});

// 取得季度統計報表
app.get('/api/stats/quarterly', async (req, res) => {
  try {
    const { year, quarter } = req.query;
    const currentYear = year || new Date().getFullYear();
    const currentQuarter = quarter || Math.ceil((new Date().getMonth() + 1) / 3);

    // 計算季度的月份範圍
    const startMonth = (currentQuarter - 1) * 3 + 1;
    const endMonth = currentQuarter * 3;
    const startDate = `${currentYear}-${String(startMonth).padStart(2, '0')}-01`;
    const endDate = `${currentYear}-${String(endMonth).padStart(2, '0')}-31`;

    if (!db) {
      // 測試模式：返回範例季度統計資料
      const testQuarterlyStats = {
        year: currentYear,
        quarter: currentQuarter,
        period: `${currentYear} Q${currentQuarter}`,
        totalActivities: 24,
        elders: [
          { id: 1, name: '吳王素香', participationCount: 12, avgFocus: 4.2, avgInteraction: 4.5, avgAttention: 3.8, trend: 'up' },
          { id: 2, name: '彭李瑞月', participationCount: 10, avgFocus: 3.5, avgInteraction: 3.8, avgAttention: 3.2, trend: 'stable' },
          { id: 3, name: '賴葉玉美', participationCount: 11, avgFocus: 4.0, avgInteraction: 4.2, avgAttention: 3.5, trend: 'up' },
          { id: 4, name: '黃張美', participationCount: 8, avgFocus: 3.2, avgInteraction: 3.5, avgAttention: 3.0, trend: 'stable' },
          { id: 5, name: '曹阿明', participationCount: 8, avgFocus: 2.8, avgInteraction: 3.0, avgAttention: 2.5, trend: 'down', needsAttention: true },
          { id: 6, name: '黃陳阿雪', participationCount: 9, avgFocus: 3.8, avgInteraction: 4.0, avgAttention: 3.5, trend: 'up' },
          { id: 7, name: '黃素蘭', participationCount: 7, avgFocus: 3.5, avgInteraction: 3.2, avgAttention: 3.0, trend: 'stable' },
          { id: 8, name: '李季錦', participationCount: 6, avgFocus: 3.0, avgInteraction: 3.5, avgAttention: 2.8, trend: 'down', needsAttention: true }
        ]
      };
      return res.json(testQuarterlyStats);
    }

    // 正式模式：從 Firestore 取得資料
    const snapshot = await db.collection('activities')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    const elderStats = {};
    let totalActivities = 0;

    snapshot.forEach(doc => {
      const activity = doc.data();
      totalActivities++;

      if (activity.participants) {
        activity.participants.forEach(p => {
          const key = p.name;
          if (!elderStats[key]) {
            elderStats[key] = {
              name: p.name,
              participationCount: 0,
              totalFocus: 0,
              totalInteraction: 0,
              totalAttention: 0
            };
          }
          elderStats[key].participationCount++;
          elderStats[key].totalFocus += parseInt(p.focus) || 0;
          elderStats[key].totalInteraction += parseInt(p.interaction) || 0;
          elderStats[key].totalAttention += parseInt(p.attention) || 0;
        });
      }
    });

    const elders = Object.values(elderStats).map((elder, index) => ({
      id: index + 1,
      name: elder.name,
      participationCount: elder.participationCount,
      avgFocus: (elder.totalFocus / elder.participationCount).toFixed(1),
      avgInteraction: (elder.totalInteraction / elder.participationCount).toFixed(1),
      avgAttention: (elder.totalAttention / elder.participationCount).toFixed(1),
      trend: 'stable',
      needsAttention: (elder.totalFocus / elder.participationCount) < 3 ||
        (elder.totalAttention / elder.participationCount) < 3
    }));

    res.json({
      year: currentYear,
      quarter: currentQuarter,
      period: `${currentYear} Q${currentQuarter}`,
      totalActivities,
      elders
    });
  } catch (error) {
    console.error('取得季度統計錯誤:', error);
    res.status(500).json({ error: '無法取得季度統計' });
  }
});

// 取得單一長者歷史趨勢
app.get('/api/stats/elder/:name', async (req, res) => {
  try {
    const elderName = decodeURIComponent(req.params.name);

    if (!db) {
      // 測試模式：返回範例個人趨勢資料
      const testElderStats = {
        name: elderName,
        quarters: [
          { period: '2024-Q1', avgFocus: 3.2, avgInteraction: 3.5, avgAttention: 3.0, participationCount: 10 },
          { period: '2024-Q2', avgFocus: 3.5, avgInteraction: 3.8, avgAttention: 3.2, participationCount: 11 },
          { period: '2024-Q3', avgFocus: 3.8, avgInteraction: 4.0, avgAttention: 3.5, participationCount: 12 },
          { period: '2024-Q4', avgFocus: 4.2, avgInteraction: 4.5, avgAttention: 3.8, participationCount: 12 }
        ],
        overallTrend: 'up',
        recentNotes: [
          { date: '2024-12-15', note: '今日表現特別投入' },
          { date: '2024-12-10', note: '與其他長者互動良好' }
        ]
      };
      return res.json(testElderStats);
    }

    // 正式模式：從 Firestore 取得歷史資料
    const snapshot = await db.collection('activities')
      .orderBy('date', 'asc')
      .get();

    const quarterlyData = {};
    const recentNotes = [];

    snapshot.forEach(doc => {
      const activity = doc.data();
      if (activity.participants) {
        const participant = activity.participants.find(p => p.name === elderName);
        if (participant) {
          const date = activity.date;
          const quarter = `${date.substring(0, 4)}-Q${Math.ceil(parseInt(date.substring(5, 7)) / 3)}`;

          if (!quarterlyData[quarter]) {
            quarterlyData[quarter] = {
              totalFocus: 0,
              totalInteraction: 0,
              totalAttention: 0,
              count: 0
            };
          }
          quarterlyData[quarter].totalFocus += parseInt(participant.focus) || 0;
          quarterlyData[quarter].totalInteraction += parseInt(participant.interaction) || 0;
          quarterlyData[quarter].totalAttention += parseInt(participant.attention) || 0;
          quarterlyData[quarter].count++;

          if (participant.notes) {
            recentNotes.push({ date: activity.date, note: participant.notes });
          }
        }
      }
    });

    const quarters = Object.entries(quarterlyData).map(([period, data]) => ({
      period,
      avgFocus: (data.totalFocus / data.count).toFixed(1),
      avgInteraction: (data.totalInteraction / data.count).toFixed(1),
      avgAttention: (data.totalAttention / data.count).toFixed(1),
      participationCount: data.count
    }));

    res.json({
      name: elderName,
      quarters,
      overallTrend: 'stable',
      recentNotes: recentNotes.slice(-5)
    });
  } catch (error) {
    console.error('取得長者趨勢錯誤:', error);
    res.status(500).json({ error: '無法取得長者趨勢' });
  }
});

// ========== 會議記錄 API ==========

// 測試用會議資料
let testMeetings = [
  {
    id: 'meeting_001',
    date: '2024-12-15',
    quarter: '2024-Q4',
    title: '2024 Q4 季度檢討會議',
    attendees: ['主任', '社工', '照服員'],
    discussions: [
      { elderId: 5, elderName: '曹阿明', issue: '注意力持續下降', suggestion: '調整座位至前排' },
      { elderId: 8, elderName: '李季錦', issue: '參與度降低', suggestion: '安排其偏好的手作活動' }
    ],
    decisions: [
      { id: 1, content: '下季增加手作類活動（每月至少2次）', assignee: '社工', status: 'pending' },
      { id: 2, content: '曹阿明安排前排座位', assignee: '照服員', status: 'completed' }
    ],
    createdAt: new Date('2024-12-15')
  }
];

// 取得會議列表
app.get('/api/meetings', async (req, res) => {
  try {
    if (!db) {
      return res.json(testMeetings);
    }
    const snapshot = await db.collection('meetings').orderBy('date', 'desc').get();
    const meetings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(meetings);
  } catch (error) {
    console.error('取得會議列表錯誤:', error);
    res.status(500).json({ error: '無法取得會議列表' });
  }
});

// 取得單一會議
app.get('/api/meetings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!db) {
      const meeting = testMeetings.find(m => m.id === id);
      return meeting ? res.json(meeting) : res.status(404).json({ error: '會議不存在' });
    }
    const doc = await db.collection('meetings').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: '會議不存在' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('取得會議錯誤:', error);
    res.status(500).json({ error: '無法取得會議' });
  }
});

// 新增會議
app.post('/api/meetings', async (req, res) => {
  try {
    const meetingData = {
      ...req.body,
      createdAt: new Date()
    };
    if (!db) {
      meetingData.id = `meeting_${Date.now()}`;
      testMeetings.unshift(meetingData);
      return res.json({ success: true, id: meetingData.id });
    }
    const docRef = await db.collection('meetings').add(meetingData);
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('新增會議錯誤:', error);
    res.status(500).json({ error: '無法新增會議' });
  }
});

// 更新會議決議狀態
app.put('/api/meetings/:id/decisions/:decisionId', async (req, res) => {
  try {
    const { id, decisionId } = req.params;
    const { status } = req.body;
    if (!db) {
      const meeting = testMeetings.find(m => m.id === id);
      if (meeting) {
        const decision = meeting.decisions.find(d => d.id === parseInt(decisionId));
        if (decision) decision.status = status;
      }
      return res.json({ success: true });
    }
    // Firestore 更新邏輯...
    res.json({ success: true });
  } catch (error) {
    console.error('更新決議狀態錯誤:', error);
    res.status(500).json({ error: '無法更新決議狀態' });
  }
});

// ========== 活動規劃 API ==========

let testPlans = [
  {
    id: 'plan_2025Q1',
    quarter: '2025-Q1',
    title: '2025 第一季活動規劃',
    activities: [
      { month: 1, topic: '新春活動', count: 2, notes: '包含圍爐活動' },
      { month: 1, topic: '懷舊歌曲', count: 2, notes: '' },
      { month: 2, topic: '手工藝製作', count: 3, notes: '配合元宵節主題' },
      { month: 2, topic: '認知訓練', count: 2, notes: '' },
      { month: 3, topic: '園藝活動', count: 2, notes: '春季種植' },
      { month: 3, topic: '音樂律動', count: 2, notes: '' }
    ],
    specialNotes: [
      { elderId: 5, elderName: '曹阿明', note: '安排前排座位', fromMeeting: 'meeting_001' },
      { elderName: '全體', note: '增加手作類活動頻率', fromMeeting: 'meeting_001' }
    ],
    createdAt: new Date()
  }
];

// 取得活動規劃列表
app.get('/api/plans', async (req, res) => {
  try {
    if (!db) {
      return res.json(testPlans);
    }
    const snapshot = await db.collection('plans').orderBy('quarter', 'desc').get();
    const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(plans);
  } catch (error) {
    console.error('取得規劃列表錯誤:', error);
    res.status(500).json({ error: '無法取得規劃列表' });
  }
});

// 取得單一規劃
app.get('/api/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!db) {
      const plan = testPlans.find(p => p.id === id);
      return plan ? res.json(plan) : res.status(404).json({ error: '規劃不存在' });
    }
    const doc = await db.collection('plans').doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: '規劃不存在' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('取得規劃錯誤:', error);
    res.status(500).json({ error: '無法取得規劃' });
  }
});

// 新增/更新活動規劃
app.post('/api/plans', async (req, res) => {
  try {
    const planData = {
      ...req.body,
      updatedAt: new Date()
    };
    if (!db) {
      const existingIdx = testPlans.findIndex(p => p.quarter === planData.quarter);
      if (existingIdx >= 0) {
        testPlans[existingIdx] = { ...testPlans[existingIdx], ...planData };
      } else {
        planData.id = `plan_${planData.quarter}`;
        planData.createdAt = new Date();
        testPlans.unshift(planData);
      }
      return res.json({ success: true, id: planData.id || planData.quarter });
    }
    const docRef = await db.collection('plans').add(planData);
    res.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error('儲存規劃錯誤:', error);
    res.status(500).json({ error: '無法儲存規劃' });
  }
});

// ========== 收費紀錄 API ==========

// 測試用收費資料
let testFeeRecords = {};

// 寫入收費紀錄到 Google Sheet
async function writeFeeToGoogleSheet(feeData) {
  try {
    if (!auth) return null;
    const authClient = await auth.getClient();
    const values = [];

    // 為每位參與者建立一行資料
    (feeData.participants || []).forEach(p => {
      if (!p.attended) return;
      values.push([
        feeData.date,
        p.name,
        p.attended ? '是' : '',
        p.pickupAM ? '是' : '',
        p.pickupPM ? '是' : '',
        p.lunch ? '是' : '',
        p.caregiverAM ? '是' : '',
        p.caregiverPM ? '是' : '',
        p.caregiverLunch ? '是' : '',
      ]);
    });

    if (values.length === 0) return null;

    const request = {
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: '收費紀錄!A:I',
      valueInputOption: 'RAW',
      auth: authClient,
      resource: { values },
    };

    const response = await sheets.spreadsheets.values.append(request);
    console.log('成功寫入收費紀錄到 Google Sheet');
    return response;
  } catch (error) {
    console.error('寫入收費紀錄失敗:', error);
    return null;
  }
}

// 儲存收費紀錄
app.post('/api/fee-records', async (req, res) => {
  try {
    const feeData = req.body;
    const { date, participants, lunchOrders, stats } = feeData;

    if (!date) {
      return res.status(400).json({ error: '缺少日期' });
    }

    // 儲存到 Firestore
    if (db) {
      await db.collection('feeRecords').doc(date).set({
        date,
        participants,
        lunchOrders,
        stats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // 同步到 Google Sheets
    await writeFeeToGoogleSheet(feeData);

    // 測試模式備份
    testFeeRecords[date] = feeData;

    res.json({ success: true, message: '收費紀錄已儲存' });
  } catch (error) {
    console.error('儲存收費紀錄錯誤:', error);
    res.status(500).json({ error: '無法儲存收費紀錄' });
  }
});

// 取得單日收費紀錄
app.get('/api/fee-records/:date', async (req, res) => {
  try {
    const { date } = req.params;

    if (db) {
      const doc = await db.collection('feeRecords').doc(date).get();
      if (doc.exists) {
        return res.json(doc.data());
      }
    }

    // 測試模式
    if (testFeeRecords[date]) {
      return res.json(testFeeRecords[date]);
    }

    res.json(null);
  } catch (error) {
    console.error('取得收費紀錄錯誤:', error);
    res.status(500).json({ error: '無法取得收費紀錄' });
  }
});

// 取得月份收費紀錄列表
app.get('/api/fee-records', async (req, res) => {
  try {
    const { year, month } = req.query;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;

    if (db) {
      const snapshot = await db.collection('feeRecords')
        .where('date', '>=', `${prefix}-01`)
        .where('date', '<=', `${prefix}-31`)
        .orderBy('date', 'asc')
        .get();

      const records = snapshot.docs.map(doc => doc.data());
      return res.json(records);
    }

    // 測試模式
    const records = Object.values(testFeeRecords)
      .filter(r => r.date && r.date.startsWith(prefix))
      .sort((a, b) => a.date.localeCompare(b.date));
    res.json(records);
  } catch (error) {
    console.error('取得月份收費紀錄錯誤:', error);
    res.status(500).json({ error: '無法取得月份收費紀錄' });
  }
});

// 健康檢查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 初始化並啟動伺服器
async function startServer() {
  await initializeFirebase();
  await initializeGoogleSheets();

  app.listen(port, '0.0.0.0', () => {
    console.log(`伺服器運行於 http://localhost:${port}`);
    console.log(`區域網路存取： http://0.0.0.0:${port}`);

    // 嘗試顯示實際IP位址
    const os = require('os');
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const interface of interfaces[name]) {
        if (interface.family === 'IPv4' && !interface.internal) {
          console.log(`其他裝置可透過此網址存取： http://${interface.address}:${port}`);
        }
      }
    }
  });
}

startServer().catch(console.error);
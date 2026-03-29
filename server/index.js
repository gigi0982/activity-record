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
    const photoUrls = uploadedFiles.map(file => `/uploads/${file.filename}`);
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
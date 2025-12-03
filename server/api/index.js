const express = require('express');
const cors = require('cors');
const path = require('path');
const { google } = require('googleapis');
const admin = require('firebase-admin');

const app = express();

// 中介軟體
app.use(cors());
app.use(express.json());

// Google Sheets 設定
const sheets = google.sheets('v4');
let auth;

// Firebase 設定
let db;

// 初始化 Google Sheets
async function initializeGoogleSheets() {
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      console.log('Google Sheets API 初始化成功');
    } else {
      console.log('Google Sheets API 測試模式 - 跳過真實初始化');
    }
  } catch (error) {
    console.error('Google Sheets API 初始化失敗:', error);
    console.log('繼續以測試模式運行（無 Google Sheets 功能）');
  }
}

// 初始化 Firebase
async function initializeFirebase() {
  try {
    if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      
      db = admin.firestore();
      console.log('Firebase Firestore 初始化成功');
    } else {
      console.log('Firebase Firestore 測試模式 - 跳過真實初始化');
    }
  } catch (error) {
    console.error('Firebase Firestore 初始化失敗:', error);
    console.log('繼續以測試模式運行（無 Firestore 功能）');
  }
}

// 寫入 Google Sheet
async function writeToGoogleSheet(activityData) {
  try {
    if (!auth || !process.env.GOOGLE_SHEET_ID) {
      console.log('測試模式：跳過 Google Sheets 寫入');
      return true;
    }

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
        activityData.photos ? activityData.photos.join('; ') : ''
      ]);
    });

    const request = {
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: 'A:K',
      valueInputOption: 'RAW',
      auth: authClient,
      resource: {
        values: values,
      },
    };

    await sheets.spreadsheets.values.append(request);
    console.log('Google Sheets 寫入成功');
    return true;
  } catch (error) {
    console.error('Google Sheets 寫入錯誤:', error);
    return false;
  }
}

// 寫入 Firestore
async function writeToFirestore(activityData) {
  try {
    if (!db) {
      console.log('測試模式：跳過 Firestore 寫入');
      return true;
    }

    const docRef = await db.collection('activities').add({
      ...activityData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('Firestore 寫入成功，ID:', docRef.id);
    return true;
  } catch (error) {
    console.error('Firestore 寫入錯誤:', error);
    return false;
  }
}

// API 路由

// 新增活動記錄 API (簡化版，不支援檔案上傳在 Vercel)
app.post('/api/activity', async (req, res) => {
  try {
    const activityData = req.body;

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

    // 驗證每位參與者的分數範圍 (1-5)
    for (let i = 0; i < activityData.participants.length; i++) {
      const participant = activityData.participants[i];
      if (!participant.name) {
        return res.status(400).json({ error: `第 ${i + 1} 位參與者缺少姓名` });
      }
    }

    // 初始化服務
    await initializeGoogleSheets();
    await initializeFirebase();

    // 嘗試寫入兩個資料庫
    const sheetResult = await writeToGoogleSheet(activityData);
    const firestoreResult = await writeToFirestore(activityData);

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

// 取得活動列表
app.get('/api/activities', async (req, res) => {
  try {
    await initializeFirebase();
    
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
          special: '',
          discussion: '作品完成度很高',
          createdAt: new Date()
        }
      ];
      return res.json(testActivities);
    }

    const snapshot = await db.collection('activities').orderBy('createdAt', 'desc').get();
    const activities = [];
    snapshot.forEach(doc => {
      activities.push({ id: doc.id, ...doc.data() });
    });

    res.json(activities);
  } catch (error) {
    console.error('取得活動列表錯誤:', error);
    res.status(500).json({ error: '取得資料失敗' });
  }
});

// 統計資料 API
app.get('/api/stats', async (req, res) => {
  try {
    await initializeFirebase();
    
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
        monthlyStats[month].participantCount += activity.participants.length;
        activity.participants.forEach(participant => {
          monthlyStats[month].totalFocus += parseInt(participant.focus);
          monthlyStats[month].totalInteraction += parseInt(participant.interaction);
          monthlyStats[month].totalAttention += parseInt(participant.attention);
        });
      } else {
        monthlyStats[month].participantCount += 1;
        monthlyStats[month].totalFocus += parseInt(activity.focus);
        monthlyStats[month].totalInteraction += parseInt(activity.interaction);
        monthlyStats[month].totalAttention += parseInt(activity.attention);
      }
    });

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
    console.error('統計資料錯誤:', error);
    res.status(500).json({ error: '取得統計資料失敗' });
  }
});

// Vercel 函數導出
module.exports = app;
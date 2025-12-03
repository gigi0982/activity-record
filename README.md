# 失智據點活動紀錄系統

這是一個專為失智症照護據點設計的活動紀錄與分析系統，支援 Google Sheets 主資料庫與 Firebase Firestore 備援機制。

## 功能特色

### 活動紀錄
- 活動日期、目的、主題
- 參與成員記錄
- 表現評分（專注力、人際互動、注意力，1-5分制）
- 特殊狀況與後續討論記錄

### 數據儲存
- **主要儲存**：Google Sheets（方便匯出與分析）
- **備援儲存**：Firebase Firestore（確保資料不遺失）
- 自動容錯機制，任一儲存失敗時使用另一個

### 統計分析
- 每月活動表現統計
- 整體平均分數計算
- 視覺化評分展示
- 活動次數統計

## 專案架構

```
activity-record-system/
├── client/                 # React 前端
│   ├── public/
│   ├── src/
│   │   ├── components/     # React 元件
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                 # Node.js/Express 後端
│   ├── credentials/        # 服務金鑰檔案
│   ├── index.js           # 主伺服器
│   ├── .env.example       # 環境變數範本
│   └── package.json
└── README.md
```

## 安裝與設定

### 1. 前置要求
- Node.js 18+ 
- npm 或 yarn
- Google 帳號（用於 Google Sheets API）
- Firebase 專案（用於 Firestore）

### 2. 後端設定

```bash
# 進入後端資料夾
cd server

# 安裝依賴
npm install

# 複製環境變數範本
cp .env.example .env
```

#### 設定 Google Sheets API
1. 前往 [Google Cloud Console](https://console.cloud.google.com)
2. 建立新專案或選擇現有專案
3. 啟用 Google Sheets API
4. 建立 Service Account 並下載金鑰檔案
5. 將金鑰檔案重新命名為 `google-service-account.json` 並放入 `credentials/` 資料夾
6. 建立一個 Google Sheet 並記錄其 ID（從網址中取得）
7. 將 Service Account 的 email 加入 Sheet 的編輯權限

#### 設定 Firebase Firestore
1. 前往 [Firebase Console](https://console.firebase.google.com)
2. 建立新專案或選擇現有專案
3. 啟用 Firestore 資料庫
4. 前往「專案設定」>「服務帳戶」
5. 點選「產生新的私密金鑰」下載金鑰檔案
6. 將金鑰檔案重新命名為 `firebase-service-account.json` 並放入 `credentials/` 資料夾

#### 更新 .env 檔案
```env
PORT=5000
GOOGLE_SERVICE_ACCOUNT_KEY=./credentials/google-service-account.json
FIREBASE_SERVICE_ACCOUNT_KEY=./credentials/firebase-service-account.json
GOOGLE_SHEET_ID=你的Google_Sheet_ID
```

### 3. 前端設定

```bash
# 進入前端資料夾
cd client

# 安裝依賴
npm install
```

### 4. 啟動應用程式

#### 啟動後端伺服器
```bash
cd server
npm run dev  # 開發模式（使用 nodemon）
# 或
npm start    # 生產模式
```

#### 啟動前端應用
```bash
cd client
npm start
```

應用程式將在以下位址運行：
- 前端：http://localhost:3000
- 後端 API：http://localhost:5000

## 開發與貢獻

### 開發模式
```bash
# 後端開發
cd server
npm run dev

# 前端開發
cd client
npm start
```

### 程式碼結構
- **後端**：Express.js RESTful API，支援 Google Sheets 與 Firestore
- **前端**：React + React Router，Bootstrap 5 UI 框架
- **狀態管理**：使用 React Hooks（useState, useEffect）

## 授權

此專案採用 MIT 授權條款。
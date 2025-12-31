# Google Apps Script 更新指南

## 更新步驟

### 1. 開啟 Google Sheets
前往您的活動紀錄 Google Sheets 試算表

### 2. 進入 Apps Script
`擴充功能` → `Apps Script`

### 3. 更新程式碼
將 [Code.gs](file:///Users/dorisyang/Desktop/活動紀錄/google-apps-script/Code.gs) 的內容複製貼上，取代現有程式碼

### 4. 重新部署
1. 點擊右上角 `部署` → `管理部署`
2. 點擊編輯圖示 (✏️)
3. 版本選擇「新版本」
4. 點擊「部署」
5. 授權存取（如果有提示）

### 5. 初始化活動目的（可選）
執行 `initDefaultPurposes` 函數來建立預設的活動目的清單

---

## 新增的功能

| Action | 說明 |
|--------|------|
| `addPurpose` | 新增活動目的 |
| `deletePurpose` | 刪除活動目的 |

## 工作表結構

### 活動目的（自動建立）
| 欄位 | 說明 |
|------|------|
| 目的名稱 | 活動目的名稱 |
| 說明 | 選填說明文字 |
| 建立時間 | 自動記錄 |

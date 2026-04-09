# 據點長者名單初始化指南

## 目前各據點狀態（2026/04/01 檢查結果）

| 據點 | siteId | 長者人數 | 狀態 |
|------|--------|---------|------|
| 三星 | sanxing | 43 人 | ✅ 已建檔 |
| 羅東 | luodong | 0 人 | ❌ 未建檔（無長者名單工作表） |
| 冬瓜山 | dongguashan | 24 人 | ✅ 已建檔 |
| 礁溪 | jiaoxi | 48 人 | ✅ 已建檔 |

## ⚠️ 重要：需要先部署新版 Code.gs

目前線上跑的 GAS 是**舊版**（缺少個案編號、評估資料等欄位）。

請先將 `google-apps-script/Code.gs`（4000+ 行的新版）部署到 Google Apps Script。

## 操作步驟

### 步驟一：部署新版 Code.gs
1. 開啟任一據點的 Google Sheets
2. 擴充功能 → Apps Script
3. 將 `google-apps-script/Code.gs` 的完整內容複製貼上
4. 點擊「部署」→「管理部署作業」→ 編輯現有部署 → 選擇「新版本」→ 部署

### 步驟二：檢查所有據點
部署完成後，在瀏覽器中開啟：
```
https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec?action=checkElderSheets
```

或在 Apps Script 編輯器中，選擇函式 `checkAllSitesElderSheets` 然後點擊執行。

### 步驟三：初始化所有據點
在瀏覽器中開啟：
```
https://script.google.com/macros/s/YOUR_DEPLOY_ID/exec?action=initElderSheets
```

或在 Apps Script 編輯器中，選擇函式 `initAllSitesElderSheets` 然後點擊執行。

這會：
- 為**羅東**建立「長者名單」工作表（含完整 23 個欄位標題）
- 為**三星、冬瓜山、礁溪**檢查並補齊缺少的欄位標題（如個案編號、CDR 等）

### 步驟四：從前端新增長者
初始化後，可以從網站的「長者管理」頁面手動新增每位長者的基本資料。

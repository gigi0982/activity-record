# 雲端部署完整指南

## 步驟 1：在 GitHub 建立倉庫

1. 前往 [GitHub](https://github.com) 並登入您的帳號
2. 點擊右上角的「+」號，選擇「New repository」
3. 填寫倉庫資訊：
   - Repository name：`dementia-activity-recorder`（或您喜歡的名稱）
   - Description：失智據點活動紀錄系統
   - 選擇「Public」（免費用戶）或「Private」（付費用戶）
   - 不需要勾選「Add a README file」（我們已經有了）
4. 點擊「Create repository」

## 步驟 2：推送程式碼到 GitHub

在終端機執行以下命令（請替換您的 GitHub 用戶名和倉庫名）：

```bash
# 設定遠端倉庫（請替換 YOUR_USERNAME 和 REPOSITORY_NAME）
git remote add origin https://github.com/YOUR_USERNAME/REPOSITORY_NAME.git

# 推送到 GitHub
git branch -M main
git push -u origin main
```

## 步驟 3：在 Vercel 部署

1. 前往 [Vercel](https://vercel.com) 並用 GitHub 帳號登入
2. 點擊「New Project」
3. 選擇「Import Git Repository」
4. 找到您剛才建立的倉庫，點擊「Import」
5. 在部署設定頁面：
   - Framework Preset：會自動選擇「Create React App」
   - Root Directory：保持預設（./）
   - 其他設定保持預設
6. 點擊「Deploy」

## 步驟 4：設定環境變數

部署完成後，您需要設定環境變數：

1. 在 Vercel 專案頁面，點擊「Settings」
2. 點擊左側的「Environment Variables」
3. 添加以下環境變數：

### Google Sheets 環境變數
- Name：`GOOGLE_SHEET_ID`
- Value：您的 Google Sheet ID（從 URL 中取得）

- Name：`GOOGLE_SERVICE_ACCOUNT_KEY`
- Value：您的 Google 服務帳號 JSON 金鑰（整個 JSON 內容）

### Cloudinary 環境變數（照片上傳功能）
- Name：`CLOUDINARY_CLOUD_NAME`
- Value：您的 Cloudinary Cloud Name

- Name：`CLOUDINARY_API_KEY`
- Value：您的 Cloudinary API Key

- Name：`CLOUDINARY_API_SECRET`
- Value：您的 Cloudinary API Secret

**📸 Cloudinary 設定：** 詳細步驟請參考 `CLOUDINARY_SETUP.md` 檔案

### Firebase 環境變數（可選）
- Name：`FIREBASE_SERVICE_ACCOUNT_KEY`
- Value：您的 Firebase 服務帳號 JSON 金鑰

4. 點擊「Save」儲存每個環境變數

## 步驟 5：重新部署

設定環境變數後：
1. 回到「Deployments」頁籤
2. 點擊最新部署旁的三個點
3. 選擇「Redeploy」
4. 確認重新部署

## 步驟 6：取得網址並測試

1. 部署完成後，Vercel 會提供一個網址，格式如：
   `https://your-project-name.vercel.app`
2. 點擊網址測試應用程式
3. 這個網址可以分享給任何人使用！

## 後續使用

### 更新系統
當您需要更新程式碼時：
1. 在本地修改程式碼
2. 提交到 Git：`git add . && git commit -m "更新說明"`
3. 推送到 GitHub：`git push`
4. Vercel 會自動重新部署

### 自訂網域（可選）
如果您有自己的網域：
1. 在 Vercel 專案設定中選擇「Domains」
2. 添加您的網域
3. 按照指示設定 DNS

## 注意事項

1. **照片上傳功能**：使用 Cloudinary 雲端儲存，免費方案提供 25GB 儲存空間
2. **環境變數安全**：請確保不要在程式碼中直接放入 API 金鑰
3. **使用限制**：Vercel 免費方案有使用限制，大量使用時可能需要升級
4. **Cloudinary 設定**：詳細設定步驟請參考 `CLOUDINARY_SETUP.md`

## 故障排除

如果遇到問題：
1. 檢查 Vercel 的「Functions」頁面是否有錯誤日誌
2. 確認所有環境變數都正確設定
3. 檢查 Google Sheets 和 Firebase 的權限設定

完成後，您就擁有一個全球都能存取的活動紀錄系統了！🎉
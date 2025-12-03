# Cloudinary 照片上傳設定指南

## 📸 為什麼使用 Cloudinary？

Cloudinary 是專業的雲端圖片管理服務，提供：
- ✅ 免費方案（25GB 儲存空間，25,000 張圖片）
- ✅ 自動圖片優化和壓縮
- ✅ 全球 CDN 快速存取
- ✅ 適合 Vercel serverless 環境

## 🚀 設定步驟

### 第一步：註冊 Cloudinary 免費帳號

1. 前往 [Cloudinary](https://cloudinary.com) 
2. 點擊「Sign up for free」
3. 填寫基本資料並驗證信箱
4. 登入後進入儀表板 (Dashboard)

### 第二步：取得 API 憑證

在 Cloudinary 儀表板中找到以下資訊：

1. **Cloud Name** - 顯示在頁面上方
2. **API Key** - 在「Account Details」區域
3. **API Secret** - 在「Account Details」區域（點擊眼睛圖示顯示）

### 第三步：設定環境變數

在 Vercel 專案設定中添加以下環境變數：

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key_here  
CLOUDINARY_API_SECRET=your_api_secret_here
```

**注意：** 不要在程式碼中直接放入這些敏感資訊！

### 第四步：本地測試（可選）

如果要在本地測試，在 `server/.env` 檔案中添加：

```bash
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

## 📊 免費方案限制

Cloudinary 免費方案包含：
- **儲存空間**: 25 GB
- **每月頻寬**: 25 GB  
- **轉換**: 25,000 次/月
- **影片**: 支援基本功能

對於失智據點的使用量來說，完全足夠！

## 💡 使用建議

1. **圖片會自動優化** - 無需手動壓縮
2. **支援多種格式** - JPEG、PNG、GIF、WebP
3. **全球存取快速** - Cloudinary 的 CDN 覆蓋全球
4. **安全可靠** - 專業級的圖片儲存服務

## 🔧 故障排除

如果遇到問題：

1. **上傳失敗**：
   - 檢查環境變數是否正確設定
   - 確認圖片格式和大小符合限制

2. **圖片無法顯示**：
   - 檢查 Cloudinary URL 是否正確
   - 確認圖片確實上傳成功

3. **測試模式**：
   - 如果沒有設定 Cloudinary，系統會使用測試圖片
   - 功能正常但不會實際儲存照片

## ✅ 完成設定

設定完成後，您的活動紀錄系統就能：
- ✅ 上傳最多 4 張照片
- ✅ 自動儲存到雲端
- ✅ 在任何裝置上快速瀏覽
- ✅ 與 Google Sheets 整合記錄

準備好部署了嗎？執行 `./deploy.sh` 開始部署！🚀
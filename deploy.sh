#!/bin/bash
# 快速部署腳本

echo "🚀 失智據點活動紀錄系統 - 快速部署"
echo "=================================="

# 檢查 git 是否已初始化
if [ ! -d ".git" ]; then
    echo "❌ Git 尚未初始化，請先執行 git init"
    exit 1
fi

# 檢查是否有遠端倉庫
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "📝 請輸入您的 GitHub 倉庫 URL（例如：https://github.com/username/repo.git）："
    read REPO_URL
    git remote add origin "$REPO_URL"
    echo "✅ 遠端倉庫已設定"
fi

# 確認當前狀態
echo "📋 當前 Git 狀態："
git status --short

# 提交並推送
echo "💾 提交並推送程式碼到 GitHub..."
git add .
git commit -m "更新活動紀錄系統 - $(date '+%Y-%m-%d %H:%M')" || echo "ℹ️  沒有新的變更需要提交"
git push -u origin main

echo "✅ 程式碼已推送到 GitHub！"
echo ""
echo "🌐 接下來請到 Vercel 完成部署："
echo "1. 前往 https://vercel.com"
echo "2. 選擇您的 GitHub 倉庫"
echo "3. 設定環境變數"
echo "4. 完成部署"
echo ""
echo "📖 詳細步驟請參考 DEPLOYMENT.md 檔案"
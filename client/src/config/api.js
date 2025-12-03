// 根據環境自動選擇 API 基礎 URL
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // 在 Vercel 部署時使用相對路徑
  : 'http://localhost:3001'; // 本地開發時使用 localhost

export default API_BASE_URL;
// 根據環境自動選擇 API 基礎 URL
// 手機存取時會自動使用正確的 IP 位址
const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return ''; // 在 Vercel 部署時使用相對路徑
  }

  const hostname = window.location.hostname;

  // 如果透過 Ngrok 或其他隧道存取，使用相對路徑（會走 proxy）
  if (hostname.includes('ngrok') || hostname.includes('tunnel') ||
    (!hostname.includes('localhost') && !hostname.match(/^192\.168\.\d+\.\d+$/) && !hostname.match(/^10\.\d+\.\d+\.\d+$/))) {
    return ''; // 使用相對路徑，讓 React proxy 處理
  }

  // 開發環境：使用當前主機位址 + 後端端口
  return `http://${hostname}:3001`;
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
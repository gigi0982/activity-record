import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navigation() {
  const location = useLocation();

  // 根據路徑顯示頁面標題
  const getPageTitle = () => {
    const titles = {
      '/add': '新增活動',
      '/activities': '活動列表',
      '/settings': '系統設定',
      '/stats': '統計分析',
      '/quarterly': '季度報表',
      '/meetings': '會議紀錄',
      '/meetings/new': '新增會議',
      '/plans': '活動規劃',
      '/tracking': '執行追蹤',
      '/comparison': '季度比較',
      '/evaluation': '評鑑報告',
      '/fee': '收費登記',
      '/fee-settings': '收費設定',
      '/fee-report': '月結報表',
      '/fee-history': '歷史紀錄',
      '/quick': '快速登記',
      '/petty-cash': '零用金登記',
      '/work-hours': '助理工時',
      '/expense': '支出登記',
    };

    // 檢查是否匹配動態路由
    if (location.pathname.startsWith('/elder/')) return '長者檔案';
    if (location.pathname.startsWith('/fee-edit/')) return '編輯紀錄';
    if (location.pathname.startsWith('/elder-report/')) return '長者報告';
    if (location.pathname.startsWith('/meetings/') && location.pathname !== '/meetings/new') return '會議詳情';

    return titles[location.pathname] || '失智據點活動紀錄系統';
  };

  return (
    <nav style={{
      background: 'linear-gradient(135deg, #1976D2 0%, #1565c0 100%)',
      boxShadow: '0 4px 12px rgba(25, 118, 210, 0.25)',
      padding: '0',
    }}>
      <div className="container" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
      }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'white',
            textDecoration: 'none',
            padding: '8px 16px',
            borderRadius: '10px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.25)'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
        >
          <span style={{ fontSize: '1.2rem' }}>🏠</span>
          <span style={{ fontWeight: '500' }}>首頁</span>
        </Link>

        <span style={{
          color: 'white',
          fontWeight: '600',
          fontSize: '1.1rem',
          letterSpacing: '0.5px',
        }}>
          {getPageTitle()}
        </span>
      </div>
    </nav>
  );
}

export default Navigation;
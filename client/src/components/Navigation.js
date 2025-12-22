import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navigation() {
  const location = useLocation();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">
          失智據點活動紀錄系統
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="切換導航"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
                to="/"
              >
                活動列表
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === '/add' ? 'active' : ''}`}
                to="/add"
              >
                新增活動
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === '/quarterly' ? 'active' : ''}`}
                to="/quarterly"
              >
                📊 季度報表
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === '/meetings' ? 'active' : ''}`}
                to="/meetings"
              >
                📝 會議記錄
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${location.pathname === '/plans' ? 'active' : ''}`}
                to="/plans"
              >
                📅 活動規劃
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
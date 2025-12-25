import React from 'react';
import { Link } from 'react-router-dom';

function Navigation() {
  return (
    <nav className="navbar navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand" to="/">
          ← 返回首頁
        </Link>
        <span className="navbar-text text-white">
          失智據點活動紀錄系統
        </span>
      </div>
    </nav>
  );
}

export default Navigation;
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from './Button';

interface NavbarProps {
  onNavigate?: (page: string) => void; // 為了相容舊代碼保留，但我們主要用 Link
}

const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // 判斷當前連結是否活躍
  const isActive = (path: string) => location.pathname === path ? 'text-blue-600 font-bold' : 'text-gray-500 hover:text-gray-900';

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo 區域 */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-2xl font-bold text-gray-900">奧創髮藝</span>
              {user?.role === 'manager' && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">管理後台</span>}
              {user?.role === 'designer' && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">設計師</span>}
            </Link>
          </div>

          {/* 選單區域 (只有登入後顯示) */}
          {isAuthenticated && user && (
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8 items-center">
              
              {/* --- 主管選單 --- */}
              {user.role === 'manager' && (
                <>
                  <Link to="/manager" className={isActive('/manager')}>儀表板</Link>
                  <Link to="/manager/personnel" className={isActive('/manager/personnel')}>人員管理</Link>
                  <Link to="/manager/reports" className={isActive('/manager/reports')}>營收報表</Link>
                  <Link to="/manager/settings" className={isActive('/manager/settings')}>系統設定</Link>
                </>
              )}

              {/* --- 設計師選單 --- */}
              {user.role === 'designer' && (
                <>
                  <Link to="/designer" className={isActive('/designer')}>工作台</Link>
                  <Link to="/designer/schedule" className={isActive('/designer/schedule')}>我的班表</Link>
                  <Link to="/designer/portfolio" className={isActive('/designer/portfolio')}>作品集</Link>
                </>
              )}

              {/* --- 顧客選單 --- */}
              {user.role === 'customer' && (
                <>
                  <Link to="/customer" className={isActive('/customer')}>預約服務</Link>
                  <Link to="/customer/history" className={isActive('/customer/history')}>我的預約</Link>
                </>
              )}
            </div>
          )}

          {/* 右側按鈕 */}
          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">Hi, {user?.name}</span>
                <Button variant="outline" size="small" onClick={handleLogout}>
                  登出
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="small">登入</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
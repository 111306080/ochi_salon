import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from './Button';

interface NavbarProps {
  onNavigate?: (page: string) => void; 
}

const Navbar: React.FC<NavbarProps> = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --- 修改重點開始 ---
  const handleLogout = () => {
  // 1. 先決定要去哪
  const isStaff = user?.role === 'manager' || user?.role === 'designer';
  const targetPath = isStaff ? '/staff-login' : '/';

  // 2. ★ 關鍵修改：先執行導向！
  // 這樣我們會先跳轉到 targetPath (它是公開頁面，不會踢人)
  navigate(targetPath);

  // 3. 再執行登出
  // 使用 setTimeout 把登出動作延後一點點 (50毫秒)，確保路由已經切換過去了
  // 避免 React 的自動批次處理 (Batching) 導致 PrivateRoute 還是先抓到狀態變更
  setTimeout(() => {
    logout();
  }, 50);
};

  const isActive = (path: string) => location.pathname === path ? 'text-pink-600 font-bold' : 'text-gray-500 hover:text-gray-900';

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold">A</div>
              <span className="text-xl font-bold text-gray-900">奧創髮藝</span>
              {user?.role === 'manager' && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">管理後台</span>}
              {user?.role === 'designer' && <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">設計師</span>}
            </Link>
          </div>

          {isAuthenticated && user && (
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8 items-center">
              {user.role === 'manager' && (
                <>
                  <Link to="/manager" className={isActive('/manager')}>儀表板</Link>
                  <Link to="/manager/personnel" className={isActive('/manager/personnel')}>人員管理</Link>
                </>
              )}
              {user.role === 'designer' && (
                <>
                  <Link to="/designer" className={isActive('/designer')}>工作台</Link>
                  <Link to="/designer/portfolio" className={isActive('/designer/portfolio')}>個人資料與作品</Link>
                </>
              )}
              {user.role === 'customer' && (
                <>
                  <Link to="/customer" className={isActive('/customer')}>會員中心</Link>
                  <Link to="/customer/reservation" className={isActive('/customer/reservation')}>立即預約</Link>
                </>
              )}
            </div>
          )}

          <div className="flex items-center">
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500 hidden sm:block">Hi, {user?.name}</span>
                <Button variant="outline" size="small" onClick={handleLogout} className="border-gray-300 hover:bg-gray-50">
                  登出
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="primary" size="small" className="bg-pink-600 hover:bg-pink-700 border-none text-white shadow-sm">登入 / 註冊</Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { designerAPI, portfolioAPI } from './services/api';

// --- 引入頁面元件 ---
import CustomerAuth from './pages/CustomerAuth';
import StaffLogin from './pages/StaffLogin';
import Personnel from './pages/manager/Personnel';
import Portfolio from './pages/designer/Portfolio';
import Reservation from './pages/customer/Reservation';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import DesignerDashboard from './pages/designer/DesignerDashboard';
import CustomerAnalysis from './pages/manager/CustomerAnalysis';
import ServiceManagement from './pages/manager/ServiceManagement';
import SalesAnalysis from './pages/manager/SalesAnalysis';

// --- 引入共用元件 ---
import Navbar from './components/common/Navbar';
import Button from './components/common/Button';
import Card from './components/common/Card';
import Modal from './components/common/Modal';

// --- PrivateRoute (路由守衛) ---
const PrivateRoute = ({ children, roles }: { children: React.ReactNode; roles?: string[] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">載入中...</div>;
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// --- Landing Page (首頁) ---
const LandingPage = () => {
  const [designers, setDesigners] = useState<any[]>([]);
  const [selectedDesigner, setSelectedDesigner] = useState<any>(null);
  const [designerWorks, setDesignerWorks] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isWorkLoading, setIsWorkLoading] = useState(false);

  useEffect(() => {
    const fetchDesigners = async () => {
      try {
        const data = await designerAPI.getAll();
        setDesigners((data.designers || []).filter((d: any) => d.role === 'designer'));
      } catch (error) {
        console.error('無法載入設計師', error);
      }
    };
    fetchDesigners();
  }, []);

  const handleViewWorks = async (designer: any) => {
    setSelectedDesigner(designer);
    setIsModalOpen(true);
    setIsWorkLoading(true);
    try {
      const data = await portfolioAPI.getDesignerPortfolio(designer.designer_id);
      setDesignerWorks(data.portfolios || []);
    } catch (error) {
      console.error('無法載入作品', error);
      setDesignerWorks([]);
    } finally {
      setIsWorkLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* 導覽列 */}
      <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-white font-bold">A</div>
               <span className="text-2xl font-bold text-gray-900 tracking-tight">奧創髮藝</span>
            </div>
            <div className="flex space-x-4 items-center">
              <Link to="/login">
                <Button variant="primary" className="bg-pink-600 hover:bg-pink-700 text-white border-none shadow-md px-6 rounded-full">
                  會員登入 / 註冊
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-pink-50 via-white to-blue-50 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:max-w-2xl lg:w-full lg:pb-28 xl:pb-32 pt-20 px-4 sm:px-6 lg:px-8">
            <main className="mt-10 mx-auto max-w-7xl sm:mt-12 md:mt-16 lg:mt-20 xl:mt-28">
              <div className="sm:text-center lg:text-left">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block xl:inline">煥發您的自信光彩</span>{' '}
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600 xl:inline">專業髮藝設計</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl lg:mx-0">
                  我們匯聚頂尖設計師，為您打造專屬造型。從韓系燙髮到歐美挑染，立即線上預約，體驗不凡的造型時刻。
                </p>
                <div className="mt-8 sm:mt-10 sm:flex sm:justify-center lg:justify-start gap-4">
                  <Link to="/login">
                    <Button size="large" className="w-full sm:w-auto px-8 py-4 bg-pink-600 hover:bg-pink-700 shadow-xl shadow-pink-200 text-lg rounded-full border-none text-white">
                      立即預約
                    </Button>
                  </Link>
                  <Button variant="outline" size="large" className="w-full sm:w-auto px-8 py-4 rounded-full border-gray-300 hover:bg-gray-50 text-gray-600 bg-white">
                    了解更多
                  </Button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* 設計師團隊展示區 */}
      <div id="designers" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-base text-pink-600 font-semibold tracking-wide uppercase">Professional Team</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              遇見您的專屬設計師
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {designers.map((designer) => (
              <div key={designer.designer_id} className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
                <div className="aspect-w-1 aspect-h-1 bg-gray-200 relative overflow-hidden h-96">
                   <img 
                     src={designer.photo_url || "https://via.placeholder.com/400"} 
                     alt={designer.name}
                     className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-8">
                      <button 
                        onClick={() => handleViewWorks(designer)}
                        className="bg-white text-black px-8 py-3 rounded-full font-bold transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:bg-pink-50 shadow-lg"
                      >
                        查看作品集
                      </button>
                   </div>
                </div>
                <div className="p-6 flex-1 flex flex-col items-center text-center">
                  <h3 className="text-2xl font-bold text-gray-900 mb-1">{designer.name}</h3>
                  <p className="text-sm text-pink-600 font-medium mb-4 uppercase tracking-wider">資深設計師</p>
                  <p className="text-gray-500 text-sm line-clamp-3 mb-6 leading-relaxed">
                    {designer.style_description || "擅長日韓風格剪裁，為您打造最適合的髮型。"}
                  </p>
                  <div className="mt-auto w-full flex justify-center">
                     <Link to="/login" className="text-gray-900 font-bold hover:text-pink-600 flex items-center gap-2 group-hover:gap-3 transition-all">
                       立即預約 <span className="text-xl">→</span>
                     </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 作品集 Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedDesigner ? `${selectedDesigner.name} 的作品集` : '作品集'}
      >
        <div className="mt-2">
           {selectedDesigner && (
             <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <img 
                  src={selectedDesigner.photo_url || "https://via.placeholder.com/100"} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md"
                  alt="Avatar"
                />
                <div>
                   <h4 className="font-bold text-lg">{selectedDesigner.name}</h4>
                   <p className="text-sm text-gray-600 line-clamp-2">{selectedDesigner.style_description || "暫無簡介"}</p>
                </div>
             </div>
           )}

           {isWorkLoading ? (
             <div className="text-center py-10">載入中...</div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                {designerWorks.length > 0 ? (
                  designerWorks.map((work: any) => (
                    <div key={work.portfolio_id} className="relative group rounded-lg overflow-hidden cursor-pointer">
                       <img 
                         src={work.image_url} 
                         alt={work.description} 
                         className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110"
                       />
                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 text-center">
                          <div>
                            <span className="text-xs text-white bg-pink-600 px-2 py-1 rounded-full mb-1 inline-block">{work.style_tag}</span>
                          </div>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-10 text-gray-500 bg-gray-50 rounded-lg">這位設計師還沒有上傳作品喔！</div>
                )}
             </div>
           )}
           
           <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
             <Button variant="secondary" onClick={() => setIsModalOpen(false)}>關閉</Button>
             <Link to="/login">
                <Button className="bg-pink-600 hover:bg-pink-700 border-none text-white">預約此設計師</Button>
             </Link>
           </div>
        </div>
      </Modal>

      <footer className="bg-gray-900 text-white py-12 text-center">
        <div className="max-w-7xl mx-auto px-4">
           <p className="text-gray-400 text-sm">© 2025 奧創髮藝. All rights reserved.</p>
           <Link to="/staff-login" className="text-gray-600 hover:text-gray-400 text-xs mt-4 inline-block">員工專用入口</Link>
        </div>
      </footer>
    </div>
  );
};

// --- 主管儀表板首頁 ---
const ManagerDashboardHome = () => (
  <div className="max-w-7xl mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold text-gray-800 mb-6">營運總覽</h1>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <h3 className="text-xl font-bold mb-3">人員管理</h3>
        <p className="text-gray-600 mb-4">管理設計師與員工資料</p>
        <Link to="/manager/personnel">
          <Button className="w-full">管理人員</Button>
        </Link>
      </Card>
      <Card>
        <h3 className="text-xl font-bold mb-3">服務項目與價格總覽</h3>
        <p className="text-gray-600 mb-4">查看設計師服務項目與價格設定</p>
        <Link to="/manager/services">
           <Button className="w-full">檢視價格設定</Button>
        </Link>
      </Card>
      <Card>
        <h3 className="text-xl font-bold mb-3">顧客價值分析</h3>
        <p className="text-gray-600 mb-4">RFM 模型與分眾行銷</p>
        <Link to="/manager/analysis">
          <Button className="w-full">查看分析報表</Button>
        </Link>
      </Card>
      <Card>
        <h3 className="text-xl font-bold mb-3">營運報表</h3>
        <p className="text-gray-600 mb-4">銷售成長、留存與流失分析等</p>
        <Link to="/manager/sales">
           <Button className="w-full">查看報表</Button>
        </Link>
      </Card>
    </div>
  </div>
);

// --- 主程式 ---
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans">
          <Routes>
            {/* 1. 公開路由 */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<CustomerAuth />} />
            <Route path="/staff-login" element={<StaffLogin />} />

            {/* 2. 主管路由 */}
            <Route path="/manager" element={<PrivateRoute roles={['manager']}><Navbar /><ManagerDashboardHome /></PrivateRoute>} />
            <Route path="/manager/personnel" element={<PrivateRoute roles={['manager']}><Navbar /><Personnel /></PrivateRoute>} />
            <Route path="/manager/services" element={<PrivateRoute roles={['manager']}><Navbar /><ServiceManagement /></PrivateRoute>} />
            <Route path="/manager/analysis" element={<PrivateRoute roles={['manager']}><Navbar /><CustomerAnalysis /></PrivateRoute>} />
            <Route path="/manager/sales" element={<PrivateRoute roles={['manager']}><Navbar /><SalesAnalysis /></PrivateRoute>} />
            
            {/* 3. 設計師路由 */}
            <Route path="/designer" element={<PrivateRoute roles={['designer']}><Navbar /><DesignerDashboard /></PrivateRoute>} />
            <Route path="/designer/portfolio" element={<PrivateRoute roles={['designer']}><Navbar /><Portfolio /></PrivateRoute>} />

            {/* 4. 顧客路由 */}
            <Route path="/customer" element={<PrivateRoute roles={['customer']}><Navbar /><CustomerDashboard /></PrivateRoute>} />
            <Route path="/customer/reservation" element={<PrivateRoute roles={['customer']}><Navbar /><Reservation /></PrivateRoute>} />
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
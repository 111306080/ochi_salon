import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { reservationAPI } from '../../services/api';

const DesignerDashboard: React.FC = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReservations = async () => {
      try {
        const data = await reservationAPI.getDesignerReservations(); 
        setReservations(data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };
    loadReservations();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await reservationAPI.updateStatus(id, status);
      setReservations(prev => prev.map(r => 
        r.reservation_id === id ? { ...r, status } : r
      ));
    } catch (error) {
      alert('更新失敗');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const todaysReservations = reservations.filter(r => r.reserved_time.startsWith(todayStr) && r.status !== '已取消');
  const pendingReservations = reservations.filter(r => r.status === '待確認');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">設計師工作台</h1>
          <p className="text-gray-500">今日行程與預約管理</p>
        </div>
        <Link to="/designer/portfolio">
          <Button variant="outline">管理個人資料與作品</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左側：今日行程 */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              📅 今日行程 ({todaysReservations.length})
            </h2>
            
            <div className="space-y-4">
              {todaysReservations.length > 0 ? (
                todaysReservations.map(res => (
                  <div key={res.reservation_id} className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="font-bold text-blue-800 text-xl w-20 text-center">
                      {new Date(res.reserved_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div className="flex-1 px-4 border-l border-blue-200">
                      <h3 className="font-bold text-gray-900">{res.service_name}</h3>
                      <p className="text-sm text-gray-600">顧客：{res.customer_name}</p>
                      {res.notes && <p className="text-xs text-gray-500 mt-1">備註：{res.notes}</p>}
                    </div>
                    <div>
                      {res.status === '進行中' ? (
                        <Button size="small" onClick={() => handleStatusChange(res.reservation_id, '已完成')}>完成</Button>
                      ) : (
                        <span className="text-sm font-medium text-blue-600">{res.status}</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400">今日暫無預約，好好休息吧！</div>
              )}
            </div>
          </Card>
        </div>

        {/* 右側：待處理預約 */}
        <div>
          <Card className="h-full bg-yellow-50 border-yellow-100">
            <h2 className="text-lg font-bold text-yellow-800 mb-4 flex items-center">
              ⚡️ 待確認訂單 ({pendingReservations.length})
            </h2>
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {pendingReservations.map(res => (
                <div key={res.reservation_id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500">
                      {new Date(res.reserved_time).toLocaleDateString()} {new Date(res.reserved_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">新訂單</span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{res.service_name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{res.customer_name}</p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleStatusChange(res.reservation_id, '已取消')}
                      className="py-1 px-2 rounded text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200"
                    >
                      拒絕
                    </button>
                    <button 
                      onClick={() => handleStatusChange(res.reservation_id, '已確認')}
                      className="py-1 px-2 rounded text-xs font-medium text-white bg-green-600 hover:bg-green-700 shadow-sm"
                    >
                      接受
                    </button>
                  </div>
                </div>
              ))}
              
              {pendingReservations.length === 0 && (
                <p className="text-center text-yellow-600 text-sm py-4">目前沒有需要確認的訂單</p>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default DesignerDashboard;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { reservationAPI } from '../../services/api';
import ScheduleCalendar from '../designer/ScheduleCalendar';

// 定義一下後端回傳的資料介面 (這樣開發比較有提示)
interface Reservation {
  reservation_id: number;
  reserved_time: string; // "2023-11-27 14:00:00"
  status: string;
  final_price: number;
  notes: string;
  service_name: string;
  duration_min: number;
  customer_name: string;
  customer_phone: string;
}

const DesignerDashboard: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 載入資料
  const loadReservations = async () => {
    try {
      setIsLoading(true);
      const data = await reservationAPI.getDesignerReservations(); 
      setReservations(data);
    } catch (error) {
      console.error("無法取得預約:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReservations();
  }, []);

  const handleStatusChange = async (id: number, status: string) => {
    try {
      await reservationAPI.updateStatus(id, status);
      // 成功後更新本地狀態，讓畫面即時變更
      setReservations(prev => prev.map(r => 
        r.reservation_id === id ? { ...r, status } : r
      ));
      // 如果是「已取消」或「已完成」，也可以選擇重新撈取資料
      // loadReservations();
    } catch (error) {
      alert('更新失敗，請稍後再試');
    }
  };

  // [修正] 取得正確的當地時間 "YYYY-MM-DD"
  // toISOString() 是 UTC，會導致台灣早上時日期錯誤
  const getLocalDateString = (date: Date) => {
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - offset)).toISOString().slice(0, 10);
    return localISOTime;
  };

  const todayStr = getLocalDateString(new Date());

  // 篩選今日行程 (比對日期字串的前10碼)
  const todaysReservations = reservations.filter(r => {
    if (!r.reserved_time) return false;
    // 後端格式通常是 "YYYY-MM-DD HH:MM:SS" 或 ISO
    return r.reserved_time.startsWith(todayStr) && r.status !== '已取消';
  });

  const pendingReservations = reservations.filter(r => r.status === '待確認');

  if (isLoading) return <div className="p-8 text-center">載入行程中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">設計師工作台</h1>
          <p className="text-gray-500">今日行程與預約管理</p>
        </div>
        <div className="space-x-2">
          <Button variant="outline" onClick={loadReservations}>重新整理</Button>
          <Link to="/designer/portfolio">
            <Button variant="primary">管理個人資料與作品</Button>
          </Link>
        </div>
      </div>
      <ScheduleCalendar reservations={reservations} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 左側：今日行程 */}
        <div className="lg:col-span-2">
          <Card>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
              📅 今日行程 ({todaysReservations.length})
              <span className="ml-2 text-sm font-normal text-gray-500">({todayStr})</span>
            </h2>
            
            <div className="space-y-4">
              {todaysReservations.length > 0 ? (
                todaysReservations.map(res => (
                  <div key={res.reservation_id} className="flex flex-col sm:flex-row items-start sm:items-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                    {/* 時間區塊 */}
                    <div className="font-bold text-blue-800 text-xl w-20 text-center mb-2 sm:mb-0">
                      {new Date(res.reserved_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                    </div>
                    
                    {/* 資訊區塊 */}
                    <div className="flex-1 px-0 sm:px-4 border-l-0 sm:border-l border-blue-200 w-full">
                      <div className="flex justify-between">
                        <h3 className="font-bold text-gray-900">{res.service_name} <span className="text-xs text-gray-500">({res.duration_min}分鐘)</span></h3>
                        <span className="font-bold text-gray-700">${res.final_price}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-gray-800 font-medium">{res.customer_name}</p>
                        <a href={`tel:${res.customer_phone}`} className="text-xs text-blue-600 hover:underline">
                          📞 {res.customer_phone}
                        </a>
                      </div>
                      {res.notes && <p className="text-xs text-gray-500 mt-1 bg-white p-1 rounded">備註：{res.notes}</p>}
                    </div>
                    
                    {/* 按鈕區塊 */}
                    <div className="mt-2 sm:mt-0 w-full sm:w-auto text-right">
                      {res.status === '進行中' || res.status === '已確認' ? (
                        <Button size="small" onClick={() => handleStatusChange(res.reservation_id, '已完成')}>
                          完成訂單
                        </Button>
                      ) : (
                        <span className={`text-sm font-medium px-2 py-1 rounded ${
                          res.status === '已完成' ? 'bg-green-100 text-green-700' : 'text-blue-600'
                        }`}>
                          {res.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  今日暫無預約，好好休息吧！☕️
                </div>
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
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {pendingReservations.map(res => (
                <div key={res.reservation_id} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-gray-500 flex flex-col">
                      <span className="text-gray-900">{new Date(res.reserved_time).toLocaleDateString()}</span>
                      <span>{new Date(res.reserved_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                    </span>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full whitespace-nowrap">新訂單</span>
                  </div>
                  
                  <h4 className="font-bold text-gray-900 mb-1">{res.service_name}</h4>
                  <div className="text-sm text-gray-600 mb-2">
                    {res.customer_name} <br/>
                    <span className="text-xs text-gray-400">{res.customer_phone}</span>
                  </div>

                  {res.notes && (
                    <div className="text-xs text-gray-500 mb-3 bg-gray-50 p-2 rounded">
                      "{res.notes}"
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button 
                      onClick={() => handleStatusChange(res.reservation_id, '已取消')}
                      className="py-1.5 px-2 rounded text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-colors"
                    >
                      拒絕
                    </button>
                    <button 
                      onClick={() => handleStatusChange(res.reservation_id, '已確認')}
                      className="py-1.5 px-2 rounded text-xs font-medium text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors"
                    >
                      接受預約
                    </button>
                  </div>
                </div>
              ))}
              
              {pendingReservations.length === 0 && (
                <div className="text-center text-yellow-600 text-sm py-8 border-2 border-dashed border-yellow-200 rounded-lg">
                  目前沒有需要確認的訂單
                </div>
              )}
            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default DesignerDashboard;
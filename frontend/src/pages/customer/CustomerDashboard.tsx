import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { reservationAPI } from '../../services/api';

const CustomerDashboard: React.FC = () => {
  const [reservations, setReservations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReservations = async () => {
      try {
        const data = await reservationAPI.getMyReservations();
        setReservations(data);
      } catch (error) {
        console.error('載入預約失敗', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadReservations();
  }, []);

  // 分類預約
  const upcomingReservations = reservations.filter(
    (r) => ['待確認', '已確認'].includes(r.status)
  );
  const pastReservations = reservations.filter(
    (r) => ['已完成', '已取消', '未到'].includes(r.status)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* 歡迎區塊 */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-gradient-to-r from-pink-50 to-white p-8 rounded-2xl border border-pink-100 shadow-sm">
        <div className="mb-4 md:mb-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">會員中心</h1>
          <p className="text-gray-600">準備好換個新造型了嗎？立即預約您的專屬設計師。</p>
        </div>
        <Link to="/customer/reservation">
          <Button className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-3 rounded-full shadow-lg text-lg border-none">
            + 立即預約
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側：即將到來的預約 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">即將到來的行程</h2>
            <span className="text-sm text-gray-500">共 {upcomingReservations.length} 筆</span>
          </div>

          {isLoading ? (
            <div className="text-center py-10 text-gray-400">載入中...</div>
          ) : upcomingReservations.length > 0 ? (
            upcomingReservations.map((res) => (
              <Card key={res.reservation_id} className="border-l-4 border-pink-500 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between p-2">
                  <div className="flex gap-4">
                    <div className="text-center px-4 py-2 bg-gray-50 rounded-lg flex flex-col justify-center min-w-[80px]">
                      <span className="text-xs text-gray-500 uppercase font-bold">
                        {new Date(res.reserved_time).toLocaleString('en-US', { month: 'short' })}
                      </span>
                      <span className="text-2xl font-bold text-pink-600">
                        {new Date(res.reserved_time).getDate()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(res.reserved_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          res.status === '已確認' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {res.status}
                        </span>
                        <h3 className="font-bold text-gray-900 text-lg">{res.service_name}</h3>
                      </div>
                      <p className="text-gray-600 text-sm mb-1">
                        設計師：<span className="font-medium text-gray-900">{res.designer_name}</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 sm:mt-0 flex flex-col items-end justify-center">
                    <span className="text-lg font-bold text-gray-900">${res.final_price}</span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <p className="text-gray-500 mb-4">目前沒有即將到來的預約</p>
              <Link to="/customer/reservation">
                <Button variant="outline" size="small">去預約</Button>
              </Link>
            </div>
          )}
        </div>

        {/* 右側：歷史紀錄 */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6">歷史紀錄</h2>
          <div className="space-y-4">
            {pastReservations.length > 0 ? (
              pastReservations.map((res) => (
                <div key={res.reservation_id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm opacity-75 hover:opacity-100 transition-opacity">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900">{res.service_name}</h4>
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded">{res.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">{new Date(res.reserved_time).toLocaleDateString()}</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">@ {res.designer_name}</span>
                    <span className="font-medium">${res.final_price}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-sm text-center">尚無歷史紀錄</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;
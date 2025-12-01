import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import { designerAPI } from '../../services/api';

interface ServiceItem {
  service_id: number;
  name: string;
  base_price: number;
  final_price: number;
  final_duration: number;
  is_enabled: boolean;
  is_customized: boolean;
}

interface DesignerConfig {
  designer_id: number;
  name: string;
  photo_url: string;
  services: ServiceItem[];
}

const ServiceManagement: React.FC = () => {
  const [designersData, setDesignersData] = useState<DesignerConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await designerAPI.getAllServicesOverview();
        setDesignersData(res.data || []);
      } catch (error) {
        console.error('載入失敗', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredData = designersData.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <div className="p-8 text-center text-gray-500">資料載入中...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">服務項目與價格總覽</h1>
          <p className="text-gray-500 mt-1">檢視設計師的個人化定價與服務狀態</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="搜尋設計師..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-pink-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filteredData.map((designer) => (
          <Card key={designer.designer_id} className="overflow-hidden">
            <div className="border-b border-gray-100 bg-gray-50/50 p-4 flex items-center gap-4">
              <img 
                src={designer.photo_url || "https://via.placeholder.com/50"} 
                alt={designer.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
              />
              <div>
                <h2 className="text-lg font-bold text-gray-800">{designer.name}</h2>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                  {designer.services.filter(s => s.is_enabled).length} 項服務上架中
                </span>
              </div>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                    <th className="py-3 px-6 font-medium">服務項目</th>
                    <th className="py-3 px-6 font-medium">狀態</th>
                    <th className="py-3 px-6 font-medium">定價 (NT$)</th>
                    <th className="py-3 px-6 font-medium">時間 (分)</th>
                    <th className="py-3 px-6 font-medium">備註</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {designer.services.map((svc) => (
                    <tr key={svc.service_id} className={`hover:bg-gray-50/50 ${!svc.is_enabled ? 'opacity-50 grayscale' : ''}`}>
                      <td className="py-4 px-6 font-medium text-gray-900">{svc.name}</td>
                      <td className="py-4 px-6">
                        {svc.is_enabled ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            上架中
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            已暫停
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${svc.is_customized ? 'text-pink-600' : 'text-gray-700'}`}>
                            ${svc.final_price}
                          </span>
                          {svc.is_customized && (
                            <span className="text-xs text-gray-400 line-through">${svc.base_price}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600">
                        {svc.final_duration} 分鐘
                      </td>
                      <td className="py-4 px-6">
                        {svc.is_customized && (
                          <span className="text-xs text-pink-500 border border-pink-200 px-2 py-0.5 rounded">
                            自行設定
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
        
        {filteredData.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-200">
            沒有找到符合條件的設計師資料
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceManagement;
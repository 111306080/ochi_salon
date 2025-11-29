import React, { useState, useEffect } from 'react';
import { designerAPI } from '../../services/api';
import Card from '../common/Card';
import Button from '../common/Button';

interface ServiceConfig {
  service_id: number;
  name: string;
  base_price: number;       // 系統參考價
  default_duration: number; // 系統參考時間
  price: number;            // 設計師設定價 (編輯用)
  duration_min: number;     // 設計師設定時間 (編輯用)
  is_enabled: boolean;      // 是否接單
  is_customized: boolean;   // 是否改過 (可選，用來標示顏色)
}

const ServiceSettings: React.FC = () => {
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 初始化：載入設定
  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const data = await designerAPI.getMyServices();
      setServices(data.services || []);
    } catch (error) {
      console.error('無法載入服務設定', error);
      alert('載入服務設定失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 處理輸入變更 (價格、時間)
  const handleChange = (id: number, field: keyof ServiceConfig, value: any) => {
    setServices(prev => prev.map(svc => {
      if (svc.service_id === id) {
        return { ...svc, [field]: value };
      }
      return svc;
    }));
  };

  // 處理開關變更
  const handleToggle = (id: number) => {
    setServices(prev => prev.map(svc => {
      if (svc.service_id === id) {
        return { ...svc, is_enabled: !svc.is_enabled };
      }
      return svc;
    }));
  };

  // 儲存設定
  const handleSave = async () => {
    if (!window.confirm('確定要更新您的服務設定嗎？')) return;
    
    setIsSaving(true);
    try {
      // 整理要送出的資料 (只送後端需要的欄位)
      const payload = services.map(s => ({
        service_id: s.service_id,
        price: Number(s.price),
        duration_min: Number(s.duration_min),
        is_enabled: s.is_enabled
      }));

      await designerAPI.updateMyServices(payload);
      alert('服務設定已更新成功！');
      
      // 重新載入以確保數據同步
      loadServices(); 
    } catch (error) {
      console.error(error);
      alert('更新失敗，請稍後再試');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">載入服務項目中...</div>;

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">服務項目與定價</h2>
          <p className="text-gray-500 text-sm mt-1">您可以針對不同項目設定專屬價格與服務時間，或關閉不想接的項目。</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? '儲存中...' : '儲存變更'}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-3 px-4 text-sm font-semibold text-gray-600">狀態</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-600">服務項目</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-600 w-32">價格 (NT$)</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-600 w-32">時間 (分鐘)</th>
              <th className="py-3 px-4 text-sm font-semibold text-gray-600">系統參考</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((svc) => (
              <tr key={svc.service_id} className={`hover:bg-gray-50 transition-colors ${!svc.is_enabled ? 'opacity-60 bg-gray-50' : ''}`}>
                
                {/* 1. 開關狀態 */}
                <td className="py-4 px-4">
                  <button
                    onClick={() => handleToggle(svc.service_id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      svc.is_enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        svc.is_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <div className="text-xs text-gray-400 mt-1 text-center">
                    {svc.is_enabled ? '已上架' : '已暫停'}
                  </div>
                </td>

                {/* 2. 服務名稱 */}
                <td className="py-4 px-4">
                  <div className="font-medium text-gray-900">{svc.name}</div>
                </td>

                {/* 3. 價格輸入 */}
                <td className="py-4 px-4">
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={svc.price}
                    onChange={(e) => handleChange(svc.service_id, 'price', e.target.value)}
                    disabled={!svc.is_enabled}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                  />
                </td>

                {/* 4. 時間輸入 */}
                <td className="py-4 px-4">
                  <input
                    type="number"
                    min="15"
                    step="15"
                    value={svc.duration_min}
                    onChange={(e) => handleChange(svc.service_id, 'duration_min', e.target.value)}
                    disabled={!svc.is_enabled}
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-100"
                  />
                </td>

                {/* 5. 參考資訊 (讓設計師知道原本公定價是多少) */}
                <td className="py-4 px-4 text-xs text-gray-400">
                  <div>公定價: ${svc.base_price}</div>
                  <div>預設: {svc.default_duration} 分</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default ServiceSettings;
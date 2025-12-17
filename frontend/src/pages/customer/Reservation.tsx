import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { reservationAPI, designerAPI } from '../../services/api';

// 步驟
const STEPS = ['選擇設計師', '選擇服務', '預約時間', '確認資訊'];

const Reservation: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  

  // 資料列表
  const [services, setServices] = useState<any[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  // 使用者選擇的資料
  const [selectedService, setSelectedService] = useState<any>(null);
  const [selectedDesigner, setSelectedDesigner] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');

  // 初始化載入服務與設計師
  useEffect(() => {
    const loadData = async () => {
      try {
        const [servicesData, designersData] = await Promise.all([
          reservationAPI.getServices(),
          designerAPI.getAll()
        ]);
        setServices(servicesData);
        // 只顯示設計師角色的員工
        setDesigners((designersData.designers || []).filter((d: any) => d.role === 'designer'));
      } catch (err) {
        console.error(err);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const fetchDesignerServices = async () => {
      if (!selectedDesigner) return;
      
      setIsLoading(true);
      try {
        // 取得客製化價格與時間
        const data = await reservationAPI.getServices(selectedDesigner.designer_id);
        setServices(data);

        setSelectedService(null);
        setSelectedDate('');
        setSelectedTime('');
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDesignerServices();
  }, [selectedDesigner]);

  // 當日期改變時，查詢可用時段
  useEffect(() => {
    if (selectedDesigner && selectedService && selectedDate) {
      fetchAvailability();
    }
  }, [selectedDate, selectedDesigner, selectedService]);

  const fetchAvailability = async () => {
    setIsLoading(true);
    setAvailableSlots([]);
    try {
      const data = await reservationAPI.checkAvailability(
        selectedDesigner.designer_id,
        selectedDate,
        selectedService.service_id
      );
      setAvailableSlots(data.slots || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep === 0 && !selectedDesigner) return alert('請選擇設計師');
    if (currentStep === 1 && !selectedService) return alert('請先選擇服務');
    if (currentStep === 2 && (!selectedDate || !selectedTime)) return alert('請選擇日期與時間');
    
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!window.confirm('確定要送出預約嗎？')) return;
    
    setIsLoading(true);
    try {
      await reservationAPI.create({
        designer_id: selectedDesigner.designer_id,
        service_id: selectedService.service_id,
        date: selectedDate,
        time: selectedTime,
        notes: notes
      });
      alert('預約成功！');
      navigate('/customer'); // 回到首頁或預約歷史頁
    } catch (err: any) {
      alert(err.response?.data?.error || '預約失敗');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* 進度條 */}
      <div className="mb-8">
        <div className="flex justify-between items-center relative">
          {/* 連接線 */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
          
          {STEPS.map((step, index) => (
            <div key={index} className="flex flex-col items-center bg-white px-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors ${
                index <= currentStep 
                  ? 'bg-pink-600 border-pink-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-400'
              }`}>
                {index + 1}
              </div>
              <span className={`text-xs mt-2 font-medium ${index <= currentStep ? 'text-pink-600' : 'text-gray-400'}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Card className="p-6 min-h-[400px] flex flex-col">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">{STEPS[currentStep]}</h2>

        <div className="flex-1">

          {/* 步驟 1: 選擇設計師 */}
          {currentStep === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {designers.map(designer => (
                <div 
                  key={designer.designer_id}
                  onClick={() => setSelectedDesigner(designer)}
                  className={`flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedDesigner?.designer_id === designer.designer_id
                      ? 'border-pink-500 bg-pink-50 scale-105 shadow-lg'
                      : 'border-gray-100 hover:border-pink-200 hover:shadow-md'
                  }`}
                >
                  <img 
                    src={designer.photo_url || "https://via.placeholder.com/100"} 
                    alt={designer.name}
                    className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-white shadow-sm"
                  />
                  <h3 className="font-bold text-lg mb-1">{designer.name}</h3>
                  <p className="text-xs text-gray-500 text-center line-clamp-2">{designer.style_description || '資深設計師'}</p>
                </div>
              ))}
            </div>
          )}

          {/* 步驟 2: 選擇服務 */}
          {currentStep === 1 && (
            <div>
              {isLoading ? (
                <div className="text-center text-gray-500 py-10">正在讀取設計師的服務項目...</div>
              ) : services.length === 0 ? (
                 <div className="text-center text-gray-500 py-10">很抱歉，此設計師目前沒有可預約的服務項目。</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {services.map(service => (
                    <div 
                      key={service.service_id}
                      onClick={() => setSelectedService(service)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedService?.service_id === service.service_id 
                          ? 'border-pink-500 bg-pink-50' 
                          : 'border-gray-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900">{service.name}</h3>
                        <span className="text-pink-600 font-bold">
                          ${service.final_price || service.base_price}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">{service.description || '無描述'}</p>
                      <div className="text-xs text-gray-400 bg-white inline-block px-2 py-1 rounded border border-gray-100">
                        ⏱ 約 {service.duration_min} 分鐘
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          

          {/* 步驟 3: 選擇時間 */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">預約日期</label>
                <input 
                  type="date" 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime(''); // 重選日期時清空時間
                  }}
                />
              </div>

              {selectedDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    選擇時段 {isLoading && <span className="text-pink-500 ml-2 text-xs">(查詢中...)</span>}
                  </label>
                  
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                      {availableSlots.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`py-2 px-1 rounded-md text-sm font-medium transition-all ${
                            selectedTime === time
                              ? 'bg-pink-600 text-white shadow-md transform scale-105'
                              : 'bg-white border border-gray-200 hover:border-pink-500 hover:text-pink-600'
                          }`}
                        >
                          {time.slice(0, 5)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8 bg-gray-50 rounded-lg text-gray-500">
                      {isLoading ? '正在查詢設計師空檔...' : '哎呀！這天似乎已經約滿了，換個日期試試？'}
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">備註需求 (選填)</label>
                <textarea 
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none"
                  rows={2}
                  placeholder="例如：我有自然捲、想要剪短一點..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 步驟 4: 確認資訊 */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-pink-50 p-6 rounded-xl border border-pink-100">
                <h3 className="text-lg font-bold text-pink-800 mb-4 border-b border-pink-200 pb-2">預約詳情</h3>
                <div className="space-y-3 text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">服務項目</span>
                    <span className="font-medium">{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">設計師</span>
                    <span className="font-medium">{selectedDesigner?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">日期</span>
                    <span className="font-medium">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">時間</span>
                    <span className="font-medium">{selectedTime?.slice(0, 5)}</span>
                  </div>
                  <div className="flex justify-between border-t border-pink-200 pt-2 mt-2">
                    <span className="text-gray-700 font-bold">預估費用</span>
                    <span className="font-bold text-xl text-pink-600">
                      ${selectedService?.final_price ?? selectedService?.base_price}
                    </span>
                  </div>
                  {notes && (
                    <div className="pt-3 mt-3 border-t border-pink-200">
                      <span className="text-gray-500 block mb-1">備註</span>
                      <p className="text-sm bg-white p-3 rounded border border-pink-100">{notes}</p>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-center text-gray-500">
                點擊「確認預約」後，您的預約將會送出，設計師確認後您會收到通知。
              </p>
            </div>
          )}
        </div>

        {/* 按鈕區 */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between">
          <Button 
            variant="secondary" 
            onClick={handleBack}
            disabled={currentStep === 0 || isLoading}
            className={currentStep === 0 ? 'invisible' : ''}
          >
            上一步
          </Button>
          
          {currentStep === STEPS.length - 1 ? (
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="bg-pink-600 hover:bg-pink-700 px-8"
            >
              {isLoading ? '處理中...' : '確認預約'}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={isLoading}>
              下一步
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Reservation;
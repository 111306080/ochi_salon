import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal'; // 假設你有這個元件
import { designerAPI } from '../../services/api';

interface Designer {
  designer_id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const Personnel: React.FC = () => {
  const [designers, setDesigners] = useState<Designer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 新增表單狀態
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'designer'
  });
  const [submitError, setSubmitError] = useState('');

  // 載入資料
  const fetchDesigners = async () => {
    try {
      setIsLoading(true);
      const data = await designerAPI.getAll();
      // 後端回傳格式可能是 { designers: [], total: ... } 或直接 []
      setDesigners(data.designers || data); 
    } catch (error) {
      console.error('Failed to fetch designers', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigners();
  }, []);

  // 處理新增
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    
    try {
      await designerAPI.create(formData);
      alert('設計師創建成功！預設密碼為手機後8碼');
      setIsModalOpen(false);
      setFormData({ name: '', email: '', phone: '', role: 'designer' }); // 重置表單
      fetchDesigners(); // 重新整理列表
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || '創建失敗');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* 標題區 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">人員管理</h1>
          <p className="text-gray-500 mt-1">管理店內設計師與員工帳號</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          + 新增設計師
        </Button>
      </div>

      {/* 列表區 */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">載入中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">姓名</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">職位</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">聯絡資訊</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">狀態</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {designers.map((designer) => (
                  <tr key={designer.designer_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                          {designer.name[0]}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{designer.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        designer.role === 'manager' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {designer.role === 'manager' ? '主管' : '設計師'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{designer.email}</div>
                      <div className="text-sm text-gray-500">{designer.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        designer.is_active ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {designer.is_active ? '在職中' : '已停用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-4">編輯</button>
                      <button className="text-red-600 hover:text-red-900">停用</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 新增設計師 Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="新增設計師"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="bg-red-50 text-red-500 text-sm p-3 rounded">
              {submitError}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">姓名</label>
            <input
              type="text" required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email (作為登入帳號)</label>
            <input
              type="email" required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">手機 (預設密碼為後8碼)</label>
            <input
              type="tel" required
              placeholder="0912345678"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">權限角色</label>
            <select
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              <option value="designer">設計師</option>
              <option value="manager">主管/管理員</option>
            </select>
          </div>

          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
            <Button type="submit" className="w-full sm:col-start-2">
              確認新增
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              className="w-full sm:col-start-1 mt-3 sm:mt-0"
              onClick={() => setIsModalOpen(false)}
            >
              取消
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Personnel;
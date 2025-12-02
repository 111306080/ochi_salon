import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import type { UserRole } from '../types';

const StaffLogin = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // --- 補回這些缺失的 State 定義 ---
  const [role, setRole] = useState<UserRole>('designer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // ------------------------------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 1. 呼叫 login，並接收回傳的資料
      const data = await login({ email, password, role });
      
      // 2. 取得真實身份 (優先使用後端回傳的 role)
      // 如果 data.user 存在就用 data.user.role，否則 fallback 到原本選的 role
      const actualRole = data?.user?.role || role;

      // 3. 依據真實身份導向
      if (actualRole === 'manager') {
        navigate('/manager');
      } else if (actualRole === 'designer') {
        navigate('/designer');
      } else {
        // 萬一有顧客跑來員工後台登入成功
        navigate('/customer');
      }

    } catch (err: any) {
      console.error(err);
      // 錯誤處理
      setError(err.response?.data?.error || err.message || '登入失敗，請檢查權限或帳號密碼');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
          奧創髮藝 員工後台
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          僅限內部人員使用
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 shadow-xl border-t-4 border-blue-500 bg-white">
          {/* 角色切換 Tab */}
          <div className="flex border-b mb-6">
            <button
              className={`flex-1 py-2 text-sm font-medium focus:outline-none ${role === 'designer' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setRole('designer')}
              type="button"
            >
              設計師
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium focus:outline-none ${role === 'manager' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setRole('manager')}
              type="button"
            >
              主管/管理員
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded border border-red-100">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Email 帳號</label>
              <input
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">密碼</label>
              <input
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button 
              variant="primary" 
              className="w-full bg-blue-600 hover:bg-blue-700" 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '驗證中...' : `登入${role === 'designer' ? '設計師' : '主管'}系統`}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default StaffLogin;
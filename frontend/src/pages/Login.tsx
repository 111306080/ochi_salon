import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import type { UserRole } from '../types';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [role, setRole] = useState<UserRole>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // 呼叫 Context 裡的登入函式
      await login({ email, password, role });
      
      // 登入成功後，依照角色導向不同頁面
      switch (role) {
        case 'manager':
          navigate('/manager');
          break;
        case 'designer':
          navigate('/designer');
          break;
        case 'customer':
        default:
          navigate('/customer');
          break;
      }
    } catch (err: any) {
      // 這裡可以根據後端回傳的錯誤顯示訊息
      setError(err.response?.data?.error || '登入失敗，請檢查帳號密碼');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            奧創髮藝管理系統
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            請選擇身份並登入
          </p>
        </div>

        <Card className="p-8">
          {/* 角色切換 Tab */}
          <div className="flex border-b mb-6">
            <button
              className={`flex-1 py-2 text-sm font-medium ${role === 'customer' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setRole('customer')}
            >
              客戶端
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${role === 'designer' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setRole('designer')}
            >
              設計師
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${role === 'manager' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setRole('manager')}
            >
              主管端
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded">
                {error}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                密碼
              </label>
              <input
                id="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button 
              variant="primary" 
              className="w-full" 
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? '登入中...' : `以${role === 'customer' ? '客戶' : role === 'designer' ? '設計師' : '主管'}身份登入`}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
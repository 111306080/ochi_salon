import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { authAPI } from '../services/api';

const CustomerAuth: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // 切換 登入/註冊 模式
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // 表單資料
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: ''
  });
  
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLoginMode) {
        // --- 登入邏輯 ---
        await login({ 
          email: formData.email, 
          password: formData.password, 
          role: 'customer' // 強制指定為顧客
        });
        navigate('/customer');
      } else {
        // --- 註冊邏輯 ---
        await authAPI.register({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone: formData.phone
        });
        // 註冊成功後，自動登入或切換回登入頁
        alert('註冊成功！請直接登入');
        setIsLoginMode(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || (isLoginMode ? '登入失敗' : '註冊失敗'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {isLoginMode ? '歡迎回來，奧創貴賓' : '加入奧創，開始您的美麗旅程'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isLoginMode ? '登入以管理您的預約' : '註冊即可線上預約專屬設計師'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded">
                {error}
              </div>
            )}

            {/* 註冊時才顯示姓名 */}
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700">姓名</label>
                <input
                  name="name"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            )}

            {/* 註冊時才顯示手機 */}
            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700">手機號碼</label>
                <input
                  name="phone"
                  type="tel"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                name="email"
                type="email"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">密碼</label>
              <input
                name="password"
                type="password"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full bg-pink-600 hover:bg-pink-700"
              disabled={isLoading}
            >
              {isLoading ? '處理中...' : (isLoginMode ? '立即登入' : '註冊帳號')}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {isLoginMode ? '還沒有帳號？' : '已經有帳號了？'}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setError('');
                }}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-pink-600 bg-pink-50 hover:bg-pink-100"
              >
                {isLoginMode ? '前往免費註冊' : '返回登入'}
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default CustomerAuth;
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from '../services/api';

// 定義 User 型別
interface User {
  id: number;
  name: string;
  email: string;
  role: 'customer' | 'designer' | 'manager';
  phone?: string;
  photo_url?: string;
  style_description?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // 修改 1: 讓 login 回傳 Promise<any>，以便外部取得 API 回傳結果
  login: (credentials: any) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
           setUser(JSON.parse(savedUser));
        } catch (e) {
           console.error("解析 User 資料失敗", e);
           localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials: any) => {
    try {
      const data = await authAPI.login(credentials);
      
      // 更新狀態
      setUser(data.user);
      
      // 更新 LocalStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // ★★★ 修改重點：將後端回傳的 data 回傳出去 ★★★
      // 這樣登入頁面才能拿到 data.user.role 進行正確跳轉
      return data; 

    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  };

  const logout = () => {
    // ★★★ 修改重點：這裡只負責清空資料，不要做頁面跳轉 ★★★
    // 讓 Navbar 的 handleLogout 來決定要 navigate 去哪裡
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // 移除這行霸道的程式碼：
    // window.location.href = '/'; 
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
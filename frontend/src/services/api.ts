import axios from 'axios';
import type{ LoginCredentials, RegisterData, LoginResponse } from '../types';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 只有在非公開頁面才強制導向，避免影響官網瀏覽
      if (!window.location.pathname.includes('/login') && window.location.pathname !== '/') {
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- 認證 API ---
export const authAPI = {
  login: async (credentials: LoginCredentials) => {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },
  register: async (data: RegisterData) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// --- 設計師管理 API ---
export const designerAPI = {
  getAll: async () => {
    const response = await api.get('/designers');
    return response.data;
  },
  create: async (data: { name: string; email: string; phone: string; role?: string }) => {
    const response = await api.post('/designers', data);
    return response.data;
  },
  uploadAvatar: async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await api.post('/designers/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  updateProfile: async (data: any) => {
    const response = await api.put('/designers/me', data);
    return response.data;
  }
};

// --- 作品集 API ---
export const portfolioAPI = {
  // 取得我(設計師)的所有作品
  getMyPortfolio: async () => {
    const response = await api.get('/portfolio/my');
    return response.data;
  },

  // 取得"特定設計師"的作品集 (官網用)
  getDesignerPortfolio: async (designerId: number) => {
    const response = await api.get(`/portfolio/designer/${designerId}`);
    return response.data;
  },

  // 上傳作品
  upload: async (file: File, description: string, styleTag: string) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('description', description);
    formData.append('style_tag', styleTag);

    const response = await api.post('/portfolio/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // 刪除作品
  delete: async (id: number) => {
    const response = await api.delete(`/portfolio/${id}`);
    return response.data;
  }
};

export default api;
import axios from 'axios';
import type{ LoginCredentials, RegisterData, LoginResponse } from '../types';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Interceptors ---
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
      // 避免在登入頁或首頁無限重導向
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/staff-login') && 
          window.location.pathname !== '/') {
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

// --- 設計師 API ---
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
  getMyPortfolio: async () => {
    const response = await api.get('/portfolio/my');
    return response.data;
  },
  getDesignerPortfolio: async (designerId: number) => {
    const response = await api.get(`/portfolio/designer/${designerId}`);
    return response.data;
  },
  upload: async (file: File, description: string, styleTag: string) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('description', description);
    formData.append('style_tag', styleTag);
    const response = await api.post('/portfolio/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/portfolio/${id}`);
    return response.data;
  }
};

// --- 預約相關 API ---
export const reservationAPI = {
  getServices: async () => {
    const response = await api.get('/reservations/services');
    return response.data;
  },
  checkAvailability: async (designerId: number, date: string, serviceId: number) => {
    const response = await api.get('/reservations/availability', {
      params: { designer_id: designerId, date, service_id: serviceId }
    });
    return response.data;
  },
  create: async (data: { designer_id: number; service_id: number; date: string; time: string; notes?: string }) => {
    const response = await api.post('/reservations', data);
    return response.data;
  },
  getMyReservations: async () => {
    const response = await api.get('/reservations/my');
    return response.data;
  },
  // 設計師取得自己的預約
  getDesignerReservations: async (date?: string) => {
    const params = date ? { date } : {};
    // 若後端尚未實作 designer endpoint，這裡可能會 404，請確保後端有 update
    // 暫時使用 getMyReservations 或是後端專屬 endpoint
    const response = await api.get('/reservations/my'); 
    return response.data;
  },
  updateStatus: async (reservationId: number, status: string) => {
    // 後端需實作 PUT /reservations/:id/status
    const response = await api.put(`/reservations/${reservationId}/status`, { status });
    return response.data;
  }
};

export default api;
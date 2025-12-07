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
  },
  getMyServices: async () => {
    const response = await api.get('/designers/me/services');
    return response.data;
  },
  updateMyServices: async (services: any[]) => {
    const response = await api.put('/designers/me/services', { services });
    return response.data;
  },
  getAllServicesOverview: async () => {
    const response = await api.get('/designers/services/all');
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

// --- 主管專用 API ---
export const managerAPI = {
  getRFMAnalysis: async () => {
    const response = await api.get('/manager/analysis/rfm');
    return response.data;
  },
  getSalesAnalysis: async () => {
    const response = await api.get('/manager/analysis/sales');
    return response.data;
  }
};

// --- 預約相關 API ---
export const reservationAPI = {
  // ... 其他方法保持不變 ...
  
  getServices: async (designerId?: number) => {
    const response = await api.get('/reservations/services', {
      params: { designer_id: designerId }
    });
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
  
  // [修改] 改為呼叫專屬的設計師行程 API
  getDesignerReservations: async (date?: string) => {
    // 這裡對應後端的 @reservation_bp.route('/designer/schedule')
    const response = await api.get('/reservations/designer/schedule', {
      params: { date } 
    });
    return response.data;
  },
  
  updateStatus: async (reservationId: number, status: string) => {
    // 提醒：後端也要記得補上這個 PUT 路由才能運作喔！
    const response = await api.put(`/reservations/${reservationId}/status`, { status });
    return response.data;
  }
};

export default api;
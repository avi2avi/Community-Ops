import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthResponse, User, Visitor, Bill, Complaint, Notice, DashboardStats, Unit } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  register: async (data: {
    email: string;
    password: string;
    name: string;
    phone: string;
    role?: string;
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Visitor APIs
export const visitorAPI = {
  create: async (data: {
    name: string;
    phone: string;
    purpose: string;
    unit_id: string;
    resident_id: string;
    vehicle_number?: string;
    photo?: string;
  }): Promise<Visitor> => {
    const response = await api.post('/visitors', data);
    return response.data;
  },

  getAll: async (params?: {
    unit_id?: string;
    status?: string;
    date?: string;
  }): Promise<Visitor[]> => {
    const response = await api.get('/visitors', { params });
    return response.data;
  },

  update: async (id: string, data: {
    status?: string;
    exit_time?: string;
  }): Promise<Visitor> => {
    const response = await api.put(`/visitors/${id}`, data);
    return response.data;
  },
};

// Bill APIs
export const billAPI = {
  getAll: async (params?: {
    unit_id?: string;
    paid?: boolean;
  }): Promise<Bill[]> => {
    const response = await api.get('/bills', { params });
    return response.data;
  },

  createPayment: async (data: {
    bill_id: string;
    amount: number;
    payment_method: string;
    transaction_id?: string;
  }) => {
    const response = await api.post('/bills/payment', data);
    return response.data;
  },
};

// Complaint APIs
export const complaintAPI = {
  create: async (data: {
    title: string;
    description: string;
    unit_id: string;
    photos?: string[];
    priority?: string;
  }): Promise<Complaint> => {
    const response = await api.post('/complaints', data);
    return response.data;
  },

  getAll: async (params?: {
    unit_id?: string;
    status?: string;
  }): Promise<Complaint[]> => {
    const response = await api.get('/complaints', { params });
    return response.data;
  },

  update: async (id: string, data: {
    status?: string;
    assigned_to?: string;
  }): Promise<Complaint> => {
    const response = await api.put(`/complaints/${id}`, data);
    return response.data;
  },
};

// Notice APIs
export const noticeAPI = {
  create: async (data: {
    title: string;
    content: string;
    priority?: string;
  }): Promise<Notice> => {
    const response = await api.post('/notices', data);
    return response.data;
  },

  getAll: async (society_id?: string): Promise<Notice[]> => {
    const response = await api.get('/notices', { params: { society_id } });
    return response.data;
  },
};

// Dashboard APIs
export const dashboardAPI = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard/stats');
    return response.data;
  },
};

// Unit APIs
export const unitAPI = {
  getAll: async (society_id?: string): Promise<Unit[]> => {
    const response = await api.get('/units', { params: { society_id } });
    return response.data;
  },
};

export default api;

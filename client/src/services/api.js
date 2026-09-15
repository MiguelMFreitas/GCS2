import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gcs2_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if it's not a login attempt itself
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('gcs2_token');
      localStorage.removeItem('gcs2_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
};

export const vehicleService = {
  list: (params) => api.get('/vehicles', { params }),
  get: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post('/vehicles', data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  updateStatus: (id, data) => api.patch(`/vehicles/${id}/status`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
  getLastOdometer: (id) => api.get(`/vehicles/${id}/last-odometer`),
};

export const sessionService = {
  getActive: () => api.get('/sessions/active'),
  startSession: (data) => api.post('/sessions/start', data),
  listAll: () => api.get('/sessions'),
  getById: (id) => api.get(`/sessions/${id}`),
  addToCart: (sessionId, data) => api.post(`/sessions/${sessionId}/items`, data),
  updateCartItem: (sessionId, recordId, data) => api.put(`/sessions/${sessionId}/items/${recordId}`, data),
  removeFromCart: (sessionId, recordId, data) => api.delete(`/sessions/${sessionId}/items/${recordId}`, { data }),
  finalizeSession: (id) => api.post(`/sessions/${id}/finalize`),
  cancelSession: (id, data) => api.post(`/sessions/${id}/cancel`, data),
};

export const expenseService = {
  list: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

export const maintenanceService = {
  list: (params) => api.get('/maintenance', { params }),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
};

export const reminderService = {
  list: (params) => api.get('/reminders', { params }),
  create: (data) => api.post('/reminders', data),
  updateStatus: (id, data) => api.patch(`/reminders/${id}/status`, data),
};

export const documentService = {
  list: (params) => api.get('/documents', { params }),
  create: (data) => api.post('/documents', data),
  delete: (id) => api.delete(`/documents/${id}`),
};

export const reportService = {
  getDashboard: () => api.get('/dashboard/summary'),
  getFleetReports: (params) => api.get('/reports/fleet', { params }),
  getExcelExportUrl: (sessionId) => `/api/reports/session/${sessionId}/excel`,
};

export const uploadService = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;

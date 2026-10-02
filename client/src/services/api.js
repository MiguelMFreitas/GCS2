import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest'
  }
});

// Attach Authorization Bearer token header if available in storage as redundant safety
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gcs2_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: only clear storage if session verification (/auth/me) explicitly fails with 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (url.includes('/auth/me')) {
        localStorage.removeItem('gcs2_token');
        localStorage.removeItem('gcs2_user');
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
  delete: (id) => api.delete(`/maintenance/${id}`),
};

export const reminderService = {
  list: (params) => api.get('/reminders', { params }),
  create: (data) => api.post('/reminders', data),
  updateStatus: (id, data) => api.patch(`/reminders/${id}/status`, data),
  delete: (id) => api.delete(`/reminders/${id}`),
};

export const documentService = {
  list: (params) => api.get('/documents', { params }),
  create: (data) => api.post('/documents', data),
  delete: (id) => api.delete(`/documents/${id}`),
};

export const reportService = {
  getDashboard: (params) => api.get('/dashboard/summary', { params }),
  getFleetReports: (params) => api.get('/reports/fleet', { params }),
  getExcelExportUrl: (sessionId) => `/api/reports/session/${sessionId}/excel`,
};

export const uploadService = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData);
  },
};

export const userService = {
  list: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  updateStatus: (id, active) => api.patch(`/users/${id}/status`, { active }),
  resetPassword: (id, new_password) => api.post(`/users/${id}/reset-password`, { new_password }),
  delete: (id) => api.delete(`/users/${id}`),
};

export const fuelingService = {
  getPendingVehicles: () => api.get('/fueling/pending-vehicles'),
  submitEmployeeFueling: (data) => api.post('/fueling/submit', data),
  update: (id, data) => api.put(`/fuelings/${id}`, data),
  delete: (id, data) => api.delete(`/fuelings/${id}`, { data }),
};

export default api;




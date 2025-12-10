// client/src/utils/api.js - Complete version
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Determine base URL based on environment
const getBaseURL = () => {
  // For Vite
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Default development URL
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request in development
    if (import.meta.env.DEV) {
      console.log(`🌐 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.data || '');
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    // Log error in development
    if (import.meta.env.DEV) {
      console.error(`❌ ${error.response?.status || 'Network'} ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.response?.data || error.message);
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('🛑 Authentication error, clearing tokens');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('vendorProfile');
      
      // Only redirect if we're not already on login page
      if (!window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('🌐 Network error:', error.message);
      toast.error('Network error. Please check your connection.');
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    
    return Promise.reject(error);
  }
);

export default api;
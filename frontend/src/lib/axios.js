import axios from 'axios';
import { showError } from './toast';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for global error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network error (no response)
    if (!error.response) {
      showError('Network error. Please check your internet connection.');
      return Promise.reject({
        message: 'Network error',
        status: 0
      });
    }

    const { status, data } = error.response;

    // Handle 401 Unauthorized - token expired or invalid
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only show error and redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        showError('Your session has expired. Please login again.');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
      
      return Promise.reject({
        message: 'Unauthorized',
        status: 401
      });
    }

    // Handle 403 Forbidden
    if (status === 403) {
      showError('You do not have permission to perform this action.');
      return Promise.reject({
        message: 'Forbidden',
        status: 403
      });
    }

    // Handle 404 Not Found
    if (status === 404) {
      showError(data?.error || 'Resource not found.');
      return Promise.reject({
        message: data?.error || 'Not found',
        status: 404
      });
    }

    // Handle 429 Too Many Requests
    if (status === 429) {
      const retryAfter = data?.retryAfter ? ` Try again in ${Math.ceil(data.retryAfter / 60)} minutes.` : '';
      showError((data?.error || 'Too many requests.') + retryAfter);
      return Promise.reject({
        message: data?.error || 'Rate limit exceeded',
        status: 429,
        retryAfter: data?.retryAfter
      });
    }

    // Handle 500+ Server Errors
    if (status >= 500) {
      showError('Server error. Please try again later.');
      return Promise.reject({
        message: 'Server error',
        status
      });
    }

    // Handle validation errors (400) - don't show toast, let form handle it
    if (status === 400 && data?.errors) {
      return Promise.reject({
        message: 'Validation failed',
        status: 400,
        errors: data.errors
      });
    }

    // Handle other client errors
    const errorMessage = data?.error || data?.message || 'An error occurred';
    if (status !== 400) { // Don't show generic 400 errors as they're usually validation
      showError(errorMessage);
    }
    
    return Promise.reject({
      message: errorMessage,
      status,
      errors: data?.errors
    });
  }
);

export default axiosInstance;

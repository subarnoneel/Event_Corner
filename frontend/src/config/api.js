const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:6000';


if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
}

export const API_ENDPOINTS = {
    HEALTH_CHECK: `${API_BASE_URL}/api/health`,
};

export default API_BASE_URL;

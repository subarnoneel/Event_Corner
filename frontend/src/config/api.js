const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';


if (import.meta.env.DEV) {
  console.log('API Base URL:', API_BASE_URL);
}

export const API_ENDPOINTS = {
    // Health Check
    HEALTH_CHECK: `${API_BASE_URL}/api/health`,
    
    // Authentication
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    
    // Institution Search (for organizer registration)
    SEARCH_INSTITUTIONS: `${API_BASE_URL}/api/institutions/search`,
};

export default API_BASE_URL;

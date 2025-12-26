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
    
    // User Profile Management (Common for all roles)
    USER_PROFILE: (userId) => `${API_BASE_URL}/api/users/${userId}/profile`,
    UPDATE_USER_PROFILE: (userId) => `${API_BASE_URL}/api/users/${userId}/profile`,
    
    // Superadmin - Institution Management
    SUPERADMIN_INSTITUTIONS: `${API_BASE_URL}/api/superadmin/institutions`,
    SUPERADMIN_VERIFY_INSTITUTION: (userId) => `${API_BASE_URL}/api/superadmin/institutions/${userId}/verify`,
    SUPERADMIN_BULK_VERIFY_INSTITUTIONS: `${API_BASE_URL}/api/superadmin/institutions/bulk-verify`,
    SUPERADMIN_INSTITUTION_STATS: `${API_BASE_URL}/api/superadmin/institutions/stats`,
    
    // Superadmin - User Management
    SUPERADMIN_SEARCH_USERS: `${API_BASE_URL}/api/superadmin/users/search`,
    SUPERADMIN_TOGGLE_USER_ACTIVE: (userId) => `${API_BASE_URL}/api/superadmin/users/${userId}/toggle-active`,
    SUPERADMIN_ASSIGN_ROLE: (userId) => `${API_BASE_URL}/api/superadmin/users/${userId}/assign-role`,
    SUPERADMIN_REMOVE_ROLE: (userId, roleId) => `${API_BASE_URL}/api/superadmin/users/${userId}/roles/${roleId}`,
    
    // Superadmin - User & Role Management
    SUPERADMIN_GET_ROLES: `${API_BASE_URL}/api/superadmin/roles`,
    SUPERADMIN_BULK_ASSIGN_ROLE: `${API_BASE_URL}/api/superadmin/roles/bulk-assign`,
    
    // Institution - Organizer Management
    INSTITUTION_GET_ORGANIZERS: (institutionId) => `${API_BASE_URL}/api/institution/${institutionId}/organizers`,
    INSTITUTION_VERIFY_ORGANIZER: (organizerId) => `${API_BASE_URL}/api/institution/organizers/${organizerId}/verify`,
};

export default API_BASE_URL;

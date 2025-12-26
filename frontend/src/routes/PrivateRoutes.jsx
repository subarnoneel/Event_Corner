import React, { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import AuthContext from '../providers/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, userData, loading } = useContext(AuthContext);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user || !userData) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has any of the allowed roles
  if (allowedRoles.length > 0) {
    const userRoles = userData.roles?.map(role => role.role_name) || [];
    const hasAllowedRole = allowedRoles.some(allowedRole => userRoles.includes(allowedRole));
    
    if (!hasAllowedRole) {
      // Show error message
      toast.error("You don't have permission to access this page");
      
      // Redirect based on user's actual role
      if (userRoles.includes('super_admin')) {
        return <Navigate to="/superadmin" replace />;
      } else if (userRoles.includes('admin')) {
        return <Navigate to="/admin" replace />;
      } else if (userRoles.includes('institution')) {
        return <Navigate to="/institution-dashboard" replace />;
      } else if (userRoles.includes('event_organizer')) {
        return <Navigate to="/organizer-dashboard" replace />;
      } else if (userRoles.includes('participant')) {
        return <Navigate to="/participant-dashboard" replace />;
      }
      
      // Default redirect to home
      return <Navigate to="/" replace />;
    }
  }

  // User is authenticated and has the required role
  return children;
};

export default ProtectedRoute;

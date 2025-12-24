import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiSearch, FiTrash2 } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../../config/api';

const RoleAssignment = () => {
  const { userId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (userId) {
      loadUserFromId(userId);
    }
  }, [userId]);

  const loadUserFromId = async (userIdParam) => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_GET_USER(userIdParam));
      if (!response.ok) throw new Error('Failed to fetch user');
      const userData = await response.json();
      if (userData.data) {
        handleUserSelect(userData.data);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load user from URL');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    try {
      setSearchLoading(true);
      const response = await fetch(`${API_ENDPOINTS.SUPERADMIN_SEARCH_USERS}?search=${searchTerm}`);
      if (!response.ok) throw new Error('Failed to search users');
      const data = await response.json();
      setUsers(data.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to search users');
      setUsers([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleUserSelect = async (user) => {
    try {
      setLoading(true);
      setSelectedUser(user);
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_GET_USER_ROLES(user.id));
      if (!response.ok) throw new Error('Failed to fetch user roles');
      const data = await response.json();
      const roles = data.data?.roles || [];
      setUserRoles(roles);
      
      const hasAdminRole = roles.some(role => 
        role.role_name === 'admin' || role.role_name === 'super_admin'
      );
      setIsAdmin(hasAdminRole);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load user roles');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRole = async (roleId) => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const response = await fetch(
        API_ENDPOINTS.SUPERADMIN_REMOVE_ROLE(selectedUser.id, roleId),
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to remove role');
      toast.success('Role removed successfully');
      handleUserSelect(selectedUser);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to remove role');
    } finally {
      setLoading(false);
    }
  };

  const handleMakeAdmin = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_MAKE_ADMIN(selectedUser.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_by: null })
      });
      
      if (!response.ok) throw new Error('Failed to make user admin');
      
      toast.success('User successfully made admin');
      handleUserSelect(selectedUser);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to make user admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Search Users</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by name, email, or username
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Type to search..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <button
            onClick={handleSearch}
            disabled={searchLoading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg transition"
          >
            <FiSearch size={18} />
            {searchLoading ? 'Searching...' : 'Search'}
          </button>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.length === 0 && !searchLoading && (
              <p className="text-gray-500 text-sm">No users found</p>
            )}
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className={`w-full text-left p-3 rounded-lg border-2 transition ${
                  selectedUser?.id === user.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium text-gray-900">{user.full_name || 'N/A'}</div>
                <div className="text-xs text-gray-600">{user.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedUser ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Selected User</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-sm text-gray-600">Name:</span>
                  <p className="text-gray-900 font-medium">{selectedUser.full_name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Email:</span>
                  <p className="text-gray-900 font-medium">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Admin Access</h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-700 font-medium">Make this user an admin</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {isAdmin 
                      ? '✓ This user already has admin access' 
                      : 'Grant admin privileges to this user'}
                  </p>
                </div>
                <button
                  onClick={handleMakeAdmin}
                  disabled={loading || isAdmin}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg transition font-medium ${
                    isAdmin
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {isAdmin ? '✓ Already Admin' : 'Make Admin'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Current Roles ({userRoles.length})
              </h3>
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                  </div>
                </div>
              ) : userRoles.length === 0 ? (
                <p className="text-gray-500">No roles assigned</p>
              ) : (
                <div className="space-y-2">
                  {userRoles.map((role) => (
                    <div
                      key={role.id}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200"
                    >
                      <div>
                        <div className="font-medium text-gray-900">{role.name}</div>
                        <div className="text-xs text-gray-600">
                          {role.description || 'No description'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveRole(role.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 disabled:opacity-50 transition"
                        title="Remove role"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 flex items-center justify-center min-h-96">
            <div className="text-center">
              <FiSearch size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">Select a user to manage their roles</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleAssignment;

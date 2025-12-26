import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiCheck, FiX } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../../config/api';

// Role color mapping
const ROLE_COLORS = {
  'super_administrator': { badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  'admin': { badge: 'bg-red-100 text-red-800 border-red-200' },
  'institution': { badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  'event_organizer': { badge: 'bg-green-100 text-green-800 border-green-200' },
  'participant': { badge: 'bg-gray-100 text-gray-800 border-gray-200' },
  'default': { badge: 'bg-indigo-100 text-indigo-800 border-indigo-200' }
};

const getRoleColors = (roleName) => {
  return ROLE_COLORS[roleName] || ROLE_COLORS['default'];
};

const AdminUserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(new Set());

  useEffect(() => {
    loadAllUsers();
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(allUsers);
    } else {
      const filtered = allUsers.filter(user =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, allUsers]);

  const loadAllUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_ENDPOINTS.SUPERADMIN_SEARCH_USERS}?search=%%&limit=10000`);

      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      const users = data.data || [];
      setAllUsers(users);
      setFilteredUsers(users);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      setLoadingUsers(prev => new Set([...prev, user.id]));
      
      const newActiveStatus = !user.is_active;
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_TOGGLE_USER_ACTIVE(user.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newActiveStatus })
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || 'Failed to update user status');

      toast.success(`User ${newActiveStatus ? 'activated' : 'deactivated'} successfully`);
      
      const updateUserStatus = (users) =>
        users.map(u =>
          u.id === user.id
            ? { ...u, is_active: newActiveStatus }
            : u
        );
      
      setAllUsers(updateUserStatus);
      setFilteredUsers(updateUserStatus);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to update user status');
    } finally {
      setLoadingUsers(prev => {
        const updated = new Set(prev);
        updated.delete(user.id);
        return updated;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm || ''}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, email, or ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadAllUsers}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      User ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Full Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Roles Assigned
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Account Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const isLoading = loadingUsers.has(user.id);
                    const userRoles = user.roles || [];
                    
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-blue-600">
                            {user.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {user.full_name || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {user.email || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            {userRoles.length === 0 ? (
                              <span className="text-xs text-gray-500 italic">No roles assigned</span>
                            ) : (
                              userRoles.map((role) => {
                                const colors = getRoleColors(role.role_name);
                                return (
                                  <span
                                    key={role.role_id}
                                    className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border shadow-sm ${colors.badge}`}
                                  >
                                    {role.display_name || role.role_name}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleToggleActive(user)}
                            disabled={isLoading}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                              user.is_active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={user.is_active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            {isLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                                Processing...
                              </>
                            ) : user.is_active ? (
                              <>
                                <FiCheck size={16} />
                                Active
                              </>
                            ) : (
                              <>
                                <FiX size={16} />
                                Inactive
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          {!loading && filteredUsers.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <span className="font-medium">{filteredUsers.length}</span> of{' '}
                <span className="font-medium">{allUsers.length}</span> users
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;

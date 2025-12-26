import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiCheck, FiX, FiShield } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../../config/api';

// Role color mapping
const ROLE_COLORS = {
  'super_administrator': { bg: 'bg-gradient-to-r from-purple-500 to-purple-600', text: 'text-white', badge: 'bg-purple-100 text-purple-800 border-purple-200', ring: 'ring-purple-500' },
  'admin': { bg: 'bg-gradient-to-r from-red-500 to-red-600', text: 'text-white', badge: 'bg-red-100 text-red-800 border-red-200', ring: 'ring-red-500' },
  'institution': { bg: 'bg-gradient-to-r from-blue-500 to-blue-600', text: 'text-white', badge: 'bg-blue-100 text-blue-800 border-blue-200', ring: 'ring-blue-500' },
  'event_organizer': { bg: 'bg-gradient-to-r from-green-500 to-green-600', text: 'text-white', badge: 'bg-green-100 text-green-800 border-green-200', ring: 'ring-green-500' },
  'participant': { bg: 'bg-gradient-to-r from-gray-500 to-gray-600', text: 'text-white', badge: 'bg-gray-100 text-gray-800 border-gray-200', ring: 'ring-gray-500' },
  'default': { bg: 'bg-gradient-to-r from-indigo-500 to-indigo-600', text: 'text-white', badge: 'bg-indigo-100 text-indigo-800 border-indigo-200', ring: 'ring-indigo-500' }
};

const getRoleColors = (roleName) => {
  return ROLE_COLORS[roleName] || ROLE_COLORS['default'];
};

const AdminManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(new Set());
  const [availableRoles, setAvailableRoles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    loadAllUsers();
    loadRoles();
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

  const loadRoles = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_GET_ROLES);
      if (!response.ok) throw new Error('Failed to fetch roles');
      const result = await response.json();
      console.log('Roles API response:', result);
      
      // Handle both response formats: { data: [...] } or { success: true, data: [...] }
      const roles = result.data || result || [];
      console.log('Extracted roles:', roles);
      setAvailableRoles(roles);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast.error('Failed to load roles');
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    try {
      setLoadingUsers(prev => new Set([...prev, selectedUser.id]));
      
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_ASSIGN_ROLE(selectedUser.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id: selectedRole })
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || 'Failed to assign role');

      toast.success(`Role assigned successfully to ${selectedUser.full_name}`);
      
      const assignedRole = availableRoles.find(r => r.id === selectedRole);
      const updateUserRoles = (users) =>
        users.map(u =>
          u.id === selectedUser.id
            ? {
                ...u,
                roles: [
                  ...(u.roles || []),
                  {
                    role_id: assignedRole.id,
                    role_name: assignedRole.role_name,
                    display_name: assignedRole.display_name
                  }
                ]
              }
            : u
        );
      
      setAllUsers(updateUserRoles);
      setFilteredUsers(updateUserRoles);
      setSelectedUser(null);
      setSelectedRole('');
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to assign role');
    } finally {
      setLoadingUsers(prev => {
        const updated = new Set(prev);
        updated.delete(selectedUser.id);
        return updated;
      });
    }
  };

  const handleRemoveRole = async (user, roleId) => {
    try {
      setLoadingUsers(prev => new Set([...prev, user.id]));
      
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_REMOVE_ROLE(user.id, roleId), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || 'Failed to remove role');

      toast.success(`Role removed successfully from ${user.full_name}`);
      
      const updateUserRoles = (users) =>
        users.map(u =>
          u.id === user.id
            ? {
                ...u,
                roles: (u.roles || []).filter(r => r.role_id !== roleId)
              }
            : u
        );
      
      setAllUsers(updateUserRoles);
      setFilteredUsers(updateUserRoles);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to remove role');
    } finally {
      setLoadingUsers(prev => {
        const updated = new Set(prev);
        updated.delete(user.id);
        return updated;
      });
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

        {/* Assign Role Modal - Enhanced Design */}
        {selectedUser && (
          <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden animate-slideUp">
              {/* Modal Header with Gradient */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6 relative">
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setSelectedRole('');
                  }}
                  className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
                >
                  <FiX size={24} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <FiShield size={32} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      Assign Role
                    </h3>
                    <p className="text-red-100 mt-1">
                      {selectedUser.full_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-8">
                {/* User Info Card */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600 mb-1">Email Address</p>
                      <p className="font-semibold text-gray-900">{selectedUser.email}</p>
                    </div>
                    {selectedUser.is_verified && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <FiCheck size={14} />
                        Verified
                      </span>
                    )}
                  </div>
                  
                  {/* Current Roles */}
                  {selectedUser.roles && selectedUser.roles.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">Current Roles:</p>
                      <div className="flex gap-2 flex-wrap">
                        {selectedUser.roles.map((role) => {
                          const colors = getRoleColors(role.role_name);
                          return (
                            <span
                              key={role.role_id}
                              className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border ${colors.badge}`}
                            >
                              {role.display_name || role.role_name}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Role Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-bold text-gray-900 mb-3">
                    Select New Role to Assign
                  </label>
                  <div className="space-y-3">
                    {(() => {
                      console.log('Total available roles:', availableRoles);
                      console.log('Selected user roles:', selectedUser.roles);
                      const filtered = availableRoles.filter(role => 
                        !selectedUser.roles?.some(ur => ur.role_id === role.id)
                      );
                      console.log('Filtered roles (not already assigned):', filtered);
                      
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            <FiCheck size={48} className="mx-auto mb-3 text-gray-300" />
                            <p className="font-medium">All roles have been assigned</p>
                            <p className="text-sm mt-1">This user has all available roles.</p>
                          </div>
                        );
                      }
                      
                      return filtered.map(role => {
                        const colors = getRoleColors(role.role_name);
                        const isSelected = selectedRole === role.id;
                        return (
                          <div
                            key={role.id}
                            onClick={() => {
                              console.log('Selected role:', role.id);
                              setSelectedRole(role.id);
                            }}
                            className={`relative cursor-pointer group transition-all duration-200 ${
                              isSelected 
                                ? `ring-2 ${colors.ring} bg-gradient-to-r ${colors.bg} scale-[1.02]` 
                                : 'bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 hover:scale-[1.01]'
                            } rounded-xl p-4 shadow-sm hover:shadow-md`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${isSelected ? 'bg-white' : colors.badge.split(' ')[0]}`}></div>
                                  <div>
                                    <h4 className={`font-bold text-base ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                      {role.display_name}
                                    </h4>
                                    <p className={`text-sm mt-1 ${isSelected ? 'text-white text-opacity-90' : 'text-gray-600'}`}>
                                      {role.description}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="ml-4">
                                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                    <FiCheck className="text-white" size={20} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleAssignRole}
                    disabled={!selectedRole}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none transform hover:-translate-y-0.5 disabled:transform-none flex items-center justify-center gap-2"
                  >
                    <FiCheck size={20} />
                    Assign Role
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      setSelectedRole('');
                    }}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Action
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
                          <span className="text-sm font-medium text-blue-600 cursor-pointer hover:underline">
                            {user.id}
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
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-full border shadow-sm ${colors.badge}`}
                                  >
                                    {role.display_name || role.role_name}
                                    <button
                                      onClick={() => handleRemoveRole(user, role.role_id)}
                                      disabled={isLoading}
                                      className="hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-all duration-150"
                                      title="Remove role"
                                    >
                                      <FiX className="w-3 h-3" />
                                    </button>
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
                            {user.is_active ? (
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
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => setSelectedUser(user)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
                          >
                            {isLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <FiCheck size={18} />
                                Assign Role
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
                <span className="font-medium">{allUsers.length}</span> participants
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;

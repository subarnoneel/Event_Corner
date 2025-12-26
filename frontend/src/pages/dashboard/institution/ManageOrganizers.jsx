import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { FiSearch, FiCheck, FiX, FiFilter } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../../config/api';
import AuthContext from '../../../providers/AuthContext';

const ManageOrganizers = () => {
  const { userData } = useContext(AuthContext);
  const [searchTerm, setSearchTerm] = useState('');
  const [organizers, setOrganizers] = useState([]);
  const [filteredOrganizers, setFilteredOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifyingIds, setVerifyingIds] = useState(new Set());
  const [sortBy, setSortBy] = useState('is_verified'); // Default sort by verified
  const [sortOrder, setSortOrder] = useState('DESC');

  useEffect(() => {
    loadOrganizers();
  }, [sortBy, sortOrder]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredOrganizers(organizers);
    } else {
      const filtered = organizers.filter(organizer =>
        organizer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        organizer.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrganizers(filtered);
    }
  }, [searchTerm, organizers]);

  const loadOrganizers = async () => {
    if (!userData?.user_id) return;

    try {
      setLoading(true);
      const url = `${API_ENDPOINTS.INSTITUTION_GET_ORGANIZERS(userData.user_id)}?sort_by=${sortBy}&sort_order=${sortOrder}&limit=1000`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch organizers');
      
      const result = await response.json();
      if (result.success) {
        const organizersList = result.data || [];
        setOrganizers(organizersList);
        setFilteredOrganizers(organizersList);
      } else {
        throw new Error(result.error || 'Failed to load organizers');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load organizers');
      setOrganizers([]);
      setFilteredOrganizers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToggle = async (organizer) => {
    try {
      setVerifyingIds(prev => new Set([...prev, organizer.id]));
      
      const newVerifiedStatus = !organizer.is_verified;
      const response = await fetch(API_ENDPOINTS.INSTITUTION_VERIFY_ORGANIZER(organizer.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          is_verified: newVerifiedStatus,
          verified_by: userData.user_id
        })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update verification status');
      }

      toast.success(`Organizer ${newVerifiedStatus ? 'verified' : 'unverified'} successfully`);
      
      // Update local state
      const updateStatus = (list) =>
        list.map(o => o.id === organizer.id ? { ...o, is_verified: newVerifiedStatus } : o);
      
      setOrganizers(updateStatus);
      setFilteredOrganizers(updateStatus);
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to update verification status');
    } finally {
      setVerifyingIds(prev => {
        const updated = new Set(prev);
        updated.delete(organizer.id);
        return updated;
      });
    }
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      // New field, default to DESC
      setSortBy(field);
      setSortOrder('DESC');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Organizers</h1>
          <p className="text-gray-600">
            View and verify event organizers under your institution.
          </p>
        </div>

        {/* Search and Sort Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Organizers
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div className="flex gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="is_verified">Verification Status</option>
                  <option value="is_active">Active Status</option>
                  <option value="full_name">Name</option>
                  <option value="email">Email</option>
                  <option value="created_at">Join Date</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="DESC">Descending</option>
                  <option value="ASC">Ascending</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Organizers Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
              </div>
            </div>
          ) : filteredOrganizers.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 text-lg">No organizers found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Organizer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSortChange('is_verified')}>
                      Verification Status {sortBy === 'is_verified' && (sortOrder === 'DESC' ? '↓' : '↑')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                        onClick={() => handleSortChange('is_active')}>
                      Account Status {sortBy === 'is_active' && (sortOrder === 'DESC' ? '↓' : '↑')}
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredOrganizers.map((organizer) => {
                    const isVerifying = verifyingIds.has(organizer.id);
                    
                    return (
                      <tr key={organizer.id} className="hover:bg-gray-50 transition">
                        {/* Organizer Info with Profile Picture */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                              {organizer.profile_picture_url ? (
                                <img
                                  src={organizer.profile_picture_url}
                                  alt={organizer.full_name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
                                  <span className="text-white text-sm font-bold">
                                    {organizer.full_name?.charAt(0).toUpperCase() || 'O'}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {organizer.full_name || 'N/A'}
                              </div>
                              <div className="text-xs text-gray-500">
                                @{organizer.username || 'no-username'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {organizer.email || 'N/A'}
                          </span>
                        </td>

                        {/* Verification Status Badge */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full ${
                            organizer.is_verified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {organizer.is_verified ? (
                              <>
                                <FiCheck size={14} />
                                Verified
                              </>
                            ) : (
                              <>
                                <FiX size={14} />
                                Unverified
                              </>
                            )}
                          </span>
                        </td>

                        {/* Active Status Badge */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-full ${
                            organizer.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {organizer.is_active ? (
                              <>
                                <FiCheck size={14} />
                                Active
                              </>
                            ) : (
                              <>
                                <FiX size={14} />
                                Inactive
                              </>
                            )}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => handleVerifyToggle(organizer)}
                            disabled={isVerifying}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                              organizer.is_verified
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={organizer.is_verified ? 'Click to unverify' : 'Click to verify'}
                          >
                            {isVerifying ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                                Processing...
                              </>
                            ) : organizer.is_verified ? (
                              <>
                                <FiX size={16} />
                                Unverify
                              </>
                            ) : (
                              <>
                                <FiCheck size={16} />
                                Verify
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
          {!loading && filteredOrganizers.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Showing <span className="font-medium">{filteredOrganizers.length}</span> of{' '}
                <span className="font-medium">{organizers.length}</span> organizers
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageOrganizers;

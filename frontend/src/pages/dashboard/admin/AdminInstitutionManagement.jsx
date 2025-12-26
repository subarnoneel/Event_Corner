import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiFilter, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { API_ENDPOINTS } from '../../../config/api';

const AdminInstitutionManagement = () => {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, verified, unverified
  const [sortBy, setSortBy] = useState('name'); // name, verified_at
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_INSTITUTIONS);

      if (!response.ok) throw new Error('Failed to fetch institutions');
      const data = await response.json();
      setInstitutions(data.data || []);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load institutions');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (institutionId) => {
    try {
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_VERIFY_INSTITUTION(institutionId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: true })
      });
      if (!response.ok) throw new Error('Failed to verify');
      toast.success('Institution verified');
      fetchInstitutions();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to verify institution');
    }
  };

  const handleUnverify = async (institutionId) => {
    try {
      const response = await fetch(API_ENDPOINTS.SUPERADMIN_VERIFY_INSTITUTION(institutionId), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_verified: false })
      });
      if (!response.ok) throw new Error('Failed to unverify');
      toast.success('Institution unverified');
      fetchInstitutions();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to unverify institution');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAndSortedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedData.map(i => i.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Filter and Sort Logic
  let filteredData = institutions.filter(inst => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'verified' && inst.is_verified) ||
      (filter === 'unverified' && !inst.is_verified);
    
    const matchesSearch = 
      (inst.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inst.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const filteredAndSortedData = filteredData.sort((a, b) => {
    let aValue = sortBy === 'name' ? (a.full_name || '') : (a.verified_at || '');
    let bValue = sortBy === 'name' ? (b.full_name || '') : (b.verified_at || '');
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const paginatedData = filteredAndSortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* Search */}
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Institutions</option>
            <option value="verified">Verified Only</option>
            <option value="unverified">Unverified Only</option>
          </select>

          {/* Sort */}
          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-1"
            >
              <option value="name">Sort by Name</option>
              <option value="verified_at">Sort by Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
            >
              {sortOrder === 'asc' ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>{filteredAndSortedData.length} institutions found</span>
          <span>Page {currentPage} of {totalPages || 1}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedData.length && paginatedData.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded cursor-pointer"
                />
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Verified Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No institutions found
                </td>
              </tr>
            ) : (
              paginatedData.map((inst) => (
                <tr key={inst.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(inst.id)}
                      onChange={() => toggleSelect(inst.id)}
                      className="rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-900">{inst.full_name || inst.username}</td>
                  <td className="px-6 py-3 text-gray-600">{inst.email || '-'}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      inst.is_verified
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {inst.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-gray-600 text-sm">
                    {inst.verified_at ? new Date(inst.verified_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-3">
                    {inst.is_verified ? (
                      <button
                        onClick={() => handleUnverify(inst.id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 transition"
                        title="Unverify institution"
                      >
                        <FiX size={18} />
                        <span className="text-sm">Unverify</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleVerify(inst.id)}
                        className="flex items-center gap-1 text-green-600 hover:text-green-700 transition"
                        title="Verify institution"
                      >
                        <FiCheck size={18} />
                        <span className="text-sm">Verify</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition"
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-4 py-2 rounded-lg transition ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminInstitutionManagement;

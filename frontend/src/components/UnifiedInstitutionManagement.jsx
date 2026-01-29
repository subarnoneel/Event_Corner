import React, { useState, useEffect, useContext } from 'react';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiEye, FiFileText, FiDownload, FiAlertCircle } from 'react-icons/fi';
import { API_ENDPOINTS } from '../config/api';
import AuthContext from '../providers/AuthContext';
import axios from 'axios';

const UnifiedInstitutionManagement = () => {
  const { userData } = useContext(AuthContext);
  const [pendingInstitutions, setPendingInstitutions] = useState([]);
  const [verifiedInstitutions, setVerifiedInstitutions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'verified'

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const fetchInstitutions = async () => {
    try {
      setLoading(true);
      
      // Fetch pending institutions
      const pendingResponse = await axios.get(API_ENDPOINTS.ADMIN_PENDING_INSTITUTIONS, {
        params: { page: 1, limit: 100 }
      });
      
      if (pendingResponse.data.success) {
        setPendingInstitutions(pendingResponse.data.data || []);
      }

      // Fetch verified institutions
      const verifiedResponse = await axios.get(API_ENDPOINTS.SUPERADMIN_INSTITUTIONS, {
        params: { 
          page: 1, 
          limit: 100,
          verified_filter: 'verified'
        }
      });
      
      if (verifiedResponse.data.success) {
        setVerifiedInstitutions(verifiedResponse.data.data || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load institutions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (institutionId) => {
    try {
      const response = await axios.get(API_ENDPOINTS.ADMIN_INSTITUTION_DETAILS(institutionId));
      if (response.data.success) {
        setSelectedInstitution(response.data.data);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load institution details');
    }
  };

  const handleApprove = async (institutionId) => {
    if (!window.confirm('Are you sure you want to approve this institution?')) {
      return;
    }

    try {
      const response = await axios.post(API_ENDPOINTS.ADMIN_APPROVE_INSTITUTION(institutionId), {
        approved_by: userData.user_id
      });

      if (response.data.success) {
        toast.success('Institution approved successfully!');
        fetchInstitutions();
        setShowDetailsModal(false);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.error || 'Failed to approve institution');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      const response = await axios.post(
        API_ENDPOINTS.ADMIN_REJECT_INSTITUTION(selectedInstitution.id),
        {
          rejection_reason: rejectionReason,
          rejected_by: userData.user_id
        }
      );

      if (response.data.success) {
        toast.success('Institution rejected');
        fetchInstitutions();
        setShowDetailsModal(false);
        setShowRejectModal(false);
        setRejectionReason('');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(error.response?.data?.error || 'Failed to reject institution');
    }
  };

  const handleUnverify = async (institutionId) => {
    if (!window.confirm('Are you sure you want to move this institution back to pending review?')) {
      return;
    }

    try {
      const response = await axios.patch(
        API_ENDPOINTS.SUPERADMIN_VERIFY_INSTITUTION(institutionId),
        {
          is_verified: false,
          verified_by: userData.user_id
        }
      );

      if (response.data.success) {
        toast.success('Institution moved to pending review');
        fetchInstitutions();
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to unverify institution');
    }
  };

  const handleDownloadDocument = (filename) => {
    const documentUrl = API_ENDPOINTS.GET_DOCUMENT(filename.split('/').pop());
    window.open(documentUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg p-2 flex gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'pending'
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FiAlertCircle size={20} />
            <span>Pending Approvals</span>
            {pendingInstitutions.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-white text-orange-600 rounded-full text-xs font-bold">
                {pendingInstitutions.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('verified')}
          className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
            activeTab === 'verified'
              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FiCheck size={20} />
            <span>Verified Institutions</span>
            {verifiedInstitutions.length > 0 && (
              <span className="ml-2 px-2 py-1 bg-white text-green-600 rounded-full text-xs font-bold">
                {verifiedInstitutions.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Pending Approvals Section */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Pending Institution Approvals</h2>
          <p className="text-gray-600 mb-6">
            Review and approve or reject institution registration requests
          </p>

          {pendingInstitutions.length === 0 ? (
            <div className="text-center py-12">
              <FiFileText size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No pending institutions to review</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Institution Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">EIIN</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Documents</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Submitted</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingInstitutions.map((inst) => (
                    <tr key={inst.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{inst.full_name}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{inst.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {inst.institution_type === 'school_college_madrasa' ? 'School/College' : 'University'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {inst.eiin_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {inst.verification_documents?.length || 0} files
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {new Date(inst.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(inst.id)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition"
                          title="View details"
                        >
                          <FiEye size={18} />
                          <span className="text-sm">Review</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Verified Institutions Section */}
      {activeTab === 'verified' && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Verified Institutions</h2>
          <p className="text-gray-600 mb-6">
            Manage approved institutions. Click Unverify to move back to pending review.
          </p>

          {verifiedInstitutions.length === 0 ? (
            <div className="text-center py-12">
              <FiCheck size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No verified institutions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Institution Name</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">EIIN</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Documents</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Verified</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {verifiedInstitutions.map((inst) => (
                    <tr key={inst.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{inst.full_name}</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{inst.email}</td>
                      <td className="px-6 py-4">
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {inst.institution_type === 'school_college_madrasa' ? 'School/College' : inst.institution_type === 'university' ? 'University' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {inst.eiin_number || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {inst.verification_documents && inst.verification_documents.length > 0 ? (
                          <button
                            onClick={() => handleViewDetails(inst.id)}
                            className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                          >
                            <FiFileText size={16} />
                            {inst.verification_documents.length} files
                          </button>
                        ) : (
                          <span className="text-gray-400 text-sm">No docs</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-sm">
                        {inst.verified_at ? new Date(inst.verified_at).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleUnverify(inst.id)}
                          className="flex items-center gap-1 text-orange-600 hover:text-orange-700 transition"
                          title="Move back to pending"
                        >
                          <FiX size={18} />
                          <span className="text-sm">Unverify</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-gray-800">Institution Details</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Institution Name</label>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{selectedInstitution.full_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-gray-900">{selectedInstitution.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Username</label>
                  <p className="mt-1 text-gray-900">{selectedInstitution.username}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Institution Type</label>
                  <p className="mt-1">
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedInstitution.institution_type === 'school_college_madrasa' 
                        ? 'School/College/Madrasa' 
                        : selectedInstitution.institution_type === 'university'
                        ? 'University'
                        : 'N/A'}
                    </span>
                  </p>
                </div>
                {selectedInstitution.eiin_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">EIIN Number</label>
                    <p className="mt-1 text-lg font-bold text-blue-600">{selectedInstitution.eiin_number}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                      selectedInstitution.verification_status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : selectedInstitution.verification_status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedInstitution.verification_status || 'Pending'}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Submitted On</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(selectedInstitution.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Verification Documents */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Verification Documents ({selectedInstitution.verification_documents?.length || 0})
                </label>
                {selectedInstitution.verification_documents && selectedInstitution.verification_documents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedInstitution.verification_documents.map((doc, index) => {
                      const filename = doc.split('/').pop();
                      const isPdf = filename.match(/\.pdf$/i);
                      
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FiFileText size={24} className={isPdf ? 'text-red-500' : 'text-blue-500'} />
                            <div>
                              <p className="text-sm font-medium text-gray-900">Document {index + 1}</p>
                              <p className="text-xs text-gray-500">{filename}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDownloadDocument(doc)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                          >
                            <FiDownload size={16} />
                            <span className="text-sm">View/Download</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">No documents uploaded</p>
                )}
              </div>

              {/* Action Buttons - Only show for pending */}
              {selectedInstitution.verification_status === 'pending' && (
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedInstitution.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    <FiCheck size={20} />
                    Approve Institution
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                  >
                    <FiX size={20} />
                    Reject Institution
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-800">Reject Institution</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                rows="4"
                required
              />
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedInstitutionManagement;
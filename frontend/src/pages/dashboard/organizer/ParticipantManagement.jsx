import React, { useState, useEffect, useContext } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import {
  FiUsers, FiUserCheck, FiUserX, FiClock, FiMail, FiDownload,
  FiEye, FiCheck, FiX, FiSearch, FiFilter, FiChevronDown, FiChevronUp,
  FiFile, FiExternalLink
} from 'react-icons/fi';
import AuthContext from '../../../providers/AuthContext';
import { API_ENDPOINTS } from '../../../config/api';
import axios from 'axios';

const ParticipantManagement = () => {
  const { userData } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'approved'
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [pendingParticipants, setPendingParticipants] = useState([]);
  const [approvedParticipants, setApprovedParticipants] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [formFieldsMap, setFormFieldsMap] = useState({}); // Map of field IDs to labels
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [emailData, setEmailData] = useState({ subject: '', message: '' });
  const [expandedEvents, setExpandedEvents] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (userData?.user_id) {
      fetchEventsWithCounts();
      fetchPendingParticipants();
      fetchApprovedParticipants();
    }
  }, [userData]);

  const fetchEventsWithCounts = async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.ORGANIZER_EVENTS_WITH_PARTICIPANTS(userData.user_id));
      if (response.data.success) {
        setEvents(response.data.events || []);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchPendingParticipants = async (eventId = null) => {
    try {
      setLoading(true);
      const params = eventId ? { event_id: eventId } : {};
      const response = await axios.get(API_ENDPOINTS.ORGANIZER_PENDING_PARTICIPANTS(userData.user_id), { params });
      if (response.data.success) {
        setPendingParticipants(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching pending participants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApprovedParticipants = async (eventId = null) => {
    try {
      const params = eventId ? { event_id: eventId } : {};
      const response = await axios.get(API_ENDPOINTS.ORGANIZER_APPROVED_PARTICIPANTS(userData.user_id), { params });
      if (response.data.success) {
        setApprovedParticipants(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching approved participants:', error);
    }
  };

  const handleViewDetails = async (participant) => {
    try {
      // Fetch participant details
      const response = await axios.get(API_ENDPOINTS.PARTICIPANT_DETAILS(participant.id));

      // Also fetch the registration config to get field labels
      let fieldLabelsMap = {};
      try {
        const configResponse = await axios.get(API_ENDPOINTS.REGISTRATION_CONFIG(participant.event_id));
        if (configResponse.data.success && configResponse.data.config?.form_config?.fields) {
          // Create a map of field IDs to their labels
          configResponse.data.config.form_config.fields.forEach(field => {
            fieldLabelsMap[field.id] = field.label;
          });
        }
      } catch (configError) {
        console.log('Could not fetch form config:', configError);
      }

      setFormFieldsMap(fieldLabelsMap);

      if (response.data.success) {
        setSelectedParticipant(response.data.participant);
        setShowDetailsModal(true);
      }
    } catch (error) {
      console.error('Error:', error);
      // Fall back to using the participant data we already have
      setSelectedParticipant(participant);
      setShowDetailsModal(true);
    }
  };

  const handleApprove = async (participantId) => {
    try {
      const response = await axios.post(API_ENDPOINTS.PARTICIPANT_APPROVE(participantId), {
        reviewer_id: userData.user_id
      });

      if (response.data.success) {
        toast.success('Participant approved! Email notification sent.');
        fetchPendingParticipants(selectedEvent);
        fetchApprovedParticipants(selectedEvent);
        fetchEventsWithCounts();
        setShowDetailsModal(false);
      } else {
        toast.error(response.data.error || 'Failed to approve participant');
      }
    } catch (error) {
      console.error('Error approving participant:', error);
      toast.error('Failed to approve participant');
    }
  };

  const handleReject = async () => {
    if (!selectedParticipant) return;

    try {
      const response = await axios.post(API_ENDPOINTS.PARTICIPANT_REJECT(selectedParticipant.id), {
        reviewer_id: userData.user_id,
        rejection_reason: rejectionReason
      });

      if (response.data.success) {
        toast.success('Participant rejected. Email notification sent.');

        // Auto-refund if participant had paid
        if (selectedParticipant.payment_status === 'completed') {
          try {
            // Find transaction for this participant
            const txnRes = await axios.get(API_ENDPOINTS.PAYMENT_TRANSACTIONS(selectedParticipant.event_id));
            const txns = txnRes.data?.transactions || [];
            const participantTxn = txns.find(t => t.participant_id === selectedParticipant.id && t.status === 'completed');

            if (participantTxn) {
              const refundRes = await axios.post(API_ENDPOINTS.PAYMENT_REFUND(participantTxn.id), {
                initiated_by: userData.user_id,
                reason: 'registration_rejected',
                reason_detail: rejectionReason || 'Registration rejected by organizer'
              });

              if (refundRes.data?.refund_initiated) {
                toast.success(`Refund of ৳${refundRes.data.refund_amount} initiated for the rejected participant.`, { duration: 5000 });
              } else if (refundRes.data?.refund_policy === 'no_refund') {
                toast('No refund issued (event policy: no refund).', { icon: 'ℹ️', duration: 4000 });
              }
            }
          } catch (refundErr) {
            console.error('Auto-refund error:', refundErr);
            toast.error('Rejection successful but auto-refund failed. You may need to refund manually.');
          }
        }

        fetchPendingParticipants(selectedEvent);
        fetchEventsWithCounts();
        setShowRejectModal(false);
        setShowDetailsModal(false);
        setRejectionReason('');
      } else {
        toast.error(response.data.error || 'Failed to reject participant');
      }
    } catch (error) {
      console.error('Error rejecting participant:', error);
      toast.error('Failed to reject participant');
    }
  };

  const handleSendBulkEmail = async () => {
    if (!selectedEvent || !emailData.subject || !emailData.message) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await axios.post(API_ENDPOINTS.EVENT_EMAIL_PARTICIPANTS(selectedEvent), {
        organizer_id: userData.user_id,
        subject: emailData.subject,
        message: emailData.message
      });

      if (response.data.success) {
        toast.success(`Email sent to ${response.data.recipient_count} participant(s)!`);
        setShowEmailModal(false);
        setEmailData({ subject: '', message: '' });
      } else {
        toast.error(response.data.error || 'Failed to send emails');
      }
    } catch (error) {
      console.error('Error sending bulk email:', error);
      toast.error(error.response?.data?.error || 'Failed to send emails');
    }
  };

  const handleExportCSV = async (eventId) => {
    try {
      window.open(
        `${API_ENDPOINTS.EVENT_EXPORT_PARTICIPANTS(eventId)}?organizer_id=${userData.user_id}&status=approved`,
        '_blank'
      );
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const toggleEventExpanded = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const filterParticipants = (participants) => {
    if (!searchTerm) return participants;
    const term = searchTerm.toLowerCase();
    return participants.filter(p =>
      p.user_name?.toLowerCase().includes(term) ||
      p.user_email?.toLowerCase().includes(term) ||
      p.team_name?.toLowerCase().includes(term) ||
      p.event_title?.toLowerCase().includes(term)
    );
  };

  // Group participants by event
  const groupByEvent = (participants) => {
    const grouped = {};
    participants.forEach(p => {
      if (!grouped[p.event_id]) {
        grouped[p.event_id] = {
          event_id: p.event_id,
          event_title: p.event_title,
          participants: []
        };
      }
      grouped[p.event_id].participants.push(p);
    });
    return Object.values(grouped);
  };

  const filteredPending = filterParticipants(pendingParticipants);
  const filteredApproved = filterParticipants(approvedParticipants);
  const groupedPending = groupByEvent(filteredPending);
  const groupedApproved = groupByEvent(filteredApproved);

  // Helper function to get the display label for a form field
  const getFieldLabel = (fieldKey) => {
    // If we have an exact mapping from the form config, use it
    if (formFieldsMap[fieldKey]) {
      return formFieldsMap[fieldKey];
    }

    // Try to find a partial match - field IDs often have timestamps appended
    // e.g., "name_1770315933483" should match a field with id containing "name"
    const fieldKeyLower = fieldKey.toLowerCase();
    for (const [id, label] of Object.entries(formFieldsMap)) {
      // Check if the stored ID is a prefix of the fieldKey (before the timestamp)
      const idWithoutTimestamp = id.replace(/_\d+$/, '');
      const fieldKeyWithoutTimestamp = fieldKey.replace(/_\d+$/, '');

      if (idWithoutTimestamp === fieldKeyWithoutTimestamp) {
        return label;
      }

      // Also check if they share the same base name
      if (id.toLowerCase().includes(fieldKeyWithoutTimestamp.toLowerCase()) ||
        fieldKeyWithoutTimestamp.toLowerCase().includes(idWithoutTimestamp.toLowerCase())) {
        return label;
      }
    }

    // Try to extract a readable name from the field key
    // Field keys are typically like "name_1770315933483", "email_1770315933484", etc.
    const parts = fieldKey.split('_');
    if (parts.length >= 1) {
      // Remove the timestamp part (last element if it's a long number)
      const lastPart = parts[parts.length - 1];
      if (/^\d{10,}$/.test(lastPart)) {
        parts.pop();
      }

      // Common field name mappings
      const commonLabels = {
        'name': 'Full Name',
        'full': 'Full Name',
        'fullname': 'Full Name',
        'email': 'Email Address',
        'phone': 'Phone Number',
        'institution': 'Institution/Organization',
        'member1': 'Team Leader',
        'member1_name': 'Team Leader Name',
        'member1_email': 'Team Leader Email',
        'member1_phone': 'Team Leader Phone',
        'member1_institution': 'Team Leader Institution',
        'member2': 'Member 2',
        'member2_name': 'Member 2 Name',
        'member2_email': 'Member 2 Email',
        'member2_phone': 'Member 2 Phone',
        'member2_institution': 'Member 2 Institution',
        'member3': 'Member 3',
        'member3_name': 'Member 3 Name',
        'member3_email': 'Member 3 Email',
        'member3_phone': 'Member 3 Phone',
        'member3_institution': 'Member 3 Institution',
      };

      // Join remaining parts
      const baseName = parts.join('_').toLowerCase();

      // Check if we have a common label for this base name
      if (commonLabels[baseName]) {
        return commonLabels[baseName];
      }

      // Check for partial matches in common labels
      for (const [key, label] of Object.entries(commonLabels)) {
        if (baseName.includes(key) || key.includes(baseName)) {
          return label;
        }
      }

      // Format the base name nicely: replace underscores with spaces and capitalize
      const formattedName = parts
        .join(' ')
        .replace(/\b\w/g, l => l.toUpperCase());

      return formattedName;
    }

    // Fallback: just capitalize and replace underscores
    return fieldKey
      .replace(/_\d+$/, '') // Remove trailing timestamp
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <Toaster position="top-right" />

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <FiClock size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Pending Approval</p>
              <p className="text-3xl font-bold">{pendingParticipants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <FiUserCheck size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Approved</p>
              <p className="text-3xl font-bold">{approvedParticipants.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl p-6 text-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-lg">
              <FiUsers size={24} />
            </div>
            <div>
              <p className="text-sm opacity-90">Events with Registration</p>
              <p className="text-3xl font-bold">{events.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 w-full">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, team name, or event..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedEvent || ''}
              onChange={(e) => {
                const eventId = e.target.value || null;
                setSelectedEvent(eventId);
                fetchPendingParticipants(eventId);
                fetchApprovedParticipants(eventId);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">All Events</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.title}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition ${activeTab === 'pending'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <FiClock className="inline mr-2" />
            Pending Approval ({filteredPending.length})
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition ${activeTab === 'approved'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
          >
            <FiUserCheck className="inline mr-2" />
            Registered Users ({filteredApproved.length})
          </button>
        </div>

        <div className="p-6">
          {/* Pending Tab Content */}
          {activeTab === 'pending' && (
            <>
              {groupedPending.length === 0 ? (
                <div className="text-center py-12">
                  <FiClock size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No pending registrations</p>
                  <p className="text-gray-400">All registrations have been reviewed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedPending.map(group => (
                    <div key={group.event_id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleEventExpanded(group.event_id)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-800">{group.event_title}</span>
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
                            {group.participants.length} pending
                          </span>
                        </div>
                        {expandedEvents[group.event_id] ? <FiChevronUp /> : <FiChevronDown />}
                      </button>

                      {expandedEvents[group.event_id] && (
                        <div className="divide-y divide-gray-100">
                          {group.participants.map(participant => (
                            <div key={participant.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                              <div>
                                <p className="font-medium text-gray-800">
                                  {participant.user_name || participant.form_data?.name || 'Unknown'}
                                </p>
                                <p className="text-sm text-gray-500">{participant.user_email}</p>
                                {participant.team_name && (
                                  <p className="text-sm text-purple-600">Team: {participant.team_name}</p>
                                )}
                                <p className="text-xs text-gray-400">
                                  Submitted: {new Date(participant.submitted_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleViewDetails(participant)}
                                  className="p-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
                                  title="View details"
                                >
                                  <FiEye size={18} />
                                </button>
                                <button
                                  onClick={() => handleApprove(participant.id)}
                                  className="p-2 text-green-600 bg-green-100 rounded-lg hover:bg-green-200 transition"
                                  title="Approve"
                                >
                                  <FiCheck size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedParticipant(participant);
                                    setShowRejectModal(true);
                                  }}
                                  className="p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200 transition"
                                  title="Reject"
                                >
                                  <FiX size={18} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Approved Tab Content */}
          {activeTab === 'approved' && (
            <>
              {groupedApproved.length === 0 ? (
                <div className="text-center py-12">
                  <FiUserCheck size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">No approved registrations yet</p>
                  <p className="text-gray-400">Approved participants will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {groupedApproved.map(group => (
                    <div key={group.event_id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-gray-50">
                        <button
                          onClick={() => toggleEventExpanded(`approved_${group.event_id}`)}
                          className="flex items-center gap-3"
                        >
                          <span className="font-semibold text-gray-800">{group.event_title}</span>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                            {group.participants.length} registered
                          </span>
                          {expandedEvents[`approved_${group.event_id}`] ? <FiChevronUp /> : <FiChevronDown />}
                        </button>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedEvent(group.event_id);
                              setShowEmailModal(true);
                            }}
                            className="flex items-center gap-1 px-3 py-1 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition text-sm"
                          >
                            <FiMail size={16} /> Email All
                          </button>
                          <button
                            onClick={() => handleExportCSV(group.event_id)}
                            className="flex items-center gap-1 px-3 py-1 text-green-600 bg-green-100 rounded-lg hover:bg-green-200 transition text-sm"
                          >
                            <FiDownload size={16} /> Export CSV
                          </button>
                        </div>
                      </div>

                      {expandedEvents[`approved_${group.event_id}`] && (
                        <div className="divide-y divide-gray-100">
                          {group.participants.map(participant => (
                            <div key={participant.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                              <div>
                                <p className="font-medium text-gray-800">
                                  {participant.user_name || participant.form_data?.name || 'Unknown'}
                                </p>
                                <p className="text-sm text-gray-500">{participant.user_email}</p>
                                {participant.team_name && (
                                  <p className="text-sm text-purple-600">Team: {participant.team_name}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleViewDetails(participant)}
                                className="p-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition"
                                title="View details"
                              >
                                <FiEye size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Participant Details Modal */}
      {showDetailsModal && selectedParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Participant Details</h3>
                <button onClick={() => setShowDetailsModal(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Name</label>
                  <p className="mt-1 text-gray-900">{selectedParticipant.user_name || selectedParticipant.form_data?.name || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <p className="mt-1 text-gray-900">{selectedParticipant.user_email || selectedParticipant.form_data?.email || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Event</label>
                  <p className="mt-1 text-gray-900">{selectedParticipant.event_title || selectedParticipant.events?.title || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-block mt-1 px-2 py-1 text-sm rounded-full ${selectedParticipant.status === 'approved'
                      ? 'bg-green-100 text-green-700'
                      : selectedParticipant.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {selectedParticipant.status}
                  </span>
                </div>
                {selectedParticipant.team_name && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Team Name</label>
                      <p className="mt-1 text-purple-600 font-medium">{selectedParticipant.team_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Team Size</label>
                      <p className="mt-1 text-gray-900 font-medium">
                        {selectedParticipant.team_members?.length ||
                          (selectedParticipant.form_data ?
                            Object.keys(selectedParticipant.form_data).filter(k => k.toLowerCase().includes('member') && k.toLowerCase().includes('name')).length : 0)
                        } member(s)
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Form Data - excluding file upload fields */}
              {selectedParticipant.form_data && Object.keys(selectedParticipant.form_data).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Registration Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {Object.entries(selectedParticipant.form_data)
                      .filter(([key, value]) => {
                        // Filter out file upload fields (they contain JSON with url property)
                        if (typeof value === 'string') {
                          try {
                            const parsed = JSON.parse(value);
                            if (parsed && parsed.url) return false; // This is a file upload field
                          } catch (e) {
                            // Not JSON, keep it
                          }
                        }
                        return true;
                      })
                      .map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-gray-600 capitalize">{getFieldLabel(key)}:</span>
                          <span className="text-gray-900 font-medium">{Array.isArray(value) ? value.join(', ') : value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Uploaded Files Section - Extract from form_data */}
              {(() => {
                // Extract uploaded files from form_data
                const uploadedFiles = [];
                if (selectedParticipant.form_data) {
                  Object.entries(selectedParticipant.form_data).forEach(([key, value]) => {
                    if (typeof value === 'string') {
                      try {
                        const parsed = JSON.parse(value);
                        if (parsed && parsed.url) {
                          uploadedFiles.push({
                            fieldId: key,
                            fieldLabel: getFieldLabel(key),
                            ...parsed
                          });
                        }
                      } catch (e) {
                        // Not a JSON file field, skip
                      }
                    }
                  });
                }

                // Also check the uploaded_files array (legacy support)
                if (selectedParticipant.uploaded_files && selectedParticipant.uploaded_files.length > 0) {
                  selectedParticipant.uploaded_files.forEach((file, index) => {
                    uploadedFiles.push({
                      fieldLabel: file.fieldLabel || file.field_label || `File ${index + 1}`,
                      originalName: file.originalName || file.original_name || file.filename || 'Document',
                      url: file.url || file.path || `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${file.filePath || file.file_path}`
                    });
                  });
                }

                if (uploadedFiles.length === 0) return null;

                return (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <FiFile className="text-blue-600" />
                      Uploaded Files ({uploadedFiles.length})
                    </h4>
                    <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <FiFile className="text-blue-600" size={18} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">
                                {file.fieldLabel}
                              </p>
                              <p className="text-xs text-gray-500">
                                {file.originalName || file.filename || 'Document'}
                              </p>
                            </div>
                          </div>
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${file.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                          >
                            <FiExternalLink size={14} />
                            View File
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Team Members */}
              {selectedParticipant.team_members && selectedParticipant.team_members.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <FiUsers className="text-purple-600" />
                    Team Members ({selectedParticipant.team_members.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedParticipant.team_members.map((member, index) => (
                      <div key={index} className="bg-purple-50 rounded-lg p-3">
                        <p className="font-medium text-gray-800">Member {index + 1}: {member.name}</p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-sm text-gray-500">
                <p>Submitted: {new Date(selectedParticipant.submitted_at).toLocaleString()}</p>
                {selectedParticipant.reviewed_at && (
                  <p>Reviewed: {new Date(selectedParticipant.reviewed_at).toLocaleString()}</p>
                )}
              </div>

              {/* Actions for pending participants */}
              {selectedParticipant.status === 'pending' && (
                <div className="flex gap-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedParticipant.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    <FiCheck size={20} /> Approve
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                  >
                    <FiX size={20} /> Reject
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
              <h3 className="text-xl font-bold text-gray-800">Reject Registration</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (optional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                rows="4"
              />
              <p className="text-sm text-gray-500 mt-2">
                The participant will receive an email notification about this rejection.
              </p>
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

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Email Participants</h3>
                <button onClick={() => setShowEmailModal(false)} className="text-gray-500 hover:text-gray-700">
                  <FiX size={24} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                  placeholder="Email subject"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({ ...emailData, message: e.target.value })}
                  placeholder="Write your message here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  rows="6"
                />
              </div>
              <p className="text-sm text-gray-500">
                This email will be sent to all approved participants of the selected event.
              </p>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendBulkEmail}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  <FiMail /> Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantManagement;
